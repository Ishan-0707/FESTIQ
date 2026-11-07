import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  AlertCircle, 
  RefreshCw,
  FolderOpen,
  CalendarPlus,
  LayoutGrid,
  List
} from 'lucide-react';
import Button from '../components/ui/Button';
import EventCard from '../components/events/EventCard';
import EventListItem from '../components/events/EventListItem';
import EventCardSkeleton from '../components/events/EventCardSkeleton';
import './ExploreEventsPage.css';

const CATEGORIES = [
  'All',
  'Technical',
  'Cultural',
  'Gaming',
  'Workshops',
  'Management',
  'Sports'
];

export default function ExploreEventsPage({
  events = [],
  loading = false,
  error = null,
  onRetry,
  onEventSelect,
  onRegisterEvent
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || 'All';

  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Synchronize when URL search param changes
  useEffect(() => {
    setSelectedCategory(categoryParam);
  }, [categoryParam]);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    if (category === 'All') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', category);
    }
    setSearchParams(searchParams);
  };

  const handleClearCategory = () => {
    searchParams.delete('category');
    setSearchParams(searchParams);
    setSelectedCategory('All');
  };

  // Filtered event catalogue (natural catalog/chronological order by category)
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (selectedCategory === 'All') return true;
      return ev.category && ev.category.toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [events, selectedCategory]);

  return (
    <div className="explore-page-wrapper page-entrance">
      <div className="container">
        {/* Page Header */}
        <div className="explore-page-header">
          <span className="section-tag">Campus Event Directory</span>
          <h1 className="explore-page-title">
            Explore All <span className="text-gradient">Events</span>
          </h1>
          <p className="explore-page-subtitle">
            Browse the full university campus event catalogue. Filter by category, view real-time capacities, and reserve your place.
          </p>
          <div className="explore-header-actions">
            <Link to="/host-event">
              <Button variant="outline" size="sm" icon={<CalendarPlus size={16} />}>
                Host an Event at FESTIQ
              </Button>
            </Link>
          </div>
        </div>

        {/* Toolbar: Category Filter Pills + View Switcher */}
        <div className="explore-toolbar">
          {/* Category Filter Pills */}
          <div className="category-pills-bar" role="tablist" aria-label="Category Filters">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`cat-pill ${isActive ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(cat)}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle Controls (Icon-only: Grid and List) */}
          <div className="view-mode-toggle-group" role="group" aria-label="View layout options">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              title="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
              title="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Active Filter Indicator & Count Bar */}
        <div className="results-status-bar">
          <div className="results-count">
            Showing <strong>{filteredEvents.length}</strong> of <strong>{events.length}</strong> campus events
            {selectedCategory !== 'All' && (
              <span className="active-filter-badge">
                Category: <strong>{selectedCategory}</strong>
              </span>
            )}
            {selectedCategory !== 'All' && (
              <button
                type="button"
                className="reset-filters-btn"
                onClick={handleClearCategory}
              >
                Reset Filter
              </button>
            )}
          </div>
          <div className="view-mode-indicator">
            <span className="indicator-label">Layout:</span>
            <span className="indicator-val">{viewMode === 'grid' ? 'Grid View' : 'List View'}</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="events-grid" aria-busy="true" aria-label="Loading events">
            <EventCardSkeleton count={6} />
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="event-error-container" role="alert">
            <AlertCircle size={40} className="error-icon" />
            <h3 className="error-title">Unable to Load Events</h3>
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

        {/* Empty State */}
        {!loading && !error && filteredEvents.length === 0 && (
          <div className="event-empty-container">
            <FolderOpen size={48} className="empty-icon" />
            <h3 className="empty-title">No Matching Events Found</h3>
            <p className="empty-message">
              No campus events were found in the selected category. Clear the filter to see all campus events.
            </p>
            <Button
              variant="secondary"
              size="md"
              onClick={handleClearCategory}
            >
              View All Campus Events
            </Button>
          </div>
        )}

        {/* Event Items Container (Grid or List based on viewMode) */}
        {!loading && !error && filteredEvents.length > 0 && (
          viewMode === 'grid' ? (
            <div className="events-grid" aria-label="Campus events grid">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onSelect={onEventSelect}
                  onRegister={onRegisterEvent}
                />
              ))}
            </div>
          ) : (
            <div className="events-list" aria-label="Campus events list">
              {filteredEvents.map((event) => (
                <EventListItem
                  key={event.id}
                  event={event}
                  onSelect={onEventSelect}
                  onRegister={onRegisterEvent}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
