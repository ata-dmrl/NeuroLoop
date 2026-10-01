import {
  Activity,
  Award,
  Brain,
  Calculator,
  CalendarCheck,
  Compass,
  Crosshair,
  Dumbbell,
  Flame,
  Footprints,
  Grid3x3,
  Layers,
  ListOrdered,
  Link2,
  MessageCircle,
  Mountain,
  Palette,
  Repeat,
  Shapes,
  Sun,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { GameId, SkillCategory } from '@shared/types';

export const GAME_ICONS: Record<GameId, LucideIcon> = {
  'memory-grid': Grid3x3,
  'symbol-match': Shapes,
  'distractor-field': Crosshair,
  'rule-switch': Repeat,
  'pattern-sequence': ListOrdered,
  'quick-calc': Calculator,
  'dual-task': Layers,
  'recall-chain': Link2,
  'color-clash': Palette,
  'word-bubble': MessageCircle,
  'number-flow': Activity,
};

export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  footprints: Footprints,
  flame: Flame,
  dumbbell: Dumbbell,
  'calendar-check': CalendarCheck,
  zap: Zap,
  brain: Brain,
  target: Target,
  repeat: Repeat,
  compass: Compass,
  sun: Sun,
  mountain: Mountain,
  award: Award,
};

export function categoryColor(c: SkillCategory): string {
  return `var(--c-${c})`;
}
