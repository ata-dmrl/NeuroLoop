import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CalendarCheck, Gamepad2, LayoutDashboard, LineChart, Moon, Settings, Sun, User } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const NAV = [
  { to: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { to: '/games', label: 'Oyunlar', icon: Gamepad2 },
  { to: '/daily-training', label: 'Günlük', icon: CalendarCheck },
  { to: '/progress', label: 'İlerleme', icon: LineChart },
  { to: '/profile', label: 'Profil', icon: User },
];

const TITLES: Record<string, string> = {
  '/dashboard': 'Panel',
  '/games': 'Oyunlar',
  '/daily-training': 'Günlük antrenman',
  '/progress': 'İlerleme',
  '/profile': 'Profil',
  '/settings': 'Ayarlar',
};

function Brand() {
  return (
    <NavLink to="/dashboard" className="flex items-center gap-2.5 font-extrabold tracking-tight" aria-label="NeuroLoop — panele git">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-ink" aria-hidden>
        <svg viewBox="0 0 64 64" width="22" height="22">
          <circle cx="32" cy="32" r="15" fill="none" stroke="currentColor" strokeWidth="6" />
          <circle cx="32" cy="32" r="5" fill="currentColor" />
        </svg>
      </span>
      <span className="text-lg">NeuroLoop</span>
    </NavLink>
  );
}

function ThemeButton() {
  const { effective, toggle } = useTheme();
  const Icon = effective === 'dark' ? Sun : Moon;
  return (
    <button type="button" className="btn btn-sm !px-3" onClick={toggle} aria-label={effective === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}>
      <Icon size={18} aria-hidden />
    </button>
  );
}

export function AppLayout() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // SPA sayfa geçişi: başlığı güncelle, odağı içeriğe taşı.
  useEffect(() => {
    const title = TITLES[pathname];
    document.title = title ? `${title} — NeuroLoop` : 'NeuroLoop — Zihin Antrenmanı';
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="min-h-dvh md:pl-64">
      <a href="#content" className="skip-link visually-hidden">
        İçeriğe geç
      </a>

      {/* Masaüstü kenar çubuğu */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-6 border-r border-line bg-surface px-4 py-6 md:flex">
        <div className="px-2">
          <Brand />
        </div>
        <nav aria-label="Ana gezinme" className="flex flex-1 flex-col gap-1">
          {[...NAV, { to: '/settings', label: 'Ayarlar', icon: Settings }].map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-[0.95rem] font-semibold transition-colors ${
                  isActive ? 'bg-accent-soft text-accent-strong' : 'text-muted hover:bg-surface-2 hover:text-ink'
                }`
              }
            >
              <Icon size={20} aria-hidden />
              {label === 'Günlük' ? 'Günlük antrenman' : label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-muted">Tema</span>
          <ThemeButton />
        </div>
      </aside>

      {/* Mobil üst çubuk */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur md:hidden">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeButton />
          <NavLink to="/settings" className="btn btn-sm !px-3" aria-label="Ayarlar">
            <Settings size={18} aria-hidden />
          </NavLink>
        </div>
      </header>

      <main id="content" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 outline-none sm:px-8 md:pb-12 md:pt-10">
        <Outlet />
      </main>

      {/* Mobil alt gezinme */}
      <nav
        aria-label="Ana gezinme"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface/95 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur md:hidden"
      >
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[0.7rem] font-semibold ${isActive ? 'text-accent-strong' : 'text-muted'}`
            }
          >
            <Icon size={22} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
