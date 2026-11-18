import React from 'react';
import Badge from '../ui/Badge';

export default function CalendarDayCell({
  dateObj,
  dateString,
  dayNumber,
  isCurrentMonth,
  isToday,
  isSelected,
  events = [],
  onDateClick,
  onEventClick,
  onShowMore
}) {
  const MAX_VISIBLE_EVENTS = 4;
  const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS);
  const overflowCount = events.length - MAX_VISIBLE_EVENTS;

  // Format event start time display (e.g. "09:00 AM")
  const formatTimeBrief = (timeStr) => {
    if (!timeStr) return '';
    const match = timeStr.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    return match ? match[1].trim() : '';
  };

  return (
    <div
      className={`calendar-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${
        isToday ? 'is-today' : ''
      } ${isSelected ? 'is-selected' : ''}`}
      role="gridcell"
      aria-label={`${dateString}, ${events.length} events`}
      onClick={() => onDateClick && onDateClick(dateString)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onDateClick) onDateClick(dateString);
        }
      }}
    >
      {/* Day Header with Number & Count */}
      <div className="day-cell-header">
        <span className={`day-number ${isToday ? 'today-pill' : ''}`}>
          {dayNumber}
        </span>
        {events.length > 0 && (
          <span className="day-event-count" title={`${events.length} events scheduled`}>
            {events.length}
          </span>
        )}
      </div>

      {/* Mobile Indicator Dots (Rendered on mobile, hidden on desktop via CSS) */}
      {events.length > 0 && (
        <div className="day-mobile-dots" aria-hidden="true">
          {events.slice(0, 3).map((ev) => (
            <span
              key={ev.id}
              className={`mobile-dot cat-${(ev.category || 'tech').toLowerCase()}`}
            />
          ))}
          {events.length > 3 && <span className="mobile-dot-more">+{events.length - 3}</span>}
        </div>
      )}

      {/* Desktop Events List Inside Date Cell */}
      <div className="day-events-list">
        {visibleEvents.map((ev) => {
          const timeBrief = formatTimeBrief(ev.time);
          return (
            <button
              key={ev.id}
              type="button"
              className={`calendar-event-chip cat-${(ev.category || 'tech').toLowerCase()}`}
              onClick={(e) => {
                e.stopPropagation();
                onEventClick(ev);
              }}
              title={`${ev.title} (${ev.category}) - ${ev.time || 'Schedule in details'}`}
              aria-label={`View details for ${ev.title}`}
            >
              <span className="chip-category-dot" />
              {timeBrief && <span className="chip-time">{timeBrief}</span>}
              <span className="chip-title">{ev.title}</span>
            </button>
          );
        })}

        {/* "+N more" expansion button */}
        {overflowCount > 0 && (
          <button
            type="button"
            className="calendar-more-btn"
            onClick={(e) => {
              e.stopPropagation();
              onShowMore(dateString, events);
            }}
            title={`View all ${events.length} events for ${dateString}`}
          >
            +{overflowCount} more
          </button>
        )}
      </div>
    </div>
  );
}
