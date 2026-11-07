import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const registrationsFilePath = path.join(__dirname, '..', 'data', 'registrations.json');
const eventsFilePath = path.join(__dirname, '..', 'data', 'events.json');

// Serialized asynchronous queue for concurrent registration writes
let regWriteQueue = Promise.resolve();

function enqueueWrite(operation) {
  const next = regWriteQueue.then(operation, operation);
  regWriteQueue = next.catch(() => {});
  return next;
}

/**
 * Hash pass token using SHA-256 for secure constant-time verification.
 */
export function hashToken(token) {
  if (!token) return '';
  return crypto.createHash('sha256').update(String(token).trim()).digest('hex');
}

/**
 * Constant-time hash comparator to prevent timing attacks.
 */
export function verifyPassToken(inputToken, storedHash) {
  if (!inputToken || !storedHash) return false;
  const inputHash = hashToken(inputToken);
  try {
    const a = Buffer.from(inputHash, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function getAllRegistrations() {
  try {
    const raw = await fs.readFile(registrationsFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(registrationsFilePath, '[]', 'utf-8');
      return [];
    }
    console.error('[Registration Storage] Error reading registrations:', error.message);
    throw new Error('Could not access registrations database');
  }
}

/**
 * Validates event existence and capacity from events.json
 */
export async function getEventDetails(eventId) {
  try {
    const raw = await fs.readFile(eventsFilePath, 'utf-8');
    const events = JSON.parse(raw);
    return events.find((e) => e.id === eventId) || null;
  } catch (error) {
    console.error('[Registration Storage] Error reading events:', error.message);
    return null;
  }
}

/**
 * Creates a new registration inside the serialized write queue.
 * Automatically generates a Digital Event Pass with a 32-char secret token & SHA-256 hash.
 */
export async function createRegistration({
  participantName,
  email,
  phone,
  eventId,
  userId = null,
  rollNumber = null
}) {
  return enqueueWrite(async () => {
    // 1. Verify that event exists
    const event = await getEventDetails(eventId);
    if (!event) {
      const err = new Error(`Event with ID '${eventId}' was not found`);
      err.statusCode = 404;
      throw err;
    }

    // 2. Check if registration is open
    if (event.status && event.status.toLowerCase() === 'closed') {
      const err = new Error(`Registration for event '${event.title}' is currently closed`);
      err.statusCode = 400;
      throw err;
    }

    // 3. Check registrations
    const registrations = await getAllRegistrations();
    const eventRegistrations = registrations.filter((r) => r.eventId === eventId);

    // 4. Check capacity if defined
    if (event.capacity && eventRegistrations.length >= event.capacity) {
      const err = new Error(`Event capacity of ${event.capacity} has been reached for '${event.title}'`);
      err.statusCode = 400;
      throw err;
    }

    // 5. Prevent duplicate submission (same email + same event)
    const normalizedEmail = email.trim().toLowerCase();
    const isDuplicate = eventRegistrations.some(
      (r) => r.email.toLowerCase() === normalizedEmail
    );
    if (isDuplicate) {
      const err = new Error(`A registration with this email already exists for '${event.title}'`);
      err.statusCode = 409;
      throw err;
    }

    // 6. Fee & Payment Evaluation: Determine whether event is free or paid
    const feeAmount = Math.max(0, Number(event.feeAmount) || 0);
    const isPaidEvent = feeAmount > 0;
    const now = new Date().toISOString();

    let passId = null;
    let rawPassToken = null;
    let passTokenHash = null;
    let passObject = null;

    // For free events: Generate digital event pass immediately
    // For paid events: Pass is strictly withheld until verified payment confirmation
    if (!isPaidEvent) {
      passId = `PASS-2026-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      rawPassToken = crypto.randomBytes(16).toString('hex');
      passTokenHash = hashToken(rawPassToken);
      passObject = {
        passId,
        issuedAt: now,
        status: 'valid',
        checkedIn: false,
        checkedInAt: null,
        checkedInBy: null
      };
    }

    // 7. Create registration record
    const regRecord = {
      id: `FST-${Date.now().toString().slice(-6)}`,
      userId: userId || null,
      participantName: participantName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      rollNumber: rollNumber ? String(rollNumber).trim() : null,
      eventId,
      eventTitle: event.title,
      category: event.category,
      registeredAt: now,
      status: isPaidEvent ? 'pending_payment' : 'confirmed',
      paymentStatus: isPaidEvent ? 'pending' : 'free',
      payment: {
        status: isPaidEvent ? 'pending' : 'free',
        verified: !isPaidEvent,
        amount: feeAmount,
        currency: 'INR',
        paidAt: !isPaidEvent ? now : null,
        transactionId: !isPaidEvent ? 'N/A (Free)' : null,
        orderId: null
      },
      pass: passObject,
      passTokenHash: passTokenHash || null,
      // Mirror top-level check-in flags for backwards-compatibility with existing manage tables
      checkedIn: false,
      checkedInAt: null,
      checkedInBy: null
    };

    registrations.push(regRecord);

    // 8. Atomic write via tmp file
    const jsonString = JSON.stringify(registrations, null, 2);
    const tmpPath = `${registrationsFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      await fs.writeFile(tmpPath, jsonString, 'utf-8');
      await fs.rename(tmpPath, registrationsFilePath);
    } catch (writeErr) {
      try {
        await fs.unlink(tmpPath);
      } catch {
        // ignore
      }
      throw new Error('Failed to persist registration record atomically');
    }

    // Return record with in-memory raw token (for free events) or payment requirements (for paid events)
    return {
      ...regRecord,
      requiresPayment: isPaidEvent,
      feeAmount,
      passToken: rawPassToken || null
    };
  });
}

/**
 * Retrieve single registration by ID or Pass ID
 */
export async function getRegistrationById(id) {
  const registrations = await getAllRegistrations();
  return (
    registrations.find(
      (r) => r.id === id || r.pass?.passId === id || r.passId === id
    ) || null
  );
}

/**
 * Retrieve all registrations belonging to a specific authenticated student (userId).
 */
export async function getRegistrationsByUserId(userId) {
  if (!userId) return [];
  const registrations = await getAllRegistrations();
  return registrations.filter((r) => r.userId === userId);
}

/**
 * Check in an attendee pass (Manager operation).
 * Fully concurrency-safe within the serialized write queue.
 */
export async function checkInPass({ eventId, passId, token, managerName = 'Manager' }) {
  return enqueueWrite(async () => {
    const registrations = await getAllRegistrations();
    const cleanPassId = String(passId || '').trim();

    const reg = registrations.find(
      (r) => r.pass?.passId === cleanPassId || r.id === cleanPassId || r.passId === cleanPassId
    );

    if (!reg) {
      const err = new Error(`Pass or Registration with ID '${cleanPassId}' was not found.`);
      err.statusCode = 404;
      throw err;
    }

    // Verify event match
    if (eventId && reg.eventId !== eventId) {
      const currentEvent = await getEventDetails(eventId);
      const regEvent = await getEventDetails(reg.eventId);
      const err = new Error(
        `This pass is for '${regEvent?.title || reg.eventId}', not for '${currentEvent?.title || eventId}'. Check-in rejected.`
      );
      err.statusCode = 400;
      throw err;
    }

    // Verify token hash
    if (token) {
      const isValid = verifyPassToken(token, reg.passTokenHash);
      if (!isValid) {
        const err = new Error('Invalid or unverified pass security token. Check-in rejected.');
        err.statusCode = 401;
        throw err;
      }
    }

    // Check cancellation or invalid status
    if (reg.status !== 'confirmed') {
      const err = new Error(`This registration is ${reg.status || 'invalid'}. Check-in rejected.`);
      err.statusCode = 400;
      throw err;
    }

    // Check already checked in
    if (reg.pass?.checkedIn || reg.checkedIn) {
      const checkedTime = reg.pass?.checkedInAt || reg.checkedInAt;
      const formatted = checkedTime ? new Date(checkedTime).toLocaleTimeString() : 'earlier';
      const err = new Error(
        `Pass has ALREADY been checked in at ${formatted} by ${reg.pass?.checkedInBy || reg.checkedInBy || 'Coordinator'}. Duplicate scan blocked.`
      );
      err.statusCode = 409;
      err.alreadyCheckedIn = true;
      err.checkedInAt = checkedTime;
      throw err;
    }

    // Apply check-in
    const now = new Date().toISOString();
    if (!reg.pass) {
      reg.pass = {
        passId: cleanPassId,
        issuedAt: reg.registeredAt || now,
        status: 'valid'
      };
    }
    reg.pass.checkedIn = true;
    reg.pass.checkedInAt = now;
    reg.pass.checkedInBy = managerName;

    reg.checkedIn = true;
    reg.checkedInAt = now;
    reg.checkedInBy = managerName;

    // Atomic write
    const jsonString = JSON.stringify(registrations, null, 2);
    const tmpPath = `${registrationsFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      await fs.writeFile(tmpPath, jsonString, 'utf-8');
      await fs.rename(tmpPath, registrationsFilePath);
    } catch (writeErr) {
      try {
        await fs.unlink(tmpPath);
      } catch {}
      throw new Error('Failed to record check-in atomically');
    }

    return reg;
  });
}

/**
 * Claim an unlinked or guest registration to bind it permanently to a student's account.
 */
export async function claimRegistration({ passId, token, userId, userRollNumber = null }) {
  return enqueueWrite(async () => {
    const registrations = await getAllRegistrations();
    const cleanPassId = String(passId || '').trim();

    const reg = registrations.find(
      (r) => r.pass?.passId === cleanPassId || r.id === cleanPassId
    );

    if (!reg) {
      const err = new Error(`Registration with Pass ID '${cleanPassId}' was not found.`);
      err.statusCode = 404;
      throw err;
    }

    // Check if already claimed by another user
    if (reg.userId && reg.userId !== userId) {
      const err = new Error('This pass is already linked to another student account.');
      err.statusCode = 409;
      throw err;
    }

    // Verify token hash
    const isValid = verifyPassToken(token, reg.passTokenHash);
    if (!isValid) {
      const err = new Error('Invalid secret pass token. Proof of ownership failed.');
      err.statusCode = 401;
      throw err;
    }

    // If already linked to this user, return successfully (idempotent)
    if (reg.userId === userId) {
      return reg;
    }

    // Link ownership
    reg.userId = userId;
    if (userRollNumber && !reg.rollNumber) {
      reg.rollNumber = userRollNumber;
    }

    // Atomic write
    const jsonString = JSON.stringify(registrations, null, 2);
    const tmpPath = `${registrationsFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      await fs.writeFile(tmpPath, jsonString, 'utf-8');
      await fs.rename(tmpPath, registrationsFilePath);
    } catch (writeErr) {
      try {
        await fs.unlink(tmpPath);
      } catch {}
      throw new Error('Failed to claim registration atomically');
    }

    return reg;
  });
}

/**
 * Calculates event-specific attendance metrics.
 */
export async function getAttendanceStats(eventId) {
  const registrations = await getAllRegistrations();
  const eventRegs = registrations.filter((r) => r.eventId === eventId);

  const total = eventRegs.length;
  const checkedIn = eventRegs.filter((r) => r.pass?.checkedIn || r.checkedIn).length;
  const pending = total - checkedIn;
  const percentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  const recentCheckIns = eventRegs
    .filter((r) => r.pass?.checkedIn || r.checkedIn)
    .sort((a, b) => new Date(b.checkedInAt || 0) - new Date(a.checkedInAt || 0))
    .slice(0, 20)
    .map((r) => ({
      registrationId: r.id,
      passId: r.pass?.passId || r.id,
      participantName: r.participantName,
      email: r.email,
      rollNumber: r.rollNumber,
      checkedInAt: r.pass?.checkedInAt || r.checkedInAt,
      checkedInBy: r.pass?.checkedInBy || r.checkedInBy
    }));

  return {
    eventId,
    totalRegistrations: total,
    checkedInCount: checkedIn,
    pendingCount: pending,
    attendancePercentage: percentage,
    recentCheckIns
  };
}

/**
 * Records that a payment order has been initiated for a registration.
 */
export async function recordPaymentOrder({ registrationId, orderId }) {
  return enqueueWrite(async () => {
    const registrations = await getAllRegistrations();
    const reg = registrations.find((r) => r.id === registrationId);
    if (!reg) return null;

    if (!reg.payment) {
      reg.payment = {};
    }
    reg.payment.orderId = orderId;
    reg.payment.orderCreatedAt = new Date().toISOString();

    const jsonString = JSON.stringify(registrations, null, 2);
    const tmpPath = `${registrationsFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await fs.writeFile(tmpPath, jsonString, 'utf-8');
    await fs.rename(tmpPath, registrationsFilePath);
    return reg;
  });
}

/**
 * Confirms a paid registration upon verified payment.
 * Automatically generates and signs a secure Digital Event Pass with secret token.
 * Fully idempotent: safe against duplicate webhook notifications or repeat verification calls.
 */
export async function confirmPaidRegistration({
  registrationId,
  orderId,
  paymentId,
  method = 'gateway',
  verifiedBy = null
}) {
  return enqueueWrite(async () => {
    const registrations = await getAllRegistrations();
    const regIndex = registrations.findIndex((r) => r.id === registrationId);
    if (regIndex === -1) {
      const err = new Error(`Registration with ID '${registrationId}' was not found`);
      err.statusCode = 404;
      throw err;
    }

    const reg = registrations[regIndex];

    // Idempotency: If already verified and pass exists, return existing pass
    if (reg.paymentStatus === 'paid' && reg.status === 'confirmed' && reg.pass?.status === 'valid') {
      return {
        ...reg,
        alreadyConfirmed: true
      };
    }

    const now = new Date().toISOString();
    const passId = `PASS-2026-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const rawPassToken = crypto.randomBytes(16).toString('hex');
    const passTokenHash = hashToken(rawPassToken);

    reg.status = 'confirmed';
    reg.paymentStatus = 'paid';
    reg.payment = {
      ...(reg.payment || {}),
      status: 'paid',
      verified: true,
      amount: Number(reg.payment?.amount || 0),
      currency: 'INR',
      paidAt: now,
      orderId: orderId || reg.payment?.orderId || null,
      transactionId: paymentId || `pay_${crypto.randomBytes(8).toString('hex')}`,
      method,
      verifiedBy: verifiedBy || 'gateway_signature'
    };
    reg.pass = {
      passId,
      issuedAt: now,
      status: 'valid',
      checkedIn: false,
      checkedInAt: null,
      checkedInBy: null
    };
    reg.passTokenHash = passTokenHash;
    reg.updatedAt = now;

    registrations[regIndex] = reg;

    const jsonString = JSON.stringify(registrations, null, 2);
    const tmpPath = `${registrationsFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await fs.writeFile(tmpPath, jsonString, 'utf-8');
    await fs.rename(tmpPath, registrationsFilePath);

    return {
      ...reg,
      passToken: rawPassToken
    };
  });
}

/**
 * Records a payment failure or cancellation for a pending registration.
 */
export async function failRegistrationPayment({ registrationId, orderId, errorReason }) {
  return enqueueWrite(async () => {
    const registrations = await getAllRegistrations();
    const regIndex = registrations.findIndex((r) => r.id === registrationId);
    if (regIndex === -1) return null;

    const reg = registrations[regIndex];
    if (reg.paymentStatus === 'paid') {
      return reg; // Do not overwrite paid status
    }

    reg.paymentStatus = 'failed';
    if (!reg.payment) reg.payment = {};
    reg.payment.status = 'failed';
    reg.payment.lastError = errorReason || 'Payment rejected or cancelled';
    reg.payment.lastFailedAt = new Date().toISOString();
    if (orderId) reg.payment.orderId = orderId;

    registrations[regIndex] = reg;

    const jsonString = JSON.stringify(registrations, null, 2);
    const tmpPath = `${registrationsFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await fs.writeFile(tmpPath, jsonString, 'utf-8');
    await fs.rename(tmpPath, registrationsFilePath);

    return reg;
  });
}

