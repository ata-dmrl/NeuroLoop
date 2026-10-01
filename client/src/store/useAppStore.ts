import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DIFFICULTY_START, GAME_META } from '@shared/constants';
import type {
  DailyTraining,
  GameId,
  GameProgress,
  GameResult,
  GameSessionRecord,
  SessionSummary,
} from '@shared/types';
import { adjustDifficulty } from '@/engine/adaptive';
import { generateDailyTraining } from '@/engine/daily';
import { DAILY_COMPLETION_XP, levelFromXp, newlyUnlocked, xpForSession } from '@/engine/gamification';
import { computeStreaks } from '@/engine/progress';
import { applyResultToSkills, type SkillMap } from '@/engine/skills';
import { dayKey } from '@/utils/date';
import { uid } from '@/utils/rng';

export interface Settings {
  /** null = sistem tercihini izle; aksi hâlde sabitlenmiş şema. */
  colorScheme: 'light' | 'dark' | null;
  reducedMotion: boolean;
  sound: boolean;
  /** Renk taşıyan şekillerin üzerine harf işareti koyar (renk körlüğü desteği). */
  colorAssist: boolean;
  /** Günlük hedef: günde kaç oyun. */
  dailyGoal: number;
  /** Günlük antrenmandaki oyun sayısı. */
  dailyGameCount: number;
  disabledGames: GameId[];
}

export interface AppState {
  profile: { name: string; createdAt: string; xp: number };
  settings: Settings;
  sessions: GameSessionRecord[];
  games: Partial<Record<GameId, GameProgress>>;
  skills: SkillMap;
  daily: Record<string, DailyTraining>;
  achievements: Record<string, string>;

  recordSession: (result: GameResult, opts?: { daily?: boolean }) => SessionSummary;
  ensureDailyTraining: () => DailyTraining;
  updateSettings: (patch: Partial<Settings>) => void;
  setName: (name: string) => void;
  resetAll: () => void;
}

const MAX_SESSIONS = 3000;

export function defaultProgress(gameId: GameId): GameProgress {
  return {
    gameId,
    difficulty: DIFFICULTY_START,
    failStreak: 0,
    bestScore: 0,
    plays: 0,
    lastPlayed: null,
    lastScore: null,
    lastSpeedScore: null,
    lastReactionTime: null,
  };
}

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function initialData() {
  return {
    profile: { name: '', createdAt: new Date().toISOString(), xp: 0 },
    settings: {
      colorScheme: null,
      reducedMotion: prefersReducedMotion(),
      sound: false,
      colorAssist: false,
      dailyGoal: 3,
      dailyGameCount: 5,
      disabledGames: [],
    } as Settings,
    sessions: [] as GameSessionRecord[],
    games: {} as AppState['games'],
    skills: {} as SkillMap,
    daily: {} as Record<string, DailyTraining>,
    achievements: {} as Record<string, string>,
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData(),

      recordSession: (result, opts) => {
        const s = get();
        const isDaily = opts?.daily ?? false;
        const meta = GAME_META[result.gameId];

        // Hiç deneme yapılmayan (boş bırakılan) oturum geçmişe, seriye veya becerilere işlenmez.
        if (result.attempts === 0) {
          const progress = s.games[result.gameId] ?? defaultProgress(result.gameId);
          return {
            sessionId: 'empty',
            result,
            isPersonalBest: false,
            previousBest: progress.plays > 0 ? progress.bestScore : null,
            previousScore: progress.lastScore,
            changePercent: null,
            difficulty: { before: progress.difficulty, after: progress.difficulty, delta: 0, reason: 'Hiç deneme yapılmadı — kayıt tutulmadı, zorluk değişmedi.' },
            skillDeltas: [],
            xpGained: 0,
            levelBefore: levelFromXp(s.profile.xp),
            levelAfter: levelFromXp(s.profile.xp),
            unlockedAchievements: [],
            streak: computeStreaks(s.sessions).current,
            dailyCompleted: false,
          };
        }
        const now = new Date();
        const nowIso = now.toISOString();
        const today = dayKey(now);

        const prev = s.games[result.gameId] ?? defaultProgress(result.gameId);
        const previousBest = prev.plays > 0 ? prev.bestScore : null;
        const previousScore = prev.lastScore;
        const isPersonalBest = previousBest !== null && result.score > previousBest;

        const adaptive = adjustDifficulty(
          { difficulty: prev.difficulty, failStreak: prev.failStreak, lastSpeedScore: prev.lastSpeedScore },
          result,
          meta.measuresReaction,
        );

        const record: GameSessionRecord = { ...result, id: uid(), createdAt: nowIso, daily: isDaily };
        const sessions = [...s.sessions, record].slice(-MAX_SESSIONS);

        const progress: GameProgress = {
          ...prev,
          difficulty: adaptive.after,
          failStreak: adaptive.failStreak,
          bestScore: Math.max(prev.bestScore, result.score),
          plays: prev.plays + 1,
          lastPlayed: nowIso,
          lastScore: result.score,
          lastSpeedScore: meta.measuresReaction && result.attempts >= 4 ? result.breakdown.speed : prev.lastSpeedScore,
          lastReactionTime: result.reactionTime > 0 ? result.reactionTime : prev.lastReactionTime,
        };
        const games = { ...s.games, [result.gameId]: progress };

        const { skills, deltas } = applyResultToSkills(s.skills, result, meta, nowIso);

        // Günlük antrenman ilerlemesi
        let daily = s.daily;
        let dailyCompleted = false;
        let dailyBonus = 0;
        const plan = s.daily[today];
        if (isDaily && plan && plan.games.includes(result.gameId) && plan.completedGames[result.gameId] === undefined) {
          const updated: DailyTraining = {
            ...plan,
            completedGames: { ...plan.completedGames, [result.gameId]: result.score },
            totalScore: plan.totalScore + result.score,
          };
          if (updated.games.every((g) => updated.completedGames[g] !== undefined)) {
            updated.completed = true;
            dailyCompleted = true;
            dailyBonus = DAILY_COMPLETION_XP;
          }
          daily = { ...s.daily, [today]: updated };
        }

        const xpGained = xpForSession(result, isPersonalBest) + dailyBonus;
        const levelBefore = levelFromXp(s.profile.xp);
        const xp = s.profile.xp + xpGained;
        const levelAfter = levelFromXp(xp);

        const streak = computeStreaks(sessions, today);
        const dailyCompletions = Object.values(daily).filter((d) => d.completed).length;
        const unlocked = newlyUnlocked(
          { sessions, games, skills, streak, dailyCompletions, level: levelAfter },
          s.achievements,
        );
        const achievements = { ...s.achievements };
        for (const a of unlocked) achievements[a.id] = nowIso;

        set({ sessions, games, skills, daily, achievements, profile: { ...s.profile, xp } });

        return {
          sessionId: record.id,
          result,
          isPersonalBest,
          previousBest,
          previousScore,
          changePercent:
            previousScore === null ? null : ((result.score - previousScore) / Math.max(previousScore, 1)) * 100,
          difficulty: { before: adaptive.before, after: adaptive.after, delta: adaptive.delta, reason: adaptive.reason },
          skillDeltas: deltas,
          xpGained,
          levelBefore,
          levelAfter,
          unlockedAchievements: unlocked,
          streak: streak.current,
          dailyCompleted,
        };
      },

      ensureDailyTraining: () => {
        const s = get();
        const key = dayKey();
        const existing = s.daily[key];
        if (existing) return existing;
        const earlier = Object.keys(s.daily)
          .filter((k) => k < key)
          .sort();
        const plan = generateDailyTraining({
          date: key,
          count: s.settings.dailyGameCount,
          games: s.games,
          skills: s.skills,
          disabled: s.settings.disabledGames,
          previous: earlier.length ? s.daily[earlier[earlier.length - 1]] : null,
        });
        set({ daily: { ...s.daily, [key]: plan } });
        return plan;
      },

      updateSettings: (patch) => {
        const s = get();
        const settings = { ...s.settings, ...patch };
        let daily = s.daily;
        const key = dayKey();
        const plan = daily[key];
        const planInputsChanged =
          patch.dailyGameCount !== undefined ||
          (patch.disabledGames !== undefined &&
            patch.disabledGames.join() !== s.settings.disabledGames.join());
        // Bugünün planında henüz oynanmış oyun yoksa, tercih değişince yeniden seçilsin.
        if (planInputsChanged && plan && Object.keys(plan.completedGames).length === 0) {
          const { [key]: _removed, ...rest } = daily;
          void _removed;
          daily = rest;
        }
        set({ settings, daily });
      },

      setName: (name) => set((s) => ({ profile: { ...s.profile, name: name.trim().slice(0, 40) } })),

      resetAll: () => {
        const settings = get().settings;
        set({ ...initialData(), settings });
      },
    }),
    {
      name: 'neuroloop:v1',
      version: 1,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...(p.settings ?? {}) },
          profile: { ...current.profile, ...(p.profile ?? {}) },
        };
      },
    },
  ),
);

/** Oyunun mevcut ilerleme kaydı (yoksa varsayılan). */
export function useGameProgress(gameId: GameId): GameProgress {
  return useAppStore((s) => s.games[gameId]) ?? defaultProgress(gameId);
}
