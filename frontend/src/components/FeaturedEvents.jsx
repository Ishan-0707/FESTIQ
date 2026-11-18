import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './ui/Button';
import EventCard from './events/EventCard';
import EventCardSkeleton from './events/EventCardSkeleton';
import './FeaturedEvents.css';

export default function FeaturedEvents({ 
  events = [], 
  loading = false, 
  error = null, 
  onRetry, 
  onEventSelect,
  onRegisterEvent 
}) {
  // Filter strictly featured events without duplicates
  const featuredList = React.useMemo(() => {
    const seen = new Set();
    return events
      .filter((ev) => (ev.isFeatured === true || ev.featured === true))
      .filter((ev) => {
        if (seen.has(ev.id)) return false;
        seen.add(ev.id);
        return true;
      })
      .slice(0, 4);
  }, [events]);

  return (
    <section className="featured-section">
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
          <div className="events-grid" aria-busy="true" aria-label="Loading featured campus events">
            <EventCardSkeleton count={3} />
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="event-error-container" role="alert">
            <AlertCircle size={40} className="error-icon" />
            <h3 className="error-title">Unable to Connect to FESTIQ API</h3>
            <p className="error-message">{error}</p>
            {onRetry && (
              <Button
                variant="primary"
                size="md"
                icon={<RefreshCw size={16} />}
                onClick={onRetry}
              >
                Retry Connection
              </Button>
            )}
          </div>
        )}

        {/* Loaded Featured Events Cards */}
        {!loading && !error && featuredList.length > 0 && (
          <div className="events-grid">
            {featuredList.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onSelect={onEventSelect}
                onRegister={onRegisterEvent}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
