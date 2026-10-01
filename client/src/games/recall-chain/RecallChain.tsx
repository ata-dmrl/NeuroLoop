import { useEffect, useMemo, useRef, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { GAME_META } from '@shared/constants';
import { clamp, randInt, shuffle } from '@/utils/rng';
import type { GameComponentProps, GameModule } from '../types';
import { GlyphSvg, type Glyph, type ShapeName } from '../shared/glyphs';
import { GameButton, useGameKeys } from '../shared/input';
import { Mark, Prompt, Stage, useSchedule } from '../shared/kit';

export const ROUNDS = 8;

export type Token = { kind: 'shape'; shape: ShapeName } | { kind: 'digit'; n: number };

const SHAPE_TOKENS: ShapeName[] = ['triangle', 'circle', 'square', 'star', 'diamond', 'hexagon'];
const SHAPE_NAMES: Record<ShapeName, string> = {
  triangle: 'üçgen',
  circle: 'daire',
  square: 'kare',
  star: 'yıldız',
  diamond: 'baklava',
  hexagon: 'altıgen',
  cross: 'artı',
  moon: 'hilal',
};

export function recallParams(d: number) {
  return {
    startLength: 3 + Math.floor(d / 25),
    paletteSize: clamp(6 + Math.floor(d / 12), 6, 12),
    showMs: Math.round(950 - d * 3),
    gapMs: 220,
  };
}

const tokenKey = (t: Token) => (t.kind === 'shape' ? `s:${t.shape}` : `n:${t.n}`);
const sameToken = (a: Token, b: Token) => tokenKey(a) === tokenKey(b);
const tokenLabel = (t: Token) => (t.kind === 'shape' ? SHAPE_NAMES[t.shape] : String(t.n));

function shapeGlyph(shape: ShapeName): Glyph {
  return { shape, color: 'purple', fill: 'solid', rotation: 0 };
}

function TokenView({ token, size = 'md' }: { token: Token; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-24 w-24' : size === 'md' ? 'h-10 w-10' : 'h-7 w-7';
  const text = size === 'lg' ? 'text-7xl' : size === 'md' ? 'text-3xl' : 'text-xl';
  return token.kind === 'shape' ? (
    <span className={`block ${dim}`}>
      <GlyphSvg glyph={shapeGlyph(token.shape)} />
    </span>
  ) : (
    <span className={`tabular font-black ${text}`}>{token.n}</span>
  );
}

type Stage_ = 'show' | 'recall' | 'feedback';

function RecallChain({ engine, difficulty }: GameComponentProps) {
  const { startLength, paletteSize, showMs, gapMs } = recallParams(difficulty);
  const schedule = useSchedule(engine);

  const palette = useMemo<Token[]>(() => {
    const all: Token[] = [
      ...SHAPE_TOKENS.map((shape) => ({ kind: 'shape', shape }) as Token),
      ...Array.from({ length: 9 }, (_, i) => ({ kind: 'digit', n: i + 1 }) as Token),
    ];
    // Şekiller ve rakamlar dengeli karışsın.
    const shapes = shuffle(all.filter((t) => t.kind === 'shape'));
    const digits = shuffle(all.filter((t) => t.kind === 'digit'));
    const nShapes = Math.ceil(paletteSize / 2);
    return shuffle([...shapes.slice(0, nShapes), ...digits.slice(0, paletteSize - nShapes)]);
  }, [paletteSize]);

  const [round, setRound] = useState(0);
  const [length, setLength] = useState(startLength);
  const [sequence, setSequence] = useState<Token[]>([]);
  const [stage, setStage] = useState<Stage_>('show');
  const [showing, setShowing] = useState<Token | null>(null);
  const [entered, setEntered] = useState<Token[]>([]);
  const bestLength = useRef(0);

  useEffect(() => {
    const seq: Token[] = [];
    for (let i = 0; i < length; i++) {
      let t = palette[randInt(0, palette.length - 1)];
      // Aynı öğe art arda gelmesin (ayırt edilebilirlik).
      if (i > 0 && sameToken(t, seq[i - 1])) t = palette[(palette.findIndex((p) => sameToken(p, t)) + 1) % palette.length];
      seq.push(t);
    }
    setSequence(seq);
    setEntered([]);
    setStage('show');
    const step = (i: number) => {
      if (i >= seq.length) {
        setShowing(null);
        setStage('recall');
        return;
      }
      setShowing(seq[i]);
      schedule(showMs, () => {
        setShowing(null);
        schedule(gapMs, () => step(i + 1));
      });
    };
    schedule(500, () => step(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  function enter(token: Token) {
    if (stage !== 'recall' || entered.length >= sequence.length) return;
    const next = [...entered, token];
    setEntered(next);
    if (next.length === sequence.length) evaluate(next);
  }

  function undo() {
    if (stage !== 'recall') return;
    setEntered((e) => e.slice(0, -1));
  }

  function evaluate(answer: Token[]) {
    let allOk = true;
    answer.forEach((t, i) => {
      const ok = sameToken(t, sequence[i]);
      if (!ok) allOk = false;
      engine.record({ correct: ok });
    });
    if (allOk) {
      bestLength.current = Math.max(bestLength.current, length);
      engine.setMetadata('longestChain', bestLength.current);
    }
    setStage('feedback');
    schedule(allOk ? 1000 : 1900, () => {
      engine.setRound(round + 1);
      if (round + 1 >= ROUNDS) {
        engine.finish();
        return;
      }
      if (allOk) setLength((l) => l + 1);
      setRound(round + 1);
    });
  }

  useGameKeys(engine, {
    ...Object.fromEntries(
      palette.filter((t) => t.kind === 'digit').map((t) => [String((t as { n: number }).n), () => enter(t)]),
    ),
    backspace: undo,
  });

  const prompt =
    stage === 'show'
      ? `Diziyi izle — ${length} öğe`
      : stage === 'recall'
        ? `Aynı sırayla gir — ${entered.length}/${sequence.length}`
        : entered.every((t, i) => sameToken(t, sequence[i]))
          ? 'Kusursuz! Zincir uzuyor.'
          : 'Doğru sıra altta gösteriliyor';

  return (
    <Stage className="gap-5">
      <Prompt live>{prompt}</Prompt>

      <div className="card flex h-36 w-36 items-center justify-center sm:h-44 sm:w-44" aria-live="off">
        {stage === 'show' && showing && (
          <span key={tokenKey(showing)} className="anim-pop flex items-center justify-center">
            <TokenView token={showing} size="lg" />
          </span>
        )}
        {stage === 'show' && !showing && <span className="text-sm font-semibold text-muted">…</span>}
        {stage !== 'show' && (
          <span className="text-center text-sm font-semibold text-muted">
            {stage === 'recall' ? 'Sıra sende' : 'Sonuç'}
          </span>
        )}
      </div>

      <ol className="flex min-h-14 flex-wrap items-center justify-center gap-2" aria-label="Girilen dizi">
        {sequence.map((_, i) => {
          const t = entered[i];
          const ok = t ? sameToken(t, sequence[i]) : null;
          return (
            <li key={i} className="flex flex-col items-center gap-1">
              <span
                className="play-btn !min-h-0 !min-w-0 h-12 w-12 !rounded-xl"
                data-state={stage === 'feedback' && t ? (ok ? 'correct' : 'wrong') : undefined}
                style={!t ? { borderStyle: 'dashed' } : undefined}
              >
                {t && <TokenView token={t} size="sm" />}
              </span>
              {stage === 'feedback' && t && (
                <span aria-hidden>
                  <Mark ok={!!ok} size={14} />
                </span>
              )}
              {stage === 'feedback' && ok === false && (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-[color:var(--success)]" aria-label={`Doğrusu: ${tokenLabel(sequence[i])}`}>
                  <TokenView token={sequence[i]} size="sm" />
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-2" role="group" aria-label="Semboller">
        {palette.map((t) => (
          <GameButton
            key={tokenKey(t)}
            onAct={() => enter(t)}
            disabled={stage !== 'recall'}
            aria-label={tokenLabel(t)}
            className="play-btn h-16 w-16 p-2 sm:h-[4.5rem] sm:w-[4.5rem]"
          >
            <TokenView token={t} size="md" />
          </GameButton>
        ))}
        <GameButton
          onAct={undo}
          disabled={stage !== 'recall' || entered.length === 0}
          aria-label="Son girişi geri al"
          className="play-btn h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]"
        >
          <Undo2 size={22} aria-hidden />
        </GameButton>
      </div>
    </Stage>
  );
}

const gameModule: GameModule = {
  meta: GAME_META['recall-chain'],
  config: {
    rounds: ROUNDS,
    fastMs: 0,
    slowMs: 0,
    targetAttempts: (d) => ROUNDS * recallParams(d).startLength,
  },
  Component: RecallChain,
  howToPlay: [
    'Semboller ve rakamlar tek tek gösterilir — sırayı aklında tut.',
    'Dizi bitince öğeleri aynı sırayla gir. Yanlış girdiğini Geri Al ile düzeltebilirsin.',
    'Bir turu hatasız bitirirsen zincir bir öğe uzar. Toplam 8 tur; her doğru öğe puan kazandırır.',
  ],
  controls: 'Fare / dokunma. Rakamlar için klavye 1–9, düzeltmek için Backspace.',
};

export default gameModule;
