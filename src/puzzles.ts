/* Procedural puzzle library for levels 21 to 1000.
   Every level is a small Django program, written from a seeded family, with a solution of at most 20 lines.
   The answer key is run through the same real Django workshop as the learner's code, and the two outputs are compared.
   `buildLevels` guarantees that no two prompts are identical. */
import { rng, type Built, type Gen } from './tiers/kit';
import { T1 } from './tiers/t1';
import { T2 } from './tiers/t2';
import { T3 } from './tiers/t3';
import { T4 } from './tiers/t4';
import { T5 } from './tiers/t5';
import { T6 } from './tiers/t6';
import { T7 } from './tiers/t7';
import { T8 } from './tiers/t8';
import { T9 } from './tiers/t9';
import { T10 } from './tiers/t10';

export type { Built };
export const TIERS: Gen[][] = [T1, T2, T3, T4, T5, T6, T7, T8, T9, T10];
/** Levels per tier. Each tier spans whole 20-level chapters (5 chapters, the last tier 4), so chapter names can follow the curriculum. */
export const TIER_SIZES = [100, 100, 100, 100, 100, 100, 100, 100, 100, 80] as const;
export const FAMILY_COUNT = TIERS.reduce((n, t) => n + t.length, 0);

const ADJ = ['Hidden', 'Brass', 'Mint', 'Quiet', 'Pale', 'Gilded', 'Drawn', 'Etched', 'Folded', 'Inked', 'Veiled', 'Silent', 'Steady', 'Bright', 'Sealed', 'Measured', 'Threaded', 'Plotted', 'Latched', 'Winding', 'Narrow', 'Linked', 'Copper', 'Slate', 'Open', 'Lit', 'Held', 'Wired', 'Banked', 'Tuned', 'Ruled', 'Mapped', 'Cold', 'Warm', 'Deep'];
const NOUN = ['Relay', 'Gate', 'Circuit', 'Junction', 'Ledger', 'Switch', 'Signal', 'Channel', 'Conduit', 'Archive', 'Router', 'Beacon', 'Lantern', 'Socket', 'Valve', 'Trace', 'Frame', 'Header', 'Lever', 'Bridge', 'Panel', 'Compass', 'Spindle', 'Hatch', 'Index', 'Corona', 'Umbra', 'Bearing'];
export const titleFor = (i: number) => { const a = i % ADJ.length; return `${ADJ[a]} ${NOUN[(Math.floor(i / ADJ.length) + a) % NOUN.length]}`; };

export type Level = Built & { id: number; tier: number };

/** Builds levels `from` to `to` (inclusive). Guarantees unique prompts and solutions of at most 20 lines. */
export function buildLevels(from: number, to: number, seen: Set<string> = new Set()): Level[] {
  const out: Level[] = [];
  const bounds: number[] = []; let acc = from; for (const s of TIER_SIZES) { bounds.push(acc); acc += s; }
  for (let id = from; id <= to; id++) {
    let tier = bounds.length; while (tier > 1 && id < bounds[tier - 1]) tier--;
    const j = id - bounds[tier - 1], fams = TIERS[tier - 1];
    const cycle = Math.floor(j / fams.length), order = fams.map((_, k) => k).sort((x, y) => ((x * 2654435761 + cycle * 40503 + tier) % 997) - ((y * 2654435761 + cycle * 40503 + tier) % 997));
    let made: Built | null = null;
    for (let attempt = 0; attempt < 400 && !made; attempt++) {
      const fam = fams[order[(j + attempt) % fams.length]];
      const cand = fam(rng(id * 7919 + attempt * 104729 + tier));
      if (!seen.has(cand.prompt) && cand.target.split('\n').length <= 20) made = cand;
    }
    if (!made) throw new Error(`Could not build a unique level ${id}`);
    seen.add(made.prompt);
    out.push({ ...made, id, tier });
  }
  return out;
}

/** Development helper: `n` seeded samples of every family, used by scripts/check-levels.py to stress each one. */
export function sampleFamilies(n: number): Array<Built & { tier: number; family: number; seed: number }> {
  const out: Array<Built & { tier: number; family: number; seed: number }> = [];
  TIERS.forEach((fams, t) => fams.forEach((fam, f) => { for (let k = 0; k < n; k++) { const seed = 1000 + k * 7919 + f * 31 + t * 977; out.push({ ...fam(rng(seed)), tier: t + 1, family: f, seed }); } }));
  return out;
}
