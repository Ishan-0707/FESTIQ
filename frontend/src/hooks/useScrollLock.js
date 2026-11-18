import { useEffect, useRef } from 'react';

/**
 * Global Reference-Counted Modal Scroll Lock
 * 
 * Satisfies the two distinct scroll behaviors:
 * 1. Background Scroll Lock:
 *    - Prevents scrolling of the underlying page while any modal is open.
 *    - Allows internal scrolling inside the modal dialog/card when content overflows.
 *    - Preserves the exact background scroll position continuously (window.scrollY NEVER resets to 0).
 *    - Restores background interaction cleanly when the modal closes without jumpiness or animation.
 *    - Supports mouse-wheel and touch interactions.
 *    - Supports nested modals via reference counting without premature unlocking.
 * 2. Separation from Route Navigation:
 *    - Does NOT reset scroll to top on modal close.
 *    - Route navigation scroll reset is handled strictly and exclusively by ScrollToTop on route changes.
 */

let activeLocks = 0;
let originalScrollbarPadding = '';
let unlockTimer = null;

/**
 * Determines whether a wheel or touch event target is inside a scrollable container
 * within an active modal dialog.
 */
function isScrollableInsideModal(target) {
  let el = target;
  while (el && el !== document.body && el !== document.documentElement) {
    // If user touches or wheels on modal backdrop directly, block background scroll
    if (el.classList && (
      el.classList.contains('modal-backdrop') ||
      el.classList.contains('event-details-backdrop') ||
      el.classList.contains('gallery-lightbox-backdrop') ||
      el.classList.contains('popover-backdrop') ||
      el.classList.contains('lightbox-backdrop') ||
      el.classList.contains('reg-modal-backdrop')
    )) {
      return false;
    }

    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
    if (isScrollable) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

function handleWheel(e) {
  if (activeLocks > 0 && !isScrollableInsideModal(e.target)) {
    e.preventDefault();
  }
}

function handleTouchMove(e) {
  if (activeLocks > 0 && !isScrollableInsideModal(e.target)) {
    e.preventDefault();
  }
}

function applyLock() {
  if (unlockTimer) {
    clearTimeout(unlockTimer);
    unlockTimer = null;
  }

  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  if (!originalScrollbarPadding) {
    originalScrollbarPadding = document.body.style.paddingRight || '';
  }

  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }

  // Lock overflow without changing body position
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  window.addEventListener('wheel', handleWheel, { passive: false });
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
}

function scheduleUnlock() {
  if (unlockTimer) clearTimeout(unlockTimer);
  unlockTimer = setTimeout(() => {
    if (activeLocks === 0) {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.paddingRight = originalScrollbarPadding;
      originalScrollbarPadding = '';

      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
    }
    unlockTimer = null;
  }, 60);
}

export function useScrollLock(isLocked = false) {
  const wasLockedRef = useRef(false);

  useEffect(() => {
    if (isLocked && !wasLockedRef.current) {
      wasLockedRef.current = true;
      activeLocks++;

      if (activeLocks === 1 || document.documentElement.style.overflow !== 'hidden') {
        applyLock();
      }
    } else if (!isLocked && wasLockedRef.current) {
      wasLockedRef.current = false;
      activeLocks = Math.max(0, activeLocks - 1);

      if (activeLocks === 0) {
        scheduleUnlock();
      }
    }

    return () => {
      if (wasLockedRef.current) {
        wasLockedRef.current = false;
        activeLocks = Math.max(0, activeLocks - 1);

        if (activeLocks === 0) {
          scheduleUnlock();
        }
      }
    };
  }, [isLocked]);
}

export default useScrollLock;
