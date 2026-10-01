import { clamp, pick, randInt, shuffle, type Rng } from '@/utils/rng';
import { COLORS, SHAPES, glyphKey, mutateGlyph, type Glyph } from '../shared/glyphs';

export type Item = { kind: 'number'; value: number } | { kind: 'glyph'; glyph: Glyph };

export interface Question {
  /** Ekranda gösterilen dizi (sonunda "?" gelir). */
  items: Item[];
  options: Item[];
  answerIndex: number;
  /** Ekran okuyucu / sonuç geri bildirimi için kuralın kısa açıklaması. */
  explanation: string;
}

export const OPTION_COUNT = 4;

export function tierFor(difficulty: number): number {
  return clamp(1 + Math.floor(difficulty / 15), 1, 7);
}

// ---------------------------------------------------------------------------------------------
// Sayı dizileri

interface NumberSeq {
  terms: number[];
  answer: number;
  /** Cevaba yakın, mantıklı görünen yanlışlar (ör. adımı bir kaydırılmış). */
  near: number[];
  explanation: string;
}

type NumberGen = (tier: number, rng: Rng) => NumberSeq;

const arithmetic: NumberGen = (tier, rng) => {
  const step = randInt(1, 3 + tier, rng);
  const sign = tier >= 2 && rng() < 0.4 ? -1 : 1;
  const start = sign === 1 ? randInt(1, 12, rng) : step * 6 + randInt(0, 8, rng);
  const len = tier <= 2 ? 4 : 5;
  const terms = Array.from({ length: len }, (_, i) => start + sign * step * i);
  const answer = start + sign * step * len;
  const last = terms[len - 1];
  return {
    terms,
    answer,
    near: [last + sign * (step + 1), last + sign * Math.max(1, step - 1), last],
    explanation: `Her adımda ${sign === 1 ? '+' : '−'}${step}`,
  };
};

const geometric: NumberGen = (tier, rng) => {
  const ratio = tier >= 4 && rng() < 0.4 ? 3 : 2;
  const start = ratio === 3 ? randInt(1, 3, rng) : randInt(1, 5, rng);
  const terms = Array.from({ length: 4 }, (_, i) => start * ratio ** i);
  const answer = start * ratio ** 4;
  const last = terms[3];
  return {
    terms,
    answer,
    near: [last + terms[3] - terms[2], last * (ratio + 1), last + ratio],
    explanation: `Her adımda ×${ratio}`,
  };
};

const alternating: NumberGen = (tier, rng) => {
  const a = randInt(1, 3 + tier, rng);
  let b = randInt(1, 3 + tier, rng);
  if (b === a) b = a + 1;
  const start = randInt(1, 10, rng);
  const build = (n: number) => {
    const out = [start];
    for (let i = 0; i < n - 1; i++) out.push(out[i] + (i % 2 === 0 ? a : b));
    return out;
  };
  const all = build(6);
  const terms = all.slice(0, 5);
  const answer = all[5];
  const last = terms[4];
  return {
    terms,
    answer,
    near: [last + a, last + b, last + a + 1],
    explanation: `Sırayla +${a} ve +${b}`,
  };
};

const squares: NumberGen = (_tier, rng) => {
  const kind = rng() < 0.5 ? 'square' : 'triangular';
  if (kind === 'square') {
    const k = randInt(1, 6, rng);
    const terms = [0, 1, 2, 3].map((i) => (k + i) ** 2);
    const answer = (k + 4) ** 2;
    return { terms, answer, near: [answer - 1, answer + 1, terms[3] + 2 * (k + 3)], explanation: 'Ardışık sayıların kareleri' };
  }
  const k = randInt(1, 5, rng);
  const tri = (n: number) => (n * (n + 1)) / 2;
  const terms = [0, 1, 2, 3].map((i) => tri(k + i));
  const answer = tri(k + 4);
  return { terms, answer, near: [answer - 1, answer + 1, terms[3] + (k + 3)], explanation: 'Her adımda fark 1 artıyor (üçgen sayılar)' };
};

const fibonacci: NumberGen = (_tier, rng) => {
  const a = randInt(1, 4, rng);
  const b = randInt(1, 5, rng);
  const t = [a, b];
  while (t.length < 6) t.push(t[t.length - 1] + t[t.length - 2]);
  const terms = t.slice(0, 5);
  const answer = t[5];
  return {
    terms,
    answer,
    near: [terms[4] + terms[3] - 1, terms[4] + terms[3] + 1, terms[4] * 2],
    explanation: 'Her terim önceki ikisinin toplamı',
  };
};

const growing: NumberGen = (_tier, rng) => {
  const start = randInt(1, 8, rng);
  const d0 = randInt(1, 2, rng);
  const t = [start];
  for (let i = 0; i < 5; i++) t.push(t[i] + d0 + i);
  const terms = t.slice(0, 5);
  const answer = t[5];
  return {
    terms,
    answer,
    near: [terms[4] + (d0 + 3), terms[4] + (d0 + 5), terms[4] + (d0 + 4) + 1],
    explanation: 'Fark her adımda 1 artıyor',
  };
};

const interleaved: NumberGen = (_tier, rng) => {
  const a0 = randInt(1, 9, rng);
  const sa = randInt(1, 4, rng);
  const sb = randInt(2, 6, rng) * (rng() < 0.3 ? -1 : 1);
  const b0 = sb < 0 ? randInt(20, 40, rng) : randInt(10, 30, rng);
  // a0, b0, a1, b1, a2, ?(b2)
  const terms = [a0, b0, a0 + sa, b0 + sb, a0 + 2 * sa];
  const answer = b0 + 2 * sb;
  return {
    terms,
    answer,
    near: [answer + 1, answer - 1, a0 + 3 * sa],
    explanation: 'İki ayrı dizi iç içe: tekler ve çiftler kendi kuralıyla ilerliyor',
  };
};

const NUMBER_GENS_BY_TIER: NumberGen[][] = [
  [arithmetic],
  [arithmetic],
  [arithmetic, geometric],
  [alternating, geometric],
  [squares, fibonacci, alternating],
  [interleaved, growing, fibonacci, squares],
  [interleaved, growing, alternating, squares],
];

function numberOptions(seq: NumberSeq, rng: Rng): { options: number[]; answerIndex: number } {
  const forbid = new Set<number>([seq.answer]);
  const valid = (n: number) => Number.isInteger(n) && n >= 0 && !forbid.has(n) && n < 100_000;
  const chosen: number[] = [];
  const take = (n: number) => {
    if (valid(n) && chosen.length < OPTION_COUNT - 1) {
      chosen.push(n);
      forbid.add(n);
    }
  };
  shuffle(seq.near, rng).slice(0, 2).forEach(take);
  const offsets = shuffle([1, -1, 2, -2, 3, -3, 5, -5, 10, -10, 4, -4], rng);
  for (const o of offsets) take(seq.answer + o);
  for (let k = 20; chosen.length < OPTION_COUNT - 1; k++) take(seq.answer + k);
  const all = shuffle([seq.answer, ...chosen], rng);
  return { options: all, answerIndex: all.indexOf(seq.answer) };
}

function numberQuestion(tier: number, rng: Rng): Question {
  const gen = pick(NUMBER_GENS_BY_TIER[tier - 1], rng);
  const seq = gen(tier, rng);
  const { options, answerIndex } = numberOptions(seq, rng);
  return {
    items: seq.terms.map((value) => ({ kind: 'number', value })),
    options: options.map((value) => ({ kind: 'number', value })),
    answerIndex,
    explanation: seq.explanation,
  };
}

// ---------------------------------------------------------------------------------------------
// Şekil dizileri

const PATTERNS_BY_TIER: string[][] = [
  ['AB'],
  ['AB'],
  ['AB', 'ABC', 'AAB', 'ABB'],
  ['ABC', 'AAB', 'ABB', 'AABB'],
  ['AABB', 'ABAC', 'ABC', 'AAB'],
  ['AABB', 'ABAC', 'ABCB'],
  ['AABB', 'ABAC', 'ABCB', 'ABBC'],
];

function distinctBaseGlyphs(count: number, rng: Rng): Glyph[] {
  const shapes = shuffle(SHAPES, rng).slice(0, count);
  const colors = shuffle(COLORS, rng).slice(0, count);
  return shapes.map((shape, i) => ({ shape, color: colors[i], fill: 'solid', rotation: 0 }));
}

function glyphOptions(correct: Glyph, pool: Glyph[], rng: Rng): { options: Glyph[]; answerIndex: number } {
  const seen = new Set([glyphKey(correct)]);
  const distractors: Glyph[] = [];
  const add = (g: Glyph) => {
    const k = glyphKey(g);
    if (!seen.has(k) && distractors.length < OPTION_COUNT - 1) {
      seen.add(k);
      distractors.push(g);
    }
  };
  shuffle(pool, rng).forEach(add);
  for (let i = 0; i < 60 && distractors.length < OPTION_COUNT - 1; i++) add(mutateGlyph(correct, i < 20 ? 1 : 2, rng));
  const all = shuffle([correct, ...distractors], rng);
  return { options: all, answerIndex: all.findIndex((g) => glyphKey(g) === glyphKey(correct)) };
}

function shapeQuestion(tier: number, rng: Rng): Question {
  // Yüksek kademede iki nitelik (şekil ve renk) farklı periyotlarla döner.
  if (tier >= 6 && rng() < 0.5) {
    const shapes = shuffle(SHAPES, rng).slice(0, 2);
    const colors = shuffle(COLORS, rng).slice(0, 3);
    const at = (i: number): Glyph => ({ shape: shapes[i % 2], color: colors[i % 3], fill: 'solid', rotation: 0 });
    const items = Array.from({ length: 7 }, (_, i) => at(i));
    const correct = at(7);
    const wrongShape: Glyph = { ...correct, shape: shapes[0] === correct.shape ? shapes[1] : shapes[0] };
    const wrongColor: Glyph = { ...correct, color: colors[(colors.indexOf(correct.color) + 1) % 3] };
    const { options, answerIndex } = glyphOptions(correct, [wrongShape, wrongColor], rng);
    return {
      items: items.map((glyph) => ({ kind: 'glyph', glyph })),
      options: options.map((glyph) => ({ kind: 'glyph', glyph })),
      answerIndex,
      explanation: 'Şekil 2’li, renk 3’lü bir döngüyle değişiyor',
    };
  }

  const pattern = pick(PATTERNS_BY_TIER[tier - 1], rng);
  const letters = Array.from(new Set(pattern.split('')));
  const glyphs = distinctBaseGlyphs(letters.length + 1, rng);
  const map = new Map(letters.map((l, i) => [l, glyphs[i]] as const));
  const shown = Math.min(7, Math.max(5, pattern.length * 2 - 1));
  const at = (i: number) => map.get(pattern[i % pattern.length])!;
  const items = Array.from({ length: shown }, (_, i) => at(i));
  const correct = at(shown);
  const extra = glyphs[letters.length]; // desende hiç geçmeyen yabancı bir glif
  const { options, answerIndex } = glyphOptions(correct, [...map.values(), extra], rng);
  return {
    items: items.map((glyph) => ({ kind: 'glyph', glyph })),
    options: options.map((glyph) => ({ kind: 'glyph', glyph })),
    answerIndex,
    explanation: `Desen “${pattern}” şeklinde tekrar ediyor`,
  };
}

export function makeQuestion(difficulty: number, rng: Rng = Math.random): Question {
  const tier = tierFor(difficulty);
  const pShape = tier <= 2 ? 0.55 : 0.4;
  return rng() < pShape ? shapeQuestion(tier, rng) : numberQuestion(tier, rng);
}

export function itemKey(item: Item): string {
  return item.kind === 'number' ? `n:${item.value}` : `g:${glyphKey(item.glyph)}`;
}
