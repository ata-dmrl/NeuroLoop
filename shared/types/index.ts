/**
 * Frontend ve (ileride) backend tarafından ortak kullanılan tipler.
 * Birimler: reactionTime → ms, duration → saniye, accuracy → 0-100, score → 0-1000, difficulty → 1-100.
 */

export type SkillCategory =
  | 'memory'
  | 'attention'
  | 'speed'
  | 'flexibility'
  | 'problem-solving'
  | 'reasoning'
  | 'math'
  | 'language';

export type SkillId =
  // Memory
  | 'working-memory'
  | 'visual-memory'
  | 'spatial-memory'
  | 'recall'
  // Attention
  | 'selective-attention'
  | 'divided-attention'
  | 'sustained-attention'
  | 'visual-attention'
  // Speed
  | 'reaction-speed'
  | 'processing-speed'
  | 'visual-processing'
  // Flexibility
  | 'task-switching'
  | 'rule-switching'
  | 'response-inhibition'
  // Problem solving
  | 'logic'
  | 'planning'
  | 'pattern-recognition'
  // Reasoning
  | 'deduction'
  | 'sequence-recognition'
  | 'spatial-reasoning'
  // Math
  | 'mental-calculation'
  | 'estimation'
  | 'numerical-reasoning'
  // Language
  | 'word-recognition'
  | 'vocabulary'
  | 'verbal-fluency';

export type GameId =
  | 'memory-grid'
  | 'symbol-match'
  | 'distractor-field'
  | 'rule-switch'
  | 'pattern-sequence'
  | 'quick-calc'
  | 'dual-task'
  | 'recall-chain'
  | 'color-clash'
  | 'word-bubble'
  | 'number-flow';

export interface GameMeta {
  id: GameId;
  name: string;
  tagline: string;
  description: string;
  category: SkillCategory;
  primarySkill: SkillId;
  secondarySkills: SkillId[];
  /** Yaklaşık oyun süresi (saniye) — günlük antrenman süre hesabı için. */
  estimatedSeconds: number;
  /** Oyun tepki süresi ölçüyor mu? Ölçmüyorsa hız/tutarlılık skoru hesaba katılmaz. */
  measuresReaction: boolean;
}

/** Her oyunun döndürdüğü standart sonuç. */
export interface GameResult {
  gameId: GameId;
  score: number;
  accuracy: number;
  reactionTime: number;
  mistakes: number;
  duration: number;
  difficulty: number;
  correctAnswers: number;
  wrongAnswers: number;
  attempts: number;
  /** Oyun boyunca ulaşılan en uzun doğru serisi. */
  combo: number;
  breakdown: PerformanceBreakdown;
  metadata?: Record<string, number | string>;
}

export interface PerformanceBreakdown {
  accuracy: number;
  speed: number;
  consistency: number;
}

/** Kalıcı olarak saklanan oyun oturumu (GameSession tablosuna karşılık gelir). */
export interface GameSessionRecord extends GameResult {
  id: string;
  createdAt: string;
  /** Günlük antrenmanın parçası olarak mı oynandı. */
  daily: boolean;
}

export interface UserSkill {
  skill: SkillId;
  score: number;
  level: number;
  accuracy: number;
  averageReactionTime: number;
  samples: number;
  lastUpdated: string;
}

export interface GameProgress {
  gameId: GameId;
  difficulty: number;
  /** Üst üste başarısız oturum sayısı (anti-frustration için). */
  failStreak: number;
  bestScore: number;
  plays: number;
  lastPlayed: string | null;
  lastScore: number | null;
  lastSpeedScore: number | null;
  lastReactionTime: number | null;
}

export interface DailyTraining {
  date: string;
  games: GameId[];
  completedGames: Partial<Record<GameId, number>>;
  completed: boolean;
  totalScore: number;
}

export interface DifficultyChange {
  before: number;
  after: number;
  delta: number;
  reason: string;
}

export interface SkillDelta {
  skill: SkillId;
  before: number | null;
  after: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
}

/** Oturum kaydedildikten sonra kullanıcıya gösterilen özet (SUMMARY aşaması). */
export interface SessionSummary {
  sessionId: string;
  result: GameResult;
  isPersonalBest: boolean;
  previousBest: number | null;
  previousScore: number | null;
  /** Önceki oturuma göre yüzde değişim (ilk oyunda null). */
  changePercent: number | null;
  difficulty: DifficultyChange;
  skillDeltas: SkillDelta[];
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  unlockedAchievements: AchievementDef[];
  streak: number;
  dailyCompleted: boolean;
}
