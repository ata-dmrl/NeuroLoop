import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, Play, RotateCcw } from 'lucide-react';
import { CATEGORIES, GAME_META } from '@shared/constants';
import { GAME_ICONS } from '@/components/ui/icons';
import { CategoryChip, IconTile, Ring } from '@/components/ui/primitives';
import { categoriesOf, estimateMinutes, nextDailyGame } from '@/engine/daily';
import { DAILY_COMPLETION_XP } from '@/engine/gamification';
import { useAppStore } from '@/store/useAppStore';
import { addDays, dayKey } from '@/utils/date';

export default function DailyTraining() {
  const dailyMap = useAppStore((s) => s.daily);
  const settings = useAppStore((s) => s.settings);
  const ensureDailyTraining = useAppStore((s) => s.ensureDailyTraining);

  useEffect(() => {
    ensureDailyTraining();
  }, [ensureDailyTraining, dailyMap, settings.dailyGameCount, settings.disabledGames]);

  const today = dayKey();
  const plan = dailyMap[today];
  if (!plan) return <p className="py-20 text-center text-muted">Bugünün planı hazırlanıyor…</p>;

  const done = plan.games.filter((g) => plan.completedGames[g] !== undefined).length;
  const next = nextDailyGame(plan);
  const cats = categoriesOf(plan.games);

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, done: dailyMap[date]?.completed ?? false, isToday: date === today };
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Günlük antrenman</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Bugünün planı</h1>
          <p className="mt-1 text-muted">
            {plan.games.length} oyun · yaklaşık {estimateMinutes(plan.games)} dakika. Zayıf alanlarına ve uzun süredir oynamadıklarına öncelik verildi.
          </p>
        </div>
        <Ring value={done} max={plan.games.length} size={84} stroke={9} label="Günlük antrenman ilerlemesi">
          <span className="tabular text-lg font-extrabold">
            {done}/{plan.games.length}
          </span>
        </Ring>
      </header>

      {plan.completed && (
        <section className="card flex flex-col gap-1 p-6" style={{ background: 'var(--success-soft)' }} aria-live="polite">
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-success">
            <Check size={22} aria-hidden /> Bugünkü antrenman tamamlandı
          </h2>
          <p className="text-sm">
            Toplam skor <span className="tabular font-bold">{plan.totalScore}</span> · +{DAILY_COMPLETION_XP} XP kazandın. Yarın yeni bir plan seni bekliyor;
            istersen aşağıdan oyunları tekrar oynayabilirsin.
          </p>
        </section>
      )}

      <ol className="flex flex-col gap-3" aria-label="Bugünün oyunları">
        {plan.games.map((g, i) => {
          const meta = GAME_META[g];
          const Icon = GAME_ICONS[g];
          const score = plan.completedGames[g];
          const isNext = g === next;
          return (
            <li
              key={g}
              className="card flex flex-wrap items-center gap-4 p-4 sm:p-5"
              style={isNext ? { borderColor: 'var(--accent)', borderWidth: 2 } : undefined}
            >
              <span className="tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-extrabold" aria-hidden>
                {i + 1}
              </span>
              <IconTile category={meta.category} size={48}>
                <Icon size={24} />
              </IconTile>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-extrabold leading-tight">{meta.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <CategoryChip category={meta.category} />
                  <span>≈ {Math.max(1, Math.round((meta.estimatedSeconds + 20) / 60))} dk</span>
                </div>
              </div>
              {score !== undefined ? (
                <div className="flex items-center gap-3">
                  <p className="text-right">
                    <span className="eyebrow block">Skor</span>
                    <span className="tabular text-xl font-extrabold">{score}</span>
                  </p>
                  <span className="chip" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                    <Check size={14} aria-hidden /> Tamamlandı
                  </span>
                  <Link to={`/games/${g}?daily=1`} className="btn btn-sm" aria-label={`${meta.name} oyununu tekrar oyna`}>
                    <RotateCcw size={14} aria-hidden />
                  </Link>
                </div>
              ) : (
                <Link to={`/games/${g}?daily=1`} className={`btn ${isNext ? 'btn-primary' : ''}`}>
                  <Play size={18} aria-hidden /> {isNext ? (done === 0 ? 'Başla' : 'Devam et') : 'Oyna'}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="card p-6" aria-labelledby="balance-title">
          <h2 id="balance-title" className="mb-2 text-lg font-bold">
            Neden bu oyunlar?
          </h2>
          <p className="mb-3 text-sm text-muted">Plan, beceri dengesini korumak için farklı alanlardan oyunlar seçer:</p>
          <ul className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <li key={c} title={CATEGORIES[c].description}>
                <CategoryChip category={c} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Oyun sayısını ve plana girecek oyunları <Link to="/settings" className="font-semibold text-accent-strong hover:underline">Ayarlar</Link> sayfasından değiştirebilirsin.
          </p>
        </section>

        <section className="card p-6" aria-labelledby="week-title">
          <h2 id="week-title" className="mb-3 text-lg font-bold">
            Son 7 gün
          </h2>
          <ul className="flex justify-between gap-1">
            {week.map((d) => (
              <li key={d.date} className="flex flex-col items-center gap-1.5">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold"
                  style={{
                    borderColor: d.done ? 'var(--success)' : d.isToday ? 'var(--accent)' : 'var(--border)',
                    background: d.done ? 'var(--success-soft)' : 'transparent',
                    color: d.done ? 'var(--success)' : 'var(--muted)',
                  }}
                  aria-label={`${d.date}: ${d.done ? 'antrenman tamamlandı' : d.isToday ? 'bugün' : 'tamamlanmadı'}`}
                >
                  {d.done ? <Check size={16} strokeWidth={3} aria-hidden /> : Number(d.date.slice(-2))}
                </span>
                <span className="text-[0.65rem] text-muted">{d.isToday ? 'bugün' : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
