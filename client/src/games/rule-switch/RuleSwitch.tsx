import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { GAME_META } from '@shared/constants';
import { mean } from '@/engine/scoring';
import type { GameComponentProps, GameModule } from '../types';
import { COLOR_HEX, COLOR_LABEL, GlyphSvg, type Glyph } from '../shared/glyphs';
import { GameButton, useGameKeys } from '../shared/input';
import { Mark, Stage, useSchedule } from '../shared/kit';
import { RULES, cardCount, makeTrial, nextRule, rulePool, runLength, type Card, type RuleTrial } from './logic';

export const DURATION_MS = 50_000;

function cardGlyph(c: Card): Glyph {
  return { shape: c.shape, color: c.color, fill: 'solid', rotation: 0 };
}

function RuleSwitch({ engine, difficulty, colorAssist }: GameComponentProps) {
  const schedule = useSchedule(engine);
  const pool = rulePool(difficulty);
  const count = cardCount(difficulty);

  const [trial, setTrial] = useState<RuleTrial | null>(null);
  const [justSwitched, setJustSwitched] = useState(false);
  const [flash, setFlash] = useState<{ index: number; ok: boolean } | null>(null);

  const rule = useRef<ReturnType<typeof nextRule> | null>(null);
  const remaining = useRef(0);
  const shownAt = useRef(0);
  const isSwitch = useRef(false);
  const locked = useRef(false);
  const switchRTs = useRef<number[]>([]);
  const repeatRTs = useRef<number[]>([]);

  function next() {
    locked.current = false;
    setFlash(null);
    let switched = false;
    if (remaining.current <= 0) {
      const before = rule.current;
      rule.current = nextRule(pool, rule.current);
      remaining.current = runLength(difficulty);
      switched = before !== null;
    }
    remaining.current -= 1;
    isSwitch.current = switched;
    setJustSwitched(switched);
    setTrial(makeTrial(rule.current!, count));
    shownAt.current = engine.now();
  }

  useEffect(() => {
    next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(i: number) {
    if (!trial || locked.current) return;
    locked.current = true;
    const ok = i === trial.answer;
    if (ok) {
      const rt = engine.now() - shownAt.current;
      engine.record({ correct: true, rtMs: rt });
      (isSwitch.current ? switchRTs : repeatRTs).current.push(rt);
      if (switchRTs.current.length && repeatRTs.current.length) {
        engine.setMetadata('switchCostMs', Math.round(mean(switchRTs.current) - mean(repeatRTs.current)));
      }
    } else {
      engine.record({ correct: false });
    }
    setFlash({ index: i, ok });
    schedule(ok ? 150 : 450, next);
  }

  useGameKeys(
    engine,
    Object.fromEntries(Array.from({ length: 4 }, (_, i) => [String(i + 1), () => choose(i)])),
  );

  if (!trial) return <Stage />;
  const def = RULES[trial.rule];

  return (
    <Stage className="gap-7">
      <div className="flex flex-col items-center gap-2" aria-live="polite">
        <div className="h-6">
          {justSwitched && (
            <span className="chip anim-pop" style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>
              <RefreshCw size={13} aria-hidden /> Kural değişti
            </span>
          )}
        </div>
        <p key={trial.rule + String(justSwitched)} className="anim-pop text-center text-3xl font-extrabold sm:text-4xl">
          <span className="text-accent">{def.emphasis}</span> {def.rest}
        </p>
      </div>

      <div className="flex w-full flex-wrap items-stretch justify-center gap-3" role="group" aria-label="Kartlar">
        {trial.cards.map((c, i) => {
          const state = flash
            ? flash.index === i
              ? flash.ok
                ? 'correct'
                : 'wrong'
              : !flash.ok && i === trial.answer
                ? 'missed'
                : undefined
            : undefined;
          return (
            <GameButton
              key={i}
              onAct={() => choose(i)}
              data-state={state}
              aria-label={`Kart ${i + 1}: ${COLOR_LABEL[c.color]} ${c.shape === 'circle' ? 'daire' : c.shape === 'square' ? 'kare' : 'üçgen'}, sayı ${c.number}`}
              className="play-btn relative h-32 w-24 flex-col gap-1 p-2 sm:h-40 sm:w-32"
            >
              <span className="relative block h-16 w-16 sm:h-20 sm:w-20">
                <GlyphSvg glyph={cardGlyph(c)} />
                <span
                  className="absolute inset-0 flex items-center justify-center text-2xl font-black sm:text-3xl"
                  style={{ color: '#fff', textShadow: '0 1px 3px rgb(0 0 0 / 0.55)' }}
                  aria-hidden
                >
                  {c.number}
                </span>
              </span>
              {colorAssist && (
                <span className="text-[0.7rem] font-bold" style={{ color: COLOR_HEX[c.color] }} aria-hidden>
                  {COLOR_LABEL[c.color]}
                </span>
              )}
              <span className="absolute left-1.5 top-1 text-[0.7rem] font-bold text-muted" aria-hidden>
                {i + 1}
              </span>
              {flash?.index === i && (
                <span className="absolute right-1 top-1" aria-hidden>
                  <Mark ok={flash.ok} size={18} />
                </span>
              )}
            </GameButton>
          );
        })}
      </div>
    </Stage>
  );
}

const gameModule: GameModule = {
  meta: GAME_META['rule-switch'],
  config: {
    durationMs: DURATION_MS,
    fastMs: 800,
    slowMs: 3200,
    targetAttempts: (d) => Math.round(34 - d * 0.15),
  },
  Component: RuleSwitch,
  howToPlay: [
    'Ekranın üstünde aktif kural yazar (ör. “TEK sayıyı seç”, “KIRMIZI olanı seç”).',
    'Kurala uyan tek kartı seç. Kural haber vermeden değişir — yeni kuralı fark et ve hemen uyum sağla.',
    'Kural değişimindeki ekstra yavaşlığın “geçiş maliyeti” olarak sonuç ekranında gösterilir.',
  ],
  controls: 'Fare / dokunma veya 1–4 tuşları (kartın numarası).',
};

export default gameModule;
