import { CATEGORIES, GAME_IDS, GAME_META } from '@shared/constants';
import type { DailyTraining, GameId, GameProgress, SkillCategory } from '@shared/types';
import { diffDays } from '@/utils/date';
import { clamp, hashString, seededRng, type Rng } from '@/utils/rng';
import { categoryScore, overallScore, type SkillMap } from './skills';

export interface DailyContext {
  date: string;
  /** Oynatılacak oyun sayısı (kullanıcı tercihi). */
  count: number;
  games: Partial<Record<GameId, GameProgress>>;
  skills: SkillMap;
  /** Kullanıcının günlük antrenmandan çıkardığı oyunlar. */
  disabled: GameId[];
  /** Dünkü (veya en son) günlük plan — aynı seti tekrar etmemek için. */
  previous?: DailyTraining | null;
}

/** Oyun başına ağırlık: zayıf beceri, uzun süredir oynanmamış, hiç denenmemiş oyunlar öne çıkar. */
export function gameWeight(id: GameId, ctx: DailyContext): number {
  const meta = GAME_META[id];
  const progress = ctx.games[id];
  const overall = overallScore(ctx.skills);
  const cat = categoryScore(ctx.skills, meta.category);

  const weakness = cat === null || overall === null ? 0.6 : clamp(0.5 + (overall - cat) / 400, 0, 1);

  let recency = 1;
  if (progress?.lastPlayed) {
    recency = clamp(diffDays(progress.lastPlayed.slice(0, 10), ctx.date) / 4, 0, 1);
  }

  let weight = 0.3 + 1.2 * weakness + 0.8 * recency;
  if (!progress || progress.plays === 0) weight += 0.6;
  if (progress) {
    if (progress.difficulty >= 90) weight *= 0.75; // ustalaşılmış
    if (progress.failStreak >= 2) weight *= 0.75; // zorlanılan oyunu üst üste yığma
  }
  if (ctx.previous?.games.includes(id)) weight *= 0.5;
  return Math.max(weight, 0.05);
}

function weightedPick(pool: { id: GameId; weight: number }[], rng: Rng): number {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= pool[i].weight;
    if (r <= 0) return i;
  }
  return pool.length - 1;
}

/**
 * Günlük antrenman seçimi. Aynı gün için deterministiktir (tarih tohumlu),
 * beceri dengesi için önce kategori başına 1 oyun seçer, gerekirse 2'ye çıkar.
 */
export function generateDailyTraining(ctx: DailyContext): DailyTraining {
  const enabled = GAME_IDS.filter((id) => !ctx.disabled.includes(id));
  const candidates = enabled.length > 0 ? enabled : GAME_IDS;
  const count = clamp(ctx.count, 1, candidates.length);
  const rng = seededRng(hashString(`daily:${ctx.date}`));

  const chosen: GameId[] = [];
  const perCategory = new Map<SkillCategory, number>();
  let cap = 1;

  while (chosen.length < count) {
    const pool = candidates
      .filter((id) => !chosen.includes(id) && (perCategory.get(GAME_META[id].category) ?? 0) < cap)
      .map((id) => ({ id, weight: gameWeight(id, ctx) }));
    if (pool.length === 0) {
      cap += 1;
      continue;
    }
    const picked = pool[weightedPick(pool, rng)].id;
    chosen.push(picked);
    const cat = GAME_META[picked].category;
    perCategory.set(cat, (perCategory.get(cat) ?? 0) + 1);
  }

  return {
    date: ctx.date,
    games: orderGames(chosen, ctx),
    completedGames: {},
    completed: false,
    totalScore: 0,
  };
}

/** Aynı kategoriden iki oyun yan yana gelmesin; dünkü ilk oyunla açılmasın. */
function orderGames(games: GameId[], ctx: DailyContext): GameId[] {
  const rng = seededRng(hashString(`order:${ctx.date}`));
  const pool = games.slice();
  const out: GameId[] = [];
  while (pool.length) {
    const lastCat = out.length ? GAME_META[out[out.length - 1]].category : null;
    let options = pool.filter((id) => GAME_META[id].category !== lastCat);
    if (out.length === 0 && ctx.previous?.games[0]) options = options.filter((id) => id !== ctx.previous!.games[0]);
    if (options.length === 0) options = pool;
    const next = options[Math.floor(rng() * options.length)];
    out.push(next);
    pool.splice(pool.indexOf(next), 1);
  }
  return out;
}

/** Tahmini toplam süre (dk) — oyun süreleri + geçişler için ~20 sn/oyun. */
export function estimateMinutes(games: GameId[]): number {
  const seconds = games.reduce((s, id) => s + GAME_META[id].estimatedSeconds + 20, 0);
  return Math.max(1, Math.round(seconds / 60));
}

export function categoriesOf(games: GameId[]): SkillCategory[] {
  return Array.from(new Set(games.map((g) => GAME_META[g].category))).filter((c) => CATEGORIES[c]);
}

export function nextDailyGame(daily: DailyTraining): GameId | null {
  return daily.games.find((g) => daily.completedGames[g] === undefined) ?? null;
}
