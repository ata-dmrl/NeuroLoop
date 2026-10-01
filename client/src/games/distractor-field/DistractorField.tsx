import { useEffect, useRef, useState } from 'react';
import { GAME_META } from '@shared/constants';
import { clamp, pick, randInt, scaleByDifficulty } from '@/utils/rng';
import type { GameComponentProps, GameModule } from '../types';
import { GlyphSvg, glyphLabel, makeDistractors, randomGlyph, type Glyph } from '../shared/glyphs';
import { GameButton } from '../shared/input';
import { Mark, Prompt, RoundTimer, Stage, useSchedule } from '../shared/kit';

export const ROUNDS = 10;

export function fieldParams(d: number) {
  const count = Math.round(scaleByDifficulty(d, 12, 56));
  return {
    count,
    cols: clamp(Math.ceil(Math.sqrt(count * 1.3)), 4, 8),
    poolSize: clamp(6 + Math.floor(d / 10), 6, 16),
    similarity: d / 100,
    limitMs: Math.round(10_000 - d * 50),
  };
}

export interface FieldRound {
  target: Glyph;
  cells: Glyph[];
  targetIndex: number;
  /** Hücre başına küçük konum sapması (px) — ızgara görüntüsünü kırar. */
  jitter: { x: number; y: number }[];
}

export function makeRound(d: number): FieldRound {
  const { count, poolSize, similarity } = fieldParams(d);
  const target = randomGlyph();
  const pool = makeDistractors(target, poolSize, similarity);
  const cells: Glyph[] = Array.from({ length: count }, () => pick(pool));
  const targetIndex = randInt(0, count - 1);
  cells[targetIndex] = target;
  return {
    target,
    cells,
    targetIndex,
    jitter: cells.map(() => ({ x: randInt(-5, 5), y: randInt(-5, 5) })),
  };
}

function DistractorField({ engine, difficulty, colorAssist }: GameComponentProps) {
  const { cols, limitMs } = fieldParams(difficulty);
  const schedule = useSchedule(engine);

  const [round, setRound] = useState(0);
  const [data, setData] = useState<FieldRound | null>(null);
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<'found' | 'timeout' | null>(null);
  const startedAt = useRef(0);
  const cancelTimeout = useRef<(() => void) | null>(null);
  const settled = useRef(false);

  useEffect(() => {
    settled.current = false;
    setResult(null);
    setWrong(new Set());
    setData(makeRound(difficulty));
    startedAt.current = engine.now();
    cancelTimeout.current = schedule(limitMs, () => settle('timeout'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  function settle(kind: 'found' | 'timeout') {
    if (settled.current) return;
    settled.current = true;
    cancelTimeout.current?.();
    if (kind === 'timeout') engine.record({ correct: false });
    setResult(kind);
    schedule(kind === 'found' ? 450 : 1000, () => {
      engine.setRound(round + 1);
      if (round + 1 >= ROUNDS) engine.finish();
      else setRound(round + 1);
    });
  }

  function tap(i: number) {
    if (!data || settled.current || wrong.has(i)) return;
    if (i === data.targetIndex) {
      engine.record({ correct: true, rtMs: engine.now() - startedAt.current });
      settle('found');
    } else {
      engine.record({ correct: false });
      setWrong((prev) => new Set(prev).add(i));
    }
  }

  if (!data) return <Stage />;

  return (
    <Stage className="gap-4">
      <div className="flex items-center gap-4">
        <span className="eyebrow">Bul</span>
        <div className="card flex h-16 w-16 items-center justify-center p-2">
          <GlyphSvg glyph={data.target} colorAssist={colorAssist} label={`Hedef: ${glyphLabel(data.target)}`} />
        </div>
      </div>
      <div className="w-full max-w-xl">
        <RoundTimer engine={engine} startedAt={startedAt.current} limitMs={limitMs} />
      </div>
      <div
        className="grid w-full max-w-xl gap-1.5 sm:gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Sembol alanı"
      >
        {data.cells.map((g, i) => {
          const isTarget = i === data.targetIndex;
          const state = isTarget && result ? (result === 'found' ? 'correct' : 'missed') : wrong.has(i) ? 'wrong' : undefined;
          return (
            <GameButton
              key={i}
              onAct={() => tap(i)}
              data-state={state}
              disabled={result !== null || wrong.has(i)}
              aria-label={`Sembol ${i + 1}: ${glyphLabel(g)}`}
              className="play-btn relative aspect-square !min-h-0 !min-w-0 !rounded-xl p-1"
              style={{ transform: `translate(${data.jitter[i].x}%, ${data.jitter[i].y}%)` }}
            >
              <GlyphSvg glyph={g} colorAssist={colorAssist} />
              {wrong.has(i) && (
                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-[color:var(--danger-soft)]/80" aria-hidden>
                  <Mark ok={false} size={22} />
                </span>
              )}
              {isTarget && result === 'found' && (
                <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                  <Mark ok size={26} />
                </span>
              )}
            </GameButton>
          );
        })}
      </div>
      <Prompt live>{result === 'timeout' ? 'Süre doldu — hedef işaretlendi' : result === 'found' ? 'Buldun!' : ' '}</Prompt>
    </Stage>
  );
}

const gameModule: GameModule = {
  meta: GAME_META['distractor-field'],
  config: {
    rounds: ROUNDS,
    fastMs: 1500,
    slowMs: 9000,
    targetAttempts: () => ROUNDS,
  },
  Component: DistractorField,
  howToPlay: [
    'Üstte hedef sembolü görürsün — aşağıdaki kalabalığın içinde tam olarak aynısı tek bir tane var.',
    'Bulup dokun. Yanlış dokunuş hata sayılır ama tur devam eder.',
    '10 tur sürer. Zorlukla birlikte sembol sayısı, benzerlik ve zaman baskısı artar.',
  ],
  controls: 'Fare / dokunma. Klavyede Tab ile gezip Enter ile seçebilirsin.',
};

export default gameModule;
