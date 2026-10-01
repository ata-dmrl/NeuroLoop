import { useEffect, useRef, useState } from 'react';
import { GAME_META } from '@shared/constants';
import type { GameComponentProps, GameModule } from '../types';
import { GameButton } from '../shared/input';
import { Prompt, Stage, useSchedule } from '../shared/kit';

export const DURATION_MS = 60_000;

/** Renk adı → CSS renk değeri eşlemesi */
const COLOR_MAP: Record<string, string> = {
  Kırmızı: '#ef4444',
  Mavi: '#3b82f6',
  Yeşil: '#22c55e',
  Sarı: '#eab308',
  Mor: '#a855f7',
  Turuncu: '#f97316',
};

const COLOR_NAMES = Object.keys(COLOR_MAP);

function pickRandom<T>(arr: T[], exclude?: T): T {
  const pool = exclude !== undefined ? arr.filter((x) => x !== exclude) : arr;
  return pool[Math.floor(Math.random() * pool.length)];
}

interface Puzzle {
  word: string;      // Yazılan kelime (anlam)
  inkColor: string;  // Mürekkep rengi (doğru cevap)
}

function makePuzzle(difficulty: number): Puzzle {
  const inkColor = pickRandom(COLOR_NAMES);
  // Zorluk arttıkça yanıltıcı olma ihtimali artıyor
  const confuseChance = 0.4 + difficulty * 0.005;
  const word = Math.random() < confuseChance ? pickRandom(COLOR_NAMES, inkColor) : inkColor;
  return { word, inkColor };
}

function ColorClash({ engine, difficulty }: GameComponentProps) {
  const schedule = useSchedule(engine);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null); // renk adı ya da 'wrong'
  const shownAt = useRef(0);
  const locked = useRef(false);

  function next() {
    locked.current = false;
    setFeedback(null);
    setPuzzle(makePuzzle(difficulty));
    shownAt.current = engine.now();
  }

  useEffect(() => {
    next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(colorName: string) {
    if (!puzzle || locked.current) return;
    locked.current = true;
    const ok = colorName === puzzle.inkColor;
    engine.record({ correct: ok, rtMs: engine.now() - shownAt.current });
    setFeedback(ok ? 'ok' : 'wrong');
    schedule(ok ? 250 : 900, next);
  }

  return (
    <Stage className="gap-8">
      <Prompt>Kelimenin yazıldığı <strong>rengi</strong> seç — anlamını değil!</Prompt>

      {/* Ana kelime gösterimi */}
      <div
        className="card flex h-36 w-full max-w-sm items-center justify-center rounded-3xl text-5xl font-black tracking-tight select-none"
        aria-live="polite"
        aria-label={puzzle ? `${puzzle.word} kelimesi gösteriliyor` : ''}
        style={{ color: puzzle ? COLOR_MAP[puzzle.inkColor] : 'var(--text)' }}
      >
        {puzzle?.word ?? '…'}
      </div>

      {/* Geri bildirim mesajı */}
      {feedback && (
        <p
          className="text-lg font-bold"
          style={{ color: feedback === 'ok' ? 'var(--success)' : 'var(--danger)' }}
          aria-live="assertive"
        >
          {feedback === 'ok' ? '✓ Doğru!' : `✗ Yanlış — doğrusu: ${puzzle?.inkColor}`}
        </p>
      )}

      {/* Renk seçenekleri */}
      <div className="grid w-full max-w-sm grid-cols-3 gap-3" role="group" aria-label="Renk seçenekleri">
        {COLOR_NAMES.map((name) => (
          <GameButton
            key={name}
            onAct={() => pick(name)}
            className="play-btn h-14 rounded-2xl text-base font-bold text-white transition-transform active:scale-95"
            style={{ background: COLOR_MAP[name], borderColor: COLOR_MAP[name] }}
            aria-label={name}
            disabled={locked.current}
          >
            {name}
          </GameButton>
        ))}
      </div>
    </Stage>
  );
}

const gameModule: GameModule = {
  meta: GAME_META['color-clash'],
  config: {
    durationMs: DURATION_MS,
    fastMs: 800,
    slowMs: 3000,
    targetAttempts: (d) => Math.round(30 - d * 0.1),
  },
  Component: ColorClash,
  howToPlay: [
    'Ekranda bir renk adı göreceksin — ama farklı bir renkle yazılmış olabilir.',
    'Dikkat: kelimenin ANLAMINI değil, mürekkebinin (yazı) rengini seç.',
    '60 saniyede olabildiğince hızlı ve doğru cevapla. Zorlukla yanıltıcılık artar.',
  ],
  controls: 'Fare veya dokunma ile renklerden birini seç.',
};

export default gameModule;
