/**
 * FESTIQ Backend Prize-Pool Calculator & Financial Allocation Engine
 *
 * Implements FESTIQ Business Rules & Dimensional Consistency:
 *
 * 1. Financial Dimensions & Notation:
 *    - N = approved minimum expected billing units (participants or teams)
 *    - U = actual eligible, collected billing units (deduplicated, confirmed paid)
 *    - F = fee per billing unit (in INR)
 *    - B = N * F                         (Baseline expected revenue in INR)
 *    - A = U * F                         (Actual collected revenue in INR)
 *    - r = approved prize allocation percentage (60% to 70%, default 65%)
 *    - P = Math.round(B * (r / 100))     (Fixed approved prize pool in INR)
 *    - Q = B - P                         (Projected baseline profit in INR)
 *    - E = Math.max(0, A - B)            (Additional collected revenue above baseline in INR)
 *
 * 2. Revenue Meets or Exceeds Baseline (A >= B or U >= N):
 *    - Distributable Profit: T = A - P = Q + E
 *    - College Profit Share: C = Math.round(T * 0.60)
 *    - Organizing Team Share: O = T - C
 *    - Cash Preservation Invariant: P + C + O === A (Exact equality guaranteed)
 *    - Fixed prize pool P never increases with additional revenue E.
 *
 * 3. Revenue Below Baseline (A < B or U < N):
 *    - Approved prize pool P remains guaranteed and unchanged.
 *    - Revenue Shortfall: S = B - A
 *    - Distributable Profit: T = 0
 *    - College Profit Share: C = 0
 *    - Organizing Team Share: O = 0
 *    - Projected profit Q is retained forecast-only; NEVER distributed as cash.
 *    - Flagged for review: fundingStatus = 'BELOW_EXPECTED_BASELINE', requiresManagementReview = true.
 *
 * 4. Payment Verification & Unit Accounting:
 *    - Only verified successful payments (paymentStatus: 'paid' / status: 'confirmed') are counted.
 *    - Pending, failed, cancelled, refunded, and duplicate transactions are strictly excluded from U and A.
 *    - For per-person: N and U count individual paid participants.
 *    - For per-team: N and U count paid teams. Team fee is counted once per paid team (never multiplied by member count).
 */

export const DEFAULT_PRIZE_ALLOCATION_PCT = 65; // Default 65% (configurable 60% - 70%)
export const MIN_PRIZE_ALLOCATION_PCT = 60;
export const MAX_PRIZE_ALLOCATION_PCT = 70;
export const COLLEGE_PROFIT_SHARE_PCT = 60;     // Fixed 60% of total distributable profit
export const ORGANIZER_PROFIT_SHARE_PCT = 40;   // Fixed 40% of total distributable profit

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
 * Formats registration fee for presentation.
 * Returns clean strings such as 'Free', '₹200 per participant', '₹100 per team'.
 */
export function formatRegistrationFee(event) {
  if (!event) return 'Free';
  const fee = Number(event.feeAmount) || 0;
  if (fee <= 0) {
    const rawEntry = String(event.registrationFee || event.entryFee || '').trim();
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
 * Validates event financial configuration.
 * Enforces business rules:
 * - A prize-pool event must have:
 *   1. Registration fee > 0.
 *   2. Valid minimum expected registration count > 0 (integer).
 *   3. Valid prize-pool percentage between 60% and 70%.
 * - Free events cannot have a registration-funded prize pool.
 */
export function validateEventFinancialConfig(config) {
  const errors = [];
  if (!config) {
    return { isValid: false, errors: ['Configuration object is required'] };
  }

  const feeAmount = Number(config.feeAmount);
  const isPaid = feeAmount > 0 || config.registrationType === 'paid' || config.isPaid === true;
  
  // Explicit prize pool declaration or dynamic pool type
  const hasPrizePool = Boolean(
    config.hasPrizePool === true ||
    config.prizePoolType === 'dynamic' ||
    config.prizePoolType === 'registration_funded' ||
    (Number(config.prizeAmount) > 0 && config.prizePoolType !== 'fixed_non_cash')
  );

  // Free events with monetary prize pool must be rejected
  if (!isPaid && hasPrizePool) {
    errors.push('Free events cannot have a prize pool funded by registrations. Free events must have zero prize pool or specify non-monetary awards.');
  }

  // If this is a paid event or declares a prize pool
  if (isPaid || hasPrizePool) {
    if (isNaN(feeAmount) || feeAmount <= 0) {
      errors.push('Registration fee must be greater than zero for prize-pool events.');
    }

    const minExpected = Number(config.minExpectedRegistrations);
    if (isNaN(minExpected) || minExpected <= 0 || !Number.isInteger(minExpected)) {
      errors.push('Minimum expected registrations must be a valid positive integer.');
    }

    const rawPct = config.prizeAllocationPct;
    if (rawPct !== undefined && rawPct !== null && rawPct !== '') {
      const pct = Number(rawPct);
      if (isNaN(pct) || pct < MIN_PRIZE_ALLOCATION_PCT || pct > MAX_PRIZE_ALLOCATION_PCT) {
        errors.push(`Prize-pool allocation percentage must be between ${MIN_PRIZE_ALLOCATION_PCT}% and ${MAX_PRIZE_ALLOCATION_PCT}%.`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculates complete financial metrics for an event.
 *
 * Implements the mandatory FESTIQ financial formulas:
 *   B = N * F
 *   P = Math.round(B * (r / 100))
 *   Q = B - P
 *   E = Math.max(0, A - N) * F
 *   T = Q + E
 *   College Share = Math.round(T * 0.60)
 *   Organizing Team Share = T - College Share
 */
export function calculateEventPrizeMetrics(event, allRegistrations = []) {
  if (!event) return null;

  const feeAmount = Math.max(0, Number(event.feeAmount) || 0);
  const feeType = getEventFeeType(event);
  const capacity = Math.max(0, Number(event.capacity) || 0);

  // Check if event is a non-prize-pool event (Free or materials-fee)
  const isFree = feeAmount === 0;
  const isMaterialsFee = event.prizePoolType === 'materials_fee';

  if (isFree || isMaterialsFee) {
    return {
      hasPrizePool: false,
      prizePoolType: isMaterialsFee ? 'materials_fee' : 'none',
      feeType,
      feeAmount,
      capacity,
      minExpectedRegistrations: 0,
      minExpectedRevenue: 0,
      fixedPrizePool: 0,
      prizeAmount: 0,
      prizePool: isMaterialsFee ? (event.prizePool || 'Hardware Kit & Certificate') : (event.prizePool || 'Trophies & Citations'),
      prizeAllocationPct: 0,
      baseProfit: 0,
      additionalRevenue: 0,
      totalDistributableProfit: 0,
      collegeProfitShare: 0,
      organizerProfitShare: 0,
      actualPaidUnits: 0,
      actualCollectedRevenue: 0,
      fundingStatus: isMaterialsFee ? 'MATERIALS_FEE' : 'FREE_EVENT',
      shortfall: 0,
      isApproved: false
    };
  }

  // Paid event: validate minimum expected registrations (N)
  const minExpectedRegistrations = Number(
    event.financialSnapshot?.minExpectedRegistrations !== undefined
      ? event.financialSnapshot.minExpectedRegistrations
      : event.minExpectedRegistrations
  );

  // If minExpectedRegistrations is missing or non-positive, financial configuration is unapproved
  if (isNaN(minExpectedRegistrations) || minExpectedRegistrations <= 0) {
    return {
      hasPrizePool: false,
      prizePoolType: 'unapproved',
      feeType,
      feeAmount,
      capacity,
      minExpectedRegistrations: 0,
      minExpectedRevenue: 0,
      projectedBaselineRevenue: 0,
      fixedPrizePool: 0,
      prizeAmount: 0,
      prizePool: 'Pending Approval',
      prizeAllocationPct: DEFAULT_PRIZE_ALLOCATION_PCT,
      baseProfit: 0,
      projectedBaseProfit: 0,
      additionalRevenue: 0,
      totalDistributableProfit: 0,
      realizedDistributableProfit: 0,
      collegeProfitShare: 0,
      realizedCollegeProfit: 0,
      organizerProfitShare: 0,
      realizedOrganizerProfit: 0,
      actualPaidUnits: 0,
      actualCollectedRevenue: 0,
      fundingStatus: 'PENDING_MANAGEMENT_CONFIG',
      shortfall: 0,
      requiresManagementReview: true,
      reviewReason: 'Event lacks approved minimum registration quota or financial snapshot',
      isApproved: false
    };
  }

  // Allocation percentage r: 60% to 70%, default 65%
  const rawPct = Number(
    event.financialSnapshot?.prizeAllocationPct !== undefined
      ? event.financialSnapshot.prizeAllocationPct
      : event.prizeAllocationPct
  );
  const prizePct = isNaN(rawPct)
    ? DEFAULT_PRIZE_ALLOCATION_PCT
    : Math.min(MAX_PRIZE_ALLOCATION_PCT, Math.max(MIN_PRIZE_ALLOCATION_PCT, rawPct));

  // Step 1: Minimum expected revenue B = N * F
  const minExpectedRevenue = Math.round(minExpectedRegistrations * feeAmount);

  // Step 2: Fixed prize pool P = Math.round(B * (r / 100))
  // If event has an approved financialSnapshot with fixedPrizePool, preserve it exactly
  const fixedPrizePool = event.financialSnapshot?.fixedPrizePool !== undefined
    ? Number(event.financialSnapshot.fixedPrizePool)
    : Math.round(minExpectedRevenue * (prizePct / 100));

  // Step 3: Base profit Q = B - P
  const baseProfit = minExpectedRevenue - fixedPrizePool;

  // Actual verified collected payments
  // Filter registrations: must match eventId, confirmed status, verified paid payment
  // Exclude cancelled, pending, failed, refunded, duplicate records
  const eligiblePaidRegistrations = (allRegistrations || []).filter((r) => {
    if (!r || r.eventId !== event.id) return false;
    if (r.status === 'cancelled') return false;
    const isPaid =
      r.paymentStatus === 'paid' ||
      (r.payment && r.payment.status === 'paid' && r.payment.verified === true);
    return Boolean(isPaid);
  });

  // Unique registration tracking (prevent counting same payment/registration twice)
  const seenIds = new Set();
  const deduplicatedPaid = [];
  for (const r of eligiblePaidRegistrations) {
    const idKey = r.id || r.passId || r.payment?.transactionId;
    if (idKey && seenIds.has(idKey)) continue;
    if (idKey) seenIds.add(idKey);
    deduplicatedPaid.push(r);
  }

  // Calculate actual billable paid units (U)
  // For per_team: count number of paid teams (do NOT multiply by team members)
  // For per_person: count number of paid individual participants
  const actualPaidUnits = deduplicatedPaid.length;

  // Actual collected revenue: A = U * F
  const actualCollectedRevenue = Math.round(actualPaidUnits * feeAmount);

  // Additional collected revenue beyond baseline: E = Math.max(0, A - B)
  const additionalRevenue = Math.max(0, actualCollectedRevenue - minExpectedRevenue);

  // Distributable profit & allocation
  let totalDistributableProfit = 0;
  let collegeProfitShare = 0;
  let organizerProfitShare = 0;
  let fundingStatus = 'FUNDED';
  let shortfall = 0;
  let requiresManagementReview = false;

  if (actualPaidUnits >= minExpectedRegistrations) {
    fundingStatus = actualPaidUnits > minExpectedRegistrations ? 'EXCEEDED_BASELINE' : 'FUNDED';
    shortfall = 0;
    requiresManagementReview = false;

    // Realized distributable profit T = A - P = Q + E when baseline quota is met (A >= B)
    totalDistributableProfit = baseProfit + additionalRevenue;

    // Deterministic integer rounding for 60/40 profit split
    // College = 60%, Organizing Team = 40%
    collegeProfitShare = Math.round(totalDistributableProfit * (COLLEGE_PROFIT_SHARE_PCT / 100));
    organizerProfitShare = totalDistributableProfit - collegeProfitShare;
  } else {
    // Below expected baseline: U < N (A < B)
    fundingStatus = 'BELOW_EXPECTED_BASELINE';
    requiresManagementReview = true;
    // Revenue shortfall against expected baseline S = B - A
    shortfall = minExpectedRevenue - actualCollectedRevenue;

    // Distributable profit is strictly ZERO until baseline condition is satisfied
    // Projected baseline profit Q is kept separately available as forecast only, never as realized cash
    totalDistributableProfit = 0;
    collegeProfitShare = 0;
    organizerProfitShare = 0;
  }

  // Below-baseline vs baseline prize funding and shortfall metrics
  const approvedPrizePool = fixedPrizePool;
  const fundedPrizePoolFromCollections = Math.min(actualCollectedRevenue, approvedPrizePool);
  const unfundedPrizeCommitment = Math.max(0, approvedPrizePool - actualCollectedRevenue);
  const revenueShortfall = Math.max(0, minExpectedRevenue - actualCollectedRevenue);
  const retainedUnallocatedCollections = (actualPaidUnits < minExpectedRegistrations)
    ? Math.max(0, actualCollectedRevenue - approvedPrizePool)
    : 0;

  let reviewReason = null;
  if (requiresManagementReview) {
    if (unfundedPrizeCommitment > 0) {
      reviewReason = `Actual registrations below quota; collections below approved prize pool — unfunded prize commitment of ₹${unfundedPrizeCommitment.toLocaleString('en-IN')} requires institutional underwriting decision`;
    } else {
      reviewReason = `Actual registrations below minimum expected baseline quota; ₹${retainedUnallocatedCollections.toLocaleString('en-IN')} collections above prize pool held unallocated pending review`;
    }
  }

  return {
    hasPrizePool: true,
    prizePoolType: 'dynamic',
    feeType,
    feeAmount,
    capacity,
    minExpectedRegistrations,
    minExpectedRevenue,                   // Baseline revenue B = N * F
    projectedBaselineRevenue: minExpectedRevenue,
    fixedPrizePool,                       // Approved fixed prize pool P = round(B * r/100)
    approvedPrizePool,
    fundedPrizePoolFromCollections,
    unfundedPrizeCommitment,
    revenueShortfall,
    retainedUnallocatedCollections,
    prizeAmount: fixedPrizePool,
    prizePool: `₹${fixedPrizePool.toLocaleString('en-IN')}`,
    prizeAllocationPct: prizePct,
    baseProfit,                           // Projected baseline profit Q = B - P (forecast)
    projectedBaseProfit: baseProfit,
    additionalRevenue,                    // Additional revenue beyond baseline E = max(0, A - B)
    totalDistributableProfit,             // Realized distributable profit T = A - P = Q + E (0 when A < B)
    realizedDistributableProfit: totalDistributableProfit,
    collegeProfitShare,                   // Realized College Share C = round(T * 0.60) (0 when A < B)
    realizedCollegeProfit: collegeProfitShare,
    organizerProfitShare,                 // Realized Organizer Share O = T - C (0 when A < B)
    realizedOrganizerProfit: organizerProfitShare,
    collegeProfitSharePct: COLLEGE_PROFIT_SHARE_PCT,
    organizerProfitSharePct: ORGANIZER_PROFIT_SHARE_PCT,
    actualPaidUnits,                      // Actual eligible billing units U
    actualCollectedRevenue,               // Actual collected revenue A = U * F
    fundingStatus,
    shortfall,                            // Revenue shortfall S = B - A
    requiresManagementReview,
    reviewReason,
    isApproved: isApprovedFinancialSnapshot(event)
  };
}

/**
 * Creates an approved financial snapshot for an event.
 * This snapshot persists on the event record so that additional registrations
 * never modify the approved fixed prize pool.
 */
export function createFinancialSnapshot(event) {
  const fee = Number(event.feeAmount) || 0;
  const minExpected = Number(event.minExpectedRegistrations);
  const feeType = getEventFeeType(event);
  const rawPct = Number(event.prizeAllocationPct);
  const prizePct = isNaN(rawPct)
    ? DEFAULT_PRIZE_ALLOCATION_PCT
    : Math.min(MAX_PRIZE_ALLOCATION_PCT, Math.max(MIN_PRIZE_ALLOCATION_PCT, rawPct));

  if (fee <= 0 || isNaN(minExpected) || minExpected <= 0) {
    return null;
  }

  const minExpectedRevenue = Math.round(minExpected * fee);
  const fixedPrizePool = Math.round(minExpectedRevenue * (prizePct / 100));
  const baseProfit = minExpectedRevenue - fixedPrizePool;

  return {
    approved: true,
    status: 'APPROVED',
    minExpectedRegistrations: minExpected,
    feeAmount: fee,
    feeType,
    prizeAllocationPct: prizePct,
    collegeProfitSharePct: COLLEGE_PROFIT_SHARE_PCT,
    organizerProfitSharePct: ORGANIZER_PROFIT_SHARE_PCT,
    minExpectedRevenue,
    fixedPrizePool,
    baseProfit,
    approvedAt: new Date().toISOString()
  };
}

/**
 * Sanitizes an event object for public API responses.
 * Strictly conceals internal accounting details, profit splits, and sensitive financials.
 */
export function sanitizeEventForPublic(event, allRegistrations = []) {
  const metrics = calculateEventPrizeMetrics(event, allRegistrations);

  // Clone event
  const sanitized = { ...event };

  // Independent Registration Fee field
  sanitized.registrationFee = formatRegistrationFee(event);
  sanitized.entryFee = sanitized.registrationFee;
  sanitized.feeAmount = metrics ? metrics.feeAmount : (Number(event.feeAmount) || 0);
  sanitized.feeType = metrics ? metrics.feeType : getEventFeeType(event);
  sanitized.isPaid = sanitized.feeAmount > 0;
  sanitized.prizePoolType = metrics ? metrics.prizePoolType : (event.prizePoolType || 'fixed');

  if (metrics && metrics.hasPrizePool) {
    sanitized.prizeAmount = metrics.fixedPrizePool;
    sanitized.prizePool = `₹${metrics.fixedPrizePool.toLocaleString('en-IN')}`;
    sanitized.minExpectedRegistrations = metrics.minExpectedRegistrations;
    sanitized.paidRegistrationsCount = metrics.actualPaidUnits;
  } else if (metrics && metrics.prizePoolType === 'materials_fee') {
    sanitized.prizeAmount = 0;
    sanitized.prizePool = event.prizePool || 'Hardware Kit & Certificate';
    sanitized.paidRegistrationsCount = metrics.actualPaidUnits;
  } else {
    // Non-prize-pool event (Free)
    sanitized.prizeAmount = 0;
    sanitized.prizePool = event.prizePool || 'Trophies & Citations';
    sanitized.paidRegistrationsCount = metrics ? metrics.actualPaidUnits : 0;
  }

  // Strictly strip confidential internal accounting properties
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
  delete sanitized.baseProfit;
  delete sanitized.totalDistributableProfit;
  delete sanitized.collegeProfitShare;
  delete sanitized.organizerProfitShare;
  delete sanitized.collegeProfitSharePct;
  delete sanitized.organizerProfitSharePct;
  delete sanitized.shortfall;
  delete sanitized.approvedPrizePool;
  delete sanitized.fundedPrizePoolFromCollections;
  delete sanitized.unfundedPrizeCommitment;
  delete sanitized.revenueShortfall;
  delete sanitized.retainedUnallocatedCollections;
  delete sanitized.requiresManagementReview;
  delete sanitized.reviewReason;
  delete sanitized.projectedBaselineRevenue;
  delete sanitized.projectedBaseProfit;
  delete sanitized.realizedDistributableProfit;
  delete sanitized.realizedCollegeProfit;
  delete sanitized.realizedOrganizerProfit;
  delete sanitized.additionalRevenue;

  return sanitized;
}
