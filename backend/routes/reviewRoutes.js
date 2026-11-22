import express from 'express';
import { requireAuth, requireManager } from '../middleware/authMiddleware.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import {
  getPublicApprovedReviews,
  getUserReviewStatus,
  submitReview,
  getAllReviews,
  moderateReview
} from '../utils/reviewStorage.js';

const router = express.Router();

// Rate limiter for review submissions: max 5 requests per 15 minutes per IP
const reviewSubmitLimiter = createRateLimiter({
  bucketName: 'reviews:submit',
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many review submissions. Please wait before submitting another review.'
});

/**
 * GET /api/reviews
 * Public endpoint: returns only APPROVED reviews with aggregate statistics.
 * Strips all internal user and moderation tracking data.
 */
router.get('/', async (req, res) => {
  try {
    const result = await getPublicApprovedReviews();
    return res.status(200).json({
      success: true,
      data: result.reviews,
      summary: result.summary
    });
  } catch (error) {
    console.error('[Review Routes] Error fetching public reviews:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve published reviews',
      error: error.message
    });
  }
});

/**
 * GET /api/reviews/my
 * Authenticated endpoint: returns current user's review status and eligibility.
 */
router.get('/my', requireAuth, async (req, res) => {
  try {
    const status = await getUserReviewStatus(req.user.id);
    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('[Review Routes] Error fetching user review status:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve review eligibility status',
      error: error.message
    });
  }
});

/**
 * POST /api/reviews
 * Authenticated endpoint: submits student feedback for moderation.
 * Enforces rate limiting, input validation, and verified QR check-in attendance.
 */
router.post('/', requireAuth, reviewSubmitLimiter, async (req, res) => {
  try {
    const { rating, reviewText } = req.body;
    const review = await submitReview({
      userId: req.user.id,
      fullName: req.user.fullName,
      rating,
      reviewText
    });

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully. It will appear publicly once approved by event organizers.',
      data: review
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status < 500) {
      return res.status(status).json({
        success: false,
        message: error.message,
        ineligible: Boolean(error.ineligible)
      });
    }
    console.error('[Review Routes] Error submitting review:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to process review submission',
      error: error.message
    });
  }
});

/**
 * GET /api/reviews/manage
 * Manager-only endpoint: returns all reviews (PENDING, APPROVED, REJECTED, HIDDEN)
 * along with moderation metadata.
 */
router.get('/manage', requireAuth, requireManager, async (req, res) => {
  try {
    const allReviews = await getAllReviews();
    const stats = {
      total: allReviews.length,
      pending: allReviews.filter(r => r.status === 'PENDING').length,
      approved: allReviews.filter(r => r.status === 'APPROVED').length,
      rejected: allReviews.filter(r => r.status === 'REJECTED').length,
      hidden: allReviews.filter(r => r.status === 'HIDDEN').length
    };

    return res.status(200).json({
      success: true,
      data: allReviews,
      stats
    });
  } catch (error) {
    console.error('[Review Routes] Error fetching admin reviews:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve review management list',
      error: error.message
    });
  }
});

/**
 * PATCH /api/reviews/manage/:id/status
 * Manager-only endpoint: approves, rejects, or hides a review.
 */
router.patch('/manage/:id/status', requireAuth, requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const updated = await moderateReview({
      reviewId: id,
      status,
      managerId: req.user.id,
      managerName: req.user.fullName,
      rejectionReason
    });

    return res.status(200).json({
      success: true,
      message: `Review successfully marked as ${status}`,
      data: updated
    });
  } catch (error) {
    const code = error.statusCode || 500;
    return res.status(code).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
