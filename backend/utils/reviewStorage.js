import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getAllRegistrations } from './registrationStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reviewsFilePath = path.join(__dirname, '..', 'data', 'reviews.json');

export const REVIEW_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  HIDDEN: 'HIDDEN'
};

/**
 * Formats a privacy-safe public display name from user's full name.
 * Examples:
 *   "Aarav Sharma" -> "Aarav S."
 *   "Ishan Kumar Yadav" -> "Ishan Y."
 *   "Rohan" -> "Rohan"
 */
export function formatDisplayName(fullName) {
  if (!fullName || typeof fullName !== 'string') return 'Verified Student';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Verified Student';
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

/**
 * Basic HTML sanitizer to prevent XSS in review text.
 */
export function sanitizeReviewText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Reads all review records from persistent JSON store.
 */
export async function getAllReviews() {
  try {
    const raw = await fs.readFile(reviewsFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(reviewsFilePath, '[]', 'utf-8');
      return [];
    }
    console.error('[Review Storage] Error reading reviews.json:', error.message);
    throw new Error('Could not access review storage');
  }
}

/**
 * Atomically persists reviews using a temporary file and rename.
 */
async function saveReviews(reviews) {
  const jsonString = JSON.stringify(reviews, null, 2);
  const tmpPath = `${reviewsFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    await fs.writeFile(tmpPath, jsonString, 'utf-8');
    await fs.rename(tmpPath, reviewsFilePath);
  } catch (err) {
    try { await fs.unlink(tmpPath); } catch {}
    console.error('[Review Storage] Failed atomic save:', err.message);
    throw new Error('Failed to persist review records atomically');
  }
}

/**
 * Verifies whether a student has at least one recorded event check-in.
 */
export async function checkUserAttendeeEligibility(userId) {
  if (!userId) return { isEligible: false, attendedCount: 0, attendedEvents: [] };
  const registrations = await getAllRegistrations();
  const checkedInRegs = registrations.filter(
    r => r.userId === userId &&
         r.checkedIn === true &&
         r.status !== 'cancelled'
  );
  return {
    isEligible: checkedInRegs.length > 0,
    attendedCount: checkedInRegs.length,
    attendedEvents: checkedInRegs.map(r => ({
      eventId: r.eventId,
      eventName: r.eventName || 'Campus Event',
      checkInTime: r.checkInTime || r.updatedAt || null
    }))
  };
}

/**
 * Returns public, approved reviews with calculated summary statistics.
 * Strips internal identifiers (userId, email, moderator IDs) for privacy.
 */
export async function getPublicApprovedReviews() {
  const reviews = await getAllReviews();
  const approved = reviews
    .filter(r => r.status === REVIEW_STATUS.APPROVED)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const totalReviews = approved.length;
  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;

  for (const r of approved) {
    const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
    ratingCounts[star] = (ratingCounts[star] || 0) + 1;
    ratingSum += star;
  }

  const averageRating = totalReviews > 0 ? Number((ratingSum / totalReviews).toFixed(1)) : 0;

  const sanitized = approved.map(r => ({
    id: r.id,
    displayName: r.displayName || 'Verified Attendee',
    rating: r.rating,
    reviewText: r.reviewText,
    verifiedAttendee: Boolean(r.verifiedAttendee),
    createdAt: r.createdAt
  }));

  return {
    reviews: sanitized,
    summary: {
      averageRating,
      totalReviews,
      ratingCounts
    }
  };
}

/**
 * Retrieves an authenticated user's review status and eligibility.
 */
export async function getUserReviewStatus(userId) {
  const eligibility = await checkUserAttendeeEligibility(userId);
  const reviews = await getAllReviews();
  const existing = reviews.find(r => r.userId === userId);

  return {
    isEligible: eligibility.isEligible,
    attendedCount: eligibility.attendedCount,
    attendedEvents: eligibility.attendedEvents,
    hasSubmitted: Boolean(existing),
    review: existing ? {
      id: existing.id,
      rating: existing.rating,
      reviewText: existing.reviewText,
      status: existing.status,
      createdAt: existing.createdAt,
      rejectionReason: existing.status === REVIEW_STATUS.REJECTED ? existing.rejectionReason : null
    } : null
  };
}

/**
 * Submits a new review from an authenticated user.
 * Validates rating (1-5), text length (10-1000), verified attendance, and duplicate prevention.
 * Strictly created in PENDING status.
 */
export async function submitReview({ userId, fullName, rating, reviewText }) {
  if (!userId) {
    const err = new Error('Authentication required to submit feedback');
    err.statusCode = 401;
    throw err;
  }

  // Validate rating
  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    const err = new Error('Rating must be an integer between 1 and 5 stars');
    err.statusCode = 400;
    throw err;
  }

  // Validate review text
  if (!reviewText || typeof reviewText !== 'string') {
    const err = new Error('Review text is required');
    err.statusCode = 400;
    throw err;
  }

  const trimmedText = reviewText.trim();
  if (trimmedText.length < 10) {
    const err = new Error('Review text must be at least 10 characters in length');
    err.statusCode = 400;
    throw err;
  }

  if (trimmedText.length > 1000) {
    const err = new Error('Review text cannot exceed 1000 characters');
    err.statusCode = 400;
    throw err;
  }

  // Check verified attendance eligibility
  const eligibility = await checkUserAttendeeEligibility(userId);
  if (!eligibility.isEligible) {
    const err = new Error('Only verified attendees with a recorded event QR check-in are eligible to submit reviews.');
    err.statusCode = 400;
    err.ineligible = true;
    throw err;
  }

  // Prevent duplicate submissions from the same user
  const reviews = await getAllReviews();
  const existing = reviews.find(r => r.userId === userId && r.status !== REVIEW_STATUS.REJECTED);
  if (existing) {
    const err = new Error('You have already submitted a review. Each verified attendee may submit one review.');
    err.statusCode = 409;
    throw err;
  }

  const newReview = {
    id: `REV-2026-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
    userId,
    displayName: formatDisplayName(fullName),
    rating: numericRating,
    reviewText: sanitizeReviewText(trimmedText),
    verifiedAttendee: true,
    status: REVIEW_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    moderatedAt: null,
    moderatedBy: null,
    moderatorName: null,
    rejectionReason: null
  };

  reviews.unshift(newReview);
  await saveReviews(reviews);

  return {
    id: newReview.id,
    displayName: newReview.displayName,
    rating: newReview.rating,
    reviewText: newReview.reviewText,
    verifiedAttendee: newReview.verifiedAttendee,
    status: newReview.status,
    createdAt: newReview.createdAt
  };
}

/**
 * Moderates a review by setting its status to APPROVED, REJECTED, or HIDDEN.
 * Requires authorized manager ID and name.
 */
export async function moderateReview({ reviewId, status, managerId, managerName, rejectionReason }) {
  if (!reviewId) {
    const err = new Error('Review ID is required');
    err.statusCode = 400;
    throw err;
  }

  const validStatuses = [REVIEW_STATUS.APPROVED, REVIEW_STATUS.REJECTED, REVIEW_STATUS.HIDDEN];
  if (!validStatuses.includes(status)) {
    const err = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const reviews = await getAllReviews();
  const index = reviews.findIndex(r => r.id === reviewId);
  if (index === -1) {
    const err = new Error(`Review with ID '${reviewId}' not found`);
    err.statusCode = 404;
    throw err;
  }

  const target = reviews[index];
  target.status = status;
  target.moderatedAt = new Date().toISOString();
  target.moderatedBy = managerId || 'manager';
  target.moderatorName = managerName || 'Manager';
  target.rejectionReason = status === REVIEW_STATUS.REJECTED ? (rejectionReason || 'Does not adhere to review guidelines') : null;

  reviews[index] = target;
  await saveReviews(reviews);

  return target;
}
