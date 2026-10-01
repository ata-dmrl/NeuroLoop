import { useEffect, useRef, useState } from 'react';
import { GAME_META } from '@shared/constants';
import { pick, randInt, scaleByDifficulty } from '@/utils/rng';
import type { GameComponentProps, GameModule } from '../types';
import { GlyphSvg, glyphKey, type ColorName, type Glyph, type ShapeName } from '../shared/glyphs';
import { GameButton, useGameKeys } from '../shared/input';
import { Mark, Stage, useSchedule } from '../shared/kit';

export const DURATION_MS = 60_000;

type Stream = 'left' | 'right';

const TARGET_GLYPH: Glyph = { shape: 'triangle', color: 'red', fill: 'solid', rotation: 0 };
const LEFT_SHAPES: ShapeName[] = ['circle', 'square', 'triangle'];
const LEFT_COLORS: ColorName[] = ['red', 'blue', 'green'];

export function dualParams(d: number) {
  const interval = Math.round(scaleByDifficulty(d, 2600, 1150));
  return { interval, windowMs: Math.round(interval * scaleByDifficulty(d, 0.85, 0.65)) };
}

interface Stim {
  id: number;
  stream: Stream;
  target: boolean;
  glyph?: Glyph;
  number?: number;
  shownAt: number;
  responded: boolean;
}

function makeStim(stream: Stream, id: number, shownAt: number): Stim {
  if (stream === 'left') {
    const target = Math.random() < 0.35;
    let glyph = TARGET_GLYPH;
    if (!target) {
      do {
        glyph = { shape: pick(LEFT_SHAPES), color: pick(LEFT_COLORS), fill: 'solid', rotation: 0 };
      } while (glyphKey(glyph) === glyphKey(TARGET_GLYPH));
    }
    return { id, stream, target, glyph, shownAt, responded: false };
  }
  const even = Math.random() < 0.4;
  const number = even ? pick([2, 4, 6, 8]) : pick([1, 3, 5, 7, 9]);
  return { id, stream, target: even, number, shownAt, responded: false };
}

function DualTask({ engine, difficulty, colorAssist }: GameComponentProps) {
  const { interval, windowMs } = dualParams(difficulty);
  const schedule = useSchedule(engine);

  const [view, setView] = useState<{ left: Stim | null; right: Stim | null }>({ left: null, right: null });
  const [marks, setMarks] = useState<{ left: { ok: boolean; id: number } | null; right: { ok: boolean; id: number } | null }>({ left: null, right: null });

  const cur = useRef<{ left: Stim | null; right: Stim | null }>({ left: null, right: null });
  const lastExpiry = useRef({ left: -1000, right: -1000 });
  const counter = useRef(0);
  const counts = useRef({ hits: 0, misses: 0, falseAlarms: 0 });

  function syncMeta() {
    engine.setMetadata('hits', counts.current.hits);
    engine.setMetadata('misses', counts.current.misses);
    engine.setMetadata('falseAlarms', counts.current.falseAlarms);
  }

  function showMark(stream: Stream, ok: boolean) {
    const id = ++counter.current;
    setMarks((m) => ({ ...m, [stream]: { ok, id } }));
    schedule(450, () => setMarks((m) => (m[stream]?.id === id ? { ...m, [stream]: null } : m)));
  }

  function expire(stream: Stream, id: number) {
    const s = cur.current[stream];
    if (!s || s.id !== id) return;
    if (s.target && !s.responded) {
      engine.record({ correct: false });
      counts.current.misses += 1;
      syncMeta();
      showMark(stream, false);
    }
    lastExpiry.current[stream] = engine.now();
    cur.current[stream] = null;
    setView((v) => ({ ...v, [stream]: null }));
  }

  function spawn(stream: Stream) {
    const stim = makeStim(stream, ++counter.current, engine.now());
    cur.current[stream] = stim;
    setView((v) => ({ ...v, [stream]: stim }));
    schedule(windowMs, () => expire(stream, stim.id));
    schedule(Math.round(interval * (0.85 + Math.random() * 0.3)), () => spawn(stream));
  }

  useEffect(() => {
    schedule(500, () => spawn('left'));
    schedule(500 + Math.round(randInt(35, 65) / 100 * interval), () => spawn('right'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function respond(stream: Stream) {
    const s = cur.current[stream];
    if (s) {
      if (s.responded) return;
      s.responded = true;
      if (s.target) {
        engine.record({ correct: true, rtMs: engine.now() - s.shownAt });
        counts.current.hits += 1;
        showMark(stream, true);
      } else {
        engine.record({ correct: false });
        counts.current.falseAlarms += 1;
        showMark(stream, false);
      }
      syncMeta();
      setView((v) => ({ ...v, [stream]: { ...s } }));
      return;
    }
    // Uyaran yeni kaybolduysa geç kalınmış basışı cezalandırma.
    if (engine.now() - lastExpiry.current[stream] < 250) return;
    engine.record({ correct: false });
    counts.current.falseAlarms += 1;
    syncMeta();
    showMark(stream, false);
  }

  useGameKeys(engine, { ' ': () => respond('left'), enter: () => respond('right') });

  return (
    <Stage className="gap-4">
      <div className="grid w-full max-w-xl grid-cols-2 gap-3 sm:gap-5">
        <Panel
          title="Sol akış"
          rule={
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-5 w-5">
                <GlyphSvg glyph={TARGET_GLYPH} colorAssist={colorAssist} />
              </span>
              kırmızı üçgen
            </span>
          }
          stim={view.left}
          mark={marks.left}
          buttonLabel="Kırmızı üçgen!"
          keyHint="Boşluk"
          onAct={() => respond('left')}
          colorAssist={colorAssist}
        />
        <Panel
          title="Sağ akış"
          rule="çift sayı"
          stim={view.right}
          mark={marks.right}
          buttonLabel="Çift sayı!"
          keyHint="Enter"
          onAct={() => respond('right')}
          colorAssist={colorAssist}
        />
      </div>
    </Stage>
  );
}

function Panel(props: {
  title: string;
  rule: React.ReactNode;
  stim: Stim | null;
  mark: { ok: boolean; id: number } | null;
  buttonLabel: string;
  keyHint: string;
  onAct: () => void;
  colorAssist: boolean;
}) {
  const { stim, mark } = props;
  return (
    <section className="flex flex-col gap-3" aria-label={props.title}>
      <div className="card flex h-44 flex-col items-center justify-between p-3 sm:h-56">
        <span className="chip">{props.rule}</span>
        <div className="relative flex flex-1 items-center justify-center" aria-live="off">
          {stim && (
            <div key={stim.id} className="anim-pop flex h-20 w-20 items-center justify-center sm:h-28 sm:w-28">
              {stim.glyph ? (
                <GlyphSvg glyph={stim.glyph} colorAssist={props.colorAssist} />
              ) : (
                <span className="tabular text-6xl font-black sm:text-7xl">{stim.number}</span>
              )}
            </div>
          )}
          {mark && (
            <span key={mark.id} className="anim-pop absolute right-0 top-0" aria-hidden>
              <Mark ok={mark.ok} size={28} />
            </span>
          )}
        </div>
      </div>
      <GameButton
        noFocus
        onAct={props.onAct}
        className="play-btn flex-col gap-0.5 px-2 py-2 text-base sm:text-lg"
        aria-label={`${props.buttonLabel} (${props.keyHint})`}
      >
        <span>{props.buttonLabel}</span>
        <span className="text-xs font-semibold text-muted">{props.keyHint}</span>
      </GameButton>
    </section>
  );
}

const gameModule: GameModule = {
  meta: GAME_META['dual-task'],
  config: {
    durationMs: DURATION_MS,
    fastMs: 550,
    slowMs: 1700,
    targetAttempts: (d) => Math.round(14 + d * 0.12),
  },
  Component: DualTask,
  howToPlay: [
    'İki bağımsız akışı aynı anda izlersin: solda şekiller, sağda sayılar.',
    'Solda KIRMIZI ÜÇGEN çıkınca BOŞLUK, sağda ÇİFT SAYI çıkınca ENTER’a bas.',
    'Hedef olmayanlara basma. Kaçırılan hedef ve yanlış basış hata sayılır. Zorlukla akışlar hızlanır.',
  ],
  controls: 'Boşluk (sol akış) ve Enter (sağ akış). Dokunmatikte ilgili panelin altındaki düğmeler.',
};

export default gameModule;
