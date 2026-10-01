import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES, CATEGORY_ORDER, GAME_IDS, GAME_META } from '@shared/constants';
import type { GameId } from '@shared/types';
import { ScoreLine } from '@/components/charts/charts';
import { Delta, EmptyState, SectionTitle } from '@/components/ui/primitives';
import { comparePeriods, computeStreaks, dailySeries, filterByRange, sessionInCategory, summaryStats, type RangeDays } from '@/engine/progress';
import { useAppStore } from '@/store/useAppStore';
import { addDays, dayKey, formatDuration, shortDate } from '@/utils/date';

const RANGES: { value: RangeDays; label: string }[] = [
  { value: 7, label: '7 gün' },
  { value: 30, label: '30 gün' },
  { value: 90, label: '90 gün' },
  { value: null, label: 'Tümü' },
];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className="tabular mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

export default function Progress() {
  const sessions = useAppStore((s) => s.sessions);
  const [range, setRange] = useState<RangeDays>(30);
  const [gameId, setGameId] = useState<GameId>('memory-grid');

  const filtered = useMemo(() => filterByRange(sessions, range), [sessions, range]);
  const stats = useMemo(() => summaryStats(filtered), [filtered]);
  const streak = useMemo(() => computeStreaks(sessions), [sessions]);
  const overall = useMemo(() => dailySeries(filtered, (s) => s.score), [filtered]);
  const week = comparePeriods(sessions, 7);
  const month = comparePeriods(sessions, 30);

  const gameSessions = useMemo(() => filtered.filter((s) => s.gameId === gameId), [filtered, gameId]);
  const gameSeries = useMemo(() => dailySeries(gameSessions, (s) => s.score), [gameSessions]);

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-extrabold tracking-tight">İlerleme</h1>
        <EmptyState
          title="Henüz kayıt yok"
          body="İlk oyununu oynadığında skorların, doğruluğun ve gelişimin burada grafiklerle görünür."
          action={
            <Link to="/games" className="btn btn-primary">
              Oyunlara git
            </Link>
          }
        />
      </div>
    );
  }

  const toPoints = (series: ReturnType<typeof dailySeries>) => series.map((p) => ({ date: p.date, value: p.value }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">İlerleme</h1>
          <p className="mt-1 text-muted">Uzun vadeli gelişimini alan ve oyun bazında takip et.</p>
        </div>
        <div role="radiogroup" aria-label="Zaman aralığı" className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              role="radio"
              aria-checked={range === r.value}
              onClick={() => setRange(r.value)}
              className={`btn btn-sm ${range === r.value ? 'btn-primary' : ''}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <section aria-label="İstatistikler" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Oynanan oyun" value={String(stats.gamesPlayed)} />
        <Stat label="En iyi skor" value={String(stats.bestScore)} />
        <Stat label="Ortalama skor" value={String(Math.round(stats.averageScore))} />
        <Stat label="Ortalama doğruluk" value={`%${Math.round(stats.averageAccuracy)}`} />
        <Stat label="Ort. tepki süresi" value={stats.averageReactionTime > 0 ? `${(stats.averageReactionTime / 1000).toFixed(2)} s` : '—'} />
        <Stat label="Antrenman süresi" value={formatDuration(stats.trainingSeconds)} />
        <Stat label="Güncel seri" value={`${streak.current} gün`} />
        <Stat label="En uzun seri" value={`${streak.longest} gün`} />
      </section>

      <section className="card p-6" aria-labelledby="overall-title">
        <SectionTitle
          action={
            <div className="flex flex-wrap gap-3 text-sm">
              {week !== null && (
                <span>
                  Son 7 gün <Delta value={week} suffix="%" digits={1} />
                </span>
              )}
              {month !== null && (
                <span>
                  Son 30 gün <Delta value={month} suffix="%" digits={1} />
                </span>
              )}
            </div>
          }
        >
          <span id="overall-title">Genel skor</span>
        </SectionTitle>
        {overall.length === 0 ? (
          <EmptyState title="Bu aralıkta oyun yok" body="Daha geniş bir zaman aralığı seçmeyi dene." />
        ) : (
          <>
            <ScoreLine data={toPoints(overall)} label={`Genel skor grafiği, ${overall.length} gün`} height={260} />
            <DataTable caption="Genel skor — günlük ortalama" rows={overall.map((p) => [shortDate(p.date), String(p.value), `${p.count} oyun`])} />
          </>
        )}
      </section>

      <section aria-labelledby="cat-title">
        <h2 id="cat-title" className="mb-3 text-lg font-bold">
          Alanlara göre gelişim
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CATEGORY_ORDER.filter((c) => CATEGORIES[c].onDashboard).map((c) => {
            const series = dailySeries(
              filtered.filter((s) => sessionInCategory(s.gameId, c)),
              (s) => s.score,
            );
            return (
              <div key={c} className="card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-bold">{CATEGORIES[c].label}</h3>
                  <span className="tabular text-sm text-muted">{series.length ? `son: ${series[series.length - 1].value}` : '—'}</span>
                </div>
                {series.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted">Bu aralıkta veri yok.</p>
                ) : (
                  <ScoreLine data={toPoints(series)} color={`var(--c-${c})`} height={150} label={`${CATEGORIES[c].label} skor grafiği`} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card p-6" aria-labelledby="game-title">
        <SectionTitle>
          <span id="game-title">Oyun geçmişi</span>
        </SectionTitle>
        <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Oyun seç">
          {GAME_IDS.map((g) => (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={gameId === g}
              onClick={() => setGameId(g)}
              className={`btn btn-sm ${gameId === g ? 'btn-primary' : ''}`}
            >
              {GAME_META[g].name}
            </button>
          ))}
        </div>
        {gameSessions.length === 0 ? (
          <EmptyState title={`${GAME_META[gameId].name} için kayıt yok`} body="Seçili aralıkta bu oyunu henüz oynamadın." />
        ) : (
          <>
            <ScoreLine data={toPoints(gameSeries)} height={200} label={`${GAME_META[gameId].name} skor geçmişi`} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <caption className="sr-only">{GAME_META[gameId].name} son oturumlar</caption>
                <thead className="text-xs text-muted">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-semibold">Tarih</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Skor</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Doğruluk</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Tepki</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Zorluk</th>
                    <th scope="col" className="py-2 font-semibold">Süre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {gameSessions
                    .slice(-8)
                    .reverse()
                    .map((s) => (
                      <tr key={s.id}>
                        <td className="py-2 pr-3">{shortDate(dayKey(s.createdAt))}</td>
                        <td className="tabular py-2 pr-3 font-bold">{s.score}</td>
                        <td className="tabular py-2 pr-3">%{Math.round(s.accuracy)}</td>
                        <td className="tabular py-2 pr-3">{s.reactionTime > 0 ? `${(s.reactionTime / 1000).toFixed(2)} s` : '—'}</td>
                        <td className="tabular py-2 pr-3">{s.difficulty}</td>
                        <td className="tabular py-2">{formatDuration(s.duration)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <p className="text-center text-xs text-muted">
        Grafikler {shortDate(addDays(dayKey(), range ? -(range - 1) : 0))} → bugün arasındaki günlük ortalamalardır. Skorlar bir IQ ya da klinik ölçüm değildir.
      </p>
    </div>
  );
}

function DataTable({ caption, rows }: { caption: string; rows: string[][] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-semibold text-accent-strong">Veriyi tablo olarak göster</summary>
      <div className="mt-2 max-h-56 overflow-auto">
        <table className="w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead className="text-xs text-muted">
            <tr>
              <th scope="col" className="py-1 pr-3">Gün</th>
              <th scope="col" className="py-1 pr-3">Ortalama skor</th>
              <th scope="col" className="py-1">Oyun</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]}>
                <th scope="row" className="py-1 pr-3 font-medium">{r[0]}</th>
                <td className="tabular py-1 pr-3">{r[1]}</td>
                <td className="py-1">{r[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
