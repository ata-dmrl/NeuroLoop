import { GAME_META } from '@shared/constants';
import type { GameId, GameSessionRecord, SkillCategory } from '@shared/types';
import { addDays, dayKey, diffDays } from '@/utils/date';
import { mean } from './scoring';

export type RangeDays = 7 | 30 | 90 | null;

/** Oynanan günlerden seri hesabı: bugün oynanmadıysa dün oynanmış seri hâlâ "canlı" sayılır. */
export function computeStreaks(sessions: Pick<GameSessionRecord, 'createdAt'>[], today: string = dayKey()): { current: number; longest: number } {
  const days = Array.from(new Set(sessions.map((s) => dayKey(s.createdAt)))).sort();
  if (days.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = diffDays(days[i - 1], days[i]) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const last = days[days.length - 1];
  let current = 0;
  if (diffDays(last, today) <= 1) {
    current = 1;
    for (let i = days.length - 1; i > 0; i--) {
      if (diffDays(days[i - 1], days[i]) === 1) current++;
      else break;
    }
  }
  return { current, longest: Math.max(longest, current) };
}

export function filterByRange<T extends { createdAt: string }>(sessions: T[], range: RangeDays, today: string = dayKey()): T[] {
  if (range === null) return sessions;
  const from = addDays(today, -(range - 1));
  return sessions.filter((s) => dayKey(s.createdAt) >= from);
}

/** Oturum, oyununun kategorisine (birincil beceri) sayılır. */
export function sessionInCategory(gameId: GameId, category: SkillCategory): boolean {
  return GAME_META[gameId].category === category;
}

export interface SeriesPoint {
  date: string;
  value: number;
  count: number;
}

/** Günlük ortalama seri. `valueOf` null döndürürse oturum atlanır. */
export function dailySeries(
  sessions: GameSessionRecord[],
  valueOf: (s: GameSessionRecord) => number | null,
): SeriesPoint[] {
  const buckets = new Map<string, number[]>();
  for (const s of sessions) {
    const v = valueOf(s);
    if (v === null) continue;
    const k = dayKey(s.createdAt);
    const arr = buckets.get(k);
    if (arr) arr.push(v);
    else buckets.set(k, [v]);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, values]) => ({ date, value: Math.round(mean(values)), count: values.length }));
}

export interface SummaryStats {
  gamesPlayed: number;
  bestScore: number;
  averageScore: number;
  averageAccuracy: number;
  averageReactionTime: number;
  trainingSeconds: number;
}

export function summaryStats(sessions: GameSessionRecord[]): SummaryStats {
  if (sessions.length === 0) {
    return { gamesPlayed: 0, bestScore: 0, averageScore: 0, averageAccuracy: 0, averageReactionTime: 0, trainingSeconds: 0 };
  }
  const rts = sessions.filter((s) => s.reactionTime > 0).map((s) => s.reactionTime);
  return {
    gamesPlayed: sessions.length,
    bestScore: Math.max(...sessions.map((s) => s.score)),
    averageScore: mean(sessions.map((s) => s.score)),
    averageAccuracy: mean(sessions.map((s) => s.accuracy)),
    averageReactionTime: mean(rts),
    trainingSeconds: sessions.reduce((sum, s) => sum + s.duration, 0),
  };
}

/** İki dönemin ortalama skorunu karşılaştırır (yüzde değişim). */
export function comparePeriods(sessions: GameSessionRecord[], days: number, today: string = dayKey()): number | null {
  const currentFrom = addDays(today, -(days - 1));
  const prevFrom = addDays(today, -(days * 2 - 1));
  const cur = sessions.filter((s) => dayKey(s.createdAt) >= currentFrom);
  const prev = sessions.filter((s) => {
    const k = dayKey(s.createdAt);
    return k >= prevFrom && k < currentFrom;
  });
  if (cur.length === 0 || prev.length === 0) return null;
  const a = mean(cur.map((s) => s.score));
  const b = mean(prev.map((s) => s.score));
  return b === 0 ? null : ((a - b) / b) * 100;
}
