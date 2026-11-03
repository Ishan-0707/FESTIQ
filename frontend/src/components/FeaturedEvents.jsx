import React from 'react';
import { Calendar, MapPin, Sparkles, AlertCircle, RefreshCw, Trophy, Users } from 'lucide-react';
import './FeaturedEvents.css';

// Reliable SVG placeholder fallback in case external images fail to load
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'%3E%3Crect width='100%25' height='100%25' fill='%23121829'/%3E%3Ctext x='50%25' y='50%25' fill='%238B5CF6' font-family='sans-serif' font-size='24' font-weight='bold' text-anchor='middle' dominant-baseline='middle'%3EFESTIQ Campus Event%3C/text%3E%3C/svg%3E";

export default function FeaturedEvents({ events, loading, error, onRetry, onEventSelect }) {
  // Handle image load error gracefully with fallback
  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = FALLBACK_IMAGE;
  };

  const getCategoryClass = (category) => {
    const cat = (category || '').toLowerCase();
    switch (cat) {
      case 'technical': return 'badge-technical';
      case 'cultural': return 'badge-cultural';
      case 'gaming': return 'badge-gaming';
      case 'workshops': return 'badge-workshops';
      case 'management': return 'badge-management';
      case 'sports': return 'badge-sports';
      default: return 'badge-technical';
    }
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

        {/* Loading State */}
        {loading && (
          <div className="events-grid">
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
          <div className="event-error-container">
            <AlertCircle size={42} className="error-icon" />
            <h3 className="error-title">Unable to Connect to FESTIQ API</h3>
            <p className="error-message">{error}</p>
            <button className="btn btn-primary btn-sm" onClick={onRetry}>
              <RefreshCw size={16} />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && events.length === 0 && (
          <div className="event-empty-container">
            <Sparkles size={42} className="empty-icon" />
            <h3 className="empty-title">No Events Available</h3>
            <p className="empty-message">No upcoming events are currently scheduled. Check back shortly!</p>
          </div>
        )}

        {/* Event Cards Grid */}
        {!loading && !error && events.length > 0 && (
          <div className="events-grid">
            {events.map((event) => (
              <article key={event.id} className="event-card">
                {/* Image Banner */}
                <div className="card-media">
                  <img
                    src={event.imageUrl || FALLBACK_IMAGE}
                    alt={event.title}
                    className="card-image"
                    onError={handleImageError}
                    loading="lazy"
                  />
                  <div className="card-media-overlay"></div>
                  <span className={`badge ${getCategoryClass(event.category)} card-badge`}>
                    {event.category}
                  </span>
                  {event.isFeatured && (
                    <span className="badge badge-featured card-featured-badge">
                      ★ Featured
                    </span>
                  )}
                </div>

                {/* Card Content */}
                <div className="card-content">
                  <div className="card-meta-row">
                    <span className="card-meta-item">
                      <Calendar size={14} className="meta-icon" />
                      <span>{event.date}</span>
                    </span>
                    <span className="card-meta-item">
                      <MapPin size={14} className="meta-icon" />
                      <span className="venue-text">{event.venue}</span>
                    </span>
                  </div>

                  <h3 className="card-title">{event.title}</h3>
                  <p className="card-tagline">{event.tagline || event.description}</p>

                  <div className="card-footer">
                    <div className="card-pricing">
                      <span className="pricing-label">Entry</span>
                      <span className="pricing-value">{event.entryFee || 'Free'}</span>
                    </div>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onEventSelect && onEventSelect(event)}
                    >
                      View Details
                    </button>
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

