export function timeAgo(iso: string, now: number = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'az önce';
  if (min < 60) return `${min} dk önce`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} sa önce`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'dün';
  return `${d} gün önce`;
}

export function formatScore(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : String(Math.round(n));
}
