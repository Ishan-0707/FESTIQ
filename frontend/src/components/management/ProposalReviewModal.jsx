import React, { useState } from 'react';
import {
  X,
  Building,
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  Users,
  Trophy,
  CheckCircle,
  AlertCircle,
  Send,
  Sparkles,
  MessageSquare,
  FileText,
  User,
  Mail,
  Phone,
  HelpCircle
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import {
  updateProposalStatusAdmin,
  recordCollegeVerificationAdmin,
  recordFeasibilityAdmin,
  publishProposalAdmin
} from '../../services/api';
import { useScrollLock } from '../../hooks/useScrollLock';
import './ProposalReviewModal.css';

const WORKFLOW_STATUSES = [
  'Submitted',
  'Under Review',
  'Awaiting Organizer Information',
  'Awaiting College Approval',
  'Feasibility Review',
  'Approved for Publication',
  'Published',
  'Rejected'
];

export default function ProposalReviewModal({
  isOpen,
  proposal,
  onClose,
  onProposalUpdated,
  onEventPublished
}) {
  useScrollLock(isOpen);
  if (!isOpen || !proposal) return null;

  // Active Tab inside modal: 'overview' | 'college' | 'feasibility' | 'status'
  const [activeTab, setActiveTab] = useState('overview');

  // Status Transition State
  const [targetStatus, setTargetStatus] = useState(proposal.status);
  const [internalNote, setInternalNote] = useState('');
  const [publicUpdateMsg, setPublicUpdateMsg] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState(null);
  const [statusError, setStatusError] = useState(null);

  // College Verification State
  const [collegeStatus, setCollegeStatus] = useState(proposal.collegeVerification?.status || 'Pending');
  const [collegeAuthority, setCollegeAuthority] = useState(proposal.collegeVerification?.authority || '');
  const [collegeDept, setCollegeDept] = useState(proposal.collegeVerification?.department || '');
  const [collegeRemarks, setCollegeRemarks] = useState(proposal.collegeVerification?.remarks || '');
  const [collegeSaving, setCollegeSaving] = useState(false);
  const [collegeSuccess, setCollegeSuccess] = useState(null);
  const [collegeError, setCollegeError] = useState(null);

  // Feasibility State
  const [feasibilityStatus, setFeasibilityStatus] = useState(proposal.feasibilityAssessment?.status || 'Pending');
  const [venueAvailable, setVenueAvailable] = useState(proposal.feasibilityAssessment?.venueAvailable ?? true);
  const [scheduleFeasible, setScheduleFeasible] = useState(proposal.feasibilityAssessment?.scheduleFeasible ?? true);
  const [facilitiesAvailable, setFacilitiesAvailable] = useState(proposal.feasibilityAssessment?.facilitiesAvailable ?? true);
  const [budgetAcceptable, setBudgetAcceptable] = useState(proposal.feasibilityAssessment?.budgetAcceptable ?? true);
  const [feasibilityRemarks, setFeasibilityRemarks] = useState(proposal.feasibilityAssessment?.remarks || '');
  const [feasibilitySaving, setFeasibilitySaving] = useState(false);
  const [feasibilitySuccess, setFeasibilitySuccess] = useState(null);
  const [feasibilityError, setFeasibilityError] = useState(null);

  // Publication State
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(null);
  const [publishError, setPublishError] = useState(null);

  // Check publication gate criteria
  const isCollegeApproved = proposal.collegeVerification?.status === 'Approved';
  const isFeasibilityAcceptable = proposal.feasibilityAssessment?.status === 'Acceptable';
  const isStatusApprovedForPub = proposal.status === 'Approved for Publication';
  const isAlreadyPublished = proposal.status === 'Published' || Boolean(proposal.publishedEventId);
  const canPublish = isCollegeApproved && isFeasibilityAcceptable && isStatusApprovedForPub && !isAlreadyPublished;

  // 1. Handle Status Update
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setStatusUpdating(true);
    setStatusError(null);
    setStatusSuccess(null);

    try {
      const res = await updateProposalStatusAdmin(proposal.id, {
        status: targetStatus,
        note: internalNote.trim(),
        publicUpdate: publicUpdateMsg.trim()
      });

      if (res.success && res.data) {
        setStatusSuccess(`Proposal status successfully updated to "${targetStatus}".`);
        setInternalNote('');
        setPublicUpdateMsg('');
        if (onProposalUpdated) onProposalUpdated(res.data);
      } else {
        setStatusError(res.message || 'Failed to update status');
      }
    } catch (err) {
      setStatusError(err.message || 'Status transition error');
    } finally {
      setStatusUpdating(false);
    }
  };

  // 2. Handle College Verification
  const handleSaveCollegeVerification = async (e) => {
    e.preventDefault();
    setCollegeSaving(true);
    setCollegeError(null);
    setCollegeSuccess(null);

    try {
      const res = await recordCollegeVerificationAdmin(proposal.id, {
        status: collegeStatus,
        authority: collegeAuthority.trim(),
        department: collegeDept.trim(),
        verifiedDate: new Date().toISOString().slice(0, 10),
        remarks: collegeRemarks.trim()
      });

      if (res.success && res.data) {
        setCollegeSuccess(`College verification recorded as "${collegeStatus}".`);
        if (onProposalUpdated) onProposalUpdated(res.data);
      } else {
        setCollegeError(res.message || 'Failed to record college verification');
      }
    } catch (err) {
      setCollegeError(err.message || 'College verification error');
    } finally {
      setCollegeSaving(false);
    }
  };

  // 3. Handle Feasibility Assessment
  const handleSaveFeasibility = async (e) => {
    e.preventDefault();
    setFeasibilitySaving(true);
    setFeasibilityError(null);
    setFeasibilitySuccess(null);

    try {
      const res = await recordFeasibilityAdmin(proposal.id, {
        status: feasibilityStatus,
        venueAvailable,
        scheduleFeasible,
        facilitiesAvailable,
        budgetAcceptable,
        remarks: feasibilityRemarks.trim()
      });

      if (res.success && res.data) {
        setFeasibilitySuccess(`Feasibility assessment recorded as "${feasibilityStatus}".`);
        if (onProposalUpdated) onProposalUpdated(res.data);
      } else {
        setFeasibilityError(res.message || 'Failed to record feasibility assessment');
      }
    } catch (err) {
      setFeasibilityError(err.message || 'Feasibility recording error');
    } finally {
      setFeasibilitySaving(false);
    }
  };

  // 4. Handle Publish
  const handlePublishToCatalogue = async () => {
    if (!canPublish) return;
    setPublishing(true);
    setPublishError(null);
    setPublishSuccess(null);

    try {
      const res = await publishProposalAdmin(proposal.id);
      if (res.success && res.data) {
        setPublishSuccess('Event successfully published to the live FESTIQ catalogue!');
        if (onProposalUpdated) onProposalUpdated(res.data);
        if (onEventPublished) onEventPublished(res.data);
      } else {
        setPublishError(res.message || 'Publication failed');
      }
    } catch (err) {
      setPublishError(err.message || 'Publication execution error');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="proposal-modal-backdrop" onClick={onClose}>
      <div className="proposal-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="proposal-modal-header">
          <div className="header-meta">
            <span className="proposal-id-badge">{proposal.id}</span>
            <h2 className="proposal-modal-title">{proposal.event?.title}</h2>
            <div className="proposal-modal-subtitle">
              Submitted by <strong>{proposal.organizer?.name}</strong> ({proposal.organizer?.organization}) on{' '}
              {new Date(proposal.createdAt).toLocaleDateString()}
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="proposal-modal-nav">
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <FileText size={16} />
            <span>Specifications & Logistics</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'college' ? 'active' : ''}`}
            onClick={() => setActiveTab('college')}
          >
            <Building size={16} />
            <span>
              College Verification ({proposal.collegeVerification?.status || 'Pending'})
            </span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'feasibility' ? 'active' : ''}`}
            onClick={() => setActiveTab('feasibility')}
          >
            <ShieldCheck size={16} />
            <span>
              Feasibility Assessment ({proposal.feasibilityAssessment?.status || 'Pending'})
            </span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            <MessageSquare size={16} />
            <span>Workflow & Public Notices</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="proposal-modal-body">
          {/* ============================================================== */}
          {/* TAB 1: OVERVIEW & SPECIFICATIONS */}
          {/* ============================================================== */}
          {activeTab === 'overview' && (
            <div className="tab-pane-overview">
              <div className="spec-card">
                <h4 className="spec-card-title"><User size={16} /> Organizer & Department</h4>
                <div className="spec-grid">
                  <div><span className="spec-label">Full Name:</span> {proposal.organizer?.name}</div>
                  <div><span className="spec-label">Email:</span> {proposal.organizer?.email}</div>
                  <div><span className="spec-label">Phone:</span> {proposal.organizer?.phone}</div>
                  <div><span className="spec-label">Organization:</span> {proposal.organizer?.organization}</div>
                  <div><span className="spec-label">Role:</span> {proposal.organizer?.role}</div>
                  <div>
                    <span className="spec-label">Faculty Mentor:</span>{' '}
                    {proposal.organizer?.facultyCoordinatorName || 'None listed'}
                  </div>
                </div>
              </div>

              <div className="spec-card">
                <h4 className="spec-card-title"><Calendar size={16} /> Event Details</h4>
                <div className="spec-grid">
                  <div><span className="spec-label">Category:</span> {proposal.event?.category}</div>
                  <div><span className="spec-label">Date:</span> {proposal.event?.date}</div>
                  <div><span className="spec-label">Time Window:</span> {proposal.event?.time}</div>
                  <div><span className="spec-label">Venue:</span> {proposal.event?.venue}</div>
                  <div><span className="spec-label">Capacity:</span> {proposal.event?.capacity} seats</div>
                  <div><span className="spec-label">Expected:</span> {proposal.event?.expectedParticipants} attendees</div>
                  <div><span className="spec-label">Team Size:</span> {proposal.event?.teamSize || 1} members</div>
                  <div><span className="spec-label">Prize Pool:</span> ₹{Number(proposal.event?.prizeAmount || 0).toLocaleString('en-IN')}</div>
                </div>
                {proposal.event?.tagline && (
                  <div className="spec-row-full">
                    <span className="spec-label">Tagline:</span> <em>"{proposal.event.tagline}"</em>
                  </div>
                )}
                <div className="spec-row-full">
                  <span className="spec-label">Overview:</span>
                  <p className="spec-text-block">{proposal.event?.description}</p>
                </div>
                {proposal.event?.fullDescription && (
                  <div className="spec-row-full">
                    <span className="spec-label">Full Agenda & Rules:</span>
                    <p className="spec-text-block">{proposal.event.fullDescription}</p>
                  </div>
                )}
              </div>

              <div className="spec-card">
                <h4 className="spec-card-title"><Building size={16} /> Institutional Facilities & Purpose</h4>
                <div className="spec-row-full">
                  <span className="spec-label">Educational Purpose / Campus Benefit:</span>
                  <p className="spec-text-block">{proposal.institutional?.purpose || 'N/A'}</p>
                </div>
                <div className="spec-row-full">
                  <span className="spec-label">Facilities & Tech Required:</span>
                  <p className="spec-text-block">{proposal.institutional?.facilitiesRequired || 'Standard room'}</p>
                </div>
                <div className="spec-grid">
                  <div>
                    <span className="spec-label">Estimated Budget:</span>{' '}
                    {proposal.institutional?.estimatedBudget || 'Not specified'}
                  </div>
                  <div>
                    <span className="spec-label">Prior Faculty Discussion:</span>{' '}
                    {proposal.institutional?.priorFacultyDiscussion || 'Not yet discussed'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: COLLEGE VERIFICATION */}
          {/* ============================================================== */}
          {activeTab === 'college' && (
            <form onSubmit={handleSaveCollegeVerification} className="tab-pane-form">
              <div className="pane-intro">
                <h4>Institutional Sanction & Department Verification</h4>
                <p>
                  Record formal faculty mentor sponsorship or college dean approval. College verification is a mandatory precondition before any event can be published to the public catalogue.
                </p>
              </div>

              {collegeSuccess && (
                <div className="pane-alert alert-success">
                  <CheckCircle size={18} />
                  <span>{collegeSuccess}</span>
                </div>
              )}

              {collegeError && (
                <div className="pane-alert alert-error">
                  <AlertCircle size={18} />
                  <span>{collegeError}</span>
                </div>
              )}

              <div className="form-group">
                <label>Verification Decision <span className="req">*</span></label>
                <select
                  value={collegeStatus}
                  onChange={(e) => setCollegeStatus(e.target.value)}
                  required
                >
                  <option value="Pending">Pending Verification</option>
                  <option value="Approved">Approved (Official Sanction Granted)</option>
                  <option value="Rejected">Rejected (Not Approved by College)</option>
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Approving Authority / Faculty Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. S. K. Rath, Head of Department"
                    value={collegeAuthority}
                    onChange={(e) => setCollegeAuthority(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>College Department / School</label>
                  <input
                    type="text"
                    placeholder="e.g. School of Computer Engineering"
                    value={collegeDept}
                    onChange={(e) => setCollegeDept(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Verification Remarks / Ref Dispatch Number</label>
                <textarea
                  rows={3}
                  placeholder="Record formal dispatch reference, meeting dates, or conditions of approval..."
                  value={collegeRemarks}
                  onChange={(e) => setCollegeRemarks(e.target.value)}
                />
              </div>

              <div className="pane-actions">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={collegeSaving}
                  icon={<CheckCircle size={16} />}
                >
                  {collegeSaving ? 'Saving Verification...' : 'Record College Verification'}
                </Button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* TAB 3: FEASIBILITY ASSESSMENT */}
          {/* ============================================================== */}
          {activeTab === 'feasibility' && (
            <form onSubmit={handleSaveFeasibility} className="tab-pane-form">
              <div className="pane-intro">
                <h4>Operational & Logistical Feasibility Assessment</h4>
                <p>
                  Assess physical space availability, audio-visual technical feasibility, schedule conflicts, and equipment availability.
                </p>
              </div>

              {feasibilitySuccess && (
                <div className="pane-alert alert-success">
                  <CheckCircle size={18} />
                  <span>{feasibilitySuccess}</span>
                </div>
              )}

              {feasibilityError && (
                <div className="pane-alert alert-error">
                  <AlertCircle size={18} />
                  <span>{feasibilityError}</span>
                </div>
              )}

              <div className="form-group">
                <label>Overall Feasibility Status <span className="req">*</span></label>
                <select
                  value={feasibilityStatus}
                  onChange={(e) => setFeasibilityStatus(e.target.value)}
                  required
                >
                  <option value="Pending">Pending Assessment</option>
                  <option value="Acceptable">Acceptable (All logistical criteria satisfied)</option>
                  <option value="Unacceptable">Unacceptable (Venue/resource conflict)</option>
                </select>
              </div>

              <div className="feasibility-checks-grid">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={venueAvailable}
                    onChange={(e) => setVenueAvailable(e.target.checked)}
                  />
                  <span>Venue Available on Requested Date</span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={scheduleFeasible}
                    onChange={(e) => setScheduleFeasible(e.target.checked)}
                  />
                  <span>No Timetable / Examination Clashes</span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={facilitiesAvailable}
                    onChange={(e) => setFacilitiesAvailable(e.target.checked)}
                  />
                  <span>AV & Power Facilities Accessible</span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={budgetAcceptable}
                    onChange={(e) => setBudgetAcceptable(e.target.checked)}
                  />
                  <span>Budget Allocation / Funding Feasible</span>
                </label>
              </div>

              <div className="form-group">
                <label>Feasibility Review Remarks</label>
                <textarea
                  rows={3}
                  placeholder="Notes on acoustic capacity, lab reservations, electrical load requirements, or security arrangements..."
                  value={feasibilityRemarks}
                  onChange={(e) => setFeasibilityRemarks(e.target.value)}
                />
              </div>

              <div className="pane-actions">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={feasibilitySaving}
                  icon={<ShieldCheck size={16} />}
                >
                  {feasibilitySaving ? 'Saving Assessment...' : 'Record Feasibility Assessment'}
                </Button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* TAB 4: WORKFLOW STATUS & NOTICES */}
          {/* ============================================================== */}
          {activeTab === 'status' && (
            <div className="tab-pane-status">
              <form onSubmit={handleUpdateStatus} className="status-update-form">
                <div className="pane-intro">
                  <h4>Workflow Progression & Status Transition</h4>
                  <p>
                    Update the proposal state across the 8 lifecycle stages. Public updates will be visible to the organizer on their tracking dashboard, while internal notes remain confidential.
                  </p>
                </div>

                {statusSuccess && (
                  <div className="pane-alert alert-success">
                    <CheckCircle size={18} />
                    <span>{statusSuccess}</span>
                  </div>
                )}

                {statusError && (
                  <div className="pane-alert alert-error">
                    <AlertCircle size={18} />
                    <span>{statusError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label>Change Workflow Status</label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    required
                  >
                    {WORKFLOW_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Public Organizer Update Notice{' '}
                    <span className="field-hint">(Visible to organizer via tracking token)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. We have reviewed your initial proposal. Please provide a revised itinerary and AV requirements..."
                    value={publicUpdateMsg}
                    onChange={(e) => setPublicUpdateMsg(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Internal Management Note{' '}
                    <span className="field-hint">(Strictly confidential; visible only to managers)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Spoke with Dr. Panda, need to check if Campus 6 auditorium has scheduled maintenance on this date..."
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                  />
                </div>

                <div className="pane-actions">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={statusUpdating}
                    icon={<Send size={16} />}
                  >
                    {statusUpdating ? 'Updating Status...' : 'Apply Status Transition'}
                  </Button>
                </div>
              </form>

              {/* Review History Log */}
              {proposal.reviewHistory && proposal.reviewHistory.length > 0 && (
                <div className="history-log-box">
                  <h5>Audit & Review History</h5>
                  <div className="history-entries">
                    {proposal.reviewHistory.map((h, i) => (
                      <div key={h.id || i} className="history-entry">
                        <span className="history-time">{new Date(h.timestamp).toLocaleString()}</span>
                        <span className="history-actor">[{h.actor || 'System'}]</span>
                        <span className="history-status">{h.fromStatus ? `${h.fromStatus} → ` : ''}{h.toStatus}</span>
                        {h.note && <span className="history-note">"{h.note}"</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer with Publication Action Gate */}
        <div className="proposal-modal-footer">
          <div className="publication-status-summary">
            <span className="pub-gate-pill">
              College: <strong className={isCollegeApproved ? 'pass' : 'fail'}>{proposal.collegeVerification?.status || 'Pending'}</strong>
            </span>
            <span className="pub-gate-pill">
              Feasibility: <strong className={isFeasibilityAcceptable ? 'pass' : 'fail'}>{proposal.feasibilityAssessment?.status || 'Pending'}</strong>
            </span>
            <span className="pub-gate-pill">
              Status: <strong className={isStatusApprovedForPub ? 'pass' : 'fail'}>{proposal.status}</strong>
            </span>
          </div>

          <div className="footer-action-buttons">
            <Button variant="ghost" size="md" onClick={onClose}>
              Close
            </Button>

            {isAlreadyPublished ? (
              <Button variant="success" size="md" disabled icon={<Sparkles size={16} />}>
                Published to Catalogue
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                disabled={!canPublish || publishing}
                onClick={handlePublishToCatalogue}
                icon={<Sparkles size={16} />}
                title={
                  !canPublish
                    ? 'Requires: College Approved, Feasibility Acceptable, and status set to "Approved for Publication"'
                    : 'Publish event live to FESTIQ catalogue'
                }
              >
                {publishing ? 'Publishing...' : 'Publish to Live Catalogue'}
              </Button>
            )}
          </div>
        </div>

        {/* Publish Alerts */}
        {publishSuccess && (
          <div className="publish-modal-alert alert-success">
            <CheckCircle size={18} />
            <span>{publishSuccess}</span>
          </div>
        )}
        {publishError && (
          <div className="publish-modal-alert alert-error">
            <AlertCircle size={18} />
            <span>{publishError}</span>
          </div>
        )}
      </div>
    </div>
  );
}

