import React from 'react';
import { Calendar, MapPin, Sparkles, Ticket, ChevronRight, Trophy } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { getEventStatus } from '../../utils/eventStatus';
import { formatPublicPrizePool, formatRegistrationFee } from '../../utils/prizePool';
import './EventListItem.css';

const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'%3E%3Crect width='100%25' height='100%25' fill='%23202F27'/%3E%3Ctext x='50%25' y='50%25' fill='%23C6A96B' font-family='sans-serif' font-size='22' font-weight='bold' text-anchor='middle' dominant-baseline='middle'%3EFESTIQ Campus Event%3C/text%3E%3C/svg%3E";

export default function EventListItem({
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
    <article className="festiq-event-list-item card-hover-fx">
      {/* Thumbnail Area */}
      <div
        className="list-item-thumbnail-wrap"
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
          className="list-item-img"
          loading="lazy"
          onError={handleImageError}
        />
        <div className="list-item-thumbnail-overlay" />
        <div className="list-item-category-floating">
          <Badge variant={event.category} size="xs">
            {event.category}
          </Badge>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="list-item-content">
        <div className="list-item-header">
          <div className="list-item-badges">
            <Badge variant={event.category} size="sm" className="desktop-cat-badge">
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

          <div className="list-item-meta">
            <span className="list-meta-item">
              <Calendar size={13} className="meta-icon" />
              <span>{event.date}</span>
            </span>
            <span className="list-meta-item venue-item" title={event.venue}>
              <MapPin size={13} className="meta-icon" />
              <span className="venue-text">{event.venue}</span>
            </span>
          </div>
        </div>

        <h3
          className="list-item-title"
          title={event.title}
          onClick={() => onSelect && onSelect(event)}
        >
          {event.title}
        </h3>

        <p className="list-item-tagline">
          {event.tagline || event.description}
        </p>
      </div>

      {/* Right Column: Pricing & Actions */}
      <div className="list-item-side">
        <div className="list-item-pricing">
          <div className="list-pricing-row prize-row">
            <span className="list-pricing-label">
              <Trophy size={13} className="pricing-icon" />
              Prize Pool:
            </span>
            <span className="list-pricing-val prize-val">
              {formatPublicPrizePool(event)}
            </span>
          </div>
          <div className="list-pricing-row fee-row">
            <span className="list-pricing-label">Registration:</span>
            <span className="list-pricing-val fee-val">
              {formatRegistrationFee(event)}
            </span>
          </div>
        </div>

        <div className="list-item-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onSelect && onSelect(event)}
            aria-label={`View details for ${event.title}`}
            className="list-action-btn btn-details"
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
            className="list-action-btn btn-register"
          >
            {isCompleted ? 'Ended' : isClosed ? 'Closed' : 'Register'}
          </Button>
        </div>
      </div>
    </article>
  );
}

