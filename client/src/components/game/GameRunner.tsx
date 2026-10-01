import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Keyboard, Pause, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { GameEngine } from '@/engine/GameEngine';
import { useEngine } from '@/engine/useEngine';
import { GAME_ICONS } from '@/components/ui/icons';
import { CategoryChip, IconTile, LevelProgress } from '@/components/ui/primitives';
import { getTier, type GameModule } from '@/games/types';
import { useAppStore, useGameProgress } from '@/store/useAppStore';
import type { GameId } from '@shared/types';
import { ResultScreen } from './ResultScreen';

export interface DailyInfo {
  index: number;
  total: number;
  /** Bu oyundan sonra oynanacak günlük oyun (yoksa null). */
  next: GameId | null;
}

interface RunnerProps {
  gameModule: GameModule;
  daily: DailyInfo | null;
  onExit: () => void;
  onNextDaily: (next: GameId) => void;
  onFinishDaily: () => void;
}

/** Oyunu yeniden başlatmak için oturumu yeni bir anahtarla yeniden kurar. */
export function GameRunner(props: RunnerProps) {
  const [runKey, setRunKey] = useState(0);
  return <GameSession key={runKey} {...props} onReplay={() => setRunKey((k) => k + 1)} />;
}

function GameSession({ gameModule, daily, onExit, onNextDaily, onFinishDaily, onReplay }: RunnerProps & { onReplay: () => void }) {
  const { meta, config } = gameModule;
  const progress = useGameProgress(meta.id);
  const settings = useAppStore((s) => s.settings);
  const recordSession = useAppStore((s) => s.recordSession);

  const [engine] = useState(
    () =>
      new GameEngine({
        meta,
        difficulty: progress.difficulty,
        durationMs: config.durationMs,
        rounds: config.rounds,
        adaptive: { failStreak: progress.failStreak, lastSpeedScore: progress.lastSpeedScore },
        sound: settings.sound,
        scoring: {
          measuresReaction: meta.measuresReaction,
          fastMs: config.fastMs,
          slowMs: config.slowMs,
          targetAttempts: config.targetAttempts(progress.difficulty),
        },
      }),
  );

  const phase = useEngine(engine, (s) => s.phase);
  const paused = useEngine(engine, (s) => s.paused);
  const recorded = useRef(false);

  useEffect(() => {
    engine.prepare();
    return () => engine.dispose();
  }, [engine]);

  // Sekme gizlenince otomatik duraklat.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) engine.pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [engine]);

  // Esc / P → duraklat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const snap = engine.getSnapshot();
      if (snap.phase !== 'playing' || snap.paused || e.repeat) return;
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        engine.pause();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine]);

  // RESULT → kaydet → SUMMARY
  useEffect(() => {
    if (phase === 'result' && !recorded.current) {
      recorded.current = true;
      const result = engine.lastResult;
      if (result) engine.setSummary(recordSession(result, { daily: daily !== null }));
    }
  }, [phase, engine, recordSession, daily]);

  useEffect(() => {
    document.title = `${meta.name} — NeuroLoop`;
  }, [meta.name]);

  if (phase === 'summary' && engine.summary) {
    return (
      <ResultScreen
        summary={engine.summary}
        gameModule={gameModule}
        daily={daily}
        onReplay={onReplay}
        onExit={onExit}
        onNextDaily={onNextDaily}
        onFinishDaily={onFinishDaily}
      />
    );
  }

  if (phase === 'idle' || phase === 'ready') {
    return <ReadyScreen gameModule={gameModule} difficulty={progress.difficulty} daily={daily} onStart={() => engine.start()} onExit={onExit} />;
  }

  if (phase === 'countdown') return <Countdown engine={engine} />;

  if (phase === 'playing') {
    const Game = gameModule.Component;
    return (
      <div className="flex min-h-dvh flex-col">
        <Hud engine={engine} name={meta.name} difficulty={engine.difficulty} onPause={() => engine.pause()} />
        <main id="content" className="flex flex-1 flex-col px-4 pb-8 pt-4 sm:px-8">
          <Game engine={engine} difficulty={engine.difficulty} colorAssist={settings.colorAssist} />
        </main>
        {paused && (
          <PauseDialog
            onResume={() => engine.resume()}
            onRestart={onReplay}
            onExit={onExit}
          />
        )}
      </div>
    );
  }

  return <div className="flex min-h-dvh items-center justify-center text-muted">Sonuç kaydediliyor…</div>;
}

// ------------------------------------------------------------------------------------------------

function Hud({ engine, name, difficulty, onPause }: { engine: GameEngine; name: string; difficulty: number; onPause: () => void }) {
  const score = useEngine(engine, (s) => s.score);
  const progress = useEngine(engine, (s) => Math.round(s.progress * 100));
  const remaining = useEngine(engine, (s) => (s.remainingMs === null ? -1 : Math.ceil(s.remainingMs / 1000)));
  const round = useEngine(engine, (s) => s.round);
  const timed = remaining >= 0;
  const tier = getTier(difficulty);

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur sm:px-8">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <button type="button" className="btn btn-sm !px-3" onClick={onPause} aria-label="Duraklat (Esc)">
          <Pause size={18} aria-hidden />
        </button>
        <p className="hidden truncate text-sm font-bold text-muted sm:block">{name}</p>
        {/* Level badge — oyun sırasında da seviye görünür */}
        <span
          className="hidden items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold sm:inline-flex"
          style={{ background: tier.bgColor, color: tier.color }}
          aria-label={`Seviye: ${tier.label}`}
        >
          <span aria-hidden>{tier.emoji}</span>
          {tier.label}
        </span>
        <div className="ml-auto flex items-center gap-5">
          <p className="text-right leading-tight">
            <span className="eyebrow block">Skor</span>
            <span className="tabular text-xl font-extrabold">{score}</span>
          </p>
          <p className="text-right leading-tight" aria-live="off">
            <span className="eyebrow block">{timed ? 'Süre' : 'Tur'}</span>
            <span className="tabular text-xl font-extrabold">
              {timed ? `0:${String(remaining).padStart(2, '0')}` : `${Math.min(round + 1, engine.rounds)}/${engine.rounds}`}
            </span>
          </p>
        </div>
      </div>
      <div className="mx-auto mt-2 max-w-2xl">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label="İlerleme"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-linear" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </header>
  );
}

function PauseDialog({ onResume, onRestart, onExit }: { onResume: () => void; onRestart: () => void; onExit: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="pause-title"
      onCancel={(e) => {
        e.preventDefault();
        onResume();
      }}
      className="card m-auto w-[min(92vw,26rem)] p-7 text-[color:var(--text)]"
    >
      <h2 id="pause-title" className="mb-1 text-2xl font-extrabold">
        Duraklatıldı
      </h2>
      <p className="mb-6 text-sm text-muted">Zamanlayıcı durdu. Hazır olunca devam et.</p>
      <div className="flex flex-col gap-3">
        <button type="button" className="btn btn-primary btn-lg" onClick={onResume} autoFocus>
          <Play size={20} aria-hidden /> Devam et
        </button>
        <button type="button" className="btn" onClick={onRestart}>
          Baştan başla
        </button>
        <button type="button" className="btn btn-danger" onClick={onExit}>
          Oyundan çık (kaydedilmez)
        </button>
      </div>
    </dialog>
  );
}

function Countdown({ engine }: { engine: GameEngine }) {
  const n = useEngine(engine, (s) => s.countdown);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4" role="status" aria-live="assertive">
      <p className="eyebrow">Hazırlan</p>
      <motion.p
        key={n}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="tabular text-[8rem] font-black leading-none text-accent"
      >
        {n}
      </motion.p>
    </div>
  );
}

function ReadyScreen({
  gameModule,
  difficulty,
  daily,
  onStart,
  onExit,
}: {
  gameModule: GameModule;
  difficulty: number;
  daily: DailyInfo | null;
  onStart: () => void;
  onExit: () => void;
}) {
  const { meta } = gameModule;
  const Icon = GAME_ICONS[meta.id];
  const tier = getTier(difficulty);
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6 sm:px-8">
      <div>
        <button type="button" className="btn btn-sm" onClick={onExit}>
          <ArrowLeft size={16} aria-hidden /> {daily ? 'Günlük antrenman' : 'Oyunlar'}
        </button>
      </div>
      <main id="content" className="flex flex-1 flex-col justify-center gap-6 py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <IconTile category={meta.category} size={64}>
              <Icon size={30} />
            </IconTile>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <CategoryChip category={meta.category} />
                {daily && <span className="chip">Günlük antrenman · {daily.index + 1}/{daily.total}</span>}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">{meta.name}</h1>
              <p className="text-muted">{meta.tagline}</p>
            </div>
          </div>

          <div>
            <h2 className="eyebrow mb-2">Nasıl oynanır</h2>
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-[0.95rem] marker:font-bold marker:text-accent">
              {gameModule.howToPlay.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="card-flat flex items-center gap-3 px-4 py-3 text-sm">
            <Keyboard size={18} className="shrink-0 text-muted" aria-hidden />
            <span>{gameModule.controls}</span>
          </div>

          {/* ---- Seviye göstergesi ---- */}
          <div
            className="rounded-2xl p-4"
            style={{ background: tier.bgColor, border: `1.5px solid ${tier.color}44` }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold" style={{ color: tier.color }}>SENİN SEVİYEN</p>
                <p className="mt-0.5 text-2xl font-black" style={{ color: tier.color }}>
                  {tier.emoji} {tier.label}
                  <span className="ml-2 text-base font-semibold opacity-70">{tier.sublabel}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="tabular text-3xl font-black" style={{ color: tier.color }}>{difficulty}</p>
                <p className="text-xs opacity-70" style={{ color: tier.color }}>/ 100</p>
              </div>
            </div>
            <LevelProgress difficulty={difficulty} showLabels />
            <p className="mt-2 text-xs" style={{ color: tier.color, opacity: 0.75 }}>
              {tier.rank < 4
                ? `Sonraki seviye: ${['Başlangıç ⚡', 'Orta 🔥', 'İleri 💎', 'Uzman 👑'][tier.rank]} (${tier.range[1] + 1} puan)`
                : 'En yüksek seviyedesin! 🎉'}
            </p>
          </div>

          <button type="button" className="btn btn-primary btn-lg w-full" onClick={onStart} autoFocus>
            <Play size={22} aria-hidden /> Başla
          </button>
        </motion.div>
      </main>
    </div>
  );
}
