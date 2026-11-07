import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  sanitizeUser,
  setUserResetToken,
  findUserByResetTokenHash,
  updateUserPassword
} from '../utils/userStorage.js';

const JWT_SECRET = process.env.JWT_SECRET || 'festiq_jwt_secret_dev_key_2026_kiit_secure';
const SESSION_COOKIE_NAME = 'festiq_session';
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Strict Institutional Email Regex: domain must strictly be kiit.ac.in
// Rejects kiit.ac.in.com, fakekiit.ac.in, kiit-ac.in, gmail, outlook, etc.
const KIIT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@kiit\.ac\.in$/i;

/**
 * Helper to generate JWT and set secure HTTP-only session cookie.
 */
function setSessionCookie(res, user) {
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role || 'student'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const cookieSameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
  const isSecure = process.env.NODE_ENV === 'production' || cookieSameSite === 'none';

  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: cookieSameSite,
    maxAge: SESSION_EXPIRY_MS,
    path: '/'
  });

  return token;
}

/**
 * POST /api/auth/signup
 * Registers a new student with strict @kiit.ac.in email requirement.
 */
export async function signup(req, res) {
  try {
    const {
      fullName,
      email,
      password,
      confirmPassword,
      academicYear,
      programme,
      branch,
      school,
      phoneNumber
    } = req.body;

    // 1. Check required fields
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, institutional email, and password are required'
      });
    }

    const trimmedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // 2. Strict Institutional Email Domain Validation
    if (!KIIT_EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Institutional access only. Please provide your official @kiit.ac.in student email address.'
      });
    }

    // 3. Password length & match check
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters in length'
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // 4. Check for duplicate account
    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this @kiit.ac.in email already exists. Please log in instead.'
      });
    }

    // 5. Hash password with bcryptjs
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 6. Assemble new user record
    const newUser = {
      id: `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      fullName: trimmedName,
      email: normalizedEmail,
      passwordHash,
      academicYear: academicYear || '1st Year',
      programme: programme || 'B.Tech',
      branch: branch ? branch.trim() : 'Computer Science & Engineering',
      school: school ? school.trim() : 'School of Computer Engineering',
      phoneNumber: phoneNumber ? phoneNumber.trim() : '',
      role: 'student',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 7. Persist atomically
    await createUser(newUser);

    // 8. Issue HTTP-only cookie
    setSessionCookie(res, newUser);

    return res.status(201).json({
      success: true,
      message: 'Student account created successfully',
      user: sanitizeUser(newUser)
    });
  } catch (error) {
    console.error('[Auth Controller] Signup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete student registration',
      error: error.message
    });
  }
}

/**
 * POST /api/auth/login
 * Authenticates student and sets HTTP-only session cookie.
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both institutional email and password'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Rejection of non-kiit formats before lookup (optional check)
    if (!KIIT_EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid institutional credentials'
      });
    }

    // Generic error message for both non-existent user and wrong password to prevent enumeration
    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid institutional email or password'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid institutional email or password'
      });
    }

    // Issue session cookie
    setSessionCookie(res, user);

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('[Auth Controller] Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed due to a server error',
      error: error.message
    });
  }
}

/**
 * GET /api/auth/me
 * Restores user state from active session cookie.
 */
export async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: req.user
  });
}

/**
 * PUT /api/auth/profile
 * Updates student profile details.
 * Institutional email is strictly immutable.
 */
export async function updateProfile(req, res) {
  try {
    const {
      fullName,
      email,
      academicYear,
      programme,
      branch,
      school,
      phoneNumber
    } = req.body;

    // Strict immutability check on email
    if (email && email.trim().toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Institutional email address is immutable and cannot be modified'
      });
    }

    const updates = {};
    if (fullName && fullName.trim()) updates.fullName = fullName.trim();
    if (academicYear) updates.academicYear = academicYear;
    if (programme) updates.programme = programme;
    if (branch && branch.trim()) updates.branch = branch.trim();
    if (school && school.trim()) updates.school = school.trim();
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber.trim();

    const updated = await updateUser(req.user.id, updates);

    return res.status(200).json({
      success: true,
      message: 'Student profile updated successfully',
      user: sanitizeUser(updated)
    });
  } catch (error) {
    console.error('[Auth Controller] Profile update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update student profile',
      error: error.message
    });
  }
}

/**
 * POST /api/auth/logout
 * Clears HTTP-only session cookie.
 */
export async function logout(req, res) {
  const cookieSameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
  const isSecure = process.env.NODE_ENV === 'production' || cookieSameSite === 'none';

  res.clearCookie(SESSION_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: cookieSameSite,
    secure: isSecure
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
}

/**
 * POST /api/auth/forgot-password
 * Initiates self-service password reset.
 * Strictly avoids disclosing whether the email exists.
 * In development, returns devResetToken for automated verification.
 */
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered institutional email'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify institutional domain format
    if (!KIIT_EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Institutional access only. Please provide your official @kiit.ac.in email address.'
      });
    }

    const user = await findUserByEmail(normalizedEmail);

    // Uniform response regardless of whether user exists to prevent email enumeration
    const genericSuccessResponse = {
      success: true,
      message: 'If an account is associated with this institutional email, password reset instructions have been dispatched.'
    };

    if (!user) {
      return res.status(200).json(genericSuccessResponse);
    }

    // Generate cryptographically secure random token (32 bytes = 64 hex chars)
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    // Store ONLY the SHA-256 hash of the token in persistent storage
    const tokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    // Set 15-minute expiry
    const expiresAt = Date.now() + 15 * 60 * 1000;

    await setUserResetToken(user.id, { tokenHash, expiresAt });

    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment) {
      console.log(`[Auth Security] Dev password reset token for ${normalizedEmail}: ${rawResetToken}`);
      return res.status(200).json({
        ...genericSuccessResponse,
        devNotice: 'Development Mode: Real email delivery is simulated. Use the token provided below.',
        devResetToken: rawResetToken
      });
    }

    return res.status(200).json(genericSuccessResponse);
  } catch (error) {
    console.error('[Auth Controller] Forgot password error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
      error: error.message
    });
  }
}

/**
 * POST /api/auth/reset-password
 * Validates reset token and sets new password.
 * Single-use: invalidates token immediately upon use.
 */
export async function resetPassword(req, res) {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters in length'
      });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Compute SHA-256 hash of submitted token to look up user
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const user = await findUserByResetTokenHash(tokenHash);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has already been used'
      });
    }

    // Check token expiry
    if (!user.resetPasswordExpires || user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token has expired. Please request a new one.'
      });
    }

    // Hash the new password with bcryptjs
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Atomically update password and invalidate reset token
    await updateUserPassword(user.id, passwordHash);

    // Clear any active session cookie so the user must re-authenticate with the new password
    const cookieSameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
    const isSecure = process.env.NODE_ENV === 'production' || cookieSameSite === 'none';

    res.clearCookie(SESSION_COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      sameSite: cookieSameSite,
      secure: isSecure
    });

    return res.status(200).json({
      success: true,
      message: 'Password has been securely reset. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('[Auth Controller] Reset password error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  }
}

