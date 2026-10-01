import { describe, expect, it } from 'vitest';
import { GAME_IDS, GAME_META } from '@shared/constants';
import type { GameResult, GameSessionRecord } from '@shared/types';
import { adjustDifficulty } from './adaptive';
import { generateDailyTraining } from './daily';
import { levelFromXp, xpForLevel } from './gamification';
import { computeStreaks } from './progress';
import { calculateScore } from './scoring';
import { makeQuestion, itemKey } from '@/games/pattern-sequence/logic';
import { makeTrial as makeRuleTrial, RULES, type RuleId } from '@/games/rule-switch/logic';
import { makeProblem } from '@/games/quick-calc/logic';
import { makeDistractors, randomGlyph, glyphKey } from '@/games/shared/glyphs';
import { seededRng } from '@/utils/rng';

function result(partial: Partial<GameResult>): GameResult {
  return {
    gameId: 'symbol-match',
    score: 500,
    accuracy: 80,
    reactionTime: 900,
    mistakes: 2,
    duration: 50,
    difficulty: 50,
    correctAnswers: 20,
    wrongAnswers: 5,
    attempts: 25,
    combo: 8,
    breakdown: { accuracy: 80, speed: 60, consistency: 50 },
    ...partial,
  };
}

describe('adaptive difficulty', () => {
  const ctx = { difficulty: 50, failStreak: 0, lastSpeedScore: null };
  it('yüksek doğrulukta +5', () => expect(adjustDifficulty(ctx, result({ accuracy: 95 }), true).after).toBe(55));
  it('%70-90 arası +1', () => expect(adjustDifficulty(ctx, result({ accuracy: 80 }), true).after).toBe(51));
  it('%60-70 arası değişmez', () => expect(adjustDifficulty(ctx, result({ accuracy: 65 }), true).after).toBe(50));
  it('%60 altında -5', () => expect(adjustDifficulty(ctx, result({ accuracy: 50 }), true).after).toBe(45));
  it('3 üst üste başarısızlıkta -10 ve sayaç sıfırlanır', () => {
    const out = adjustDifficulty({ ...ctx, failStreak: 2 }, result({ accuracy: 40 }), true);
    expect(out.after).toBe(40);
    expect(out.failStreak).toBe(0);
  });
  it('sınırları aşmaz', () => {
    expect(adjustDifficulty({ ...ctx, difficulty: 99 }, result({ accuracy: 99 }), true).after).toBe(100);
    expect(adjustDifficulty({ ...ctx, difficulty: 2 }, result({ accuracy: 10 }), true).after).toBe(1);
  });
  it('veri yetersizse değişmez', () => expect(adjustDifficulty(ctx, result({ attempts: 2, accuracy: 100 }), true).after).toBe(50));
});

describe('skor', () => {
  const cfg = { measuresReaction: true, fastMs: 650, slowMs: 2400, targetAttempts: 30 };
  it('kusursuz oyun zorlukla ölçeklenir', () => {
    const s = { attempts: 30, correct: 30, wrong: 0, reactionTimes: Array(30).fill(600) };
    expect(calculateScore(s, cfg, 50)).toBeGreaterThan(600);
    expect(calculateScore(s, cfg, 100)).toBeGreaterThan(calculateScore(s, cfg, 50));
    expect(calculateScore(s, cfg, 100)).toBeLessThanOrEqual(1000);
  });
  it('az deneme skoru düşürür, sıfır deneme 0 verir', () => {
    const few = { attempts: 5, correct: 5, wrong: 0, reactionTimes: Array(5).fill(600) };
    const many = { attempts: 30, correct: 30, wrong: 0, reactionTimes: Array(30).fill(600) };
    expect(calculateScore(few, cfg, 50)).toBeLessThan(calculateScore(many, cfg, 50));
    expect(calculateScore({ attempts: 0, correct: 0, wrong: 0, reactionTimes: [] }, cfg, 50)).toBe(0);
  });
});

describe('seri ve seviye', () => {
  const at = (d: string) => ({ createdAt: `${d}T12:00:00` }) as Pick<GameSessionRecord, 'createdAt'>;
  it('ardışık günleri sayar', () => {
    const s = [at('2026-09-20'), at('2026-09-21'), at('2026-09-23'), at('2026-09-24'), at('2026-09-25')];
    expect(computeStreaks(s, '2026-09-25')).toEqual({ current: 3, longest: 3 });
  });
  it('bugün oynanmadıysa dünkü seri canlı, iki gün boşluk sıfırlar', () => {
    expect(computeStreaks([at('2026-09-24')], '2026-09-25').current).toBe(1);
    expect(computeStreaks([at('2026-09-23')], '2026-09-25').current).toBe(0);
  });
  it('seviye eğrisi tutarlı', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(xpForLevel(4))).toBe(4);
    expect(levelFromXp(xpForLevel(4) - 1)).toBe(3);
  });
});

describe('günlük antrenman', () => {
  const ctx = { date: '2026-09-25', count: 5, games: {}, skills: {}, disabled: [] as never[] };
  it('aynı gün için deterministik ve benzersiz oyunlar seçer', () => {
    const a = generateDailyTraining(ctx);
    const b = generateDailyTraining(ctx);
    expect(a.games).toEqual(b.games);
    expect(new Set(a.games).size).toBe(5);
  });
  it('kategori dengesi: ilk turda aynı kategoriden birden fazla oyun yok', () => {
    const cats = generateDailyTraining(ctx).games.map((g) => GAME_META[g].category);
    expect(new Set(cats).size).toBe(cats.length);
  });
  it('devre dışı oyunları seçmez', () => {
    const disabled = GAME_IDS.slice(0, 3);
    const plan = generateDailyTraining({ ...ctx, disabled });
    expect(plan.games.some((g) => disabled.includes(g))).toBe(false);
  });
});

describe('oyun üreteçleri', () => {
  it('Pattern Sequence: seçenekler benzersiz ve doğru cevap yerinde', () => {
    for (let d = 1; d <= 100; d += 3) {
      for (let i = 0; i < 40; i++) {
        const q = makeQuestion(d);
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options.map(itemKey)).size).toBe(4);
        expect(q.answerIndex).toBeGreaterThanOrEqual(0);
        expect(q.answerIndex).toBeLessThan(4);
        q.options.forEach((o) => o.kind === 'number' && expect(o.value).toBeGreaterThanOrEqual(0));
      }
    }
  });
  it('Rule Switch: kuralı sağlayan tam bir kart var', () => {
    for (const rule of Object.keys(RULES) as RuleId[]) {
      for (const count of [3, 4]) {
        for (let i = 0; i < 100; i++) {
          const t = makeRuleTrial(rule, count);
          const hits = t.cards.filter((c) => RULES[rule].test(c, t.cards)).length;
          expect(hits).toBe(1);
          expect(RULES[rule].test(t.cards[t.answer], t.cards)).toBe(true);
        }
      }
    }
  });
  it('Quick Calc: cevaplar tam sayı ve negatif değil', () => {
    for (let d = 1; d <= 100; d += 4) {
      for (let i = 0; i < 100; i++) {
        const p = makeProblem(d);
        expect(Number.isInteger(p.answer)).toBe(true);
        expect(p.answer).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it('Glif üreteci: çeldiriciler benzersiz ve hedeften farklı', () => {
    const rng = seededRng(7);
    for (let i = 0; i < 100; i++) {
      const target = randomGlyph(rng);
      const ds = makeDistractors(target, 6, 1, rng);
      const keys = new Set(ds.map(glyphKey));
      expect(keys.size).toBe(6);
      expect(keys.has(glyphKey(target))).toBe(false);
    }
  });
});
