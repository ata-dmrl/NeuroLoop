import { useCallback, useEffect, useRef, useState } from 'react';
import { GAME_META } from '@shared/constants';
import type { GameComponentProps, GameModule } from '../types';
import { GameButton } from '../shared/input';
import { Prompt, Stage, useSchedule } from '../shared/kit';

export const DURATION_MS = 60_000;

/** Kelime kategorileri */
interface CategoryData {
  label: string;
  words: string[];
}

const CATEGORIES: CategoryData[] = [
  {
    label: 'Hayvan',
    words: ['Kedi', 'Köpek', 'Aslan', 'Kaplan', 'Fil', 'Zürafa', 'Tavşan', 'Kurt', 'Ayı', 'Maymun', 'Kartal', 'Balık', 'Ördek', 'Kurbağa', 'Fare'],
  },
  {
    label: 'Meyve',
    words: ['Elma', 'Muz', 'Portakal', 'Üzüm', 'Çilek', 'Kiraz', 'Armut', 'Karpuz', 'Kavun', 'Şeftali', 'Erik', 'Limon', 'Ananas', 'Mango'],
  },
  {
    label: 'Şehir',
    words: ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Konya', 'Adana', 'Gaziantep', 'Kayseri', 'Trabzon', 'Samsun', 'Diyarbakır'],
  },
  {
    label: 'Renk',
    words: ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı', 'Mor', 'Turuncu', 'Pembe', 'Siyah', 'Beyaz', 'Kahverengi', 'Gri', 'Lacivert'],
  },
  {
    label: 'Araç',
    words: ['Araba', 'Otobüs', 'Uçak', 'Gemi', 'Tren', 'Bisiklet', 'Motosiklet', 'Kamyon', 'Taksi', 'Helikopter', 'Metro', 'Tekne'],
  },
  {
    label: 'Meslek',
    words: ['Doktor', 'Mühendis', 'Öğretmen', 'Avukat', 'Pilot', 'Hemşire', 'Mimar', 'Aşçı', 'Polis', 'Gazeteci', 'Müzisyen', 'Eczacı'],
  },
];

/** Decoy (yanıltıcı) kelime havuzu – kategori dışı kelimeler */
const DECOY_POOL = ['Masa', 'Kitap', 'Kalem', 'Sandalye', 'Pencere', 'Kapı', 'Taş', 'Ağaç', 'Güneş', 'Bulut', 'Deniz', 'Dağ', 'Nehir', 'Çiçek', 'Yıldız'];

interface Balloon {
  id: number;
  word: string;
  isTarget: boolean;
  x: number;        // % of container width
  y: number;        // % (100 = bottom, 0 = top)
  speed: number;    // px/frame speed coefficient
  color: string;
  popped: boolean;
  wrongPop: boolean;
}

const BALLOON_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];

let _nextId = 1;

function makeBalloon(word: string, isTarget: boolean, speed: number): Balloon {
  return {
    id: _nextId++,
    word,
    isTarget,
    x: 5 + Math.random() * 80,
    y: 100 + Math.random() * 20,
    speed,
    color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
    popped: false,
    wrongPop: false,
  };
}

function WordBubble({ engine, difficulty }: GameComponentProps) {
  const schedule = useSchedule(engine);
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const categoryRef = useRef<CategoryData | null>(null);

  const baseSpeed = 0.025 + difficulty * 0.0003;
  const spawnInterval = Math.max(800, 2200 - difficulty * 12); // ms between spawns

  const spawn = useCallback(() => {
    const cat = categoryRef.current;
    if (!cat) return;
    const isTarget = Math.random() < 0.45;
    const word = isTarget
      ? cat.words[Math.floor(Math.random() * cat.words.length)]
      : DECOY_POOL[Math.floor(Math.random() * DECOY_POOL.length)];
    setBalloons((prev) => [...prev.filter((b) => !b.popped || b.wrongPop), makeBalloon(word, isTarget, baseSpeed)]);
  }, [baseSpeed]);

  // Pick random category on mount
  useEffect(() => {
    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    setCategory(cat);
    categoryRef.current = cat;
    // initial spawn
    spawn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Balloon rise animation + spawn timer
  useEffect(() => {
    let running = true;
    lastTimeRef.current = performance.now();
    spawnTimerRef.current = 0;

    const tick = (time: number) => {
      if (!running) return;
      const dt = time - lastTimeRef.current;
      lastTimeRef.current = time;
      spawnTimerRef.current += dt;

      if (spawnTimerRef.current >= spawnInterval) {
        spawnTimerRef.current = 0;
        spawn();
      }

      setBalloons((prev) =>
        prev
          .map((b) => (b.popped ? b : { ...b, y: b.y - b.speed * dt }))
          .filter((b) => b.y > -20), // remove balloons that left the screen
      );

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, [spawn, spawnInterval]);

  function popBalloon(b: Balloon) {
    if (b.popped) return;
    const ok = b.isTarget;
    engine.record({ correct: ok, rtMs: 0 });
    if (!ok) {
      setBalloons((prev) =>
        prev.map((x) => (x.id === b.id ? { ...x, popped: true, wrongPop: true } : x)),
      );
      schedule(600, () => setBalloons((prev) => prev.filter((x) => x.id !== b.id)));
    } else {
      setBalloons((prev) => prev.filter((x) => x.id !== b.id));
    }
  }

  return (
    <Stage className="gap-3">
      <Prompt>
        <span>Kategori: </span>
        <strong className="text-accent" style={{ color: 'var(--accent)' }}>{category?.label ?? '…'}</strong>
        <span> — Bu kategoriye ait balonları patlat!</span>
      </Prompt>

      {/* Balloon arena */}
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border-2"
        style={{ height: '420px', borderColor: 'var(--border)', background: 'var(--surface-2)' }}
        aria-label="Balon alanı"
      >
        {balloons.map((b) => (
          <button
            key={b.id}
            onClick={() => popBalloon(b)}
            aria-label={`${b.word} balonu — ${b.isTarget ? 'hedef' : 'tuzak'}`}
            className="absolute flex select-none items-center justify-center rounded-full text-sm font-bold text-white shadow-lg transition-transform active:scale-90"
            style={{
              left: `${b.x}%`,
              bottom: `${b.y}%`,
              width: '80px',
              height: '80px',
              background: b.wrongPop ? 'var(--danger)' : b.color,
              border: b.wrongPop ? '3px solid var(--danger)' : '3px solid rgba(255,255,255,0.3)',
              boxShadow: b.wrongPop ? '0 0 18px var(--danger)' : `0 4px 18px ${b.color}66`,
              fontSize: b.word.length > 6 ? '10px' : '12px',
              cursor: 'pointer',
            }}
          >
            {b.word}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">Yanlış balona dokunursan puan kaybedersin!</p>
    </Stage>
  );
}

// We need GameButton import but use regular button above; keep import for lint consistency
void GameButton;

const gameModule: GameModule = {
  meta: GAME_META['word-bubble'],
  config: {
    durationMs: DURATION_MS,
    fastMs: 0,
    slowMs: 0,
    targetAttempts: () => 20,
  },
  Component: WordBubble,
  howToPlay: [
    'Üstte bir kategori gösterilir (ör. Hayvan, Meyve, Şehir).',
    'Ekranda yükselen balonlardaki kelimeleri oku. Yalnızca o kategoriye ait olanlara dokun.',
    'Yanlış balona dokunursan puan kaybedersin. 60 saniyede mümkün olduğunca çok doğru balonu patlat.',
  ],
  controls: 'Fare veya dokunma ile balonu patlat.',
};

export default gameModule;
