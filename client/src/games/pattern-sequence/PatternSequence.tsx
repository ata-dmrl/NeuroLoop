import { useEffect, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { GAME_META } from '@shared/constants';
import type { GameComponentProps, GameModule } from '../types';
import { GlyphSvg, glyphLabel } from '../shared/glyphs';
import { GameButton, useGameKeys } from '../shared/input';
import { Mark, Prompt, Stage, useSchedule } from '../shared/kit';
import { makeQuestion, type Item, type Question } from './logic';

export const ROUNDS = 10;

function ItemView({ item, colorAssist, big = false }: { item: Item; colorAssist: boolean; big?: boolean }) {
  if (item.kind === 'number') {
    return <span className={`tabular font-extrabold ${big ? 'text-3xl' : 'text-2xl sm:text-3xl'}`}>{item.value}</span>;
  }
  return <GlyphSvg glyph={item.glyph} colorAssist={colorAssist} />;
}

function itemLabel(item: Item): string {
  return item.kind === 'number' ? String(item.value) : glyphLabel(item.glyph);
}

function PatternSequence({ engine, difficulty, colorAssist }: GameComponentProps) {
  const schedule = useSchedule(engine);
  const [round, setRound] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const shownAt = useRef(0);

  useEffect(() => {
    setChosen(null);
    setQuestion(makeQuestion(difficulty));
    shownAt.current = engine.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  function choose(i: number) {
    if (!question || chosen !== null) return;
    setChosen(i);
    const ok = i === question.answerIndex;
    engine.record(ok ? { correct: true, rtMs: engine.now() - shownAt.current } : { correct: false });
    schedule(ok ? 550 : 1600, () => {
      engine.setRound(round + 1);
      if (round + 1 >= ROUNDS) engine.finish();
      else setRound(round + 1);
    });
  }

  useGameKeys(
    engine,
    Object.fromEntries(Array.from({ length: 4 }, (_, i) => [String(i + 1), () => choose(i)])),
  );

  if (!question) return <Stage />;
  const answered = chosen !== null;
  const correct = chosen === question.answerIndex;

  return (
    <Stage className="gap-7">
      <Prompt live>{answered ? (correct ? 'Doğru!' : `Yanlış — ${question.explanation}`) : 'Sıradaki hangisi?'}</Prompt>

      <ol
        className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
        aria-label={`Dizi: ${question.items.map(itemLabel).join(', ')}, ardından bilinmeyen`}
      >
        {question.items.map((it, i) => (
          <li key={i} className="card flex h-14 w-14 items-center justify-center p-2 sm:h-[4.5rem] sm:w-[4.5rem]">
            <ItemView item={it} colorAssist={colorAssist} />
          </li>
        ))}
        <li
          className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-accent text-accent sm:h-[4.5rem] sm:w-[4.5rem]"
          aria-label="Bilinmeyen"
        >
          <HelpCircle size={30} aria-hidden />
        </li>
      </ol>

      <div className="grid w-full max-w-md grid-cols-2 gap-3" role="group" aria-label="Seçenekler">
        {question.options.map((opt, i) => {
          const state = !answered ? undefined : i === chosen ? (correct ? 'correct' : 'wrong') : i === question.answerIndex ? 'missed' : undefined;
          return (
            <GameButton
              key={i}
              onAct={() => choose(i)}
              disabled={answered}
              data-state={state}
              aria-label={`Seçenek ${i + 1}: ${itemLabel(opt)}`}
              className="play-btn relative h-20 p-3 sm:h-24"
            >
              <span className="flex h-full max-h-14 items-center justify-center sm:max-h-16">
                <ItemView item={opt} colorAssist={colorAssist} big />
              </span>
              <span className="absolute left-2 top-1 text-[0.7rem] font-bold text-muted" aria-hidden>
                {i + 1}
              </span>
              {i === chosen && (
                <span className="absolute right-2 top-1" aria-hidden>
                  <Mark ok={correct} size={18} />
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
  meta: GAME_META['pattern-sequence'],
  config: {
    rounds: ROUNDS,
    fastMs: 3000,
    slowMs: 15_000,
    targetAttempts: () => ROUNDS,
  },
  Component: PatternSequence,
  howToPlay: [
    'Bir sayı ya da şekil dizisi görürsün; sonunda bir soru işareti var.',
    'Dizideki gizli kuralı bul ve eksik elemanı dört seçenekten seç.',
    '10 soru sürer. Zorlukla birlikte kurallar (toplama, çarpma, iç içe diziler, çift nitelikli desenler) karmaşıklaşır.',
  ],
  controls: 'Fare / dokunma veya 1–4 tuşları.',
};

export default gameModule;
