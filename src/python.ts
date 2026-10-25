import type { WorkerIn, WorkerOut } from './python.worker';

export type RunResult = { actual: string; expected: string; solved: boolean };
export type ExecResult = { output: string; error?: string; ms: number };
export type RuntimeState = 'idle' | 'loading' | 'ready';

const LOAD_LIMIT = 180_000;     // first launch downloads the Python runtime and Django (about 20 MB)
export const QUIZ_LIMIT = 20_000; // protects levels against `while True:` (Django in WebAssembly is slower than desktop Python)
export const SANDBOX_LIMIT = 15_000;

let worker: Worker | null = null;
let state: RuntimeState = 'idle';
let nextId = 1;
type Pending = { id: number; limit: number; resolve: (v: any) => void; reject: (e: Error) => void; timer: number };
let pending: Pending | null = null;
const listeners = new Set<(s: RuntimeState) => void>();
const setState = (s: RuntimeState) => { state = s; listeners.forEach((l) => l(s)); };

export const runtimeState = () => state;
export function subscribeRuntime(fn: (s: RuntimeState) => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

function kill(reason?: Error) {
  worker?.terminate(); worker = null; setState('idle');
  if (pending) { window.clearTimeout(pending.timer); pending.reject(reason ?? new Error('cancelled')); pending = null; }
}

function spawn() {
  if (worker) return worker;
  worker = new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<WorkerOut>) => {
    const m = e.data;
    if (m.type === 'ready') { setState('ready'); return; }
    if (!pending || ('id' in m && m.id !== pending.id)) return;
    if (m.type === 'running') { window.clearTimeout(pending.timer); pending.timer = window.setTimeout(() => kill(new Error('TIMEOUT_RUN')), pending.limit); return; }
    window.clearTimeout(pending.timer);
    const p = pending; pending = null;
    if (m.type === 'result') p.resolve({ actual: m.actual, expected: m.expected, solved: m.solved } satisfies RunResult);
    else if (m.type === 'exec-result') p.resolve({ output: m.output, error: m.error, ms: m.ms } satisfies ExecResult);
    else p.reject(new Error(m.message));
  };
  worker.onerror = () => kill(new Error('START_FAILED'));
  return worker;
}

/** Start downloading Python and Django while the learner reads, so Run feels instant. */
export function warmUp() { if (state === 'idle') { setState('loading'); spawn().postMessage({ type: 'warm' } satisfies WorkerIn); } }

/** Stops whatever is running (the worker is replaced; Python reloads from cache on the next run). */
export function cancelRun() { if (pending) kill(); }

function send<T>(build: (id: number) => WorkerIn, limit: number): Promise<T> {
  if (pending) kill();
  if (state === 'idle') setState('loading');
  const w = spawn();
  return new Promise<T>((resolve, reject) => {
    const id = nextId++;
    pending = { id, limit, resolve, reject, timer: window.setTimeout(() => kill(new Error('TIMEOUT_LOAD')), LOAD_LIMIT) };
    w.postMessage(build(id));
  });
}

/** Level check: run the learner's code and the answer key, compare outputs. */
export const runPython = (req: { code: string; target: string; setup?: string; test?: string }) => send<RunResult>((id) => ({ type: 'run', id, ...req }), QUIZ_LIMIT);
/** Free terminal: run code with optional stdin lines, return the raw console output. */
export const execPython = (code: string, stdin: string) => send<ExecResult>((id) => ({ type: 'exec', id, code, stdin }), SANDBOX_LIMIT);
