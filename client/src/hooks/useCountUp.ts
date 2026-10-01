import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function useReducedMotionPref(): boolean {
  const pinned = useAppStore((s) => s.settings.reducedMotion);
  const [system, setSystem] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setSystem(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return pinned || system;
}

/** Sayıyı 0'dan hedefe sayarak gösterir (hareketi azalt açıksa doğrudan hedef). */
export function useCountUp(target: number, durationMs = 900): number {
  const reduced = useReducedMotionPref();
  const [value, setValue] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, reduced]);
  return value;
}
