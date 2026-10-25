import { LEVEL_COUNT } from './episodes';

export type Progress = { done: number[]; streak: number; lastDay: string; xp: number };
export const SAVE_KEY = 'eclipsa.save.v1';
export const emptyProgress = (): Progress => ({ done: [], streak: 0, lastDay: '', xp: 0 });

/** Local calendar day (the old UTC version broke streaks for anyone not in UTC). */
export const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayNumber = (day: string) => { const [y, m, d] = day.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };

export function readProgress(): Progress {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    const done = Array.isArray(s.done) ? [...new Set<number>(s.done.filter((n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= LEVEL_COUNT))] : [];
    return { done, streak: Number(s.streak) || 0, lastDay: typeof s.lastDay === 'string' ? s.lastDay : '', xp: Number(s.xp) || 0 };
  } catch { return emptyProgress(); }
}
export function writeProgress(p: Progress) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(p)); } catch { /* private mode / quota */ } }

export function applySolve(p: Progress, id: number, xp: number): Progress {
  if (p.done.includes(id)) return p;
  const day = localDay();
  const gap = p.lastDay ? dayNumber(day) - dayNumber(p.lastDay) : Infinity;
  return { done: [...p.done, id], xp: p.xp + xp, lastDay: day, streak: gap === 1 ? p.streak + 1 : gap === 0 ? Math.max(1, p.streak) : 1 };
}

/** A streak is only alive if you played today or yesterday; the stored value goes stale otherwise. */
export function liveStreak(p: Progress): number {
  if (!p.lastDay) return 0;
  const gap = dayNumber(localDay()) - dayNumber(p.lastDay);
  return gap <= 1 ? p.streak : 0;
}

/** First level not yet solved, or null when the whole path is lit. */
export function nextLevel(p: Progress): number | null {
  const done = new Set(p.done);
  for (let i = 1; i <= LEVEL_COUNT; i++) if (!done.has(i)) return i;
  return null;
}
