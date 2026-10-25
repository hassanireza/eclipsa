import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Code2, Keyboard, Play, Square, Terminal, Trash2, Undo2 } from 'lucide-react';
import { Accessory, keepFocus } from '../components/Accessory';
import { CodeEditor, type EditorHandle } from '../components/CodeEditor';
import { Sheet } from '../components/Sheet';
import { EXAMPLES, type Example } from '../examples';
import { useEditing } from '../hooks';
import { cancelRun, execPython, runtimeState, subscribeRuntime, warmUp, type RuntimeState } from '../python';
import { loadSandbox, saveSandbox } from '../sandbox';

type Run = { state: 'idle' | 'running' | 'done' | 'error' | 'stopped'; output: string; error?: string; ms?: number };
type Undo = { code: string; stdin: string; label: string };

/** A free scratchpad: write any Python, optionally feed input() lines, run it, see the console. Nothing here affects progress. */
export function TerminalScreen({ onBack }: { onBack: () => void }) {
  const saved = useMemo(loadSandbox, []);
  const [code, setCode] = useState(saved.code);
  const [stdin, setStdin] = useState(saved.stdin);
  const [run, setRun] = useState<Run>({ state: 'idle', output: '' });
  const [rt, setRt] = useState<RuntimeState>(runtimeState());
  const [sheet, setSheet] = useState(false);
  const [inputOpen, setInputOpen] = useState(false);
  const [undo, setUndo] = useState<Undo | null>(null);
  const editor = useRef<EditorHandle>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const token = useRef(0);
  const pendingScroll = useRef(false);
  const editing = useEditing();
  const running = run.state === 'running';
  const needsInput = /\binput\s*\(/.test(code);
  const inputVisible = inputOpen;
  const lines = code.trim() ? code.replace(/\s+$/, '').split('\n').length : 0;

  useEffect(() => subscribeRuntime(setRt), []);
  // Open the Input panel once when the code starts asking for input(); after that it stays however the user leaves it.
  useEffect(() => { if (needsInput && !stdin.trim()) setInputOpen(true); }, [needsInput]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { warmUp(); window.scrollTo(0, 0); }, []);
  useEffect(() => { const t = window.setTimeout(() => saveSandbox({ code, stdin }), 400); return () => window.clearTimeout(t); }, [code, stdin]);
  useEffect(() => { if (!undo) return; const t = window.setTimeout(() => setUndo(null), 7000); return () => window.clearTimeout(t); }, [undo]);
  useEffect(() => () => { token.current++; cancelRun(); }, []);
  useEffect(() => {
    if (!editing && pendingScroll.current) {
      pendingScroll.current = false;
      const t = window.setTimeout(() => consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 180);
      return () => window.clearTimeout(t);
    }
  }, [editing]);

  async function start() {
    if (running) return;
    if (editing) pendingScroll.current = true; else requestAnimationFrame(() => consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    (document.activeElement as HTMLElement | null)?.blur?.();
    const t = ++token.current;
    setRun({ state: 'running', output: '' });
    try {
      const r = await execPython(code, stdin);
      if (t !== token.current) return;
      setRun({ state: r.error ? 'error' : 'done', output: r.output, error: r.error, ms: r.ms });
    } catch (e) {
      if (t !== token.current) return;
      const m = (e as Error).message;
      setRun({ state: 'error', output: '', error: m === 'TIMEOUT_RUN' ? 'Stopped after 15 seconds. Check for a loop that never ends.' : m === 'TIMEOUT_LOAD' || m === 'START_FAILED' ? 'Django could not load. Check your connection and tap Run again.' : m });
    }
  }
  function stop() { token.current++; cancelRun(); setRun({ state: 'stopped', output: '' }); }

  const replace = (next: { code: string; stdin: string }, label: string) => { setUndo({ code, stdin, label }); setCode(next.code); setStdin(next.stdin); setRun({ state: 'idle', output: '' }); };
  const useExample = (e: Example) => { setSheet(false); replace({ code: e.code, stdin: e.stdin ?? '' }, `Loaded “${e.title}”`); };

  const status = run.state === 'running' ? 'RUNNING' : run.state === 'done' ? `DONE · ${run.ms} MS` : run.state === 'error' ? 'ERROR' : run.state === 'stopped' ? 'STOPPED' : 'READY';
  const eof = !!run.error && /EOFError/.test(run.error);
  const runAction = running
    ? <button className="danger run-mini" onPointerDown={keepFocus} onClick={stop}><Square size={14} fill="currentColor" /> Stop</button>
    : <button className="primary run-mini" onPointerDown={keepFocus} onClick={start}><Play size={15} fill="currentColor" /> Run</button>;

  return (
    <div className="workspace play terminal">
      <div className="focus-bar">
        <button className="done" onClick={() => editor.current?.blur()}><ChevronDown size={18} /> Done</button>
        <span className="focus-title"><Terminal size={14} /> Terminal</span>
      </div>

      <div className="play-bar">
        <button className="back" onClick={onBack}><ChevronLeft size={18} /> MAP</button>
        <div className="level-no">SANDBOX</div>
        <div className="play-bar-end" aria-hidden="true" />
      </div>

      <div className="question-head sandbox-head">
        <div className="eyebrow">FREE PLAY</div>
        <h1>Terminal</h1>
        <p>Write any Django or Python and run it. Your code is saved on this device, and nothing here counts toward your path.</p>
      </div>

      <div className="card editor-card">
        <div className="card-top">
          <span><Code2 size={14} /> main.py</span>
          <span className={`rt rt-${rt}`}>{rt === 'ready' ? 'DJANGO READY' : rt === 'loading' ? 'DJANGO WAKING' : 'DJANGO ASLEEP'}</span>
          <span className="lines">{lines} {lines === 1 ? 'line' : 'lines'}</span>
          <button className="icon-btn" onClick={() => code && replace({ code: '', stdin }, 'Editor cleared')} aria-label="Clear editor" disabled={!code}><Trash2 size={16} /></button>
        </div>
        <div className="editor"><CodeEditor ref={editor} value={code} onChange={setCode} /></div>
      </div>

      <div className="card input-card">
        <button className="card-top toggle" onClick={() => setInputOpen((o) => !o)} aria-expanded={inputVisible}>
          <span><Keyboard size={14} /> INPUT</span>
          <span className="hint-line">{needsInput && !stdin.trim() ? 'your code calls input()' : stdin.trim() ? `${stdin.replace(/\n$/, '').split('\n').length} line(s) ready` : 'optional'}</span>
          <ChevronRight size={16} className={`chev${inputVisible ? ' open' : ''}`} />
        </button>
        {inputVisible && (
          <textarea className="stdin" value={stdin} onChange={(e) => setStdin(e.target.value)} rows={3} placeholder={'One line per input() call, in order.\nExample:\nAda\n30'}
            autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label="Lines used to answer input() calls" />
        )}
      </div>

      <div className="card output-card" ref={consoleRef}>
        <div className="card-top">
          <span><Terminal size={14} /> CONSOLE</span>
          <span className={`status s-${run.state === 'error' ? 'error' : run.state === 'running' ? 'busy' : run.state === 'done' ? 'ok' : 'idle'}`}>{status}</span>
          <button className="icon-btn" onClick={() => setRun({ state: 'idle', output: '' })} aria-label="Clear console" disabled={run.state === 'idle' || running}><Trash2 size={16} /></button>
        </div>
        <pre aria-live="polite">
          {run.state === 'idle' && <span className="muted">Run your code to see its output here.</span>}
          {run.state === 'running' && <span className="muted">{rt === 'ready' ? 'Running…' : 'Starting Django. First launch downloads the runtime…'}</span>}
          {run.state === 'stopped' && <span className="muted">Stopped.</span>}
          {(run.state === 'done' || run.state === 'error') && <>{run.output}{run.state === 'done' && !run.output && <span className="muted">(finished with no output)</span>}{run.error && <span className="err">{run.error}</span>}</>}
        </pre>
        {eof && <div className="verdict bad"><div><b>input() ran out of lines.</b><span>Add one line per input() call in the Input panel above, then run again.</span></div></div>}
      </div>

      {undo && <div className="toast" role="status"><span>{undo.label}</span><button onClick={() => { setCode(undo.code); setStdin(undo.stdin); setUndo(null); }}><Undo2 size={15} /> Undo</button></div>}

      <div className="dock play-dock">
        <div className="actions">
          <button className="ghost" onClick={() => setSheet(true)}><BookOpen size={17} /> Examples</button>
          {running
            ? <button className="danger run-btn" onClick={stop}><Square size={14} fill="currentColor" /> Stop</button>
            : <button className="primary run-btn" onClick={start}><Play size={15} fill="currentColor" /> Run code</button>}
        </div>
      </div>

      <Accessory editor={editor} action={runAction} />

      {sheet && (
        <Sheet eyebrow="START FROM" title="Examples" onClose={() => setSheet(false)}>
          <div className="example-list">
            {EXAMPLES.map((e) => (
              <button key={e.id} className="example" onClick={() => useExample(e)}>
                <span><b>{e.title}</b><small>{e.blurb}</small></span><ChevronRight size={18} />
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}
