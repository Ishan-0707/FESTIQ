import React from 'react';
import { Calendar, MapPin, Sparkles, Ticket } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { getEventStatus } from '../../utils/eventStatus';
import { formatPublicPrizePool, formatRegistrationFee } from '../../utils/prizePool';
import './EventCard.css';

const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'%3E%3Crect width='100%25' height='100%25' fill='%23202F27'/%3E%3Ctext x='50%25' y='50%25' fill='%23C6A96B' font-family='sans-serif' font-size='22' font-weight='bold' text-anchor='middle' dominant-baseline='middle'%3EFESTIQ Campus Event%3C/text%3E%3C/svg%3E";

export default function EventCard({
  event,
  onSelect,
  onRegister
}) {
  if (!event) return null;

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = FALLBACK_IMAGE;
  };

  const statusInfo = getEventStatus(event);
  const isCompleted = statusInfo.status === 'Completed';
  const isClosed = isCompleted || statusInfo.status === 'Registration Closed';
  const isFeatured = Boolean(event.isFeatured || event.featured);

  return (
    <article className="festiq-event-card">
      {/* Media Banner with Hover Zoom */}
      <div
        className="event-card-media"
        onClick={() => onSelect && onSelect(event)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (onSelect) onSelect(event);
          }
        }}
        aria-label={`View details for ${event.title}`}
      >
        <img
          src={event.image || event.imageUrl || FALLBACK_IMAGE}
          alt={event.title}
          className="event-card-img"
          loading="lazy"
          onError={handleImageError}
        />
        <div className="event-card-overlay" />

        {/* Badges Overlay */}
        <div className="event-card-badges">
          <Badge variant={event.category} size="sm">
            {event.category}
          </Badge>
          {isFeatured && (
            <Badge variant="featured" size="sm">
              <Sparkles size={11} className="badge-icon" />
              Featured
            </Badge>
          )}
          <Badge variant={statusInfo.variant} size="sm">
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      {/* Card Content */}
      <div className="event-card-body">
        {/* Date & Venue Meta */}
        <div className="event-card-meta">
          <span className="card-meta-item">
            <Calendar size={13} className="meta-icon" />
            <span>{event.date}</span>
          </span>
          <span className="card-meta-item venue-item" title={event.venue}>
            <MapPin size={13} className="meta-icon" />
            <span className="venue-text">{event.venue}</span>
          </span>
        </div>

        {/* Title */}
        <h3
          className="event-card-title"
          title={event.title}
          onClick={() => onSelect && onSelect(event)}
        >
          {event.title}
        </h3>

        {/* Tagline / Subtitle */}
        <p className="event-card-desc">
          {event.tagline || event.description}
        </p>

        {/* Footer with Independent Pricing (Prize Pool & Registration Fee) & Action Buttons */}
        <div className="event-card-footer">
          <div className="event-card-pricing">
            <div className="pricing-meta-row">
              <span className="pricing-label">Prize Pool:</span>
              <span className="pricing-value">
                {formatPublicPrizePool(event)}
              </span>
            </div>
            <div className="pricing-meta-row">
              <span className="pricing-label">Registration Fee:</span>
              <span className="pricing-fee-value">
                {formatRegistrationFee(event)}
              </span>
            </div>
          </div>

          <div className="event-card-actions">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSelect && onSelect(event)}
              aria-label={`View details for ${event.title}`}
              className="card-action-btn btn-details"
            >
              Details
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Ticket size={14} />}
              disabled={isClosed}
              onClick={() => onRegister && onRegister(event)}
              aria-label={
                isCompleted
                  ? 'Event has ended'
                  : isClosed
                  ? 'Registration closed'
                  : `Register for ${event.title}`
              }
              className="card-action-btn btn-register"
            >
              {isCompleted ? 'Ended' : isClosed ? 'Closed' : 'Register'}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

