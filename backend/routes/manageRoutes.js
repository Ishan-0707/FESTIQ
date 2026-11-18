import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, requireManager } from '../middleware/authMiddleware.js';
import {
  getAllRegistrations,
  checkInPass,
  getAttendanceStats,
  getEventDetails,
  confirmPaidRegistration
} from '../utils/registrationStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const eventsFilePath = path.join(__dirname, '..', 'data', 'events.json');

const router = express.Router();

/**
 * GET /api/manage/overview
 * Real-time aggregated statistics for Management Dashboard.
 * Protected by requireAuth and requireManager.
 */
router.get('/overview', requireAuth, requireManager, async (req, res) => {
  try {
    const rawEvents = await fs.readFile(eventsFilePath, 'utf-8');
    const events = JSON.parse(rawEvents);
    const registrations = await getAllRegistrations();

    // Group actual registrations by eventId
    const regCountByEvent = {};
    const checkedInCountByEvent = {};
    for (const reg of registrations) {
      if (reg.eventId) {
        regCountByEvent[reg.eventId] = (regCountByEvent[reg.eventId] || 0) + 1;
        if (reg.pass?.checkedIn || reg.checkedIn) {
          checkedInCountByEvent[reg.eventId] = (checkedInCountByEvent[reg.eventId] || 0) + 1;
        }
      }
    }

    let totalCapacity = 0;
    let totalAvailableSeats = 0;
    let totalPrizePoolAmount = 0;
    let totalCheckedIn = 0;
    let totalRevenueCollected = 0;
    let totalPaidRegistrations = 0;
    let totalPendingPayments = 0;

    for (const r of registrations) {
      const isPaid = r.paymentStatus === 'paid' || (r.payment && r.payment.status === 'paid' && r.payment.verified === true);
      const isPending = r.paymentStatus === 'pending' || r.status === 'pending_payment';
      if (isPaid) {
        totalPaidRegistrations++;
        totalRevenueCollected += Number(r.payment?.amount || 0);
      }
      if (isPending) {
        totalPendingPayments++;
      }
    }

    const eventBreakdown = events.map((ev) => {
      const cap = Number(ev.capacity) || 0;
      totalCapacity += cap;

      const prize = Number(ev.prizeAmount) || 0;
      totalPrizePoolAmount += prize;

      const actualRegs = regCountByEvent[ev.id] || 0;
      const checkedIn = checkedInCountByEvent[ev.id] || 0;
      totalCheckedIn += checkedIn;

      const available = Math.max(0, cap - actualRegs);
      totalAvailableSeats += available;

      return {
        id: ev.id,
        title: ev.title,
        category: ev.category,
        capacity: cap,
        actualRegistrations: actualRegs,
        checkedInAttendees: checkedIn,
        availableSeats: available,
        status: ev.status || 'Open',
        managerName: ev.managerName || 'Coordinator Desk (Demo)',
        managerPhone: ev.managerPhone || '+91 00000 00000'
      };
    });

    const eventMap = new Map(events.map((e) => [e.id, e]));

    // Format recent registrations (latest 50)
    const recent = [...registrations]
      .sort((a, b) => new Date(b.registeredAt || 0) - new Date(a.registeredAt || 0))
      .slice(0, 50)
      .map((r) => {
        const ev = eventMap.get(r.eventId);
        const isPaid = r.paymentStatus === 'paid' || (r.payment && r.payment.status === 'paid' && r.payment.verified === true);
        const isPending = r.paymentStatus === 'pending' || r.status === 'pending_payment';
        const feeAmount = Number(r.payment?.amount || ev?.feeAmount || 0);
        const regType = (feeAmount > 0) ? 'Paid' : 'Free';
        const displayPaymentStatus = isPaid ? 'Paid' : isPending ? 'Pending' : r.paymentStatus === 'failed' ? 'Failed' : 'Free';

        return {
          id: r.id,
          passId: r.pass?.passId || r.passId || 'Pending Payment',
          participantName: r.participantName,
          email: r.email,
          phone: r.phone,
          rollNumber: r.rollNumber,
          eventId: r.eventId,
          eventTitle: ev ? ev.title : r.eventId,
          registeredAt: r.registeredAt,
          checkedIn: Boolean(r.pass?.checkedIn || r.checkedIn),
          status: r.status || 'confirmed',
          registrationType: regType,
          feeAmount,
          paymentStatus: displayPaymentStatus,
          rawPaymentStatus: r.paymentStatus || (r.payment?.status) || 'free',
          amountPaid: isPaid ? feeAmount : 0,
          transactionReference: r.payment?.transactionId || (regType === 'Free' ? 'N/A (Free)' : isPending ? 'Pending Gateway' : 'None'),
          paymentGateway: r.payment?.provider || (isPaid ? 'Razorpay' : 'None'),
          paidAt: r.payment?.paidAt || null,
          verifiedBy: r.payment?.verifiedBy || null
        };
      });

    res.status(200).json({
      success: true,
      data: {
        totalEvents: events.length,
        totalRegistrations: registrations.length,
        totalCheckedIn,
        totalCapacity,
        totalAvailableSeats,
        totalPrizePoolAmount,
        totalPrizePoolFormatted: `₹${totalPrizePoolAmount.toLocaleString('en-IN')}`,
        totalRevenueCollected,
        totalRevenueFormatted: `₹${totalRevenueCollected.toLocaleString('en-IN')}`,
        totalPaidRegistrations,
        totalPendingPayments,
        recentRegistrations: recent,
        eventBreakdown
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Manage Routes] Overview error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to generate management overview',
      error: error.message
    });
  }
});

/**
 * POST /api/manage/check-in
 * Manager QR Check-in Endpoint.
 * Validates pass token, matches event, rejects duplicate scans, records check-in atomically.
 */
router.post('/check-in', requireAuth, requireManager, async (req, res) => {
  try {
    const { eventId, passId, token } = req.body;

    if (!passId) {
      return res.status(400).json({
        success: false,
        message: 'Pass ID is required for event check-in'
      });
    }

    const updatedReg = await checkInPass({
      eventId: eventId ? eventId.trim() : null,
      passId: passId.trim(),
      token: token ? token.trim() : null,
      managerName: req.user?.fullName || 'Event Manager'
    });

    const event = await getEventDetails(updatedReg.eventId);

    return res.status(200).json({
      success: true,
      message: `Check-in confirmed for ${updatedReg.participantName}! Welcome to ${event?.title || updatedReg.eventTitle}.`,
      data: {
        registrationId: updatedReg.id,
        passId: updatedReg.pass?.passId || updatedReg.id,
        participantName: updatedReg.participantName,
        email: updatedReg.email,
        phone: updatedReg.phone,
        rollNumber: updatedReg.rollNumber,
        eventId: updatedReg.eventId,
        eventTitle: event?.title || updatedReg.eventTitle,
        category: event?.category || updatedReg.category,
        checkedInAt: updatedReg.pass?.checkedInAt || updatedReg.checkedInAt,
        checkedInBy: updatedReg.pass?.checkedInBy || updatedReg.checkedInBy
      }
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Check-in processing failed',
      alreadyCheckedIn: Boolean(error.alreadyCheckedIn),
      checkedInAt: error.checkedInAt || null
    });
  }
});

/**
 * GET /api/manage/attendance/:eventId
 * Retrieve real-time event attendance KPIs and recent check-ins list.
 */
router.get('/attendance/:eventId', requireAuth, requireManager, async (req, res) => {
  try {
    const stats = await getAttendanceStats(req.params.eventId);
    const event = await getEventDetails(req.params.eventId);

    return res.status(200).json({
      success: true,
      data: {
        ...stats,
        eventTitle: event?.title || req.params.eventId,
        capacity: event?.capacity || 0
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve event attendance statistics',
      error: error.message
    });
  }
});

/**
 * POST /api/manage/registrations/:id/verify-payment
 * Manager-protected endpoint: Auditable manual payment verification for cash/offline registrations.
 * Records the verifying manager identity, issues digital pass, and marks registration confirmed.
 */
router.post('/registrations/:id/verify-payment', requireAuth, requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const confirmedReg = await confirmPaidRegistration({
      registrationId: id,
      orderId: `MANUAL_ORDER_${Date.now()}`,
      paymentId: `MANUAL_AUDIT_${Date.now()}`,
      method: 'manual_manager_verification',
      verifiedBy: `${req.user.fullName || 'Manager'} (${req.user.email})`
    });

    return res.status(200).json({
      success: true,
      message: `Payment verified by manager ${req.user.fullName || 'Manager'}. Registration confirmed and digital pass generated.`,
      data: confirmedReg,
      remarks: remarks || 'Manual verification by authorized desk lead'
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Manual payment verification failed'
    });
  }
});

export default router;
