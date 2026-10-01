import { useState } from 'react';
import { Award, Lock } from 'lucide-react';
import { CATEGORIES, CATEGORY_ORDER, GAME_IDS, GAME_META, SKILL_LABELS } from '@shared/constants';
import { ACHIEVEMENT_ICONS } from '@/components/ui/icons';
import { Bar, SectionTitle } from '@/components/ui/primitives';
import { ACHIEVEMENT_DEFS, levelProgress } from '@/engine/gamification';
import { computeStreaks } from '@/engine/progress';
import { categoryScores } from '@/engine/skills';
import { useAppStore } from '@/store/useAppStore';
import { shortDate, dayKey } from '@/utils/date';
import { formatDuration } from '@/utils/date';

export default function Profile() {
  const profile = useAppStore((s) => s.profile);
  const setName = useAppStore((s) => s.setName);
  const skills = useAppStore((s) => s.skills);
  const games = useAppStore((s) => s.games);
  const sessions = useAppStore((s) => s.sessions);
  const achievements = useAppStore((s) => s.achievements);
  const [name, setNameDraft] = useState(profile.name);

  const xp = levelProgress(profile.xp);
  const streak = computeStreaks(sessions);
  const scores = categoryScores(skills);
  const totalSeconds = sessions.reduce((s, x) => s + x.duration, 0);
  const unlocked = ACHIEVEMENT_DEFS.filter((a) => achievements[a.id]).length;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Profil</h1>
        <p className="mt-1 text-muted">Seviyen, becerilerin ve başarımların.</p>
      </header>

      <section className="card grid gap-6 p-6 md:grid-cols-2" aria-labelledby="me-title">
        <div>
          <h2 id="me-title" className="eyebrow mb-2">Sen</h2>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setName(name);
            }}
          >
            <label htmlFor="name" className="visually-hidden">Adın</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={40}
              placeholder="Adını yaz (isteğe bağlı)"
              autoComplete="given-name"
              className="min-h-12 w-full rounded-2xl border border-line bg-surface-2 px-4"
            />
            <button type="submit" className="btn btn-primary">Kaydet</button>
          </form>
          <p className="mt-3 text-sm text-muted">Katılım: {shortDate(dayKey(profile.createdAt))} · {sessions.length} oyun · {formatDuration(totalSeconds)} antrenman</p>
        </div>
        <div>
          <p className="eyebrow mb-2">Seviye</p>
          <p className="tabular text-4xl font-black">{xp.level}</p>
          <div className="mt-2"><Bar value={xp.into} max={xp.needed} label="Seviye ilerlemesi" /></div>
          <p className="tabular mt-1 text-sm text-muted">{xp.into}/{xp.needed} XP · Seri: {streak.current} gün (en uzun {streak.longest})</p>
        </div>
      </section>

      <section className="card p-6" aria-labelledby="skills-title">
        <SectionTitle><span id="skills-title">Beceriler</span></SectionTitle>
        <div className="grid gap-5 md:grid-cols-2">
          {CATEGORY_ORDER.filter((c) => CATEGORIES[c].onDashboard).map((c) => (
            <div key={c}>
              <div className="mb-1 flex justify-between">
                <h3 className="font-bold">{CATEGORIES[c].label}</h3>
                <span className="tabular font-extrabold">{scores[c] === null ? '—' : Math.round(scores[c]!)}</span>
              </div>
              <Bar value={scores[c] ?? 0} max={1000} color={`var(--c-${c})`} label={CATEGORIES[c].label} height={6} />
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                {CATEGORIES[c].skills.map(({ id }) => (
                  <li key={id}>{SKILL_LABELS[id]}: <span className="tabular font-semibold text-ink">{skills[id] ? `${Math.round(skills[id]!.score)} (sv. ${skills[id]!.level})` : '—'}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6" aria-labelledby="bests-title">
        <SectionTitle><span id="bests-title">Oyun rekorları</span></SectionTitle>
        <ul className="grid gap-2 sm:grid-cols-2">
          {GAME_IDS.map((g) => (
            <li key={g} className="card-flat flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-semibold">{GAME_META[g].name}</span>
              <span className="tabular text-muted">{games[g]?.plays ? <><b className="text-ink">{games[g]!.bestScore}</b> · sv. {games[g]!.difficulty}</> : 'oynanmadı'}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-6" aria-labelledby="ach-title">
        <SectionTitle><span id="ach-title">Başarımlar ({unlocked}/{ACHIEVEMENT_DEFS.length})</span></SectionTitle>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENT_DEFS.map((a) => {
            const got = achievements[a.id];
            const Icon = got ? ACHIEVEMENT_ICONS[a.icon] ?? Award : Lock;
            return (
              <li key={a.id} className="card-flat flex items-start gap-3 p-4" style={got ? undefined : { opacity: 0.7 }}>
                <Icon size={22} className={got ? 'text-accent' : 'text-muted'} aria-hidden />
                <div>
                  <p className="font-bold leading-tight">{a.name} <span className="sr-only">{got ? '(kazanıldı)' : '(kilitli)'}</span></p>
                  <p className="text-xs text-muted">{a.description}</p>
                  {got && <p className="mt-1 text-xs text-success">Kazanıldı · {shortDate(dayKey(got))}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
