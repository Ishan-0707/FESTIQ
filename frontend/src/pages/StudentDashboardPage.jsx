import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  MapPin,
  Ticket,
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
  PlusCircle,
  ExternalLink,
  GraduationCap,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  CreditCard
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import FestiqLogo from '../components/common/FestiqLogo';
import DigitalPassModal from '../components/dashboard/DigitalPassModal';
import ClaimPassModal from '../components/dashboard/ClaimPassModal';
import PaymentCheckoutModal from '../components/events/PaymentCheckoutModal';
import { useAuth } from '../context/AuthContext';
import { fetchMyRegistrations } from '../services/api';
import './StudentDashboardPage.css';

export default function StudentDashboardPage({ onOpenAuthModal }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'UPCOMING' | 'COMPLETED'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedRegForPass, setSelectedRegForPass] = useState(null);
  const [selectedRegForPayment, setSelectedRegForPayment] = useState(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);

  // Load student registrations
  const loadRegistrations = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetchMyRegistrations();
      if (res.success) {
        setRegistrations(res.data || []);
      } else {
        setError(res.message || 'Failed to load your event registrations');
      }
    } catch (err) {
      setError(err.message || 'Error connecting to registration records');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadRegistrations();
    }
  }, [isAuthenticated, loadRegistrations]);

  // Check if an event date is upcoming vs completed
  const isEventUpcoming = (eventDate) => {
    if (!eventDate || eventDate === 'Upcoming' || eventDate === 'Date TBD') return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateObj = new Date(eventDate);
    return dateObj >= today;
  };

  // Metrics dynamically calculated from actual registration records
  const metrics = useMemo(() => {
    const total = registrations.length;
    let upcoming = 0;
    let completed = 0;
    let checkedIn = 0;

    for (const reg of registrations) {
      if (reg.pass?.checkedIn || reg.checkedIn) {
        checkedIn++;
      }
      if (isEventUpcoming(reg.eventDate)) {
        upcoming++;
      } else {
        completed++;
      }
    }

    return {
      total,
      upcoming,
      completed,
      checkedIn
    };
  }, [registrations]);

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return registrations.filter((reg) => {
      // Status tab match
      const upcoming = isEventUpcoming(reg.eventDate);
      let matchesTab = true;
      if (statusFilter === 'UPCOMING') matchesTab = upcoming;
      if (statusFilter === 'COMPLETED') matchesTab = !upcoming;

      // Query match
      const matchesSearch =
        !query ||
        (reg.eventTitle || '').toLowerCase().includes(query) ||
        (reg.eventCategory || reg.category || '').toLowerCase().includes(query) ||
        (reg.eventVenue || '').toLowerCase().includes(query) ||
        (reg.pass?.passId || '').toLowerCase().includes(query);

      return matchesTab && matchesSearch;
    });
  }, [registrations, statusFilter, searchQuery]);

  // Handle pass claimed callback
  const handlePassClaimed = (claimedRecord) => {
    loadRegistrations();
  };

  // 1. Loading state
  if (authLoading) {
    return (
      <div className="dashboard-loading-screen">
        <div className="dashboard-spinner" />
        <p>Loading student portal...</p>
      </div>
    );
  }

  // 2. Unauthenticated state
  if (!isAuthenticated) {
    return (
      <div className="dashboard-restricted-page">
        <div className="container">
          <div className="dashboard-restricted-card">
            <div className="restricted-icon-box">
              <Ticket size={36} className="lock-icon" />
            </div>
            <h1 className="restricted-title">Student Authentication Required</h1>
            <p className="restricted-message">
              Access your personal event passes, QR admission tickets, and campus fest schedule. Please sign in with your verified KIIT student account.
            </p>
            <div className="restricted-actions">
              <Button
                variant="primary"
                size="md"
                onClick={onOpenAuthModal}
                icon={<ArrowRight size={16} />}
              >
                Sign In / Sign Up
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="student-dashboard-page page-entrance">
      <div className="container">
        {/* Top Header / Profile Banner */}
        <header className="dashboard-header">
          <div className="dashboard-profile-group">
            <div className="dashboard-portal-badge">
              <FestiqLogo variant="symbol" size={20} />
              <span>Personal Student Space</span>
            </div>
            <h1 className="dashboard-welcome-title">
              Welcome back, <span className="text-gradient">{user.fullName.split(' ')[0]}</span>!
            </h1>
            <div className="dashboard-profile-meta">
              <span className="profile-meta-item">
                <GraduationCap size={15} />
                <span>{user.programme} · {user.branch || 'KIIT University'}</span>
              </span>
              <span className="profile-meta-item">
                <span>{user.academicYear || 'Undergraduate'}</span>
              </span>
              {user.rollNumber && (
                <span className="profile-meta-item roll-pill">
                  <span>Roll: {user.rollNumber}</span>
                </span>
              )}
            </div>
          </div>

          <div className="dashboard-header-actions">
            <Button
              variant="outline"
              size="sm"
              icon={<PlusCircle size={15} />}
              onClick={() => setClaimModalOpen(true)}
            >
              Link Guest Pass
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={loadRegistrations}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </header>

        {/* Dynamic Metric KPIs */}
        <section className="dashboard-metrics-section" aria-label="Participation Statistics">
          <div className="dashboard-metrics-grid">
            <div className="dash-metric-card">
              <div className="metric-icon-box cat-tech">
                <Ticket size={22} />
              </div>
              <div className="dash-metric-content">
                <span className="metric-num">{metrics.total}</span>
                <span className="metric-label">Registered Events</span>
                <span className="metric-sub">Across campus fests</span>
              </div>
            </div>

            <div className="dash-metric-card">
              <div className="metric-icon-box cat-cultural">
                <Calendar size={22} />
              </div>
              <div className="dash-metric-content">
                <span className="metric-num">{metrics.upcoming}</span>
                <span className="metric-label">Upcoming Events</span>
                <span className="metric-sub">Scheduled on calendar</span>
              </div>
            </div>

            <div className="dash-metric-card">
              <div className="metric-icon-box cat-workshops">
                <CheckCircle2 size={22} />
              </div>
              <div className="dash-metric-content">
                <span className="metric-num">{metrics.checkedIn}</span>
                <span className="metric-label">Admitted / Checked In</span>
                <span className="metric-sub">Verified at venue</span>
              </div>
            </div>

            <div className="dash-metric-card">
              <div className="metric-icon-box cat-management">
                <ShieldCheck size={22} />
              </div>
              <div className="dash-metric-content">
                <span className="metric-num">{metrics.completed}</span>
                <span className="metric-label">Completed Events</span>
                <span className="metric-sub">Past participations</span>
              </div>
            </div>
          </div>
        </section>

        {/* My Registered Events Section */}
        <section className="dashboard-events-section">
          <div className="dash-section-header">
            <div>
              <h2 className="dash-section-title">My Registered Events</h2>
              <p className="dash-section-desc">
                Select any event below to access your scannable digital admission pass and venue details.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="dash-filter-tabs">
              <button
                type="button"
                className={`dash-tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ALL')}
              >
                All ({registrations.length})
              </button>
              <button
                type="button"
                className={`dash-tab-btn ${statusFilter === 'UPCOMING' ? 'active' : ''}`}
                onClick={() => setStatusFilter('UPCOMING')}
              >
                Upcoming ({metrics.upcoming})
              </button>
              <button
                type="button"
                className={`dash-tab-btn ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
                onClick={() => setStatusFilter('COMPLETED')}
              >
                Completed ({metrics.completed})
              </button>
            </div>
          </div>

          {/* Search bar for registered events */}
          {registrations.length > 0 && (
            <div className="dash-search-row">
              <div className="dash-search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search your registered events by title, venue, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setSearchQuery('')}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Events Grid or Empty State */}
          {loading ? (
            <div className="dash-loading-card">
              <div className="dashboard-spinner" />
              <p>Retrieving your digital passes...</p>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="dash-empty-card">
              <div className="empty-icon-circle">
                <Ticket size={40} className="empty-icon" />
              </div>
              <h3 className="empty-title">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'No matching registered events found'
                  : 'No Event Registrations Yet'}
              </h3>
              <p className="empty-desc">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Try clearing your search query or switching to another filter tab.'
                  : 'You have not registered for any campus events yet. Explore our directory of hackathons, cultural galas, workshops, and sports championships to secure your digital pass.'}
              </p>
              <div className="empty-actions">
                {searchQuery || statusFilter !== 'ALL' ? (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('ALL');
                    }}
                  >
                    Reset Filters
                  </Button>
                ) : (
                  <Link to="/events">
                    <Button variant="primary" size="md" icon={<ArrowRight size={16} />}>
                      Explore Campus Events
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="registered-events-grid">
              {filteredRegistrations.map((reg) => {
                const pass = reg.pass || {};
                const isCheckedIn = Boolean(pass.checkedIn || reg.checkedIn);
                const isUpcoming = isEventUpcoming(reg.eventDate);
                const isPendingPayment = reg.paymentStatus === 'pending' || reg.status === 'pending_payment';
                const isFailedPayment = reg.paymentStatus === 'failed';
                const feeAmount = reg.payment?.amount || reg.feeAmount || 0;

                return (
                  <div key={reg.id} className="reg-event-card">
                    {/* Event Banner */}
                    <div className="reg-card-banner">
                      {reg.eventImage ? (
                        <img
                          src={reg.eventImage}
                          alt={reg.eventTitle}
                          className="banner-img"
                        />
                      ) : (
                        <div className="banner-placeholder" />
                      )}
                      <div className="banner-badge-wrap">
                        <span className="card-category-pill">
                          {reg.eventCategory || reg.category || 'Event'}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="reg-card-body">
                      <h3 className="reg-event-title">{reg.eventTitle}</h3>

                      <div className="reg-event-meta">
                        <div className="meta-line">
                          <Calendar size={14} className="meta-icon" />
                          <span>{reg.eventDate || 'Date TBD'}</span>
                        </div>
                        {reg.eventTime && (
                          <div className="meta-line">
                            <Clock size={14} className="meta-icon" />
                            <span>{reg.eventTime}</span>
                          </div>
                        )}
                        {reg.eventVenue && (
                          <div className="meta-line">
                            <MapPin size={14} className="meta-icon" />
                            <span className="venue-text">{reg.eventVenue}</span>
                          </div>
                        )}
                      </div>

                      {/* Pass ID & Status Row */}
                      <div className="reg-pass-status-row">
                        <div className="pass-id-tag">
                          <code>{pass.passId || (isPendingPayment ? 'PENDING' : reg.id)}</code>
                        </div>

                        <div className="pass-status-pill-wrap">
                          {isPendingPayment ? (
                            <span className="pass-pill-pending">
                              <Clock size={13} />
                              <span>Payment Pending</span>
                            </span>
                          ) : isFailedPayment ? (
                            <span className="pass-pill-failed">
                              <AlertCircle size={13} />
                              <span>Payment Failed</span>
                            </span>
                          ) : isCheckedIn ? (
                            <span className="pass-pill-checked-in">
                              <CheckCircle2 size={13} />
                              <span>Checked In</span>
                            </span>
                          ) : isUpcoming ? (
                            <span className="pass-pill-valid">
                              <span className="green-pulse" />
                              <span>Ready for Entry</span>
                            </span>
                          ) : (
                            <span className="pass-pill-completed">
                              <span>Completed</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="reg-card-action">
                        {isPendingPayment || isFailedPayment ? (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<CreditCard size={15} />}
                            onClick={() => setSelectedRegForPayment(reg)}
                            className="w-full pay-now-action-btn"
                          >
                            {isFailedPayment ? 'Retry Payment' : 'Complete Payment'} (₹{feeAmount.toLocaleString('en-IN')})
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<Ticket size={15} />}
                            onClick={() => setSelectedRegForPass(reg)}
                            className="w-full"
                          >
                            View Digital Pass & QR
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Digital Event Pass Modal */}
      <DigitalPassModal
        isOpen={Boolean(selectedRegForPass)}
        registration={selectedRegForPass}
        onClose={() => setSelectedRegForPass(null)}
      />

      {/* Payment Checkout Modal */}
      {selectedRegForPayment && (
        <PaymentCheckoutModal
          isOpen={Boolean(selectedRegForPayment)}
          onClose={() => setSelectedRegForPayment(null)}
          registration={selectedRegForPayment}
          event={{
            title: selectedRegForPayment.eventTitle,
            category: selectedRegForPayment.eventCategory,
            feeAmount: selectedRegForPayment.payment?.amount || selectedRegForPayment.feeAmount,
            feeType: selectedRegForPayment.feeType
          }}
          onPaymentSuccess={() => {
            loadRegistrations();
            setSelectedRegForPayment(null);
          }}
        />
      )}

      {/* Claim Guest Pass Modal */}
      <ClaimPassModal
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        onPassClaimed={handlePassClaimed}
      />
    </div>
  );
}

