import { useEffect, useRef, useState } from 'react';
import { Check, Delete } from 'lucide-react';
import { GAME_META } from '@shared/constants';
import type { GameComponentProps, GameModule } from '../types';
import { GameButton, useGameKeys } from '../shared/input';
import { Stage, useSchedule } from '../shared/kit';
import { makeProblem, type Problem } from './logic';

export const DURATION_MS = 60_000;
const MAX_DIGITS = 5;

function QuickCalc({ engine, difficulty }: GameComponentProps) {
  const schedule = useSchedule(engine);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState<'ok' | 'bad' | null>(null);
  const shownAt = useRef(0);
  const locked = useRef(false);
  const valueRef = useRef('');

  function update(v: string) {
    valueRef.current = v;
    setValue(v);
  }

  function next() {
    locked.current = false;
    setFeedback(null);
    update('');
    setProblem(makeProblem(difficulty));
    shownAt.current = engine.now();
  }

  useEffect(() => {
    next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function digit(d: string) {
    if (locked.current) return;
    const v = valueRef.current;
    update(v.length >= MAX_DIGITS ? v : v === '0' ? d : v + d);
  }

  function backspace() {
    if (locked.current) return;
    update(valueRef.current.slice(0, -1));
  }

  function submit() {
    const v = valueRef.current;
    if (!problem || locked.current || v === '') return;
    locked.current = true;
    const ok = Number(v) === problem.answer;
    engine.record(ok ? { correct: true, rtMs: engine.now() - shownAt.current } : { correct: false });
    setFeedback(ok ? 'ok' : 'bad');
    schedule(ok ? 150 : 900, next);
  }

  useGameKeys(engine, {
    ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i), () => digit(String(i))])),
    backspace,
    enter: submit,
  });

  if (!problem) return <Stage />;

  return (
    <Stage className="gap-6">
      <div className="card flex w-full max-w-md flex-col items-center gap-3 px-6 py-8">
        <p className="tabular text-5xl font-extrabold tracking-tight sm:text-6xl" aria-label={`${problem.text} kaçtır?`}>
          {problem.text}
        </p>
        <div
          className="tabular flex h-16 w-full items-center justify-center rounded-2xl border-2 text-4xl font-extrabold"
          style={{
            borderColor: feedback === 'ok' ? 'var(--success)' : feedback === 'bad' ? 'var(--danger)' : 'var(--border)',
            background: feedback === 'ok' ? 'var(--success-soft)' : feedback === 'bad' ? 'var(--danger-soft)' : 'var(--surface-2)',
          }}
          aria-live="polite"
        >
          {feedback === 'bad' ? (
            <span>
              <span className="text-danger line-through decoration-2">{value}</span> → {problem.answer}
            </span>
          ) : (
            <span>
              {value || <span className="text-muted">?</span>}
              {feedback === 'ok' && <Check className="ml-2 inline text-success" size={30} strokeWidth={3} aria-label="Doğru" />}
            </span>
          )}
        </div>
      </div>

      <div className="grid w-full max-w-xs grid-cols-3 gap-2 sm:gap-3" role="group" aria-label="Sayı tuşları">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <GameButton key={d} noFocus onAct={() => digit(d)} className="play-btn h-14 text-2xl sm:h-16">
            {d}
          </GameButton>
        ))}
        <GameButton noFocus onAct={backspace} className="play-btn h-14 sm:h-16" aria-label="Sil">
          <Delete size={24} aria-hidden />
        </GameButton>
        <GameButton noFocus onAct={() => digit('0')} className="play-btn h-14 text-2xl sm:h-16">
          0
        </GameButton>
        <GameButton
          noFocus
          onAct={submit}
          className="play-btn h-14 sm:h-16"
          aria-label="Cevabı gönder"
          style={{ background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
        >
          <Check size={26} strokeWidth={3} aria-hidden />
        </GameButton>
      </div>
    </Stage>
  );
}

const gameModule: GameModule = {
  meta: GAME_META['quick-calc'],
  config: {
    durationMs: DURATION_MS,
    fastMs: 2500,
    slowMs: 12_000,
    targetAttempts: (d) => Math.round(26 - d * 0.14),
  },
  Component: QuickCalc,
  howToPlay: [
    'Ekrandaki işlemi zihninden çöz ve cevabı yaz.',
    'Enter veya ✓ ile gönder. Yanlış cevapta doğru sonuç kısa süre gösterilir.',
    '60 saniyede olabildiğince çok, doğru ve hızlı çöz. Zorlukla işlemler çarpma-bölmeye ve çok terimliye evrilir.',
  ],
  controls: 'Klavyede rakam tuşları, Backspace ve Enter. Dokunmatikte ekrandaki tuş takımı.',
};

export default gameModule;
