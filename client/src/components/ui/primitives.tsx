import type { CSSProperties, ReactNode } from 'react';
import { CATEGORIES } from '@shared/constants';
import type { SkillCategory } from '@shared/types';
import { getTier, tierProgress, LEVEL_TIERS } from '@/games/types';
import { categoryColor } from './icons';

export function Bar({
  value,
  max = 100,
  color = 'var(--accent)',
  label,
  height = 8,
}: {
  value: number;
  max?: number;
  color?: string;
  label: string;
  height?: number;
}) {
  const ratio = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-surface-2"
      style={{ height }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
    >
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${ratio * 100}%`, background: color }} />
    </div>
  );
}

export function CategoryChip({ category }: { category: SkillCategory }) {
  const color = categoryColor(category);
  return (
    <span
      className="chip"
      style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color: `color-mix(in oklab, ${color} 78%, var(--text))` }}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
      {CATEGORIES[category].label}
    </span>
  );
}

export function IconTile({ category, children, size = 48 }: { category: SkillCategory; children: ReactNode; size?: number }) {
  const color = categoryColor(category);
  const style: CSSProperties = {
    width: size,
    height: size,
    background: `color-mix(in oklab, ${color} 16%, transparent)`,
    color: `color-mix(in oklab, ${color} 80%, var(--text))`,
  };
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-2xl" style={style} aria-hidden>
      {children}
    </span>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card-flat flex flex-col items-center gap-3 px-6 py-10 text-center">
      <p className="text-base font-bold">{title}</p>
      <p className="max-w-sm text-sm text-muted">{body}</p>
      {action}
    </div>
  );
}

export function Ring({
  value,
  max,
  size = 96,
  stroke = 10,
  label,
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  label: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function Delta({ value, suffix = '', digits = 0 }: { value: number; suffix?: string; digits?: number }) {
  const rounded = Number(value.toFixed(digits));
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '±';
  const color = rounded > 0 ? 'var(--success)' : rounded < 0 ? 'var(--danger)' : 'var(--muted)';
  const arrow = rounded > 0 ? '↑' : rounded < 0 ? '↓' : '→';
  return (
    <span className="tabular font-bold" style={{ color }}>
      <span aria-hidden>{arrow} </span>
      {sign}
      {Math.abs(rounded).toFixed(digits)}
      {suffix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Seviye rozeti — LevelBadge
// ---------------------------------------------------------------------------

/**
 * Küçük bir "🔥 Orta · Intermediate" rozeti.
 * size: 'sm' | 'md' | 'lg'
 */
export function LevelBadge({ difficulty, size = 'md' }: { difficulty: number; size?: 'sm' | 'md' | 'lg' }) {
  const tier = getTier(difficulty);
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-4 py-2 text-base' : 'px-3 py-1 text-sm';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold ${pad}`}
      style={{ background: tier.bgColor, color: tier.color }}
      aria-label={`Seviye: ${tier.label} (${tier.sublabel})`}
    >
      <span aria-hidden>{tier.emoji}</span>
      <span>{tier.label}</span>
      <span className="font-normal opacity-70" aria-hidden>·</span>
      <span className="font-normal opacity-80">{tier.sublabel}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Segmentli seviye çubuğu — LevelProgress
// ---------------------------------------------------------------------------

/**
 * 5 segmentli ilerleme çubuğu. Her segment bir kademe, aktif kademe kendi
 * içindeki ilerlemeye göre dolur. Tamamlanmış kademeler tam dolu.
 */
export function LevelProgress({ difficulty, showLabels = true }: { difficulty: number; showLabels?: boolean }) {
  const currentTier = getTier(difficulty);
  const progress = tierProgress(difficulty);

  return (
    <div className="w-full">
      {/* Segment çubukları */}
      <div className="flex gap-1" role="progressbar" aria-label={`Zorluk seviyesi: ${currentTier.label}, ${difficulty}/100`} aria-valuenow={difficulty} aria-valuemin={1} aria-valuemax={100}>
        {LEVEL_TIERS.map((tier) => {
          const isPast = tier.rank < currentTier.rank;
          const isCurrent = tier.rank === currentTier.rank;
          const fillRatio = isPast ? 1 : isCurrent ? progress : 0;
          return (
            <div
              key={tier.id}
              className="relative flex-1 overflow-hidden rounded-full"
              style={{ height: 10, background: 'var(--surface-2)' }}
              title={`${tier.emoji} ${tier.label} (${tier.sublabel})`}
            >
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{
                  width: `${fillRatio * 100}%`,
                  background: tier.color,
                  boxShadow: isCurrent && fillRatio > 0 ? `0 0 8px ${tier.color}88` : undefined,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Kademe etiketleri */}
      {showLabels && (
        <div className="mt-1.5 flex" aria-hidden>
          {LEVEL_TIERS.map((tier) => {
            const isCurrent = tier.rank === currentTier.rank;
            return (
              <div key={tier.id} className="flex-1 text-center" style={{ fontSize: '10px', fontWeight: isCurrent ? 700 : 400, color: isCurrent ? tier.color : 'var(--muted)', transition: 'color 0.3s' }}>
                {tier.emoji}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
