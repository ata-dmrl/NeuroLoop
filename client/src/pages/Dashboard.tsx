import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Play, Sparkles, Target, Trophy } from 'lucide-react';
import { CATEGORIES, CATEGORY_ORDER, GAME_META } from '@shared/constants';
import { SkillRadar, ScoreLine, type LinePoint } from '@/components/charts/charts';
import { GAME_ICONS } from '@/components/ui/icons';
import { Bar, EmptyState, IconTile, Ring, SectionTitle } from '@/components/ui/primitives';
import { estimateMinutes, nextDailyGame } from '@/engine/daily';
import { levelProgress } from '@/engine/gamification';
import { computeStreaks, dailySeries, filterByRange } from '@/engine/progress';
import { categoryScores, overallScore } from '@/engine/skills';
import { useAppStore } from '@/store/useAppStore';
import { addDays, dayKey, greeting } from '@/utils/date';
import { formatScore, timeAgo } from '@/utils/format';

export default function Dashboard() {
  const profile = useAppStore((s) => s.profile);
  const sessions = useAppStore((s) => s.sessions);
  const skills = useAppStore((s) => s.skills);
  const games = useAppStore((s) => s.games);
  const settings = useAppStore((s) => s.settings);
  const dailyMap = useAppStore((s) => s.daily);
  const ensureDailyTraining = useAppStore((s) => s.ensureDailyTraining);

  const today = dayKey();
  useEffect(() => {
    ensureDailyTraining();
  }, [ensureDailyTraining, dailyMap, settings.dailyGameCount, settings.disabledGames]);

  const plan = dailyMap[today];
  const streak = useMemo(() => computeStreaks(sessions), [sessions]);
  const scores = useMemo(() => categoryScores(skills), [skills]);
  const overall = overallScore(skills);
  const xp = levelProgress(profile.xp);

  const todaysGames = sessions.filter((s) => dayKey(s.createdAt) === today).length;
  const radarData = CATEGORY_ORDER.filter((c) => CATEGORIES[c].onDashboard).map((c) => ({
    label: CATEGORIES[c].label,
    value: Math.round(scores[c] ?? 0),
  }));

  const weekly = useMemo<LinePoint[]>(() => {
    const series = new Map(dailySeries(filterByRange(sessions, 7), (s) => s.score).map((p) => [p.date, p.value]));
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i - 6);
      return { date, value: series.get(date) ?? null };
    });
  }, [sessions, today]);

  const recent = sessions.slice(-5).reverse();
  const bests = Object.values(games)
    .filter((g) => g && g.plays > 0)
    .sort((a, b) => b!.bestScore - a!.bestScore)
    .slice(0, 3);

  const next = plan ? nextDailyGame(plan) : null;
  const doneCount = plan ? plan.games.filter((g) => plan.completedGames[g] !== undefined).length : 0;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">{greeting()}{profile.name ? `, ${profile.name}` : ''}</p>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Bugün zihnini ısıt</h1>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card flex flex-col gap-5 p-6 lg:col-span-2" aria-labelledby="today-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="today-title" className="text-xl font-extrabold">
                Bugünün antrenmanı
              </h2>
              <p className="text-sm text-muted">
                {plan ? `${plan.games.length} oyun · yaklaşık ${estimateMinutes(plan.games)} dakika` : 'Plan hazırlanıyor…'}
              </p>
            </div>
            {plan && (
              <Ring value={doneCount} max={plan.games.length} size={72} stroke={8} label="Günlük antrenman ilerlemesi">
                <span className="tabular text-sm font-extrabold">
                  {doneCount}/{plan.games.length}
                </span>
              </Ring>
            )}
          </div>

          {plan && (
            <ol className="flex flex-wrap gap-2" aria-label="Bugünün oyunları">
              {plan.games.map((g, i) => {
                const Icon = GAME_ICONS[g];
                const done = plan.completedGames[g] !== undefined;
                return (
                  <li
                    key={g}
                    className="card-flat flex items-center gap-2 px-3 py-2 text-sm font-semibold"
                    style={done ? { background: 'var(--success-soft)', color: 'var(--success)' } : undefined}
                  >
                    <Icon size={16} aria-hidden />
                    <span>
                      {i + 1}. {GAME_META[g].name}
                    </span>
                    {done && <span className="sr-only">(tamamlandı)</span>}
                    {done && <span aria-hidden>✓</span>}
                  </li>
                );
              })}
            </ol>
          )}

          <div>
            <Link to="/daily-training" className="btn btn-primary btn-lg">
              <Play size={20} aria-hidden />
              {plan?.completed ? 'Antrenmanı incele' : doneCount > 0 ? 'Devam et' : 'Başla'}
            </Link>
          </div>
        </section>

        <section className="card flex flex-col justify-between gap-4 p-6" aria-labelledby="streak-title">
          <div>
            <h2 id="streak-title" className="eyebrow">
              Günlük seri
            </h2>
            <p className="mt-2 flex items-center gap-2 text-5xl font-black">
              <Flame size={40} className="text-[color:var(--c-math)]" aria-hidden />
              <span className="tabular">{streak.current}</span>
              <span className="text-xl font-bold text-muted">gün</span>
            </p>
            <p className="mt-1 text-sm text-muted">En uzun seri: {streak.longest} gün</p>
          </div>
          <div className="flex items-center gap-4">
            <Ring value={Math.min(todaysGames, settings.dailyGoal)} max={settings.dailyGoal} size={64} stroke={7} label="Günlük hedef">
              <Target size={18} aria-hidden />
            </Ring>
            <p className="text-sm">
              <span className="font-bold">Günlük hedef</span>
              <br />
              <span className="tabular text-muted">
                {todaysGames}/{settings.dailyGoal} oyun
              </span>
            </p>
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-6" aria-labelledby="profile-title">
          <SectionTitle>
            <span id="profile-title">Bilişsel profil</span>
          </SectionTitle>
          {overall === null ? (
            <EmptyState
              title="Henüz veri yok"
              body="Birkaç oyun oynadıkça alanlardaki skorların burada belirir."
              action={
                <Link to="/games" className="btn btn-sm btn-primary">
                  Oyunlara git <ArrowRight size={14} aria-hidden />
                </Link>
              }
            />
          ) : (
            <div className="grid items-center gap-2 sm:grid-cols-2">
              <SkillRadar data={radarData} label={`Bilişsel profil grafiği. ${radarData.map((d) => `${d.label} ${d.value}`).join(', ')}`} />
              <ul className="flex flex-col gap-2.5">
                {radarData.map((d, i) => {
                  const c = CATEGORY_ORDER.filter((x) => CATEGORIES[x].onDashboard)[i];
                  return (
                    <li key={d.label}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-semibold">{d.label}</span>
                        <span className="tabular font-extrabold">{scores[c] === null ? '—' : d.value}</span>
                      </div>
                      <Bar value={d.value} max={1000} color={`var(--c-${c})`} label={d.label} height={6} />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <p className="mt-3 text-xs text-muted">Bu skorlar eğlence amaçlı bir antrenman göstergesidir; IQ veya klinik ölçüm değildir.</p>
        </section>

        <section className="card p-6" aria-labelledby="weekly-title">
          <SectionTitle
            action={
              <Link to="/progress" className="text-sm font-semibold text-accent-strong hover:underline">
                Tüm ilerleme
              </Link>
            }
          >
            <span id="weekly-title">Haftalık ilerleme</span>
          </SectionTitle>
          {sessions.length === 0 ? (
            <EmptyState title="Grafik için oyun oyna" body="Son 7 günün ortalama oyun skoru burada görünür." />
          ) : (
            <ScoreLine data={weekly} label="Son 7 günün günlük ortalama oyun skoru" />
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2" aria-labelledby="recent-title">
          <SectionTitle>
            <span id="recent-title">Son oyunlar</span>
          </SectionTitle>
          {recent.length === 0 ? (
            <EmptyState title="Henüz oyun yok" body="İlk oyununu oynadığında burada listelenir." />
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((s) => {
                const Icon = GAME_ICONS[s.gameId];
                const meta = GAME_META[s.gameId];
                return (
                  <li key={s.id} className="flex items-center gap-3 py-3">
                    <IconTile category={meta.category} size={40}>
                      <Icon size={20} />
                    </IconTile>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{meta.name}</p>
                      <p className="text-xs text-muted">
                        {timeAgo(s.createdAt)} · %{Math.round(s.accuracy)} doğruluk
                      </p>
                    </div>
                    <p className="tabular text-xl font-extrabold">{s.score}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-5">
          <section className="card p-6" aria-labelledby="pb-title">
            <SectionTitle>
              <span id="pb-title">Kişisel rekorlar</span>
            </SectionTitle>
            {bests.length === 0 ? (
              <p className="text-sm text-muted">Rekorların burada toplanacak.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {bests.map((g) => (
                  <li key={g!.gameId} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-semibold">
                      <Trophy size={16} className="text-[color:var(--warning)]" aria-hidden />
                      {GAME_META[g!.gameId].name}
                    </span>
                    <span className="tabular font-extrabold">{formatScore(g!.bestScore)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-6" aria-labelledby="xp-title">
            <SectionTitle>
              <span id="xp-title">Seviye {xp.level}</span>
            </SectionTitle>
            <div className="flex items-center gap-2 text-sm text-muted">
              <Sparkles size={16} aria-hidden />
              <span className="tabular">
                {xp.into}/{xp.needed} XP
              </span>
            </div>
            <div className="mt-2">
              <Bar value={xp.into} max={xp.needed} label="Seviye ilerlemesi" />
            </div>
          </section>
        </div>
      </div>

      {next && (
        <p className="text-center text-sm text-muted">
          Sıradaki günlük oyun: <Link className="font-bold text-accent-strong hover:underline" to={`/games/${next}?daily=1`}>{GAME_META[next].name}</Link>
        </p>
      )}
    </div>
  );
}
