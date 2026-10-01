const pad = (n: number) => String(n).padStart(2, '0');

/** Yerel saat dilimine göre YYYY-MM-DD anahtarı. */
export function dayKey(input: Date | string | number = new Date()): string {
  const d = input instanceof Date ? input : new Date(input);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** YYYY-MM-DD anahtarını yerel gece yarısına çevirir. */
export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** İki gün anahtarı arasındaki gün farkı (b - a). */
export function diffDays(a: string, b: string): number {
  const ms = parseDayKey(b).getTime() - parseDayKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function addDays(key: string, days: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + days);
  return dayKey(d);
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export function shortDate(key: string): string {
  const d = parseDayKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s} sn`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk${s % 60 ? ` ${s % 60} sn` : ''}`;
  const h = Math.floor(m / 60);
  return `${h} sa ${m % 60} dk`;
}
