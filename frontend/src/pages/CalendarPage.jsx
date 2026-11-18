import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Lock,
  Sparkles,
  Info,
  CalendarCheck,
  RefreshCw,
  FolderOpen,
  MapPin,
  Clock
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import FestiqLogo from '../components/common/FestiqLogo';
import CalendarGrid from '../components/calendar/CalendarGrid';
import DayEventsPopover from '../components/calendar/DayEventsPopover';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchMyRegistrations } from '../services/api';
import './CalendarPage.css';

const CATEGORIES = [
  'All',
  'Technical',
  'Cultural',
  'Gaming',
  'Workshops',
  'Management',
  'Sports'
];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export default function CalendarPage({
  events = [],
  loading = false,
  error = null,
  onRetry,
  onEventSelect,
  onOpenAuthModal
}) {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  // Mode change transition animation state (1100ms smooth visual glide)
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimerRef = useRef(null);

  // Clean up transition timer on unmount
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  // Trigger smooth 1100ms transition animation without blocking interactions
  const triggerTransition = () => {
    setIsTransitioning(true);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 1100);
  };

  // Active month/year navigation state (defaults to Nov 2026 if events exist)
  const [currentDate, setCurrentDate] = useState(() => {
    const nov2026Event = events.find((e) => (e.date || '').startsWith('2026-11'));
    if (nov2026Event) {
      return new Date(2026, 10, 1);
    }
    return new Date();
  });

  // Selected date for mobile view or day focus
  const [selectedDate, setSelectedDate] = useState(() => {
    return '2026-11-20';
  });

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [myScheduleOnly, setMyScheduleOnly] = useState(false);

  // Authenticated Student Registrations for "My Schedule"
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Day overflow popover state
  const [popoverDate, setPopoverDate] = useState(null);
  const [popoverEvents, setPopoverEvents] = useState([]);

  // Fetch student's registered events when logged in and My Schedule is requested
  const loadStudentSchedule = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingSchedule(true);
    try {
      const res = await fetchMyRegistrations();
      if (res.success && Array.isArray(res.data)) {
        setMyRegistrations(res.data);
      }
    } catch (err) {
      console.warn('[Calendar] Failed to load my registrations:', err.message);
    } finally {
      setLoadingSchedule(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && myScheduleOnly) {
      loadStudentSchedule();
    }
  }, [isAuthenticated, myScheduleOnly, loadStudentSchedule]);

  // Synchronize initial month if events load late
  useEffect(() => {
    if (events.length > 0) {
      const hasNov = events.some((e) => (e.date || '').startsWith('2026-11'));
      if (hasNov && currentDate.getFullYear() !== 2026) {
        setCurrentDate(new Date(2026, 10, 1));
      }
    }
  }, [events]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => {
      const y = prev.getFullYear();
      const m = prev.getMonth();
      return m === 0 ? new Date(y - 1, 11, 1) : new Date(y, m - 1, 1);
    });
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => {
      const y = prev.getFullYear();
      const m = prev.getMonth();
      return m === 11 ? new Date(y + 1, 0, 1) : new Date(y, m + 1, 1);
    });
  };

  const handleToday = () => {
    const hasNov = events.some((e) => (e.date || '').startsWith('2026-11'));
    if (hasNov) {
      setCurrentDate(new Date(2026, 10, 1));
    } else {
      setCurrentDate(new Date());
    }
  };

  // Toggle "My Schedule" filter with exact single notification & 1100ms transition
  const handleToggleMySchedule = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    const nextMode = !myScheduleOnly;
    setMyScheduleOnly(nextMode);

    // Single deliberate notification per user action
    toast.info(
      nextMode
        ? 'Showing your registered campus schedule'
        : 'Showing all discoverable campus events',
      'Calendar'
    );

    triggerTransition();
  };

  // Clear "My Schedule" filter
  const handleClearMySchedule = () => {
    if (!myScheduleOnly) return;
    setMyScheduleOnly(false);
    toast.info('Showing all discoverable campus events', 'Calendar');
    triggerTransition();
  };

  // Set of registered event IDs for the logged-in student
  const registeredEventIdSet = useMemo(() => {
    const set = new Set();
    for (const reg of myRegistrations) {
      if (reg.status !== 'cancelled' && reg.eventId) {
        set.add(reg.eventId);
      }
    }
    return set;
  }, [myRegistrations]);

  // Filtered events based on Category domain and My Schedule
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesCat =
        selectedCategory === 'All' ||
        (ev.category || '').toLowerCase() === selectedCategory.toLowerCase();
      const matchesSchedule = !myScheduleOnly || registeredEventIdSet.has(ev.id);
      return matchesCat && matchesSchedule;
    });
  }, [events, selectedCategory, myScheduleOnly, registeredEventIdSet]);

  // Group events by local date string "YYYY-MM-DD"
  const eventsByDate = useMemo(() => {
    const map = {};
    for (const ev of filteredEvents) {
      if (!ev.date) continue;
      const dateKey = ev.date.trim();
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(ev);
    }
    return map;
  }, [filteredEvents]);

  // Handle "+N more" click
  const handleShowMore = (dateStr, dayEvents) => {
    setPopoverDate(dateStr);
    setPopoverEvents(dayEvents);
  };

  const monthLabel = `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  // Format selected date label for mobile schedule viewer
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return '';
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(y, m, d);
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    return selectedDate;
  }, [selectedDate]);

  const selectedDayEvents = eventsByDate[selectedDate] || [];

  return (
    <div className="calendar-page-wrapper page-entrance">
      <div className="calendar-container">
        {/* Streamlined Compact Page Header */}
        <header className="calendar-page-header">
          <div className="calendar-header-left">
            <div className="calendar-title-group">
              <div className="calendar-hero-badge">
                <FestiqLogo variant="symbol" size={18} />
                <span>University Calendar</span>
              </div>
              <h1 className="calendar-page-title">
                Event <span className="text-gradient">Calendar</span>
              </h1>
            </div>
            <p className="calendar-page-subtitle">
              Campus monthly timeline. Explore hackathons, festivals, workshops, and tournaments.
            </p>
          </div>

          <div className="calendar-header-actions">
            {/* My Schedule Filter Button */}
            <button
              type="button"
              className={`my-schedule-btn ${myScheduleOnly ? 'active' : ''}`}
              onClick={handleToggleMySchedule}
              aria-pressed={myScheduleOnly}
              title={
                isAuthenticated
                  ? 'Toggle filter to show only events you are registered for'
                  : 'Sign in to filter by your registered events'
              }
            >
              <CalendarCheck size={15} className="btn-icon" />
              <span>My Schedule</span>
              {isAuthenticated && myRegistrations.length > 0 && (
                <span className="schedule-count-pill">{myRegistrations.length}</span>
              )}
            </button>
          </div>
        </header>

        {/* Unauthenticated Login Prompt Notice (if visitor clicked My Schedule) */}
        {showLoginPrompt && !isAuthenticated && (
          <div className="calendar-auth-notice" role="alert">
            <div className="notice-left">
              <Lock size={16} className="notice-icon" />
              <div className="notice-text">
                <strong>Student Authentication Required</strong>
                <p>Sign in to filter the calendar by your personal registrations.</p>
              </div>
            </div>
            <div className="notice-actions">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setShowLoginPrompt(false);
                  onOpenAuthModal();
                }}
              >
                Log In / Sign Up
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLoginPrompt(false)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Compact Calendar Navigation & Filter Toolbar */}
        <div className="calendar-toolbar">
          {/* Month Navigation Controls */}
          <div className="month-nav-group">
            <button
              type="button"
              className="month-nav-arrow"
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>

            <h2 className="current-month-heading" aria-live="polite">
              {monthLabel}
            </h2>

            <button
              type="button"
              className="month-nav-arrow"
              onClick={handleNextMonth}
              aria-label="Next Month"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              className="today-shortcut-btn"
              onClick={handleToday}
            >
              Today
            </button>
          </div>

          {/* Right Toolbar Controls: Domain Category Filter & Active Status */}
          <div className="calendar-filters-group">
            <div className="category-select-wrapper">
              <Filter size={13} className="filter-select-icon" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="calendar-category-select"
                aria-label="Filter events by academic discipline"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'All' ? 'All Disciplines' : cat}
                  </option>
                ))}
              </select>
            </div>

            {myScheduleOnly && (
              <div className="active-schedule-badge">
                <CheckCircle2 size={12} />
                <span>My Schedule Active</span>
                <button
                  type="button"
                  className="clear-schedule-btn"
                  onClick={handleClearMySchedule}
                  title="Clear My Schedule filter"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Calendar Content Area with 1100ms Smooth Mode Transition Animation */}
        <div className={`calendar-stage-wrapper ${isTransitioning ? 'calendar-stage-transitioning' : ''}`}>
          {loading ? (
            <div className="calendar-loading-box">
              <div className="dashboard-spinner" />
              <p>Loading campus calendar...</p>
            </div>
          ) : error ? (
            <div className="calendar-error-box">
              <p>{error}</p>
              {onRetry && (
                <Button variant="primary" size="sm" icon={<RefreshCw size={14} />} onClick={onRetry}>
                  Retry Loading
                </Button>
              )}
            </div>
          ) : myScheduleOnly && filteredEvents.length === 0 ? (
            <div className="calendar-empty-schedule">
              <FolderOpen size={36} className="empty-icon" />
              <h3>No Registered Events Found in Your Schedule</h3>
              <p>
                You have not registered for any events matching the selected discipline in this month. Switch back to all events to browse the full university catalog.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  handleClearMySchedule();
                  setSelectedCategory('All');
                }}
              >
                View All Campus Events
              </Button>
            </div>
          ) : (
            /* Full-width 7-Column Monthly Calendar Grid */
            <CalendarGrid
              currentDate={currentDate}
              eventsByDate={eventsByDate}
              selectedDate={selectedDate}
              onSelectDate={(date) => setSelectedDate(date)}
              onSelectEvent={onEventSelect}
              onShowMore={handleShowMore}
            />
          )}
        </div>

        {/* Mobile Selected-Date Schedule Viewer (Appears on screens <= 768px below grid) */}
        <section className="mobile-selected-day-section" aria-label="Selected Date Events">
          <div className="mobile-selected-day-header">
            <div className="selected-day-label">
              <CalendarIcon size={14} className="selected-day-icon" />
              <span>Schedule: {formattedSelectedDate}</span>
            </div>
            <span className="selected-day-count">
              {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'event' : 'events'}
            </span>
          </div>

          <div className="mobile-selected-day-events">
            {selectedDayEvents.length === 0 ? (
              <div className="mobile-empty-day">
                <p>No campus events scheduled on this date.</p>
                <span className="mobile-empty-hint">Tap any date with event dots on the calendar to view its schedule.</span>
              </div>
            ) : (
              selectedDayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="mobile-event-card"
                  onClick={() => onEventSelect && onEventSelect(ev)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (onEventSelect) onEventSelect(ev);
                    }
                  }}
                >
                  <div className="mobile-event-card-top">
                    <span className={`mobile-cat-pill cat-${(ev.category || 'tech').toLowerCase()}`}>
                      {ev.category}
                    </span>
                    <span className="mobile-event-time">
                      <Clock size={11} /> {ev.time || 'Schedule in details'}
                    </span>
                  </div>
                  <h4 className="mobile-event-title">{ev.title}</h4>
                  <div className="mobile-event-venue">
                    <MapPin size={12} />
                    <span>{ev.venue}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Overflow Day Events Popover / Dialog */}
      <DayEventsPopover
        isOpen={Boolean(popoverDate)}
        dateString={popoverDate}
        events={popoverEvents}
        onClose={() => {
          setPopoverDate(null);
          setPopoverEvents([]);
        }}
        onSelectEvent={onEventSelect}
      />
    </div>
  );
}
