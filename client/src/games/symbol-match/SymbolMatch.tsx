import { useEffect, useRef, useState } from 'react';
import { GAME_META } from '@shared/constants';
import { randInt } from '@/utils/rng';
import type { GameComponentProps, GameModule } from '../types';
import { GlyphSvg, glyphLabel, makeDistractors, randomGlyph, type Glyph } from '../shared/glyphs';
import { GameButton, useGameKeys } from '../shared/input';
import { Mark, Stage, useSchedule } from '../shared/kit';

export const DURATION_MS = 50_000;

export function optionCount(d: number): number {
  return 3 + Math.floor(d / 25);
}

export interface Trial {
  target: Glyph;
  options: Glyph[];
  answer: number;
}

/** Seçenek sayısı ve benzerlik zorlukla artar. */
export function makeTrial(difficulty: number): Trial {
  const target = randomGlyph();
  const n = optionCount(difficulty);
  const distractors = makeDistractors(target, n - 1, difficulty / 100);
  const answer = randInt(0, n - 1);
  const options = [...distractors];
  options.splice(answer, 0, target);
  return { target, options, answer };
}

function SymbolMatch({ engine, difficulty, colorAssist }: GameComponentProps) {
  const schedule = useSchedule(engine);
  const [trial, setTrial] = useState<Trial | null>(null);
  const [flash, setFlash] = useState<{ index: number; ok: boolean } | null>(null);
  const shownAt = useRef(0);
  const locked = useRef(false);

  function next() {
    locked.current = false;
    setFlash(null);
    setTrial(makeTrial(difficulty));
    shownAt.current = engine.now();
  }

  useEffect(() => {
    next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(i: number) {
    if (!trial || locked.current) return;
    locked.current = true;
    const ok = i === trial.answer;
    engine.record(ok ? { correct: true, rtMs: engine.now() - shownAt.current } : { correct: false });
    setFlash({ index: i, ok });
    schedule(ok ? 160 : 450, next);
  }

  useGameKeys(
    engine,
    Object.fromEntries(Array.from({ length: 7 }, (_, i) => [String(i + 1), () => choose(i)])),
  );

  if (!trial) return <Stage />;

  return (
    <Stage className="gap-8">
      <div className="flex flex-col items-center gap-2">
        <span className="eyebrow">Hedef</span>
        <div className="card flex h-32 w-32 items-center justify-center p-4 sm:h-40 sm:w-40">
          <GlyphSvg glyph={trial.target} colorAssist={colorAssist} label={`Hedef: ${glyphLabel(trial.target)}`} />
        </div>
      </div>
      <div className="flex w-full flex-wrap items-center justify-center gap-3" role="group" aria-label="Seçenekler">
        {trial.options.map((g, i) => {
          const state = flash
            ? flash.index === i
              ? flash.ok
                ? 'correct'
                : 'wrong'
              : !flash.ok && i === trial.answer
                ? 'missed'
                : undefined
            : undefined;
          return (
            <GameButton
              key={i}
              onAct={() => choose(i)}
              data-state={state}
              aria-label={`Seçenek ${i + 1}: ${glyphLabel(g)}`}
              className="play-btn relative h-20 w-20 p-3 sm:h-24 sm:w-24"
            >
              <GlyphSvg glyph={g} colorAssist={colorAssist} />
              <span className="absolute left-1.5 top-1 text-[0.7rem] font-bold text-muted" aria-hidden>
                {i + 1}
              </span>
              {flash?.index === i && (
                <span className="absolute right-1 top-1" aria-hidden>
                  <Mark ok={flash.ok} size={18} />
                </span>
              )}
            </GameButton>
          );
        })}
      </div>
    </Stage>
  );
}

const gameModule: GameModule = {
  meta: GAME_META['symbol-match'],
  config: {
    durationMs: DURATION_MS,
    fastMs: 650,
    slowMs: 2400,
    targetAttempts: (d) => Math.round(40 - d * 0.15),
  },
  Component: SymbolMatch,
  howToPlay: [
    'Üstte bir hedef sembol görürsün.',
    'Aşağıdaki seçeneklerden hedefle birebir aynı olanı (şekil, renk, dolgu ve yön) seç.',
    '50 saniye boyunca olabildiğince çok ve hızlı doğru eşleştirme yap.',
  ],
  controls: 'Fare / dokunma veya 1–7 tuşları (seçeneğin numarası).',
};

export default gameModule;
