import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  FileText,
  ExternalLink,
  Plus,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { updateEventAdmin } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useScrollLock } from '../../hooks/useScrollLock';
import './EditEventDetailsModal.css';

export default function EditEventDetailsModal({
  isOpen,
  event,
  onClose,
  onEventUpdated
}) {
  useScrollLock(isOpen);
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    detailedDescription: '',
    // Schedule
    schedule: [],
    // Rules
    rules: [],
    // Prize Distribution & Winners
    prizeDistribution: {
      first: 'To be announced',
      second: 'To be announced',
      third: 'To be announced'
    },
    winners: {
      first: 'To be announced after the event',
      second: 'To be announced after the event',
      third: 'To be announced after the event'
    },
    // Registration Info
    registrationInfo: {
      deadline: 'To be announced',
      eligibility: '',
      paymentInstructions: '',
      cancellationPolicy: ''
    },
    // Organizer Contact
    organizerContact: {
      name: '',
      department: '',
      email: '',
      phone: '',
      support: ''
    },
    // Participant Instructions
    participantInstructions: []
  });

  useEffect(() => {
    if (isOpen && event) {
      setError(null);
      const pdf = event.pdfDetails || {};
      setFormData({
        title: event.title || '',
        description: event.description || '',
        detailedDescription: pdf.detailedDescription || event.fullDescription || '',
        schedule: Array.isArray(pdf.schedule) && pdf.schedule.length > 0
          ? JSON.parse(JSON.stringify(pdf.schedule))
          : [
              { time: '09:00 AM', activity: 'Reporting Desk & Participant Verification' },
              { time: '09:45 AM', activity: 'Inaugural Briefing & Track Orientation' },
              { time: '10:30 AM', activity: 'Primary Competition Session' },
              { time: '01:00 PM', activity: 'Mid-Day Refreshment & Networking Break' },
              { time: '02:00 PM', activity: 'Final Competitive Showcase / Presentations' },
              { time: '05:00 PM', activity: 'Jury Evaluation & Awards Ceremony' }
            ],
        rules: Array.isArray(pdf.rules) && pdf.rules.length > 0
          ? [...pdf.rules]
          : [
              'Participants must present a valid university student identity card at check-in.',
              'All work presented must be original work developed for this competition.',
              'Participants must adhere to the campus code of conduct at all times.',
              'The evaluation panel\'s scoring and decisions are final and binding.'
            ],
        prizeDistribution: {
          first: pdf.prizeDistribution?.first || 'To be announced',
          second: pdf.prizeDistribution?.second || 'To be announced',
          third: pdf.prizeDistribution?.third || 'To be announced'
        },
        winners: {
          first: pdf.winners?.first || 'To be announced after the event',
          second: pdf.winners?.second || 'To be announced after the event',
          third: pdf.winners?.third || 'To be announced after the event'
        },
        registrationInfo: {
          deadline: pdf.registrationInfo?.deadline || 'To be announced',
          eligibility: pdf.registrationInfo?.eligibility || 'Open to all verified college students',
          paymentInstructions: pdf.registrationInfo?.paymentInstructions || 'Admission credentials required at entrance.',
          cancellationPolicy: pdf.registrationInfo?.cancellationPolicy || 'Cancellations accepted up to 24 hours prior to start.'
        },
        organizerContact: {
          name: pdf.organizerContact?.name || event.managerName || 'Coordination Desk',
          department: pdf.organizerContact?.department || event.organizer || 'University Events Committee',
          email: pdf.organizerContact?.email || 'events@festiq.campus.edu',
          phone: pdf.organizerContact?.phone || event.managerPhone || '+91 00000 00000',
          support: pdf.organizerContact?.support || 'Contact the coordination desk for venue assistance.'
        },
        participantInstructions: Array.isArray(pdf.participantInstructions) && pdf.participantInstructions.length > 0
          ? [...pdf.participantInstructions]
          : [
              'Bring your college identity card and FESTIQ digital registration pass.',
              'Ensure you arrive at least 30 minutes before the scheduled reporting time.',
              'Certificates of merit and participation will be issued digitally following verified attendance.'
            ]
      });
    }
  }, [isOpen, event]);

  if (!isOpen || !event) return null;

  // Schedule Helpers
  const handleScheduleChange = (index, field, value) => {
    const updated = [...formData.schedule];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, schedule: updated }));
  };

  const handleAddScheduleRow = () => {
    setFormData((prev) => ({
      ...prev,
      schedule: [...prev.schedule, { time: '', activity: '' }]
    }));
  };

  const handleRemoveScheduleRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      schedule: prev.schedule.filter((_, i) => i !== index)
    }));
  };

  // Rules Helpers
  const handleRuleChange = (index, value) => {
    const updated = [...formData.rules];
    updated[index] = value;
    setFormData((prev) => ({ ...prev, rules: updated }));
  };

  const handleAddRule = () => {
    setFormData((prev) => ({
      ...prev,
      rules: [...prev.rules, '']
    }));
  };

  const handleRemoveRule = (index) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  // Participant Instructions Helpers
  const handleInstructionChange = (index, value) => {
    const updated = [...formData.participantInstructions];
    updated[index] = value;
    setFormData((prev) => ({ ...prev, participantInstructions: updated }));
  };

  const handleAddInstruction = () => {
    setFormData((prev) => ({
      ...prev,
      participantInstructions: [...prev.participantInstructions, '']
    }));
  };

  const handleRemoveInstruction = (index) => {
    setFormData((prev) => ({
      ...prev,
      participantInstructions: prev.participantInstructions.filter((_, i) => i !== index)
    }));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        description: formData.description.trim(),
        pdfDetails: {
          detailedDescription: formData.detailedDescription.trim(),
          schedule: formData.schedule.filter((s) => s.time.trim() || s.activity.trim()),
          rules: formData.rules.filter((r) => r.trim()),
          prizeDistribution: formData.prizeDistribution,
          winners: formData.winners,
          registrationInfo: formData.registrationInfo,
          organizerContact: formData.organizerContact,
          participantInstructions: formData.participantInstructions.filter((i) => i.trim())
        }
      };

      const res = await updateEventAdmin(event.id, payload);
      if (res.success) {
        toast.success(`Event and PDF specifications updated for "${event.title}".`);
        if (onEventUpdated) {
          onEventUpdated(res.data);
        }
        onClose();
      } else {
        setError(res.message || 'Failed to update event specifications');
      }
    } catch (err) {
      setError(err.message || 'Network error updating event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="edit-details-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="edit-details-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="edit-modal-header">
          <div className="edit-modal-title-group">
            <span className="edit-modal-tag">Management Portal • Event Specification Editor</span>
            <h3 className="edit-modal-title">Edit Event & PDF Specifications</h3>
            <span className="edit-modal-subtitle">
              Event ID: <strong>{event.id}</strong> • {event.title}
            </span>
          </div>
          <button
            type="button"
            className="edit-modal-close"
            onClick={onClose}
            aria-label="Close editor"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="edit-modal-tabs">
          <button
            type="button"
            className={`edit-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Descriptions & Overview
          </button>
          <button
            type="button"
            className={`edit-tab-btn ${activeTab === 'prizes' ? 'active' : ''}`}
            onClick={() => setActiveTab('prizes')}
          >
            Prizes & Certified Results
          </button>
          <button
            type="button"
            className={`edit-tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            Schedule Timeline ({formData.schedule.length})
          </button>
          <button
            type="button"
            className={`edit-tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            Rules & Regulations ({formData.rules.length})
          </button>
          <button
            type="button"
            className={`edit-tab-btn ${activeTab === 'guidelines' ? 'active' : ''}`}
            onClick={() => setActiveTab('guidelines')}
          >
            Registration & Contact
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="edit-modal-form">
          {error && (
            <div className="edit-modal-error-alert" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: DESCRIPTIONS & OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="edit-tab-content">
              <div className="form-field-group">
                <label className="field-label">
                  Website Short Overview (2–3 concise lines)
                  <span className="field-hint">
                    Displayed on Event Cards and website Event Details. Keep concise and clear.
                  </span>
                </label>
                <textarea
                  className="field-textarea"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Concise overview explaining event purpose and key activities..."
                  required
                />
              </div>

              <div className="form-field-group">
                <label className="field-label">
                  Detailed Event Description (for PDF Specification Document)
                  <span className="field-hint">
                    Comprehensive 5–7 line description explaining objectives, activities, skills, expectations, and prerequisites.
                  </span>
                </label>
                <textarea
                  className="field-textarea"
                  rows={7}
                  value={formData.detailedDescription}
                  onChange={(e) => setFormData({ ...formData, detailedDescription: e.target.value })}
                  placeholder="Detailed multi-paragraph description printed in the official event PDF..."
                  required
                />
              </div>
            </div>
          )}

          {/* TAB 2: PRIZES & CERTIFIED RESULTS */}
          {activeTab === 'prizes' && (
            <div className="edit-tab-content">
              <div className="tab-intro-box">
                <Trophy size={18} className="intro-icon" />
                <p>
                  Configure official prize distribution and certified winner records. For upcoming events, placeholders remain "To be announced".
                </p>
              </div>

              {/* First Place */}
              <div className="prize-podium-card gold-tier">
                <h4 className="podium-tier-title">First Place (Winner)</h4>
                <div className="podium-inputs-row">
                  <div className="field-subgroup">
                    <label>Prize Award / Trophy</label>
                    <input
                      type="text"
                      className="field-input"
                      value={formData.prizeDistribution.first}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          prizeDistribution: { ...formData.prizeDistribution, first: e.target.value }
                        })
                      }
                      placeholder="e.g. ₹25,000 + Winner Trophy"
                    />
                  </div>
                  <div className="field-subgroup">
                    <label>Certified Winner / Student Name</label>
                    <input
                      type="text"
                      className="field-input"
                      value={formData.winners.first}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          winners: { ...formData.winners, first: e.target.value }
                        })
                      }
                      placeholder="To be announced after the event"
                    />
                  </div>
                </div>
              </div>

              {/* Second Place */}
              <div className="prize-podium-card silver-tier">
                <h4 className="podium-tier-title">Second Place (Runner-up)</h4>
                <div className="podium-inputs-row">
                  <div className="field-subgroup">
                    <label>Prize Award / Trophy</label>
                    <input
                      type="text"
                      className="field-input"
                      value={formData.prizeDistribution.second}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          prizeDistribution: { ...formData.prizeDistribution, second: e.target.value }
                        })
                      }
                      placeholder="e.g. ₹15,000 + Trophy"
                    />
                  </div>
                  <div className="field-subgroup">
                    <label>Certified Winner / Student Name</label>
                    <input
                      type="text"
                      className="field-input"
                      value={formData.winners.second}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          winners: { ...formData.winners, second: e.target.value }
                        })
                      }
                      placeholder="To be announced after the event"
                    />
                  </div>
                </div>
              </div>

              {/* Third Place */}
              <div className="prize-podium-card bronze-tier">
                <h4 className="podium-tier-title">Third Place (2nd Runner-up)</h4>
                <div className="podium-inputs-row">
                  <div className="field-subgroup">
                    <label>Prize Award / Trophy</label>
                    <input
                      type="text"
                      className="field-input"
                      value={formData.prizeDistribution.third}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          prizeDistribution: { ...formData.prizeDistribution, third: e.target.value }
                        })
                      }
                      placeholder="e.g. ₹10,000 + Trophy"
                    />
                  </div>
                  <div className="field-subgroup">
                    <label>Certified Winner / Student Name</label>
                    <input
                      type="text"
                      className="field-input"
                      value={formData.winners.third}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          winners: { ...formData.winners, third: e.target.value }
                        })
                      }
                      placeholder="To be announced after the event"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCHEDULE TIMELINE */}
          {activeTab === 'schedule' && (
            <div className="edit-tab-content">
              <div className="tab-action-header">
                <span className="tab-action-desc">
                  Define verified reporting times, round schedules, breaks, and conclusion milestones.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={handleAddScheduleRow}
                >
                  Add Milestone
                </Button>
              </div>

              <div className="schedule-table-wrap">
                {formData.schedule.map((item, idx) => (
                  <div key={idx} className="schedule-row-item">
                    <div className="time-field">
                      <Clock size={14} className="input-icon" />
                      <input
                        type="text"
                        className="field-input-inline"
                        value={item.time}
                        onChange={(e) => handleScheduleChange(idx, 'time', e.target.value)}
                        placeholder="e.g. 09:00 AM"
                      />
                    </div>
                    <div className="activity-field">
                      <input
                        type="text"
                        className="field-input-inline"
                        value={item.activity}
                        onChange={(e) => handleScheduleChange(idx, 'activity', e.target.value)}
                        placeholder="Activity or milestone description..."
                      />
                    </div>
                    <button
                      type="button"
                      className="remove-row-btn"
                      onClick={() => handleRemoveScheduleRow(idx)}
                      title="Remove schedule row"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: RULES & REGULATIONS */}
          {activeTab === 'rules' && (
            <div className="edit-tab-content">
              <div className="tab-action-header">
                <span className="tab-action-desc">
                  Event-specific rules: eligibility, tools allowed, submission formats, and judging criteria.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={handleAddRule}
                >
                  Add Rule
                </Button>
              </div>

              <div className="rules-list-wrap">
                {formData.rules.map((rule, idx) => (
                  <div key={idx} className="rule-row-item">
                    <span className="rule-idx">{idx + 1}.</span>
                    <textarea
                      rows={2}
                      className="rule-input-inline"
                      value={rule}
                      onChange={(e) => handleRuleChange(idx, e.target.value)}
                      placeholder="Rule statement..."
                    />
                    <button
                      type="button"
                      className="remove-row-btn"
                      onClick={() => handleRemoveRule(idx)}
                      title="Remove rule"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: REGISTRATION & GUIDELINES */}
          {activeTab === 'guidelines' && (
            <div className="edit-tab-content">
              <div className="guidelines-grid">
                <div className="field-group-box">
                  <h4 className="group-box-title">Registration Guidelines</h4>
                  <div className="field-subgroup">
                    <label>Registration Deadline</label>
                    <input
                      type="text"
                      className="field-input"
                      value={formData.registrationInfo.deadline}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          registrationInfo: { ...formData.registrationInfo, deadline: e.target.value }
                        })
                      }
                      placeholder="e.g. 2026-11-24 11:59 PM or To be announced"
                    />
                  </div>
                  <div className="field-subgroup">
                    <label>Eligibility Requirements</label>
                    <input
                      type="text"
                      className="field-input"
                      value={formData.registrationInfo.eligibility}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          registrationInfo: { ...formData.registrationInfo, eligibility: e.target.value }
                        })
                      }
                      placeholder="e.g. Open to all bona fide college students"
                    />
                  </div>
                  <div className="field-subgroup">
                    <label>Payment & Desk Check-in Instructions</label>
                    <input
                      type="text"
                      className="field-input"
                      value={formData.registrationInfo.paymentInstructions}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          registrationInfo: { ...formData.registrationInfo, paymentInstructions: e.target.value }
                        })
                      }
                      placeholder="Instructions for participants on entry"
                    />
                  </div>
                  <div className="field-subgroup">
                    <label>Cancellation & Refund Policy</label>
                    <input
                      type="text"
                      className="field-input"
                      value={formData.registrationInfo.cancellationPolicy}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          registrationInfo: { ...formData.registrationInfo, cancellationPolicy: e.target.value }
                        })
                      }
                      placeholder="e.g. Cancellations allowed up to 24 hours prior"
                    />
                  </div>
                </div>

                <div className="field-group-box">
                  <h4 className="group-box-title">Official Coordinator Contacts</h4>
                  <div className="field-subgroup">
                    <label>Coordinator / Desk Name</label>
                    <input
                      type="text"
                      className="field-input"
                      value={formData.organizerContact.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          organizerContact: { ...formData.organizerContact, name: e.target.value }
                        })
                      }
                      placeholder="e.g. Prof. R. Sharma / Coordination Desk"
                    />
                  </div>
                  <div className="field-subgroup">
                    <label>Department / Society</label>
                    <input
                      type="text"
                      className="field-input"
                      value={formData.organizerContact.department}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          organizerContact: { ...formData.organizerContact, department: e.target.value }
                        })
                      }
                      placeholder="e.g. Department of Computer Science"
                    />
                  </div>
                  <div className="field-subgroup">
                    <label>Contact Email Address</label>
                    <input
                      type="email"
                      className="field-input"
                      value={formData.organizerContact.email}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          organizerContact: { ...formData.organizerContact, email: e.target.value }
                        })
                      }
                      placeholder="events@festiq.campus.edu"
                    />
                  </div>
                  <div className="field-subgroup">
                    <label>Contact Phone Number</label>
                    <input
                      type="text"
                      className="field-input"
                      value={formData.organizerContact.phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          organizerContact: { ...formData.organizerContact, phone: e.target.value }
                        })
                      }
                      placeholder="+91 00000 00000"
                    />
                  </div>
                </div>
              </div>

              {/* Participant Instructions Checklist */}
              <div className="field-group-box full-width-box">
                <div className="tab-action-header">
                  <span className="tab-action-desc">
                    Participant Instructions (Items to bring, software requirements, reporting notes)
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<Plus size={14} />}
                    onClick={handleAddInstruction}
                  >
                    Add Instruction
                  </Button>
                </div>
                <div className="rules-list-wrap">
                  {formData.participantInstructions.map((inst, idx) => (
                    <div key={idx} className="rule-row-item">
                      <span className="rule-idx">•</span>
                      <input
                        type="text"
                        className="field-input-inline"
                        value={inst}
                        onChange={(e) => handleInstructionChange(idx, e.target.value)}
                        placeholder="Participant instruction..."
                      />
                      <button
                        type="button"
                        className="remove-row-btn"
                        onClick={() => handleRemoveInstruction(idx)}
                        title="Remove instruction"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="edit-modal-footer">
            <a
              href={`/api/events/${event.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="festiq-btn btn-sm btn-outline pdf-preview-link"
              title="Preview latest generated PDF specification"
            >
              <FileText size={14} />
              <span>Preview Event PDF</span>
              <ExternalLink size={12} />
            </a>

            <div className="footer-action-buttons">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={<Save size={16} />}
                disabled={submitting}
              >
                {submitting ? 'Saving Changes...' : 'Save & Update Event'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

