import { GAME_IDS, GAME_META } from '@shared/constants';
import type { AchievementDef, GameId, GameProgress, GameResult, GameSessionRecord } from '@shared/types';
import type { SkillMap } from './skills';

/** Sağlıklı ilerleme: XP oturum başına makul ve sınırlı; seri kaçırılınca ceza yok. */
export const DAILY_COMPLETION_XP = 50;

export function xpForSession(result: GameResult, isPersonalBest: boolean): number {
  return 5 + Math.round(result.score / 10) + (isPersonalBest ? 15 : 0);
}

/** Seviye n'e ulaşmak için gereken toplam XP: 150 × (n−1)². */
export function xpForLevel(level: number): number {
  return 150 * (level - 1) ** 2;
}

export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 150)) + 1;
}

export function levelProgress(xp: number): { level: number; into: number; needed: number; ratio: number } {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const into = xp - base;
  const needed = next - base;
  return { level, into, needed, ratio: needed === 0 ? 0 : into / needed };
}

export interface AchievementContext {
  sessions: GameSessionRecord[];
  games: Partial<Record<GameId, GameProgress>>;
  skills: SkillMap;
  streak: { current: number; longest: number };
  dailyCompletions: number;
  level: number;
}

interface AchievementRule extends AchievementDef {
  check: (c: AchievementContext) => boolean;
}

export const ACHIEVEMENTS: AchievementRule[] = [
  {
    id: 'first-steps',
    name: 'İlk Adım',
    description: 'İlk oyununu tamamla.',
    icon: 'footprints',
    check: (c) => c.sessions.length >= 1,
  },
  {
    id: 'warm-up',
    name: 'Isınma Turu',
    description: '10 oyun oyna.',
    icon: 'flame',
    check: (c) => c.sessions.length >= 10,
  },
  {
    id: 'regular',
    name: 'Düzenli Antrenör',
    description: '50 oyun oyna.',
    icon: 'dumbbell',
    check: (c) => c.sessions.length >= 50,
  },
  {
    id: 'streak-3',
    name: '3 Günlük Seri',
    description: 'Üst üste 3 gün antrenman yap.',
    icon: 'flame',
    check: (c) => c.streak.longest >= 3,
  },
  {
    id: 'streak-7',
    name: '7 Günlük Seri',
    description: 'Üst üste 7 gün antrenman yap.',
    icon: 'flame',
    check: (c) => c.streak.longest >= 7,
  },
  {
    id: 'streak-30',
    name: '30 Günlük Seri',
    description: 'Üst üste 30 gün antrenman yap.',
    icon: 'calendar-check',
    check: (c) => c.streak.longest >= 30,
  },
  {
    id: 'speed-master',
    name: 'Hız Ustası',
    description: 'Bir oyunda hız puanı ≥ 85 ve doğruluk ≥ %85 yakala.',
    icon: 'zap',
    check: (c) => c.sessions.some((s) => s.breakdown.speed >= 85 && s.accuracy >= 85 && s.attempts >= 10),
  },
  {
    id: 'memory-builder',
    name: 'Hafıza Kurucusu',
    description: 'Memory Grid veya Recall Chain’de 650+ skor yap.',
    icon: 'brain',
    check: (c) => (['memory-grid', 'recall-chain'] as GameId[]).some((g) => (c.games[g]?.bestScore ?? 0) >= 650),
  },
  {
    id: 'accuracy-expert',
    name: 'Doğruluk Uzmanı',
    description: '%95+ doğrulukla 3 oyun bitir (en az 10 deneme).',
    icon: 'target',
    check: (c) => c.sessions.filter((s) => s.accuracy >= 95 && s.attempts >= 10).length >= 3,
  },
  {
    id: 'flexibility-pro',
    name: 'Esneklik Uzmanı',
    description: 'Rule Switch’te %90+ doğruluk yakala (en az 15 deneme).',
    icon: 'repeat',
    check: (c) => c.sessions.some((s) => s.gameId === 'rule-switch' && s.accuracy >= 90 && s.attempts >= 15),
  },
  {
    id: 'explorer',
    name: 'Kaşif',
    description: 'Sekiz oyunun hepsini en az bir kez oyna.',
    icon: 'compass',
    check: (c) => GAME_IDS.every((g) => (c.games[g]?.plays ?? 0) > 0),
  },
  {
    id: 'daily-first',
    name: 'Günün Antrenmanı',
    description: 'İlk günlük antrenmanını tamamla.',
    icon: 'sun',
    check: (c) => c.dailyCompletions >= 1,
  },
  {
    id: 'daily-7',
    name: 'Haftalık Rutin',
    description: '7 günlük antrenman tamamla.',
    icon: 'calendar-check',
    check: (c) => c.dailyCompletions >= 7,
  },
  {
    id: 'climber',
    name: 'Zirveye Tırmanış',
    description: 'Herhangi bir oyunda zorluk 75’e ulaş.',
    icon: 'mountain',
    check: (c) => GAME_IDS.some((g) => (c.games[g]?.difficulty ?? 0) >= 75),
  },
  {
    id: 'level-5',
    name: 'Seviye 5',
    description: 'Hesap seviyeni 5’e çıkar.',
    icon: 'award',
    check: (c) => c.level >= 5,
  },
];

export const ACHIEVEMENT_DEFS: AchievementDef[] = ACHIEVEMENTS.map(({ id, name, description, icon }) => ({ id, name, description, icon }));

export function newlyUnlocked(ctx: AchievementContext, already: Record<string, string>): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !already[a.id] && a.check(ctx)).map(({ id, name, description, icon }) => ({
    id,
    name,
    description,
    icon,
  }));
}

export function gameName(id: GameId): string {
  return GAME_META[id].name;
}
