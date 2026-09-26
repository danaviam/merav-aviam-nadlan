import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { A11Y_EVENT } from './a11y';

/** הגדרת המערכת "הפחתת תנועה", או "עצירת אנימציות" בתפריט הנגישות */
export function usePrefersReducedMotion() {
  const check = () =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('a11y-no-motion'));
  const [reduced, setReduced] = useState(check);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(check());
    mq.addEventListener('change', onChange);
    window.addEventListener(A11Y_EVENT, onChange);
    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener(A11Y_EVENT, onChange);
    };
  }, []);
  return reduced;
}

/**
 * החלקה בנייד. באתר מימין לשמאל, "הבא" מגיע משמאל –
 * לכן החלקת אצבע ימינה = הבא, שמאלה = הקודם.
 */
export function useSwipe(onNext: () => void, onPrev: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (e: PointerEvent) => {
      start.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: PointerEvent) => {
      if (!start.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      start.current = null;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx > 0) onNext();
      else onPrev();
    },
    onPointerCancel: () => {
      start.current = null;
    },
  };
}
