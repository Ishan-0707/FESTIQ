import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  Calendar,
  Users,
  Trophy,
  Ticket,
  Search,
  Filter,
  Download,
  PlusCircle,
  AlertCircle,
  RefreshCw,
  ArrowUpDown,
  Lock,
  CheckCircle2,
  Phone,
  Mail,
  ChevronDown,
  FileText,
  FileCheck,
  Clock,
  Sparkles,
  ExternalLink,
  QrCode,
  CreditCard,
  Image as ImageIcon
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import FestiqLogo from '../components/common/FestiqLogo';
import CreateEventModal from '../components/management/CreateEventModal';
import ProposalReviewModal from '../components/management/ProposalReviewModal';
import QRCheckInScanner from '../components/management/QRCheckInScanner';
import EditEventDetailsModal from '../components/management/EditEventDetailsModal';
import GalleryManagementTab from '../components/management/GalleryManagementTab';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  fetchManagementOverview,
  fetchRegistrationsAdmin,
  fetchProposalsAdmin,
  fetchEvents,
  verifyOfflinePaymentAdmin
} from '../services/api';
import './ManagementPage.css';

export default function ManagementPage({ onOpenAuthModal, onEventCreatedParent }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const toast = useToast();

  const [overview, setOverview] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);

  // Section Navigation: 'registrations' | 'proposals'
  const [activeHubSection, setActiveHubSection] = useState('registrations');

  // Proposals State
  const [proposals, setProposals] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [proposalSearchQuery, setProposalSearchQuery] = useState('');
  const [proposalStatusFilter, setProposalStatusFilter] = useState('ALL');
  const [selectedProposalForReview, setSelectedProposalForReview] = useState(null);

  // Table filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventFilter, setSelectedEventFilter] = useState('ALL');
  const [sortField, setSortField] = useState('registeredAt');
  const [sortDirection, setSortDirection] = useState('desc');

  // Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Events & PDF Specs State
  const [eventsList, setEventsList] = useState([]);
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [eventCategoryFilter, setEventCategoryFilter] = useState('ALL');
  const [selectedEventForEdit, setSelectedEventForEdit] = useState(null);

  const isManager = user && (user.role === 'manager' || user.role === 'admin');

  const loadProposals = useCallback(async () => {
    if (!isManager) return;
    setProposalsLoading(true);
    try {
      const res = await fetchProposalsAdmin();
      if (res.success) {
        setProposals(res.data);
      }
    } catch (err) {
      console.error('Failed to load proposals', err);
    } finally {
      setProposalsLoading(false);
    }
  }, [isManager]);

  const loadManagementData = useCallback(async () => {
    if (!isManager) return;
    setLoading(true);
    setError(null);

    try {
      const [ovRes, regRes, propRes, evRes] = await Promise.all([
        fetchManagementOverview(),
        fetchRegistrationsAdmin(),
        fetchProposalsAdmin().catch(() => ({ success: false, data: [] })),
        fetchEvents()
      ]);

      if (ovRes.success) {
        setOverview(ovRes.data);
      } else {
        setError(ovRes.error || 'Failed to load management overview');
      }

      if (regRes.success) {
        setRegistrations(regRes.data);
      }

      if (propRes.success) {
        setProposals(propRes.data);
      }

      if (evRes.success && Array.isArray(evRes.data)) {
        setEventsList(evRes.data);
      }
    } catch (err) {
      setError(err.message || 'Error fetching management data');
    } finally {
      setLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    if (isManager) {
      loadManagementData();
    }
  }, [isManager, loadManagementData]);

  // Unique events present in registrations or overview for filter dropdown
  const eventOptions = useMemo(() => {
    const list = overview?.eventBreakdown || [];
    return list.map((e) => ({ id: e.id, title: e.title }));
  }, [overview]);

  // Filtered and sorted participant registrations
  const filteredRegistrations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return registrations
      .filter((reg) => {
        const matchesEvent =
          selectedEventFilter === 'ALL' || reg.eventId === selectedEventFilter;

        const matchesSearch =
          !query ||
          (reg.participantName || '').toLowerCase().includes(query) ||
          (reg.email || '').toLowerCase().includes(query) ||
          (reg.phone || '').toLowerCase().includes(query) ||
          (reg.rollNumber || '').toLowerCase().includes(query) ||
          (reg.eventTitle || '').toLowerCase().includes(query) ||
          (reg.id || '').toLowerCase().includes(query);

        return matchesEvent && matchesSearch;
      })
      .sort((a, b) => {
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';

        if (sortField === 'registeredAt') {
          valA = new Date(valA).getTime() || 0;
          valB = new Date(valB).getTime() || 0;
        } else {
          valA = String(valA).toLowerCase();
          valB = String(valB).toLowerCase();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [registrations, searchQuery, selectedEventFilter, sortField, sortDirection]);

  // Filtered Proposals
  const filteredProposals = useMemo(() => {
    const query = proposalSearchQuery.trim().toLowerCase();
    return proposals.filter((p) => {
      const matchesStatus =
        proposalStatusFilter === 'ALL' || p.status === proposalStatusFilter;
      const matchesQuery =
        !query ||
        (p.id || '').toLowerCase().includes(query) ||
        (p.event?.title || '').toLowerCase().includes(query) ||
        (p.organizer?.name || '').toLowerCase().includes(query) ||
        (p.organizer?.organization || '').toLowerCase().includes(query) ||
        (p.event?.venue || '').toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [proposals, proposalSearchQuery, proposalStatusFilter]);

  const renderProposalBadge = (status) => {
    switch (status) {
      case 'Submitted':
        return <Badge variant="primary">Submitted</Badge>;
      case 'Under Review':
        return <Badge variant="warning">Under Review</Badge>;
      case 'Awaiting Organizer Information':
        return <Badge variant="danger">Awaiting Info</Badge>;
      case 'Awaiting College Approval':
        return <Badge variant="warning">College Review</Badge>;
      case 'Feasibility Review':
        return <Badge variant="info">Feasibility</Badge>;
      case 'Approved for Publication':
        return <Badge variant="success">Approved</Badge>;
      case 'Published':
        return <Badge variant="success">Published</Badge>;
      case 'Rejected':
        return <Badge variant="neutral">Rejected</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const handleProposalUpdated = (updatedProposal) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === updatedProposal.id ? updatedProposal : p))
    );
    setSelectedProposalForReview(updatedProposal);
  };

  const handleProposalEventPublished = (publishedProposal) => {
    handleProposalUpdated(publishedProposal);
    loadManagementData();
    if (onEventCreatedParent) {
      onEventCreatedParent(publishedProposal);
    }
  };

  // Filtered Events for Specifications Tab
  const filteredEventsList = useMemo(() => {
    const q = eventSearchQuery.trim().toLowerCase();
    return eventsList.filter((ev) => {
      const matchesCat =
        eventCategoryFilter === 'ALL' ||
        (ev.category || '').toLowerCase() === eventCategoryFilter.toLowerCase();
      const matchesQ =
        !q ||
        (ev.title || '').toLowerCase().includes(q) ||
        (ev.id || '').toLowerCase().includes(q) ||
        (ev.venue || '').toLowerCase().includes(q) ||
        (ev.category || '').toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [eventsList, eventSearchQuery, eventCategoryFilter]);

  const handleEventUpdated = (updatedEvent) => {
    setEventsList((prev) =>
      prev.map((e) => (e.id === updatedEvent.id ? { ...e, ...updatedEvent } : e))
    );
    loadManagementData();
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderPaymentStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>;
      case 'pending':
      case 'pending_payment':
        return <Badge variant="warning">Pending</Badge>;
      case 'failed':
        return <Badge variant="danger">Failed</Badge>;
      case 'waived':
        return <Badge variant="primary">Waived</Badge>;
      case 'free':
      default:
        return <Badge variant="neutral">Free</Badge>;
    }
  };

  const renderRegistrationTypeBadge = (type) => {
    if (type === 'paid') {
      return <span className="reg-type-badge paid">Paid</span>;
    }
    return <span className="reg-type-badge free">Free</span>;
  };

  const handleVerifyPayment = async (reg) => {
    const feeStr = reg.feeAmount ? `₹${Number(reg.feeAmount).toLocaleString('en-IN')}` : 'prescribed fee';
    const confirmed = window.confirm(
      `Verify offline/cash payment of ${feeStr} for ${reg.participantName} (${reg.id})?\n\nThis will confirm their registration and issue their Digital Event Pass.`
    );
    if (!confirmed) return;

    setVerifyingId(reg.id);
    try {
      const res = await verifyOfflinePaymentAdmin(reg.id, {
        note: 'Manager offline desk verification'
      });
      if (res.success) {
        toast.success(res.message || 'Payment verified and pass issued.');
        await loadManagementData();
      } else {
        toast.error(res.error || 'Failed to verify payment.');
      }
    } catch (err) {
      toast.error(err.message || 'Error communicating with verification service.');
    } finally {
      setVerifyingId(null);
    }
  };

  // Section 5.3: RFC 4180 Sanitized CSV Export
  const handleExportCsv = (filteredOnly = false) => {
    const dataToExport = filteredOnly ? filteredRegistrations : registrations;

    if (dataToExport.length === 0) {
      toast.warning('No registration records available to export.');
      return;
    }

    const headers = [
      'Registration ID',
      'Participant Name',
      'Email Address',
      'Phone Number',
      'Roll Number',
      'Event ID',
      'Event Name',
      'Registration Type',
      'Fee Amount',
      'Payment Status',
      'Transaction Reference',
      'Registration Timestamp'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const clean = String(val).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = dataToExport.map((reg) => [
      escapeCsv(reg.id),
      escapeCsv(reg.participantName),
      escapeCsv(reg.email),
      escapeCsv(reg.phone),
      escapeCsv(reg.rollNumber || 'N/A (Guest)'),
      escapeCsv(reg.eventId),
      escapeCsv(reg.eventTitle || reg.eventId),
      escapeCsv(reg.registrationType || (reg.feeAmount > 0 ? 'paid' : 'free')),
      escapeCsv(reg.feeAmount || reg.amountPaid || 0),
      escapeCsv(reg.paymentStatus || 'free'),
      escapeCsv(reg.transactionReference || 'N/A'),
      escapeCsv(reg.registeredAt || new Date().toISOString())
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `festiq_registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${dataToExport.length} participant records to CSV.`);
  };

  const handleEventCreated = (newEvent) => {
    loadManagementData();
    if (onEventCreatedParent) {
      onEventCreatedParent(newEvent);
    }
  };

  // 1. Loading State
  if (authLoading) {
    return (
      <div className="management-loading-screen">
        <div className="management-spinner" />
        <p>Verifying management credentials...</p>
      </div>
    );
  }

  // 2. Access Restricted State
  if (!isAuthenticated || !isManager) {
    return (
      <div className="management-restricted-page">
        <div className="container">
          <div className="restricted-card">
            <div className="restricted-icon-box">
              <Lock size={36} className="lock-icon" />
            </div>
            <h1 className="restricted-title">Management Authorization Required</h1>
            <p className="restricted-message">
              Access to event administration, participant records, and live metrics is restricted to verified campus coordinators and university faculty organizers.
            </p>
            <div className="restricted-guidance">
              <strong>Account Provisioning Instructions:</strong>
              <p>
                To access the portal, ensure your KIIT student account has been promoted to <code>manager</code> using the administrative CLI command:
              </p>
              <pre className="cli-snippet">npm --prefix backend run promote:manager -- demo.student@kiit.ac.in</pre>
            </div>
            <div className="restricted-actions">
              <Button
                variant="primary"
                size="md"
                onClick={onOpenAuthModal}
              >
                Sign In with Manager Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="management-page page-entrance">
      <div className="container">
        {/* Top Header */}
        <header className="management-header">
          <div className="management-title-group">
            <div className="management-badge">
              <FestiqLogo variant="symbol" size={20} />
              <span>Campus Management Portal</span>
            </div>
            <h1 className="management-title">Executive Operations Hub</h1>
            <p className="management-subtitle">
              Manage collegiate competitions, track live enrollment capacity, inspect registered students, and export verified participant records.
            </p>
          </div>

          <div className="management-top-actions">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={15} />}
              onClick={loadManagementData}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={<PlusCircle size={16} />}
              onClick={() => setCreateModalOpen(true)}
            >
              Create Campus Event
            </Button>
          </div>
        </header>

        {/* Section 5.1: Real-Time Dynamic Dashboard Overview */}
        <section className="management-overview-section" aria-label="Management KPI Metrics">
          <div className="metrics-grid">
            {/* Metric 1: Total Events */}
            <div className="metric-card">
              <div className="metric-icon-box cat-tech">
                <Calendar size={22} />
              </div>
              <div className="metric-content">
                <span className="metric-label">Published Events</span>
                <span className="metric-value">{overview ? overview.totalEvents : '—'}</span>
                <span className="metric-subtext">Across 6 academic disciplines</span>
              </div>
            </div>

            {/* Metric 2: Total Registrations */}
            <div className="metric-card">
              <div className="metric-icon-box cat-cultural">
                <Users size={22} />
              </div>
              <div className="metric-content">
                <span className="metric-label">Total Registrations</span>
                <span className="metric-value">{overview ? overview.totalRegistrations : '—'}</span>
                <span className="metric-subtext">Verified attendee submissions</span>
              </div>
            </div>

            {/* Metric 3: Available Seats (Dynamic individual event calculation) */}
            <div className="metric-card">
              <div className="metric-icon-box cat-workshops">
                <Ticket size={22} />
              </div>
              <div className="metric-content">
                <span className="metric-label">Available Seats</span>
                <span className="metric-value">
                  {overview ? Number(overview.totalAvailableSeats).toLocaleString('en-IN') : '—'}
                </span>
                <span className="metric-subtext">
                  Of {overview ? Number(overview.totalCapacity).toLocaleString('en-IN') : '—'} total capacity
                </span>
              </div>
            </div>

            {/* Metric 4: Prize Pool */}
            <div className="metric-card">
              <div className="metric-icon-box cat-management">
                <Trophy size={22} />
              </div>
              <div className="metric-content">
                <span className="metric-label">Active Prize Pool</span>
                <span className="metric-value">
                  {overview ? overview.totalPrizePoolFormatted : '—'}
                </span>
                <span className="metric-subtext">Awarded across tournaments</span>
              </div>
            </div>

            {/* Metric 5: Fee Revenue Collected */}
            <div className="metric-card">
              <div className="metric-icon-box cat-revenue">
                <CreditCard size={22} />
              </div>
              <div className="metric-content">
                <span className="metric-label">Fee Revenue</span>
                <span className="metric-value">
                  {overview ? overview.totalRevenueCollected : '—'}
                </span>
                <span className="metric-subtext">
                  {overview?.totalPaidRegistrations ?? 0} paid • {overview?.totalPendingPayments ?? 0} pending
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Operations Hub Navigation Tabs */}
        <div className="management-hub-tabs">
          <button
            type="button"
            className={`hub-tab-btn ${activeHubSection === 'registrations' ? 'active' : ''}`}
            onClick={() => setActiveHubSection('registrations')}
          >
            <Users size={17} />
            <span>Participant Registrations</span>
            <span className="hub-tab-count">{registrations.length}</span>
          </button>
          <button
            type="button"
            className={`hub-tab-btn ${activeHubSection === 'proposals' ? 'active' : ''}`}
            onClick={() => setActiveHubSection('proposals')}
          >
            <FileCheck size={17} />
            <span>Event Proposals Review Queue</span>
            <span className={`hub-tab-count ${proposals.some(p => !['Published', 'Rejected'].includes(p.status)) ? 'badge-pending' : ''}`}>
              {proposals.length}
            </span>
          </button>
          <button
            type="button"
            className={`hub-tab-btn ${activeHubSection === 'checkin' ? 'active' : ''}`}
            onClick={() => setActiveHubSection('checkin')}
          >
            <QrCode size={17} />
            <span>QR Check-in & Attendance</span>
            {overview?.totalCheckedIn > 0 && (
              <span className="hub-tab-count badge-checkedin">{overview.totalCheckedIn}</span>
            )}
          </button>
          <button
            type="button"
            className={`hub-tab-btn ${activeHubSection === 'events' ? 'active' : ''}`}
            onClick={() => setActiveHubSection('events')}
          >
            <FileText size={17} />
            <span>Events & PDF Specs</span>
            <span className="hub-tab-count">{eventsList.length}</span>
          </button>
          <button
            type="button"
            className={`hub-tab-btn ${activeHubSection === 'gallery' ? 'active' : ''}`}
            onClick={() => setActiveHubSection('gallery')}
          >
            <ImageIcon size={17} />
            <span>Gallery Management</span>
          </button>
        </div>

        {/* Section 5.2: Participant Management & Section 5.3: CSV Export */}
        {activeHubSection === 'registrations' && (
        <section className="management-participants-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Participant Management</h2>
              <p className="section-desc">Search, filter, and review verified student event enrollments.</p>
            </div>

            <div className="export-btn-group">
              <Button
                variant="outline"
                size="sm"
                icon={<Download size={15} />}
                onClick={() => handleExportCsv(true)}
                title="Export currently filtered participant view"
              >
                Export Filtered ({filteredRegistrations.length})
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={15} />}
                onClick={() => handleExportCsv(false)}
                title="Export all database registrations"
              >
                Export All ({registrations.length})
              </Button>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="table-controls-bar">
            {/* Search */}
            <div className="table-search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by participant name, email, roll number, or event..."
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

            {/* Event Filter */}
            <div className="table-filter-box">
              <Filter size={15} className="filter-icon" />
              <select
                value={selectedEventFilter}
                onChange={(e) => setSelectedEventFilter(e.target.value)}
                aria-label="Filter participants by event"
              >
                <option value="ALL">All Events ({registrations.length})</option>
                {eventOptions.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="participant-table-wrapper">
            {loading ? (
              <div className="table-state-box">
                <div className="management-spinner" />
                <p>Retrieving registration records...</p>
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <div className="table-state-box empty">
                <Users size={36} className="empty-state-icon" />
                <h3>No Participant Records Found</h3>
                <p>
                  {searchQuery || selectedEventFilter !== 'ALL'
                    ? 'No registrations match the selected search and filter criteria.'
                    : 'No event registrations have been submitted yet.'}
                </p>
                {(searchQuery || selectedEventFilter !== 'ALL') && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedEventFilter('ALL');
                    }}
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
            ) : (
              <table className="participant-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')} className="sortable-th">
                      Reg ID <ArrowUpDown size={12} />
                    </th>
                    <th onClick={() => handleSort('participantName')} className="sortable-th">
                      Participant <ArrowUpDown size={12} />
                    </th>
                    <th>Contact</th>
                    <th>Institutional Roll</th>
                    <th onClick={() => handleSort('eventTitle')} className="sortable-th">
                      Event <ArrowUpDown size={12} />
                    </th>
                    <th>Type</th>
                    <th>Fee</th>
                    <th>Payment</th>
                    <th>Txn Ref</th>
                    <th onClick={() => handleSort('registeredAt')} className="sortable-th">
                      Date <ArrowUpDown size={12} />
                    </th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((reg) => (
                    <tr key={reg.id}>
                      <td className="cell-id">
                        <code>{reg.id}</code>
                      </td>
                      <td className="cell-participant">
                        <span className="participant-name">{reg.participantName}</span>
                      </td>
                      <td className="cell-contact">
                        <div className="contact-row">
                          <Mail size={12} />
                          <a href={`mailto:${reg.email}`}>{reg.email}</a>
                        </div>
                        {reg.phone && (
                          <div className="contact-row phone">
                            <Phone size={12} />
                            <a href={`tel:${reg.phone}`}>{reg.phone}</a>
                          </div>
                        )}
                      </td>
                      <td className="cell-roll">
                        {reg.rollNumber ? (
                          <span className="roll-badge">{reg.rollNumber}</span>
                        ) : (
                          <span className="guest-badge">Guest Attendee</span>
                        )}
                      </td>
                      <td className="cell-event">
                        <span className="event-name-tag">{reg.eventTitle || reg.eventId}</span>
                      </td>
                      <td className="cell-type">
                        {renderRegistrationTypeBadge(reg.registrationType || (reg.feeAmount > 0 ? 'paid' : 'free'))}
                      </td>
                      <td className="cell-fee">
                        {(reg.registrationType === 'paid' || reg.feeAmount > 0)
                          ? `₹${Number(reg.feeAmount || reg.amountPaid || 0).toLocaleString('en-IN')}`
                          : <span className="free-fee-tag">Free</span>}
                      </td>
                      <td className="cell-payment-status">
                        {renderPaymentStatusBadge(reg.paymentStatus)}
                      </td>
                      <td className="cell-txn">
                        {reg.transactionReference ? (
                          <code className="txn-ref-code" title={reg.transactionReference}>
                            {reg.transactionReference.length > 12
                              ? `${reg.transactionReference.slice(0, 10)}…`
                              : reg.transactionReference}
                          </code>
                        ) : (
                          <span className="txn-na">—</span>
                        )}
                      </td>
                      <td className="cell-date">
                        {reg.registeredAt
                          ? new Date(reg.registeredAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })
                          : '—'}
                      </td>
                      <td className="cell-action">
                        {reg.paymentStatus === 'pending' || reg.paymentStatus === 'pending_payment' ? (
                          <button
                            type="button"
                            className="btn-verify-pay"
                            disabled={verifyingId === reg.id}
                            onClick={() => handleVerifyPayment(reg)}
                            title="Verify offline cash payment and issue pass"
                          >
                            {verifyingId === reg.id ? 'Verifying...' : 'Verify Pay'}
                          </button>
                        ) : reg.paymentStatus === 'paid' ? (
                          <span className="verified-check-indicator" title="Verified paid pass issued">
                            <CheckCircle2 size={13} /> Issued
                          </span>
                        ) : (
                          <span className="txn-na">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
        )}

        {/* Section 5.5: Event Proposals & Institutional Approval Queue */}
        {activeHubSection === 'proposals' && (
          <section className="management-proposals-section">
            <div className="section-header-row">
              <div>
                <h2 className="section-title">Event Proposals & Institutional Approval</h2>
                <p className="section-desc">
                  Inspect student organizer submissions, record official college verifications, conduct feasibility assessments, and publish approved events.
                </p>
              </div>

              <div className="proposals-queue-stats">
                <span className="stat-pill">
                  Awaiting Action: <strong>{proposals.filter(p => !['Published', 'Rejected'].includes(p.status)).length}</strong>
                </span>
                <span className="stat-pill">
                  Total Proposals: <strong>{proposals.length}</strong>
                </span>
              </div>
            </div>

            {/* Controls Bar for Proposals */}
            <div className="table-controls-bar">
              {/* Search */}
              <div className="table-search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  value={proposalSearchQuery}
                  onChange={(e) => setProposalSearchQuery(e.target.value)}
                  placeholder="Search by proposal ID, title, organizer, or society..."
                />
                {proposalSearchQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setProposalSearchQuery('')}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="table-filter-box">
                <Filter size={15} className="filter-icon" />
                <select
                  value={proposalStatusFilter}
                  onChange={(e) => setProposalStatusFilter(e.target.value)}
                  aria-label="Filter proposals by status"
                >
                  <option value="ALL">All Statuses ({proposals.length})</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Awaiting Organizer Information">Awaiting Organizer Info</option>
                  <option value="Awaiting College Approval">Awaiting College Approval</option>
                  <option value="Feasibility Review">Feasibility Review</option>
                  <option value="Approved for Publication">Approved for Publication</option>
                  <option value="Published">Published</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Proposals Table */}
            <div className="participant-table-wrapper">
              {proposalsLoading ? (
                <div className="table-state-box">
                  <div className="management-spinner" />
                  <p>Loading event proposals queue...</p>
                </div>
              ) : filteredProposals.length === 0 ? (
                <div className="table-state-box empty">
                  <FileText size={36} className="empty-state-icon" />
                  <h3>No Event Proposals Found</h3>
                  <p>
                    {proposalSearchQuery || proposalStatusFilter !== 'ALL'
                      ? 'No proposals match the active search or status filter.'
                      : 'No event proposals have been submitted through the public portal yet.'}
                  </p>
                  {(proposalSearchQuery || proposalStatusFilter !== 'ALL') && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setProposalSearchQuery('');
                        setProposalStatusFilter('ALL');
                      }}
                    >
                      Reset Filters
                    </Button>
                  )}
                </div>
              ) : (
                <table className="participant-table proposals-table">
                  <thead>
                    <tr>
                      <th>Ref ID</th>
                      <th>Event Title & Category</th>
                      <th>Organizer & Society</th>
                      <th>Date & Venue</th>
                      <th>College Check</th>
                      <th>Feasibility</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProposals.map((prop) => (
                      <tr key={prop.id}>
                        <td className="cell-id">
                          <code>{prop.id}</code>
                        </td>
                        <td className="cell-event">
                          <span className="event-name-tag">{prop.event?.title}</span>
                          <span className="event-cat-sub">{prop.event?.category}</span>
                        </td>
                        <td className="cell-participant">
                          <span className="participant-name">{prop.organizer?.name}</span>
                          <span className="org-sub">{prop.organizer?.organization}</span>
                        </td>
                        <td className="cell-date">
                          <div>{prop.event?.date}</div>
                          <div className="venue-sub">{prop.event?.venue}</div>
                        </td>
                        <td>
                          <span className={`gate-status-pill ${prop.collegeVerification?.status === 'Approved' ? 'pass' : prop.collegeVerification?.status === 'Rejected' ? 'fail' : 'pending'}`}>
                            {prop.collegeVerification?.status || 'Pending'}
                          </span>
                        </td>
                        <td>
                          <span className={`gate-status-pill ${prop.feasibilityAssessment?.status === 'Acceptable' ? 'pass' : prop.feasibilityAssessment?.status === 'Unacceptable' ? 'fail' : 'pending'}`}>
                            {prop.feasibilityAssessment?.status || 'Pending'}
                          </span>
                        </td>
                        <td>{renderProposalBadge(prop.status)}</td>
                        <td>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedProposalForReview(prop)}
                          >
                            Review / Verify
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {/* Section 5.6: QR Check-in & Attendance Scanner */}
        {activeHubSection === 'checkin' && (
          <section className="management-checkin-section">
            <QRCheckInScanner
              eventOptions={eventOptions}
              onAttendanceUpdated={loadManagementData}
            />
          </section>
        )}

        {/* Section 5.7: Events & Official PDF Specifications Manager */}
        {activeHubSection === 'events' && (
          <section className="management-events-spec-section">
            <div className="section-header-row">
              <div>
                <h2 className="section-title">Campus Events & PDF Specifications</h2>
                <p className="section-desc">
                  Maintain detailed event descriptions, verified schedules, competition rules, prize distribution, and official winner citations.
                </p>
              </div>

              <div className="export-btn-group">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<PlusCircle size={15} />}
                  onClick={() => setCreateModalOpen(true)}
                >
                  Create New Event
                </Button>
              </div>
            </div>

            {/* Event Search & Filter Bar */}
            <div className="table-controls-bar">
              <div className="table-search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  value={eventSearchQuery}
                  onChange={(e) => setEventSearchQuery(e.target.value)}
                  placeholder="Search events by title, ID, category, or venue..."
                />
                {eventSearchQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setEventSearchQuery('')}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="table-filter-box">
                <Filter size={15} className="filter-icon" />
                <select
                  value={eventCategoryFilter}
                  onChange={(e) => setEventCategoryFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="ALL">All Disciplines</option>
                  <option value="Technical">Technical</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Workshops">Workshops</option>
                  <option value="Management">Management</option>
                  <option value="Sports">Sports</option>
                </select>
              </div>
            </div>

            {/* Events Specification Table */}
            <div className="table-responsive-wrapper">
              <table className="participant-table events-spec-table">
                <thead>
                  <tr>
                    <th>Event ID</th>
                    <th>Title & Discipline</th>
                    <th>Date & Venue</th>
                    <th>Registration Fee</th>
                    <th>Prize Pool</th>
                    <th>Podium / Results</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEventsList.map((ev) => (
                    <tr key={ev.id}>
                      <td>
                        <span className="reg-id-mono">{ev.id}</span>
                      </td>
                      <td>
                        <div className="event-title-cell">
                          <strong>{ev.title}</strong>
                          <Badge variant={ev.category} size="xs">
                            {ev.category}
                          </Badge>
                        </div>
                        {ev.tagline && <span className="event-tagline-sub">{ev.tagline}</span>}
                      </td>
                      <td>
                        <div>{ev.date}</div>
                        <div className="venue-sub">{ev.venue}</div>
                      </td>
                      <td>
                        <span className="fee-amount-badge">
                          {ev.isPaid && ev.feeAmount > 0
                            ? `₹${ev.feeAmount} (${ev.feeType === 'per_team' ? 'Team' : 'Person'})`
                            : 'Free'}
                        </span>
                      </td>
                      <td>
                        <strong className="prize-pool-text">{ev.prizePool || '—'}</strong>
                      </td>
                      <td>
                        <div className="results-status-summary">
                          {ev.pdfDetails?.winners?.first && ev.pdfDetails.winners.first !== 'To be announced after the event' ? (
                            <Badge variant="success">Certified</Badge>
                          ) : (
                            <Badge variant="neutral">Pending Event</Badge>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="event-row-actions">
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<FileText size={14} />}
                            onClick={() => setSelectedEventForEdit(ev)}
                            title="Edit event detailed description, schedule, rules, and winners"
                          >
                            Edit Specs
                          </Button>
                          <a
                            href={`/api/events/${ev.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="festiq-btn btn-sm btn-outline pdf-spec-btn"
                            title="View official generated PDF specification in a new tab"
                          >
                            <ExternalLink size={13} />
                            <span>PDF</span>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Section 5.8: Campus Event Gallery Management */}
        {activeHubSection === 'gallery' && (
          <section className="management-gallery-section">
            <GalleryManagementTab />
          </section>
        )}

        {/* Section 5.1b: Recent Activity Feed */}
        {overview?.recentRegistrations && overview.recentRegistrations.length > 0 && (
          <section className="recent-activity-section">
            <h3 className="recent-activity-title">Live Registration Feed</h3>
            <div className="recent-activity-list">
              {overview.recentRegistrations.map((item) => (
                <div key={item.id} className="recent-activity-item">
                  <div className="activity-indicator" />
                  <div className="activity-info">
                    <span className="activity-user">{item.participantName}</span> registered for{' '}
                    <strong className="activity-event">{item.eventTitle}</strong>
                  </div>
                  <span className="activity-time">
                    {item.registeredAt ? new Date(item.registeredAt).toLocaleTimeString() : ''}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Section 5.4: Event Creation Modal */}
      <CreateEventModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onEventCreated={handleEventCreated}
      />

      {/* Section 5.5: Proposal Inspection, Verification & Publication Modal */}
      <ProposalReviewModal
        isOpen={Boolean(selectedProposalForReview)}
        proposal={selectedProposalForReview}
        onClose={() => setSelectedProposalForReview(null)}
        onProposalUpdated={handleProposalUpdated}
        onEventPublished={handleProposalEventPublished}
      />

      {/* Section 5.7b: Event & PDF Detailed Specifications Editor Modal */}
      <EditEventDetailsModal
        isOpen={Boolean(selectedEventForEdit)}
        event={selectedEventForEdit}
        onClose={() => setSelectedEventForEdit(null)}
        onEventUpdated={handleEventUpdated}
      />
    </div>
  );
}

