import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Send,
  Copy,
  Check,
  Building,
  Calendar,
  MapPin,
  Users,
  Award,
  Sparkles,
  Info,
  ArrowRight,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import {
  submitEventProposal,
  trackProposalStatus,
  submitProposalClarification
} from '../services/api';
import './HostEventPage.css';

const CATEGORIES = [
  'Technical',
  'Cultural',
  'Gaming',
  'Workshops',
  'Management',
  'Sports'
];

export default function HostEventPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'track'

  // Submission Form State
  const [formData, setFormData] = useState({
    organizerName: '',
    email: '',
    phone: '',
    organization: '',
    role: 'Lead Organizer',
    facultyCoordinatorName: '',
    facultyCoordinatorContact: '',
    title: '',
    category: 'Technical',
    tagline: '',
    description: '',
    fullDescription: '',
    date: '',
    time: '10:00 AM - 04:00 PM',
    venue: '',
    expectedParticipants: 100,
    capacity: 150,
    teamSize: 1,
    prizeAmount: 0,
    sponsorshipNeeds: '',
    imageUrl: '',
    purpose: '',
    facilitiesRequired: '',
    estimatedBudget: '',
    priorFacultyDiscussion: 'In Discussion with Faculty',
    managementNotes: '',
    agreeDeclaration: false
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);

  // Tracking State
  const [trackProposalId, setTrackProposalId] = useState('');
  const [trackToken, setTrackToken] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackError, setTrackError] = useState(null);
  const [proposalData, setProposalData] = useState(null);

  // Clarification State
  const [clarificationText, setClarificationText] = useState('');
  const [clarificationSubmitting, setClarificationSubmitting] = useState(false);
  const [clarificationSuccess, setClarificationSuccess] = useState(null);
  const [clarificationError, setClarificationError] = useState(null);

  // Copied State for tracking credentials
  const [copiedId, setCopiedId] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // Parse URL hash for tracking credentials safely (e.g. #ref=PROP-2026-XYZ&token=abc)
  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        const params = new URLSearchParams(hash);
        const ref = params.get('ref') || params.get('proposalId');
        const token = params.get('token');
        if (ref) {
          setTrackProposalId(ref);
          if (token) {
            setTrackToken(token);
            setActiveTab('track');
            // Auto-trigger status fetch
            performTracking(ref, token);
          } else {
            setActiveTab('track');
          }
        }
      }
    };

    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.agreeDeclaration) {
      setSubmitError('You must accept the institutional review and non-guarantee declaration to submit a proposal.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        organizerName: formData.organizerName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        organization: formData.organization.trim(),
        role: formData.role.trim(),
        facultyCoordinatorName: formData.facultyCoordinatorName.trim(),
        facultyCoordinatorContact: formData.facultyCoordinatorContact.trim(),
        title: formData.title.trim(),
        category: formData.category,
        tagline: formData.tagline.trim(),
        description: formData.description.trim(),
        fullDescription: formData.fullDescription.trim(),
        date: formData.date,
        time: formData.time.trim(),
        venue: formData.venue.trim(),
        expectedParticipants: parseInt(formData.expectedParticipants, 10) || 50,
        capacity: parseInt(formData.capacity, 10) || 100,
        teamSize: parseInt(formData.teamSize, 10) || 1,
        prizeAmount: parseInt(formData.prizeAmount, 10) || 0,
        sponsorshipNeeds: formData.sponsorshipNeeds.trim(),
        imageUrl: formData.imageUrl.trim(),
        purpose: formData.purpose.trim(),
        facilitiesRequired: formData.facilitiesRequired.trim(),
        estimatedBudget: formData.estimatedBudget.trim(),
        priorFacultyDiscussion: formData.priorFacultyDiscussion,
        managementNotes: formData.managementNotes.trim()
      };

      const res = await submitEventProposal(payload);
      if (res.success && res.data) {
        setSubmissionSuccess(res.data);
        toast.success('Event proposal submitted for institutional review!');
      } else {
        const msg = res.message || 'Submission failed';
        setSubmitError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.message || 'Failed to submit proposal';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const performTracking = async (id, token) => {
    const pId = (id || trackProposalId).trim();
    const pTok = (token || trackToken).trim();

    if (!pId || !pTok) {
      setTrackError('Please provide both the Proposal Reference ID and Secret Tracking Token.');
      return;
    }

    setTrackingLoading(true);
    setTrackError(null);
    setProposalData(null);
    setClarificationSuccess(null);
    setClarificationError(null);

    try {
      const res = await trackProposalStatus({
        proposalId: pId,
        trackingToken: pTok
      });

      if (res.success && res.data) {
        setProposalData(res.data);
      } else {
        setTrackError(res.message || 'Could not verify proposal tracking credentials');
      }
    } catch (err) {
      setTrackError(err.message || 'Invalid Proposal Reference ID or Secret Tracking Token');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    performTracking();
  };

  const handleSubmitClarification = async (e) => {
    e.preventDefault();
    if (!clarificationText.trim()) {
      setClarificationError('Please write your response or provide the requested information.');
      return;
    }

    setClarificationSubmitting(true);
    setClarificationError(null);
    setClarificationSuccess(null);

    try {
      const res = await submitProposalClarification({
        proposalId: proposalData.id,
        trackingToken: trackToken.trim(),
        clarificationText: clarificationText.trim()
      });

      if (res.success && res.data) {
        setClarificationSuccess('Clarification submitted successfully! Your proposal has returned to Under Review status.');
        toast.success('Clarification submitted to management.');
        setClarificationText('');
        // Update local proposal view
        setProposalData(res.data);
      } else {
        const msg = res.message || 'Failed to submit clarification';
        setClarificationError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.message || 'Failed to submit clarification';
      setClarificationError(msg);
      toast.error(msg);
    } finally {
      setClarificationSubmitting(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      toast.info('Proposal Reference ID copied to clipboard');
      setTimeout(() => setCopiedId(false), 2000);
    } else if (type === 'token') {
      setCopiedToken(true);
      toast.info('Secret Tracking Token copied to clipboard');
      setTimeout(() => setCopiedToken(false), 2000);
    } else if (type === 'all') {
      setCopiedAll(true);
      toast.info('All tracking credentials copied to clipboard');
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  const handleGoToTrackingFromSuccess = () => {
    if (submissionSuccess) {
      setTrackProposalId(submissionSuccess.proposalId);
      setTrackToken(submissionSuccess.trackingToken);
      setActiveTab('track');
      performTracking(submissionSuccess.proposalId, submissionSuccess.trackingToken);
      setSubmissionSuccess(null);
    }
  };

  // Helper for status badge variant
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Submitted':
        return <Badge variant="primary" icon={<Clock size={13} />}>Submitted</Badge>;
      case 'Under Review':
        return <Badge variant="warning" icon={<Clock size={13} />}>Under Review</Badge>;
      case 'Awaiting Organizer Information':
        return <Badge variant="danger" icon={<AlertCircle size={13} />}>Awaiting Clarification</Badge>;
      case 'Awaiting College Approval':
        return <Badge variant="warning" icon={<Building size={13} />}>College Approval Review</Badge>;
      case 'Feasibility Review':
        return <Badge variant="info" icon={<ShieldCheck size={13} />}>Feasibility Assessment</Badge>;
      case 'Approved for Publication':
        return <Badge variant="success" icon={<CheckCircle size={13} />}>Approved for Publication</Badge>;
      case 'Published':
        return <Badge variant="success" icon={<Sparkles size={13} />}>Published to Catalogue</Badge>;
      case 'Rejected':
        return <Badge variant="neutral" icon={<AlertCircle size={13} />}>Not Approved</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="host-event-page page-entrance">
      {/* Hero Header */}
      <div className="host-event-hero">
        <div className="host-event-hero-badge">
          <Sparkles size={16} />
          <span>FESTIQ Campus Events Portal</span>
        </div>
        <h1 className="host-event-title">Host an Event at FESTIQ</h1>
        <p className="host-event-subtitle">
          Propose your student club, society, or department event. Every proposal undergoes institutional verification, college feasibility assessment, and publication scheduling.
        </p>

        {/* Tab Switcher */}
        <div className="host-event-tabs">
          <button
            type="button"
            className={`host-event-tab-btn ${activeTab === 'submit' ? 'active' : ''}`}
            onClick={() => setActiveTab('submit')}
          >
            <FileText size={18} />
            <span>Submit Proposal</span>
          </button>
          <button
            type="button"
            className={`host-event-tab-btn ${activeTab === 'track' ? 'active' : ''}`}
            onClick={() => setActiveTab('track')}
          >
            <Search size={18} />
            <span>Track Existing Proposal</span>
          </button>
        </div>
      </div>

      <div className="host-event-content-container">
        {/* ============================================================== */}
        {/* TAB 1: SUBMIT EVENT PROPOSAL */}
        {/* ============================================================== */}
        {activeTab === 'submit' && (
          <div className="host-event-form-wrapper">
            {/* Success Modal / Banner */}
            {submissionSuccess ? (
              <div className="host-event-success-card">
                <div className="success-icon-wrapper">
                  <CheckCircle size={48} className="success-icon" />
                </div>
                <h2>Proposal Successfully Submitted!</h2>
                <p className="success-description">
                  Your event proposal has been logged with the FESTIQ management desk and assigned to the institutional review queue.
                </p>

                <div className="credentials-vault">
                  <div className="vault-header">
                    <ShieldCheck size={20} />
                    <span>Important: Save Your Tracking Credentials</span>
                  </div>
                  <p className="vault-subtext">
                    For institutional security, your secret tracking token is hashed and cannot be recovered if lost. Please store these details securely to track review updates or respond to management clarifications.
                  </p>

                  <div className="credential-row">
                    <div className="credential-label">Proposal Reference ID:</div>
                    <div className="credential-value-box">
                      <code>{submissionSuccess.proposalId}</code>
                      <button
                        type="button"
                        className="copy-btn"
                        onClick={() => copyToClipboard(submissionSuccess.proposalId, 'id')}
                        title="Copy Reference ID"
                      >
                        {copiedId ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="credential-row">
                    <div className="credential-label">Secret Tracking Token:</div>
                    <div className="credential-value-box">
                      <code>{submissionSuccess.trackingToken}</code>
                      <button
                        type="button"
                        className="copy-btn"
                        onClick={() => copyToClipboard(submissionSuccess.trackingToken, 'token')}
                        title="Copy Secret Token"
                      >
                        {copiedToken ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="vault-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          `FESTIQ Event Proposal Credentials\nReference ID: ${submissionSuccess.proposalId}\nSecret Token: ${submissionSuccess.trackingToken}\nTracking URL: ${window.location.origin}/host-event#ref=${submissionSuccess.proposalId}&token=${submissionSuccess.trackingToken}`,
                          'all'
                        )
                      }
                      icon={copiedAll ? <Check size={16} /> : <Copy size={16} />}
                    >
                      {copiedAll ? 'Credentials Copied!' : 'Copy All Credentials'}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleGoToTrackingFromSuccess}
                      icon={<ArrowRight size={16} />}
                    >
                      Track Proposal Status
                    </Button>
                  </div>
                </div>

                <div className="success-next-steps">
                  <h4>What happens next?</h4>
                  <ul>
                    <li><strong>1. Management Triage:</strong> The FESTIQ event desk reviews your event specifications.</li>
                    <li><strong>2. College Department Verification:</strong> Formal college approval and faculty sponsorship are verified.</li>
                    <li><strong>3. Feasibility Assessment:</strong> Campus venue availability, schedule clashes, and audio-visual needs are checked.</li>
                    <li><strong>4. Catalogue Publication:</strong> Once fully approved, your event goes live on the FESTIQ public catalogue!</li>
                  </ul>
                </div>

                <div className="success-footer-actions">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSubmissionSuccess(null);
                      setFormData({
                        organizerName: '',
                        email: '',
                        phone: '',
                        organization: '',
                        role: 'Lead Organizer',
                        facultyCoordinatorName: '',
                        facultyCoordinatorContact: '',
                        title: '',
                        category: 'Technical',
                        tagline: '',
                        description: '',
                        fullDescription: '',
                        date: '',
                        time: '10:00 AM - 04:00 PM',
                        venue: '',
                        expectedParticipants: 100,
                        capacity: 150,
                        teamSize: 1,
                        prizeAmount: 0,
                        sponsorshipNeeds: '',
                        imageUrl: '',
                        purpose: '',
                        facilitiesRequired: '',
                        estimatedBudget: '',
                        priorFacultyDiscussion: 'In Discussion with Faculty',
                        managementNotes: '',
                        agreeDeclaration: false
                      });
                    }}
                  >
                    Submit Another Proposal
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitProposal} className="host-event-form">
                {submitError && (
                  <div className="form-alert form-alert-error">
                    <AlertCircle size={20} />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Section 1: Organizer Information */}
                <div className="form-section">
                  <div className="form-section-header">
                    <div className="section-number">1</div>
                    <div className="section-title-wrap">
                      <h3>Organizer & Leadership Details</h3>
                      <p>Identify yourself and the primary society, club, or department organizing the event.</p>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label htmlFor="organizerName">Organizer Full Name <span className="req">*</span></label>
                      <input
                        type="text"
                        id="organizerName"
                        name="organizerName"
                        required
                        placeholder="e.g. Priyanshu Mohanty"
                        value={formData.organizerName}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="email">Organizer Email Address <span className="req">*</span></label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        placeholder="e.g. demo.student@kiit.ac.in"
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-grid-3">
                    <div className="form-group">
                      <label htmlFor="phone">Contact Phone Number <span className="req">*</span></label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        required
                        placeholder="e.g. 9876543210"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="organization">Organization / Club / Society <span className="req">*</span></label>
                      <input
                        type="text"
                        id="organization"
                        name="organization"
                        required
                        placeholder="e.g. KIIT Robotics Society (KRS)"
                        value={formData.organization}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="role">Organizer Role / Designation</label>
                      <input
                        type="text"
                        id="role"
                        name="role"
                        placeholder="e.g. Lead Organizer / General Secretary"
                        value={formData.role}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label htmlFor="facultyCoordinatorName">Faculty Coordinator Name (Optional)</label>
                      <input
                        type="text"
                        id="facultyCoordinatorName"
                        name="facultyCoordinatorName"
                        placeholder="e.g. Dr. A. K. Nayak"
                        value={formData.facultyCoordinatorName}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="facultyCoordinatorContact">Faculty Coordinator Contact / Dept (Optional)</label>
                      <input
                        type="text"
                        id="facultyCoordinatorContact"
                        name="facultyCoordinatorContact"
                        placeholder="e.g. School of Computer Engineering / ext 4022"
                        value={formData.facultyCoordinatorContact}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Event Specifications */}
                <div className="form-section">
                  <div className="form-section-header">
                    <div className="section-number">2</div>
                    <div className="section-title-wrap">
                      <h3>Event Specifications & Logistics</h3>
                      <p>Provide core schedule, venue preferences, audience capacity, and event details.</p>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label htmlFor="title">Proposed Event Title <span className="req">*</span></label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        required
                        placeholder="e.g. Robowars 2026: Battle of the Bots"
                        value={formData.title}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="category">Category <span className="req">*</span></label>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="tagline">Event Tagline / Summary Hook</label>
                    <input
                      type="text"
                      id="tagline"
                      name="tagline"
                      placeholder="e.g. High-torque combat robotics championship at Campus 6"
                      value={formData.tagline}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="description">Event Overview & Description <span className="req">*</span></label>
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      required
                      placeholder="Provide a concise description of the competition rounds, format, and participation criteria..."
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="fullDescription">Full Agenda, Schedule & Rules (Optional)</label>
                    <textarea
                      id="fullDescription"
                      name="fullDescription"
                      rows={4}
                      placeholder="Detailed itinerary, safety guidelines, judging criteria, and scoring rubrics..."
                      value={formData.fullDescription}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-grid-3">
                    <div className="form-group">
                      <label htmlFor="date">Preferred Event Date <span className="req">*</span></label>
                      <input
                        type="date"
                        id="date"
                        name="date"
                        required
                        value={formData.date}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="time">Preferred Time Window <span className="req">*</span></label>
                      <input
                        type="text"
                        id="time"
                        name="time"
                        required
                        placeholder="e.g. 10:00 AM - 04:00 PM"
                        value={formData.time}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="venue">Preferred Campus Venue <span className="req">*</span></label>
                      <input
                        type="text"
                        id="venue"
                        name="venue"
                        required
                        placeholder="e.g. Campus 6 Auditorium / Lab Complex"
                        value={formData.venue}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-grid-4">
                    <div className="form-group">
                      <label htmlFor="capacity">Max Capacity <span className="req">*</span></label>
                      <input
                        type="number"
                        id="capacity"
                        name="capacity"
                        required
                        min="10"
                        max="2000"
                        value={formData.capacity}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="expectedParticipants">Expected Turnout</label>
                      <input
                        type="number"
                        id="expectedParticipants"
                        name="expectedParticipants"
                        min="1"
                        value={formData.expectedParticipants}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="teamSize">Team Size</label>
                      <input
                        type="number"
                        id="teamSize"
                        name="teamSize"
                        min="1"
                        max="20"
                        value={formData.teamSize}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="prizeAmount">Prize Pool (₹)</label>
                      <input
                        type="number"
                        id="prizeAmount"
                        name="prizeAmount"
                        min="0"
                        step="500"
                        placeholder="0"
                        value={formData.prizeAmount}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label htmlFor="imageUrl">Poster / Banner Image URL</label>
                      <input
                        type="url"
                        id="imageUrl"
                        name="imageUrl"
                        placeholder="https://images.unsplash.com/... (sensible default will be applied if blank)"
                        value={formData.imageUrl}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="sponsorshipNeeds">Sponsorship / External Partners</label>
                      <input
                        type="text"
                        id="sponsorshipNeeds"
                        name="sponsorshipNeeds"
                        placeholder="e.g. Industry sponsor, certificates partner"
                        value={formData.sponsorshipNeeds}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Institutional Review & Facilities */}
                <div className="form-section">
                  <div className="form-section-header">
                    <div className="section-number">3</div>
                    <div className="section-title-wrap">
                      <h3>Institutional Review & Operational Needs</h3>
                      <p>Specify college facility requirements, budget allocations, and educational impact.</p>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label htmlFor="purpose">Educational / Cultural Purpose & Campus Benefit <span className="req">*</span></label>
                      <textarea
                        id="purpose"
                        name="purpose"
                        rows={2}
                        required
                        placeholder="How will this event benefit KIIT students? (e.g. Practical hands-on robotics engineering experience...)"
                        value={formData.purpose}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="facilitiesRequired">Facilities & Equipment Required <span className="req">*</span></label>
                      <textarea
                        id="facilitiesRequired"
                        name="facilitiesRequired"
                        rows={2}
                        required
                        placeholder="e.g. High-power 220V electric lines, AV projectors, stage audio, sound mixers, 50 lab workstations..."
                        value={formData.facilitiesRequired}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label htmlFor="estimatedBudget">Estimated Budget & Funding</label>
                      <input
                        type="text"
                        id="estimatedBudget"
                        name="estimatedBudget"
                        placeholder="e.g. ₹25,000 (Department funded + Club treasury)"
                        value={formData.estimatedBudget}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="priorFacultyDiscussion">Prior Discussion with Faculty / Department</label>
                      <select
                        id="priorFacultyDiscussion"
                        name="priorFacultyDiscussion"
                        value={formData.priorFacultyDiscussion}
                        onChange={handleInputChange}
                      >
                        <option value="Formal Approval Obtained">Formal Written Approval Obtained</option>
                        <option value="In Discussion with Faculty">In Discussion with Faculty / Society Mentor</option>
                        <option value="Not yet discussed">Not yet discussed (Requesting initial review)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="managementNotes">Additional Notes for FESTIQ Review Committee</label>
                    <textarea
                      id="managementNotes"
                      name="managementNotes"
                      rows={2}
                      placeholder="Any specific scheduling restrictions, VIP guest invitations, or security considerations..."
                      value={formData.managementNotes}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Section 4: Declaration & Terms */}
                <div className="form-declaration-box">
                  <div className="declaration-header">
                    <Info size={18} />
                    <span>Non-Guarantee Institutional Review Declaration</span>
                  </div>
                  <p className="declaration-text">
                    Submitting this proposal does not guarantee inclusion in the FESTIQ public catalogue or official college scheduling approval. All proposals undergo institutional review, faculty verification, and operational feasibility assessment. Events that do not meet safety, academic, or logistical requirements may be rejected or returned for clarification.
                  </p>
                  <label className="declaration-checkbox-label">
                    <input
                      type="checkbox"
                      name="agreeDeclaration"
                      checked={formData.agreeDeclaration}
                      onChange={handleInputChange}
                      required
                    />
                    <span>
                      I declare that all information provided is accurate and adheres to university codes of conduct and event policies.
                    </span>
                  </label>
                </div>

                <div className="form-submit-row">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={submitting || !formData.agreeDeclaration}
                    icon={<Send size={18} />}
                  >
                    {submitting ? 'Submitting Proposal...' : 'Submit Event Proposal'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: TRACK EXISTING PROPOSAL */}
        {/* ============================================================== */}
        {activeTab === 'track' && (
          <div className="host-event-track-wrapper">
            {/* Tracking Search Card */}
            <div className="track-search-card">
              <div className="track-search-header">
                <Search size={22} />
                <div>
                  <h3>Track Proposal Status</h3>
                  <p>Enter your Reference ID and Secret Tracking Token to view institutional review updates.</p>
                </div>
              </div>

              <form onSubmit={handleTrackSubmit} className="track-search-form">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="trackProposalId">Proposal Reference ID</label>
                    <input
                      type="text"
                      id="trackProposalId"
                      placeholder="e.g. PROP-2026-A1B2C3"
                      value={trackProposalId}
                      onChange={(e) => setTrackProposalId(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="trackToken">Secret Tracking Token</label>
                    <input
                      type="text"
                      id="trackToken"
                      placeholder="Enter 32-character secret hex token"
                      value={trackToken}
                      onChange={(e) => setTrackToken(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="track-submit-btn-wrap">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={trackingLoading}
                    icon={<Search size={16} />}
                  >
                    {trackingLoading ? 'Verifying Credentials...' : 'Check Status'}
                  </Button>
                </div>
              </form>

              {trackError && (
                <div className="form-alert form-alert-error" style={{ marginTop: '16px' }}>
                  <AlertCircle size={20} />
                  <span>{trackError}</span>
                </div>
              )}
            </div>

            {/* Proposal Details View (Rendered once token is verified) */}
            {proposalData && (
              <div className="proposal-status-result-card">
                {/* Result Header */}
                <div className="proposal-result-header">
                  <div>
                    <div className="proposal-id-tag">Reference: {proposalData.id}</div>
                    <h2 className="proposal-event-title">{proposalData.event?.title}</h2>
                    <div className="proposal-meta-pills">
                      <span className="meta-pill"><Building size={14} /> {proposalData.organizer?.organization}</span>
                      <span className="meta-pill"><Calendar size={14} /> {proposalData.event?.date}</span>
                      <span className="meta-pill"><MapPin size={14} /> {proposalData.event?.venue}</span>
                      <span className="meta-pill"><Users size={14} /> Cap: {proposalData.event?.capacity}</span>
                    </div>
                  </div>
                  <div className="proposal-status-badge-wrap">
                    {getStatusBadge(proposalData.status)}
                  </div>
                </div>

                {/* Status Pipeline Visualizer */}
                <div className="status-pipeline-box">
                  <div className="pipeline-title">Institutional Approval Progression</div>
                  <div className="pipeline-steps">
                    {/* Step 1: Submission */}
                    <div className="pipeline-step completed">
                      <div className="step-circle"><Check size={14} /></div>
                      <div className="step-label">Submitted</div>
                    </div>
                    <div className="pipeline-line active" />

                    {/* Step 2: Under Review */}
                    <div className={`pipeline-step ${proposalData.status !== 'Submitted' ? 'completed' : 'active'}`}>
                      <div className="step-circle">
                        {proposalData.status !== 'Submitted' ? <Check size={14} /> : '2'}
                      </div>
                      <div className="step-label">Under Review</div>
                    </div>
                    <div className={`pipeline-line ${['Awaiting College Approval', 'Feasibility Review', 'Approved for Publication', 'Published'].includes(proposalData.status) ? 'active' : ''}`} />

                    {/* Step 3: College Verification */}
                    <div className={`pipeline-step ${proposalData.collegeVerification?.status === 'Approved' ? 'completed' : ['Awaiting College Approval', 'Feasibility Review'].includes(proposalData.status) ? 'active' : ''}`}>
                      <div className="step-circle">
                        {proposalData.collegeVerification?.status === 'Approved' ? <Check size={14} /> : '3'}
                      </div>
                      <div className="step-label">College Verification</div>
                    </div>
                    <div className={`pipeline-line ${proposalData.feasibilityAssessment?.status === 'Acceptable' ? 'active' : ''}`} />

                    {/* Step 4: Feasibility Assessment */}
                    <div className={`pipeline-step ${proposalData.feasibilityAssessment?.status === 'Acceptable' ? 'completed' : proposalData.status === 'Feasibility Review' ? 'active' : ''}`}>
                      <div className="step-circle">
                        {proposalData.feasibilityAssessment?.status === 'Acceptable' ? <Check size={14} /> : '4'}
                      </div>
                      <div className="step-label">Feasibility</div>
                    </div>
                    <div className={`pipeline-line ${proposalData.status === 'Published' ? 'active' : ''}`} />

                    {/* Step 5: Publication */}
                    <div className={`pipeline-step ${proposalData.status === 'Published' ? 'completed' : ''}`}>
                      <div className="step-circle">
                        {proposalData.status === 'Published' ? <Sparkles size={14} /> : '5'}
                      </div>
                      <div className="step-label">Published</div>
                    </div>
                  </div>
                </div>

                {/* Gate Checks Status Matrix */}
                <div className="verification-status-grid">
                  <div className="gate-check-card">
                    <div className="gate-check-title">
                      <Building size={16} />
                      <span>College Verification</span>
                    </div>
                    <div className="gate-status-row">
                      <span className="gate-label">Institutional Status:</span>
                      <span className={`gate-badge ${proposalData.collegeVerification?.status === 'Approved' ? 'badge-pass' : proposalData.collegeVerification?.status === 'Rejected' ? 'badge-fail' : 'badge-wait'}`}>
                        {proposalData.collegeVerification?.status || 'Pending'}
                      </span>
                    </div>
                    {proposalData.collegeVerification?.authority && (
                      <div className="gate-note">
                        Verified by: <strong>{proposalData.collegeVerification.authority}</strong>
                      </div>
                    )}
                  </div>

                  <div className="gate-check-card">
                    <div className="gate-check-title">
                      <ShieldCheck size={16} />
                      <span>Operational Feasibility</span>
                    </div>
                    <div className="gate-status-row">
                      <span className="gate-label">Feasibility Assessment:</span>
                      <span className={`gate-badge ${proposalData.feasibilityAssessment?.status === 'Acceptable' ? 'badge-pass' : proposalData.feasibilityAssessment?.status === 'Unacceptable' ? 'badge-fail' : 'badge-wait'}`}>
                        {proposalData.feasibilityAssessment?.status || 'Pending'}
                      </span>
                    </div>
                    {proposalData.feasibilityAssessment?.status === 'Acceptable' && (
                      <div className="gate-note">
                        Venue, date slot, and technical facilities confirmed feasible.
                      </div>
                    )}
                  </div>
                </div>

                {/* Published Notice */}
                {proposalData.status === 'Published' && (
                  <div className="published-catalogue-banner">
                    <Sparkles size={24} />
                    <div>
                      <h4>Event Published to FESTIQ Catalogue!</h4>
                      <p>
                        Congratulations! Your event proposal passed all institutional checks and is now visible to all students on the Explore Events page.
                      </p>
                    </div>
                    <a href="/events" className="view-in-catalogue-link">
                      <span>View in Catalogue</span>
                      <ExternalLink size={16} />
                    </a>
                  </div>
                )}

                {/* CLARIFICATION SECTION: Active when status is 'Awaiting Organizer Information' */}
                {proposalData.status === 'Awaiting Organizer Information' && (
                  <div className="clarification-response-card">
                    <div className="clarification-alert-header">
                      <AlertCircle size={22} className="alert-icon-warning" />
                      <div>
                        <h3>Clarification or Additional Information Requested</h3>
                        <p>The review desk requires additional information or changes before this proposal can proceed.</p>
                      </div>
                    </div>

                    {clarificationSuccess && (
                      <div className="form-alert form-alert-success">
                        <CheckCircle size={20} />
                        <span>{clarificationSuccess}</span>
                      </div>
                    )}

                    {clarificationError && (
                      <div className="form-alert form-alert-error">
                        <AlertCircle size={20} />
                        <span>{clarificationError}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmitClarification} className="clarification-form">
                      <div className="form-group">
                        <label htmlFor="clarificationText">
                          Your Response / Information Update <span className="req">*</span>
                        </label>
                        <textarea
                          id="clarificationText"
                          rows={4}
                          required
                          placeholder="Provide the requested details, updated timing, faculty confirmation, or facility adjustments..."
                          value={clarificationText}
                          onChange={(e) => setClarificationText(e.target.value)}
                        />
                      </div>

                      <div className="clarification-submit-wrap">
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={clarificationSubmitting}
                          icon={<Send size={16} />}
                        >
                          {clarificationSubmitting ? 'Submitting Clarification...' : 'Submit Clarification to Review Desk'}
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Public Updates Timeline */}
                <div className="public-updates-section">
                  <div className="updates-section-title">
                    <MessageSquare size={18} />
                    <span>Review Updates & Communications</span>
                  </div>

                  {proposalData.publicUpdates && proposalData.publicUpdates.length > 0 ? (
                    <div className="public-updates-timeline">
                      {proposalData.publicUpdates.map((item, idx) => (
                        <div key={item.id || idx} className="update-timeline-item">
                          <div className="update-dot" />
                          <div className="update-content-box">
                            <div className="update-timestamp">
                              {new Date(item.timestamp).toLocaleString()}
                            </div>
                            <div className="update-message">{item.message}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-updates-text">No updates recorded yet.</p>
                  )}
                </div>

                {/* Clarification History if any */}
                {proposalData.clarificationHistory && proposalData.clarificationHistory.length > 0 && (
                  <div className="clarification-history-section">
                    <h4>Submitted Clarifications</h4>
                    <div className="clarification-history-list">
                      {proposalData.clarificationHistory.map((ch, idx) => (
                        <div key={ch.id || idx} className="clarification-history-item">
                          <div className="ch-meta">
                            <span>Submitted by: <strong>{ch.submittedBy}</strong></span>
                            <span>{new Date(ch.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="ch-response">{ch.response}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

