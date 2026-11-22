import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Award,
  Users,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Download,
  ExternalLink,
  ShieldAlert,
  Send,
  XCircle,
  Sparkles,
  ChevronDown,
  Info
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { useToast } from '../../context/ToastContext';
import {
  fetchEventCertificateData,
  grantEligibilityOverrideAdmin,
  issueCertificateAdmin,
  publishCertificateAdmin,
  revokeCertificateAdmin,
  batchIssueCertificatesAdmin,
  batchPublishCertificatesAdmin,
  downloadCertificatePdf
} from '../../services/api';
import './CertificateManagementTab.css';

export default function CertificateManagementTab({ events = [] }) {
  const toast = useToast();
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL | ELIGIBLE | INELIGIBLE | ISSUED | PUBLISHED | REVOKED

  // Modals state
  const [overrideModalTarget, setOverrideModalTarget] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  const [revokeModalTarget, setRevokeModalTarget] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);

  // Batch actions state
  const [batchLoading, setBatchLoading] = useState(false);

  // Auto-select first event if none selected
  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const loadEventCertificateData = useCallback(async (eventId) => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchEventCertificateData(eventId);
      if (response && response.success) {
        setEventData(response.data);
      } else {
        setError(response?.message || 'Failed to load event certificate roster');
      }
    } catch (err) {
      setError(err.message || 'Error communicating with certificate storage service');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadEventCertificateData(selectedEventId);
    }
  }, [selectedEventId, loadEventCertificateData]);

  // Filter attendees
  const filteredAttendees = useMemo(() => {
    if (!eventData || !eventData.attendees) return [];
    const q = searchQuery.trim().toLowerCase();

    return eventData.attendees.filter((att) => {
      const matchesSearch =
        !q ||
        (att.participantName || '').toLowerCase().includes(q) ||
        (att.email || '').toLowerCase().includes(q) ||
        (att.rollNumber || '').toLowerCase().includes(q) ||
        (att.registrationId || '').toLowerCase().includes(q) ||
        (att.certificate?.id || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterStatus === 'ALL') return true;
      if (filterStatus === 'ELIGIBLE') return att.isEligible;
      if (filterStatus === 'INELIGIBLE') return !att.isEligible;
      if (filterStatus === 'ISSUED') return Boolean(att.certificate);
      if (filterStatus === 'PUBLISHED') return att.certificate?.status === 'PUBLISHED';
      if (filterStatus === 'REVOKED') return att.certificate?.status === 'REVOKED';

      return true;
    });
  }, [eventData, searchQuery, filterStatus]);

  // Single Actions
  const handleIssueSingle = async (attendee) => {
    try {
      await issueCertificateAdmin({
        eventId: selectedEventId,
        userId: attendee.userId,
        registrationId: attendee.registrationId
      });
      toast.success(`Draft certificate issued for ${attendee.participantName}. Publish when ready for student access.`);
      loadEventCertificateData(selectedEventId);
    } catch (err) {
      toast.error(err.message || 'Failed to issue certificate');
    }
  };

  const handlePublishSingle = async (certificateId, attendeeName) => {
    try {
      await publishCertificateAdmin(certificateId);
      toast.success(`Certificate published for ${attendeeName}. Public verification is now active!`);
      loadEventCertificateData(selectedEventId);
    } catch (err) {
      toast.error(err.message || 'Failed to publish certificate');
    }
  };

  const handleOpenOverrideModal = (attendee) => {
    setOverrideModalTarget(attendee);
    setOverrideReason('');
  };

  const handleSubmitOverride = async (e) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      toast.warning('Please specify an authorized reason for granting this eligibility override.');
      return;
    }

    setOverrideSubmitting(true);
    try {
      await grantEligibilityOverrideAdmin({
        eventId: selectedEventId,
        userId: overrideModalTarget.userId,
        registrationId: overrideModalTarget.registrationId,
        reason: overrideReason.trim()
      });
      toast.success(`Eligibility override granted for ${overrideModalTarget.participantName}`);
      setOverrideModalTarget(null);
      loadEventCertificateData(selectedEventId);
    } catch (err) {
      toast.error(err.message || 'Failed to grant override');
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const handleOpenRevokeModal = (attendee) => {
    setRevokeModalTarget(attendee);
    setRevokeReason('');
  };

  const handleSubmitRevoke = async (e) => {
    e.preventDefault();
    if (!revokeReason.trim()) {
      toast.warning('Please specify a valid justification for revoking this certificate.');
      return;
    }

    setRevokeSubmitting(true);
    try {
      await revokeCertificateAdmin(revokeModalTarget.certificate.id, revokeReason.trim());
      toast.success(`Certificate ${revokeModalTarget.certificate.id} revoked.`);
      setRevokeModalTarget(null);
      loadEventCertificateData(selectedEventId);
    } catch (err) {
      toast.error(err.message || 'Failed to revoke certificate');
    } finally {
      setRevokeSubmitting(false);
    }
  };

  // Batch actions
  const handleBatchIssue = async () => {
    if (!eventData || !eventData.attendees) return;

    const unissuedEligible = eventData.attendees.filter(
      (a) => a.isEligible && !a.certificate
    );

    if (unissuedEligible.length === 0) {
      toast.info('No unissued eligible attendees found for this event.');
      return;
    }

    setBatchLoading(true);
    try {
      const regIds = unissuedEligible.map((a) => a.registrationId);
      const res = await batchIssueCertificatesAdmin({
        eventId: selectedEventId,
        registrationIds: regIds
      });
      toast.success(res.message || `Batch issued ${unissuedEligible.length} draft certificates.`);
      loadEventCertificateData(selectedEventId);
    } catch (err) {
      toast.error(err.message || 'Batch issuance failed');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchPublish = async () => {
    if (!eventData || !eventData.attendees) return;

    const draftCertificates = eventData.attendees
      .filter((a) => a.certificate && a.certificate.status === 'DRAFT')
      .map((a) => a.certificate.id);

    if (draftCertificates.length === 0) {
      toast.info('No draft certificates to publish for this event.');
      return;
    }

    setBatchLoading(true);
    try {
      const res = await batchPublishCertificatesAdmin(draftCertificates);
      toast.success(res.message || `Batch published ${draftCertificates.length} certificates.`);
      loadEventCertificateData(selectedEventId);
    } catch (err) {
      toast.error(err.message || 'Batch publication failed');
    } finally {
      setBatchLoading(false);
    }
  };

  const copyVerificationLink = (certId) => {
    const url = `${window.location.origin}/verify-certificate/${certId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Public verification link copied!');
    }).catch(() => {
      toast.info(`Verification URL: ${url}`);
    });
  };

  return (
    <div className="cert-management-hub">
      {/* Event Selector Top Bar */}
      <div className="cert-hub-header">
        <div className="event-picker-group">
          <label htmlFor="event-select" className="event-picker-label">
            <Award size={18} />
            <span>Select Event:</span>
          </label>
          <select
            id="event-select"
            className="event-picker-select"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} ({ev.category} · {ev.date})
              </option>
            ))}
          </select>
        </div>

        <div className="cert-hub-actions">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={() => loadEventCertificateData(selectedEventId)}
            disabled={loading}
          >
            Refresh Roster
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<FileCheck2 size={14} />}
            onClick={() => handleBatchIssue(false)}
            disabled={batchLoading || !eventData}
          >
            Batch Issue Drafts
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Send size={14} />}
            onClick={handleBatchPublish}
            disabled={batchLoading || !eventData}
          >
            Batch Publish All
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      {eventData && eventData.metrics && (
        <div className="cert-metrics-grid">
          <div className="cert-metric-card">
            <span className="metric-tag">Registrations</span>
            <span className="metric-num">{eventData.metrics.totalRegistered}</span>
            <span className="metric-desc">Total signed up</span>
          </div>

          <div className="cert-metric-card highlight-attendance">
            <span className="metric-tag">Venue Verified</span>
            <span className="metric-num">{eventData.metrics.verifiedAttendance}</span>
            <span className="metric-desc">Scanned QR check-in</span>
          </div>

          <div className="cert-metric-card">
            <span className="metric-tag">Overrides</span>
            <span className="metric-num">{eventData.metrics.overridesCount}</span>
            <span className="metric-desc">Manager granted</span>
          </div>

          <div className="cert-metric-card highlight-eligible">
            <span className="metric-tag">Total Eligible</span>
            <span className="metric-num">{eventData.metrics.eligibleTotal}</span>
            <span className="metric-desc">Attendance + Override</span>
          </div>

          <div className="cert-metric-card">
            <span className="metric-tag">Issued</span>
            <span className="metric-num">{eventData.metrics.issuedTotal}</span>
            <span className="metric-desc">Draft & Published</span>
          </div>

          <div className="cert-metric-card highlight-published">
            <span className="metric-tag">Published</span>
            <span className="metric-num">{eventData.metrics.publishedTotal}</span>
            <span className="metric-desc">Verifiable publicly</span>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="cert-table-controls">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search attendee by name, roll number, or certificate ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={16} className="filter-icon" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">All Attendees</option>
            <option value="ELIGIBLE">Eligible Only</option>
            <option value="INELIGIBLE">Ineligible Only</option>
            <option value="ISSUED">Certificates Issued</option>
            <option value="PUBLISHED">Published Only</option>
            <option value="REVOKED">Revoked Only</option>
          </select>
        </div>
      </div>

      {/* Attendees Table */}
      {loading ? (
        <div className="cert-loading-state">
          <div className="cert-spinner" />
          <p>Loading attendance verification and certificate records...</p>
        </div>
      ) : error ? (
        <div className="cert-error-state">
          <AlertCircle size={32} />
          <p>{error}</p>
        </div>
      ) : (
        <div className="cert-table-container">
          <table className="cert-table">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Check-in Status</th>
                <th>Eligibility</th>
                <th>Certificate Status</th>
                <th className="actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="no-attendees-cell">
                    No attendees match the selected search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAttendees.map((att) => {
                  const hasCert = Boolean(att.certificate);
                  const isPublished = att.certificate?.status === 'PUBLISHED';
                  const isRevoked = att.certificate?.status === 'REVOKED';

                  return (
                    <tr key={att.registrationId}>
                      <td className="attendee-info-cell">
                        <span className="attendee-name">{att.participantName}</span>
                        <span className="attendee-meta">
                          {att.rollNumber ? `Roll: ${att.rollNumber} · ` : ''}
                          {att.email}
                        </span>
                      </td>

                      <td>
                        {att.checkedIn ? (
                          <span className="status-badge checkin-yes">
                            <CheckCircle2 size={14} />
                            <span>Checked In</span>
                          </span>
                        ) : (
                          <span className="status-badge checkin-no">
                            <span>Not Scanned</span>
                          </span>
                        )}
                      </td>

                      <td>
                        {att.checkedIn ? (
                          <Badge variant="success">Eligible (Attendance)</Badge>
                        ) : att.override ? (
                          <Badge variant="primary" title={`Granted by ${att.override.managerName}: ${att.override.reason}`}>
                            Eligible (Override)
                          </Badge>
                        ) : (
                          <Badge variant="neutral">Ineligible</Badge>
                        )}
                      </td>

                      <td>
                        {!hasCert ? (
                          <span className="cert-status-none">— Not Issued —</span>
                        ) : isPublished ? (
                          <span className="status-badge cert-published">
                            <Sparkles size={13} />
                            <span>Published</span>
                          </span>
                        ) : isRevoked ? (
                          <span className="status-badge cert-revoked">
                            <XCircle size={13} />
                            <span>Revoked</span>
                          </span>
                        ) : (
                          <span className="status-badge cert-draft">
                            <span>Draft</span>
                          </span>
                        )}
                        {hasCert && (
                          <span className="mono-sub-id">{att.certificate.id}</span>
                        )}
                      </td>

                      <td className="actions-cell">
                        <div className="row-actions-group">
                          {/* If ineligible, allow granting override */}
                          {!att.isEligible && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenOverrideModal(att)}
                            >
                              Grant Override
                            </Button>
                          )}

                          {/* If eligible and no cert, allow issue as draft */}
                          {att.isEligible && !hasCert && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleIssueSingle(att)}
                            >
                              Issue Cert (Draft)
                            </Button>
                          )}

                          {/* If issued in Draft, allow publish */}
                          {hasCert && !isPublished && !isRevoked && (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Send size={13} />}
                              onClick={() => handlePublishSingle(att.certificate.id, att.participantName)}
                            >
                              Publish
                            </Button>
                          )}

                          {/* If published, allow download PDF, copy verification link, or revoke */}
                          {hasCert && isPublished && (
                            <>
                              <button
                                type="button"
                                className="action-icon-btn"
                                title="Download Official PDF"
                                onClick={() => downloadCertificatePdf(att.certificate.id)}
                              >
                                <Download size={15} />
                              </button>
                              <button
                                type="button"
                                className="action-icon-btn"
                                title="Copy Verification Link"
                                onClick={() => copyVerificationLink(att.certificate.id)}
                              >
                                <ExternalLink size={15} />
                              </button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleOpenRevokeModal(att)}
                              >
                                Revoke
                              </Button>
                            </>
                          )}

                          {/* If revoked, display revocation info */}
                          {hasCert && isRevoked && (
                            <span className="revoked-tag" title={att.certificate.revocationReason}>
                              Revoked
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: Grant Eligibility Override */}
      {overrideModalTarget && (
        <div className="cert-modal-backdrop" onClick={() => setOverrideModalTarget(null)}>
          <div className="cert-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cert-modal-header">
              <ShieldAlert size={22} className="modal-title-icon" />
              <h3>Grant Attendance Override</h3>
            </div>
            <form onSubmit={handleSubmitOverride}>
              <div className="cert-modal-body">
                <p className="modal-subtext">
                  You are granting an authorized certificate eligibility override for:
                </p>
                <div className="attendee-summary-box">
                  <strong>{overrideModalTarget.participantName}</strong>
                  <span>{overrideModalTarget.email}</span>
                </div>
                <div className="input-group">
                  <label htmlFor="override-reason">Authorized Reason (Required):</label>
                  <textarea
                    id="override-reason"
                    rows={3}
                    placeholder="E.g., In-person attendee whose QR ticket failed at entry scanner; verified by Session Chair Dr. Roy."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="cert-modal-actions">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setOverrideModalTarget(null)}
                  disabled={overrideSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={overrideSubmitting || !overrideReason.trim()}
                >
                  {overrideSubmitting ? 'Recording...' : 'Grant Override'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Revoke Certificate */}
      {revokeModalTarget && (
        <div className="cert-modal-backdrop" onClick={() => setRevokeModalTarget(null)}>
          <div className="cert-modal-card revoke-card" onClick={(e) => e.stopPropagation()}>
            <div className="cert-modal-header">
              <XCircle size={22} className="modal-title-icon text-danger" />
              <h3>Revoke Digital Certificate</h3>
            </div>
            <form onSubmit={handleSubmitRevoke}>
              <div className="cert-modal-body">
                <p className="modal-subtext text-warning">
                  Revoking a certificate is permanent on public verification. The credential will be marked as REVOKED and cannot be downloaded by the student.
                </p>
                <div className="attendee-summary-box">
                  <strong>{revokeModalTarget.participantName}</strong>
                  <span className="mono-sub-id">{revokeModalTarget.certificate.id}</span>
                </div>
                <div className="input-group">
                  <label htmlFor="revoke-reason">Official Revocation Justification (Required):</label>
                  <textarea
                    id="revoke-reason"
                    rows={3}
                    placeholder="E.g., Code of conduct violation reported by panel; attendance recorded in error."
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="cert-modal-actions">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setRevokeModalTarget(null)}
                  disabled={revokeSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="md"
                  disabled={revokeSubmitting || !revokeReason.trim()}
                >
                  {revokeSubmitting ? 'Revoking...' : 'Confirm Revocation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
