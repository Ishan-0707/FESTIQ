import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Calendar, MapPin, User, Mail, Phone, Ticket, ShieldCheck, UserCheck, Trophy, CreditCard } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { createRegistration } from '../../services/api';
import { formatPublicPrizePool, formatRegistrationFee } from '../../utils/prizePool';
import PaymentCheckoutModal from './PaymentCheckoutModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useScrollLock } from '../../hooks/useScrollLock';
import './RegistrationModal.css';

export default function RegistrationModal({
  isOpen,
  onClose,
  events = [],
  preselectedEvent = null,
  onSuccess
}) {
  useScrollLock(isOpen);
  const { user } = useAuth();
  const toast = useToast();
  const [formData, setFormData] = useState({
    participantName: '',
    email: '',
    phone: '',
    eventId: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  // Payment checkout state for paid events
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutReg, setCheckoutReg] = useState(null);

  // Initialize or update selected event and prefill user data when opened
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessData(null);
      setCheckoutOpen(false);
      setCheckoutReg(null);
      setFormData({
        participantName: user ? user.fullName : '',
        email: user ? user.email : '',
        phone: user ? (user.phoneNumber || '') : '',
        eventId: preselectedEvent ? preselectedEvent.id : (events[0]?.id || '')
      });
    }
  }, [isOpen, preselectedEvent, events, user]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentEvent = events.find((ev) => ev.id === formData.eventId) || preselectedEvent;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    // Capacity & Status check
    if (currentEvent && currentEvent.status === 'Closed') {
      setError('Registration for this event is currently closed.');
      return;
    }

    if (currentEvent && currentEvent.capacity && currentEvent.registeredCount >= currentEvent.capacity) {
      setError(`Event capacity of ${currentEvent.capacity} has been reached.`);
      return;
    }

    // Validation
    if (!formData.participantName.trim()) {
      setError('Please provide your full name');
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please provide a valid email address');
      return;
    }

    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    if (!formData.eventId) {
      setError('Please select an event to register for');
      return;
    }

    setLoading(true);

    try {
      const response = await createRegistration({
        participantName: formData.participantName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        eventId: formData.eventId
      });

      if (response.success) {
        if (response.requiresPayment || (currentEvent && currentEvent.feeAmount > 0)) {
          // Paid event: proceed to secure payment checkout step
          setCheckoutReg(response.data);
          setCheckoutOpen(true);
          toast.info(`Registration pending payment. Please complete checkout to receive your pass.`);
        } else {
          // Free event: confirm directly
          setSuccessData(response.data);
          toast.success(`Registration Confirmed: ${currentEvent?.title || 'Event Pass Generated'}`);
          if (onSuccess) {
            onSuccess(response.data);
          }
        }
      } else {
        const msg = response.error || 'Failed to record registration';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.message || 'Network error submitting registration';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reg-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="reg-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="reg-modal-header">
          <div className="reg-modal-brand">
            <span className="reg-modal-tag">Official Registration</span>
            <h3 className="reg-modal-title">Event Registration</h3>
          </div>
          <button
            type="button"
            className="reg-modal-close"
            onClick={onClose}
            aria-label="Close registration modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success Confirmation State */}
        {successData ? (
          <div className="reg-success-state">
            <div className="reg-success-icon-box">
              <CheckCircle2 size={44} className="success-icon" />
            </div>
            <h4 className="success-title">Registration Confirmed!</h4>
            <p className="success-subtitle">
              Your registration has been saved to the campus database.
            </p>

            <div className="reg-receipt-card">
              <div className="receipt-row">
                <span className="receipt-label">Registration ID</span>
                <span className="receipt-value receipt-id">{successData.id}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Participant</span>
                <span className="receipt-value">{successData.participantName}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Event</span>
                <span className="receipt-value">{currentEvent?.title || successData.eventId}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Registered At</span>
                <span className="receipt-value">{new Date(successData.registeredAt).toLocaleDateString()}</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={onClose}
              className="reg-success-done-btn"
            >
              Done & Return to Events
            </Button>
          </div>
        ) : (
          /* Registration Form */
          <form className="reg-form" onSubmit={handleSubmit}>
            {/* Event Summary Box with Independent Prize Pool and Registration Fee */}
            {currentEvent && (
              <div className="reg-event-summary">
                <div className="reg-summary-top">
                  <Badge variant={currentEvent.category} size="sm">
                    {currentEvent.category}
                  </Badge>
                  <div className="reg-summary-pricing-tags">
                    <span className="reg-summary-prize" title="Event Prize Pool">
                      <Trophy size={12} /> {formatPublicPrizePool(currentEvent)}
                    </span>
                    <span className="reg-summary-fee" title="Participant Registration Fee">
                      <CreditCard size={12} /> {formatRegistrationFee(currentEvent)}
                    </span>
                  </div>
                </div>
                <h4 className="reg-summary-title">{currentEvent.title}</h4>
                <div className="reg-summary-meta">
                  <span><Calendar size={13} /> {currentEvent.date}</span>
                  <span><MapPin size={13} /> {currentEvent.venue}</span>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="reg-error-banner" role="alert">
                <AlertCircle size={16} className="error-icon" />
                <span>{error}</span>
              </div>
            )}

            {/* Student Session Prefill / Guest Indicator */}
            {user ? (
              <div className="reg-student-prefill-banner">
                <ShieldCheck size={16} className="prefill-banner-icon" />
                <span className="prefill-banner-text">
                  Prefilled from active student session (<code>{user.email}</code>)
                </span>
              </div>
            ) : (
              <div className="reg-guest-banner">
                <UserCheck size={16} className="guest-banner-icon" />
                <span className="guest-banner-text">
                  Guest Registration Mode — Open to all participants.
                </span>
              </div>
            )}

            {/* Event Selection Dropdown (if multiple events available) */}
            <div className="reg-field-group">
              <label htmlFor="reg-event-select">Select Campus Event</label>
              <div className="input-with-icon">
                <Ticket size={16} className="field-icon" />
                <select
                  id="reg-event-select"
                  value={formData.eventId}
                  onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                  required
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Participant Name */}
            <div className="reg-field-group">
              <label htmlFor="reg-name">Participant Full Name</label>
              <div className="input-with-icon">
                <User size={16} className="field-icon" />
                <input
                  id="reg-name"
                  type="text"
                  placeholder="e.g. Priya Nayak"
                  value={formData.participantName}
                  onChange={(e) => setFormData({ ...formData, participantName: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="reg-field-group">
              <label htmlFor="reg-email">Email Address</label>
              <div className="input-with-icon">
                <Mail size={16} className="field-icon" />
                <input
                  id="reg-email"
                  type="email"
                  placeholder="e.g. demo.student@kiit.ac.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="reg-field-group">
              <label htmlFor="reg-phone">Contact Phone Number</label>
              <div className="input-with-icon">
                <Phone size={16} className="field-icon" />
                <input
                  id="reg-phone"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Actions */}
            <div className="reg-actions-row">
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={loading}
                className="reg-submit-btn"
              >
                {loading
                  ? 'Submitting Registration...'
                  : (currentEvent?.feeAmount > 0
                    ? `Proceed to Payment (₹${currentEvent.feeAmount})`
                    : 'Confirm Free Registration')}
              </Button>
              <Button
                variant="secondary"
                size="md"
                type="button"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Payment Checkout Modal for Paid Events */}
      {checkoutOpen && checkoutReg && (
        <PaymentCheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          registration={checkoutReg}
          event={currentEvent}
          onPaymentSuccess={(confirmed) => {
            setSuccessData(confirmed);
            setCheckoutOpen(false);
            if (onSuccess) onSuccess(confirmed);
          }}
        />
      )}
    </div>
  );
}

