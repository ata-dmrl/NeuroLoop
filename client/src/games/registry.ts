import type { GameId } from '@shared/types';
import { GAME_IDS } from '@shared/constants';
import distractorField from './distractor-field/DistractorField';
import dualTask from './dual-task/DualTask';
import memoryGrid from './memory-grid/MemoryGrid';
import patternSequence from './pattern-sequence/PatternSequence';
import quickCalc from './quick-calc/QuickCalc';
import recallChain from './recall-chain/RecallChain';
import ruleSwitch from './rule-switch/RuleSwitch';
import symbolMatch from './symbol-match/SymbolMatch';
import colorClash from './color-clash/ColorClash';
import wordBubble from './word-bubble/WordBubble';
import numberFlow from './number-flow/NumberFlow';
import type { GameModule } from './types';

/**
 * Oyun kayıt defteri. Yeni bir oyun eklemek için:
 *  1) shared/constants içine meta ekle, 2) games/<oyun>/ altında bir GameModule yaz, 3) buraya ekle.
 * Mevcut oyunların koduna dokunmak gerekmez.
 */
export const GAME_MODULES: Record<GameId, GameModule> = {
  'memory-grid': memoryGrid,
  'symbol-match': symbolMatch,
  'distractor-field': distractorField,
  'rule-switch': ruleSwitch,
  'pattern-sequence': patternSequence,
  'quick-calc': quickCalc,
  'dual-task': dualTask,
  'recall-chain': recallChain,
  'color-clash': colorClash,
  'word-bubble': wordBubble,
  'number-flow': numberFlow,
};

export function getGameModule(id: string | undefined): GameModule | null {
  if (!id || !(GAME_IDS as string[]).includes(id)) return null;
  return GAME_MODULES[id as GameId];
}

/** Sonuç ekranında gösterilen oyuna özel metrikler. */
export const METADATA_LABELS: Record<string, { label: string; unit?: string; prefix?: string }> = {
  switchCostMs: { label: 'Kural geçiş maliyeti', unit: 'ms', prefix: '+' },
  hits: { label: 'Yakalanan hedef' },
  misses: { label: 'Kaçırılan hedef' },
  falseAlarms: { label: 'Yanlış basış' },
  longestChain: { label: 'En uzun zincir' },
};
