import type { ComponentType } from 'react';
import type { GameMeta } from '@shared/types';
import type { GameEngine } from '@/engine/GameEngine';

export interface GameComponentProps {
  engine: GameEngine;
  /** Oturum boyunca sabit zorluk (1-100). */
  difficulty: number;
  /** Renk taşıyan şekillerde harf işareti göster. */
  colorAssist: boolean;
}

export interface GameConfig {
  /** Süre sınırlı oyunlar: toplam süre (ms). */
  durationMs?: number;
  /** Tur tabanlı oyunlar: toplam tur. */
  rounds?: number;
  /** Ortalama tepki bu değerin altındaysa tam hız puanı (ms). */
  fastMs: number;
  /** Ortalama tepki bu değerin üstündeyse sıfır hız puanı (ms). */
  slowMs: number;
  /** İyi bir oturumda beklenen deneme sayısı (zorluğa bağlı olabilir). */
  targetAttempts: (difficulty: number) => number;
}

/** Yeni bir oyun eklemek = bir GameModule yazıp registry'ye eklemek. */
export interface GameModule {
  meta: GameMeta;
  config: GameConfig;
  Component: ComponentType<GameComponentProps>;
  howToPlay: string[];
  controls: string;
}

// ---------------------------------------------------------------------------
// Seviye sistemi — difficulty 1-100 → 5 kademe
// ---------------------------------------------------------------------------

export interface LevelTier {
  /** İç ID */
  id: 'basic' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
  /** Türkçe etiket */
  label: string;
  /** İngilizce alt başlık */
  sublabel: string;
  /** Difficulty aralığı [min, max] (max dahil) */
  range: [number, number];
  /** Tema rengi (CSS custom property) */
  color: string;
  /** Arka plan yumuşak renk */
  bgColor: string;
  /** Rozet simgesi */
  emoji: string;
  /** Sıra numarası (0-4) */
  rank: number;
}

export const LEVEL_TIERS: LevelTier[] = [
  {
    id: 'basic',
    label: 'Temel',
    sublabel: 'Basic',
    range: [1, 20],
    color: '#6b7a90',
    bgColor: 'rgba(107,122,144,0.12)',
    emoji: '🌱',
    rank: 0,
  },
  {
    id: 'beginner',
    label: 'Başlangıç',
    sublabel: 'Beginner',
    range: [21, 40],
    color: '#12a37a',
    bgColor: 'rgba(18,163,122,0.12)',
    emoji: '⚡',
    rank: 1,
  },
  {
    id: 'intermediate',
    label: 'Orta',
    sublabel: 'Intermediate',
    range: [41, 60],
    color: '#0b8fd6',
    bgColor: 'rgba(11,143,214,0.12)',
    emoji: '🔥',
    rank: 2,
  },
  {
    id: 'advanced',
    label: 'İleri',
    sublabel: 'Advanced',
    range: [61, 80],
    color: '#d6457e',
    bgColor: 'rgba(214,69,126,0.12)',
    emoji: '💎',
    rank: 3,
  },
  {
    id: 'expert',
    label: 'Uzman',
    sublabel: 'Expert',
    range: [81, 100],
    color: '#7c5cfc',
    bgColor: 'rgba(124,92,252,0.12)',
    emoji: '👑',
    rank: 4,
  },
];

/** difficulty → kademedeki bilgiler */
export function getTier(d: number): LevelTier {
  return LEVEL_TIERS.find((t) => d >= t.range[0] && d <= t.range[1]) ?? LEVEL_TIERS[LEVEL_TIERS.length - 1];
}

/** difficulty → kademe içindeki ilerleme 0-1 */
export function tierProgress(d: number): number {
  const tier = getTier(d);
  const [min, max] = tier.range;
  return Math.max(0, Math.min(1, (d - min) / (max - min)));
}

/** Geriye dönük uyumluluk için */
export function difficultyLabel(d: number): string {
  return getTier(d).label;
}

