import React from 'react';
import { Calendar, MapPin, Sparkles, AlertCircle, RefreshCw, Star } from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';
import './FeaturedEvents.css';

// Reliable SVG data-URI fallback in case an external image fails to load
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'%3E%3Crect width='100%25' height='100%25' fill='%23151B2B'/%3E%3Ctext x='50%25' y='50%25' fill='%238B5CF6' font-family='sans-serif' font-size='22' font-weight='bold' text-anchor='middle' dominant-baseline='middle'%3EFESTIQ Campus Event%3C/text%3E%3C/svg%3E";

export default function FeaturedEvents({ events, loading, error, onRetry, onEventSelect }) {
  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = FALLBACK_IMAGE;
  };

  return (
    <section id="featured" className="featured-section">
      <div className="container">
        {/* Section Header */}
        <div className="section-header">
          <span className="section-tag">Flagship Campus Highlights</span>
          <h2 className="section-title">
            Featured <span className="text-gradient">Events</span>
          </h2>
          <p className="section-subtitle">
            Handpicked premier events, hackathons, and cultural fests curated for this semester.
          </p>
        </div>

        {/* Loading Skeleton State */}
        {loading && (
          <div className="events-grid" aria-busy="true">
            {[1, 2, 3].map((n) => (
              <div key={n} className="event-card-skeleton">
                <div className="skeleton skeleton-img"></div>
                <div className="skeleton-body">
                  <div className="skeleton skeleton-badge"></div>
                  <div className="skeleton skeleton-title"></div>
                  <div className="skeleton skeleton-meta"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="event-error-container" role="alert">
            <AlertCircle size={40} className="error-icon" />
            <h3 className="error-title">Unable to Connect to FESTIQ API</h3>
            <p className="error-message">{error}</p>
            <Button
              variant="primary"
              size="sm"
              icon={<RefreshCw size={15} />}
              iconPosition="left"
              onClick={onRetry}
            >
              Retry Connection
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && events.length === 0 && (
          <div className="event-empty-container">
            <Sparkles size={40} className="empty-icon" />
            <h3 className="empty-title">No Events Scheduled</h3>
            <p className="empty-message">No upcoming events are currently found. Check back shortly!</p>
          </div>
        )}

        {/* Event Cards Grid */}
        {!loading && !error && events.length > 0 && (
          <div className="events-grid">
            {events.map((event) => (
              <article key={event.id} className="event-card">
                {/* Media Container with 16:9 Aspect Ratio */}
                <div className="card-media">
                  <img
                    src={event.image || event.imageUrl || FALLBACK_IMAGE}
                    alt={event.title}
                    className="card-image"
                    onError={handleImageError}
                    loading="lazy"
                  />
                  <div className="card-media-overlay" aria-hidden="true"></div>

                  {/* Badges Overlay */}
                  <div className="card-badges-wrapper">
                    <Badge variant={event.category} size="sm">
                      {event.category}
                    </Badge>

                    {(event.isFeatured || event.featured) && (
                      <Badge variant="featured" size="sm" icon={<Star size={11} fill="currentColor" />}>
                        Featured
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Card Content Area */}
                <div className="card-content">
                  {/* Metadata Row */}
                  <div className="card-meta-row">
                    <span className="card-meta-item">
                      <Calendar size={13} className="meta-icon" />
                      <span>{event.date}</span>
                    </span>
                    <span className="card-meta-item venue-item" title={event.venue}>
                      <MapPin size={13} className="meta-icon" />
                      <span className="venue-text">{event.venue}</span>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="card-title" title={event.title}>{event.title}</h3>
                  <p className="card-tagline">{event.tagline || event.description}</p>

                  {/* Card Footer */}
                  <div className="card-footer">
                    <div className="card-pricing">
                      <span className="pricing-label">Registration</span>
                      <span className="pricing-value">{event.entryFee || 'Free'}</span>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onEventSelect && onEventSelect(event)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
