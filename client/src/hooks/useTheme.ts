import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/**
 * İki durumlu tema: "sistem" ve "sistemin tersi (sabit)".
 * colorScheme === null → sistem tercihini izler; aksi hâlde kullanıcı sabitlemiştir.
 */
export function useTheme() {
  const pinned = useAppStore((s) => s.settings.colorScheme);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const effective: 'light' | 'dark' = pinned ?? (systemDark ? 'dark' : 'light');

  const toggle = () => updateSettings({ colorScheme: pinned === null ? (systemDark ? 'light' : 'dark') : null });
  const followSystem = () => updateSettings({ colorScheme: null });

  return { pinned, effective, toggle, followSystem };
}

/** Kök öğeye tema sınıfını, meta etiketini ve hareket tercihini uygular. */
export function useApplyPreferences() {
  const pinned = useAppStore((s) => s.settings.colorScheme);
  const reduced = useAppStore((s) => s.settings.reducedMotion);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('scheme-light', 'scheme-dark');
    if (pinned) root.classList.add(`scheme-${pinned}`);
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute('content', pinned ?? 'light dark');
  }, [pinned]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduced ? 'true' : 'false';
  }, [reduced]);
}
