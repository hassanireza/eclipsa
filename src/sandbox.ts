import { STARTER } from './examples';

const KEY = 'eclipsa.sandbox.v1';
export type Sandbox = { code: string; stdin: string };

export function loadSandbox(): Sandbox {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s.code === 'string') return { code: s.code, stdin: typeof s.stdin === 'string' ? s.stdin : '' };
  } catch { /* fall through */ }
  return { code: STARTER, stdin: '' };
}
export function saveSandbox(s: Sandbox) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode / quota */ } }
