/**
 * Backend Prize-Pool Calculator & Sanitizer
 * Implements FESTIQ Business Logic:
 *
 * 1. Explicit Funding Models:
 *    - 'dynamic' / Registration-Funded: Advertised prize pool represents 70–80% (default 75%)
 *      of expected registration revenue based on event capacity.
 *    - 'fixed' / Sponsored: Explicitly configured prize amounts are preserved.
 *
 * 2. Advertised Prize Pool Calculation (Registration-Funded):
 *    - Expected Registration Revenue = Registration Fee × Total Billable Event Capacity
 *    - Raw Prize Pool = Expected Registration Revenue × Prize Allocation Percentage (70–80%, default 75%)
 *    - Displayed Prize Pool = Raw Prize Pool rounded to the nearest ₹500
 *    - Examples:
 *      * ₹100 per team, 100 teams, 75% → ₹7,500
 *      * ₹100 per team, 64 teams, 75% → ₹4,800 raw → ₹5,000 displayed
 *      * ₹200 per team, 16 teams, 75% → ₹2,400 raw → ₹2,500 displayed
 *      * ₹200 per person, 100 participants, 75% → ₹15,000
 *      * ₹300 per person, 100 participants, 80% → ₹24,000
 *      * ₹350 per person, 100 participants, 75% → ₹26,500
 *
 * 3. Actual Collected Revenue:
 *    - Kept strictly separate from the advertised capacity-based prize pool.
 *    - Calculated only from verified successful payments (paymentStatus: 'paid').
 *
 * 4. Confidentiality:
 *    - Public serialization strictly shields college allocation and internal split ratios.
 */

export const DEFAULT_PRIZE_ALLOCATION_PCT = 75;

/**
 * Rounds an amount down to the nearest ₹100.
 * Formula: floor(rawAmount / 100) * 100
 * Examples:
 * - ₹4,800 -> ₹4,800
 * - ₹2,400 -> ₹2,400
 * - ₹11,250 -> ₹11,200
 */
export function roundDownToNearest100(rawAmount) {
  if (!rawAmount || rawAmount <= 0) return 0;
  return Math.floor(rawAmount / 100) * 100;
}

/**
 * Rounds an amount to the nearest ₹500 (retained for backward compatibility).
 */
export function roundToNearest500(rawAmount) {
  if (!rawAmount || rawAmount <= 0) return 0;
  return Math.round(rawAmount / 500) * 500;
}

/**
 * Determines the billing fee type for an event ('per_team' or 'per_person').
 */
export function getEventFeeType(event) {
  if (event.feeType === 'per_team' || event.feeType === 'team') return 'per_team';
  if (event.feeType === 'per_person' || event.feeType === 'person') return 'per_person';

  const entryFeeStr = String(event.entryFee || '').toLowerCase();
  if (entryFeeStr.includes('/ team') || entryFeeStr.includes('per team')) return 'per_team';
  return 'per_person';
}

/**
 * Formats registration fee for independent presentation.
 * Returns clean strings such as 'Free', '₹200 per participant', '₹100 per team'.
 */
export function formatRegistrationFee(event) {
  if (!event) return 'Free';
  const fee = Number(event.feeAmount) || 0;
  if (fee <= 0) {
    const rawEntry = String(event.entryFee || '').trim();
    if (rawEntry && !rawEntry.toLowerCase().includes('free') && rawEntry.includes('₹')) {
      return rawEntry;
    }
    return 'Free';
  }
  const feeType = getEventFeeType(event);
  if (feeType === 'per_team') {
    return `₹${fee.toLocaleString('en-IN')} per team`;
  }
  return `₹${fee.toLocaleString('en-IN')} per participant`;
}

/**
 * Calculates prize pool metrics for an event.
 * Separates advertised capacity-based prize pool from actual verified collected revenue.
 */
export function calculateEventPrizeMetrics(event, allRegistrations = []) {
  const feeAmount = Number(event.feeAmount) || 0;
  const fixedPrize = Number(event.prizeAmount) || 0;
  const feeType = getEventFeeType(event);
  const capacity = Number(event.capacity) || 0;

  // Determine explicit funding model
  let fundingModel = 'fixed';
  if (event.prizePoolType === 'materials_fee') {
    fundingModel = 'materials_fee';
  } else if (event.prizePoolType === 'dynamic' || event.prizePoolType === 'registration_funded') {
    fundingModel = 'dynamic';
  } else if (event.prizePoolType === 'fixed') {
    fundingModel = 'fixed';
  } else if (feeAmount > 0 || event.registrationType === 'paid' || event.isPaid === true) {
    fundingModel = 'dynamic';
  } else {
    fundingModel = 'fixed';
  }

  // Validate allocation percentage (70% - 80%, default 75%)
  const rawPct = Number(event.prizeAllocationPct);
  const prizePct = isNaN(rawPct)
    ? DEFAULT_PRIZE_ALLOCATION_PCT
    : Math.min(80, Math.max(70, rawPct));
  const collegePct = 100 - prizePct;

  // Actual verified collected payments (strictly separate from advertised estimate)
  const eligiblePaidRegistrations = allRegistrations.filter((r) => {
    if (r.eventId !== event.id) return false;
    if (r.status !== 'confirmed') return false;
    const isPaid =
      r.paymentStatus === 'paid' ||
      (r.payment && r.payment.status === 'paid' && r.payment.verified === true);
    return Boolean(isPaid);
  });
  const paidCount = eligiblePaidRegistrations.length;

  let paidBillableUnits = 0;
  if (feeType === 'per_team') {
    paidBillableUnits = paidCount;
  } else {
    if (event.billableTeamSize === true || event.pricingMode === 'per_member') {
      paidBillableUnits = eligiblePaidRegistrations.reduce((sum, r) => {
        const teamSize = Number(r.teamSize) || (Array.isArray(r.teamMembers) ? r.teamMembers.length + 1 : 1);
        return sum + Math.max(1, teamSize);
      }, 0);
    } else {
      paidBillableUnits = paidCount;
    }
  }

  const collectedRevenue = feeAmount * paidBillableUnits;

  // 1. Class D: Materials-Based Experience (Isolated from 75/25 competitive split)
  if (fundingModel === 'materials_fee') {
    const expectedRevenue = feeAmount * capacity;
    return {
      prizePoolType: 'materials_fee',
      fundingModel: 'materials_fee',
      feeType,
      feeAmount,
      capacity,
      expectedRevenue,
      rawPrizePoolAmount: 0,
      advertisedPrizePool: 0,
      prizePoolAmount: 0,
      // Collected metrics
      collectedAmount: collectedRevenue,
      actualPrizeFund: 0,
      collegeAllocation: 0,
      materialsAllocation: collectedRevenue,
      prizeAllocationPct: 0,
      collegeAllocationPct: 0,
      paidRegistrationsCount: paidCount,
      billableUnitsCount: paidBillableUnits
    };
  }

  // 2. Fixed / Sponsored Prize Pool: Preserve explicit prize
  if (fundingModel === 'fixed' || (feeAmount === 0 && fixedPrize > 0)) {
    return {
      prizePoolType: 'fixed',
      fundingModel: 'fixed',
      feeType,
      feeAmount,
      capacity,
      expectedRevenue: 0,
      rawPrizePoolAmount: fixedPrize,
      advertisedPrizePool: fixedPrize,
      prizePoolAmount: fixedPrize,
      // Actual collected metrics (kept strictly separate)
      collectedAmount: collectedRevenue,
      actualPrizeFund: 0,
      collegeAllocation: 0,
      prizeAllocationPct: prizePct,
      collegeAllocationPct: collegePct,
      paidRegistrationsCount: paidCount,
      billableUnitsCount: paidBillableUnits
    };
  }

  // 3. Dynamic Registration-Funded Advertised Prize Pool:
  // Expected Registration Revenue = Registration Fee × Total Billable Event Capacity
  const expectedRevenue = feeAmount * capacity;
  const rawPrizePoolAmount = expectedRevenue * (prizePct / 100);
  const advertisedPrizePool = roundDownToNearest100(rawPrizePoolAmount);
  // Distributable prize must never exceed verified collected revenue * 75%
  const actualPrizeFund = Math.min(advertisedPrizePool, Math.floor(collectedRevenue * (prizePct / 100)));
  const actualCollegeAllocation = collectedRevenue - actualPrizeFund;

  return {
    prizePoolType: 'dynamic',
    fundingModel: 'dynamic',
    feeType,
    feeAmount,
    capacity,
    expectedRevenue,
    rawPrizePoolAmount,
    advertisedPrizePool,
    prizePoolAmount: advertisedPrizePool,
    // Actual collected metrics (kept strictly separate)
    collectedAmount: collectedRevenue,
    actualPrizeFund,
    collegeAllocation: actualCollegeAllocation, // Strictly internal metric
    prizeAllocationPct: prizePct,
    collegeAllocationPct: collegePct,
    paidRegistrationsCount: paidCount,
    billableUnitsCount: paidBillableUnits
  };
}

/**
 * Sanitizes an event for public API responses.
 * Strictly conceals internal college allocation, revenue share, and private accounting.
 */
export function sanitizeEventForPublic(event, allRegistrations = []) {
  const metrics = calculateEventPrizeMetrics(event, allRegistrations);

  // Clone event object
  const sanitized = { ...event };

  // Independent Registration Fee field
  sanitized.registrationFee = formatRegistrationFee(event);
  sanitized.entryFee = sanitized.registrationFee;
  sanitized.feeAmount = metrics.feeAmount;
  sanitized.feeType = metrics.feeType;
  sanitized.isPaid = metrics.feeAmount > 0;
  sanitized.prizePoolType = metrics.prizePoolType;

  if (metrics.prizePoolType === 'materials_fee') {
    sanitized.prizeAmount = 0;
    sanitized.prizePool = event.prizePool || 'Hardware Kit & Certificate';
    sanitized.advertisedPrizePool = 0;
  } else if (metrics.prizePoolType === 'dynamic') {
    sanitized.prizeAmount = metrics.advertisedPrizePool;
    sanitized.prizePool = `₹${metrics.advertisedPrizePool.toLocaleString('en-IN')}`;
    sanitized.advertisedPrizePool = metrics.advertisedPrizePool;
  } else {
    // Fixed / sponsored prize pool
    if (metrics.prizePoolAmount > 0) {
      sanitized.prizeAmount = metrics.prizePoolAmount;
      sanitized.prizePool = `₹${metrics.prizePoolAmount.toLocaleString('en-IN')}`;
    } else {
      sanitized.prizeAmount = event.prizeAmount || 0;
      sanitized.prizePool = event.prizePool || 'Trophies & Citations';
    }
  }

  // Status metrics
  sanitized.paidRegistrationsCount = metrics.paidRegistrationsCount;

  // Strictly strip confidential internal business properties
  delete sanitized.prizeAllocationPct;
  delete sanitized.collegeAllocation;
  delete sanitized.collegeAllocationPct;
  delete sanitized.collegeRevenue;
  delete sanitized.collegeShare;
  delete sanitized.revenueSplit;
  delete sanitized.profitSplit;
  delete sanitized.internalAccounting;
  delete sanitized.rawPrizePoolAmount;
  delete sanitized.actualCollegeAllocation;
  delete sanitized.expectedRevenue;
  delete sanitized.materialsAllocation;

  return sanitized;
}
