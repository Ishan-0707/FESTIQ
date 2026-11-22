import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Star,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  EyeOff,
  Clock,
  User,
  MessageSquareQuote,
  Sparkles
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { useToast } from '../../context/ToastContext';
import { fetchAdminReviews, moderateReviewAdmin } from '../../services/api';
import './ReviewManagementTab.css';

export default function ReviewManagementTab() {
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL | PENDING | APPROVED | REJECTED
  const [searchQuery, setSearchQuery] = useState('');

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [rejectModalTarget, setRejectModalTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminReviews();
      if (res.success) {
        setReviews(res.data || []);
        if (res.stats) setStats(res.stats);
      } else {
        setError(res.message || 'Failed to retrieve reviews');
      }
    } catch (err) {
      setError(err.message || 'Network error fetching reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      if (filterStatus !== 'ALL' && r.status !== filterStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (r.displayName || '').toLowerCase().includes(q);
        const textMatch = (r.reviewText || '').toLowerCase().includes(q);
        const idMatch = (r.id || '').toLowerCase().includes(q);
        if (!nameMatch && !textMatch && !idMatch) return false;
      }
      return true;
    });
  }, [reviews, filterStatus, searchQuery]);

  const handleApprove = async (review) => {
    setActionLoadingId(review.id);
    try {
      const res = await moderateReviewAdmin(review.id, { status: 'APPROVED' });
      if (res.success) {
        toast.showSuccess(`Review from ${review.displayName} approved and published.`);
        loadReviews();
      }
    } catch (err) {
      toast.showError(err.message || 'Failed to approve review');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalTarget) return;
    setActionLoadingId(rejectModalTarget.id);
    try {
      const res = await moderateReviewAdmin(rejectModalTarget.id, {
        status: 'REJECTED',
        rejectionReason: rejectReason.trim() || 'Does not meet review guidelines'
      });
      if (res.success) {
        toast.showSuccess(`Review from ${rejectModalTarget.displayName} rejected.`);
        setRejectModalTarget(null);
        setRejectReason('');
        loadReviews();
      }
    } catch (err) {
      toast.showError(err.message || 'Failed to reject review');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleHide = async (review) => {
    setActionLoadingId(review.id);
    try {
      const res = await moderateReviewAdmin(review.id, {
        status: 'HIDDEN',
        rejectionReason: 'Hidden from public display by manager'
      });
      if (res.success) {
        toast.showSuccess(`Review from ${review.displayName} hidden from public display.`);
        loadReviews();
      }
    } catch (err) {
      toast.showError(err.message || 'Failed to hide review');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="review-mgmt-tab">
      {/* Top Header & Refresh */}
      <div className="review-mgmt-header">
        <div>
          <h2 className="review-mgmt-title">
            <Star className="title-icon" size={24} />
            Verified Feedback & Review Moderation
          </h2>
          <p className="review-mgmt-desc">
            Moderate student submissions. Only approved reviews from verified QR check-in attendees appear publicly.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={loadReviews}
          disabled={loading}
          icon={RefreshCw}
          className={loading ? 'spinning-icon' : ''}
        >
          Refresh
        </Button>
      </div>

      {/* KPI Stats Bar */}
      <div className="review-stats-grid">
        <div className="review-stat-card">
          <div className="stat-label">Total Submissions</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="review-stat-card stat-pending">
          <div className="stat-label">Pending Approval</div>
          <div className="stat-value">{stats.pending}</div>
        </div>
        <div className="review-stat-card stat-approved">
          <div className="stat-label">Published Reviews</div>
          <div className="stat-value">{stats.approved}</div>
        </div>
        <div className="review-stat-card stat-rejected">
          <div className="stat-label">Rejected / Hidden</div>
          <div className="stat-value">{(stats.rejected || 0) + (stats.hidden || 0)}</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="review-controls-bar">
        <div className="review-search-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="review-search-input"
            placeholder="Search by student name, review text, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="review-filter-tabs">
          <button
            type="button"
            className={`filter-btn ${filterStatus === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterStatus('ALL')}
          >
            All ({reviews.length})
          </button>
          <button
            type="button"
            className={`filter-btn ${filterStatus === 'PENDING' ? 'active' : ''}`}
            onClick={() => setFilterStatus('PENDING')}
          >
            Pending ({stats.pending})
          </button>
          <button
            type="button"
            className={`filter-btn ${filterStatus === 'APPROVED' ? 'active' : ''}`}
            onClick={() => setFilterStatus('APPROVED')}
          >
            Approved ({stats.approved})
          </button>
          <button
            type="button"
            className={`filter-btn ${filterStatus === 'REJECTED' ? 'active' : ''}`}
            onClick={() => setFilterStatus('REJECTED')}
          >
            Rejected ({stats.rejected || 0})
          </button>
        </div>
      </div>

      {/* Review List */}
      {loading ? (
        <div className="review-mgmt-loading">
          <RefreshCw size={24} className="spinning-icon" />
          <span>Loading submitted reviews...</span>
        </div>
      ) : error ? (
        <div className="review-mgmt-error">
          <AlertCircle size={20} />
          <span>{error}</span>
          <Button size="sm" variant="secondary" onClick={loadReviews}>Retry</Button>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="review-mgmt-empty">
          <MessageSquareQuote size={40} className="empty-icon" />
          <h3>No Reviews Found</h3>
          <p>
            {searchQuery || filterStatus !== 'ALL'
              ? 'No reviews match your current search or status filter.'
              : 'No student feedback has been submitted yet. Verified attendees can submit feedback from the About page.'}
          </p>
        </div>
      ) : (
        <div className="review-cards-list">
          {filteredReviews.map((item) => {
            const isPending = item.status === 'PENDING';
            const isApproved = item.status === 'APPROVED';
            const isRejected = item.status === 'REJECTED';
            const isHidden = item.status === 'HIDDEN';

            return (
              <div key={item.id} className={`review-mgmt-card status-${item.status.toLowerCase()}`}>
                <div className="card-top-row">
                  <div className="reviewer-info">
                    <span className="reviewer-name">{item.displayName}</span>
                    {item.verifiedAttendee && (
                      <span className="verified-chip">
                        <ShieldCheck size={13} />
                        Verified Attendee
                      </span>
                    )}
                    <span className="review-id-tag">{item.id}</span>
                  </div>

                  <div className="card-status-badge">
                    {isPending && <Badge variant="warning">PENDING APPROVAL</Badge>}
                    {isApproved && <Badge variant="success">APPROVED & PUBLISHED</Badge>}
                    {isRejected && <Badge variant="danger">REJECTED</Badge>}
                    {isHidden && <Badge variant="neutral">HIDDEN</Badge>}
                  </div>
                </div>

                <div className="rating-stars-row">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      className={star <= item.rating ? 'star-filled' : 'star-empty'}
                    />
                  ))}
                  <span className="rating-numeric">({item.rating} / 5 stars)</span>
                  <span className="review-date-meta">
                    <Clock size={12} />
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                <div className="review-text-bubble">
                  "{item.reviewText}"
                </div>

                {item.moderatedAt && (
                  <div className="moderation-audit-note">
                    <strong>Moderation Record:</strong> Marked as {item.status} by{' '}
                    <span>{item.moderatorName || 'Manager'}</span> on{' '}
                    {new Date(item.moderatedAt).toLocaleString()}
                    {item.rejectionReason && (
                      <div className="rejection-reason-text">
                        Reason: {item.rejectionReason}
                      </div>
                    )}
                  </div>
                )}

                {/* Manager Moderation Actions */}
                <div className="card-actions-bar">
                  {isPending && (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        icon={CheckCircle2}
                        onClick={() => handleApprove(item)}
                        disabled={actionLoadingId === item.id}
                      >
                        Approve & Publish
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={XCircle}
                        onClick={() => {
                          setRejectModalTarget(item);
                          setRejectReason('');
                        }}
                        disabled={actionLoadingId === item.id}
                      >
                        Reject
                      </Button>
                    </>
                  )}

                  {isApproved && (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={EyeOff}
                      onClick={() => handleHide(item)}
                      disabled={actionLoadingId === item.id}
                    >
                      Hide from Public
                    </Button>
                  )}

                  {(isRejected || isHidden) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={CheckCircle2}
                      onClick={() => handleApprove(item)}
                      disabled={actionLoadingId === item.id}
                    >
                      Re-Approve
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModalTarget && (
        <div className="reject-modal-backdrop" onClick={() => setRejectModalTarget(null)}>
          <div className="reject-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="reject-modal-title">Reject Review Submission</h3>
            <p className="reject-modal-desc">
              Please provide a reason for rejecting the feedback submitted by{' '}
              <strong>{rejectModalTarget.displayName}</strong>.
            </p>
            <textarea
              className="reject-reason-input"
              rows={3}
              placeholder="e.g. Inappropriate language, off-topic, or spam content..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="reject-modal-actions">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRejectModalTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmReject}
                disabled={actionLoadingId === rejectModalTarget.id}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

