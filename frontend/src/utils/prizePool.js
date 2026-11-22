/**
 * FESTIQ Frontend Prize-Pool & Registration Fee Presentation Helper
 * Strictly enforces business rules:
 * - Prize pool is determined by event's MINIMUM EXPECTED REGISTRATIONS (N)
 * - Prize pool is NOT recalculated using actual registrations (A)
 * - Once approved, prize pool remains fixed even when registrations exceed N
 * - Additional registration revenue beyond N becomes additional profit (E)
 * - Profit split: 60% College, 40% Organizing Team
 * - Prize-pool allocation percentage: 60% to 70%, default 65%
 * - Public displays show approved fixed prize pool (never recalculate or inflate dynamically)
 */

export const DEFAULT_PRIZE_ALLOCATION_PCT = 65; // Default 65% (configurable 60% - 70%)
export const MIN_PRIZE_ALLOCATION_PCT = 60;
export const MAX_PRIZE_ALLOCATION_PCT = 70;
export const COLLEGE_PROFIT_SHARE_PCT = 60;     // Fixed 60% of total profit
export const ORGANIZER_PROFIT_SHARE_PCT = 40;   // Fixed 40% of total profit

/**
 * Determines the billing fee type for an event ('per_team' or 'per_person').
 */
export function getEventFeeType(event) {
  if (!event) return 'per_person';
  if (event.feeType === 'per_team' || event.feeType === 'team') return 'per_team';
  if (event.feeType === 'per_person' || event.feeType === 'person') return 'per_person';

  const entryFeeStr = String(event.entryFee || event.registrationFee || '').toLowerCase();
  if (entryFeeStr.includes('/ team') || entryFeeStr.includes('per team')) return 'per_team';
  return 'per_person';
}

/**
 * Formats the registration fee for an event.
 * Clearly differentiates Free events from Paid events and specifies the billing model.
 * e.g. "Free", "₹200 per participant", "₹100 per team".
 */
export function formatRegistrationFee(event) {
  if (!event) return 'Free';

  const fee = Number(event.feeAmount);
  if (!isNaN(fee) && fee > 0) {
    const feeType = (event.feeType === 'per_team' || event.feeType === 'team') ? 'per team' : 'per participant';
    return `₹${fee.toLocaleString('en-IN')} ${feeType}`;
  }

  // Check explicit registrationFee string
  if (event.registrationFee && typeof event.registrationFee === 'string') {
    const trimmed = event.registrationFee.trim();
    if (trimmed && trimmed.toLowerCase() !== 'free') {
      return trimmed;
    }
  }

  // Check legacy entryFee string if formatted as a paid amount
  if (event.entryFee && typeof event.entryFee === 'string') {
    const trimmed = event.entryFee.trim();
    if (trimmed.includes('₹')) {
      return trimmed.replace('/', 'per').trim();
    }
    if (trimmed.toLowerCase() !== 'free') {
      return trimmed;
    }
  }

  return 'Free';
}

/**
 * Formats prize-pool for public presentation across cards, modals, and listings.
 * Strictly conceals internal college allocation and revenue formulas.
 * Uses approved fixed prize pool snapshot or server-sanitized prize amount.
 * Never outputs registration fee or "Free Entry".
 */
export function formatPublicPrizePool(event) {
  if (!event) return 'Trophies & Citations';

  // 1. Materials-fee experience events (e.g. RoboCraft)
  if (event.prizePoolType === 'materials_fee') {
    return event.prizePool || 'Hardware Kit & Certificate';
  }

  // 2. Event with approved fixed prize pool snapshot
  if (event.financialSnapshot && event.financialSnapshot.fixedPrizePool > 0) {
    return `₹${Number(event.financialSnapshot.fixedPrizePool).toLocaleString('en-IN')}`;
  }

  // 3. Explicit numeric prize amount provided by sanitized backend
  const numPrize = Number(event.prizeAmount);
  if (!isNaN(numPrize) && numPrize > 0) {
    return `₹${numPrize.toLocaleString('en-IN')}`;
  }

  // 4. Formatted string if contains currency
  if (event.prizePool && typeof event.prizePool === 'string') {
    const trimmed = event.prizePool.trim();
    if (trimmed.includes('₹')) {
      return trimmed;
    }
    if (!trimmed.toLowerCase().includes('free entry') && trimmed !== 'Free' && trimmed !== 'Pending Approval') {
      return trimmed;
    }
  }

  // 5. Free events fallback
  return 'Trophies & Citations';
}

/**
 * Shared approval predicate for financial snapshots across FESTIQ.
 * Guarantees parity between public frontend aggregates and backend management metrics.
 * Requirements:
 * 1. Event and event.financialSnapshot must exist.
 * 2. snapshot.approved === true (strict boolean).
 * 3. snapshot.status === 'APPROVED'.
 * 4. Number(snapshot.fixedPrizePool) > 0 and not NaN.
 * 5. Effective fee > 0 and not NaN.
 * 6. event.prizePoolType !== 'materials_fee'.
 */
export function isApprovedFinancialSnapshot(event) {
  if (!event || !event.financialSnapshot) return false;
  const snapshot = event.financialSnapshot;
  const fixedPrize = Number(snapshot.fixedPrizePool);
  const fee = Number(snapshot.feeAmount !== undefined ? snapshot.feeAmount : event.feeAmount);
  return (
    snapshot.approved === true &&
    snapshot.status === 'APPROVED' &&
    !isNaN(fixedPrize) &&
    fixedPrize > 0 &&
    !isNaN(fee) &&
    fee > 0 &&
    event.prizePoolType !== 'materials_fee'
  );
}

/**
 * Calculates total combined prize pool for public aggregates (e.g. Homepage Hero).
 * Equals the sum of approved fixed prize pools across eligible events.
 * Excludes events without an approved prize pool, free events, and draft configurations.
 * Does not sum registration revenue or college/organizer profit.
 */
export function calculateCombinedPrizePool(events = []) {
  if (!Array.isArray(events) || events.length === 0) return 0;

  const seenEventIds = new Set();
  let total = 0;

  for (const ev of events) {
    if (!ev || !ev.id || seenEventIds.has(ev.id)) continue;
    seenEventIds.add(ev.id);

    // Strictly count approved fixed prize pool from verified snapshots only
    if (isApprovedFinancialSnapshot(ev)) {
      total += Number(ev.financialSnapshot.fixedPrizePool);
    }
  }

  return total;
}
