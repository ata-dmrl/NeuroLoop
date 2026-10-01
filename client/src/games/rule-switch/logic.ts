import { pick, randInt, shuffle, type Rng } from '@/utils/rng';

export type RuleId = 'odd' | 'even' | 'red' | 'blue' | 'circle' | 'biggest';
export type CardColor = 'red' | 'blue' | 'green';
export type CardShape = 'circle' | 'square' | 'triangle';

export interface Card {
  number: number;
  color: CardColor;
  shape: CardShape;
}

export interface RuleDef {
  id: RuleId;
  /** Kural başlığı — vurgulanan kelime `em` ile ayrılır. */
  emphasis: string;
  rest: string;
  test: (card: Card, cards: Card[]) => boolean;
}

export const RULES: Record<RuleId, RuleDef> = {
  odd: { id: 'odd', emphasis: 'TEK', rest: 'sayıyı seç', test: (c) => c.number % 2 === 1 },
  even: { id: 'even', emphasis: 'ÇİFT', rest: 'sayıyı seç', test: (c) => c.number % 2 === 0 },
  red: { id: 'red', emphasis: 'KIRMIZI', rest: 'olanı seç', test: (c) => c.color === 'red' },
  blue: { id: 'blue', emphasis: 'MAVİ', rest: 'olanı seç', test: (c) => c.color === 'blue' },
  circle: { id: 'circle', emphasis: 'DAİRE', rest: 'olanı seç', test: (c) => c.shape === 'circle' },
  biggest: {
    id: 'biggest',
    emphasis: 'EN BÜYÜK',
    rest: 'sayıyı seç',
    test: (c, all) => c.number === Math.max(...all.map((x) => x.number)),
  },
};

/** Zorluğa göre kullanılabilen kurallar: az kuraldan çok kurala. */
export function rulePool(d: number): RuleId[] {
  if (d < 35) return ['odd', 'red'];
  if (d < 65) return ['odd', 'red', 'even'];
  if (d < 85) return ['odd', 'red', 'even', 'blue', 'circle'];
  return ['odd', 'red', 'even', 'blue', 'circle', 'biggest'];
}

export function cardCount(d: number): number {
  return d < 60 ? 3 : 4;
}

/** Kural değişmeden önce kaç deneme yapılacağı: zorlukla kısalır. */
export function runLength(d: number, rng: Rng = Math.random): number {
  const hi = Math.round(7 - (d / 100) * 3);
  const lo = Math.max(2, hi - 2);
  return randInt(lo, hi, rng);
}

const COLORS: CardColor[] = ['red', 'blue', 'green'];
const SHAPES: CardShape[] = ['circle', 'square', 'triangle'];

export interface RuleTrial {
  rule: RuleId;
  cards: Card[];
  answer: number;
}

function randomCard(rng: Rng): Card {
  return { number: randInt(1, 9, rng), color: pick(COLORS, rng), shape: pick(SHAPES, rng) };
}

/** Seçilen kuralı sağlayan TAM OLARAK bir kart olacak şekilde deneme üretir. */
export function makeTrial(rule: RuleId, count: number, rng: Rng = Math.random): RuleTrial {
  const def = RULES[rule];
  for (let attempt = 0; attempt < 500; attempt++) {
    let cards = Array.from({ length: count }, () => randomCard(rng));
    if (rule === 'biggest') {
      const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng).slice(0, count);
      cards = cards.map((c, i) => ({ ...c, number: nums[i] }));
    }
    const matches = cards.map((c, i) => (def.test(c, cards) ? i : -1)).filter((i) => i >= 0);
    if (matches.length === 1) return { rule, cards, answer: matches[0] };
  }
  // Pratikte ulaşılmaz; deterministik bir yedek.
  const cards: Card[] = [
    { number: 3, color: 'red', shape: 'circle' },
    { number: 4, color: 'blue', shape: 'square' },
    { number: 6, color: 'green', shape: 'triangle' },
  ].slice(0, count) as Card[];
  const fallbackRule: RuleId = 'odd';
  return { rule: fallbackRule, cards, answer: 0 };
}

/** Bir öncekinden farklı yeni kural seçer. */
export function nextRule(pool: RuleId[], current: RuleId | null, rng: Rng = Math.random): RuleId {
  const options = pool.filter((r) => r !== current);
  return pick(options.length ? options : pool, rng);
}
