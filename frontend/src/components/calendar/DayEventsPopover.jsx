import React, { useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Ticket, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { getEventStatus } from '../../utils/eventStatus';
import { useScrollLock } from '../../hooks/useScrollLock';

export default function DayEventsPopover({
  isOpen,
  dateString,
  events = [],
  onClose,
  onSelectEvent
}) {
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

  if (!isOpen) return null;

  // Format date readable
  let formattedHeaderDate = dateString;
  try {
    if (dateString) {
      const [y, m, d] = dateString.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      formattedHeaderDate = dt.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
  } catch {
    formattedHeaderDate = dateString;
  }

  return (
    <div className="day-popover-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="day-popover-card modal-card-entrance" onClick={(e) => e.stopPropagation()}>
        <div className="day-popover-header">
          <div className="popover-title-group">
            <div className="popover-badge">
              <Calendar size={14} />
              <span>Campus Daily Schedule</span>
            </div>
            <h3 className="popover-date-title">{formattedHeaderDate}</h3>
            <p className="popover-subtitle">
              {events.length} {events.length === 1 ? 'event' : 'events'} scheduled across university departments
            </p>
          </div>
          <button
            type="button"
            className="popover-close-btn"
            onClick={onClose}
            aria-label="Close day schedule"
          >
            <X size={18} />
          </button>
        </div>

        <div className="day-popover-body">
          <div className="day-events-expanded-list">
            {events.map((ev) => {
              const statusInfo = getEventStatus(ev);
              return (
                <div
                  key={ev.id}
                  className="popover-event-item"
                  onClick={() => {
                    onClose();
                    onSelectEvent(ev);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onClose();
                      onSelectEvent(ev);
                    }
                  }}
                >
                  <div className="popover-item-left">
                    <div className="popover-badges-row">
                      <Badge variant={ev.category} size="sm">
                        {ev.category}
                      </Badge>
                      <Badge variant={statusInfo.variant} size="sm">
                        {statusInfo.label}
                      </Badge>
                      {(ev.isFeatured || ev.featured) && (
                        <Badge variant="featured" size="sm">
                          <Sparkles size={11} /> Featured
                        </Badge>
                      )}
                    </div>

                    <h4 className="popover-event-title">{ev.title}</h4>

                    <div className="popover-meta-row">
                      {ev.time && (
                        <span className="popover-meta-item">
                          <Clock size={13} className="meta-icon" />
                          <span>{ev.time}</span>
                        </span>
                      )}
                      {ev.venue && (
                        <span className="popover-meta-item">
                          <MapPin size={13} className="meta-icon" />
                          <span>{ev.venue}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="popover-item-right">
                    <Button variant="secondary" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="day-popover-footer">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

