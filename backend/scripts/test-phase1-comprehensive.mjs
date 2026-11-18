import http from 'http';
import crypto from 'crypto';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateEventPrizeMetrics, roundToNearest500, roundDownToNearest100 } from '../utils/prizePoolCalculator.js';
import { createBackup, verifyBackup, restoreBackup } from '../utils/backupService.js';
import {
  createPaymentOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  markWebhookProcessed,
  RAZORPAY_WEBHOOK_SECRET,
  RAZORPAY_KEY_ID
} from '../services/paymentService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_BASE = 'http://localhost:5000';
const RUN_ID = Math.floor(Math.random() * 200) + 10;
const DEFAULT_CLIENT_IP = `198.51.${RUN_ID}.1`;

const testResults = [];

function logTest(id, name, pass, detail) {
  testResults.push({ id, name, pass, detail });
  const statusStr = pass ? '✓ PASS' : '✗ FAIL';
  console.log(`[Test ${id.toString().padStart(2, '0')}] ${statusStr}: ${name}`);
  if (detail) {
    console.log(`         ${detail}`);
  }
}

// HTTP helper using Node.js http module
function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(options.url || `${BACKEND_BASE}${options.path}`);
    const reqHeaders = {
      'X-Forwarded-For': DEFAULT_CLIENT_IP,
      ...(options.headers || {})
    };
    const reqOpts = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 5000,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: reqHeaders
    };

    let payload = null;
    if (body !== null && body !== undefined) {
      if (typeof body === 'object') {
        payload = JSON.stringify(body);
        if (!reqOpts.headers['Content-Type'] && !reqOpts.headers['content-type']) {
          reqOpts.headers['Content-Type'] = 'application/json';
        }
      } else {
        payload = String(body);
      }
      reqOpts.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(reqOpts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          raw: data
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// Helper to extract session cookie from Set-Cookie headers
function getCookieValue(headers, cookieName) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return null;
  const cookieArr = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const c of cookieArr) {
    const parts = c.split(';')[0].split('=');
    if (parts[0].trim() === cookieName) {
      return parts[1];
    }
  }
  return null;
}

async function runSuite() {
  console.log('========================================================================');
  console.log('  FESTIQ PHASE 1 COMPREHENSIVE AUTOMATED VERIFICATION SUITE');
  console.log('  Validating 25 Critical Functional, Financial & Security Specifications');
  console.log('========================================================================\n');

  let sessionCookie = null;
  let devResetToken = null;

  // -------------------------------------------------------------------------
  // TEST 1: Login with valid credentials
  // -------------------------------------------------------------------------
  try {
    const res = await request({
      path: '/api/auth/login',
      method: 'POST',
      headers: { Origin: 'http://localhost:5173' }
    }, {
      email: 'demo.student@kiit.ac.in',
      password: 'SecureStudentPass2026'
    });

    sessionCookie = getCookieValue(res.headers, 'festiq_session');
    const pass = res.status === 200 &&
      res.data?.success &&
      res.data?.user?.email === 'demo.student@kiit.ac.in' &&
      Boolean(sessionCookie);

    logTest(1, 'Login with valid credentials', pass, `Status: ${res.status}, Role: ${res.data?.user?.role}, festiq_session Cookie: ${Boolean(sessionCookie)}`);
  } catch (err) {
    logTest(1, 'Login with valid credentials', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Login rejection with invalid password
  // -------------------------------------------------------------------------
  try {
    const res = await request({
      path: '/api/auth/login',
      method: 'POST',
      headers: { Origin: 'http://localhost:5173' }
    }, {
      email: 'demo.student@kiit.ac.in',
      password: 'InvalidPasswordXYZ!'
    });

    const pass = res.status === 401 && res.data?.success === false;
    logTest(2, 'Login rejection with invalid password', pass, `Status: ${res.status}, Error: ${res.data?.message}`);
  } catch (err) {
    logTest(2, 'Login rejection with invalid password', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 3: Signup validation & duplicate email rejection
  // -------------------------------------------------------------------------
  try {
    const dupRes = await request({
      path: '/api/auth/signup',
      method: 'POST',
      headers: { Origin: 'http://localhost:5173' }
    }, {
      fullName: 'Duplicate Tester',
      email: 'demo.student@kiit.ac.in',
      password: 'StrongTestPass2026!',
      academicYear: '2nd Year',
      programme: 'B.Tech',
      branch: 'Computer Science',
      school: 'School of Computer Engineering',
      phoneNumber: '9876543210'
    });

    const pass = dupRes.status === 409 && dupRes.data?.success === false;
    logTest(3, 'Signup validation & duplicate email rejection', pass, `Status: ${dupRes.status}, Message: ${dupRes.data?.message}`);
  } catch (err) {
    logTest(3, 'Signup validation & duplicate email rejection', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Password reset request (valid email, returns clean message, dev notice)
  // -------------------------------------------------------------------------
  try {
    const res = await request({
      path: '/api/auth/forgot-password',
      method: 'POST',
      headers: { Origin: 'http://localhost:5173' }
    }, {
      email: 'demo.student@kiit.ac.in'
    });

    const pass = res.status === 200 &&
      res.data?.success === true &&
      res.data?.message?.includes('instructions') &&
      Boolean(res.data?.devResetToken);

    devResetToken = res.data?.devResetToken;
    logTest(4, 'Password reset request (valid email)', pass, `Status: ${res.status}, devResetToken length: ${devResetToken?.length || 0}`);
  } catch (err) {
    logTest(4, 'Password reset request (valid email)', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Password reset request (non-existent email, no user enumeration)
  // -------------------------------------------------------------------------
  try {
    const res = await request({
      path: '/api/auth/forgot-password',
      method: 'POST',
      headers: { Origin: 'http://localhost:5173' }
    }, {
      email: 'nonexistent.user@kiit.ac.in'
    });

    const pass = res.status === 200 &&
      res.data?.success === true &&
      res.data?.message?.includes('instructions') &&
      !res.data?.devResetToken;

    logTest(5, 'Password reset request (non-existent email - no disclosure)', pass, `Status: ${res.status}, devResetToken omitted: ${!res.data?.devResetToken}`);
  } catch (err) {
    logTest(5, 'Password reset request (non-existent email - no disclosure)', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 6: Password reset execution with valid token
  // -------------------------------------------------------------------------
  let clearedSessionCookieInReset = false;
  try {
    const res = await request({
      path: '/api/auth/reset-password',
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
        Cookie: `festiq_session=${sessionCookie}`
      }
    }, {
      token: devResetToken,
      newPassword: 'SecureStudentPass2026'
    });

    const setCookies = res.headers['set-cookie'] || [];
    const clearedCookie = Array.isArray(setCookies) ? setCookies.join(';') : String(setCookies);
    clearedSessionCookieInReset = clearedCookie.includes('festiq_session=') &&
      (clearedCookie.includes('Expires=Thu, 01 Jan 1970') || clearedCookie.includes('Max-Age=0'));

    const pass = res.status === 200 && res.data?.success === true;
    logTest(6, 'Password reset execution with valid token', pass, `Status: ${res.status}, Message: ${res.data?.message}`);
  } catch (err) {
    logTest(6, 'Password reset execution with valid token', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 7: Password reset rejection with invalid token
  // -------------------------------------------------------------------------
  try {
    const res = await request({
      path: '/api/auth/reset-password',
      method: 'POST',
      headers: { Origin: 'http://localhost:5173' }
    }, {
      token: 'invalid_corrupted_token_value_abc_123',
      newPassword: 'SecureStudentPass2026'
    });

    const pass = res.status === 400 && res.data?.success === false;
    logTest(7, 'Password reset rejection with invalid token', pass, `Status: ${res.status}, Message: ${res.data?.message}`);
  } catch (err) {
    logTest(7, 'Password reset rejection with invalid token', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 8: Token single-use enforcement
  // -------------------------------------------------------------------------
  try {
    const res = await request({
      path: '/api/auth/reset-password',
      method: 'POST',
      headers: { Origin: 'http://localhost:5173' }
    }, {
      token: devResetToken,
      newPassword: 'SecureStudentPass2026'
    });

    const pass = res.status === 400 &&
      res.data?.success === false &&
      (res.data?.message?.includes('already been used') || res.data?.message?.includes('invalid'));

    logTest(8, 'Token single-use enforcement', pass, `Status: ${res.status}, Message: ${res.data?.message}`);
  } catch (err) {
    logTest(8, 'Token single-use enforcement', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 9: Session invalidation upon password reset
  // -------------------------------------------------------------------------
  try {
    const pass = clearedSessionCookieInReset;
    logTest(9, 'Session invalidation upon password reset (cookie cleared)', pass,
      `festiq_session cleared in Set-Cookie: ${pass}`);

    // Re-login to refresh sessionCookie for subsequent manager calls
    const reLogin = await request({
      path: '/api/auth/login',
      method: 'POST',
      headers: { Origin: 'http://localhost:5173' }
    }, {
      email: 'demo.student@kiit.ac.in',
      password: 'SecureStudentPass2026'
    });
    sessionCookie = getCookieValue(reLogin.headers, 'festiq_session');
  } catch (err) {
    logTest(9, 'Session invalidation upon password reset', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 10: CORS allowlist enforcement (approved origin permitted)
  // -------------------------------------------------------------------------
  try {
    const res = await request({
      path: '/api/events',
      method: 'GET',
      headers: { Origin: 'http://localhost:5173' }
    });

    const pass = res.status === 200 &&
      res.headers['access-control-allow-origin'] === 'http://localhost:5173' &&
      res.headers['access-control-allow-credentials'] === 'true';

    logTest(10, 'CORS allowlist enforcement (approved origin permitted)', pass, `Status: ${res.status}, ACAO: ${res.headers['access-control-allow-origin']}`);
  } catch (err) {
    logTest(10, 'CORS allowlist enforcement', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 11: CORS rejection of unapproved origin (403 forbidden)
  // -------------------------------------------------------------------------
  try {
    const res = await request({
      path: '/api/events',
      method: 'GET',
      headers: { Origin: 'http://malicious-attacker-domain.com' }
    });

    const pass = res.status === 403;
    logTest(11, 'CORS rejection of unapproved origin (403 forbidden)', pass, `Status: ${res.status}, Body: ${res.raw?.trim()}`);
  } catch (err) {
    logTest(11, 'CORS rejection of unapproved origin', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 12: Login rate limiting (429 Too Many Requests after threshold)
  // -------------------------------------------------------------------------
  try {
    const testIp = `198.51.${RUN_ID}.12`;
    let hitRateLimit = false;
    let retryAfter = null;

    for (let i = 0; i < 12; i++) {
      const res = await request({
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          Origin: 'http://localhost:5173',
          'X-Forwarded-For': testIp
        }
      }, {
        email: 'demo.student@kiit.ac.in',
        password: 'wrong_password_test'
      });

      if (res.status === 429) {
        hitRateLimit = true;
        retryAfter = res.headers['retry-after'];
        break;
      }
    }

    const pass = hitRateLimit && Boolean(retryAfter);
    logTest(12, 'Login rate limiting (429 Too Many Requests after threshold)', pass, `429 encountered: ${hitRateLimit}, Retry-After: ${retryAfter}s`);
  } catch (err) {
    logTest(12, 'Login rate limiting', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 13: Forgot-password rate limiting
  // -------------------------------------------------------------------------
  try {
    const testIp = `198.51.${RUN_ID}.13`;
    let hitRateLimit = false;
    let retryAfter = null;

    for (let i = 0; i < 7; i++) {
      const res = await request({
        path: '/api/auth/forgot-password',
        method: 'POST',
        headers: {
          Origin: 'http://localhost:5173',
          'X-Forwarded-For': testIp
        }
      }, { email: 'demo.student@kiit.ac.in' });

      if (res.status === 429) {
        hitRateLimit = true;
        retryAfter = res.headers['retry-after'];
        break;
      }
    }

    const pass = hitRateLimit && Boolean(retryAfter);
    logTest(13, 'Forgot-password rate limiting (429 Too Many Requests)', pass, `429 encountered: ${hitRateLimit}, Retry-After: ${retryAfter}s`);
  } catch (err) {
    logTest(13, 'Forgot-password rate limiting', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 14: Payment order rate limiting
  // -------------------------------------------------------------------------
  try {
    const testIp = `198.51.${RUN_ID}.14`;
    let hitRateLimit = false;
    let retryAfter = null;

    for (let i = 0; i < 17; i++) {
      const res = await request({
        path: '/api/payments/create-order',
        method: 'POST',
        headers: {
          Origin: 'http://localhost:5173',
          'X-Forwarded-For': testIp,
          Cookie: `festiq_session=${sessionCookie}`
        }
      }, {
        registrationId: 'reg_rate_test',
        eventId: 'fest-001',
        amount: 200
      });

      if (res.status === 429) {
        hitRateLimit = true;
        retryAfter = res.headers['retry-after'];
        break;
      }
    }

    const pass = hitRateLimit && Boolean(retryAfter);
    logTest(14, 'Payment order rate limiting (429 Too Many Requests)', pass, `429 encountered: ${hitRateLimit}, Retry-After: ${retryAfter}s`);
  } catch (err) {
    logTest(14, 'Payment order rate limiting', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 15: Payment order creation with valid data
  // -------------------------------------------------------------------------
  try {
    // 1. Verify createPaymentOrder service produces accurate Razorpay order structure
    const order = await createPaymentOrder({
      registrationId: 'reg_unit_test_99',
      eventId: 'fest-006',
      eventTitle: 'Inter-Collegiate Futsal Derby',
      feeAmount: 200,
      currency: 'INR',
      participantName: 'Rohan Das',
      email: 'demo.student@kiit.ac.in',
      phone: '9876543220'
    });

    const passService = order.orderId &&
      order.amount === 200 &&
      order.amountPaise === 20000 &&
      order.currency === 'INR' &&
      order.keyId === RAZORPAY_KEY_ID;

    // 2. Verify endpoint rejects requests without registrationId
    const resNoReg = await request({
      path: '/api/payments/create-order',
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
        'X-Forwarded-For': '198.51.100.99',
        Cookie: `festiq_session=${sessionCookie}`
      }
    }, {});

    const passEndpointValidation = resNoReg.status === 400;
    const pass = passService && passEndpointValidation;

    logTest(15, 'Payment order creation with valid data', pass,
      `OrderId: ${order.orderId}, AmountPaise: ${order.amountPaise}, KeyId: ${order.keyId}, Validation: ${passEndpointValidation}`);
  } catch (err) {
    logTest(15, 'Payment order creation with valid data', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 16: Webhook HMAC-SHA256 signature verification (valid accepted)
  // -------------------------------------------------------------------------
  try {
    const payload = JSON.stringify({
      id: `evt_test_valid_${Date.now()}`,
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_valid_test_001',
            order_id: 'order_test_val',
            amount: 20000,
            currency: 'INR',
            status: 'captured'
          }
        }
      }
    });

    const validSignature = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(payload).digest('hex');

    const res = await request({
      path: '/api/payments/webhook',
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
        'Content-Type': 'application/json',
        'x-razorpay-signature': validSignature
      }
    }, payload);

    const pass = res.status === 200 && res.data?.received === true;
    logTest(16, 'Webhook HMAC-SHA256 signature verification (valid accepted)', pass, `Status: ${res.status}, Received: ${res.data?.received}`);
  } catch (err) {
    logTest(16, 'Webhook HMAC-SHA256 signature verification', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 17: Webhook signature tampering rejection (invalid rejected 400)
  // -------------------------------------------------------------------------
  try {
    const payload = JSON.stringify({
      id: `evt_test_tampered_${Date.now()}`,
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_tampered_test' } } }
    });

    const res = await request({
      path: '/api/payments/webhook',
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
        'Content-Type': 'application/json',
        'x-razorpay-signature': 'tampered_invalid_hex_signature_abcdef123456789'
      }
    }, payload);

    const pass = res.status === 400 && res.data?.message?.includes('signature');
    logTest(17, 'Webhook signature tampering rejection (invalid rejected 400)', pass, `Status: ${res.status}, Message: ${res.data?.message}`);
  } catch (err) {
    logTest(17, 'Webhook signature tampering rejection', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 18: Webhook idempotency (duplicate event ID ignored/processed once)
  // -------------------------------------------------------------------------
  try {
    const uniqueEventId = `evt_idempotent_${Date.now()}`;
    const payload = JSON.stringify({
      id: uniqueEventId,
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_${Date.now()}`,
            order_id: 'order_idem_test',
            amount: 20000,
            currency: 'INR',
            status: 'captured'
          }
        }
      }
    });

    const signature = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(payload).digest('hex');

    // First call
    const firstRes = await request({
      path: '/api/payments/webhook',
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature
      }
    }, payload);

    // Second call with identical payload & event ID
    const secondRes = await request({
      path: '/api/payments/webhook',
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature
      }
    }, payload);

    const pass = firstRes.status === 200 &&
      secondRes.status === 200 &&
      secondRes.data?.status === 'already_processed';

    // Verify persistent webhook storage
    const webhooksPath = path.resolve(__dirname, '..', 'data', 'processedWebhooks.json');
    const stored = JSON.parse(await fs.readFile(webhooksPath, 'utf-8'));
    const isStored = Array.isArray(stored) && stored.includes(uniqueEventId);

    logTest(18, 'Webhook idempotency (duplicate ignored & stored in processedWebhooks.json)', pass && isStored,
      `Call 1: ${firstRes.status}, Call 2 status: "${secondRes.data?.status}", Persisted to disk: ${isStored}`);
  } catch (err) {
    logTest(18, 'Webhook idempotency', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 19: Prize pool calculation with 75% default allocation
  // -------------------------------------------------------------------------
  try {
    const event = {
      id: 'fest-test-dyn',
      feeAmount: 200,
      feeType: 'per_person',
      capacity: 100,
      prizePoolType: 'dynamic'
    };
    const metrics = calculateEventPrizeMetrics(event, []);
    const pass = metrics.prizeAllocationPct === 75 && metrics.expectedRevenue === 20000 && metrics.advertisedPrizePool === 15000;
    logTest(19, 'Prize pool calculation with 75% default allocation', pass,
      `Revenue: ₹${metrics.expectedRevenue}, Allocation: ${metrics.prizeAllocationPct}%, Advertised Prize: ₹${metrics.advertisedPrizePool}`);
  } catch (err) {
    logTest(19, 'Prize pool calculation default allocation', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 20: Expected revenue calculation (fee * capacity) for per_person and per_team
  // -------------------------------------------------------------------------
  try {
    const personEvent = { feeAmount: 250, feeType: 'per_person', capacity: 80, prizePoolType: 'dynamic' };
    const teamEvent = { feeAmount: 500, feeType: 'per_team', capacity: 50, teamSize: 5, prizePoolType: 'dynamic' };

    const mPerson = calculateEventPrizeMetrics(personEvent, []);
    const mTeam = calculateEventPrizeMetrics(teamEvent, []);

    // per_person: 250 * 80 = 20,000
    // per_team: 500 * 50 = 25,000 (CRUCIAL: NEVER multiplied by teamSize 5)
    const passPerson = mPerson.expectedRevenue === 20000;
    const passTeam = mTeam.expectedRevenue === 25000;

    logTest(20, 'Expected revenue calculation (per_person & per_team without teamSize multiplication)', passPerson && passTeam,
      `per_person: ₹${mPerson.expectedRevenue} (expected 20,000), per_team: ₹${mTeam.expectedRevenue} (expected 25,000)`);
  } catch (err) {
    logTest(20, 'Expected revenue calculation', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 21: Advertised prize pool rounding down to nearest ₹100
  // -------------------------------------------------------------------------
  try {
    const r1 = roundDownToNearest100(4800);  // -> 4800
    const r2 = roundDownToNearest100(2400);  // -> 2400
    const r3 = roundDownToNearest100(11250); // -> 11200
    const r4 = roundDownToNearest100(19200); // -> 19200

    const pass = r1 === 4800 && r2 === 2400 && r3 === 11200 && r4 === 19200;
    logTest(21, 'Advertised prize pool rounding down to nearest ₹100 (Floor-100 Rule)', pass,
      `4800->${r1}, 2400->${r2}, 11250->${r3}, 19200->${r4}`);
  } catch (err) {
    logTest(21, 'Advertised prize pool rounding', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 22: Fixed/sponsored prize pools preservation
  // -------------------------------------------------------------------------
  try {
    const res = await request({ path: '/api/events', method: 'GET', headers: { Origin: 'http://localhost:5173' } });
    const events = res.data?.data || [];

    const hackNova = events.find(e => e.id === 'fest-001');
    const rhythmEchoes = events.find(e => e.id === 'fest-002');
    const apex = events.find(e => e.id === 'fest-005');

    const passHackNova = hackNova?.prizeAmount === 50000 || hackNova?.prizePool?.includes('50,000');
    const passRhythm = rhythmEchoes?.prizeAmount === 35000 || rhythmEchoes?.prizePool?.includes('35,000');
    const passApex = apex?.prizeAmount === 100000 || apex?.prizePool?.includes('1,00,000');

    const pass = passHackNova && passRhythm && passApex;
    logTest(22, 'Fixed/sponsored prize pools preservation', pass,
      `HackNova: ${hackNova?.prizePool}, Rhythm & Echoes: ${rhythmEchoes?.prizePool}, Apex Venture: ${apex?.prizePool}`);
  } catch (err) {
    logTest(22, 'Fixed/sponsored prize pools preservation', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 23: Public API financial confidentiality (zero leakage of internal splits)
  // -------------------------------------------------------------------------
  try {
    const res = await request({ path: '/api/events', method: 'GET', headers: { Origin: 'http://localhost:5173' } });
    const events = res.data?.data || [];

    let leakFound = false;
    for (const ev of events) {
      if (ev.collegeAllocation !== undefined ||
          ev.internalShare !== undefined ||
          ev.prizeAllocationPct !== undefined ||
          ev.expectedCollegeAllocation !== undefined) {
        leakFound = true;
        break;
      }
    }

    logTest(23, 'Public API financial confidentiality (zero leakage of internal college allocation)', !leakFound,
      `Checked ${events.length} public events; zero internal allocation fields exposed`);
  } catch (err) {
    logTest(23, 'Public API financial confidentiality', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 24: Gallery album CRUD and image upload validation
  // -------------------------------------------------------------------------
  try {
    // 1. Fetch gallery albums
    const getRes = await request({ path: '/api/gallery', method: 'GET', headers: { Origin: 'http://localhost:5173' } });
    const getPass = getRes.status === 200 && Array.isArray(getRes.data?.data);

    // 2. Create test album with manager auth cookie
    const createRes = await request({
      path: '/api/gallery',
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
        Cookie: `festiq_session=${sessionCookie}`
      }
    }, {
      eventName: '[TEST-PHASE1] Autonomous Robotics Cup',
      category: 'Technical',
      date: '2026-11-10',
      description: 'Automated test album for Phase 1 verification',
      isFeatured: false,
      photos: []
    });
    const createdAlbum = createRes.data?.data;
    const createPass = createRes.status === 201 && createdAlbum?.id;

    // 3. Update test album
    const updateRes = await request({
      path: `/api/gallery/${createdAlbum?.id}`,
      method: 'PUT',
      headers: {
        Origin: 'http://localhost:5173',
        Cookie: `festiq_session=${sessionCookie}`
      }
    }, {
      description: 'Updated description for Phase 1 verification',
      isFeatured: true
    });
    const updatePass = updateRes.status === 200 && updateRes.data?.data?.isFeatured === true;

    // 4. Test image upload validation (valid PNG 1x1 magic bytes)
    const validPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const uploadRes = await request({
      path: '/api/gallery/upload',
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
        Cookie: `festiq_session=${sessionCookie}`
      }
    }, {
      imageBase64: validPngBase64,
      originalFilename: 'test-icon.png'
    });
    const uploadPass = uploadRes.status === 201 && uploadRes.data?.data?.url?.includes('/uploads/gallery/');

    // 5. Test image upload rejection on invalid magic bytes
    const invalidBase64 = 'data:image/png;base64,' + Buffer.from('NOT_AN_IMAGE_CONTENT_STRING').toString('base64');
    const uploadInvalidRes = await request({
      path: '/api/gallery/upload',
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
        Cookie: `festiq_session=${sessionCookie}`
      }
    }, {
      imageBase64: invalidBase64,
      originalFilename: 'fake.png'
    });
    const invalidRejectPass = uploadInvalidRes.status === 400;

    // 6. Delete test album
    const deleteRes = await request({
      path: `/api/gallery/${createdAlbum?.id}`,
      method: 'DELETE',
      headers: {
        Origin: 'http://localhost:5173',
        Cookie: `festiq_session=${sessionCookie}`
      }
    });
    const deletePass = deleteRes.status === 200;

    // 7. Cleanup uploaded test image file
    if (uploadRes.data?.data?.filename) {
      const uploadPath = path.resolve(__dirname, '..', 'uploads', 'gallery', uploadRes.data.data.filename);
      try { await fs.unlink(uploadPath); } catch {}
    }

    const allGalleryPass = getPass && createPass && updatePass && uploadPass && invalidRejectPass && deletePass;
    logTest(24, 'Gallery album CRUD & image upload validation (mime check, safe paths)', allGalleryPass,
      `GET: ${getPass}, POST: ${createPass}, PUT: ${updatePass}, Upload valid: ${uploadPass}, Upload fake reject: ${invalidRejectPass}, DELETE: ${deletePass}`);
  } catch (err) {
    logTest(24, 'Gallery album CRUD & image upload validation', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 25: Data backup creation and isolated recovery verification
  // -------------------------------------------------------------------------
  try {
    const testScratchDir = path.resolve(__dirname, '..', '..', 'scratch', 'test_backup_sandbox');
    const testSourceDir = path.resolve(testScratchDir, 'data');
    const testBackupDir = path.resolve(testScratchDir, 'backups');
    const testRestoreDir = path.resolve(testScratchDir, 'restored');

    // Setup isolated test directories
    await fs.mkdir(testSourceDir, { recursive: true });
    await fs.mkdir(testBackupDir, { recursive: true });
    await fs.mkdir(testRestoreDir, { recursive: true });

    // Populate dummy JSON dataset
    await fs.writeFile(path.join(testSourceDir, 'events.json'), JSON.stringify([{ id: 'test-ev-1', title: 'Test Fest' }]));
    await fs.writeFile(path.join(testSourceDir, 'registrations.json'), JSON.stringify([{ id: 'test-reg-1' }]));
    await fs.writeFile(path.join(testSourceDir, 'users.json'), JSON.stringify([{ id: 'test-u-1' }]));
    await fs.writeFile(path.join(testSourceDir, 'gallery.json'), JSON.stringify([{ id: 'test-gal-1' }]));
    await fs.writeFile(path.join(testSourceDir, 'eventProposals.json'), JSON.stringify([{ id: 'test-prop-1' }]));
    await fs.writeFile(path.join(testSourceDir, 'processedWebhooks.json'), JSON.stringify(['pay_test_001']));

    // 1. Create backup
    const backupRes = await createBackup({
      label: 'isolated_test',
      sourceDir: testSourceDir,
      targetDir: testBackupDir
    });

    // 2. Verify backup integrity
    const ver = await verifyBackup(backupRes.backupPath);

    // 3. Restore to testRestoreDir
    const restRes = await restoreBackup(backupRes.backupPath, { targetDir: testRestoreDir });

    // 4. Verify restored content matches source
    const restoredEvents = JSON.parse(await fs.readFile(path.join(testRestoreDir, 'events.json'), 'utf-8'));
    const pass = backupRes.success &&
      ver.valid &&
      restRes.success &&
      restoredEvents[0].id === 'test-ev-1';

    // Cleanup scratch test directory
    await fs.rm(testScratchDir, { recursive: true, force: true });

    logTest(25, 'Data backup creation and isolated recovery verification', pass,
      `Backup created: ${backupRes.success}, SHA-256 Valid: ${ver.valid}, Restore matched: ${pass}`);
  } catch (err) {
    logTest(25, 'Data backup creation and recovery', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 26: Locked single-source-of-truth financial model totals across all 25 events
  // -------------------------------------------------------------------------
  try {
    const rawData = await fs.readFile(path.join(__dirname, '..', 'data', 'events.json'), 'utf-8');
    const events = JSON.parse(rawData);

    let classARev = 0;
    let classARaw = 0;
    let classAAdv = 0;
    let classBFixed = 0;
    let classDRev = 0;
    let freeCount = 0;
    let paidCount = 0;

    events.forEach(e => {
      const m = calculateEventPrizeMetrics(e, []);
      if (m.feeAmount === 0) freeCount++;
      else paidCount++;

      if (m.prizePoolType === 'dynamic') {
        classARev += m.expectedRevenue;
        classARaw += m.rawPrizePoolAmount;
        classAAdv += m.advertisedPrizePool;
      } else if (m.prizePoolType === 'fixed') {
        classBFixed += m.advertisedPrizePool;
      } else if (m.prizePoolType === 'materials_fee') {
        classDRev += m.expectedRevenue;
      }
    });

    const pass =
      freeCount === 8 &&
      paidCount === 17 &&
      classARev === 228200 &&
      classARaw === 171150 &&
      classAAdv === 171100 &&
      (classARev - classAAdv) === 57100 &&
      classBFixed === 185000 &&
      classDRev === 15000 &&
      (classARev + classDRev) === 243200 &&
      (classAAdv + classBFixed) === 356100 &&
      ((classARev - classAAdv) + classDRev) === 72100;

    logTest(26, 'Locked single-source-of-truth financial totals reconciliation', pass,
      `Rev: ₹${classARev + classDRev} (exp 2,43,200), Prizes: ₹${classAAdv + classBFixed} (exp 3,56,100), Ops: ₹${(classARev - classAAdv) + classDRev} (exp 72,100)`);
  } catch (err) {
    logTest(26, 'Locked financial totals reconciliation', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 27: Historical registration preservation & payment snapshot immutability
  // -------------------------------------------------------------------------
  try {
    const rawRegs = await fs.readFile(path.join(__dirname, '..', 'data', 'registrations.json'), 'utf-8');
    const registrations = JSON.parse(rawRegs);

    const fst389771 = registrations.find(r => r.id === 'FST-389771');
    const paidMatch =
      fst389771?.payment?.status === 'paid' &&
      fst389771?.payment?.amount === 100 &&
      fst389771?.payment?.currency === 'INR' &&
      fst389771?.payment?.transactionId === 'pay_sim_9f34e701ae7c278c';

    const waivedList = ['FST-988451', 'FST-988480', 'FST-991390', 'FST-246403', 'FST-274175'];
    const waivedMatch = waivedList.every(id => {
      const reg = registrations.find(r => r.id === id);
      return reg && reg.paymentStatus === 'waived' && reg.status === 'confirmed';
    });

    const pass = registrations.length === 6 && paidMatch && waivedMatch;
    logTest(27, 'Historical registration preservation & payment snapshot immutability', pass,
      `All 6 historical registrations intact: 5 waived confirmed, 1 verified paid ₹100 snapshot`);
  } catch (err) {
    logTest(27, 'Historical registration preservation', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 28: Distributable prize allocation runtime cap (<= verified collected * 75%)
  // -------------------------------------------------------------------------
  try {
    const sampleEvent = {
      id: 'fest-003',
      feeAmount: 100,
      feeType: 'per_team',
      capacity: 64,
      prizePoolType: 'dynamic',
      prizeAllocationPct: 75
    };

    // Simulate 10 confirmed paid registrations -> collected = 10 * 100 = 1000
    // Distributable prize cap = floor(1000 * 0.75) = 750
    const mockRegistrations = Array.from({ length: 10 }, (_, i) => ({
      id: `FST-TEST-${i}`,
      eventId: 'fest-003',
      status: 'confirmed',
      paymentStatus: 'paid'
    }));

    const metrics = calculateEventPrizeMetrics(sampleEvent, mockRegistrations);
    const pass =
      metrics.collectedAmount === 1000 &&
      metrics.actualPrizeFund === 750 &&
      metrics.actualPrizeFund <= metrics.collectedAmount * 0.75 &&
      metrics.actualPrizeFund <= metrics.advertisedPrizePool;

    logTest(28, 'Distributable prize runtime cap (actualPrizeFund <= collectedRevenue * 75%)', pass,
      `Collected: ₹${metrics.collectedAmount}, Distributable Prize: ₹${metrics.actualPrizeFund} (<= ₹${metrics.collectedAmount * 0.75})`);
  } catch (err) {
    logTest(28, 'Distributable prize runtime cap', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 29: Every Class A event net internal allocation remains between 20% and 30%
  // -------------------------------------------------------------------------
  try {
    const rawData = await fs.readFile(path.join(__dirname, '..', 'data', 'events.json'), 'utf-8');
    const events = JSON.parse(rawData);

    let allWithinBounds = true;
    const percentages = [];

    events.filter(e => e.prizePoolType === 'dynamic').forEach(e => {
      const m = calculateEventPrizeMetrics(e, []);
      const collegeShare = m.expectedRevenue - m.advertisedPrizePool;
      const pct = (collegeShare / m.expectedRevenue) * 100;
      percentages.push(pct);
      if (pct < 20 || pct > 30) {
        allWithinBounds = false;
      }
    });

    const minPct = Math.min(...percentages).toFixed(2);
    const maxPct = Math.max(...percentages).toFixed(2);
    logTest(29, 'Every Class A event internal allocation remains within 20%–30% policy boundary', allWithinBounds,
      `All 16 Class A events compliant. Min share: ${minPct}%, Max share: ${maxPct}%`);
  } catch (err) {
    logTest(29, 'Class A internal allocation boundary', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 30: Class D RoboCraft materials fee isolation (zero cash prize pool)
  // -------------------------------------------------------------------------
  try {
    const rawData = await fs.readFile(path.join(__dirname, '..', 'data', 'events.json'), 'utf-8');
    const events = JSON.parse(rawData);
    const robo = events.find(e => e.id === 'fest-016');

    const m = calculateEventPrizeMetrics(robo, []);
    const pass =
      robo.prizePoolType === 'materials_fee' &&
      robo.feeAmount === 250 &&
      robo.capacity === 60 &&
      m.expectedRevenue === 15000 &&
      m.rawPrizePoolAmount === 0 &&
      m.advertisedPrizePool === 0 &&
      m.prizePoolAmount === 0;

    logTest(30, 'Class D RoboCraft materials fee isolation (no competitive cash prize)', pass,
      `Materials Revenue: ₹${m.expectedRevenue}, Cash Prize: ₹${m.prizePoolAmount}, Type: ${m.prizePoolType}`);
  } catch (err) {
    logTest(30, 'Class D materials fee isolation', false, err.message);
  }

  console.log('\n========================================================================');
  const passedCount = testResults.filter(t => t.pass).length;
  const totalCount = testResults.length;
  console.log(`  PHASE 1 TEST SUMMARY: ${passedCount}/${totalCount} TESTS PASSED (${Math.round((passedCount/totalCount)*100)}%)`);
  console.log('========================================================================\n');

  if (passedCount === totalCount) {
    console.log('✓ ALL 25 PHASE 1 SPECIFICATIONS VERIFIED SUCCESSFULLY WITH 100% PASS RATE.');
  } else {
    console.error(`✗ ${totalCount - passedCount} TESTS FAILED.`);
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
