import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllRegistrations } from '../utils/registrationStorage.js';
import {
  sanitizeEventForPublic,
  calculateEventPrizeMetrics,
  validateEventFinancialConfig,
  createFinancialSnapshot,
  DEFAULT_PRIZE_ALLOCATION_PCT,
  MIN_PRIZE_ALLOCATION_PCT,
  MAX_PRIZE_ALLOCATION_PCT
} from '../utils/prizePoolCalculator.js';
import { getOrGenerateEventPdf, invalidatePdfCache } from '../services/eventPdfGenerator.js';
import { withCapacityLock } from '../utils/capacityLock.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const eventsFilePath = path.join(__dirname, '..', 'data', 'events.json');

// Global capacity-coordinated asynchronous execution queue for event mutations
function enqueueEventWrite(operation) {
  return withCapacityLock(operation);
}

// Safe file reader helper with validation
async function readEventsFile() {
  try {
    const rawData = await fs.readFile(eventsFilePath, 'utf-8');
    const parsed = JSON.parse(rawData);
    if (!Array.isArray(parsed)) {
      throw new Error('Events data must be an array');
    }
    return parsed;
  } catch (error) {
    console.error('[Event Controller] Error reading events.json:', error.message);
    throw new Error('Unable to read events data');
  }
}

// GET /api/events
// Supports query params: category, featured, search, sort
export async function getAllEvents(req, res) {
  try {
    const events = await readEventsFile();
    const { category, featured, search, sort } = req.query;

    let filteredEvents = [...events];

    // Category filter
    if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
      filteredEvents = filteredEvents.filter(
        (e) => (e.category || '').toLowerCase() === category.trim().toLowerCase()
      );
    }

    // Featured filter
    if (featured !== undefined) {
      const isFeat = featured === 'true' || featured === '1';
      filteredEvents = filteredEvents.filter((e) => Boolean(e.isFeatured || e.featured) === isFeat);
    }

    // Search query filter across title, venue, tagline, description, category
    if (search && search.trim() !== '') {
      const query = search.trim().toLowerCase();
      filteredEvents = filteredEvents.filter((e) =>
        (e.title || '').toLowerCase().includes(query) ||
        (e.venue || '').toLowerCase().includes(query) ||
        (e.tagline || '').toLowerCase().includes(query) ||
        (e.category || '').toLowerCase().includes(query) ||
        (e.description || '').toLowerCase().includes(query)
      );
    }

    // Optional server-side sorting
    if (sort === 'date-asc' || sort === 'upcoming') {
      filteredEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sort === 'date-desc') {
      filteredEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sort === 'alpha-asc') {
      filteredEvents.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    // Sanitize events: compute dynamic prize pool if applicable, strip confidential internal splits
    const allRegistrations = await getAllRegistrations().catch(() => []);
    const publicEvents = filteredEvents.map((e) => sanitizeEventForPublic(e, allRegistrations));

    res.status(200).json({
      success: true,
      count: publicEvents.length,
      data: publicEvents,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve events',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// GET /api/events/:id
export async function getEventById(req, res) {
  try {
    const { id } = req.params;
    const events = await readEventsFile();
    const event = events.find((e) => e.id === id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: `Event with id '${id}' not found`,
        timestamp: new Date().toISOString()
      });
    }

    const allRegistrations = await getAllRegistrations().catch(() => []);
    const publicEvent = sanitizeEventForPublic(event, allRegistrations);

    res.status(200).json({
      success: true,
      data: publicEvent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve event details',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * POST /api/events
 * Creates a new campus event. Protected by manager authorization.
 */
export async function createEvent(req, res) {
  try {
    const {
      title,
      category,
      tagline,
      description,
      fullDescription,
      date,
      time,
      venue,
      organizer,
      image,
      imageUrl,
      entryFee,
      feeAmount,
      feeType,
      registrationType,
      capacity,
      minExpectedRegistrations,
      prizeAmount,
      prizePoolType,
      prizeAllocationPct,
      managerName,
      managerPhone,
      status = 'Open',
      isFeatured = false,
      featured = false
    } = req.body;

    // 1. Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Event title is required' });
    }
    const VALID_CATEGORIES = ['Technical', 'Cultural', 'Gaming', 'Workshops', 'Management', 'Sports'];
    if (!category || !VALID_CATEGORIES.map(c => c.toLowerCase()).includes(category.trim().toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'Valid date in YYYY-MM-DD format is required' });
    }
    if (!venue || !venue.trim()) {
      return res.status(400).json({ success: false, message: 'Venue is required' });
    }
    if (!managerName || !managerName.trim()) {
      return res.status(400).json({ success: false, message: 'Event manager name is required' });
    }
    if (!managerPhone || !managerPhone.trim()) {
      return res.status(400).json({ success: false, message: 'Event manager contact number is required' });
    }

    const numCapacity = parseInt(capacity, 10);
    if (isNaN(numCapacity) || numCapacity <= 0) {
      return res.status(400).json({ success: false, message: 'Capacity must be a positive integer' });
    }

    const numPrize = parseInt(prizeAmount, 10);
    const validPrize = isNaN(numPrize) || numPrize < 0 ? 0 : numPrize;

    // Matched category with proper casing
    const properCategory = VALID_CATEGORIES.find(c => c.toLowerCase() === category.trim().toLowerCase());

    const finalImage = (imageUrl || image || '').trim() ||
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80';

    const flagFeatured = Boolean(isFeatured || featured);

    // 2. Serialized atomic creation
    const newEvent = await enqueueEventWrite(async () => {
      const events = await readEventsFile();

      // Deduplication check: prevent creating an event with identical title, date, and venue
      const duplicate = events.find(
        (e) =>
          e.title &&
          e.title.trim().toLowerCase() === title.trim().toLowerCase() &&
          e.date === date.trim() &&
          e.venue &&
          e.venue.trim().toLowerCase() === venue.trim().toLowerCase()
      );
      if (duplicate) {
        return duplicate;
      }

      // Determine next ID
      let maxNum = 0;
      for (const ev of events) {
        const m = (ev.id || '').match(/fest-(\d+)/);
        if (m) {
          const val = parseInt(m[1], 10);
          if (val > maxNum) maxNum = val;
        }
      }
      const nextId = `fest-${String(maxNum + 1).padStart(3, '0')}`;

      // Fee validation per specification:
      // Free events: fee = 0, no payment required.
      // Paid events: fee > 0, billing model explicit.
      let numFee = 0;
      let modelFeeType = 'per_person';
      let entryFeeStr = 'Free';

      if (registrationType === 'paid' || Number(feeAmount) > 0) {
        numFee = Math.max(0, Number(feeAmount) || 0);
        if (numFee <= 0) {
          const err = new Error('Registration fee must be greater than ₹0 for paid events');
          err.statusCode = 400;
          throw err;
        }
        modelFeeType = (feeType === 'per_team' || feeType === 'team' || (entryFee && entryFee.includes('/ team'))) ? 'per_team' : 'per_person';
        entryFeeStr = `₹${numFee} ${modelFeeType === 'per_team' ? 'per team' : 'per participant'}`;
      }

      // Financial Validation:
      // A prize-pool event must have:
      // 1. Registration fee > 0.
      // 2. Minimum expected registration count > 0.
      // 3. Prize-pool percentage between 60% and 70%.
      // Free events cannot have a prize pool.
      const hasPrizePoolDeclared = Boolean(
        prizePoolType === 'dynamic' ||
        prizePoolType === 'registration_funded' ||
        Number(prizeAmount) > 0 ||
        (numFee > 0 && minExpectedRegistrations !== undefined && minExpectedRegistrations !== null)
      );

      const financialValidation = validateEventFinancialConfig({
        feeAmount: numFee,
        registrationType: numFee > 0 ? 'paid' : 'free',
        isPaid: numFee > 0,
        prizeAmount: validPrize,
        prizePoolType,
        prizeAllocationPct,
        minExpectedRegistrations,
        hasPrizePool: hasPrizePoolDeclared
      });

      if (!financialValidation.isValid) {
        const err = new Error(financialValidation.errors.join('. '));
        err.statusCode = 400;
        throw err;
      }

      const numMinExpected = parseInt(minExpectedRegistrations, 10);
      let calculatedPrize = 0;
      let poolType = 'none';
      let financialSnapshot = null;
      let allocationPct = DEFAULT_PRIZE_ALLOCATION_PCT;

      if (numFee > 0 && !isNaN(numMinExpected) && numMinExpected > 0) {
        poolType = 'dynamic';
        allocationPct = Math.min(MAX_PRIZE_ALLOCATION_PCT, Math.max(MIN_PRIZE_ALLOCATION_PCT, Number(prizeAllocationPct) || DEFAULT_PRIZE_ALLOCATION_PCT));
        const minExpectedRev = Math.round(numMinExpected * numFee);
        calculatedPrize = Math.round(minExpectedRev * (allocationPct / 100));
        const baseProfit = minExpectedRev - calculatedPrize;

        financialSnapshot = {
          approved: true,
          status: 'APPROVED',
          minExpectedRegistrations: numMinExpected,
          feeAmount: numFee,
          feeType: modelFeeType,
          prizeAllocationPct: allocationPct,
          collegeProfitSharePct: 60,
          organizerProfitSharePct: 40,
          minExpectedRevenue: minExpectedRev,
          fixedPrizePool: calculatedPrize,
          baseProfit,
          approvedAt: new Date().toISOString()
        };
      }

      const createdItem = {
        id: nextId,
        title: title.trim(),
        category: properCategory,
        tagline: (tagline || '').trim(),
        description: (description || title).trim(),
        fullDescription: (fullDescription || description || title).trim(),
        date: date.trim(),
        time: (time || '09:00 AM - 05:00 PM').trim(),
        venue: venue.trim(),
        organizer: (organizer || 'University Events Committee').trim(),
        image: finalImage,
        imageUrl: finalImage,
        entryFee: entryFeeStr,
        registrationFee: entryFeeStr,
        feeAmount: numFee,
        feeType: modelFeeType,
        isPaid: numFee > 0,
        prizePoolType: poolType,
        prizeAllocationPct: allocationPct,
        minExpectedRegistrations: !isNaN(numMinExpected) && numMinExpected > 0 ? numMinExpected : null,
        financialSnapshot,
        prizePool: calculatedPrize > 0 ? `₹${calculatedPrize.toLocaleString('en-IN')}` : (numFee > 0 ? 'Dynamic Prize Pool' : 'Free'),
        prizeAmount: calculatedPrize,
        capacity: numCapacity,
        registeredCount: 0,
        featured: flagFeatured,
        isFeatured: flagFeatured,
        status: status || 'Open',
        managerName: managerName.trim(),
        managerPhone: managerPhone.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      events.push(createdItem);

      const jsonStr = JSON.stringify(events, null, 2);
      const tmpPath = `${eventsFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await fs.writeFile(tmpPath, jsonStr, 'utf-8');
      await fs.rename(tmpPath, eventsFilePath);

      return createdItem;
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: newEvent
    });
  } catch (error) {
    console.error('[Event Controller] createEvent error:', error.message);
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to create event'
    });
  }
}

/**
 * PUT /api/events/:id
 * Updates an existing campus event. Protected by manager authorization.
 * Allows configuring Registration Fee (free vs paid), Fee Billing Model, Capacity, and Prize Pool.
 */
export async function updateEvent(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updated = await enqueueEventWrite(async () => {
      const events = await readEventsFile();
      const eventIndex = events.findIndex((e) => e.id === id);
      if (eventIndex === -1) {
        const err = new Error(`Event with id '${id}' not found`);
        err.statusCode = 404;
        throw err;
      }

      const existing = events[eventIndex];

      // Validate title if provided
      const title = updateData.title !== undefined ? updateData.title.trim() : existing.title;
      if (!title) {
        const err = new Error('Event title cannot be empty');
        err.statusCode = 400;
        throw err;
      }

      // Validate capacity if provided
      let capacity = existing.capacity;
      if (updateData.capacity !== undefined) {
        const numCap = parseInt(updateData.capacity, 10);
        if (isNaN(numCap) || numCap <= 0) {
          const err = new Error('Capacity must be a positive integer');
          err.statusCode = 400;
          throw err;
        }

        // If reducing capacity, coordinate with waitlist storage to verify confirmed registrations
        // and safely rescind any excess active offers so confirmed + offers never exceeds new capacity
        if (numCap < existing.capacity) {
          const { handleCapacityReduction } = await import('../utils/waitlistStorage.js');
          await handleCapacityReduction(id, numCap);
        }

        capacity = numCap;
      }

      // Fee validation per specification:
      // Free events: fee = 0, no payment required.
      // Paid events: fee > 0, billing model explicit.
      let feeAmount = existing.feeAmount !== undefined ? existing.feeAmount : 0;
      let feeType = existing.feeType || 'per_person';
      let entryFee = existing.entryFee || 'Free';

      if (updateData.registrationType === 'free') {
        feeAmount = 0;
        entryFee = 'Free';
      } else if (updateData.registrationType === 'paid' || updateData.feeAmount !== undefined) {
        const parsedFee = Number(updateData.feeAmount);
        if (isNaN(parsedFee) || parsedFee < 0) {
          const err = new Error('Registration fee must be a non-negative number');
          err.statusCode = 400;
          throw err;
        }
        feeAmount = parsedFee;
        if (updateData.feeType) {
          if (!['per_person', 'per_team', 'person', 'team'].includes(updateData.feeType)) {
            const err = new Error("Fee billing model must be either 'per_person' or 'per_team'");
            err.statusCode = 400;
            throw err;
          }
          feeType = (updateData.feeType === 'per_team' || updateData.feeType === 'team') ? 'per_team' : 'per_person';
        }
        if (feeAmount > 0) {
          entryFee = `₹${feeAmount} ${feeType === 'per_team' ? 'per team' : 'per participant'}`;
        } else {
          entryFee = 'Free';
        }
      }

      // Prize Pool and Financial Configuration
      let minExpectedRegistrations = updateData.minExpectedRegistrations !== undefined
        ? updateData.minExpectedRegistrations
        : existing.minExpectedRegistrations;

      let prizeAllocationPct = updateData.prizeAllocationPct !== undefined
        ? Number(updateData.prizeAllocationPct)
        : (existing.prizeAllocationPct || DEFAULT_PRIZE_ALLOCATION_PCT);

      let prizePoolType = updateData.prizePoolType || existing.prizePoolType || (feeAmount > 0 ? 'dynamic' : 'fixed');
      let prizeAmount = updateData.prizeAmount !== undefined ? Number(updateData.prizeAmount) : (existing.prizeAmount || 0);

      const hasPrizePoolDeclared = Boolean(
        prizePoolType === 'dynamic' ||
        prizePoolType === 'registration_funded' ||
        prizeAmount > 0 ||
        (feeAmount > 0 && minExpectedRegistrations !== undefined && minExpectedRegistrations !== null)
      );

      const financialValidation = validateEventFinancialConfig({
        feeAmount,
        registrationType: feeAmount > 0 ? 'paid' : 'free',
        isPaid: feeAmount > 0,
        prizeAmount,
        prizePoolType,
        prizeAllocationPct,
        minExpectedRegistrations,
        hasPrizePool: hasPrizePoolDeclared
      });

      if (!financialValidation.isValid) {
        const err = new Error(financialValidation.errors.join('. '));
        err.statusCode = 400;
        throw err;
      }

      const numMinExpected = parseInt(minExpectedRegistrations, 10);
      const hasApprovedSnapshot = Boolean(existing.financialSnapshot && existing.financialSnapshot.approved);
      const isExplicitReapproval = Boolean(updateData.reapproveFinancials || updateData.explicitFinancialReapproval);

      // Check if financial parameters are being modified on an approved event
      const financialParametersChanged = hasApprovedSnapshot && (
        (feeAmount !== existing.financialSnapshot.feeAmount) ||
        (feeType !== existing.financialSnapshot.feeType) ||
        (!isNaN(numMinExpected) && numMinExpected !== existing.financialSnapshot.minExpectedRegistrations) ||
        (prizeAllocationPct !== existing.financialSnapshot.prizeAllocationPct)
      );

      // Immutability Guard: Reject silent recalculation of approved snapshots
      if (financialParametersChanged && !isExplicitReapproval) {
        const err = new Error(
          'Approved event financial snapshot is locked and immutable. ' +
          'Modifying minimum registrations, fee, fee type, or allocation percentage requires explicit manager re-approval (reapproveFinancials: true).'
        );
        err.statusCode = 400;
        throw err;
      }

      let financialSnapshot = existing.financialSnapshot || null;
      let calculatedPrize = 0;

      if (hasApprovedSnapshot && !isExplicitReapproval) {
        // PRESERVE IMMUTABLE SNAPSHOT EXACTLY
        financialSnapshot = existing.financialSnapshot;
        calculatedPrize = existing.financialSnapshot.fixedPrizePool;
        prizeAmount = calculatedPrize;
        // Keep locked financial parameters consistent with approved snapshot
        minExpectedRegistrations = existing.financialSnapshot.minExpectedRegistrations;
        feeAmount = existing.financialSnapshot.feeAmount;
        feeType = existing.financialSnapshot.feeType;
        prizeAllocationPct = existing.financialSnapshot.prizeAllocationPct;
      } else if (feeAmount > 0 && !isNaN(numMinExpected) && numMinExpected > 0) {
        // Initial snapshot creation or explicit manager re-approval
        prizePoolType = 'dynamic';
        prizeAllocationPct = Math.min(MAX_PRIZE_ALLOCATION_PCT, Math.max(MIN_PRIZE_ALLOCATION_PCT, prizeAllocationPct));
        const minExpectedRev = Math.round(numMinExpected * feeAmount);
        calculatedPrize = Math.round(minExpectedRev * (prizeAllocationPct / 100));
        const baseProfit = minExpectedRev - calculatedPrize;

        financialSnapshot = {
          approved: true,
          status: 'APPROVED',
          minExpectedRegistrations: numMinExpected,
          feeAmount,
          feeType,
          prizeAllocationPct,
          collegeProfitSharePct: 60,
          organizerProfitSharePct: 40,
          minExpectedRevenue: minExpectedRev,
          fixedPrizePool: calculatedPrize,
          baseProfit,
          approvedAt: new Date().toISOString(),
          approvedBy: req.user?.email || req.user?.fullName || 'Authorized Manager',
          reapproved: isExplicitReapproval
        };
        prizeAmount = calculatedPrize;
      } else if (feeAmount === 0) {
        prizePoolType = 'fixed';
        prizeAmount = 0;
        financialSnapshot = null;
        minExpectedRegistrations = null;
      }

      let prizePool = existing.prizePool || 'Free';
      if (prizeAmount > 0) {
        prizePool = `₹${prizeAmount.toLocaleString('en-IN')}`;
      } else if (updateData.prizePool) {
        prizePool = updateData.prizePool.trim();
      } else if (feeAmount === 0) {
        prizePool = existing.prizePool || 'Trophies & Citations';
      }

      const merged = {
        ...existing,
        ...updateData,
        id, // ID is immutable
        title,
        capacity,
        feeAmount,
        feeType,
        entryFee,
        registrationFee: entryFee,
        isPaid: feeAmount > 0,
        prizePoolType,
        prizeAmount,
        prizePool,
        prizeAllocationPct,
        minExpectedRegistrations: !isNaN(numMinExpected) && numMinExpected > 0 ? numMinExpected : null,
        financialSnapshot,
        updatedAt: new Date().toISOString()
      };

      events[eventIndex] = merged;

      const jsonStr = JSON.stringify(events, null, 2);
      const tmpPath = `${eventsFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await fs.writeFile(tmpPath, jsonStr, 'utf-8');
      await fs.rename(tmpPath, eventsFilePath);

      // Invalidate cached PDF so fresh changes immediately reflect on subsequent downloads
      invalidatePdfCache(id);

      return merged;
    });

    // Check if capacity increase or cancellation occurred to trigger waitlist processing
    try {
      if (updated.status === 'Cancelled') {
        const { handleEventCancelled } = await import('../utils/waitlistStorage.js');
        await handleEventCancelled(id);
      } else {
        const { allocateAvailableSeats } = await import('../utils/waitlistStorage.js');
        await allocateAvailableSeats(id);
      }
    } catch (waitlistErr) {
      console.warn('[Event Controller] Waitlist hook notice:', waitlistErr.message);
    }

    const allRegistrations = await getAllRegistrations().catch(() => []);
    const publicEvent = sanitizeEventForPublic(updated, allRegistrations);

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: publicEvent
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to update event'
    });
  }
}

/**
 * GET /api/events/:id/pdf
 * Generates or streams the dedicated participant specification PDF for an event.
 * Publicly accessible without requiring student authentication.
 */
export async function downloadEventPdf(req, res) {
  try {
    const { id } = req.params;
    const events = await readEventsFile();
    const event = events.find((e) => e.id === id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: `Event with id '${id}' not found`
      });
    }

    const allRegistrations = await getAllRegistrations().catch(() => []);
    const publicEvent = sanitizeEventForPublic(event, allRegistrations);

    // Merge in pdfDetails if present on canonical event
    if (event.pdfDetails) {
      publicEvent.pdfDetails = event.pdfDetails;
    }

    const pdfStream = await getOrGenerateEventPdf(publicEvent);

    const safeTitle = (event.title || 'event')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const filename = `FESTIQ-${event.id}-${safeTitle}.pdf`;

    const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=60');

    pdfStream.pipe(res);
  } catch (error) {
    console.error('[Event Controller] downloadEventPdf error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to generate event specification PDF',
      error: error.message
    });
  }
}
