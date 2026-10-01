import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { GAME_META } from '@shared/constants';
import type { GameComponentProps, GameModule } from '../types';
import { GameButton, useGameKeys } from '../shared/input';
import { Prompt, Stage, useSchedule } from '../shared/kit';

export const ROUNDS = 25;
const SHOW_MS = 2000; // Her sayı bu kadar gösterilir

/** N değeri zorluğa göre: 1-Back → 2-Back → 3-Back */
function nFromDifficulty(d: number): number {
  if (d <= 30) return 1;
  if (d <= 65) return 2;
  return 3;
}

/** Rastgele tek basamaklı sayı (1-9) */
function rndDigit(): number {
  return 1 + Math.floor(Math.random() * 9);
}

type Phase = 'showing' | 'respond' | 'feedback';

function NumberFlow({ engine, difficulty }: GameComponentProps) {
  const N = nFromDifficulty(difficulty);
  const schedule = useSchedule(engine);

  const [history, setHistory] = useState<number[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('showing');
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState<'ok' | 'wrong' | 'miss' | null>(null);
  const shownAt = useRef(0);
  const responded = useRef(false);
  const historyRef = useRef<number[]>([]);

  function startRound(r: number, hist: number[]) {
    responded.current = false;
    setFeedback(null);
    const digit = rndDigit();
    setCurrent(digit);
    const newHist = [...hist, digit];
    setHistory(newHist);
    historyRef.current = newHist;
    setPhase('showing');
    shownAt.current = engine.now();
    engine.setRound(r);

    schedule(SHOW_MS, () => {
      // Kullanıcı cevap vermemişse → missed (eğer eşleşme varsa)
      const h = historyRef.current;
      const isMatch = h.length > N && h[h.length - 1] === h[h.length - 1 - N];
      if (!responded.current) {
        if (isMatch) {
          engine.record({ correct: false }); // kaçırıldı
          setFeedback('miss');
        }
        // eşleşme yoktu ve dokunmadı → doğru (doğru inaction)
        else {
          engine.record({ correct: true, rtMs: engine.now() - shownAt.current });
        }
      }
      setPhase('feedback');
      schedule(600, () => {
        if (r + 1 >= ROUNDS) {
          engine.finish();
        } else {
          setRound(r + 1);
          startRound(r + 1, historyRef.current);
        }
      });
    });
  }

  useEffect(() => {
    startRound(0, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleMatch() {
    if (responded.current || phase !== 'showing') return;
    responded.current = true;
    const h = historyRef.current;
    const isMatch = h.length > N && h[h.length - 1] === h[h.length - 1 - N];
    const rt = engine.now() - shownAt.current;
    engine.record({ correct: isMatch, rtMs: rt });
    setFeedback(isMatch ? 'ok' : 'wrong');
  }

  useGameKeys(engine, {
    ' ': handleMatch,
    enter: handleMatch,
  });

  const h = historyRef.current;
  const isMatchExpected = h.length > N && h[h.length - 1] === h[h.length - 1 - N];

  return (
    <Stage className="gap-6">
      <Prompt>
        {N}-Back: {N} tur önceki sayıyla aynıysa <strong>Eşleşti</strong>!
      </Prompt>

      {/* Sayı gösterme alanı */}
      <div
        className="card flex h-44 w-44 items-center justify-center rounded-[50%] text-7xl font-black tabular-nums select-none"
        aria-live="polite"
        aria-label={current !== null ? `${current} gösteriliyor` : ''}
        style={{
          background:
            feedback === 'ok'
              ? 'var(--success-soft)'
              : feedback === 'wrong' || feedback === 'miss'
                ? 'var(--danger-soft)'
                : 'var(--surface-2)',
          border: `4px solid ${
            feedback === 'ok'
              ? 'var(--success)'
              : feedback === 'wrong' || feedback === 'miss'
                ? 'var(--danger)'
                : 'var(--border)'
          }`,
          color:
            feedback === 'ok'
              ? 'var(--success)'
              : feedback === 'wrong' || feedback === 'miss'
                ? 'var(--danger)'
                : 'var(--text)',
        }}
      >
        {current ?? '…'}
      </div>

      {/* Feedback */}
      <div className="flex h-8 items-center justify-center" aria-live="assertive">
        {feedback === 'ok' && (
          <span className="flex items-center gap-1 text-lg font-bold" style={{ color: 'var(--success)' }}>
            <Check size={22} strokeWidth={3} /> Doğru eşleşme!
          </span>
        )}
        {feedback === 'wrong' && (
          <span className="flex items-center gap-1 text-lg font-bold" style={{ color: 'var(--danger)' }}>
            <X size={22} strokeWidth={3} /> Eşleşme yoktu
          </span>
        )}
        {feedback === 'miss' && (
          <span className="flex items-center gap-1 text-lg font-bold" style={{ color: 'var(--danger)' }}>
            <X size={22} strokeWidth={3} /> Kaçırdın! ({N} tur önceki de {h[h.length - 1 - N]} idi)
          </span>
        )}
        {!feedback && round < N && (
          <span className="text-muted">Henüz eşleşme mümkün değil — izle…</span>
        )}
        {!feedback && round >= N && (
          <span className="text-muted">
            {N} tur önceki: <strong>{h[h.length - 1 - N]}</strong>
            {isMatchExpected ? ' — Eşleşiyor!' : ''}
          </span>
        )}
      </div>

      {/* Buton */}
      <GameButton
        onAct={handleMatch}
        className="play-btn h-16 w-full max-w-xs rounded-2xl text-lg font-bold"
        style={{
          background: 'var(--accent)',
          borderColor: 'var(--accent)',
          color: 'var(--accent-contrast)',
        }}
        aria-label="Eşleşti — bu sayı N tur öncekiyle aynı"
      >
        Eşleşti!
      </GameButton>

      {/* Tur sayacı */}
      <div className="flex gap-1.5 flex-wrap justify-center max-w-xs">
        {Array.from({ length: ROUNDS }, (_, i) => (
          <div
            key={i}
            className="h-2 w-2 rounded-full"
            style={{ background: i < round ? 'var(--accent)' : 'var(--border)' }}
            aria-hidden
          />
        ))}
      </div>
    </Stage>
  );
}

const gameModule: GameModule = {
  meta: GAME_META['number-flow'],
  config: {
    rounds: ROUNDS,
    fastMs: 400,
    slowMs: 1800,
    targetAttempts: () => ROUNDS,
  },
  Component: NumberFlow,
  howToPlay: [
    `Her turda bir sayı (1-9) gösterilir. Sayıyı aklında tut.`,
    `Eğer şimdiki sayı, N tur önceki sayıyla aynıysa hemen "Eşleşti!" butonuna bas (ya da Boşluk/Enter).`,
    `N değeri zorluğa göre 1, 2 veya 3 olabilir. Eşleşme yoksa bir şey yapma.`,
    `25 tur sürer. Doğru eşleştirmeler ve doğru geçişler puanlanır.`,
  ],
  controls: 'Boşluk / Enter veya ekrandaki Eşleşti! butonu.',
};

export default gameModule;
