import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, CheckCircle2, Calendar, Clock, MapPin, Users, Trophy, Building, Phone, UserCheck, Image as ImageIcon } from 'lucide-react';
import Button from '../ui/Button';
import { createEvent } from '../../services/api';
import { useScrollLock } from '../../hooks/useScrollLock';
import './CreateEventModal.css';

const CATEGORIES = [
  'Technical',
  'Cultural',
  'Gaming',
  'Workshops',
  'Management',
  'Sports'
];

export default function CreateEventModal({ isOpen, onClose, onEventCreated }) {
  useScrollLock(isOpen);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Technical',
    tagline: '',
    description: '',
    fullDescription: '',
    date: '',
    time: '09:00 AM - 05:00 PM',
    venue: '',
    organizer: '',
    image: '',
    capacity: 200,
    registrationType: 'free',
    feeAmount: 0,
    feeType: 'per_person',
    currency: 'INR',
    prizeAmount: 25000,
    prizePoolType: 'fixed',
    prizeAllocationPct: 75,
    managerName: '',
    managerPhone: '+91 00000 00099',
    status: 'Open',
    isFeatured: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Strict validation for registration fees
    if (formData.registrationType === 'paid') {
      const numFee = Number(formData.feeAmount);
      if (isNaN(numFee) || numFee <= 0) {
        setError('Paid events require a registration fee greater than ₹0');
        return;
      }
      if (!['per_person', 'per_team'].includes(formData.feeType)) {
        setError("Please select a valid fee billing model ('Per Person' or 'Per Team')");
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        capacity: Number(formData.capacity) || 100,
        feeAmount: formData.registrationType === 'paid' ? Number(formData.feeAmount) : 0,
        feeType: formData.registrationType === 'paid' ? formData.feeType : 'per_person',
        prizeAmount: Number(formData.prizeAmount) || 0
      };

      const res = await createEvent(payload);
      if (res.success) {
        setSuccess(true);
        if (onEventCreated) {
          onEventCreated(res.data);
        }
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1200);
      } else {
        setError(res.error || 'Failed to create campus event');
      }
    } catch (err) {
      setError(err.message || 'Network error creating event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-event-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Create Campus Event">
      <div className="create-event-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="create-modal-header">
          <div>
            <h2 className="create-modal-title">Create Campus Event</h2>
            <p className="create-modal-subtitle">Publish a new competition, workshop, or festival to the FESTIQ directory.</p>
          </div>
          <button type="button" className="create-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="create-event-form">
          {error && (
            <div className="create-form-alert error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="create-form-alert success">
              <CheckCircle2 size={16} />
              <span>Event created and published successfully!</span>
            </div>
          )}

          <div className="form-grid">
            {/* Title */}
            <div className="form-group span-2">
              <label htmlFor="title">Event Title *</label>
              <input
                id="title"
                name="title"
                type="text"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. AI Odyssey: Autonomous Agents Hackathon"
              />
            </div>

            {/* Category */}
            <div className="form-group">
              <label htmlFor="category">Academic Discipline / Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Tagline */}
            <div className="form-group">
              <label htmlFor="tagline">Short Tagline</label>
              <input
                id="tagline"
                name="tagline"
                type="text"
                value={formData.tagline}
                onChange={handleChange}
                placeholder="e.g. Build with multi-agent frameworks"
              />
            </div>

            {/* Date */}
            <div className="form-group">
              <label htmlFor="date">Event Date (YYYY-MM-DD) *</label>
              <input
                id="date"
                name="date"
                type="date"
                required
                value={formData.date}
                onChange={handleChange}
              />
            </div>

            {/* Time */}
            <div className="form-group">
              <label htmlFor="time">Timing / Schedule *</label>
              <input
                id="time"
                name="time"
                type="text"
                required
                value={formData.time}
                onChange={handleChange}
                placeholder="09:30 AM - 05:30 PM"
              />
            </div>

            {/* Venue */}
            <div className="form-group">
              <label htmlFor="venue">Campus Venue *</label>
              <input
                id="venue"
                name="venue"
                type="text"
                required
                value={formData.venue}
                onChange={handleChange}
                placeholder="e.g. Campus 15 Auditorium & Labs"
              />
            </div>

            {/* Organizer */}
            <div className="form-group">
              <label htmlFor="organizer">Host Society / Department</label>
              <input
                id="organizer"
                name="organizer"
                type="text"
                value={formData.organizer}
                onChange={handleChange}
                placeholder="e.g. School of Computer Engineering"
              />
            </div>

            {/* Capacity */}
            <div className="form-group">
              <label htmlFor="capacity">Total Capacity (Spots) *</label>
              <input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                required
                value={formData.capacity}
                onChange={handleChange}
              />
            </div>

            {/* Prize Amount */}
            <div className="form-group">
              <label htmlFor="prizeAmount">Prize Pool (₹) *</label>
              <input
                id="prizeAmount"
                name="prizeAmount"
                type="number"
                min="0"
                required
                value={formData.prizeAmount}
                onChange={handleChange}
              />
            </div>

            {/* Registration Fee Configuration Section */}
            <div className="form-group span-2 fee-config-box">
              <label className="fee-section-heading">Registration Fee Configuration *</label>
              
              <div className="reg-type-toggle-row">
                <label className={`reg-type-pill ${formData.registrationType === 'free' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="registrationType"
                    value="free"
                    checked={formData.registrationType === 'free'}
                    onChange={handleChange}
                  />
                  <span>Free Registration (₹0)</span>
                </label>

                <label className={`reg-type-pill ${formData.registrationType === 'paid' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="registrationType"
                    value="paid"
                    checked={formData.registrationType === 'paid'}
                    onChange={handleChange}
                  />
                  <span>Paid Registration (INR Gateway)</span>
                </label>
              </div>

              {formData.registrationType === 'paid' && (
                <div className="paid-fee-inputs-grid">
                  <div className="form-subgroup">
                    <label htmlFor="feeAmount">Registration Fee Amount (₹) *</label>
                    <input
                      id="feeAmount"
                      name="feeAmount"
                      type="number"
                      min="1"
                      required={formData.registrationType === 'paid'}
                      value={formData.feeAmount}
                      onChange={handleChange}
                      placeholder="e.g. 200"
                    />
                  </div>

                  <div className="form-subgroup">
                    <label htmlFor="feeType">Fee Billing Model *</label>
                    <select
                      id="feeType"
                      name="feeType"
                      value={formData.feeType}
                      onChange={handleChange}
                    >
                      <option value="per_person">Per Participant (Individual)</option>
                      <option value="per_team">Per Team (Flat Entry)</option>
                    </select>
                  </div>

                  <div className="form-subgroup">
                    <label>Currency</label>
                    <input type="text" value="INR (₹)" disabled className="disabled-currency-input" />
                  </div>
                </div>
              )}

              {/* Live Preview Indicator */}
              <div className="fee-prize-preview-strip">
                <div className="preview-item">
                  <span className="prev-label">Prize Pool:</span>
                  <span className="prev-val text-gold">₹{Number(formData.prizeAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="preview-divider" />
                <div className="preview-item">
                  <span className="prev-label">Registration Fee:</span>
                  <span className="prev-val text-green">
                    {formData.registrationType === 'free'
                      ? 'Free'
                      : `₹${Number(formData.feeAmount || 0).toLocaleString('en-IN')} ${formData.feeType === 'per_team' ? 'per team' : 'per participant'}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Coordinator Name */}
            <div className="form-group">
              <label htmlFor="managerName">Event Coordinator / Manager Name *</label>
              <input
                id="managerName"
                name="managerName"
                type="text"
                required
                value={formData.managerName}
                onChange={handleChange}
                placeholder="e.g. Tech Coordination Desk (Demo Lead)"
              />
            </div>

            {/* Coordinator Phone */}
            <div className="form-group">
              <label htmlFor="managerPhone">Manager Contact Number (Demo) *</label>
              <input
                id="managerPhone"
                name="managerPhone"
                type="text"
                required
                value={formData.managerPhone}
                onChange={handleChange}
                placeholder="+91 00000 00099"
              />
            </div>

            {/* Image URL */}
            <div className="form-group span-2">
              <label htmlFor="image">Banner Image URL</label>
              <input
                id="image"
                name="image"
                type="url"
                value={formData.image}
                onChange={handleChange}
                placeholder="https://images.unsplash.com/... (Leave empty for campus default)"
              />
            </div>

            {/* Short Description */}
            <div className="form-group span-2">
              <label htmlFor="description">Event Summary / Overview *</label>
              <textarea
                id="description"
                name="description"
                rows="2"
                required
                value={formData.description}
                onChange={handleChange}
                placeholder="Concise description displayed on event cards..."
              />
            </div>

            {/* Full Description */}
            <div className="form-group span-2">
              <label htmlFor="fullDescription">Comprehensive Event Details</label>
              <textarea
                id="fullDescription"
                name="fullDescription"
                rows="3"
                value={formData.fullDescription}
                onChange={handleChange}
                placeholder="Full itinerary, rules, track details for the details modal..."
              />
            </div>

            {/* Status & Featured */}
            <div className="form-group">
              <label htmlFor="status">Initial Registration Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Open">Open</option>
                <option value="Filling Fast">Filling Fast</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isFeatured"
                  checked={formData.isFeatured}
                  onChange={handleChange}
                />
                <span className="checkbox-text">Flagship Featured Event (Showcases on Hero & Featured Grid)</span>
              </label>
            </div>
          </div>

          <div className="create-modal-footer">
            <Button variant="secondary" size="md" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" disabled={loading}>
              {loading ? 'Publishing Event...' : 'Publish Event'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

