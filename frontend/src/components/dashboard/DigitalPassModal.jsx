import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Printer,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import Button from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { useScrollLock } from '../../hooks/useScrollLock';
import './DigitalPassModal.css';

export default function DigitalPassModal({
  isOpen,
  registration,
  onClose
}) {
  useScrollLock(isOpen);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!isOpen || !registration) {
      setQrDataUrl('');
      return;
    }

    const passId = registration.pass?.passId || registration.passId || registration.id;
    const token = registration.passToken || registration.token || '';
    const eventId = registration.eventId;

    // Secure opaque payload for QR code: pass ID, secret verification token, event ID
    // Zero sensitive PII (no email, phone, or roll number) is encoded in the QR code
    const payload = JSON.stringify({
      p: passId,
      t: token,
      e: eventId
    });

    QRCode.toDataURL(payload, {
      width: 240,
      margin: 1,
      color: {
        dark: '#0B1410',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('[Digital Pass] QR Generation failed:', err));
  }, [isOpen, registration]);

  if (!isOpen || !registration) return null;

  const pass = registration.pass || {};
  const isCheckedIn = Boolean(pass.checkedIn || registration.checkedIn);
  const checkedInAt = pass.checkedInAt || registration.checkedInAt;
  const passId = pass.passId || registration.passId || registration.id;
  const regId = registration.id;

  const copyText = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'passId') {
      setCopiedId(true);
      toast.info('Pass ID copied to clipboard');
      setTimeout(() => setCopiedId(false), 2000);
    } else if (type === 'token') {
      setCopiedToken(true);
      toast.info('Pass Token copied to clipboard');
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="pass-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pass-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Printable Ticket Pass Container */}
        <div className="digital-ticket-card modal-card-entrance" id="printable-digital-pass">
          {/* Ticket Header */}
          <div className="ticket-header">
            <div className="ticket-brand">
              <Sparkles size={16} className="ticket-sparkle" />
              <span className="brand-text">FESTIQ CAMPUS EVENT PASS</span>
            </div>
            <button
              type="button"
              className="ticket-close-btn no-print"
              onClick={onClose}
              aria-label="Close pass"
            >
              <X size={18} />
            </button>
          </div>

          {/* Ticket Hero / Event Title */}
          <div className="ticket-event-section">
            <div className="ticket-category-pill">
              {registration.eventCategory || registration.category || 'Campus Event'}
            </div>
            <h2 className="ticket-event-title">
              {registration.eventTitle || 'Campus Event'}
            </h2>
            <div className="ticket-meta-grid">
              <div className="ticket-meta-item">
                <Calendar size={14} className="meta-icon" />
                <span>{registration.eventDate || 'Date TBD'}</span>
              </div>
              <div className="ticket-meta-item">
                <Clock size={14} className="meta-icon" />
                <span>{registration.eventTime || 'Schedule on ticket'}</span>
              </div>
              <div className="ticket-meta-item full-width">
                <MapPin size={14} className="meta-icon" />
                <span>{registration.eventVenue || 'Main Campus'}</span>
              </div>
            </div>
          </div>

          {/* Ticket Perforation Divider */}
          <div className="ticket-perforation">
            <div className="notch notch-left" />
            <div className="perforation-line" />
            <div className="notch notch-right" />
          </div>

          {/* Ticket Body: Attendee Details & QR Code */}
          <div className="ticket-body">
            {/* Attendee Details */}
            <div className="ticket-attendee-col">
              <div className="attendee-field">
                <span className="field-label">ATTENDEE NAME</span>
                <span className="field-value highlight">{registration.participantName}</span>
              </div>

              <div className="attendee-field">
                <span className="field-label">INSTITUTIONAL ROLL / EMAIL</span>
                <span className="field-value">
                  {registration.rollNumber ? (
                    <strong>{registration.rollNumber} • </strong>
                  ) : null}
                  {registration.email}
                </span>
              </div>

              <div className="attendee-field">
                <span className="field-label">PASS IDENTIFIER</span>
                <div className="code-copy-row">
                  <code>{passId}</code>
                  <button
                    type="button"
                    className="pass-copy-btn no-print"
                    onClick={() => copyText(passId, 'passId')}
                    title="Copy Pass ID"
                  >
                    {copiedId ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="attendee-field">
                <span className="field-label">REGISTRATION ID</span>
                <span className="field-value muted"><code>{regId}</code></span>
              </div>

              {/* Status Ribbon */}
              <div className="ticket-status-ribbon">
                {isCheckedIn ? (
                  <div className="status-badge status-checked-in">
                    <CheckCircle2 size={16} />
                    <span>CHECKED IN • {checkedInAt ? new Date(checkedInAt).toLocaleTimeString() : 'Verified'}</span>
                  </div>
                ) : (
                  <div className="status-badge status-valid">
                    <span className="valid-pulse-dot" />
                    <span>VALID PASS • READY FOR ENTRY</span>
                  </div>
                )}
              </div>
            </div>

            {/* QR Code Container */}
            <div className="ticket-qr-col">
              <div className="qr-box">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Digital check-in QR code for ${registration.participantName}`}
                    className="qr-image"
                  />
                ) : (
                  <div className="qr-loading-box">
                    <div className="qr-spinner" />
                    <span>Generating Pass...</span>
                  </div>
                )}
                <div className="qr-reticle top-left" />
                <div className="qr-reticle top-right" />
                <div className="qr-reticle bottom-left" />
                <div className="qr-reticle bottom-right" />
              </div>
              <span className="qr-scan-hint">
                Scan with Manager App at Venue Desk
              </span>
            </div>
          </div>

          {/* Ticket Security Watermark Footer */}
          <div className="ticket-footer">
            <div className="security-note">
              <ShieldCheck size={13} />
              <span>Cryptographically Verified Pass • KIIT Institutional Desk</span>
            </div>
            <span className="ticket-timestamp">
              Issued: {pass.issuedAt ? new Date(pass.issuedAt).toLocaleDateString() : 'Active'}
            </span>
          </div>
        </div>

        {/* Modal Action Bar (Hidden when printing) */}
        <div className="pass-modal-actions no-print">
          <Button
            variant="outline"
            size="md"
            icon={<Printer size={16} />}
            onClick={handlePrint}
          >
            Print / Save Ticket
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
