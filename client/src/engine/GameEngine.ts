import type { GameMeta, GameResult, SessionSummary } from '@shared/types';
import { adjustDifficulty } from './adaptive';
import { calculateScore, computeBreakdown, mean, type AttemptStats, type ScoringConfig } from './scoring';
import { sfx } from '@/utils/sfx';

/** IDLE → READY → COUNTDOWN → PLAYING → RESULT → SUMMARY */
export type GamePhase = 'idle' | 'ready' | 'countdown' | 'playing' | 'result' | 'summary';

export interface EngineOptions {
  meta: GameMeta;
  difficulty: number;
  scoring: ScoringConfig;
  /** Süre sınırlı oyunlarda toplam süre; dolunca oyun otomatik biter. */
  durationMs?: number;
  /** Tur tabanlı oyunlarda toplam tur sayısı (ilerleme çubuğu için). */
  rounds?: number;
  adaptive?: { failStreak: number; lastSpeedScore: number | null };
  sound?: boolean;
}

export interface EngineSnapshot {
  phase: GamePhase;
  paused: boolean;
  countdown: number;
  elapsedMs: number;
  remainingMs: number | null;
  /** 0-1 */
  progress: number;
  attempts: number;
  correct: number;
  wrong: number;
  combo: number;
  score: number;
  round: number;
  rounds: number;
}

export interface Attempt {
  correct: boolean;
  /** Uyaran gösterildikten sonra geçen süre (ms) — yalnızca tepki ölçen oyunlarda. */
  rtMs?: number;
}

interface Task {
  dueAt: number;
  fn: () => void;
}

const COUNTDOWN_STEP_MS = 800;
const COUNTDOWN_FROM = 3;
const TICK_MS = 40;
const MAX_REASONABLE_RT = 20000;

/**
 * Çerçeveden bağımsız oyun motoru: yaşam döngüsü, duraklatılabilir zamanlayıcı,
 * duraklamaya duyarlı zamanlama (`after`), deneme kaydı ve skor hesabı.
 * Oyun bileşenleri yalnızca `record`, `after`, `now`, `setRound` ve `finish` çağırır.
 */
export class GameEngine {
  readonly meta: GameMeta;
  readonly difficulty: number;
  readonly durationMs?: number;
  readonly rounds: number;

  private readonly scoring: ScoringConfig;
  private readonly adaptive: { failStreak: number; lastSpeedScore: number | null };
  private readonly sound: boolean;

  private phase: GamePhase = 'idle';
  private paused = false;
  private countdown = 0;
  private stats: AttemptStats = { attempts: 0, correct: 0, wrong: 0, reactionTimes: [] };
  private combo = 0;
  private bestCombo = 0;
  private round = 0;
  private metadata: Record<string, number | string> = {};
  private elapsedBase = 0;
  private resumedAt = 0;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private countdownTimer: ReturnType<typeof setTimeout> | null = null;
  private tasks: Task[] = [];
  private listeners = new Set<() => void>();
  private snap!: EngineSnapshot;
  private result: GameResult | null = null;
  private _summary: SessionSummary | null = null;

  constructor(opts: EngineOptions) {
    this.meta = opts.meta;
    this.difficulty = opts.difficulty;
    this.scoring = opts.scoring;
    this.durationMs = opts.durationMs;
    this.rounds = opts.rounds ?? 0;
    this.adaptive = opts.adaptive ?? { failStreak: 0, lastSpeedScore: null };
    this.sound = opts.sound ?? false;
    this.snap = this.computeSnapshot();
  }

  // ---- React entegrasyonu (useSyncExternalStore) ----------------------------------------------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): EngineSnapshot => this.snap;

  get summary(): SessionSummary | null {
    return this._summary;
  }

  get lastResult(): GameResult | null {
    return this.result;
  }

  private emit() {
    this.snap = this.computeSnapshot();
    this.listeners.forEach((l) => l());
  }

  private computeSnapshot(): EngineSnapshot {
    const elapsed = this.now();
    const remaining = this.durationMs ? Math.max(0, this.durationMs - elapsed) : null;
    let progress = 0;
    if (this.phase === 'result' || this.phase === 'summary') progress = 1;
    else if (this.durationMs) progress = Math.min(1, elapsed / this.durationMs);
    else if (this.rounds > 0) progress = Math.min(1, this.round / this.rounds);
    return {
      phase: this.phase,
      paused: this.paused,
      countdown: this.countdown,
      elapsedMs: elapsed,
      remainingMs: remaining,
      progress,
      attempts: this.stats.attempts,
      correct: this.stats.correct,
      wrong: this.stats.wrong,
      combo: this.combo,
      score: this.calculateScore(),
      round: this.round,
      rounds: this.rounds,
    };
  }

  // ---- Yaşam döngüsü --------------------------------------------------------------------------

  /** IDLE → READY */
  prepare(): void {
    if (this.phase !== 'idle') return;
    this.phase = 'ready';
    this.emit();
  }

  /** READY → COUNTDOWN → PLAYING */
  start(): void {
    if (this.phase !== 'ready' && this.phase !== 'idle') return;
    this.phase = 'countdown';
    this.countdown = COUNTDOWN_FROM;
    if (this.sound) sfx.tick();
    this.emit();
    const step = () => {
      this.countdown -= 1;
      if (this.countdown <= 0) {
        this.countdownTimer = null;
        this.beginPlaying();
      } else {
        if (this.sound) sfx.tick();
        this.emit();
        this.countdownTimer = setTimeout(step, COUNTDOWN_STEP_MS);
      }
    };
    this.countdownTimer = setTimeout(step, COUNTDOWN_STEP_MS);
  }

  private beginPlaying() {
    this.phase = 'playing';
    this.paused = false;
    this.countdown = 0;
    this.elapsedBase = 0;
    this.resumedAt = performance.now();
    if (this.sound) sfx.go();
    this.tickTimer = setInterval(() => this.tick(), TICK_MS);
    this.emit();
  }

  pause(): void {
    if (this.phase !== 'playing' || this.paused) return;
    this.elapsedBase = this.now();
    this.paused = true;
    this.emit();
  }

  resume(): void {
    if (this.phase !== 'playing' || !this.paused) return;
    this.paused = false;
    this.resumedAt = performance.now();
    this.emit();
  }

  /** Oyunu baştan başlatılabilir duruma (READY) döndürür. */
  reset(): void {
    this.stopTimers();
    this.tasks = [];
    this.phase = 'ready';
    this.paused = false;
    this.countdown = 0;
    this.stats = { attempts: 0, correct: 0, wrong: 0, reactionTimes: [] };
    this.combo = 0;
    this.bestCombo = 0;
    this.round = 0;
    this.metadata = {};
    this.elapsedBase = 0;
    this.result = null;
    this._summary = null;
    this.emit();
  }

  /** PLAYING → RESULT. Standart `GameResult` döndürür. */
  finish(): GameResult {
    if (this.phase !== 'playing' && this.result) return this.result;
    const wasPlaying = this.phase === 'playing';
    if (wasPlaying) this.elapsedBase = this.now();
    this.stopTimers();
    this.tasks = [];
    this.paused = false;
    this.result = this.buildResult();
    this.phase = 'result';
    if (wasPlaying && this.sound) sfx.finish();
    this.emit();
    return this.result;
  }

  /** RESULT → SUMMARY */
  setSummary(summary: SessionSummary): void {
    this._summary = summary;
    this.phase = 'summary';
    this.emit();
  }

  /** Bileşen sökülürken zamanlayıcıları temizler. */
  dispose(): void {
    this.stopTimers();
    this.tasks = [];
  }

  private stopTimers() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.countdownTimer) clearTimeout(this.countdownTimer);
    this.tickTimer = null;
    this.countdownTimer = null;
  }

  // ---- Zaman ----------------------------------------------------------------------------------

  /** Oyunun aktif (duraklamalar hariç) süresi, ms. */
  now(): number {
    if (this.phase === 'playing' && !this.paused) return this.elapsedBase + (performance.now() - this.resumedAt);
    return this.elapsedBase;
  }

  /** Duraklamaya duyarlı zamanlayıcı. Dönen fonksiyon görevi iptal eder. */
  after(ms: number, fn: () => void): () => void {
    const task: Task = { dueAt: this.now() + ms, fn };
    this.tasks.push(task);
    return () => {
      const i = this.tasks.indexOf(task);
      if (i >= 0) this.tasks.splice(i, 1);
    };
  }

  private tick() {
    if (this.phase !== 'playing' || this.paused) return;
    const t = this.now();
    // Vadesi gelen görevleri sırayla çalıştır (görev yeni görev ekleyebilir).
    for (let guard = 0; guard < 50; guard++) {
      let idx = -1;
      let best = Infinity;
      for (let i = 0; i < this.tasks.length; i++) {
        if (this.tasks[i].dueAt <= t && this.tasks[i].dueAt < best) {
          best = this.tasks[i].dueAt;
          idx = i;
        }
      }
      if (idx < 0) break;
      const [task] = this.tasks.splice(idx, 1);
      task.fn();
      if (this.phase !== 'playing') return;
    }
    if (this.durationMs && t >= this.durationMs) {
      this.finish();
      return;
    }
    this.emit();
  }

  // ---- Deneme kaydı ---------------------------------------------------------------------------

  record(attempt: Attempt): void {
    if (this.phase !== 'playing') return;
    this.stats.attempts += 1;
    if (attempt.correct) {
      this.stats.correct += 1;
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
    } else {
      this.stats.wrong += 1;
      this.combo = 0;
    }
    if (this.scoring.measuresReaction && attempt.rtMs !== undefined && attempt.rtMs > 0) {
      this.stats.reactionTimes.push(Math.min(attempt.rtMs, MAX_REASONABLE_RT));
    }
    if (this.sound) attempt.correct ? sfx.correct() : sfx.wrong();
    this.emit();
  }

  /** Tamamlanan tur sayısını bildirir (tur tabanlı oyunların ilerleme çubuğu). */
  setRound(completed: number): void {
    this.round = completed;
    this.emit();
  }

  setMetadata(key: string, value: number | string): void {
    this.metadata[key] = value;
  }

  // ---- Skor / zorluk (GameEngine arayüzü) -----------------------------------------------------

  calculateScore(): number {
    return calculateScore(this.stats, this.scoring, this.difficulty);
  }

  /** Mevcut performansa göre önerilecek bir sonraki zorluk. */
  calculateDifficulty(): number {
    return adjustDifficulty(
      { difficulty: this.difficulty, ...this.adaptive },
      this.buildResult(),
      this.scoring.measuresReaction,
    ).after;
  }

  private buildResult(): GameResult {
    const breakdown = computeBreakdown(this.stats, this.scoring);
    const measured = this.scoring.measuresReaction && this.stats.reactionTimes.length > 0;
    const round1 = (n: number) => Math.round(n * 10) / 10;
    return {
      gameId: this.meta.id,
      score: this.calculateScore(),
      accuracy: round1(breakdown.accuracy),
      reactionTime: measured ? Math.round(mean(this.stats.reactionTimes)) : 0,
      mistakes: this.stats.wrong,
      duration: round1(Math.min(this.now(), this.durationMs ?? Infinity) / 1000),
      difficulty: this.difficulty,
      correctAnswers: this.stats.correct,
      wrongAnswers: this.stats.wrong,
      attempts: this.stats.attempts,
      combo: this.bestCombo,
      breakdown: {
        accuracy: Math.round(breakdown.accuracy),
        speed: Math.round(breakdown.speed),
        consistency: Math.round(breakdown.consistency),
      },
      metadata: Object.keys(this.metadata).length ? { ...this.metadata } : undefined,
    };
  }
}
