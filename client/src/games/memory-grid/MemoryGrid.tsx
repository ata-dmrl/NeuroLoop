import { useEffect, useState } from 'react';
import { Check, Circle, X } from 'lucide-react';
import { GAME_META } from '@shared/constants';
import { sample } from '@/utils/rng';
import type { GameComponentProps, GameModule } from '../types';
import { GameButton } from '../shared/input';
import { Prompt, Stage, useSchedule } from '../shared/kit';

export const ROUNDS = 8;

export function gridParams(difficulty: number) {
  const cells = 3 + Math.floor(difficulty / 12);
  const size = cells <= 4 ? 3 : cells <= 8 ? 4 : 5;
  return { cells, size, showMs: 900 + cells * 130 };
}

type Phase = 'show' | 'recall' | 'feedback';

function MemoryGrid({ engine, difficulty }: GameComponentProps) {
  const { cells, size, showMs } = gridParams(difficulty);
  const total = size * size;
  const schedule = useSchedule(engine);

  const [round, setRound] = useState(0);
  const [pattern, setPattern] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('show');
  const [picked, setPicked] = useState<Record<number, boolean>>({});

  // Yeni tur: deseni üret, göster, sonra hatırlama aşamasına geç.
  useEffect(() => {
    setPattern(sample(Array.from({ length: total }, (_, i) => i), cells));
    setPicked({});
    setPhase('show');
    schedule(showMs, () => setPhase('recall'));
  }, [round, total, cells, showMs, schedule]);

  const pickedCount = Object.keys(picked).length;

  function tap(i: number) {
    if (phase !== 'recall' || picked[i] !== undefined) return;
    const correct = pattern.includes(i);
    engine.record({ correct });
    const next = { ...picked, [i]: correct };
    setPicked(next);
    if (Object.keys(next).length >= cells) {
      setPhase('feedback');
      schedule(1100, () => {
        engine.setRound(round + 1);
        if (round + 1 >= ROUNDS) engine.finish();
        else setRound(round + 1);
      });
    }
  }

  const prompt =
    phase === 'show'
      ? 'Parlayan hücreleri ezberle'
      : phase === 'recall'
        ? `Parlayan hücreleri işaretle — ${cells - pickedCount} kaldı`
        : Object.values(picked).every(Boolean)
          ? 'Kusursuz!'
          : 'Kaçırılanlar kesik çizgiyle gösterildi';

  return (
    <Stage>
      <Prompt live>{prompt}</Prompt>
      <div
        className="grid w-full max-w-[26rem] gap-2 sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Hafıza ızgarası"
      >
        {Array.from({ length: total }, (_, i) => {
          const isPattern = pattern.includes(i);
          const lit = phase === 'show' && isPattern;
          const pickState = picked[i];
          const missed = phase === 'feedback' && isPattern && pickState === undefined;
          const state = pickState === undefined ? (missed ? 'missed' : undefined) : pickState ? 'correct' : 'wrong';
          const label = `Satır ${Math.floor(i / size) + 1}, sütun ${(i % size) + 1}${lit ? ', parlıyor' : ''}${
            state === 'correct' ? ', doğru' : state === 'wrong' ? ', yanlış' : state === 'missed' ? ', kaçırıldı' : ''
          }`;
          return (
            <GameButton
              key={i}
              onAct={() => tap(i)}
              aria-label={label}
              data-state={state}
              disabled={phase !== 'recall'}
              className="play-btn aspect-square !min-h-0 !min-w-0 !rounded-2xl"
              style={lit ? { background: 'var(--accent)', borderColor: 'var(--accent)', boxShadow: '0 0 24px var(--accent)' } : undefined}
            >
              {state === 'correct' && <Check size={26} strokeWidth={3} aria-hidden style={{ color: 'var(--success)' }} />}
              {state === 'wrong' && <X size={26} strokeWidth={3} aria-hidden style={{ color: 'var(--danger)' }} />}
              {state === 'missed' && <Circle size={18} strokeWidth={3} aria-hidden style={{ color: 'var(--success)' }} />}
            </GameButton>
          );
        })}
      </div>
    </Stage>
  );
}

const gameModule: GameModule = {
  meta: GAME_META['memory-grid'],
  config: {
    rounds: ROUNDS,
    fastMs: 0,
    slowMs: 0,
    targetAttempts: (d) => ROUNDS * gridParams(d).cells,
  },
  Component: MemoryGrid,
  howToPlay: [
    'Izgarada bazı hücreler kısa süre parlar — konumlarını aklında tut.',
    'Işıklar sönünce parlayan hücrelere dokun. Her turda aynı sayıda hücre seçersin.',
    '8 tur sürer; zorluk arttıkça ızgara büyür ve daha fazla hücre parlar.',
  ],
  controls: 'Fare / dokunma. Klavyede Tab ile gez, Enter veya Boşluk ile seç.',
};

export default gameModule;
