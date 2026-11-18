/**
 * FESTIQ Calendar Export Utilities
 * Provides RFC 5545 standard .ics file generation and Google Calendar deep links.
 */

/**
 * Parses event date string (YYYY-MM-DD) and time string (e.g., "09:00 AM - 05:00 PM" or "10:00 AM")
 * into Date objects in local time, avoiding UTC date shifts.
 */
export function parseEventDateTimeRange(dateStr, timeStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const fallback = new Date();
    return { start: fallback, end: new Date(fallback.getTime() + 2 * 60 * 60 * 1000) };
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  // Default to 10:00 AM start, 12:00 PM end (2-hour default)
  let startHour = 10;
  let startMin = 0;
  let endHour = 12;
  let endMin = 0;

  if (timeStr && typeof timeStr === 'string') {
    // Check for range e.g. "09:00 AM - 05:00 PM"
    const parts = timeStr.split(/\s*-\s*/);
    
    const parseTimeComponent = (str) => {
      const match = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const meridiem = (match[3] || '').toUpperCase();
      if (meridiem === 'PM' && h < 12) h += 12;
      if (meridiem === 'AM' && h === 12) h = 0;
      return { h, m };
    };

    if (parts.length >= 1) {
      const parsedStart = parseTimeComponent(parts[0]);
      if (parsedStart) {
        startHour = parsedStart.h;
        startMin = parsedStart.m;
        // Default end is start + 2 hours
        endHour = (startHour + 2) % 24;
        endMin = startMin;
      }
    }

    if (parts.length >= 2) {
      const parsedEnd = parseTimeComponent(parts[1]);
      if (parsedEnd) {
        endHour = parsedEnd.h;
        endMin = parsedEnd.m;
      }
    }
  }

  const startDate = new Date(year, month - 1, day, startHour, startMin, 0);
  let endDate = new Date(year, month - 1, day, endHour, endMin, 0);

  // If end time is before start time (e.g. hackathon spanning overnight), roll over to next day
  if (endDate <= startDate) {
    endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
  }

  return { start: startDate, end: endDate };
}

/**
 * Formats a Date object to UTC string for Google Calendar and iCal: YYYYMMDDTHHmmssZ
 */
function formatDateToUTCString(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

/**
 * Generates a prefilled Google Calendar web URL
 */
export function generateGoogleCalendarUrl(event) {
  if (!event) return '#';
  const { start, end } = parseEventDateTimeRange(event.date, event.time);

  const datesParam = `${formatDateToUTCString(start)}/${formatDateToUTCString(end)}`;
  const title = encodeURIComponent(event.title || 'FESTIQ Campus Event');
  const details = encodeURIComponent(
    `${event.tagline || ''}\n\n${event.description || ''}\n\nOrganized by: ${event.organizer || 'KIIT University'}\nFESTIQ Platform: http://localhost:5173/events`
  );
  const location = encodeURIComponent(event.venue || 'KIIT University Campus');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}&location=${location}`;
}

/**
 * Generates and triggers download of an RFC 5545 standard .ics file
 */
export function downloadIcsFile(event) {
  if (!event) return;
  const { start, end } = parseEventDateTimeRange(event.date, event.time);

  const dtStart = formatDateToUTCString(start);
  const dtEnd = formatDateToUTCString(end);
  const dtStamp = formatDateToUTCString(new Date());
  const uid = `festiq-${event.id || Date.now()}@kiit.ac.in`;

  // Escape special chars for ICS (backslashes, semicolons, commas, newlines)
  const escapeIcs = (str) =>
    (str || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');

  const summary = escapeIcs(event.title || 'FESTIQ Campus Event');
  const description = escapeIcs(
    `${event.tagline || ''}\n\n${event.description || ''}\n\nCategory: ${event.category || 'General'}\nOrganizer: ${event.organizer || 'Campus Committee'}`
  );
  const location = escapeIcs(event.venue || 'KIIT University Campus');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FESTIQ//Campus Events Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `STATUS:CONFIRMED`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${(event.title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

