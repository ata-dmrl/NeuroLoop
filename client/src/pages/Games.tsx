import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES, GAME_IDS, GAME_META } from '@shared/constants';
import type { SkillCategory } from '@shared/types';
import { GAME_ICONS } from '@/components/ui/icons';
import { CategoryChip, IconTile, LevelBadge, LevelProgress } from '@/components/ui/primitives';
import { defaultProgress, useAppStore } from '@/store/useAppStore';

export default function Games() {
  const games = useAppStore((s) => s.games);
  const [filter, setFilter] = useState<SkillCategory | 'all'>('all');

  const categories = Array.from(new Set(GAME_IDS.map((g) => GAME_META[g].category)));
  const list = GAME_IDS.filter((g) => filter === 'all' || GAME_META[g].category === filter);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Oyunlar</h1>
        <p className="mt-1 text-muted">
          Sekiz kısa oyun, altı bilişsel alan. Her oyun seviyeni performansına göre otomatik ayarlar.
        </p>
      </header>

      <div role="radiogroup" aria-label="Alana göre filtrele" className="flex flex-wrap gap-2">
        {(['all', ...categories] as const).map((c) => {
          const active = filter === c;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setFilter(c)}
              className={`btn btn-sm ${active ? 'btn-primary' : ''}`}
            >
              {c === 'all' ? 'Tümü' : CATEGORIES[c].label}
            </button>
          );
        })}
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((id) => {
          const meta = GAME_META[id];
          const progress = games[id] ?? defaultProgress(id);
          const Icon = GAME_ICONS[id];
          return (
            <li key={id}>
              <Link
                to={`/games/${id}`}
                className="card group flex h-full flex-col gap-4 p-5 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-4">
                  <IconTile category={meta.category} size={52}>
                    <Icon size={26} />
                  </IconTile>
                  <div className="min-w-0">
                    <h2 className="text-lg font-extrabold leading-tight">{meta.name}</h2>
                    <p className="text-sm text-muted">{meta.tagline}</p>
                  </div>
                </div>
                <p className="text-sm">{meta.description}</p>
                <div className="mt-auto flex flex-col gap-3">
                  <CategoryChip category={meta.category} />
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <LevelBadge difficulty={progress.difficulty} size="sm" />
                      <span className="tabular text-xs text-muted">{progress.difficulty}/100</span>
                    </div>
                    <LevelProgress difficulty={progress.difficulty} showLabels={false} />
                  </div>
                  <div className="flex justify-between text-xs text-muted">
                    <span>{progress.plays > 0 ? `${progress.plays} oyun` : 'Henüz oynanmadı'}</span>
                    <span>{progress.plays > 0 ? `En iyi: ${progress.bestScore}` : `≈ ${Math.round(meta.estimatedSeconds / 60 * 10) / 10} dk`}</span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
