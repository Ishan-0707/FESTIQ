import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  CreditCard,
  Award,
  ChevronRight,
  CalendarCheck,
  ArrowUpRight,
  Info,
  CalendarDays,
  FileCheck2,
  Copy,
  Download,
  AlertTriangle,
  XCircle,
  X
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import FestiqLogo from '../components/common/FestiqLogo';
import DigitalPassModal from '../components/dashboard/DigitalPassModal';
import ClaimPassModal from '../components/dashboard/ClaimPassModal';
import PaymentCheckoutModal from '../components/events/PaymentCheckoutModal';
import EventDetailsModal from '../components/events/EventDetailsModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  fetchMyRegistrations,
  fetchStudentWaitlist,
  acceptWaitlistOffer,
  declineWaitlistOffer,
  withdrawFromWaitlist,
  cancelStudentRegistration,
  fetchMyCertificates,
  downloadCertificatePdf
} from '../services/api';
import './StudentDashboardPage.css';

// Navigation tabs specification
const DASHBOARD_TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'registrations', label: 'Registrations', icon: Ticket },
  { id: 'schedule', label: 'My Schedule', icon: Calendar },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'waitlist', label: 'Waitlist', icon: Clock }
];

export default function StudentDashboardPage({ onOpenAuthModal, onEventSelect, events = [] }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'overview';

  // Active section tab
  const [activeSection, setActiveSection] = useState(tabParam); // 'overview' | 'registrations' | 'schedule' | 'certificates' | 'waitlist'

  // Keep activeSection synchronized with URL search parameter
  useEffect(() => {
    if (tabParam && tabParam !== activeSection) {
      setActiveSection(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId) => {
    setActiveSection(tabId);
    if (tabId === 'overview') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', tabId);
    }
    setSearchParams(searchParams);
  };

  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search for Registrations section
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'UPCOMING' | 'COMPLETED'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedRegForPass, setSelectedRegForPass] = useState(null);
  const [selectedRegForPayment, setSelectedRegForPayment] = useState(null);
  const [selectedEventForDetails, setSelectedEventForDetails] = useState(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [cancellingRegistration, setCancellingRegistration] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const toast = useToast();

  // Waitlist state
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [loadingWaitlist, setLoadingWaitlist] = useState(false);
  const [waitlistActionId, setWaitlistActionId] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());

  // Load student waitlist entries
  const loadWaitlist = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingWaitlist(true);
    try {
      const res = await fetchStudentWaitlist();
      if (res.success) {
        setWaitlistEntries(res.data || []);
      }
    } catch (err) {
      console.warn('[Student Dashboard] Waitlist load error:', err.message);
    } finally {
      setLoadingWaitlist(false);
    }
  }, [isAuthenticated]);

  // Certificates state & loader
  const [certificates, setCertificates] = useState([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);

  const loadCertificates = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingCertificates(true);
    try {
      const res = await fetchMyCertificates();
      if (res.success) {
        setCertificates(res.data || []);
      }
    } catch (err) {
      console.warn('[Student Dashboard] Certificates load error:', err.message);
    } finally {
      setLoadingCertificates(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadWaitlist();
      loadCertificates();
    }
  }, [isAuthenticated, loadWaitlist, loadCertificates]);

  // Real-time countdown ticker for active seat offers
  useEffect(() => {
    const hasActiveOffers = waitlistEntries.some(
      (w) => w.status === 'OFFERED' && w.offerExpiresAt && new Date(w.offerExpiresAt).getTime() > Date.now()
    );
    if (!hasActiveOffers) return;
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [waitlistEntries]);

  // Helper: Format countdown time remaining
  const formatRemainingTime = (expiresAt) => {
    if (!expiresAt) return '';
    const diff = new Date(expiresAt).getTime() - nowTick;
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  // Categorized waitlist entries
  const activeSeatOffers = useMemo(() => {
    return waitlistEntries.filter(
      (w) => w.status === 'OFFERED' && (!w.offerExpiresAt || new Date(w.offerExpiresAt).getTime() > nowTick)
    );
  }, [waitlistEntries, nowTick]);

  const activeWaitingEntries = useMemo(() => {
    return waitlistEntries.filter((w) => w.status === 'WAITING');
  }, [waitlistEntries]);

  const pastWaitlistEntries = useMemo(() => {
    return waitlistEntries.filter(
      (w) => w.status !== 'WAITING' && (w.status !== 'OFFERED' || (w.offerExpiresAt && new Date(w.offerExpiresAt).getTime() <= nowTick))
    );
  }, [waitlistEntries, nowTick]);

  // Waitlist action: Accept seat offer
  const handleAcceptOffer = async (entry) => {
    setWaitlistActionId(entry.id);
    try {
      const res = await acceptWaitlistOffer(entry.id);
      if (res.success) {
        if (res.data?.requiresPayment) {
          setSelectedRegForPayment(res.data.registration);
          toast.info('Seat accepted! Please complete payment to issue your pass.');
        } else {
          toast.success('Seat offer accepted! Your digital event pass has been issued.');
        }
        await Promise.all([loadRegistrations(), loadWaitlist()]);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to accept seat offer');
      loadWaitlist();
    } finally {
      setWaitlistActionId(null);
    }
  };

  // Waitlist action: Decline seat offer
  const handleDeclineOffer = async (entry) => {
    if (!window.confirm(`Are you sure you want to decline the seat offer for '${entry.eventTitle}'? It will be immediately offered to the next student in queue.`)) {
      return;
    }
    setWaitlistActionId(entry.id);
    try {
      const res = await declineWaitlistOffer(entry.id);
      if (res.success) {
        toast.info('Seat offer declined. The next student in queue has been offered the seat.');
        await loadWaitlist();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to decline offer');
    } finally {
      setWaitlistActionId(null);
    }
  };

  // Waitlist action: Withdraw from waitlist
  const handleWithdrawWaitlist = async (entry) => {
    if (!window.confirm(`Withdraw from the waitlist for '${entry.eventTitle}'?`)) {
      return;
    }
    setWaitlistActionId(entry.id);
    try {
      const res = await withdrawFromWaitlist(entry.id);
      if (res.success) {
        toast.info('You have withdrawn from the waitlist.');
        await loadWaitlist();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to withdraw');
    } finally {
      setWaitlistActionId(null);
    }
  };

  // Registration action: Open cancel confirmation modal
  const handleCancelRegistration = (reg) => {
    setCancellingRegistration(reg);
  };

  // Registration action: Execute confirmed cancellation
  const confirmCancelRegistration = async () => {
    if (!cancellingRegistration) return;
    setCancelLoading(true);
    try {
      const res = await cancelStudentRegistration(cancellingRegistration.id);
      if (res.success) {
        toast.info(res.message || 'Registration cancelled. Your seat has been released.');
        setCancellingRegistration(null);
        await Promise.all([loadRegistrations(), loadWaitlist()]);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to cancel registration');
    } finally {
      setCancelLoading(false);
    }
  };

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

  // Safe date parser for chronological display
  const parseDateInfo = (dateStr) => {
    if (!dateStr || dateStr === 'Upcoming' || dateStr === 'Date TBD') {
      return { month: 'TBD', day: '--', weekday: 'TBD', year: '', isTbd: true };
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return { month: 'TBD', day: '--', weekday: 'TBD', year: '', isTbd: true };
    }
    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = d.getDate();
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const year = d.getFullYear();
    return { month, day, weekday, year, isTbd: false };
  };

  // Convert registration item into full event object for EventDetailsModal
  const makeEventFromReg = (reg) => {
    if (!reg) return null;
    if (events && events.length > 0) {
      const found = events.find((e) => e.id === reg.eventId);
      if (found) return found;
    }
    return {
      id: reg.eventId,
      title: reg.eventTitle || 'Campus Event',
      category: reg.eventCategory || reg.category || 'Technical',
      date: reg.eventDate || 'Date TBD',
      time: reg.eventTime || '',
      venue: reg.eventVenue || '',
      image: reg.eventImage || '',
      imageUrl: reg.eventImage || '',
      description: reg.eventDescription || `${reg.eventTitle} campus event.`,
      status: reg.eventStatus || 'Open',
      feeAmount: reg.payment?.amount || reg.feeAmount || 0,
      feeType: reg.feeType || 'free'
    };
  };

  // Open event details handler: strictly opens in registered context with pass and registration records
  const handleOpenEventDetails = (reg) => {
    const ev = makeEventFromReg(reg);
    const enriched = {
      ...ev,
      registration: reg,
      isRegistered: true
    };
    setSelectedEventForDetails(enriched);
  };

  // Metrics dynamically calculated from actual registration records
  const metrics = useMemo(() => {
    const total = registrations.length;
    let upcoming = 0;
    let completed = 0;
    let checkedIn = 0;

    for (const reg of registrations) {
      if (reg.status === 'cancelled' || reg.pass?.status === 'Cancelled — Pass Expired') {
        continue;
      }
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

  // Filtered registrations for the Registrations tab
  const filteredRegistrations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return registrations.filter((reg) => {
      // Status tab match
      const upcoming = isEventUpcoming(reg.eventDate);
      const isCancelled = reg.status === 'cancelled' || reg.pass?.status === 'Cancelled — Pass Expired';
      let matchesTab = true;
      if (statusFilter === 'UPCOMING') matchesTab = upcoming && !isCancelled;
      if (statusFilter === 'COMPLETED') matchesTab = !upcoming && !isCancelled;

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

  // Chronological upcoming schedule for "My Schedule" (ascending: earliest upcoming first)
  const upcomingSchedule = useMemo(() => {
    return registrations
      .filter((r) => r.status !== 'cancelled' && isEventUpcoming(r.eventDate))
      .sort((a, b) => {
        const timeA = a.eventDate && !isNaN(new Date(a.eventDate).getTime())
          ? new Date(a.eventDate).getTime()
          : Infinity;
        const timeB = b.eventDate && !isNaN(new Date(b.eventDate).getTime())
          ? new Date(b.eventDate).getTime()
          : Infinity;
        return timeA - timeB;
      });
  }, [registrations]);

  // Past registrations for "My Schedule" (descending: most recent first)
  const pastSchedule = useMemo(() => {
    return registrations
      .filter((r) => r.status !== 'cancelled' && !isEventUpcoming(r.eventDate))
      .sort((a, b) => {
        const timeA = a.eventDate && !isNaN(new Date(a.eventDate).getTime())
          ? new Date(a.eventDate).getTime()
          : 0;
        const timeB = b.eventDate && !isNaN(new Date(b.eventDate).getTime())
          ? new Date(b.eventDate).getTime()
          : 0;
        return timeB - timeA;
      });
  }, [registrations]);

  // Next Upcoming Event is the earliest upcoming registered event
  const nextUpcomingEvent = upcomingSchedule.length > 0 ? upcomingSchedule[0] : null;

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
              Welcome back, <span className="text-gradient">{user.fullName ? user.fullName.split(' ')[0] : 'Student'}</span>!
            </h1>
            <div className="dashboard-profile-meta">
              <span className="profile-meta-item">
                <GraduationCap size={15} />
                <span>{user.programme || 'B.Tech'} · {user.branch || 'KIIT University'}</span>
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

        {/* Mobile Horizontal Tab Navigation (< 900px) */}
        <nav className="dashboard-mobile-nav" aria-label="Dashboard mobile navigation">
          {DASHBOARD_TABS.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeSection === tab.id;
            let badgeValue = null;
            if (tab.id === 'registrations') badgeValue = registrations.length;
            if (tab.id === 'schedule' && metrics.upcoming > 0) badgeValue = metrics.upcoming;
            if (tab.id === 'certificates' && certificates.length > 0) badgeValue = certificates.length;
            if (tab.id === 'waitlist') {
              if (activeSeatOffers.length > 0) badgeValue = activeSeatOffers.length;
              else if (activeWaitingEntries.length > 0) badgeValue = activeWaitingEntries.length;
            }

            return (
              <button
                key={tab.id}
                type="button"
                className={`dash-mobile-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
                aria-selected={isActive}
              >
                <IconComponent size={16} />
                <span>{tab.label}</span>
                {badgeValue !== null && (
                  <span className="mobile-tab-badge">{badgeValue}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Main Dashboard Workspace Body: Sidebar + Workspace */}
        <div className="dashboard-layout-body">
          {/* Desktop Compact Vertical Sidebar */}
          <aside className="dashboard-sidebar-nav" aria-label="Student portal navigation">
            <div className="dash-sidebar-header">
              <span className="sidebar-header-label">Portal Navigation</span>
            </div>
            <div className="dash-sidebar-menu">
              {DASHBOARD_TABS.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeSection === tab.id;
                let badgeValue = null;
                if (tab.id === 'registrations') badgeValue = registrations.length;
                if (tab.id === 'schedule' && metrics.upcoming > 0) badgeValue = metrics.upcoming;
                if (tab.id === 'certificates' && certificates.length > 0) badgeValue = certificates.length;
                if (tab.id === 'waitlist') {
                  if (activeSeatOffers.length > 0) badgeValue = activeSeatOffers.length;
                  else if (activeWaitingEntries.length > 0) badgeValue = activeWaitingEntries.length;
                }

                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`dash-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleTabChange(tab.id)}
                    aria-selected={isActive}
                  >
                    <span className="nav-item-left">
                      <IconComponent size={18} className="nav-item-icon" />
                      <span className="nav-item-text">{tab.label}</span>
                    </span>
                    {badgeValue !== null && (
                      <span className="dash-nav-badge">{badgeValue}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Link Card at bottom of sidebar */}
            <div className="dash-sidebar-footer-card">
              <span className="sidebar-card-title">Explore Events</span>
              <p className="sidebar-card-desc">Find hackathons, fests & workshops happening this week.</p>
              <Link to="/events" className="sidebar-card-link">
                <span>Campus Catalogue</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </aside>

          {/* Main Dashboard Content Area */}
          <main className="dashboard-main-content">
            {/* ========================================================
               SECTION 1: OVERVIEW
               ======================================================== */}
            {activeSection === 'overview' && (
              <div className="dashboard-section-view overview-view">
                {/* Urgent Seat Offer Alert Banner */}
                {activeSeatOffers.length > 0 && (
                  <div className="seat-offer-urgent-banner">
                    <div className="seat-offer-banner-icon">
                      <Clock size={22} />
                    </div>
                    <div className="seat-offer-banner-content">
                      <div className="seat-offer-banner-badge">
                        <span className="amber-pulse" />
                        <span>Action Required · Seat Offer Available ({activeSeatOffers.length})</span>
                      </div>
                      <h3 className="seat-offer-banner-title">
                        {activeSeatOffers[0].eventTitle}
                      </h3>
                      <p className="seat-offer-banner-meta">
                        A seat has become available! Response window expires in{' '}
                        <strong>{formatRemainingTime(activeSeatOffers[0].offerExpiresAt)}</strong>.
                      </p>
                    </div>
                    <div className="seat-offer-banner-actions">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleTabChange('waitlist')}
                        icon={<ArrowRight size={14} />}
                        iconPosition="right"
                      >
                        Claim Seat
                      </Button>
                    </div>
                  </div>
                )}

                {/* Dynamic Metric KPIs */}
                <section className="dashboard-metrics-section" aria-label="Participation Statistics">
                  <div className="dashboard-metrics-grid">
                    <div className="dash-metric-card" onClick={() => handleTabChange('registrations')} role="button" tabIndex={0}>
                      <div className="metric-icon-box cat-tech">
                        <Ticket size={22} />
                      </div>
                      <div className="dash-metric-content">
                        <span className="metric-num">{metrics.total}</span>
                        <span className="metric-label">Registered Events</span>
                        <span className="metric-sub">Across campus fests</span>
                      </div>
                    </div>

                    <div className="dash-metric-card" onClick={() => handleTabChange('schedule')} role="button" tabIndex={0}>
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

                {/* Next Upcoming Event Spotlight Hero */}
                <section className="dashboard-spotlight-section">
                  <div className="spotlight-section-header">
                    <div className="spotlight-title-group">
                      <span className="section-tag">Next Milestone</span>
                      <h2 className="dash-sub-title">Next Upcoming Event</h2>
                    </div>
                    {nextUpcomingEvent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<ChevronRight size={15} />}
                        iconPosition="right"
                        onClick={() => handleTabChange('schedule')}
                      >
                        View Full Schedule
                      </Button>
                    )}
                  </div>

                  {nextUpcomingEvent ? (
                    <div className="next-event-spotlight-card">
                      <div className="spotlight-card-banner">
                        {nextUpcomingEvent.eventImage ? (
                          <img
                            src={nextUpcomingEvent.eventImage}
                            alt={nextUpcomingEvent.eventTitle}
                            className="spotlight-img"
                          />
                        ) : (
                          <div className="spotlight-placeholder" />
                        )}
                        <div className="spotlight-badge-overlay">
                          <span className="spotlight-live-pill">
                            <span className="green-pulse" />
                            <span>Up Next</span>
                          </span>
                          <span className="spotlight-cat-pill">
                            {nextUpcomingEvent.eventCategory || nextUpcomingEvent.category || 'Campus Event'}
                          </span>
                        </div>
                      </div>

                      <div className="spotlight-card-body">
                        <h3 className="spotlight-event-title">{nextUpcomingEvent.eventTitle}</h3>

                        <div className="spotlight-meta-grid">
                          <div className="spotlight-meta-item">
                            <Calendar size={15} className="meta-icon" />
                            <span>{nextUpcomingEvent.eventDate || 'Date TBD'}</span>
                          </div>
                          {nextUpcomingEvent.eventTime && (
                            <div className="spotlight-meta-item">
                              <Clock size={15} className="meta-icon" />
                              <span>{nextUpcomingEvent.eventTime}</span>
                            </div>
                          )}
                          {nextUpcomingEvent.eventVenue && (
                            <div className="spotlight-meta-item">
                              <MapPin size={15} className="meta-icon" />
                              <span className="venue-text">{nextUpcomingEvent.eventVenue}</span>
                            </div>
                          )}
                        </div>

                        <div className="spotlight-footer-row">
                          <div className="spotlight-pass-pill">
                            <Ticket size={13} />
                            <code>{nextUpcomingEvent.pass?.passId || nextUpcomingEvent.id}</code>
                          </div>

                          <div className="spotlight-actions-group">
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Info size={14} />}
                              onClick={() => handleOpenEventDetails(nextUpcomingEvent)}
                            >
                              Event Details
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Ticket size={15} />}
                              onClick={() => setSelectedRegForPass(nextUpcomingEvent)}
                            >
                              Digital Pass & QR
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="spotlight-empty-card">
                      <div className="spotlight-empty-icon">
                        <CalendarCheck size={32} />
                      </div>
                      <div className="spotlight-empty-info">
                        <h4>No Upcoming Events Scheduled</h4>
                        <p>You have no pending registered events. Browse upcoming campus fests, hackathons, and technical workshops to reserve your seat.</p>
                      </div>
                      <Link to="/events">
                        <Button variant="primary" size="sm" icon={<ArrowRight size={15} />}>
                          Explore Events
                        </Button>
                      </Link>
                    </div>
                  )}
                </section>

                {/* Important Dates Compact Preview */}
                <section className="dashboard-agenda-preview-section">
                  <div className="agenda-preview-header">
                    <div>
                      <span className="section-tag">Chronological Agenda</span>
                      <h2 className="dash-sub-title">My Important Dates Preview</h2>
                    </div>
                    <div className="agenda-preview-actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTabChange('schedule')}
                        icon={<ChevronRight size={14} />}
                        iconPosition="right"
                      >
                        All Dates ({upcomingSchedule.length})
                      </Button>
                    </div>
                  </div>

                  {upcomingSchedule.length === 0 ? (
                    <div className="preview-empty-box">
                      <CalendarDays size={28} className="empty-cal-icon" />
                      <p>No upcoming important dates on your schedule. Register for events to build your campus agenda.</p>
                      <Link to="/events">
                        <Button variant="outline" size="sm">Browse Directory</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="agenda-preview-list">
                      {upcomingSchedule.slice(0, 3).map((reg) => {
                        const dateParts = parseDateInfo(reg.eventDate);
                        const isNext = nextUpcomingEvent && nextUpcomingEvent.id === reg.id;

                        return (
                          <div
                            key={reg.id}
                            className={`agenda-preview-row ${isNext ? 'is-next-row' : ''}`}
                            onClick={() => handleOpenEventDetails(reg)}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="agenda-mini-date-badge">
                              <span className="mini-month">{dateParts.month}</span>
                              <span className="mini-day">{dateParts.day}</span>
                            </div>

                            <div className="agenda-preview-details">
                              <div className="agenda-preview-title-row">
                                <h4 className="agenda-preview-title">{reg.eventTitle}</h4>
                                {isNext && <span className="mini-next-pill">Up Next</span>}
                              </div>
                              <div className="agenda-preview-meta-row">
                                {reg.eventTime && (
                                  <span className="mini-meta">
                                    <Clock size={12} />
                                    <span>{reg.eventTime}</span>
                                  </span>
                                )}
                                {reg.eventVenue && (
                                  <span className="mini-meta">
                                    <MapPin size={12} />
                                    <span>{reg.eventVenue}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="agenda-preview-actions">
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<Ticket size={14} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRegForPass(reg);
                                }}
                              >
                                Pass
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Quick Section Switchers Footer */}
                  <div className="overview-quick-links-row">
                    <button
                      type="button"
                      className="overview-quick-link-btn"
                      onClick={() => handleTabChange('registrations')}
                    >
                      <Ticket size={16} />
                      <span>View All Registrations ({registrations.length})</span>
                      <ArrowRight size={14} />
                    </button>
                    <button
                      type="button"
                      className="overview-quick-link-btn"
                      onClick={() => handleTabChange('schedule')}
                    >
                      <Calendar size={16} />
                      <span>Open Full Important Dates Agenda</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </section>
              </div>
            )}

            {/* ========================================================
               SECTION 2: REGISTRATIONS (Full Registered Event Cards)
               ======================================================== */}
            {activeSection === 'registrations' && (
              <div className="dashboard-section-view registrations-view">
                <section className="dashboard-events-section">
                  <div className="dash-section-header">
                    <div>
                      <span className="section-tag">Registered Event Passes</span>
                      <h2 className="dash-section-title">My Registered Events</h2>
                      <p className="dash-section-desc">
                        Select any event below to access your scannable digital admission pass and venue details.
                      </p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="dash-filter-tabs" role="tablist" aria-label="Registration status filters">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={statusFilter === 'ALL'}
                        className={`dash-tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('ALL')}
                      >
                        All ({registrations.length})
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={statusFilter === 'UPCOMING'}
                        className={`dash-tab-btn ${statusFilter === 'UPCOMING' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('UPCOMING')}
                      >
                        Upcoming ({metrics.upcoming})
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={statusFilter === 'COMPLETED'}
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
                          aria-label="Search registered events"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            className="clear-search-btn"
                            onClick={() => setSearchQuery('')}
                            aria-label="Clear search"
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
                        const isCancelled = reg.status === 'cancelled' || pass.status === 'Cancelled — Pass Expired';
                        const isCheckedIn = Boolean(pass.checkedIn || reg.checkedIn);
                        const isUpcoming = isEventUpcoming(reg.eventDate);
                        const isPendingPayment = reg.paymentStatus === 'pending' || reg.status === 'pending_payment';
                        const isFailedPayment = reg.paymentStatus === 'failed';
                        const feeAmount = reg.payment?.amount || reg.feeAmount || 0;

                        return (
                          <div key={reg.id} className="reg-event-card">
                            {/* Event Banner */}
                            <div
                              className="reg-card-banner clickable-banner"
                              onClick={() => handleOpenEventDetails(reg)}
                              role="button"
                              tabIndex={0}
                              aria-label={`View details for ${reg.eventTitle}`}
                            >
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
                              <h3
                                className="reg-event-title clickable-title"
                                onClick={() => handleOpenEventDetails(reg)}
                                role="button"
                                tabIndex={0}
                              >
                                {reg.eventTitle}
                              </h3>

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
                                  <code>{pass.passId || (isCancelled ? 'CANCELLED' : isPendingPayment ? 'PENDING' : reg.id)}</code>
                                </div>

                                <div className="pass-status-pill-wrap">
                                  {isCancelled ? (
                                    <span className="pass-pill-cancelled">
                                      <XCircle size={13} />
                                      <span>Registration Cancelled</span>
                                    </span>
                                  ) : isPendingPayment ? (
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

                              {/* Action Buttons Row */}
                              <div className="reg-card-actions-row">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon={<Info size={14} />}
                                  onClick={() => handleOpenEventDetails(reg)}
                                  className="details-btn"
                                >
                                  Details
                                </Button>

                                {isCancelled ? (
                                  <div className="pass-cancelled-action-note">
                                    <span>Seat released to waitlist · Pass expired</span>
                                  </div>
                                ) : (
                                  <>
                                    {isUpcoming && !isCheckedIn && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCancelRegistration(reg)}
                                        className="cancel-reg-btn"
                                        title="Cancel registration & release seat to waitlist"
                                      >
                                        Cancel
                                      </Button>
                                    )}

                                    {isPendingPayment || isFailedPayment ? (
                                      <Button
                                        variant="primary"
                                        size="sm"
                                        icon={<CreditCard size={15} />}
                                        onClick={() => setSelectedRegForPayment(reg)}
                                        className="flex-1 pay-now-action-btn"
                                      >
                                        {isFailedPayment ? 'Retry Payment' : 'Complete Payment'} (₹{feeAmount.toLocaleString('en-IN')})
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="primary"
                                        size="sm"
                                        icon={<Ticket size={15} />}
                                        onClick={() => setSelectedRegForPass(reg)}
                                        className="flex-1"
                                      >
                                        View Digital Pass & QR
                                      </Button>
                                    )}
                                  </>
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
            )}

            {/* ========================================================
               SECTION 3: MY SCHEDULE — MY IMPORTANT DATES (Agenda View)
               ======================================================== */}
            {activeSection === 'schedule' && (
              <div className="dashboard-section-view schedule-view">
                <div className="dash-section-header">
                  <div>
                    <span className="section-tag">Chronological Fest Milestones</span>
                    <h2 className="dash-section-title">My Important Dates</h2>
                    <p className="dash-section-desc">
                      An agenda-style chronological roadmap of dates, venues, and timings for your confirmed event registrations.
                    </p>
                  </div>
                  <div className="schedule-header-actions">
                    <Link to="/events">
                      <Button variant="outline" size="sm" icon={<PlusCircle size={14} />}>
                        Add Events
                      </Button>
                    </Link>
                  </div>
                </div>

                {registrations.length === 0 ? (
                  <div className="dash-empty-card">
                    <div className="empty-icon-circle">
                      <CalendarDays size={40} className="empty-icon" />
                    </div>
                    <h3 className="empty-title">No Scheduled Event Dates</h3>
                    <p className="empty-desc">
                      You haven't registered for any events yet. When you register for hackathons, cultural performances, or workshops, your complete event schedule will be tracked here chronologically.
                    </p>
                    <div className="empty-actions">
                      <Link to="/events">
                        <Button variant="primary" size="md" icon={<ArrowRight size={16} />}>
                          Explore Events Catalogue
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="schedule-agenda-container">
                    {/* UPCOMING EVENTS SUBSECTION */}
                    <div className="agenda-block">
                      <div className="agenda-block-header">
                        <span className="agenda-block-tag upcoming-tag">
                          <span className="green-pulse" />
                          <span>Upcoming Events</span>
                        </span>
                        <span className="agenda-block-count">{upcomingSchedule.length} upcoming</span>
                      </div>

                      {upcomingSchedule.length === 0 ? (
                        <div className="agenda-empty-sub">
                          <p>You have no pending upcoming events. Browse the directory to register for new events.</p>
                        </div>
                      ) : (
                        <div className="agenda-items-list">
                          {upcomingSchedule.map((reg, index) => {
                            const dateParts = parseDateInfo(reg.eventDate);
                            const isNext = index === 0;
                            const pass = reg.pass || {};
                            const isCheckedIn = Boolean(pass.checkedIn || reg.checkedIn);
                            const isPendingPayment = reg.paymentStatus === 'pending' || reg.status === 'pending_payment';

                            return (
                              <article
                                key={reg.id}
                                className={`agenda-item-card ${isNext ? 'agenda-item-next' : ''}`}
                              >
                                {/* Left: Date Block */}
                                <div className="agenda-date-block">
                                  <span className="agenda-month">{dateParts.month}</span>
                                  <span className="agenda-day">{dateParts.day}</span>
                                  <span className="agenda-weekday">{dateParts.weekday}</span>
                                  {dateParts.year && <span className="agenda-year">{dateParts.year}</span>}
                                </div>

                                {/* Center: Event Details */}
                                <div className="agenda-item-details">
                                  <div className="agenda-item-header">
                                    <div className="agenda-title-wrap">
                                      <h3
                                        className="agenda-item-title clickable-title"
                                        onClick={() => handleOpenEventDetails(reg)}
                                        role="button"
                                        tabIndex={0}
                                      >
                                        {reg.eventTitle}
                                      </h3>
                                      {isNext && (
                                        <span className="agenda-next-badge">
                                          <Sparkles size={12} />
                                          <span>Next Event</span>
                                        </span>
                                      )}
                                    </div>
                                    <span className="agenda-cat-badge">
                                      {reg.eventCategory || reg.category || 'Event'}
                                    </span>
                                  </div>

                                  <div className="agenda-meta-row">
                                    {reg.eventTime && (
                                      <div className="agenda-meta-pill">
                                        <Clock size={13} className="meta-icon" />
                                        <span>{reg.eventTime}</span>
                                      </div>
                                    )}
                                    {reg.eventVenue && (
                                      <div className="agenda-meta-pill">
                                        <MapPin size={13} className="meta-icon" />
                                        <span className="venue-text">{reg.eventVenue}</span>
                                      </div>
                                    )}
                                    <div className="agenda-meta-pill pass-pill-meta">
                                      <Ticket size={13} className="meta-icon" />
                                      <code>{pass.passId || reg.id}</code>
                                    </div>
                                  </div>

                                  <div className="agenda-status-row">
                                    {isPendingPayment ? (
                                      <span className="pass-pill-pending">
                                        <Clock size={12} />
                                        <span>Payment Pending</span>
                                      </span>
                                    ) : isCheckedIn ? (
                                      <span className="pass-pill-checked-in">
                                        <CheckCircle2 size={12} />
                                        <span>Admitted & Verified</span>
                                      </span>
                                    ) : (
                                      <span className="pass-pill-valid">
                                        <span className="green-pulse" />
                                        <span>Confirmed Entry</span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Right: Action CTAs */}
                                <div className="agenda-item-actions">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={<Info size={14} />}
                                    onClick={() => handleOpenEventDetails(reg)}
                                  >
                                    Details
                                  </Button>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    icon={<Ticket size={15} />}
                                    onClick={() => setSelectedRegForPass(reg)}
                                  >
                                    View Pass & QR
                                  </Button>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* PAST PARTICIPATIONS SUBSECTION */}
                    {pastSchedule.length > 0 && (
                      <div className="agenda-block past-block">
                        <div className="agenda-block-header">
                          <span className="agenda-block-tag past-tag">
                            <CheckCircle2 size={14} />
                            <span>Past Participations</span>
                          </span>
                          <span className="agenda-block-count">{pastSchedule.length} completed</span>
                        </div>

                        <div className="agenda-items-list">
                          {pastSchedule.map((reg) => {
                            const dateParts = parseDateInfo(reg.eventDate);
                            const pass = reg.pass || {};

                            return (
                              <article key={reg.id} className="agenda-item-card agenda-item-past">
                                <div className="agenda-date-block past-date-block">
                                  <span className="agenda-month">{dateParts.month}</span>
                                  <span className="agenda-day">{dateParts.day}</span>
                                  <span className="agenda-weekday">{dateParts.weekday}</span>
                                </div>

                                <div className="agenda-item-details">
                                  <div className="agenda-item-header">
                                    <h3
                                      className="agenda-item-title clickable-title"
                                      onClick={() => handleOpenEventDetails(reg)}
                                      role="button"
                                      tabIndex={0}
                                    >
                                      {reg.eventTitle}
                                    </h3>
                                    <span className="agenda-cat-badge">
                                      {reg.eventCategory || reg.category || 'Event'}
                                    </span>
                                  </div>

                                  <div className="agenda-meta-row">
                                    {reg.eventTime && (
                                      <div className="agenda-meta-pill">
                                        <Clock size={13} className="meta-icon" />
                                        <span>{reg.eventTime}</span>
                                      </div>
                                    )}
                                    {reg.eventVenue && (
                                      <div className="agenda-meta-pill">
                                        <MapPin size={13} className="meta-icon" />
                                        <span>{reg.eventVenue}</span>
                                      </div>
                                    )}
                                    <div className="agenda-meta-pill pass-pill-meta">
                                      <code>{pass.passId || reg.id}</code>
                                    </div>
                                  </div>

                                  <div className="agenda-status-row">
                                    <span className="pass-pill-completed">
                                      <span>Event Concluded</span>
                                    </span>
                                  </div>
                                </div>

                                <div className="agenda-item-actions">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    icon={<Info size={14} />}
                                    onClick={() => handleOpenEventDetails(reg)}
                                  >
                                    Details
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={<Ticket size={14} />}
                                    onClick={() => setSelectedRegForPass(reg)}
                                  >
                                    Archived Pass
                                  </Button>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================
               SECTION 4: CERTIFICATES
               ======================================================== */}
            {activeSection === 'certificates' && (
              <div className="dashboard-section-view certificates-view">
                <div className="dash-section-header">
                  <div className="section-title-group">
                    <span className="section-tag">Verified Credentials</span>
                    <h2 className="dash-sub-title">My Digital Certificates</h2>
                    <p className="dash-sub-desc">
                      Official credentials conferred for event participation, workshops, and competitions. Fully verified with cryptographic tamper-evident signatures.
                    </p>
                  </div>
                  <div className="section-header-actions">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<RefreshCw size={14} />}
                      onClick={loadCertificates}
                      disabled={loadingCertificates}
                    >
                      Refresh
                    </Button>
                  </div>
                </div>

                {loadingCertificates ? (
                  <div className="dash-loading-card">
                    <div className="dash-spinner" />
                    <p>Loading your verified certificates...</p>
                  </div>
                ) : certificates.length === 0 ? (
                  <div className="empty-certificates-card">
                    <div className="empty-icon-circle">
                      <Award size={40} />
                    </div>
                    <h3>No Certificates Conferred Yet</h3>
                    <p>
                      Official certificates are issued and published by event convenors after verified attendance at campus events. Once validated, your signed certificates will appear here ready for portfolio download and verification.
                    </p>
                    <div className="cert-info-chips">
                      <div className="info-chip">
                        <ShieldCheck size={16} />
                        <span>Requires verified QR check-in or authorized faculty waiver</span>
                      </div>
                      <div className="info-chip">
                        <FileCheck2 size={16} />
                        <span>Official PDF export for portfolios and credential verification</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="certificates-grid">
                    {certificates.map((cert) => {
                      const isPublished = cert.status === 'PUBLISHED';
                      const isRevoked = cert.status === 'REVOKED';

                      return (
                        <div key={cert.id} className={`student-cert-card ${isRevoked ? 'cert-revoked' : 'cert-valid'}`}>
                          <div className="student-cert-header">
                            <span className="cert-tag-pill">
                              <Sparkles size={12} />
                              <span>Participation Credential</span>
                            </span>
                            {isPublished ? (
                              <Badge variant="success">Published & Verified</Badge>
                            ) : isRevoked ? (
                              <Badge variant="danger">Revoked</Badge>
                            ) : (
                              <Badge variant="warning">Draft (Pending Release)</Badge>
                            )}
                          </div>

                          <div className="student-cert-body">
                            <h3 className="student-cert-title">{cert.eventName}</h3>
                            <div className="student-cert-meta">
                              <span className="meta-item">
                                <Calendar size={14} />
                                <span>{cert.eventDate}</span>
                              </span>
                              <span className="meta-item">
                                <Award size={14} />
                                <span>Issued {new Date(cert.issueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </span>
                            </div>

                            <div className="student-cert-authority">
                              <span className="auth-label">Issuing Authority:</span>
                              <span className="auth-value">{cert.issuingAuthority}</span>
                            </div>

                            <div className="student-cert-id-bar">
                              <span className="id-label">Certificate ID:</span>
                              <code className="id-val">{cert.id}</code>
                              <button
                                type="button"
                                className="copy-cert-id-btn"
                                onClick={() => {
                                  navigator.clipboard.writeText(cert.id);
                                  toast.success(`Copied Certificate ID: ${cert.id}`);
                                }}
                                title="Copy ID"
                              >
                                <Copy size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="student-cert-footer">
                            {isPublished ? (
                              <div className="student-cert-actions">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  icon={<Download size={14} />}
                                  onClick={() => downloadCertificatePdf(cert.id)}
                                >
                                  Download PDF
                                </Button>
                                <Link
                                  to={`/verify-certificate/${cert.id}`}
                                  className="festiq-btn btn-sm btn-secondary cert-verify-link"
                                >
                                  <ExternalLink size={14} />
                                  <span>Verify Publicly</span>
                                </Link>
                              </div>
                            ) : isRevoked ? (
                              <span className="revoked-explain">
                                Revoked: {cert.revocationReason || 'Administrative cancellation'}
                              </span>
                            ) : (
                              <span className="draft-explain">
                                Awaiting convenor publication before download unlocks
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================
               SECTION 5: WAITLIST & SEAT ALLOCATION
               ======================================================== */}
            {activeSection === 'waitlist' && (
              <div className="dashboard-section-view waitlist-view">
                <div className="dash-section-header">
                  <div className="section-title-group">
                    <span className="section-tag">Queue & Seat Allocation</span>
                    <h2 className="dash-sub-title">Smart Waitlist Management</h2>
                    <p className="dash-sub-desc">
                      Track your queue rank for high-demand campus events and claim automatically offered seats before deadlines expire.
                    </p>
                  </div>
                  <div className="section-header-actions">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<RefreshCw size={14} />}
                      onClick={loadWaitlist}
                      disabled={loadingWaitlist}
                    >
                      Refresh Status
                    </Button>
                  </div>
                </div>

                {loadingWaitlist ? (
                  <div className="waitlist-loading-state" style={{ padding: '40px 0', textAlign: 'center' }}>
                    <div className="dashboard-spinner" />
                    <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Checking waitlist reservations...</p>
                  </div>
                ) : waitlistEntries.length === 0 ? (
                  <div className="feature-placeholder-card">
                    <div className="feature-icon-wrapper waitlist-icon-box">
                      <Clock size={44} />
                    </div>
                    <span className="feature-status-pill">
                      <CheckCircle2 size={13} />
                      <span>All Queues Clear</span>
                    </span>
                    <h3 className="feature-placeholder-title">No Active Waitlist Entries</h3>
                    <p className="feature-placeholder-desc">
                      You are not currently waiting for seats in any campus events. When high-demand workshops, hackathons, or competitions reach full capacity, you can join their waitlist with a single tap.
                    </p>
                    <div className="feature-action-btn">
                      <Link to="/events">
                        <Button variant="primary" size="md" icon={<ArrowRight size={15} />} iconPosition="right">
                          Browse Campus Events
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="waitlist-sections-container">
                    {/* 1. Seat Offers Available (Urgent Actions) */}
                    {activeSeatOffers.length > 0 && (
                      <div className="waitlist-group-section">
                        <div className="waitlist-group-header">
                          <span className="amber-pulse" />
                          <h3 className="waitlist-group-title">
                            Seat Offers Available ({activeSeatOffers.length})
                          </h3>
                        </div>
                        <div className="waitlist-cards-grid">
                          {activeSeatOffers.map((entry) => {
                            const isProcessing = waitlistActionId === entry.id;
                            const isPaid = entry.requiresPayment || (entry.feeAmount && entry.feeAmount > 0);
                            return (
                              <div key={entry.id} className="waitlist-card waitlist-card-offered">
                                <div className="waitlist-card-top-row">
                                  <span className="waitlist-offered-badge">
                                    <Sparkles size={13} />
                                    <span>Seat Available for You</span>
                                  </span>
                                  <span className="waitlist-timer-pill">
                                    <Clock size={13} />
                                    <span>Expires in: {formatRemainingTime(entry.offerExpiresAt)}</span>
                                  </span>
                                </div>

                                <div className="waitlist-card-content">
                                  <h4 className="waitlist-event-title">{entry.eventTitle}</h4>
                                  <div className="waitlist-event-meta">
                                    <span className="waitlist-meta-item">
                                      <Calendar size={14} />
                                      <span>{entry.eventDate || 'Date TBD'}</span>
                                    </span>
                                    {entry.eventVenue && (
                                      <span className="waitlist-meta-item">
                                        <MapPin size={14} />
                                        <span>{entry.eventVenue}</span>
                                      </span>
                                    )}
                                    <span className="waitlist-meta-item">
                                      <Ticket size={14} />
                                      <span>{isPaid ? `Paid Event (₹${entry.feeAmount || 0})` : 'Free Admission'}</span>
                                    </span>
                                  </div>
                                </div>

                                <div className="waitlist-actions-bar">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeclineOffer(entry)}
                                    disabled={isProcessing}
                                  >
                                    Decline Offer
                                  </Button>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    icon={<CheckCircle2 size={15} />}
                                    onClick={() => handleAcceptOffer(entry)}
                                    disabled={isProcessing}
                                  >
                                    {isProcessing ? 'Claiming...' : (isPaid ? 'Accept & Proceed to Pay' : 'Accept & Claim Pass')}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 2. Active Waiting Queue */}
                    {activeWaitingEntries.length > 0 && (
                      <div className="waitlist-group-section">
                        <div className="waitlist-group-header">
                          <Clock size={18} />
                          <h3 className="waitlist-group-title">
                            In Waiting Queue ({activeWaitingEntries.length})
                          </h3>
                        </div>
                        <div className="waitlist-cards-grid">
                          {activeWaitingEntries.map((entry) => {
                            const isProcessing = waitlistActionId === entry.id;
                            return (
                              <div key={entry.id} className="waitlist-card">
                                <div className="waitlist-card-top-row">
                                  <span className="queue-rank-badge">
                                    Queue Position #{entry.queueRank || entry.queuePosition || 1}
                                  </span>
                                  <span className="queue-status-pill">
                                    <span className="amber-pulse" />
                                    <span>FIFO Queue Active</span>
                                  </span>
                                </div>

                                <div className="waitlist-card-content">
                                  <h4 className="waitlist-event-title">{entry.eventTitle}</h4>
                                  <div className="waitlist-event-meta">
                                    <span className="waitlist-meta-item">
                                      <Calendar size={14} />
                                      <span>{entry.eventDate || 'Date TBD'}</span>
                                    </span>
                                    {entry.eventVenue && (
                                      <span className="waitlist-meta-item">
                                        <MapPin size={14} />
                                        <span>{entry.eventVenue}</span>
                                      </span>
                                    )}
                                    <span className="waitlist-meta-item">
                                      <Clock size={14} />
                                      <span>Joined {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </span>
                                  </div>
                                </div>

                                <div className="waitlist-actions-bar">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleWithdrawWaitlist(entry)}
                                    disabled={isProcessing}
                                    className="cancel-reg-btn"
                                  >
                                    Withdraw from Waitlist
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 3. Waitlist History */}
                    {pastWaitlistEntries.length > 0 && (
                      <div className="waitlist-group-section">
                        <div className="waitlist-group-header">
                          <FileCheck2 size={18} />
                          <h3 className="waitlist-group-title">Waitlist Activity History</h3>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table className="waitlist-history-table">
                            <thead>
                              <tr>
                                <th>Event</th>
                                <th>Joined On</th>
                                <th>Status</th>
                                <th>Resolved On</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pastWaitlistEntries.map((item) => (
                                <tr key={item.id}>
                                  <td style={{ fontWeight: 600 }}>{item.eventTitle}</td>
                                  <td>{new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                  <td>
                                    <Badge
                                      variant={
                                        item.status === 'CONVERTED' || item.status === 'ACCEPTED'
                                          ? 'success'
                                          : item.status === 'EXPIRED'
                                          ? 'warning'
                                          : 'default'
                                      }
                                    >
                                      {item.status}
                                    </Badge>
                                  </td>
                                  <td>
                                    {item.updatedAt
                                      ? new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                      : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Digital Event Pass Modal (Existing Component Preserved) */}
      <DigitalPassModal
        isOpen={Boolean(selectedRegForPass)}
        registration={selectedRegForPass}
        onClose={() => setSelectedRegForPass(null)}
      />

      {/* Payment Checkout Modal (Existing Component Preserved) */}
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

      {/* Claim Guest Pass Modal (Existing Component Preserved) */}
      <ClaimPassModal
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        onPassClaimed={handlePassClaimed}
      />

      {/* Event Details Modal in Registered Context — Strictly no duplicate registration CTA */}
      <EventDetailsModal
        isOpen={Boolean(selectedEventForDetails)}
        event={selectedEventForDetails}
        registration={selectedEventForDetails?.registration}
        isRegistered={true}
        onClose={() => setSelectedEventForDetails(null)}
        onViewPass={(reg) => {
          const target = reg || selectedEventForDetails?.registration;
          setSelectedEventForDetails(null);
          if (target) setSelectedRegForPass(target);
        }}
        onCancelRegistration={(reg) => {
          const target = reg || selectedEventForDetails?.registration;
          setSelectedEventForDetails(null);
          if (target) handleCancelRegistration(target);
        }}
      />

      {/* Cancel Registration Confirmation Modal */}
      {cancellingRegistration && (
        <div
          className="cancel-confirm-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
          onClick={() => !cancelLoading && setCancellingRegistration(null)}
        >
          <div className="cancel-confirm-card modal-card-entrance" onClick={(e) => e.stopPropagation()}>
            <div className="cancel-confirm-header">
              <div className="cancel-warning-icon-wrap">
                <AlertTriangle size={24} className="cancel-warning-icon" />
              </div>
              <div className="cancel-header-text">
                <h3 id="cancel-modal-title" className="cancel-confirm-title">Cancel Event Registration?</h3>
                <p className="cancel-confirm-subtitle">{cancellingRegistration.eventTitle}</p>
              </div>
              <button
                type="button"
                className="cancel-modal-close"
                onClick={() => setCancellingRegistration(null)}
                disabled={cancelLoading}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="cancel-confirm-body">
              <p className="cancel-confirm-intro">
                Please review the following cancellation terms before confirming:
              </p>

              <div className="cancel-policies-list">
                <div className="cancel-policy-item">
                  <div className="cancel-policy-dot">1</div>
                  <div className="cancel-policy-content">
                    <strong>Permanent Registration Cancellation:</strong>
                    <p>Your registration record will be marked as cancelled immediately and cannot be reactivated.</p>
                  </div>
                </div>

                <div className="cancel-policy-item">
                  <div className="cancel-policy-dot">2</div>
                  <div className="cancel-policy-content">
                    <strong>FIFO Waitlist Reallocation:</strong>
                    <p>Your reserved seat is immediately released and offered to the next eligible student in the FIFO waitlist queue.</p>
                  </div>
                </div>

                <div className="cancel-policy-item">
                  <div className="cancel-policy-dot">3</div>
                  <div className="cancel-policy-content">
                    <strong>Pass & QR Invalidation:</strong>
                    <p>Your digital event pass, pass token, and venue check-in QR code become permanently invalid and expired.</p>
                  </div>
                </div>

                <div className="cancel-policy-item">
                  <div className="cancel-policy-dot">4</div>
                  <div className="cancel-policy-content">
                    <strong>No Automatic Refund:</strong>
                    <p>Cancellation releases your seat and expires your digital pass. This cancellation does not issue an automatic refund. Existing payment records remain preserved.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="cancel-confirm-footer">
              <Button
                variant="secondary"
                size="md"
                type="button"
                onClick={() => setCancellingRegistration(null)}
                disabled={cancelLoading}
              >
                Keep My Registration
              </Button>
              <Button
                variant="destructive"
                size="md"
                type="button"
                className="cancel-action-confirm-btn"
                onClick={confirmCancelRegistration}
                disabled={cancelLoading}
                icon={cancelLoading ? <RefreshCw size={14} className="spin-icon" /> : <XCircle size={15} />}
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
