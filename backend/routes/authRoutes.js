import express from 'express';
import {
  signup,
  login,
  getMe,
  updateProfile,
  logout,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  loginLimiter,
  signupLimiter,
  forgotPasswordLimiter
} from '../middleware/rateLimiter.js';

const router = express.Router();

// Public auth endpoints protected by IP rate limiting
router.post('/signup', signupLimiter, signup);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', forgotPasswordLimiter, resetPassword);

// Authenticated session endpoints
router.get('/me', requireAuth, getMe);
router.put('/profile', requireAuth, updateProfile);

export default router;

