import React, { useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Trophy,
  Building,
  Sparkles,
  Ticket,
  CreditCard,
  UserCheck,
  Phone,
  CalendarPlus,
  Download,
  ExternalLink,
  FileText
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { getEventStatus } from '../../utils/eventStatus';
import { generateGoogleCalendarUrl, downloadIcsFile } from '../../utils/calendarExport';
import { formatPublicPrizePool, formatRegistrationFee } from '../../utils/prizePool';
import { useScrollLock } from '../../hooks/useScrollLock';
import './EventDetailsModal.css';

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'%3E%3Crect width='100%25' height='100%25' fill='%23202F27'/%3E%3Ctext x='50%25' y='50%25' fill='%23C6A96B' font-family='sans-serif' font-size='22' font-weight='bold' text-anchor='middle' dominant-baseline='middle'%3EFESTIQ Campus Event%3C/text%3E%3C/svg%3E";

export default function EventDetailsModal({
  isOpen,
  event,
  onClose,
  onRegister
}) {
  // Prevent background scrolling while modal is open, restoring exact position on close
  useScrollLock(isOpen);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = FALLBACK_IMAGE;
  };

  const statusInfo = getEventStatus(event);
  const isCompleted = statusInfo.status === 'Completed';
  const isClosed = isCompleted || statusInfo.status === 'Registration Closed';

  const googleCalUrl = generateGoogleCalendarUrl(event);

  return (
    <div className="event-details-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="event-details-card modal-card-entrance" onClick={(e) => e.stopPropagation()}>
        {/* Banner Media */}
        <div className="event-details-media">
          <img
            src={event.image || event.imageUrl || FALLBACK_IMAGE}
            alt={event.title}
            className="event-details-img"
            onError={handleImageError}
          />
          <div className="event-details-media-overlay" />

          {/* Floating Action / Close */}
          <button
            type="button"
            className="event-details-close-btn"
            onClick={onClose}
            aria-label="Close event details"
          >
            <X size={20} />
          </button>

          {/* Badges */}
          <div className="event-details-badges">
            <Badge variant={event.category} size="sm">
              {event.category}
            </Badge>
            {(event.isFeatured || event.featured) && (
              <Badge variant="featured" size="sm">
                <Sparkles size={12} className="badge-icon" />
                Featured Flagship
              </Badge>
            )}
            <Badge variant={statusInfo.variant} size="sm">
              {statusInfo.label}
            </Badge>
          </div>
        </div>

        {/* Content Body */}
        <div className="event-details-body">
          <div className="event-details-header">
            <h2 className="event-details-title">{event.title}</h2>
            {event.tagline && (
              <p className="event-details-tagline">{event.tagline}</p>
            )}
          </div>

          {/* Key Facts Grid */}
          <div className="event-facts-grid">
            <div className="fact-item">
              <Calendar size={16} className="fact-icon" />
              <div>
                <span className="fact-label">Event Date</span>
                <span className="fact-value">{event.date}</span>
              </div>
            </div>

            <div className="fact-item">
              <Clock size={16} className="fact-icon" />
              <div>
                <span className="fact-label">Timing</span>
                <span className="fact-value">{event.time || 'Schedule in details'}</span>
              </div>
            </div>

            <div className="fact-item">
              <MapPin size={16} className="fact-icon" />
              <div>
                <span className="fact-label">Venue</span>
                <span className="fact-value">{event.venue}</span>
              </div>
            </div>

            {/* Separate Independent Prize Pool Field */}
            <div className="fact-item">
              <Trophy size={16} className="fact-icon" />
              <div>
                <span className="fact-label">Prize Pool</span>
                <span className="fact-value">{formatPublicPrizePool(event)}</span>
              </div>
            </div>

            {/* Separate Independent Registration Fee Field */}
            <div className="fact-item">
              <CreditCard size={16} className="fact-icon" />
              <div>
                <span className="fact-label">Registration Fee</span>
                <span className="fact-value">{formatRegistrationFee(event)}</span>
              </div>
            </div>

            <div className="fact-item">
              <Users size={16} className="fact-icon" />
              <div>
                <span className="fact-label">Registration Capacity</span>
                <span className="fact-value">
                  {event.registeredCount || 0} / {event.capacity || 'Open'} Spots
                </span>
              </div>
            </div>

            <div className="fact-item">
              <Building size={16} className="fact-icon" />
              <div>
                <span className="fact-label">Host Society</span>
                <span className="fact-value">{event.organizer || 'University Committee'}</span>
              </div>
            </div>

            {/* Event Manager Details */}
            <div className="fact-item coordinator-fact">
              <UserCheck size={16} className="fact-icon" />
              <div>
                <span className="fact-label">Event Manager</span>
                <span className="fact-value">{event.managerName || 'Coordinator Desk (Demo)'}</span>
              </div>
            </div>

            <div className="fact-item coordinator-fact">
              <Phone size={16} className="fact-icon" />
              <div>
                <span className="fact-label">Contact (Demo)</span>
                <span className="fact-value">
                  {event.managerPhone ? (
                    <a href={`tel:${event.managerPhone}`} className="manager-phone-link" title="Click to call coordinator desk">
                      {event.managerPhone}
                    </a>
                  ) : (
                    'Not specified'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="event-description-block">
            <h4 className="description-heading">About This Campus Event</h4>
            <p className="description-text">
              {event.fullDescription || event.description}
            </p>
          </div>

          {/* Add to Personal Calendar Strip */}
          <div className="event-calendar-export-strip">
            <span className="export-strip-label">
              <CalendarPlus size={15} className="export-strip-icon" />
              <span>Add to Your Calendar:</span>
            </span>
            <div className="export-strip-buttons">
              <a
                href={googleCalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="calendar-export-btn google-btn"
                title="Add event to Google Calendar"
              >
                <span>Google Calendar</span>
                <ExternalLink size={12} />
              </a>
              <button
                type="button"
                className="calendar-export-btn ics-btn"
                onClick={() => downloadIcsFile(event)}
                title="Download standard .ics iCalendar file for Apple Calendar, Outlook, etc."
              >
                <Download size={13} />
                <span>iCal (.ics)</span>
              </button>
            </div>
          </div>

          {/* Official Event Specification PDF Strip */}
          <div className="event-pdf-spec-strip">
            <div className="pdf-spec-info">
              <FileText size={18} className="pdf-spec-icon" />
              <div className="pdf-spec-texts">
                <strong>Official Event Specification Document (PDF)</strong>
                <p>Complete schedule, participant rules, prize distribution, and coordinator contacts.</p>
              </div>
            </div>
            <div className="pdf-spec-actions">
              <a
                href={`/api/events/${event.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="calendar-export-btn pdf-btn-view"
                title="Open complete event specification PDF in a new tab"
              >
                <FileText size={13} />
                <span>View Event Details PDF</span>
                <ExternalLink size={11} />
              </a>
              <a
                href={`/api/events/${event.id}/pdf?download=true`}
                download
                className="calendar-export-btn pdf-btn-download"
                title="Download official event specification PDF"
              >
                <Download size={13} />
                <span>Download PDF</span>
              </a>
            </div>
          </div>

          {/* Action Footer */}
          <div className="event-details-footer">
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={<Ticket size={16} />}
              iconPosition="left"
              disabled={isClosed}
              onClick={() => {
                onClose();
                onRegister(event);
              }}
            >
              {isCompleted ? 'Event Concluded' : isClosed ? 'Registration Closed' : 'Register for Event'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
