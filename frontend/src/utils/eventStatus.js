/**
 * Centralized Event Status Derivation Engine.
 *
 * Requirements:
 * 1. 'Completed' takes priority over all other statuses.
 * 2. Evaluates event dates in the local timezone (comparing end of event day against current time).
 * 3. Never produces contradictory states (e.g. a completed event will never show registration open).
 */
export function getEventStatus(event) {
  if (!event) {
    return { status: 'Upcoming', variant: 'upcoming', label: 'Upcoming' };
  }

  const now = new Date();

  // 1. Check if event is completed (Strict Priority 1)
  if (event.date) {
    const parts = event.date.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [year, month, day] = parts;
      // Local calendar end of day: 23:59:59.999
      const localEventEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
      if (now > localEventEnd) {
        return {
          status: 'Completed',
          variant: 'completed',
          label: 'Completed'
        };
      }
    }
  }

  const capacity = Number(event.capacity) || 0;
  const registeredCount = Number(event.registeredCount) || 0;
  const isExplicitlyClosed = (event.status || '').toLowerCase() === 'closed';

  // 2. Registration Closed
  if (isExplicitlyClosed || (capacity > 0 && registeredCount >= capacity)) {
    return {
      status: 'Registration Closed',
      variant: 'closed',
      label: 'Registration Closed'
    };
  }

  // 3. Filling Fast (>= 85% capacity or <= 15 spots left)
  if (capacity > 0 && (registeredCount >= capacity * 0.85 || (capacity - registeredCount) <= 15)) {
    return {
      status: 'Filling Fast',
      variant: 'warning',
      label: 'Filling Fast'
    };
  }

  // 4. Registration Open
  if ((event.status || '').toLowerCase() === 'open') {
    return {
      status: 'Registration Open',
      variant: 'open',
      label: 'Registration Open'
    };
  }

  // 5. Default Upcoming
  return {
    status: 'Upcoming',
    variant: 'upcoming',
    label: 'Upcoming'
  };
}

