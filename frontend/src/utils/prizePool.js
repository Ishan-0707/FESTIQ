/**
 * FESTIQ Prize-Pool & Registration Fee Presentation Helper
 * Strictly enforces business rules:
 * - Clear separation: Prize Pool and Registration Fee represent two distinct concepts
 * - Prize Pool: Amount allocated as event awards/prizes (never exposes college allocation)
 * - Registration Fee: Amount a participant pays to register ('Free', '₹200 per participant', '₹100 per team')
 * - Advertised Prize Pool (registration-funded):
 *     Expected Revenue = Fee × Total Billable Event Capacity
 *     Raw Prize Pool = Expected Revenue × Prize Allocation Percentage (70–80%, default 75%)
 *     Displayed Prize Pool = Raw Prize Pool rounded to nearest ₹500
 * - Fixed Prize Pool: Preserved as configured (e.g. ₹50,000 for HackNova)
 * - Actual Collected Revenue: Kept strictly separate; requires verified payments
 */

export const DEFAULT_PRIZE_ALLOCATION_PCT = 75; // 75% to prize pool, 25% to college

/**
 * Rounds an amount to the nearest ₹500.
 * Examples:
 * - ₹7,500 → ₹7,500
 * - ₹7,650 → ₹7,500
 * - ₹7,800 → ₹8,000
 * - ₹24,000 → ₹24,000
 * - ₹26,250 → ₹26,500
 */
export function roundToNearest500(rawAmount) {
  if (!rawAmount || rawAmount <= 0) return 0;
  return Math.round(rawAmount / 500) * 500;
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
 * Calculates prize pool and college revenue for an event.
 * Advertised prize pool uses capacity; collected revenue uses verified payments.
 * Internal calculations may return collegeAllocation; public formatters MUST NOT.
 */
export function calculatePrizePool({
  prizePoolType = 'fixed',
  fixedPrizeAmount = 0,
  feeAmount = 0,
  feeUnit = 'participant',
  capacity = 0,
  prizeAllocationPct = DEFAULT_PRIZE_ALLOCATION_PCT,
  registrations = []
}) {
  // Clamp allocation percentage to 70% - 80% range per specification
  const validPct = Math.min(80, Math.max(70, Number(prizeAllocationPct) || DEFAULT_PRIZE_ALLOCATION_PCT));
  const collegePct = 100 - validPct;

  if (prizePoolType === 'fixed' || (!feeAmount && fixedPrizeAmount > 0)) {
    return {
      type: 'fixed',
      rawPrizePoolAmount: Number(fixedPrizeAmount) || 0,
      prizePoolAmount: Number(fixedPrizeAmount) || 0,
      advertisedPrizePool: Number(fixedPrizeAmount) || 0,
      collectedAmount: 0,
      collegeAllocation: 0,
      prizeAllocationPct: validPct,
      collegeAllocationPct: collegePct,
      paidCount: 0
    };
  }

  const numFee = Math.max(0, Number(feeAmount) || 0);
  const numCap = Math.max(0, Number(capacity) || 0);

  // Advertised capacity-based estimate
  const expectedRevenue = numFee * numCap;
  const rawPrizePoolAmount = Math.round(expectedRevenue * (validPct / 100));
  const advertisedPrizePool = roundToNearest500(rawPrizePoolAmount);

  // Actual verified payments
  const paidRegistrations = registrations.filter(
    (r) => r.status === 'confirmed' && (r.paymentStatus === 'paid' || (r.payment && r.payment.status === 'paid'))
  );
  const paidCount = paidRegistrations.length;
  const collectedAmount = numFee * paidCount;
  const actualPrizeFund = Math.round(collectedAmount * (validPct / 100));
  const collegeAllocation = collectedAmount - actualPrizeFund;

  return {
    type: 'dynamic',
    rawPrizePoolAmount,
    prizePoolAmount: advertisedPrizePool,
    advertisedPrizePool,
    expectedRevenue,
    collectedAmount,
    actualPrizeFund,
    collegeAllocation, // Internal only — do NOT render publicly
    prizeAllocationPct: validPct,
    collegeAllocationPct: collegePct,
    paidCount
  };
}

/**
 * Formats prize-pool for public presentation across cards, modals, and listings.
 * Strictly conceals internal college allocation and revenue formulas.
 * Never outputs registration fee or "Free Entry".
 */
export function formatPublicPrizePool(event) {
  if (!event) return 'Trophies & Citations';

  // 1. Dynamic Fee-Funded Events
  if (event.prizePoolType === 'dynamic') {
    // If backend provided sanitized prizeAmount / prizePool
    if (event.prizeAmount > 0) {
      return `₹${Number(event.prizeAmount).toLocaleString('en-IN')}`;
    }

    const fee = Number(event.feeAmount) || 0;
    const capacity = Number(event.capacity) || 0;
    const pct = Number(event.prizeAllocationPct) || DEFAULT_PRIZE_ALLOCATION_PCT;

    if (capacity > 0 && fee > 0) {
      const expectedRevenue = fee * capacity;
      const rawPool = Math.round(expectedRevenue * (pct / 100));
      const pool = roundToNearest500(rawPool);
      return `₹${pool.toLocaleString('en-IN')}`;
    }

    if (event.prizePool && typeof event.prizePool === 'string' && event.prizePool.includes('₹')) {
      return event.prizePool;
    }

    return 'Dynamic Prize Pool';
  }

  // 2. Explicit prize string exists (e.g. "₹50,000", "Kit Included", "₹1,00,000 Seed Grant")
  if (event.prizePool && typeof event.prizePool === 'string') {
    const trimmed = event.prizePool.trim();
    // Exclude accidental fee fallbacks
    if (!trimmed.toLowerCase().includes('free entry') && trimmed !== 'Free') {
      return trimmed;
    }
  }

  // 3. Explicit numeric prize amount
  if (event.prizeAmount > 0) {
    return `₹${Number(event.prizeAmount).toLocaleString('en-IN')}`;
  }

  return 'Trophies & Citations';
}
