import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import type { GameEngine } from '@/engine/GameEngine';
import { useEngine } from '@/engine/useEngine';

/**
 * Motorun duraklamaya duyarlı zamanlayıcısını saran hook.
 * Bileşen sökülürken (ör. StrictMode'un çift efekt çalıştırması dahil) bekleyen görevleri iptal eder.
 */
export function useSchedule(engine: GameEngine) {
  const cancels = useRef(new Set<() => void>());
  useEffect(() => {
    const set = cancels.current;
    return () => {
      set.forEach((c) => c());
      set.clear();
    };
  }, []);
  return useCallback(
    (ms: number, fn: () => void) => {
      const cancel = engine.after(ms, () => {
        cancels.current.delete(cancel);
        fn();
      });
      cancels.current.add(cancel);
      return cancel;
    },
    [engine],
  );
}

/** Tur içi süre çubuğu. Yalnızca kendisi ~10 Hz yeniden çizilir. */
export function RoundTimer({ engine, startedAt, limitMs }: { engine: GameEngine; startedAt: number; limitMs: number }) {
  useEngine(engine, (s) => Math.floor(s.elapsedMs / 100));
  const left = Math.max(0, limitMs - (engine.now() - startedAt));
  const ratio = Math.min(1, left / limitMs);
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
      role="progressbar"
      aria-label="Tur süresi"
      aria-valuemin={0}
      aria-valuemax={Math.round(limitMs / 1000)}
      aria-valuenow={Math.ceil(left / 1000)}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${ratio * 100}%`,
          background: ratio < 0.3 ? 'var(--danger)' : 'var(--accent)',
        }}
      />
    </div>
  );
}

/** Renk dışında ikinci bir gösterge: doğru/yanlış simgesi. */
export function Mark({ ok, size = 22 }: { ok: boolean; size?: number }) {
  return ok ? (
    <Check size={size} strokeWidth={3} aria-label="Doğru" style={{ color: 'var(--success)' }} />
  ) : (
    <X size={size} strokeWidth={3} aria-label="Yanlış" style={{ color: 'var(--danger)' }} />
  );
}

export function Stage({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <div className={`mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-5 ${className}`}>{children}</div>;
}

export function Prompt({ children, live = false }: { children: ReactNode; live?: boolean }) {
  return (
    <p className="min-h-7 text-center text-lg font-semibold text-muted" aria-live={live ? 'polite' : undefined}>
      {children}
    </p>
  );
}
