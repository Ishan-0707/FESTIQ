import jwt from 'jsonwebtoken';
import { findUserById, sanitizeUser } from '../utils/userStorage.js';

const JWT_SECRET = process.env.JWT_SECRET || 'festiq_jwt_secret_dev_key_2026_kiit_secure';

/**
 * Authentication middleware.
 * Verifies JWT session token exclusively from the HTTP-only session cookie.
 * (Bearer-token fallback removed per Stage C Security Hardening audit)
 * Attaches sanitized user object to req.user.
 */
export async function requireAuth(req, res, next) {
  try {
    // Strictly extract from HTTP-only cookie
    const token = req.cookies ? req.cookies.festiq_session : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No active session found.'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Clear invalid cookie if present
      if (req.cookies && req.cookies.festiq_session) {
        res.clearCookie('festiq_session', { path: '/' });
      }
      return res.status(401).json({
        success: false,
        message: 'Session expired or invalid. Please log in again.'
      });
    }

    // Retrieve user from storage
    const user = await findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Account not found or has been deactivated.'
      });
    }

    // Attach sanitized user to request
    req.user = sanitizeUser(user);
    next();
  } catch (error) {
    console.error('[Auth Middleware] Verification error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Authentication processing error',
      error: error.message
    });
  }
}

/**
 * Manager authorization middleware.
 * Verifies that authenticated user holds manager or admin role.
 */
export function requireManager(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in.'
    });
  }

  const role = req.user.role || 'student';
  if (role !== 'manager' && role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Manager authorization required.'
    });
  }

  next();
}


