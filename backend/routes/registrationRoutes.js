import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import {
  createRegistration,
  getAllRegistrations,
  getRegistrationById,
  getRegistrationsByUserId,
  claimRegistration,
  getEventDetails
} from '../utils/registrationStorage.js';
import { findUserById } from '../utils/userStorage.js';
import { requireAuth, requireManager } from '../middleware/authMiddleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'festiq_jwt_secret_dev_key_2026_kiit_secure';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const eventsFilePath = path.join(__dirname, '..', 'data', 'events.json');

const router = express.Router();

/**
 * POST /api/registrations
 * Handles both guest attendees and authenticated students.
 * Automatically generates a secure digital event pass with secret token.
 */
router.post('/', async (req, res) => {
  try {
    const { participantName, email, phone, eventId } = req.body;

    if (!participantName || !email || !phone || !eventId) {
      return res.status(400).json({
        success: false,
        message: 'All fields (participantName, email, phone, eventId) are required'
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit contact phone number'
      });
    }

    // Inspect optional authentication cookie
    let userId = null;
    let rollNumber = null;
    const sessionToken = req.cookies ? req.cookies.festiq_session : null;
    if (sessionToken) {
      try {
        const decoded = jwt.verify(sessionToken, JWT_SECRET);
        if (decoded && decoded.id) {
          userId = decoded.id;
          const user = await findUserById(decoded.id);
          if (user && user.rollNumber) {
            rollNumber = user.rollNumber;
          }
        }
      } catch {
        // Unauthenticated or expired cookie; treat as guest
      }
    }

    const registration = await createRegistration({
      participantName: participantName.trim(),
      email: email.trim().toLowerCase(),
      phone: cleanPhone,
      eventId: eventId.trim(),
      userId,
      rollNumber
    });

    return res.status(201).json({
      success: true,
      message: registration.requiresPayment
        ? 'Registration recorded as pending payment. Please complete payment to confirm your place and receive your digital pass.'
        : 'Registration recorded successfully. Digital event pass generated.',
      data: registration,
      requiresPayment: Boolean(registration.requiresPayment),
      feeAmount: registration.feeAmount || 0
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to record registration'
    });
  }
});

/**
 * GET /api/registrations/my-registrations
 * Protected endpoint: Returns all registrations belonging to the authenticated student.
 * Enforces strict student isolation (no student can view another student's registrations).
 */
router.get('/my-registrations', requireAuth, async (req, res) => {
  try {
    const studentRegistrations = await getRegistrationsByUserId(req.user.id);

    // Read events to enrich registrations with live event details
    let events = [];
    try {
      const raw = await fs.readFile(eventsFilePath, 'utf-8');
      events = JSON.parse(raw);
    } catch (e) {
      console.warn('[Registration Routes] Could not read events for enrichment:', e.message);
    }

    const eventMap = new Map(events.map((e) => [e.id, e]));

    const enriched = studentRegistrations.map((reg) => {
      const ev = eventMap.get(reg.eventId);
      return {
        ...reg,
        eventTitle: ev ? ev.title : (reg.eventTitle || reg.eventId),
        eventCategory: ev ? ev.category : (reg.category || 'General'),
        eventDate: ev ? ev.date : 'Upcoming',
        eventTime: ev ? ev.time : '',
        eventVenue: ev ? ev.venue : '',
        eventImage: ev ? (ev.imageUrl || ev.image) : '',
        eventStatus: ev ? ev.status : 'Open',
        eventDescription: ev ? ev.description : ''
      };
    });

    // Sort: upcoming first, then by registration date desc
    enriched.sort((a, b) => {
      const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
      const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
      return dateB - dateA;
    });

    return res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (error) {
    console.error('[Registration Routes] Error fetching student registrations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your registered events',
      error: error.message
    });
  }
});

/**
 * GET /api/registrations/:id/pass
 * Protected endpoint: Retrieve digital pass details for an individual registration.
 * Validates strict ownership: rejects unauthorized access if registration does not belong to req.user.
 */
router.get('/:id/pass', requireAuth, async (req, res) => {
  try {
    const reg = await getRegistrationById(req.params.id);
    if (!reg) {
      return res.status(404).json({
        success: false,
        message: `Registration or Pass with ID '${req.params.id}' was not found`
      });
    }

    // Ownership verification
    const isOwner = reg.userId === req.user.id;
    const isManager = req.user.role === 'manager' || req.user.role === 'admin';
    if (!isOwner && !isManager) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this digital pass'
      });
    }

    // Withhold digital event pass if registration payment is pending or unverified
    if (reg.status === 'pending_payment' || reg.paymentStatus === 'pending' || !reg.pass || reg.pass.status !== 'valid') {
      return res.status(402).json({
        success: false,
        message: 'Payment Required: Digital event pass is withheld until registration fee is confirmed and verified.',
        registrationId: reg.id,
        paymentStatus: reg.paymentStatus || 'pending',
        feeAmount: reg.payment?.amount || 0
      });
    }

    const event = await getEventDetails(reg.eventId);

    return res.status(200).json({
      success: true,
      data: {
        registration: reg,
        event: event || null
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve digital pass',
      error: error.message
    });
  }
});

/**
 * POST /api/registrations/claim
 * Protected endpoint: Link an unlinked or guest registration to the authenticated student account.
 * Requires Pass ID + Secret Pass Token (SHA-256 hash verified using constant-time equality).
 */
router.post('/claim', requireAuth, async (req, res) => {
  try {
    const { passId, passToken } = req.body;
    if (!passId || !passToken) {
      return res.status(400).json({
        success: false,
        message: 'Both Pass ID and Secret Pass Token are required to claim a registration'
      });
    }

    const claimedReg = await claimRegistration({
      passId: passId.trim(),
      token: passToken.trim(),
      userId: req.user.id,
      userRollNumber: req.user.rollNumber || null
    });

    const event = await getEventDetails(claimedReg.eventId);

    return res.status(200).json({
      success: true,
      message: `Registration for '${event?.title || claimedReg.eventTitle}' successfully linked to your student dashboard!`,
      data: {
        ...claimedReg,
        eventTitle: event ? event.title : claimedReg.eventTitle,
        eventCategory: event ? event.category : claimedReg.category,
        eventDate: event ? event.date : 'Upcoming',
        eventVenue: event ? event.venue : ''
      }
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to claim registration'
    });
  }
});

/**
 * GET /api/registrations
 * Manager Protected endpoint: Returns all participant registrations for management portal.
 */
router.get('/', requireAuth, requireManager, async (req, res) => {
  try {
    const registrations = await getAllRegistrations();
    let events = [];
    try {
      const raw = await fs.readFile(eventsFilePath, 'utf-8');
      events = JSON.parse(raw);
    } catch (e) {
      console.warn('[Registration Routes] Could not read events for enrichment:', e.message);
    }

    const eventMap = new Map(events.map((e) => [e.id, e]));

    // Enrich registrations with eventTitle and eventCategory for participant table
    const enriched = registrations.map((reg) => {
      const ev = eventMap.get(reg.eventId);
      return {
        ...reg,
        eventTitle: ev ? ev.title : (reg.eventId || 'Unknown Event'),
        eventCategory: ev ? ev.category : 'General',
        eventVenue: ev ? ev.venue : '',
        passId: reg.pass?.passId || reg.passId || 'N/A',
        checkedIn: Boolean(reg.pass?.checkedIn || reg.checkedIn),
        checkedInAt: reg.pass?.checkedInAt || reg.checkedInAt || null
      };
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to read registrations',
      error: error.message
    });
  }
});

export default router;
