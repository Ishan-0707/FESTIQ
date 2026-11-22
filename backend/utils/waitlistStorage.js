import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { withCapacityLock } from './capacityLock.js';
import {
  getAllRegistrations,
  getEventDetails,
  createRegistration,
  cancelRegistration
} from './registrationStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const waitlistFilePath = path.join(__dirname, '..', 'data', 'waitlist.json');
const eventsFilePath = path.join(__dirname, '..', 'data', 'events.json');
const usersFilePath = path.join(__dirname, '..', 'data', 'users.json');

// Offer expiry TTL in milliseconds (default 15 minutes = 900,000 ms; configurable via env)
export const WAITLIST_OFFER_TTL_MINUTES = Math.max(
  1,
  parseInt(process.env.WAITLIST_OFFER_TTL_MINUTES, 10) || 15
);
export const OFFER_TTL_MS = WAITLIST_OFFER_TTL_MINUTES * 60 * 1000;

// Strictly allowed waitlist lifecycle statuses
export const WAITLIST_STATUS = {
  WAITING: 'WAITING',
  OFFERED: 'OFFERED',
  ACCEPTED: 'ACCEPTED',
  EXPIRED: 'EXPIRED',
  WITHDRAWN: 'WITHDRAWN',
  DECLINED: 'DECLINED',
  CONVERTED: 'CONVERTED'
};

/**
 * Retrieve all raw waitlist entries from persistent storage.
 */
export async function getAllWaitlistEntries() {
  try {
    const raw = await fs.readFile(waitlistFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(waitlistFilePath, '[]', 'utf-8');
      return [];
    }
    console.error('[Waitlist Storage] Error reading waitlist.json:', error.message);
    throw new Error('Could not access waitlist storage');
  }
}

/**
 * Atomically persist waitlist entries via temporary file and rename.
 */
async function saveWaitlistEntries(entries) {
  const jsonString = JSON.stringify(entries, null, 2);
  const tmpPath = `${waitlistFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    await fs.writeFile(tmpPath, jsonString, 'utf-8');
    await fs.rename(tmpPath, waitlistFilePath);
  } catch (err) {
    try { await fs.unlink(tmpPath); } catch {}
    throw new Error('Failed to persist waitlist records atomically');
  }
}

/**
 * Helper: Read users into an ID map for data hydration.
 */
async function readUsersMap() {
  try {
    const raw = await fs.readFile(usersFilePath, 'utf-8');
    const users = JSON.parse(raw);
    return new Map(Array.isArray(users) ? users.map((u) => [u.id, u]) : []);
  } catch {
    return new Map();
  }
}

/**
 * Helper: Read events into an ID map for data hydration.
 */
async function readEventsMap() {
  try {
    const raw = await fs.readFile(eventsFilePath, 'utf-8');
    const events = JSON.parse(raw);
    return new Map(Array.isArray(events) ? events.map((e) => [e.id, e]) : []);
  } catch {
    return new Map();
  }
}

/**
 * Hydrates a waitlist entry with dynamic data from referenced event and user records.
 * Avoids storing redundant PII or event metadata while maintaining full backward compatibility.
 */
function enrichWaitlistEntry(w, eventMap, userMap) {
  const ev = eventMap ? eventMap.get(w.eventId) : null;
  const u = (userMap && w.userId) ? userMap.get(w.userId) : null;

  return {
    ...w,
    eventTitle: ev ? ev.title : (w.eventTitle || 'Campus Event'),
    eventCategory: ev ? ev.category : (w.eventCategory || 'Technical'),
    eventDate: ev ? ev.date : (w.eventDate || 'Date TBD'),
    eventTime: ev ? ev.time : (w.eventTime || ''),
    eventVenue: ev ? ev.venue : (w.eventVenue || ''),
    eventImage: ev ? (ev.imageUrl || ev.image || '') : '',
    feeAmount: ev ? (ev.feeAmount || 0) : (w.feeAmount || 0),
    isPaid: ev ? Boolean(ev.feeAmount > 0) : Boolean(w.feeAmount > 0),
    participantName: u ? u.fullName : (w.participantName || 'Student'),
    email: u ? u.email : (w.email || ''),
    phone: u ? (u.phoneNumber || u.phone || '') : (w.phone || ''),
    rollNumber: u ? (u.rollNumber || null) : (w.rollNumber || null)
  };
}

/**
 * Clean up expired offers across all events or a specific event.
 * Transitions stale OFFERED entries to EXPIRED and triggers allocation for next waiting attendee.
 */
export async function expireStaleOffers(eventId = null) {
  return withCapacityLock(async () => {
    const entries = await getAllWaitlistEntries();
    const now = Date.now();
    let changed = false;
    const eventsToReallocate = new Set();

    for (const entry of entries) {
      if (eventId && entry.eventId !== eventId) continue;
      if (entry.status === WAITLIST_STATUS.OFFERED && entry.offerExpiresAt) {
        const expiryTime = new Date(entry.offerExpiresAt).getTime();
        if (now > expiryTime) {
          entry.status = WAITLIST_STATUS.EXPIRED;
          entry.updatedAt = new Date().toISOString();
          changed = true;
          eventsToReallocate.add(entry.eventId);
        }
      }
    }

    if (changed) {
      await saveWaitlistEntries(entries);
      for (const evId of eventsToReallocate) {
        await allocateAvailableSeats(evId);
      }
    }
  });
}

/**
 * Recalculate 1-based queue positions for WAITING entries of an event.
 */
function recalculateQueuePositions(entries, eventId) {
  let pos = 1;
  for (const item of entries) {
    if (item.eventId === eventId && item.status === WAITLIST_STATUS.WAITING) {
      item.queuePosition = pos++;
    }
  }
}

/**
 * Automatic Seat Allocation Engine:
 * When capacity opens up (via cancellation, capacity increase, offer decline, or offer expiry),
 * evaluates available capacity against confirmed registrations and active offers,
 * and promotes the next eligible WAITING students in FIFO order.
 * Fully serialized under withCapacityLock.
 */
export async function allocateAvailableSeats(eventId) {
  if (!eventId) return;

  return withCapacityLock(async () => {
    const event = await getEventDetails(eventId);
    if (!event || event.status === 'Cancelled' || event.status === 'Closed') {
      return;
    }

    const capacity = Number(event.capacity) || 0;
    if (capacity <= 0) return;

    const registrations = await getAllRegistrations();
    const waitlist = await getAllWaitlistEntries();
    const now = new Date();

    // Active registrations occupying seats: confirmed or active pending payments
    const activeRegistrations = registrations.filter(
      (r) => r.eventId === eventId && r.status !== 'cancelled'
    );

    // Active unexpired offers currently reserving seats
    const activeOffers = waitlist.filter(
      (w) =>
        w.eventId === eventId &&
        w.status === WAITLIST_STATUS.OFFERED &&
        w.offerExpiresAt &&
        new Date(w.offerExpiresAt).getTime() > now.getTime()
    );

    // Available slots for new offers
    const reservedSlots = activeRegistrations.length + activeOffers.length;
    const availableSlots = Math.max(0, capacity - reservedSlots);

    if (availableSlots <= 0) {
      recalculateQueuePositions(waitlist, eventId);
      await saveWaitlistEntries(waitlist);
      return;
    }

    // Get eligible WAITING entries sorted chronologically (FIFO)
    const waitingEntries = waitlist
      .filter((w) => w.eventId === eventId && w.status === WAITLIST_STATUS.WAITING)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let allocatedCount = 0;
    for (const entry of waitingEntries) {
      if (allocatedCount >= availableSlots) break;

      // Verify student doesn't already have an active confirmed registration
      const alreadyRegistered = activeRegistrations.some(
        (r) => (entry.userId && r.userId === entry.userId) || (entry.email && r.email.toLowerCase() === entry.email.toLowerCase())
      );

      if (alreadyRegistered) {
        entry.status = WAITLIST_STATUS.WITHDRAWN;
        entry.updatedAt = now.toISOString();
        continue;
      }

      // Allocate time-limited seat offer
      entry.status = WAITLIST_STATUS.OFFERED;
      entry.offerCreatedAt = now.toISOString();
      entry.offerExpiresAt = new Date(now.getTime() + OFFER_TTL_MS).toISOString();
      entry.queuePosition = null;
      entry.updatedAt = now.toISOString();
      allocatedCount++;
    }

    recalculateQueuePositions(waitlist, eventId);
    await saveWaitlistEntries(waitlist);
  });
}

/**
 * Join Event Waitlist.
 * Validates capacity is full, checks for duplicates, and appends a minimal FIFO entry.
 * Minimizes stored data by referencing authenticated userId without redundant PII.
 */
export async function joinWaitlist({
  eventId,
  userId = null,
  participantName = null,
  email = null,
  phone = null,
  rollNumber = null
}) {
  return withCapacityLock(async () => {
    if (!eventId) throw new Error('eventId is required to join waitlist');

    const event = await getEventDetails(eventId);
    if (!event) {
      const err = new Error(`Event '${eventId}' was not found`);
      err.statusCode = 404;
      throw err;
    }

    if (event.status === 'Cancelled' || event.status === 'Closed') {
      const err = new Error(`Registration and waitlist for '${event.title}' are currently closed`);
      err.statusCode = 400;
      throw err;
    }

    // Expire stale offers first to get accurate available seats
    await expireStaleOffers(eventId);

    const registrations = await getAllRegistrations();
    const waitlist = await getAllWaitlistEntries();
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    // 1. Verify that event is actually full (active registrations + active offers >= capacity)
    const activeRegistrations = registrations.filter(
      (r) => r.eventId === eventId && r.status !== 'cancelled'
    );
    const activeOffers = waitlist.filter(
      (w) =>
        w.eventId === eventId &&
        w.status === WAITLIST_STATUS.OFFERED &&
        w.offerExpiresAt &&
        new Date(w.offerExpiresAt).getTime() > Date.now()
    );

    const capacity = Number(event.capacity) || 0;
    const isFull = capacity > 0 && (activeRegistrations.length + activeOffers.length) >= capacity;

    if (!isFull) {
      const err = new Error(`Event '${event.title}' currently has seats available. You can register directly without joining the waitlist.`);
      err.statusCode = 400;
      err.directRegistrationAvailable = true;
      throw err;
    }

    // 2. Prevent duplicate active registration
    const hasActiveReg = activeRegistrations.some(
      (r) => (userId && r.userId === userId) || (cleanEmail && r.email && r.email.toLowerCase() === cleanEmail)
    );
    if (hasActiveReg) {
      const err = new Error(`You already have an active registration for '${event.title}'`);
      err.statusCode = 409;
      throw err;
    }

    // 3. Prevent duplicate active waitlist entry
    const hasActiveWaitlist = waitlist.some(
      (w) =>
        w.eventId === eventId &&
        (w.status === WAITLIST_STATUS.WAITING || w.status === WAITLIST_STATUS.OFFERED) &&
        ((userId && w.userId === userId) || (cleanEmail && w.email && w.email.toLowerCase() === cleanEmail))
    );
    if (hasActiveWaitlist) {
      const err = new Error(`You already have an active waitlist reservation for '${event.title}'`);
      err.statusCode = 409;
      throw err;
    }

    // 4. Calculate next FIFO queue position
    const currentWaitingCount = waitlist.filter(
      (w) => w.eventId === eventId && w.status === WAITLIST_STATUS.WAITING
    ).length;
    const queuePosition = currentWaitingCount + 1;

    const now = new Date().toISOString();

    // Data-minimized waitlist record: references userId and eventId without duplicating event details or student PII
    const newEntry = {
      id: `WTL-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      eventId,
      userId: userId || null,
      email: cleanEmail || null, // Optional fallback for matching if userId absent
      queuePosition,
      teamSize: 1, // Standard individual participant seat
      status: WAITLIST_STATUS.WAITING,
      offerCreatedAt: null,
      offerExpiresAt: null,
      offerAcceptedAt: null,
      offerDeclinedAt: null,
      registrationId: null,
      createdAt: now,
      updatedAt: now
    };

    waitlist.push(newEntry);
    await saveWaitlistEntries(waitlist);

    // Hydrate entry for return to client
    const eventMap = new Map([[event.id, event]]);
    const userMap = await readUsersMap();
    return enrichWaitlistEntry(newEntry, eventMap, userMap);
  });
}

/**
 * Accept a seat offer.
 * Re-validates offer freshness and capacity, converts into registration, and issues pass.
 * Fully serialized under withCapacityLock.
 */
export async function acceptSeatOffer({ waitlistId, userId }) {
  return withCapacityLock(async () => {
    if (!waitlistId) throw new Error('waitlistId is required');

    // Run expiry check
    await expireStaleOffers();

    const waitlist = await getAllWaitlistEntries();
    const entry = waitlist.find((w) => w.id === waitlistId);
    if (!entry) {
      const err = new Error(`Waitlist entry '${waitlistId}' was not found`);
      err.statusCode = 404;
      throw err;
    }

    // Ownership check
    if (userId && entry.userId && entry.userId !== userId) {
      const err = new Error('Access denied: Unauthorized to accept this seat offer');
      err.statusCode = 403;
      throw err;
    }

    // Strict state-machine guard: only OFFERED entries may be accepted
    if (entry.status !== WAITLIST_STATUS.OFFERED) {
      const err = new Error(`Cannot accept offer: Waitlist entry is in '${entry.status}' status`);
      err.statusCode = 400;
      throw err;
    }

    // Expiry check
    const now = Date.now();
    if (!entry.offerExpiresAt || now > new Date(entry.offerExpiresAt).getTime()) {
      entry.status = WAITLIST_STATUS.EXPIRED;
      entry.updatedAt = new Date().toISOString();
      await saveWaitlistEntries(waitlist);
      // Reallocate to next student
      await allocateAvailableSeats(entry.eventId);
      const err = new Error('Seat offer has expired. The offer has automatically passed to the next student in queue.');
      err.statusCode = 410;
      err.expired = true;
      throw err;
    }

    const event = await getEventDetails(entry.eventId);
    if (!event) {
      const err = new Error('Associated event not found');
      err.statusCode = 404;
      throw err;
    }

    // Recheck capacity directly before creating registration
    const registrations = await getAllRegistrations();
    const activeRegs = registrations.filter(
      (r) => r.eventId === entry.eventId && r.status !== 'cancelled'
    );
    if (event.capacity && activeRegs.length >= event.capacity) {
      entry.status = WAITLIST_STATUS.EXPIRED;
      entry.updatedAt = new Date().toISOString();
      await saveWaitlistEntries(waitlist);
      const err = new Error('Event capacity is already saturated. Cannot convert waitlist offer.');
      err.statusCode = 409;
      throw err;
    }

    // Resolve student details: prioritize users.json reference
    let participantName = entry.participantName || 'Student';
    let email = entry.email || '';
    let phone = entry.phone || '9876543210';
    let rollNumber = entry.rollNumber || null;

    if (entry.userId) {
      const userMap = await readUsersMap();
      const user = userMap.get(entry.userId);
      if (user) {
        participantName = user.fullName || participantName;
        email = user.email || email;
        phone = user.phoneNumber || user.phone || phone;
        rollNumber = user.rollNumber || rollNumber;
      }
    }

    // Create registration through standard registration flow with convertingWaitlistId
    const createdReg = await createRegistration({
      participantName,
      email,
      phone,
      eventId: entry.eventId,
      userId: entry.userId,
      rollNumber,
      convertingWaitlistId: entry.id
    });

    const isPaid = Boolean(createdReg.requiresPayment || event.feeAmount > 0);

    // Update waitlist entry status:
    // FREE event -> CONVERTED (pass issued); PAID event -> ACCEPTED (pending payment confirmation)
    const acceptedAt = new Date().toISOString();
    entry.offerAcceptedAt = acceptedAt;
    entry.registrationId = createdReg.id;
    entry.status = isPaid ? WAITLIST_STATUS.ACCEPTED : WAITLIST_STATUS.CONVERTED;
    entry.updatedAt = acceptedAt;

    await saveWaitlistEntries(waitlist);

    return {
      success: true,
      waitlistEntry: entry,
      registration: createdReg,
      requiresPayment: isPaid,
      feeAmount: isPaid ? (event.feeAmount || 0) : 0
    };
  });
}

/**
 * Decline a seat offer.
 * Releases seat immediately and promotes next student in FIFO queue.
 * Strict state-machine guard: only OFFERED entries may be declined.
 */
export async function declineSeatOffer({ waitlistId, userId }) {
  return withCapacityLock(async () => {
    if (!waitlistId) throw new Error('waitlistId is required');

    const waitlist = await getAllWaitlistEntries();
    const entry = waitlist.find((w) => w.id === waitlistId);
    if (!entry) {
      const err = new Error(`Waitlist entry '${waitlistId}' was not found`);
      err.statusCode = 404;
      throw err;
    }

    if (userId && entry.userId && entry.userId !== userId) {
      const err = new Error('Access denied: Unauthorized to decline this seat offer');
      err.statusCode = 403;
      throw err;
    }

    // Strict state guard
    if (entry.status !== WAITLIST_STATUS.OFFERED) {
      const err = new Error(`Cannot decline offer: Waitlist entry is in '${entry.status}' status`);
      err.statusCode = 400;
      throw err;
    }

    const now = new Date().toISOString();
    entry.status = WAITLIST_STATUS.DECLINED;
    entry.offerDeclinedAt = now;
    entry.updatedAt = now;

    await saveWaitlistEntries(waitlist);

    // Automatically reallocate seat to next student
    await allocateAvailableSeats(entry.eventId);

    return entry;
  });
}

/**
 * Voluntarily withdraw from the waitlist before an offer is extended.
 * Strict state-machine guard: only WAITING entries may be withdrawn.
 */
export async function withdrawWaitlist({ waitlistId, userId }) {
  return withCapacityLock(async () => {
    if (!waitlistId) throw new Error('waitlistId is required');

    const waitlist = await getAllWaitlistEntries();
    const entry = waitlist.find((w) => w.id === waitlistId);
    if (!entry) {
      const err = new Error(`Waitlist entry '${waitlistId}' was not found`);
      err.statusCode = 404;
      throw err;
    }

    if (userId && entry.userId && entry.userId !== userId) {
      const err = new Error('Access denied: Unauthorized to withdraw this waitlist entry');
      err.statusCode = 403;
      throw err;
    }

    // Strict state guard: only WAITING entries may be withdrawn
    if (entry.status !== WAITLIST_STATUS.WAITING) {
      const err = new Error(`Cannot withdraw: Waitlist entry is in '${entry.status}' status`);
      err.statusCode = 400;
      throw err;
    }

    const now = new Date().toISOString();
    entry.status = WAITLIST_STATUS.WITHDRAWN;
    entry.queuePosition = null;
    entry.updatedAt = now;

    recalculateQueuePositions(waitlist, entry.eventId);
    await saveWaitlistEntries(waitlist);

    // Check if seats can be allocated
    if (entry.eventId) {
      await allocateAvailableSeats(entry.eventId);
    }

    return entry;
  });
}

/**
 * Handle Event Cancellation.
 * Withdraws all pending waitlist entries and prevents further offers.
 */
export async function handleEventCancelled(eventId) {
  return withCapacityLock(async () => {
    const waitlist = await getAllWaitlistEntries();
    const now = new Date().toISOString();
    let updated = false;

    for (const entry of waitlist) {
      if (entry.eventId === eventId) {
        if (entry.status === WAITLIST_STATUS.WAITING || entry.status === WAITLIST_STATUS.OFFERED) {
          entry.status = WAITLIST_STATUS.WITHDRAWN;
          entry.queuePosition = null;
          entry.updatedAt = now;
          entry.cancellationNote = 'Event cancelled by campus organizer';
          updated = true;
        }
      }
    }

    if (updated) {
      await saveWaitlistEntries(waitlist);
    }
  });
}

/**
 * Handle Management Capacity Reduction:
 * When an event's capacity is decreased:
 * 1. Checks that new capacity is not lower than already confirmed registrations.
 * 2. If new capacity is less than (confirmed + active offers), excess offers (newest first)
 *    are rescinded back to WAITING at the front of the queue, ensuring
 *    confirmed + valid offers never exceed new capacity.
 */
export async function handleCapacityReduction(eventId, newCapacity) {
  return withCapacityLock(async () => {
    const registrations = await getAllRegistrations();
    const activeRegs = registrations.filter(
      (r) => r.eventId === eventId && r.status !== 'cancelled'
    );

    if (newCapacity < activeRegs.length) {
      const err = new Error(`Cannot reduce capacity to ${newCapacity}. Event already has ${activeRegs.length} confirmed registrations.`);
      err.statusCode = 400;
      throw err;
    }

    const waitlist = await getAllWaitlistEntries();
    const now = Date.now();
    const activeOffers = waitlist
      .filter(
        (w) =>
          w.eventId === eventId &&
          w.status === WAITLIST_STATUS.OFFERED &&
          w.offerExpiresAt &&
          new Date(w.offerExpiresAt).getTime() > now
      )
      .sort((a, b) => new Date(b.offerCreatedAt || 0).getTime() - new Date(a.offerCreatedAt || 0).getTime()); // newest first

    const maxAllowedOffers = Math.max(0, newCapacity - activeRegs.length);
    if (activeOffers.length > maxAllowedOffers) {
      const excessCount = activeOffers.length - maxAllowedOffers;
      const toRescind = activeOffers.slice(0, excessCount);
      for (const entry of toRescind) {
        entry.status = WAITLIST_STATUS.WAITING;
        entry.offerCreatedAt = null;
        entry.offerExpiresAt = null;
        entry.updatedAt = new Date().toISOString();
      }
      recalculateQueuePositions(waitlist, eventId);
      await saveWaitlistEntries(waitlist);
    }
  });
}

/**
 * Retrieve all waitlist entries for a specific student with dynamic hydration.
 */
export async function getStudentWaitlistEntries(userId, email = null) {
  await expireStaleOffers();
  const waitlist = await getAllWaitlistEntries();

  const userEntries = waitlist.filter(
    (w) => (userId && w.userId === userId) || (email && w.email && w.email.toLowerCase() === email.toLowerCase())
  );

  const eventMap = await readEventsMap();
  const userMap = await readUsersMap();

  return userEntries.map((w) => enrichWaitlistEntry(w, eventMap, userMap));
}

/**
 * Retrieve event waitlist statistics for Management Dashboard.
 */
export async function getEventWaitlistStats(eventId) {
  await expireStaleOffers(eventId);
  const waitlist = await getAllWaitlistEntries();
  const eventEntries = waitlist.filter((w) => w.eventId === eventId);

  return {
    eventId,
    waitingCount: eventEntries.filter((w) => w.status === WAITLIST_STATUS.WAITING).length,
    offeredCount: eventEntries.filter((w) => w.status === WAITLIST_STATUS.OFFERED).length,
    acceptedCount: eventEntries.filter((w) => w.status === WAITLIST_STATUS.ACCEPTED || w.status === WAITLIST_STATUS.CONVERTED).length,
    expiredCount: eventEntries.filter((w) => w.status === WAITLIST_STATUS.EXPIRED).length,
    withdrawnCount: eventEntries.filter((w) => w.status === WAITLIST_STATUS.WITHDRAWN || w.status === WAITLIST_STATUS.DECLINED).length,
    totalEntries: eventEntries.length
  };
}

/**
 * Mark a waitlist entry as CONVERTED once its converted registration payment is confirmed.
 */
export async function markWaitlistConvertedByRegistrationId(registrationId) {
  if (!registrationId) return;
  return withCapacityLock(async () => {
    const waitlist = await getAllWaitlistEntries();
    let updated = false;
    for (const w of waitlist) {
      if (w.registrationId === registrationId && (w.status === WAITLIST_STATUS.ACCEPTED || w.status === WAITLIST_STATUS.OFFERED)) {
        w.status = WAITLIST_STATUS.CONVERTED;
        w.updatedAt = new Date().toISOString();
        updated = true;
      }
    }
    if (updated) {
      await saveWaitlistEntries(waitlist);
    }
  });
}
