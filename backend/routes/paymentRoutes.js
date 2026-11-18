import express from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getRegistrationById,
  getAllRegistrations,
  getEventDetails,
  recordPaymentOrder,
  confirmPaidRegistration,
  failRegistrationPayment
} from '../utils/registrationStorage.js';
import {
  createPaymentOrder,
  verifyPaymentSignature,
  generateTestPaymentSignature,
  verifyWebhookSignature,
  markWebhookProcessed,
  RAZORPAY_KEY_ID,
  isLiveGatewayConfigured,
  PAYMENT_MODE
} from '../services/paymentService.js';
import { paymentOrderLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * GET /api/payments/config
 * Returns public payment configuration (Razorpay Key ID and payment mode).
 * Never exposes secrets.
 */
router.get('/config', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      keyId: RAZORPAY_KEY_ID,
      currency: 'INR',
      provider: isLiveGatewayConfigured() ? 'razorpay' : 'razorpay_simulation',
      mode: PAYMENT_MODE,
      isLiveConfigured: isLiveGatewayConfigured()
    }
  });
});

/**
 * POST /api/payments/create-order
 * Creates a server-side payment order for a pending registration.
 * Validates registration ownership and server-side event fee.
 * Protected by rate limiting.
 */
router.post('/create-order', paymentOrderLimiter, requireAuth, async (req, res) => {
  try {
    const { registrationId } = req.body;
    if (!registrationId) {
      return res.status(400).json({
        success: false,
        message: 'registrationId is required to create a payment order'
      });
    }

    const reg = await getRegistrationById(registrationId);
    if (!reg) {
      return res.status(404).json({
        success: false,
        message: `Registration '${registrationId}' not found`
      });
    }

    // Strict ownership verification: student can only pay for their own registration
    const isOwner = reg.userId === req.user.id || reg.email.toLowerCase() === req.user.email.toLowerCase();
    const isManager = req.user.role === 'manager' || req.user.role === 'admin';
    if (!isOwner && !isManager) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot initiate payment for another student registration'
      });
    }

    // Check if registration is already paid
    if (reg.paymentStatus === 'paid' && reg.status === 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'This registration has already been paid and confirmed'
      });
    }

    // Server-side event fee resolution — NEVER trusts client amount
    const event = await getEventDetails(reg.eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Associated campus event not found'
      });
    }

    const feeAmount = Math.max(0, Number(event.feeAmount) || 0);
    if (feeAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This event is free. No payment order is required.'
      });
    }

    const order = await createPaymentOrder({
      registrationId: reg.id,
      eventId: event.id,
      eventTitle: event.title,
      feeAmount,
      currency: 'INR',
      participantName: reg.participantName,
      email: reg.email,
      phone: reg.phone
    });

    // Record order ID against registration
    await recordPaymentOrder({
      registrationId: reg.id,
      orderId: order.orderId
    });

    res.status(200).json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        orderId: order.orderId,
        amount: order.amount,
        amountPaise: order.amountPaise,
        currency: order.currency,
        keyId: order.keyId,
        isSimulation: order.isSimulation,
        provider: order.provider,
        registrationId: reg.id,
        eventTitle: event.title,
        feeType: event.feeType || 'per_person',
        participantName: reg.participantName,
        email: reg.email,
        phone: reg.phone
      }
    });
  } catch (error) {
    console.error('[Payment Routes] Create order error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment order'
    });
  }
});

/**
 * POST /api/payments/verify
 * Server-side payment verification endpoint.
 * Validates HMAC-SHA256 signature, prevents tampering, and confirms registration.
 */
router.post('/verify', requireAuth, async (req, res) => {
  try {
    const registrationId = req.body.registrationId;
    const orderId = req.body.orderId || req.body.razorpay_order_id;
    const paymentId = req.body.paymentId || req.body.razorpay_payment_id;
    const signature = req.body.signature || req.body.razorpay_signature;
    const method = req.body.method;

    if (!registrationId || !orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        message: 'All verification parameters (registrationId, orderId, paymentId, signature) are required'
      });
    }

    const reg = await getRegistrationById(registrationId);
    if (!reg) {
      return res.status(404).json({
        success: false,
        message: `Registration '${registrationId}' not found`
      });
    }

    // Ownership check
    const isOwner = reg.userId === req.user.id || reg.email.toLowerCase() === req.user.email.toLowerCase();
    const isManager = req.user.role === 'manager' || req.user.role === 'admin';
    if (!isOwner && !isManager) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot verify payment for another registration'
      });
    }

    // Server-side cryptographic signature verification
    const isValidSignature = verifyPaymentSignature({
      orderId,
      paymentId,
      signature
    });

    if (!isValidSignature) {
      await failRegistrationPayment({
        registrationId,
        orderId,
        errorReason: 'Invalid cryptographic payment signature (potential tampering detected)'
      });

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid cryptographic payment signature. Tampering rejected.'
      });
    }

    // Atomically confirm paid registration and issue digital pass
    const confirmedReg = await confirmPaidRegistration({
      registrationId,
      orderId,
      paymentId,
      method: method || 'gateway_checkout',
      verifiedBy: req.user.email
    });

    res.status(200).json({
      success: true,
      message: 'Payment successfully verified! Registration confirmed and digital event pass issued.',
      data: confirmedReg
    });
  } catch (error) {
    console.error('[Payment Routes] Verification error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment verification failed'
    });
  }
});

/**
 * POST /api/payments/simulate-success
 * Development / Test suite endpoint:
 * Allows automated test runners and dev simulation checkout to sign and verify a transaction cleanly.
 */
router.post('/simulate-success', requireAuth, async (req, res) => {
  try {
    const { registrationId, orderId } = req.body;
    if (!registrationId || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'registrationId and orderId are required'
      });
    }

    const reg = await getRegistrationById(registrationId);
    if (!reg) {
      return res.status(404).json({
        success: false,
        message: `Registration '${registrationId}' not found`
      });
    }

    // Ownership check
    const isOwner = reg.userId === req.user.id || reg.email.toLowerCase() === req.user.email.toLowerCase();
    const isManager = req.user.role === 'manager' || req.user.role === 'admin';
    if (!isOwner && !isManager) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const simulatedPaymentId = `pay_sim_${crypto.randomBytes(8).toString('hex')}`;
    const validSignature = generateTestPaymentSignature(orderId, simulatedPaymentId);

    const confirmedReg = await confirmPaidRegistration({
      registrationId,
      orderId,
      paymentId: simulatedPaymentId,
      method: 'simulation_test_card',
      verifiedBy: req.user.email
    });

    res.status(200).json({
      success: true,
      message: 'Simulated payment verified successfully',
      data: confirmedReg,
      signature: validSignature,
      paymentId: simulatedPaymentId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Simulation verification error'
    });
  }
});

/**
 * POST /api/payments/webhook
 * Public Razorpay Webhook receiver.
 * Verifies payload signature, prevents replay attacks, and processes captured/failed payments.
 */
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing X-Razorpay-Signature header'
      });
    }

    // Verify raw payload signature
    const isValid = verifyWebhookSignature(req.rawBody || req.body, signature);
    if (!isValid) {
      console.warn('[Payment Webhook] Rejected webhook with invalid signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    let payload = null;
    try {
      payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (Buffer.isBuffer(req.body)) {
        payload = JSON.parse(req.body.toString('utf8'));
      }
    } catch {
      payload = {};
    }

    const eventName = payload.event;
    const eventId = payload.id || `evt_${Date.now()}`;

    // Idempotency check: Reject duplicate webhook processing
    const isFirstTime = markWebhookProcessed(eventId);
    if (!isFirstTime) {
      return res.status(200).json({
        status: 'already_processed',
        message: 'Webhook event was previously processed'
      });
    }

    console.log(`[Payment Webhook] Processing event: ${eventName} (${eventId})`);

    // Handle payment captured or order paid
    if (eventName === 'payment.captured' || eventName === 'order.paid') {
      const paymentEntity = payload.payload?.payment?.entity || {};
      const orderEntity = payload.payload?.order?.entity || {};

      let registrationId =
        paymentEntity.notes?.registrationId ||
        orderEntity.notes?.registrationId;

      const orderId = paymentEntity.order_id || orderEntity.id;
      const paymentId = paymentEntity.id;

      if (!registrationId && orderId) {
        const allRegs = await getAllRegistrations();
        const found = allRegs.find(r => r.payment?.orderId === orderId);
        if (found) registrationId = found.id;
      }

      if (registrationId) {
        await confirmPaidRegistration({
          registrationId,
          orderId,
          paymentId,
          method: paymentEntity.method || 'webhook_captured',
          verifiedBy: 'razorpay_webhook'
        });
      }
    } else if (eventName === 'payment.failed') {
      const paymentEntity = payload.payload?.payment?.entity || {};
      let registrationId = paymentEntity.notes?.registrationId;
      const orderId = paymentEntity.order_id;
      const errorDescription = paymentEntity.error_description || 'Payment gateway reported failure';

      if (!registrationId && orderId) {
        const allRegs = await getAllRegistrations();
        const found = allRegs.find(r => r.payment?.orderId === orderId);
        if (found) registrationId = found.id;
      }

      if (registrationId) {
        await failRegistrationPayment({
          registrationId,
          orderId,
          errorReason: errorDescription
        });
      }
    }

    return res.status(200).json({
      status: 'success',
      received: true
    });
  } catch (error) {
    console.error('[Payment Webhook] Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

export default router;
