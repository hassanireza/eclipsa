import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v0.29.5/full/pyodide.mjs';
import workshopSource from './runtime/workshop.py?raw';

export type WorkerIn =
  | { type: 'warm' }
  | { type: 'run'; id: number; code: string; target: string; setup?: string; test?: string }
  | { type: 'exec'; id: number; code: string; stdin: string };
export type WorkerOut =
  | { type: 'ready' }
  | { type: 'running'; id: number }
  | { type: 'result'; id: number; actual: string; expected: string; solved: boolean }
  | { type: 'exec-result'; id: number; output: string; error?: string; ms: number }
  | { type: 'error'; id: number; message: string };

const OUTPUT_CAP = 200_000; // an endless print loop must not eat the phone's memory
/** Django and its two pure-Python dependencies ship inside the site, so a first launch needs no package index. */
const WHEELS = ['asgiref-3.13.0-py3-none-any.whl', 'sqlparse-0.6.0-py3-none-any.whl', 'django-5.2.18-py3-none-any.whl'];

type Workshop = { run: (code: string, setup: string, test: string) => string | undefined };
let runtime: Promise<{ py: any; shop: Workshop }> | null = null;
const post = (m: WorkerOut) => (self as unknown as Worker).postMessage(m);

async function start() {
  const py = await loadPyodide();
  await py.loadPackage('sqlite3');
  for (const name of WHEELS) {
    const res = await fetch(new URL(`${import.meta.env.BASE_URL}vendor/${name}`, self.location.origin).href);
    if (!res.ok) throw new Error(`Could not download ${name}`);
    py.unpackArchive(await res.arrayBuffer(), 'wheel');
  }
  py.FS.mkdirTree('/opt/eclipsa');
  py.FS.writeFile('/opt/eclipsa/workshop.py', workshopSource);
  py.runPython("import sys; sys.path.insert(0, '/opt/eclipsa')");
  const shop = py.pyimport('workshop') as Workshop & { boot: () => void };
  shop.boot();
  shop.run('pass', '', ''); // pre-imports the forms, auth and admin pieces so the first real run is quick
  return { py, shop };
}
const boot = () => (runtime ??= start().catch((e: unknown) => { runtime = null; throw e; }));

/** Runs one program in the workshop and returns everything it printed (prompts and typed answers included). */
function exec(rt: { py: any; shop: Workshop }, code: string, setup = '', test = '', stdin = ''): { output: string; error?: string } {
  const { py, shop } = rt;
  let output = '';
  const decOut = new TextDecoder(), decErr = new TextDecoder();
  const add = (s: string) => { if (output.length < OUTPUT_CAP) output += s; else if (!output.endsWith('…(output truncated)\n')) output += '\n…(output truncated)\n'; };
  py.setStdout({ write: (b: Uint8Array) => { add(decOut.decode(b, { stream: true })); return b.length; } });
  py.setStderr({ write: (b: Uint8Array) => { add(decErr.decode(b, { stream: true })); return b.length; } });
  const lines = stdin ? stdin.replace(/\r/g, '').replace(/\n$/, '').split('\n') : [];
  py.setStdin({ stdin: () => { if (!lines.length) return undefined; const l = lines.shift() as string; add(`${l}\n`); return l; } });
  try { const error = shop.run(code, setup, test); return error ? { output, error } : { output }; }
  catch (e) { return { output, error: String((e as Error)?.message ?? e).split('\n').slice(-4).join('\n') }; }
}

self.onmessage = async (event: MessageEvent<WorkerIn>) => {
  const msg = event.data;
  if (msg.type === 'warm') { try { await boot(); post({ type: 'ready' }); } catch { /* surfaced on the next run */ } return; }
  try {
    const rt = await boot();
    post({ type: 'ready' });
    post({ type: 'running', id: msg.id });
    if (msg.type === 'exec') {
      const t0 = performance.now();
      const r = exec(rt, msg.code, '', '', msg.stdin);
      post({ type: 'exec-result', id: msg.id, output: r.output, error: r.error, ms: Math.round(performance.now() - t0) });
      return;
    }
    const mine = exec(rt, msg.code, msg.setup, msg.test);
    if (mine.error) { post({ type: 'error', id: msg.id, message: mine.error.split('\n').slice(-5).join('\n') }); return; }
    const key = exec(rt, msg.target, msg.setup, msg.test);
    const actual = mine.output.trimEnd(), expected = key.output.trimEnd();
    post({ type: 'result', id: msg.id, actual, expected, solved: actual === expected });
  } catch (error) {
    post({ type: 'error', id: msg.id, message: String((error as Error)?.message ?? error).split('\n').slice(-4).join('\n') });
  }
};
