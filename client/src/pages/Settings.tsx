import type { ReactNode } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { GAME_IDS, GAME_META } from '@shared/constants';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { dayKey } from '@/utils/date';

function Toggle({ id, checked, onChange, label, hint }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </label>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-6 w-11 shrink-0 cursor-pointer" />
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="mb-1 text-lg font-bold">{title}</h2>
      <div className="divide-y divide-line">{children}</div>
    </section>
  );
}

export default function Settings() {
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const resetAll = useAppStore((s) => s.resetAll);
  const { pinned, effective, toggle, followSystem } = useTheme();

  function exportData() {
    const { profile, sessions, games, skills, daily, achievements } = useAppStore.getState();
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), profile, sessions, games, skills, daily, achievements }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neuroloop-${dayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    if (window.confirm('Tüm oyun geçmişin, skorların, XP’n ve başarımların silinecek. Bu işlem geri alınamaz. Devam edilsin mi?')) resetAll();
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Ayarlar</h1>
        <p className="mt-1 text-muted">Tüm verilerin yalnızca bu tarayıcıda saklanır.</p>
      </header>

      <Group title="Görünüm">
        <div className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="font-semibold">Tema</p>
            <p className="text-sm text-muted">{pinned ? `${effective === 'dark' ? 'Koyu' : 'Açık'} tema sabitlendi.` : `Sistem tercihi izleniyor (şu an ${effective === 'dark' ? 'koyu' : 'açık'}).`}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-sm" onClick={toggle}>{pinned ? 'Sistemi izle' : effective === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}</button>
            {pinned && <button type="button" className="btn btn-sm" onClick={followSystem}>Sıfırla</button>}
          </div>
        </div>
        <Toggle id="rm" checked={settings.reducedMotion} onChange={(v) => update({ reducedMotion: v })} label="Hareketi azalt" hint="Animasyonları ve geçişleri en aza indirir." />
        <Toggle id="ca" checked={settings.colorAssist} onChange={(v) => update({ colorAssist: v })} label="Renk yardımcısı" hint="Renkli şekillerin üzerine harf koyar (K, M, Y, S, P, T)." />
        <Toggle id="snd" checked={settings.sound} onChange={(v) => update({ sound: v })} label="Ses efektleri" hint="Doğru/yanlış ve geri sayım sesleri." />
      </Group>

      <Group title="Günlük antrenman">
        <div className="flex items-center justify-between gap-4 py-3">
          <label htmlFor="cnt" className="font-semibold">Plandaki oyun sayısı</label>
          <select id="cnt" value={settings.dailyGameCount} onChange={(e) => update({ dailyGameCount: Number(e.target.value) })} className="min-h-11 rounded-xl border border-line bg-surface-2 px-3">
            {[3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} oyun</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <label htmlFor="goal" className="font-semibold">Günlük hedef</label>
          <select id="goal" value={settings.dailyGoal} onChange={(e) => update({ dailyGoal: Number(e.target.value) })} className="min-h-11 rounded-xl border border-line bg-surface-2 px-3">
            {[1, 2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n} oyun</option>)}
          </select>
        </div>
        <fieldset className="py-3">
          <legend className="mb-2 font-semibold">Plana girebilecek oyunlar</legend>
          <div className="grid gap-x-6 sm:grid-cols-2">
            {GAME_IDS.map((g) => {
              const enabled = !settings.disabledGames.includes(g);
              return (
                <Toggle
                  key={g}
                  id={`g-${g}`}
                  checked={enabled}
                  label={GAME_META[g].name}
                  onChange={(v) => {
                    const next = v ? settings.disabledGames.filter((x) => x !== g) : [...settings.disabledGames, g];
                    if (next.length < GAME_IDS.length) update({ disabledGames: next });
                  }}
                />
              );
            })}
          </div>
        </fieldset>
      </Group>

      <Group title="Veri">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="font-semibold">Verini dışa aktar</p>
            <p className="text-sm text-muted">Oturumlar, skorlar ve başarımlar JSON olarak iner.</p>
          </div>
          <button type="button" className="btn" onClick={exportData}><Download size={18} aria-hidden /> Dışa aktar</button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="font-semibold">Tüm ilerlemeyi sıfırla</p>
            <p className="text-sm text-muted">Ayarların korunur; geçmiş, skor ve XP silinir.</p>
          </div>
          <button type="button" className="btn btn-danger" onClick={reset}><Trash2 size={18} aria-hidden /> Sıfırla</button>
        </div>
      </Group>
    </div>
  );
}
