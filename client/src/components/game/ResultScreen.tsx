import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Award, LayoutDashboard, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { SKILL_LABELS } from '@shared/constants';
import type { GameId, SessionSummary } from '@shared/types';
import { GAME_META } from '@shared/constants';
import { ACHIEVEMENT_ICONS } from '@/components/ui/icons';
import { Bar, CategoryChip, Delta, LevelBadge, LevelProgress, SectionTitle } from '@/components/ui/primitives';
import { METADATA_LABELS } from '@/games/registry';
import { getTier, type GameModule } from '@/games/types';
import { useCountUp } from '@/hooks/useCountUp';
import { formatDuration } from '@/utils/date';
import type { DailyInfo } from './GameRunner';

interface Props {
  summary: SessionSummary;
  gameModule: GameModule;
  daily: DailyInfo | null;
  onReplay: () => void;
  onExit: () => void;
  onNextDaily: (next: GameId) => void;
  onFinishDaily: () => void;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card-flat px-4 py-3">
      <p className="eyebrow">{label}</p>
      <p className="tabular text-2xl font-extrabold">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function ResultScreen({ summary, gameModule, daily, onReplay, onExit, onNextDaily, onFinishDaily }: Props) {
  const { result } = summary;
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);
  const meta = gameModule.meta;
  const score = Math.round(useCountUp(result.score));
  const measured = meta.measuresReaction && result.reactionTime > 0;
  const metaEntries = Object.entries(result.metadata ?? {}).filter(([k]) => METADATA_LABELS[k]);
  const nextName = daily?.next ? GAME_META[daily.next].name : null;

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 py-8 sm:px-8">
      <main id="content" className="flex flex-col gap-5">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="card flex flex-col items-center gap-2 px-6 py-8 text-center"
          aria-labelledby="result-title"
        >
          <div className="flex flex-wrap items-center justify-center gap-2">
            <CategoryChip category={meta.category} />
            <span className="chip">{meta.name}</span>
          </div>
          <h1 id="result-title" className="eyebrow mt-2">
            Sonuç
          </h1>
          <p className="tabular text-7xl font-black leading-none tracking-tight sm:text-8xl" aria-label={`Skor ${result.score}`}>
            {score}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-sm">
            {summary.isPersonalBest ? (
              <span className="chip" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                <Trophy size={14} aria-hidden /> Yeni kişisel rekor
              </span>
            ) : summary.previousBest === null ? (
              <span className="chip">İlk kaydın</span>
            ) : (
              <span className="chip">Kişisel rekor: {summary.previousBest}</span>
            )}
            {summary.changePercent !== null && (
              <span className="chip">
                Önceki oyuna göre <Delta value={summary.changePercent} suffix="%" />
              </span>
            )}
          </div>
        </motion.section>

        <section aria-label="Oyun istatistikleri" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Doğruluk" value={`%${Math.round(result.accuracy)}`} sub={`${result.correctAnswers}/${result.attempts} doğru`} />
          <Stat label="Tepki süresi" value={measured ? `${(result.reactionTime / 1000).toFixed(2)} s` : '—'} sub={measured ? 'ortalama' : meta.measuresReaction ? 'doğru cevap yok' : 'bu oyunda ölçülmez'} />
          <Stat label="Hata" value={String(result.mistakes)} sub={`en uzun seri: ${result.combo}`} />
          <Stat label="Süre" value={formatDuration(result.duration)} />
          <div className="card-flat px-4 py-3">
            <p className="eyebrow mb-1">Zorluk</p>
            <LevelBadge difficulty={result.difficulty} size="sm" />
            <p className="tabular mt-1 text-xs text-muted">{result.difficulty}/100</p>
          </div>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="card p-5" aria-labelledby="perf-title">
            <SectionTitle>
              <span id="perf-title">Performans dağılımı</span>
            </SectionTitle>
            <div className="flex flex-col gap-3 text-sm">
              <Row label="Doğruluk" value={result.breakdown.accuracy} />
              {measured ? (
                <>
                  <Row label="Hız" value={result.breakdown.speed} />
                  <Row label="Tutarlılık" value={result.breakdown.consistency} />
                </>
              ) : (
                <p className="text-muted">Bu oyunda skor yalnızca doğruluğa dayanır.</p>
              )}
              {metaEntries.length > 0 && (
                <dl className="mt-1 grid grid-cols-2 gap-2 border-t border-line pt-3">
                  {metaEntries.map(([k, v]) => {
                    const def = METADATA_LABELS[k];
                    return (
                      <div key={k}>
                        <dt className="text-xs text-muted">{def.label}</dt>
                        <dd className="tabular font-bold">
                          {def.prefix && Number(v) > 0 ? def.prefix : ''}
                          {v}
                          {def.unit ? ` ${def.unit}` : ''}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              )}
            </div>
          </section>

          <section className="card p-5" aria-labelledby="diff-title">
            <SectionTitle>
              <span id="diff-title">Seviye değişimi</span>
            </SectionTitle>
            {/* Önceki → Sonraki kademe gösterimi */}
            {(() => {
              const before = getTier(summary.difficulty.before);
              const after = getTier(summary.difficulty.after);
              const levelUp = after.rank > before.rank;
              return (
                <>
                  <div className="mb-3 flex items-center gap-3">
                    <span style={{ opacity: 0.6 }}>
                      <span style={{ fontSize: 18 }}>{before.emoji}</span>
                    </span>
                    <span className="text-muted text-sm">→</span>
                    <span style={{ fontSize: 22 }}>{after.emoji}</span>
                    <div className="ml-1">
                      <p className="font-extrabold" style={{ color: after.color }}>{after.label}</p>
                      <p className="text-xs text-muted">{after.sublabel}</p>
                    </div>
                    {levelUp && (
                      <span className="chip ml-auto" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                        🎉 Seviye atladın!
                      </span>
                    )}
                  </div>
                  <LevelProgress difficulty={summary.difficulty.after} showLabels />
                  <p className="tabular mt-2 text-sm">
                    <span style={{ color: 'var(--muted)' }}>{summary.difficulty.before}</span>
                    <span className="mx-1 text-muted">→</span>
                    <span className="font-extrabold" style={{ color: after.color }}>{summary.difficulty.after}</span>
                    {' '}
                    <Delta value={summary.difficulty.delta} />
                  </p>
                  <p className="mt-1 text-sm text-muted">{summary.difficulty.reason}</p>
                </>
              );
            })()}

            <h3 className="eyebrow mb-2 mt-5">Beceri etkisi</h3>
            <ul className="flex flex-col gap-1.5 text-sm">
              {summary.skillDeltas.map((d) => (
                <li key={d.skill} className="flex items-center justify-between gap-3">
                  <span>{SKILL_LABELS[d.skill]}</span>
                  <span className="tabular">
                    {d.before === null ? (
                      <span className="font-bold">{Math.round(d.after)} <span className="text-muted font-normal">(ilk ölçüm)</span></span>
                    ) : (
                      <>
                        {Math.round(d.before)} → <span className="font-bold">{Math.round(d.after)}</span>{' '}
                        <Delta value={d.after - d.before} />
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="card flex flex-wrap items-center gap-x-6 gap-y-3 p-5" aria-label="Deneyim puanı">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-accent" aria-hidden />
            <p className="font-bold">
              <span className="tabular">+{summary.xpGained}</span> XP
            </p>
          </div>
          {summary.levelAfter > summary.levelBefore && (
            <p className="chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>
              Seviye atladın! → Seviye {summary.levelAfter}
            </p>
          )}
          {summary.streak > 0 && <p className="text-sm text-muted">Günlük seri: {summary.streak} gün</p>}
          {summary.dailyCompleted && (
            <p className="chip" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
              Günlük antrenman tamamlandı (+50 XP)
            </p>
          )}
        </section>

        {summary.unlockedAchievements.length > 0 && (
          <section className="card p-5" aria-label="Yeni başarımlar">
            <SectionTitle>Yeni başarım!</SectionTitle>
            <ul className="flex flex-wrap gap-3">
              {summary.unlockedAchievements.map((a) => {
                const Icon = ACHIEVEMENT_ICONS[a.icon] ?? Award;
                return (
                  <li key={a.id} className="card-flat flex items-center gap-3 px-4 py-3">
                    <Icon size={22} className="text-accent" aria-hidden />
                    <div>
                      <p className="font-bold leading-tight">{a.name}</p>
                      <p className="text-xs text-muted">{a.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <p className="text-center text-xs text-muted">
          Bu skorlar eğlenceli bir antrenman göstergesidir; IQ, tıbbi ölçüm veya klinik değerlendirme değildir.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {daily?.next ? (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => onNextDaily(daily.next!)} autoFocus>
              Sıradaki: {nextName} <ArrowRight size={20} aria-hidden />
            </button>
          ) : daily ? (
            <button type="button" className="btn btn-primary btn-lg" onClick={onFinishDaily} autoFocus>
              Antrenmanı bitir <ArrowRight size={20} aria-hidden />
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-lg" onClick={onReplay} autoFocus>
              <RotateCcw size={20} aria-hidden /> Tekrar oyna
            </button>
          )}
          {daily && (
            <button type="button" className="btn btn-lg" onClick={onReplay}>
              <RotateCcw size={20} aria-hidden /> Bu oyunu tekrarla
            </button>
          )}
          <button type="button" className="btn btn-lg" onClick={onExit}>
            <LayoutDashboard size={20} aria-hidden /> {daily ? 'Günlük antrenman' : 'Oyunlar'}
          </button>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between">
        <span>{label}</span>
        <span className="tabular font-bold">{Math.round(value)}</span>
      </div>
      <Bar value={value} label={label} />
    </div>
  );
}
