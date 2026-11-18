import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * Listens to React Router navigation changes and resets the window/document scroll
 * to (0, 0) immediately, preventing scroll-position carrying over across routes.
 * Temporarily overrides html { scroll-behavior: smooth } to guarantee strict instant zero.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const prevScrollBehavior = document.documentElement ? document.documentElement.style.scrollBehavior : '';
    if (document.documentElement) {
      document.documentElement.style.scrollBehavior = 'auto';
    }

    window.scrollTo(0, 0);

    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }

    const mainLayout = document.querySelector('.festiq-main-layout');
    if (mainLayout) {
      mainLayout.scrollTop = 0;
    }

    // Restore on next animation frame
    const rafId = requestAnimationFrame(() => {
      if (document.documentElement) {
        document.documentElement.style.scrollBehavior = prevScrollBehavior;
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [pathname, search]);

  return null;
}
