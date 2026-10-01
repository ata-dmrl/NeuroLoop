import { pick, randInt, type Rng } from '@/utils/rng';

export interface Problem {
  text: string;
  answer: number;
}

type Op = (rng: Rng) => Problem;

const add = (max: number, min = 1): Op => (rng) => {
  const a = randInt(min, max, rng);
  const b = randInt(min, max, rng);
  return { text: `${a} + ${b}`, answer: a + b };
};

/** Sonuç negatif olmaz. */
const sub = (max: number, min = 1): Op => (rng) => {
  const a = randInt(min, max, rng);
  const b = randInt(min, a, rng);
  return { text: `${a} − ${b}`, answer: a - b };
};

const mul = (lo: number, hi: number): Op => (rng) => {
  const a = randInt(lo, hi, rng);
  const b = randInt(lo, hi, rng);
  return { text: `${a} × ${b}`, answer: a * b };
};

/** Tam bölünen bölme: bölen × bölüm = bölünen. */
const div = (lo: number, hi: number): Op => (rng) => {
  const b = randInt(lo, hi, rng);
  const q = randInt(lo, hi, rng);
  return { text: `${b * q} ÷ ${b}`, answer: q };
};

const mulBig: Op = (rng) => {
  const a = randInt(11, 25, rng);
  const b = randInt(3, 9, rng);
  return { text: `${a} × ${b}`, answer: a * b };
};

const mulAdd: Op = (rng) => {
  const a = randInt(3, 9, rng);
  const b = randInt(3, 9, rng);
  const c = randInt(2, 30, rng);
  return rng() < 0.5 ? { text: `${a} × ${b} + ${c}`, answer: a * b + c } : { text: `${a} × ${b} − ${Math.min(c, a * b - 1)}`, answer: a * b - Math.min(c, a * b - 1) };
};

const threeTerm: Op = (rng) => {
  const a = randInt(20, 80, rng);
  const b = randInt(10, 40, rng);
  const c = randInt(5, 30, rng);
  return rng() < 0.5 ? { text: `${a} + ${b} − ${Math.min(c, a + b)}`, answer: a + b - Math.min(c, a + b) } : { text: `${a} + ${b} + ${c}`, answer: a + b + c };
};

const bigAdd: Op = (rng) => {
  const a = randInt(100, 480, rng);
  const b = randInt(30, 490, rng);
  return rng() < 0.5 ? { text: `${a} + ${b}`, answer: a + b } : { text: `${a + b} − ${b}`, answer: a };
};

/** Zorluk bandına göre işlem havuzu. */
export function opsFor(difficulty: number): Op[] {
  if (difficulty < 20) return [add(20), sub(20), add(12, 2)];
  if (difficulty < 40) return [add(99, 10), sub(99, 10), add(50), sub(50)];
  if (difficulty < 60) return [mul(2, 9), div(2, 9), add(99, 10), sub(99, 10)];
  if (difficulty < 80) return [mul(2, 12), div(2, 12), mulBig, add(99, 20), sub(99, 20)];
  return [mulBig, mulAdd, threeTerm, bigAdd, div(3, 12), mul(6, 15)];
}

export function makeProblem(difficulty: number, rng: Rng = Math.random): Problem {
  return pick(opsFor(difficulty), rng)(rng);
}
