import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webhooksFilePath = path.join(__dirname, '..', 'data', 'processedWebhooks.json');

// Configuration keys from environment with safe local development defaults
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key_2026';
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'festiq_rzp_secret_dev_2026_kiit';
export const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'festiq_webhook_secret_dev_2026_kiit';
export const PAYMENT_MODE = process.env.PAYMENT_MODE || 'simulation'; // 'live' | 'test' | 'simulation'

// Persistent Cache of processed webhook event IDs to guarantee idempotency and prevent replay attacks across restarts
const processedWebhookEventIds = new Set();

function initProcessedWebhooks() {
  try {
    if (fs.existsSync(webhooksFilePath)) {
      const raw = fs.readFileSync(webhooksFilePath, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach(id => processedWebhookEventIds.add(id));
      }
    } else {
      fs.writeFileSync(webhooksFilePath, '[]', 'utf-8');
    }
  } catch (err) {
    console.warn('[Payment Service] Could not initialize processedWebhooks.json:', err.message);
  }
}

initProcessedWebhooks();

function persistWebhookEvent(eventId) {
  try {
    const list = Array.from(processedWebhookEventIds);
    fs.writeFileSync(webhooksFilePath, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Payment Service] Failed to persist processed webhook event:', err.message);
  }
}

/**
 * Checks if live merchant gateway credentials are configured.
 */
export function isLiveGatewayConfigured() {
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    !process.env.RAZORPAY_KEY_ID.includes('placeholder') &&
    process.env.PAYMENT_MODE === 'live'
  );
}

/**
 * Creates a server-side payment order.
 * Strictly calculates amount server-side; NEVER trusts client-submitted amounts.
 */
export async function createPaymentOrder({
  registrationId,
  eventId,
  eventTitle,
  feeAmount,
  currency = 'INR',
  participantName,
  email,
  phone
}) {
  const amountNumber = Math.max(0, Number(feeAmount) || 0);
  if (amountNumber <= 0) {
    throw new Error('Payment order cannot be created for free events (fee must be > 0)');
  }

  const amountPaise = Math.round(amountNumber * 100);

  if (isLiveGatewayConfigured()) {
    const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency,
        receipt: `rcpt_${registrationId.slice(0, 30)}`,
        notes: {
          registrationId,
          eventId,
          eventTitle,
          participantName,
          email
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('[Payment Service] Live Razorpay Order Error:', errData);
      throw new Error(`Live Gateway Order Error: ${errData.error?.description || response.statusText}`);
    }

    const orderData = await response.json();
    return {
      orderId: orderData.id,
      amount: amountNumber,
      amountPaise,
      currency,
      keyId: RAZORPAY_KEY_ID,
      isSimulation: false,
      provider: 'razorpay'
    };
  }

  // Secure Simulation / Development Mode with Standard Razorpay Order Structure
  const orderId = `order_fest_${crypto.randomBytes(8).toString('hex')}`;
  return {
    orderId,
    amount: amountNumber,
    amountPaise,
    currency,
    keyId: RAZORPAY_KEY_ID,
    isSimulation: true,
    provider: 'razorpay_simulation',
    notice: 'Local Simulation Mode: Using standard INR Razorpay order schema and cryptographic HMAC verification.'
  };
}

/**
 * Verifies gateway payment signature using HMAC-SHA256.
 * Formula: HMAC_SHA256(order_id + "|" + payment_id, secret)
 */
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature) return false;

  const generatedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  try {
    const a = Buffer.from(generatedSignature, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Generates valid HMAC-SHA256 signature for test executions.
 */
export function generateTestPaymentSignature(orderId, paymentId) {
  return crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

/**
 * Verifies Razorpay Webhook signature against raw payload.
 */
export function verifyWebhookSignature(rawPayload, signature) {
  if (!rawPayload || !signature) return false;

  let payloadString;
  if (Buffer.isBuffer(rawPayload)) {
    payloadString = rawPayload.toString('utf8');
  } else if (typeof rawPayload === 'string') {
    payloadString = rawPayload;
  } else {
    payloadString = JSON.stringify(rawPayload);
  }

  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(payloadString)
    .digest('hex');

  try {
    const a = Buffer.from(expectedSignature, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Checks and records webhook event for idempotency and replay prevention.
 * Persists event ID immediately to persistent JSON storage.
 */
export function markWebhookProcessed(eventId) {
  if (!eventId) return false;
  if (processedWebhookEventIds.has(eventId)) {
    return false; // Already processed
  }
  processedWebhookEventIds.add(eventId);
  persistWebhookEvent(eventId);
  return true;
}

/**
 * Checks if a webhook event was previously processed.
 */
export function isWebhookProcessed(eventId) {
  if (!eventId) return false;
  return processedWebhookEventIds.has(eventId);
}
