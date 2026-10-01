import { MAX_SCORE } from '@shared/constants';
import type { PerformanceBreakdown } from '@shared/types';
import { clamp } from '@/utils/rng';

export interface AttemptStats {
  attempts: number;
  correct: number;
  wrong: number;
  reactionTimes: number[];
}

export interface ScoringConfig {
  /** Oyun tepki süresi ölçüyor mu? */
  measuresReaction: boolean;
  /** Bu değerin altındaki ortalama tepki süresi tam hız puanı alır (ms). */
  fastMs: number;
  /** Bu değerin üstündeki ortalama tepki süresi sıfır hız puanı alır (ms). */
  slowMs: number;
  /** İyi bir oturumda beklenen deneme sayısı — az oynayanın skoru orantılı düşer. */
  targetAttempts: number;
}

/** Skor ağırlıkları: doğruluk %50, hız %30, tutarlılık %20. Tepki ölçülmeyen oyunlarda yalnızca doğruluk. */
export const SCORE_WEIGHTS = { accuracy: 0.5, speed: 0.3, consistency: 0.2 } as const;

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length);
}

export function accuracyPercent(correct: number, attempts: number): number {
  return attempts === 0 ? 0 : (correct / attempts) * 100;
}

/** Ortalama tepki süresini 0-100 hız puanına çevirir. */
export function speedScore(avgMs: number, fastMs: number, slowMs: number): number {
  if (avgMs <= 0) return 0;
  return clamp(((slowMs - avgMs) / (slowMs - fastMs)) * 100, 0, 100);
}

/** Tepki sürelerinin değişkenliği (CV) düşükse yüksek tutarlılık puanı. */
export function consistencyScore(reactionTimes: number[]): number {
  if (reactionTimes.length < 3) return reactionTimes.length === 0 ? 0 : 60;
  const m = mean(reactionTimes);
  if (m <= 0) return 0;
  const cv = stdDev(reactionTimes) / m;
  return clamp(100 * (1 - (cv - 0.15) / 0.6), 0, 100);
}

export function computeBreakdown(stats: AttemptStats, cfg: ScoringConfig): PerformanceBreakdown {
  const accuracy = accuracyPercent(stats.correct, stats.attempts);
  if (!cfg.measuresReaction || stats.reactionTimes.length === 0) {
    return { accuracy, speed: 0, consistency: 0 };
  }
  return {
    accuracy,
    speed: speedScore(mean(stats.reactionTimes), cfg.fastMs, cfg.slowMs),
    consistency: consistencyScore(stats.reactionTimes),
  };
}

/** 0-100 arası birleşik performans endeksi. */
export function performanceIndex(b: PerformanceBreakdown, measuresReaction: boolean): number {
  if (!measuresReaction) return b.accuracy;
  return (
    SCORE_WEIGHTS.accuracy * b.accuracy +
    SCORE_WEIGHTS.speed * b.speed +
    SCORE_WEIGHTS.consistency * b.consistency
  );
}

/**
 * Oyun skoru (0-1000):
 *   performans endeksi × hacim (az denemeyi cezalandırır) × zorluk çarpanı (0.5 → 1.0).
 * Zorluk 50'de kusursuz oyun 750, zorluk 100'de 1000 verir; böylece skor hem başarıyı hem seviyeyi yansıtır.
 */
export function calculateScore(stats: AttemptStats, cfg: ScoringConfig, difficulty: number): number {
  if (stats.attempts === 0) return 0;
  const breakdown = computeBreakdown(stats, cfg);
  const perf = performanceIndex(breakdown, cfg.measuresReaction);
  const volume = clamp(stats.attempts / Math.max(1, cfg.targetAttempts), 0, 1);
  const difficultyFactor = 0.5 + clamp(difficulty, 1, 100) / 200;
  return Math.round(clamp((perf / 100) * MAX_SCORE * volume * difficultyFactor, 0, MAX_SCORE));
}
