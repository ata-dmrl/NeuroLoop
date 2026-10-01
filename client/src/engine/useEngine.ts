import { useSyncExternalStore } from 'react';
import type { EngineSnapshot, GameEngine } from './GameEngine';

/**
 * Motor durumundan yalnızca ihtiyaç duyulan (ilkel) değeri okur.
 * Selector ilkel bir değer döndürdüğü için bileşen sadece o değer değişince yeniden çizilir.
 */
export function useEngine<T extends string | number | boolean | null>(
  engine: GameEngine,
  selector: (snapshot: EngineSnapshot) => T,
): T {
  const get = () => selector(engine.getSnapshot());
  return useSyncExternalStore(engine.subscribe, get, get);
}
