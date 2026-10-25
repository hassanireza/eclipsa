/* Shared kit for the level families: seeded randomness, word pools, and builders for the "given" Django code. */

export type Built = {
  prompt: string; target: string; hint: string; topic: string;
  starter?: string;
  /** Hidden fixtures shown to the learner as read-only "given" code. Runs before the learner's code. */
  setup?: string;
  /** Hidden check. Runs after the learner's code and prints what is being judged. */
  test?: string;
};
export type R = {
  int: (a: number, b: number) => number;
  pick: <T>(a: readonly T[]) => T;
  two: <T>(a: readonly T[]) => [T, T];
  nums: (n: number, a: number, b: number) => number[];
  uniq: (n: number, a: number, b: number) => number[];
  some: <T>(a: readonly T[], n: number) => T[];
};
export type Gen = (r: R) => Built;

export function rng(seed: number): R {
  let s = seed >>> 0;
  const next = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (a: number, b: number) => a + Math.floor(next() * (b - a + 1));
  const pick = <T,>(a: readonly T[]) => a[int(0, a.length - 1)];
  const two = <T,>(a: readonly T[]): [T, T] => { const x = pick(a); let y = pick(a); while (y === x) y = pick(a); return [x, y]; };
  const nums = (n: number, a: number, b: number) => Array.from({ length: n }, () => int(a, b));
  const uniq = (n: number, a: number, b: number) => { const o: number[] = []; while (o.length < n) { const v = int(a, b); if (!o.includes(v)) o.push(v); } return o; };
  const some = <T,>(a: readonly T[], n: number) => { const o: T[] = []; while (o.length < n) { const v = pick(a); if (!o.includes(v)) o.push(v); } return o; };
  return { int, pick, two, nums, uniq, some };
}

/** Join Python lines. Keeps the level sources readable and free of \n escapes. */
export const py = (...l: string[]) => l.join('\n');
export const b = (topic: string, prompt: string, target: string, hint: string, extra: Partial<Built> = {}): Built => ({ topic, prompt, target, hint, ...extra });

export const WORDS = ['corona', 'umbra', 'penumbra', 'zenith', 'nadir', 'relay', 'beacon', 'cipher', 'lantern', 'harbor', 'meadow', 'orchid', 'quartz', 'ember', 'tundra', 'willow', 'saffron', 'amber', 'basalt', 'comet', 'marble', 'vortex', 'pebble', 'ripple', 'violet', 'thistle', 'silver', 'midnight', 'copper', 'juniper'] as const;
export const cap = (w: string) => w[0].toUpperCase() + w.slice(1);
export const TITLES = WORDS.map(cap);
export const NAMES = ['Ada', 'Bo', 'Cleo', 'Dax', 'Eli', 'Faye', 'Gus', 'Hana', 'Ivo', 'Juno', 'Kai', 'Lena'] as const;
export const q = (s: string) => JSON.stringify(s);
export const list = (a: readonly (string | number)[]) => `[${a.map((x) => (typeof x === 'number' ? x : q(String(x)))).join(', ')}]`;

/** A model "kind": the class name plus its text and number fields. */
export type Ent = { M: string; s: string; n: string; lo: number; hi: number; what: string };
export const ENTS: readonly Ent[] = [
  { M: 'Book', s: 'title', n: 'pages', lo: 80, hi: 900, what: 'books' },
  { M: 'Album', s: 'name', n: 'tracks', lo: 6, hi: 24, what: 'albums' },
  { M: 'Recipe', s: 'title', n: 'minutes', lo: 5, hi: 150, what: 'recipes' },
  { M: 'Task', s: 'title', n: 'priority', lo: 1, hi: 9, what: 'tasks' },
  { M: 'Product', s: 'name', n: 'stock', lo: 0, hi: 220, what: 'products' },
  { M: 'Course', s: 'title', n: 'hours', lo: 2, hi: 60, what: 'courses' },
  { M: 'Plant', s: 'name', n: 'height', lo: 5, hi: 300, what: 'plants' },
  { M: 'Event', s: 'title', n: 'seats', lo: 20, hi: 500, what: 'events' },
  { M: 'Ticket', s: 'subject', n: 'votes', lo: 0, hi: 99, what: 'tickets' },
  { M: 'Trail', s: 'name', n: 'km', lo: 2, hi: 40, what: 'trails' },
];
export const lower = (e: Ent) => e.M.toLowerCase();

export type Row = [string, number];
/** `k` rows with distinct names and distinct numbers, so no ordering is ever ambiguous. */
export function rows(r: R, e: Ent, k = 5): Row[] {
  const names = r.some(TITLES, k), span = e.hi - e.lo + 1;
  const nums = span >= k * 3 ? r.uniq(k, e.lo, e.hi) : Array.from({ length: k }, (_, i) => e.lo + i);
  return names.map((n, i) => [n, nums[i]] as Row);
}
export const modelSrc = (e: Ent, extra: string[] = []) =>
  py(`class ${e.M}(models.Model):`, `    ${e.s} = models.CharField(max_length=60)`, `    ${e.n} = models.IntegerField()`, ...extra.map((x) => `    ${x}`));
export const rowsSrc = (e: Ent, rs: Row[]) =>
  py(`${e.M}.objects.bulk_create([`, ...rs.map(([a, n]) => `    ${e.M}(${e.s}=${q(a)}, ${e.n}=${n}),`), '])');
/** Model + a handful of rows, as the "given" block. */
export const world = (r: R, e: Ent, k = 5) => { const rs = rows(r, e, k); return { rs, setup: py(modelSrc(e), '', rowsSrc(e, rs)) }; };
export const names = (rs: Row[]) => rs.map((x) => x[0]);
export const byName = (rs: Row[]) => [...rs].sort((x, y) => (x[0] < y[0] ? -1 : 1));
export const byNum = (rs: Row[]) => [...rs].sort((x, y) => x[1] - y[1]);
export const median = (rs: Row[]) => byNum(rs)[Math.floor(rs.length / 2)][1];
