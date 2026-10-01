import { DIFFICULTY_MAX, DIFFICULTY_MIN } from '@shared/constants';
import type { DifficultyChange, GameResult } from '@shared/types';
import { clamp } from '@/utils/rng';

export interface AdaptiveContext {
  difficulty: number;
  /** Üst üste başarısız (doğruluk < %60) oturum sayısı. */
  failStreak: number;
  lastSpeedScore: number | null;
}

export interface AdaptiveOutcome extends DifficultyChange {
  failStreak: number;
}

/** Bu kadar denemeden az oynanan oturum "veri yetersiz" sayılır ve zorluk değişmez. */
export const MIN_ATTEMPTS_FOR_ADJUSTMENT = 4;

/**
 * Oturum sonrası zorluğu ayarlar (1-100):
 *  - doğruluk > %90 ve hız gelişiyorsa  → +5   (hız düşmüşse +2)
 *  - doğruluk %70–90                    → +1
 *  - doğruluk %60–70                    → değişmez
 *  - doğruluk < %60                     → −5
 *  - 3 oturum üst üste < %60            → −10 (anti-frustration)
 */
export function adjustDifficulty(ctx: AdaptiveContext, result: GameResult, measuresReaction: boolean): AdaptiveOutcome {
  const before = clamp(Math.round(ctx.difficulty), DIFFICULTY_MIN, DIFFICULTY_MAX);
  const acc = result.accuracy;

  if (result.attempts < MIN_ATTEMPTS_FOR_ADJUSTMENT) {
    return { before, after: before, delta: 0, failStreak: ctx.failStreak, reason: 'Yeterli veri yok — zorluk değişmedi.' };
  }

  const failed = acc < 60;
  let failStreak = failed ? ctx.failStreak + 1 : 0;
  let delta: number;
  let reason: string;

  if (failStreak >= 3) {
    delta = -10;
    failStreak = 0;
    reason = 'Üst üste üç oturum zorlandın — seviyeyi rahatlattık.';
  } else if (acc > 90) {
    const speedImproving =
      !measuresReaction || ctx.lastSpeedScore === null || result.breakdown.speed >= ctx.lastSpeedScore - 2;
    if (speedImproving) {
      delta = 5;
      reason = `Doğruluk %${Math.round(acc)} ve hızın korunuyor — zorluk arttı.`;
    } else {
      delta = 2;
      reason = `Doğruluk %${Math.round(acc)} ama hız düştü — zorluk az arttı.`;
    }
  } else if (acc >= 70) {
    delta = 1;
    reason = `Doğruluk %${Math.round(acc)} — seviye hafifçe yükseldi.`;
  } else if (acc >= 60) {
    delta = 0;
    reason = `Doğruluk %${Math.round(acc)} — bu seviyede pekişmeye devam.`;
  } else {
    delta = -5;
    reason = `Doğruluk %${Math.round(acc)} — zorluk biraz düşürüldü.`;
  }

  const after = clamp(before + delta, DIFFICULTY_MIN, DIFFICULTY_MAX);
  return { before, after, delta: after - before, failStreak, reason };
}
