import express from 'express';
import { requireAuth, requireManager } from '../middleware/authMiddleware.js';
import {
  joinWaitlist,
  getStudentWaitlistEntries,
  acceptSeatOffer,
  declineSeatOffer,
  withdrawWaitlist,
  getEventWaitlistStats,
  getAllWaitlistEntries
} from '../utils/waitlistStorage.js';

const router = express.Router();

/**
 * POST /api/waitlist/join
 * Protected endpoint: Student joins FIFO waitlist for a full event.
 */
router.post('/join', requireAuth, async (req, res) => {
  try {
    const { eventId, participantName, email, phone, rollNumber } = req.body;

    const entry = await joinWaitlist({
      eventId: eventId ? eventId.trim() : null,
      userId: req.user.id,
      participantName: (participantName || req.user.fullName || '').trim(),
      email: (email || req.user.email || '').trim().toLowerCase(),
      phone: (phone || req.user.phone || '9876543210').trim(),
      rollNumber: rollNumber || req.user.rollNumber || null
    });

    return res.status(201).json({
      success: true,
      message: `Successfully joined waitlist for '${entry.eventTitle}'! Your current queue position is #${entry.queuePosition}.`,
      data: entry
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to join waitlist',
      directRegistrationAvailable: Boolean(error.directRegistrationAvailable)
    });
  }
});

/**
 * GET /api/waitlist/my-waitlist
 * Protected endpoint: Returns authenticated student's waitlist entries with live queue ranks.
 */
router.get('/my-waitlist', requireAuth, async (req, res) => {
  try {
    const entries = await getStudentWaitlistEntries(req.user.id, req.user.email);
    return res.status(200).json({
      success: true,
      count: entries.length,
      data: entries
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your waitlist entries',
      error: error.message
    });
  }
});

/**
 * POST /api/waitlist/:id/accept
 * Protected endpoint: Student accepts a time-limited seat offer.
 */
router.post('/:id/accept', requireAuth, async (req, res) => {
  try {
    const result = await acceptSeatOffer({
      waitlistId: req.params.id,
      userId: req.user.id
    });

    return res.status(200).json({
      success: true,
      message: result.requiresPayment
        ? 'Seat offer accepted! Please complete registration payment to confirm your place.'
        : 'Seat offer accepted! Your digital event pass has been issued.',
      data: result
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to accept seat offer',
      expired: Boolean(error.expired)
    });
  }
});

/**
 * POST /api/waitlist/:id/decline
 * Protected endpoint: Student declines a seat offer, immediately offering to next in queue.
 */
router.post('/:id/decline', requireAuth, async (req, res) => {
  try {
    const entry = await declineSeatOffer({
      waitlistId: req.params.id,
      userId: req.user.id
    });

    return res.status(200).json({
      success: true,
      message: 'Seat offer declined. The seat has been offered to the next student in queue.',
      data: entry
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to decline seat offer'
    });
  }
});

/**
 * POST /api/waitlist/:id/withdraw
 * Protected endpoint: Student withdraws from waitlist.
 */
router.post('/:id/withdraw', requireAuth, async (req, res) => {
  try {
    const entry = await withdrawWaitlist({
      waitlistId: req.params.id,
      userId: req.user.id
    });

    return res.status(200).json({
      success: true,
      message: 'You have withdrawn from the waitlist.',
      data: entry
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to withdraw from waitlist'
    });
  }
});

/**
 * GET /api/waitlist/event/:eventId
 * Public/Authenticated: Real-time waitlist counts for an event.
 */
router.get('/event/:eventId', async (req, res) => {
  try {
    const stats = await getEventWaitlistStats(req.params.eventId);
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve waitlist statistics',
      error: error.message
    });
  }
});

/**
 * GET /api/waitlist/all
 * Manager Protected: Full waitlist roster for management oversight.
 */
router.get('/all', requireAuth, requireManager, async (req, res) => {
  try {
    const entries = await getAllWaitlistEntries();
    return res.status(200).json({
      success: true,
      count: entries.length,
      data: entries
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve waitlist roster',
      error: error.message
    });
  }
});

export default router;
