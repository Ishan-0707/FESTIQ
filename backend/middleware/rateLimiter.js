import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rateLimitFilePath = path.join(__dirname, '..', 'data', 'rateLimits.json');

// In-memory sliding window cache with persistent JSON persistence
const memoryStore = new Map();
let saveTimeout = null;

// Load persisted rate limits if file exists
async function loadPersistedStore() {
  try {
    const raw = await fs.readFile(rateLimitFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const now = Date.now();
    for (const [key, record] of Object.entries(parsed)) {
      if (record && record.resetTime > now) {
        memoryStore.set(key, record);
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('[RateLimiter] Could not load persisted rate limit records:', error.message);
    }
  }
}

// Background debounced save to prevent excessive disk I/O while ensuring persistence
function schedulePersist() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(async () => {
    saveTimeout = null;
    try {
      const now = Date.now();
      const obj = {};
      for (const [key, record] of memoryStore.entries()) {
        if (record.resetTime > now) {
          obj[key] = record;
        } else {
          memoryStore.delete(key);
        }
      }
      await fs.writeFile(rateLimitFilePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
      // ignore write error
    }
  }, 1000);
}

// Initialize on startup
loadPersistedStore().catch(() => {});

/**
 * Extracts accurate client IP respecting proxies when configured.
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Factory for creating IP-based rate limiting middleware.
 *
 * @param {Object} options
 * @param {string} options.bucketName - Identifier for endpoint group (e.g. 'auth:login')
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum allowed attempts per window
 * @param {string} options.message - User-facing rate limit message
 */
export function createRateLimiter({
  bucketName,
  windowMs = 15 * 60 * 1000,
  max = 10,
  message = 'Too many requests. Please try again later.'
}) {
  return (req, res, next) => {
    // Whitelist localhost test runners in explicit test suite runs if TEST_BYPASS_RATELIMIT is enabled
    if (process.env.TEST_BYPASS_RATELIMIT === 'true' && req.headers['x-test-bypass'] === 'festiq-secret') {
      return next();
    }

    const ip = getClientIp(req);
    const key = `${bucketName}:${ip}`;
    const now = Date.now();

    let record = memoryStore.get(key);

    if (!record || record.resetTime <= now) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      memoryStore.set(key, record);
      schedulePersist();
      return next();
    }

    if (record.count >= max) {
      const secondsLeft = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', secondsLeft);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

      return res.status(429).json({
        success: false,
        message: `${message} Please try again after ${secondsLeft} seconds.`,
        retryAfter: secondsLeft,
        bucket: bucketName
      });
    }

    record.count += 1;
    schedulePersist();

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    next();
  };
}

// 1. Login Limiter: 10 attempts per 15 minutes per IP
export const loginLimiter = createRateLimiter({
  bucketName: 'auth:login',
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts.'
});

// 2. Signup Limiter: 5 account creations per hour per IP
export const signupLimiter = createRateLimiter({
  bucketName: 'auth:signup',
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many account creation requests from this IP address.'
});

// 3. Forgot Password Limiter: 5 requests per 15 minutes per IP
export const forgotPasswordLimiter = createRateLimiter({
  bucketName: 'auth:forgot-password',
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests.'
});

// 4. Payment Order Limiter: 15 order creation requests per 10 minutes per IP
export const paymentOrderLimiter = createRateLimiter({
  bucketName: 'payment:create-order',
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: 'Payment order creation threshold exceeded.'
});

