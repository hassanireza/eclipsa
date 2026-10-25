// Writes the generated levels (or stress samples of every family) as JSON, for scripts/check-levels.py.
//   npx tsx scripts/dump-levels.ts levels  > levels.json
//   npx tsx scripts/dump-levels.ts samples 12 > samples.json
const [mode = 'levels', n = '12'] = process.argv.slice(2);
const data = mode === 'samples' ? (await import('../src/puzzles')).sampleFamilies(Number(n)) : (await import('../src/questions')).questions;
process.stdout.write(JSON.stringify(data));
