import React, { useState, useEffect, useCallback } from 'react';
import {
  Compass,
  Ticket,
  LayoutDashboard,
  QrCode,
  ListChecks,
  BadgeCheck,
  ShieldCheck,
  Image as GalleryIcon,
  Palette,
  Sparkles,
  GraduationCap,
  Code2,
  Cpu,
  Layers,
  HeartHandshake,
  Quote,
  ExternalLink,
  CheckCircle2,
  Award,
  Terminal,
  Database,
  Star,
  MessageSquareQuote,
  Send,
  X,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import FestiqLogo from '../components/common/FestiqLogo';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchPublicReviews, fetchMyReviewStatus, submitReviewApi } from '../services/api';
import './AboutPage.css';

function formatDisplayName(fullName) {
  if (!fullName || typeof fullName !== 'string') return 'Verified Student';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Verified Student';
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

const CAPABILITIES = [
  {
    icon: Compass,
    title: 'Event Discovery',
    tag: 'Catalogue',
    description: 'Explore campus events across multiple categories with search, filtering, event details, availability information and transparent registration fees.'
  },
  {
    icon: Ticket,
    title: 'Streamlined Registration',
    tag: 'Workflows',
    description: 'Register for individual or team events through a unified workflow with server-side validation, capacity checks and payment-status tracking.'
  },
  {
    icon: LayoutDashboard,
    title: 'Student Dashboard',
    tag: 'Personal Hub',
    description: 'Manage registered events, view digital passes, track registration and payment statuses, and follow your upcoming events through My Schedule.'
  },
  {
    icon: QrCode,
    title: 'Digital Pass & QR Check-in',
    tag: 'Access Control',
    description: 'Access digital event passes with QR-based entry verification, duplicate check-in protection and secure attendance validation.'
  },
  {
    icon: ShieldCheck,
    title: 'Management Operations',
    tag: 'Role-Gated',
    description: 'Manage events, review event proposals, monitor participants, oversee registrations and verify attendee entry through the organizer portal.'
  },
  {
    icon: GalleryIcon,
    title: 'Campus Visual Archive',
    tag: 'Memories',
    description: 'Explore campus memories through curated event photographs, category-based browsing and an interactive gallery viewer.'
  },
  {
    icon: Palette,
    title: 'Dual-Theme Engine',
    tag: 'UI System',
    description: 'Switch between FESTIQ\'s Obsidian Gold dark theme and Sage & Porcelain light theme with consistent styling across the interface.'
  },
  {
    icon: ListChecks,
    title: 'Smart Waitlist',
    tag: 'Smart Allocation',
    description: 'Automatic FIFO waitlist management with time-limited seat offers, expiry handling and automatic allocation when event capacity becomes available.'
  },
  {
    icon: BadgeCheck,
    title: 'Verified Digital Certificates',
    tag: 'Verified Credentials',
    description: 'Generate and publish attendance-based certificates with unique verification IDs, downloadable PDFs and a public authenticity verification page.'
  }
];

const TECH_STACK = [
  { label: 'Frontend Framework', value: 'React 18 + Vite' },
  { label: 'Styling Engine', value: 'Pure CSS3 Variables & Tokens' },
  { label: 'Icons & Visuals', value: 'Lucide React + Campus Crest SVG' },
  { label: 'Backend Server', value: 'Node.js + Express REST API' },
  { label: 'Data Persistence', value: 'File-System Atomic JSON Store' },
  { label: 'Security & Auth', value: 'JWT + BCrypt + Cookie Guard' }
];

export default function AboutPage({ onOpenAuthModal }) {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ averageRating: 0, totalReviews: 0, ratingCounts: {} });
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Review submission & status state
  const [myReviewStatus, setMyReviewStatus] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const loadReviewsData = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const res = await fetchPublicReviews();
      if (res.success) {
        setReviews(res.data || []);
        if (res.summary) setReviewSummary(res.summary);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  const loadMyStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setMyReviewStatus(null);
      return;
    }
    try {
      const res = await fetchMyReviewStatus();
      if (res.success) {
        setMyReviewStatus(res.data);
      }
    } catch (err) {
      console.error('Failed to load user review status:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadReviewsData();
  }, [loadReviewsData]);

  useEffect(() => {
    loadMyStatus();
  }, [loadMyStatus]);

  const handleOpenReviewModal = () => {
    setSubmitError(null);
    setReviewModalOpen(true);
    if (isAuthenticated) {
      loadMyStatus();
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onOpenAuthModal?.();
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      setSubmitError('Please select a rating between 1 and 5 stars');
      return;
    }

    if (reviewText.trim().length < 10) {
      setSubmitError('Review text must be at least 10 characters long');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await submitReviewApi({
        rating: reviewRating,
        reviewText: reviewText.trim()
      });
      if (res.success) {
        toast.showSuccess('Review submitted! It will appear publicly once approved by event organizers.');
        setReviewText('');
        setReviewRating(5);
        await loadMyStatus();
        await loadReviewsData();
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="about-page-wrapper page-entrance">
      <div className="container">
        {/* Hero Section */}
        <div className="about-hero-section">
          <div className="about-hero-brand">
            <FestiqLogo variant="symbol" size="lg" />
          </div>
          <span className="section-tag">Campus Event Operating System</span>
          <h1 className="about-page-title">
            Engineered for Campus <span className="text-gradient">Celebration & Culture</span>
          </h1>
          <p className="about-page-subtitle">
            FESTIQ is a unified university event management platform created to elevate student discovery, streamline verified registrations, and empower campus organizers with professional coordination tools.
          </p>
        </div>

        {/* Vision & Problem Statement Dual Card */}
        <section className="about-narrative-grid" aria-label="Platform Mission and Vision">
          <div className="narrative-card vision-card">
            <div className="narrative-icon-box">
              <Sparkles size={22} />
            </div>
            <h2 className="narrative-title">The Challenge</h2>
            <p className="narrative-text">
              Collegiate festivals and academic symposia across universities traditionally rely on disjointed spreadsheets, scattered Google forms, unverified payment screenshots, and manual door lists. This friction causes long registration queues, missed events, and administrative fatigue for student organizers.
            </p>
            <ul className="narrative-points">
              <li>Fragmented communication across individual club portals</li>
              <li>Lack of transparent prize-pool funding and registration fees</li>
              <li>Slow, manual gate validation causing bottlenecks at venue entrances</li>
            </ul>
          </div>

          <div className="narrative-card solution-card">
            <div className="narrative-icon-box">
              <Layers size={22} />
            </div>
            <h2 className="narrative-title">The FESTIQ Vision</h2>
            <p className="narrative-text">
              FESTIQ consolidates the entire university event lifecycle into one responsive, aesthetic system. From real-time event discovery and seat reservation to personalized QR tickets, calendar synchronization, and manager analytics, every touchpoint is designed with collegiate dignity and clarity.
            </p>
            <ul className="narrative-points">
              <li>Single source of truth for all campus activities and workshops</li>
              <li>Floor-₹100 financial model ensuring sustainable, funded prize pools</li>
              <li>Universal accessibility across dark and light campus environments</li>
            </ul>
          </div>
        </section>

        {/* Real Platform Capabilities Grid */}
        <section className="about-capabilities-section" aria-label="Platform Real Capabilities">
          <div className="section-header">
            <span className="section-tag">Comprehensive Architecture</span>
            <h2 className="section-title">Everything Your Campus Needs to Connect</h2>
            <p className="section-subtitle">
              Discover events, manage registrations, stay connected and make every campus experience count.
            </p>
          </div>

          <div className="capabilities-grid">
            {CAPABILITIES.map((cap) => {
              const IconComp = cap.icon;
              return (
                <div key={cap.title} className="capability-card card-hover-fx">
                  <div className="capability-top">
                    <div className="capability-icon-wrap">
                      <IconComp size={22} className="capability-icon" />
                    </div>
                    <span className="capability-badge">{cap.tag}</span>
                  </div>
                  <h3 className="capability-title">{cap.title}</h3>
                  <p className="capability-desc">{cap.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Creator Profile Section */}
        <section className="about-creator-section" aria-label="Meet the Creator">
          <div className="section-header creator-section-header">
            <span className="section-tag">Architect & Engineer</span>
            <h2 className="section-title">Meet the Creator</h2>
            <p className="section-subtitle">
              The architectural vision, academic mission, and engineering philosophy behind the FESTIQ platform.
            </p>
          </div>

          {/* 1. Main Two-Column Creator Profile Card */}
          <div className="creator-profile-card">
            {/* Left Column: Creator Portrait */}
            <div className="creator-portrait-col">
              <div className="creator-portrait-frame">
                <img
                  src="/assets/creator-photo.jpeg"
                  alt="Ishan Kumar Yadav - Student Developer & Architect"
                  className="creator-portrait-photo"
                />
              </div>
            </div>

            {/* Right Column: Creator Identity */}
            <div className="creator-identity-col">
              <div className="creator-role-badge">
                <Terminal size={12} className="role-badge-icon" />
                <span>STUDENT DEVELOPER & ARCHITECT</span>
              </div>
              <h3 className="creator-name">Ishan Kumar Yadav</h3>
              <p className="creator-degree">B.Tech Computer Science & Engineering</p>
              <p className="creator-academic-meta">
                3rd Year Undergraduate • Semester VI Academic Coursework
              </p>
              <p className="creator-intro-narrative">
                Undergraduate student architect and lead engineer responsible for FESTIQ's platform architecture, pure CSS variable theming, concurrency-safe ticket allocations, and cryptographic verification workflows.
              </p>
              <div className="creator-institution-meta">
                <GraduationCap size={15} className="institution-icon" />
                <span>School of Computer Engineering • KIIT Deemed to be University</span>
              </div>
            </div>
          </div>

          {/* 2. Project Genesis & Academic Mission Section */}
          <div className="creator-mission-card">
            <div className="mission-content-zone">
              <div className="mission-header-zone">
                <Sparkles size={18} className="mission-icon" />
                <h4 className="mission-title">Project Genesis & Academic Mission</h4>
              </div>
              <p className="mission-text">
                FESTIQ was conceptualized, architected, and engineered as a comprehensive university semester-end Web Designing submission. The primary objective is to prove that modern web standards—semantic markup, pure CSS variable theming, modular component design, and RESTful architectures—can deliver an enterprise-grade experience without bloated dependencies.
              </p>
            </div>

            {/* 3. Three Achievement Statements / Highlights */}
            <div className="mission-highlights-grid">
              <div className="mission-highlight-item">
                <CheckCircle2 size={16} className="highlight-icon" />
                <span className="highlight-text">Dual Theme System with Zero Style Glitch</span>
              </div>
              <div className="mission-highlight-item">
                <CheckCircle2 size={16} className="highlight-icon" />
                <span className="highlight-text">Real RESTful Backend with Financial Reconciliation</span>
              </div>
              <div className="mission-highlight-item">
                <CheckCircle2 size={16} className="highlight-icon" />
                <span className="highlight-text">Strict Viewport Responsiveness across Mobile & Desktop</span>
              </div>
            </div>
          </div>

          {/* 4. Technical Specifications Panel */}
          <div className="creator-tech-panel">
            <div className="tech-panel-header">
              <Cpu size={16} className="tech-panel-icon" />
              <h4 className="tech-panel-title">Technical Specifications</h4>
            </div>
            <div className="tech-specs-grid">
              {TECH_STACK.map((item) => (
                <div key={item.label} className="tech-spec-row">
                  <span className="tech-spec-label">{item.label}</span>
                  <span className="tech-spec-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Verified Community Reviews Section */}
        <section className="about-reviews-section" aria-label="Campus Community Reviews">
          <div className="section-header">
            <span className="section-tag">Verified Perspectives</span>
            <h2 className="section-title">What People Say About FESTIQ</h2>
            <p className="section-subtitle">
              Authentic feedback and ratings submitted by verified event attendees through our QR check-in ecosystem.
            </p>
          </div>

          {/* Action / Rating Summary Banner */}
          <div className="reviews-summary-bar">
            <div className="summary-left-group">
              <div className="summary-rating-display">
                <span className="rating-score">
                  {reviewSummary.totalReviews > 0 ? reviewSummary.averageRating.toFixed(1) : '—'}
                </span>
                <div className="summary-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={18}
                      className={
                        reviewSummary.totalReviews > 0 && star <= Math.round(reviewSummary.averageRating)
                          ? 'star-filled'
                          : 'star-empty'
                      }
                    />
                  ))}
                </div>
              </div>
              <div className="summary-counts">
                <span className="counts-title">
                  {reviewSummary.totalReviews === 1
                    ? '1 Verified Review'
                    : `${reviewSummary.totalReviews} Verified Reviews`}
                </span>
                <span className="counts-sub">From QR check-in confirmed attendees</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<MessageSquareQuote size={16} />}
              onClick={handleOpenReviewModal}
            >
              Share Your Experience
            </Button>
          </div>

          {/* Reviews Grid or Empty State */}
          {reviewsLoading ? (
            <div className="reviews-loading-state">
              <RefreshCw size={24} className="spinning-icon" />
              <span>Loading verified reviews...</span>
            </div>
          ) : reviews.length === 0 ? (
            <div className="reviews-empty-state">
              <div className="empty-state-icon-wrap">
                <MessageSquareQuote size={40} className="empty-state-icon" />
              </div>
              <h3 className="empty-state-title">No Published Reviews Yet</h3>
              <p className="empty-state-desc">
                Attended a FESTIQ event? Be the first verified attendee to share your campus festival experience.
              </p>
              <Button
                variant="secondary"
                size="md"
                icon={<Sparkles size={16} />}
                onClick={handleOpenReviewModal}
              >
                Share Your Experience
              </Button>
            </div>
          ) : (
            <div className="reviews-cards-grid">
              {reviews.map((r) => (
                <div key={r.id} className="review-display-card card-hover-fx">
                  <div className="review-card-header">
                    <div className="review-stars-display">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={15}
                          className={star <= r.rating ? 'star-filled' : 'star-empty'}
                        />
                      ))}
                    </div>
                    <span className="review-date">
                      {new Date(r.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short'
                      })}
                    </span>
                  </div>

                  <p className="review-card-text">"{r.reviewText}"</p>

                  <div className="review-author-row">
                    <div className="author-avatar-chip">
                      {r.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="author-meta">
                      <div className="author-name">{r.displayName}</div>
                      {r.verifiedAttendee && (
                        <div className="verified-badge">
                          <ShieldCheck size={12} className="shield-icon" />
                          <span>Verified Attendee</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Review Submission Modal */}
        {reviewModalOpen && (
          <div className="review-modal-backdrop" onClick={() => setReviewModalOpen(false)}>
            <div className="review-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-row">
                <div className="modal-title-group">
                  <Sparkles size={20} className="modal-title-icon" />
                  <h3 className="modal-title">Share Your FESTIQ Experience</h3>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setReviewModalOpen(false)}
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {!isAuthenticated ? (
                <div className="modal-body-auth-prompt">
                  <AlertCircle size={32} className="prompt-icon" />
                  <h4>Student Sign In Required</h4>
                  <p>
                    To ensure feedback authenticity, reviews are exclusively accepted from registered student accounts with verified attendance.
                  </p>
                  <div className="modal-prompt-actions">
                    <Button
                      variant="primary"
                      onClick={() => {
                        setReviewModalOpen(false);
                        onOpenAuthModal?.();
                      }}
                    >
                      Sign In or Create Account
                    </Button>
                  </div>
                </div>
              ) : myReviewStatus && !myReviewStatus.isEligible ? (
                <div className="modal-body-ineligible">
                  <AlertCircle size={32} className="prompt-icon" />
                  <h4>Verified Event Attendance Required</h4>
                  <p>
                    Our review system exclusively publishes feedback from attendees who have checked in to at least one FESTIQ event via our QR entry scanner.
                  </p>
                  <div className="ineligible-tip">
                    <strong>How to qualify:</strong> Attend any upcoming campus event and present your digital pass QR code at the venue gate for check-in.
                  </div>
                  <div className="modal-prompt-actions">
                    <Button variant="secondary" onClick={() => setReviewModalOpen(false)}>
                      Understood
                    </Button>
                  </div>
                </div>
              ) : myReviewStatus && myReviewStatus.hasSubmitted ? (
                <div className="modal-body-submitted">
                  <CheckCircle2 size={36} className="submitted-icon" />
                  <h4>Review Submitted</h4>
                  <p>
                    {myReviewStatus.review?.status === 'APPROVED'
                      ? 'Your verified review has been approved and published to the About page. Thank you for your feedback!'
                      : myReviewStatus.review?.status === 'REJECTED'
                      ? `Your review could not be published (${myReviewStatus.review?.rejectionReason || 'Does not meet review guidelines'}).`
                      : 'Your feedback is currently under review by our campus event organizers. It will appear publicly once approved.'}
                  </p>
                  {myReviewStatus.review && (
                    <div className="submitted-preview-box">
                      <div className="preview-stars">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            className={s <= myReviewStatus.review.rating ? 'star-filled' : 'star-empty'}
                          />
                        ))}
                      </div>
                      <p className="preview-text">"{myReviewStatus.review.reviewText}"</p>
                    </div>
                  )}
                  <div className="modal-prompt-actions">
                    <Button variant="secondary" onClick={() => setReviewModalOpen(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <form className="review-form" onSubmit={handleSubmitReview}>
                  <div className="form-group">
                    <label className="form-label">Overall Rating *</label>
                    <div className="interactive-star-picker">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          className={`star-pick-btn ${star <= (hoverRating || reviewRating) ? 'active' : ''}`}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setReviewRating(star)}
                          aria-label={`Rate ${star} out of 5 stars`}
                        >
                          <Star size={26} />
                        </button>
                      ))}
                      <span className="selected-rating-label">
                        {(hoverRating || reviewRating) > 0 ? `${hoverRating || reviewRating} / 5 Stars` : 'Select rating'}
                      </span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Your Feedback *
                      <span className="char-counter">
                        {reviewText.length}/1000 (minimum 10 characters)
                      </span>
                    </label>
                    <textarea
                      className="review-textarea"
                      rows={4}
                      placeholder="Share your thoughts on venue organization, event discovery, QR digital pass entry, or festival culture..."
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      maxLength={1000}
                      required
                    />
                  </div>

                  <div className="privacy-reassurance-note">
                    <ShieldCheck size={14} className="privacy-icon" />
                    <span>
                      Privacy Protected: Your review will display as <strong>{user?.fullName ? formatDisplayName(user.fullName) : 'Verified Student'}</strong>. Your student roll number, email, and phone are never published.
                    </span>
                  </div>

                  {submitError && (
                    <div className="form-error-banner">
                      <AlertCircle size={15} />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="modal-form-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setReviewModalOpen(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      icon={<Send size={15} />}
                      disabled={submitting || reviewRating < 1 || reviewText.trim().length < 10}
                    >
                      {submitting ? 'Submitting...' : 'Submit for Moderation'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Academic Notice Banner */}
        <div className="about-notice-banner">
          <div className="notice-inner">
            <Award size={22} className="notice-icon" />
            <div className="notice-content">
              <strong>Academic Project Verification:</strong> Developed for educational demonstration, user testing, and university portfolio assessment. All rights reserved by student creators.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
