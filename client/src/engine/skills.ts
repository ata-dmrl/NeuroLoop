import { CATEGORIES, CATEGORY_ORDER } from '@shared/constants';
import type { GameMeta, GameResult, SkillCategory, SkillDelta, SkillId, UserSkill } from '@shared/types';

export type SkillMap = Partial<Record<SkillId, UserSkill>>;

/** Üstel hareketli ortalama katsayıları: birincil beceri daha hızlı, ikincil daha yavaş güncellenir. */
const ALPHA_PRIMARY = 0.35;
const ALPHA_SECONDARY = 0.18;

export function skillLevel(score: number): number {
  return 1 + Math.floor(score / 125);
}

function ema(prev: number, next: number, alpha: number): number {
  return prev + alpha * (next - prev);
}

function updateOne(prev: UserSkill | undefined, skill: SkillId, result: GameResult, alpha: number, measured: boolean, now: string): UserSkill {
  if (!prev || prev.samples === 0) {
    return {
      skill,
      score: result.score,
      level: skillLevel(result.score),
      accuracy: result.accuracy,
      averageReactionTime: measured ? result.reactionTime : 0,
      samples: 1,
      lastUpdated: now,
    };
  }
  const score = ema(prev.score, result.score, alpha);
  return {
    skill,
    score,
    level: skillLevel(score),
    accuracy: ema(prev.accuracy, result.accuracy, alpha),
    averageReactionTime: measured
      ? prev.averageReactionTime > 0
        ? ema(prev.averageReactionTime, result.reactionTime, alpha)
        : result.reactionTime
      : prev.averageReactionTime,
    samples: prev.samples + 1,
    lastUpdated: now,
  };
}

/** Bir oyun sonucunu ilgili birincil ve ikincil becerilere işler. */
export function applyResultToSkills(
  skills: SkillMap,
  result: GameResult,
  meta: GameMeta,
  now: string = new Date().toISOString(),
): { skills: SkillMap; deltas: SkillDelta[] } {
  const measured = meta.measuresReaction && result.reactionTime > 0;
  const next: SkillMap = { ...skills };
  const deltas: SkillDelta[] = [];
  const targets: { id: SkillId; alpha: number }[] = [
    { id: meta.primarySkill, alpha: ALPHA_PRIMARY },
    ...meta.secondarySkills.map((id) => ({ id, alpha: ALPHA_SECONDARY })),
  ];
  for (const { id, alpha } of targets) {
    const before = skills[id]?.samples ? skills[id]!.score : null;
    const updated = updateOne(skills[id], id, result, alpha, measured, now);
    next[id] = updated;
    deltas.push({ skill: id, before, after: updated.score });
  }
  return { skills: next, deltas };
}

/** Kategori skoru: alt becerilerin ağırlıklı ortalaması (verisi olanlar üzerinden yeniden normalize edilir). */
export function categoryScore(skills: SkillMap, category: SkillCategory): number | null {
  let sum = 0;
  let weight = 0;
  for (const { id, weight: w } of CATEGORIES[category].skills) {
    const s = skills[id];
    if (s && s.samples > 0) {
      sum += s.score * w;
      weight += w;
    }
  }
  return weight === 0 ? null : sum / weight;
}

export function categoryScores(skills: SkillMap): Record<SkillCategory, number | null> {
  const out = {} as Record<SkillCategory, number | null>;
  for (const c of CATEGORY_ORDER) out[c] = categoryScore(skills, c);
  return out;
}

/** Genel skor: panodaki kategorilerden verisi olanların ortalaması. */
export function overallScore(skills: SkillMap): number | null {
  const scores = CATEGORY_ORDER.filter((c) => CATEGORIES[c].onDashboard)
    .map((c) => categoryScore(skills, c))
    .filter((v): v is number => v !== null);
  if (scores.length === 0) return null;
  return scores.reduce((s, v) => s + v, 0) / scores.length;
}
