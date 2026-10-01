import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { GameEngine } from '@/engine/GameEngine';

type KeyMap = Record<string, (e: KeyboardEvent) => void>;

/**
 * Ortak klavye girdisi. Anahtarlar `KeyboardEvent.key` değerinin küçük harfli hâlidir
 * (ör. '1', 'arrowleft', ' ', 'enter'). Oyun duraklatılmışken veya oynanmıyorken çalışmaz.
 */
export function useGameKeys(engine: GameEngine, map: KeyMap): void {
  const ref = useRef(map);
  ref.current = map;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const snap = engine.getSnapshot();
      if (snap.phase !== 'playing' || snap.paused) return;
      const handler = ref.current[e.key.toLowerCase()];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine]);
}

interface GameButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'onPointerDown'> {
  onAct: () => void;
  /**
   * Oyunun kendi genel klavye kısayolları (Boşluk/Enter/rakamlar) varsa true:
   * düğme odak almaz, böylece aynı tuş iki kez tetiklenmez.
   */
  noFocus?: boolean;
  children?: ReactNode;
}

/**
 * Fare, dokunma ve klavye için tek bir "eylem" soyutlaması.
 * Fare/dokunma `pointerdown`'da tetiklenir (daha doğru tepki süresi); klavye ile odaktayken
 * Enter/Boşluk ise `click` (detail === 0) üzerinden aynı eylemi çalıştırır.
 */
export function GameButton({ onAct, children, className, noFocus = false, type = 'button', ...rest }: GameButtonProps) {
  return (
    <button
      type={type}
      {...rest}
      tabIndex={noFocus ? -1 : rest.tabIndex}
      className={className}
      onMouseDown={noFocus ? (e) => e.preventDefault() : undefined}
      onPointerDown={(e) => {
        if (e.button !== 0 || rest.disabled) return;
        onAct();
      }}
      onClick={(e) => {
        if (!noFocus && e.detail === 0 && !rest.disabled) onAct();
      }}
    >
      {children}
    </button>
  );
}
