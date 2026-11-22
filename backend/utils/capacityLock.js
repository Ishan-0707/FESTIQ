import { AsyncLocalStorage } from 'async_hooks';

const lockStorage = new AsyncLocalStorage();
let capacityQueue = Promise.resolve();

/**
 * Global serialized asynchronous coordination queue for all capacity-sensitive operations:
 * - Direct registration creation (createRegistration)
 * - Waitlist joining (joinWaitlist)
 * - Seat allocation (allocateAvailableSeats)
 * - Waitlist offer acceptance & conversion (acceptSeatOffer)
 * - Waitlist offer decline & withdrawal (declineSeatOffer, withdrawWaitlist)
 * - Registration cancellation (cancelRegistration)
 * - Management event capacity modifications (updateEvent)
 * - Payment confirmation & pass generation (confirmPaidRegistration)
 * 
 * Re-entrant: Supports nested calls within the same asynchronous execution context
 * via Node.js AsyncLocalStorage to prevent self-deadlocks.
 */
export function withCapacityLock(operation) {
  if (lockStorage.getStore()) {
    return operation();
  }

  const next = capacityQueue.then(
    () => lockStorage.run(true, operation),
    () => lockStorage.run(true, operation)
  );
  capacityQueue = next.catch(() => {});
  return next;
}
