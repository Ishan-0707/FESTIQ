import React from 'react';
import CalendarDayCell from './CalendarDayCell';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function CalendarGrid({
  currentDate, // Date object representing the active month
  eventsByDate = {},
  selectedDate,
  onSelectDate,
  onSelectEvent,
  onShowMore
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Today's date components in local time
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  // First day of month and total days
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 for Sun
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

  // Helper to format YYYY-MM-DD in local time
  const formatYMD = (y, m, d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${y}-${pad(m + 1)}-${pad(d)}`;
  };

  // Build calendar day cells
  const dayCells = [];

  // 1. Previous month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = totalDaysInPrevMonth - i;
    const prevMonthIdx = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = formatYMD(prevYear, prevMonthIdx, d);
    dayCells.push({
      key: `prev-${dateStr}`,
      dayNumber: d,
      dateString: dateStr,
      isCurrentMonth: false,
      isToday: false,
      events: eventsByDate[dateStr] || []
    });
  }

  // 2. Current month active days
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateStr = formatYMD(year, month, d);
    const isToday = year === todayYear && month === todayMonth && d === todayDay;
    dayCells.push({
      key: `curr-${dateStr}`,
      dayNumber: d,
      dateString: dateStr,
      isCurrentMonth: true,
      isToday,
      events: eventsByDate[dateStr] || []
    });
  }

  // 3. Next month leading days to complete grid (multiples of 7, up to 35 or 42)
  const remainingCells = (7 - (dayCells.length % 7)) % 7;
  const targetTotal = dayCells.length + remainingCells < 35 ? 35 : dayCells.length + remainingCells;
  const nextMonthPadding = targetTotal - dayCells.length;

  for (let d = 1; d <= nextMonthPadding; d++) {
    const nextMonthIdx = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = formatYMD(nextYear, nextMonthIdx, d);
    dayCells.push({
      key: `next-${dateStr}`,
      dayNumber: d,
      dateString: dateStr,
      isCurrentMonth: false,
      isToday: false,
      events: eventsByDate[dateStr] || []
    });
  }

  // Calculate dynamic rows (5 or 6)
  const rowCount = Math.ceil(dayCells.length / 7);

  return (
    <div className="calendar-grid-wrapper" role="region" aria-label="Monthly Calendar Grid">
      {/* Weekday Column Headers */}
      <div className="calendar-weekdays-row" role="row">
        {WEEKDAYS.map((day) => (
          <div key={day} className="weekday-header" role="columnheader">
            <span>{day}</span>
          </div>
        ))}
      </div>

      {/* Days Matrix (5-row or 6-row dynamic responsive grid) */}
      <div
        className="calendar-month-matrix"
        role="grid"
        style={{ '--calendar-rows': rowCount }}
      >
        {dayCells.map((cell) => (
          <CalendarDayCell
            key={cell.key}
            dayNumber={cell.dayNumber}
            dateString={cell.dateString}
            isCurrentMonth={cell.isCurrentMonth}
            isToday={cell.isToday}
            isSelected={selectedDate === cell.dateString}
            events={cell.events}
            onDateClick={onSelectDate}
            onEventClick={onSelectEvent}
            onShowMore={onShowMore}
          />
        ))}
      </div>
    </div>
  );
}
