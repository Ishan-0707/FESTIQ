import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FeaturedEvents from './components/FeaturedEvents';
import CategoryPreview from './components/CategoryPreview';
import Footer from './components/Footer';
import { checkBackendHealth, fetchEvents } from './services/api';

export default function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendHealth, setBackendHealth] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Load events and check health on initial mount
  const loadInitialData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Health check
      const health = await checkBackendHealth();
      setBackendHealth(health);

      // 2. Fetch events from Express API
      const response = await fetchEvents();
      if (response.success) {
        setEvents(response.data);
      } else {
        setError(response.error || 'Failed to retrieve event records');
      }
    } catch (err) {
      setError(err.message || 'Network error connecting to backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleScrollToExplore = () => {
    const featuredEl = document.getElementById('featured');
    if (featuredEl) {
      featuredEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCategorySelect = async (category) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchEvents({ category });
      if (response.success) {
        setEvents(response.data);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      handleScrollToExplore();
    }
  };

  return (
    <div className="festiq-app">
      {/* Navigation */}
      <Navbar onExploreClick={handleScrollToExplore} />

      {/* Main Content Shell */}
      <main>
        {/* Hero Section */}
        <Hero onExploreClick={handleScrollToExplore} />

        {/* Featured Events (Fetched directly from Express API) */}
        <FeaturedEvents
          events={events}
          loading={loading}
          error={error}
          onRetry={loadInitialData}
          onEventSelect={(event) => setSelectedEvent(event)}
        />

        {/* Category Preview */}
        <CategoryPreview onSelectCategory={handleCategorySelect} />
      </main>

      {/* Footer */}
      <Footer />

      {/* Phase 1 Quick Preview Modal for Selected Event */}
      {selectedEvent && (
        <div className="event-modal-backdrop" onClick={() => setSelectedEvent(null)}>
          <div className="event-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="event-modal-header">
              <span className="badge badge-technical">{selectedEvent.category}</span>
              <button 
                className="event-modal-close" 
                onClick={() => setSelectedEvent(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <h3 className="event-modal-title">{selectedEvent.title}</h3>
            <p className="event-modal-desc">{selectedEvent.description}</p>
            <div className="event-modal-meta">
              <div><strong>Date:</strong> {selectedEvent.date}</div>
              <div><strong>Time:</strong> {selectedEvent.time}</div>
              <div><strong>Venue:</strong> {selectedEvent.venue}</div>
              <div><strong>Entry Fee:</strong> {selectedEvent.entryFee}</div>
            </div>
            <div className="event-modal-actions">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  alert(`Registration for "${selectedEvent.title}" will be fully enabled in Phase 6!`);
                  setSelectedEvent(null);
                }}
              >
                Register For Event
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Quick Styles */}
      <style>{`
        .event-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .event-modal-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-hover);
          border-radius: var(--radius-lg);
          padding: 32px;
          max-width: 560px;
          width: 100%;
          box-shadow: var(--shadow-glow);
          animation: modalFadeIn 0.25s ease;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .event-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .event-modal-close {
          color: var(--text-secondary);
          font-size: 1.25rem;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
        }
        .event-modal-close:hover {
          color: var(--text-primary);
          background: var(--bg-surface-elevated);
        }
        .event-modal-title {
          font-family: var(--font-heading);
          font-size: 1.5rem;
          margin-bottom: 12px;
          line-height: 1.3;
        }
        .event-modal-desc {
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .event-modal-meta {
          background: var(--bg-primary);
          border-radius: var(--radius-md);
          padding: 16px;
          margin-bottom: 24px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          font-size: 0.88rem;
          color: var(--text-secondary);
        }
        .event-modal-meta strong {
          color: var(--text-primary);
        }
        .event-modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
}
