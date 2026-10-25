import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronLeft, Code2, Eye, Lightbulb, Play, RotateCcw, Cog, Terminal } from 'lucide-react';
import { Accessory, keepFocus } from '../components/Accessory';
import { CodeEditor, type EditorHandle } from '../components/CodeEditor';
import { LEVEL_COUNT } from '../episodes';
import { useEditing } from '../hooks';
import { questions } from '../questions';
import { runPython, runtimeState, subscribeRuntime, warmUp, type RuntimeState } from '../python';

type Verdict = { kind: 'idle' } | { kind: 'busy'; text: string } | { kind: 'ok'; fresh: boolean } | { kind: 'wrong' } | { kind: 'error'; text: string };
type Props = { id: number; solved: boolean; onSolve: (id: number, xp: number) => void; onOpen: (id: number) => void; onBack: () => void };

function GivenBlock({ code }: { code: string }) {
  const long = code.split('\n').length > 9;
  const [open, setOpen] = useState(!long);
  return (
    <div className={`given${open ? '' : ' shut'}`}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}><Code2 size={13} /><span>GIVEN · READ ONLY</span><span>{open ? 'hide' : `${code.split('\n').length} lines`}</span></button>
      <pre>{code}</pre>
    </div>
  );
}

export function PlayScreen({ id, solved, onSolve, onOpen, onBack }: Props) {
  const q = questions[id - 1];
  const [code, setCode] = useState(q.starter);
  const [output, setOutput] = useState('');
  const [expected, setExpected] = useState('');
  const [verdict, setVerdict] = useState<Verdict>({ kind: 'idle' });
  const [attempts, setAttempts] = useState(0);
  const [hint, setHint] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [rt, setRt] = useState<RuntimeState>(runtimeState());
  const editor = useRef<EditorHandle>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const runToken = useRef(0);
  const pendingScroll = useRef(false);
  const editing = useEditing();
  const busy = verdict.kind === 'busy';
  const lines = useMemo(() => (code.trim() ? code.replace(/\s+$/, '').split('\n').length : 0), [code]);

  useEffect(() => subscribeRuntime(setRt), []);
  useEffect(() => { warmUp(); window.scrollTo(0, 0); }, []);
  useEffect(() => () => { runToken.current++; }, []);
  // After the keyboard closes, bring the result into view (the layout changes back from focus mode first).
  useEffect(() => {
    if (!editing && pendingScroll.current) {
      pendingScroll.current = false;
      const t = window.setTimeout(() => outRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 180);
      return () => window.clearTimeout(t);
    }
  }, [editing]);

  async function run() {
    if (busy) return;
    if (editing) pendingScroll.current = true; else requestAnimationFrame(() => outRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    editor.current?.blur();
    const token = ++runToken.current;
    setReveal(false);
    setVerdict({ kind: 'busy', text: rt === 'ready' ? 'Running your code…' : 'Starting Django. First launch downloads the runtime…' });
    try {
      const r = await runPython({ code, target: q.target, setup: q.setup, test: q.test });
      if (token !== runToken.current) return;
      setOutput(r.actual || (q.test ? 'Your code ran without errors, but the checker printed nothing.' : 'Program finished with no output.'));
      setExpected(r.expected);
      if (r.solved) { setVerdict({ kind: 'ok', fresh: !solved }); onSolve(q.id, q.xp); navigator.vibrate?.(24); }
      else { setVerdict({ kind: 'wrong' }); setAttempts((a) => a + 1); }
    } catch (e) {
      if (token !== runToken.current) return;
      const m = (e as Error).message;
      const text = m === 'TIMEOUT_RUN' ? 'That ran for too long. Check for a loop that never ends.'
        : m === 'TIMEOUT_LOAD' || m === 'START_FAILED' ? 'Django could not load. Check your connection and tap Run again.' : m;
      setOutput(''); setVerdict({ kind: 'error', text });
    }
  }

  const status = verdict.kind === 'busy' ? 'RUNNING' : verdict.kind === 'error' ? 'ERROR' : verdict.kind === 'ok' ? 'MATCHED' : verdict.kind === 'wrong' ? 'NO MATCH' : 'AWAITING';
  const isDone = solved || verdict.kind === 'ok';
  const last = q.id === LEVEL_COUNT;
  const pad = String(q.id).padStart(3, '0');

  return (
    <div className="workspace play">
      {/* Focus mode (keyboard open): one slim header instead of the full page chrome */}
      <div className="focus-bar">
        <button className="done" onClick={() => editor.current?.blur()}><ChevronDown size={18} /> Done</button>
        <span className="focus-title"><b>{pad}</b> {q.title}</span>
        <button className={`icon-btn hint-mini${hint ? ' on' : ''}`} onPointerDown={keepFocus} onClick={() => setHint((h) => !h)} aria-label="Show hint" aria-pressed={hint}><Lightbulb size={18} /></button>
      </div>

      <div className="play-bar">
        <button className="back" onClick={onBack}><ChevronLeft size={18} /> MAP</button>
        <div className="level-no">{pad}<span> / {LEVEL_COUNT.toLocaleString()}</span></div>
        <div className="play-bar-end" aria-hidden="true" />
      </div>

      <div className={`question-head${promptOpen ? ' open' : ''}`}>
        <div className="eyebrow">{q.world}{q.topic ? ` · ${q.topic}` : ''}</div>
        <h1>{q.title}</h1>
        <p onClick={() => setPromptOpen((o) => !o)}>{q.prompt}</p>
        <div className="reward"><Cog size={13} /> {solved ? 'Already wired' : `+${q.xp} brass`}<span>·</span>aim for 20 lines or fewer</div>
        {q.setup && <GivenBlock code={q.setup} />}
        {q.test && <div className="chk">A hidden checker runs after your code and prints the result.</div>}
        {hint && <div className="hint" role="note"><Lightbulb size={16} /><span>{q.hint}</span></div>}
      </div>

      <div className="card editor-card">
        <div className="card-top">
          <span><Code2 size={14} /> main.py</span>
          <span className={`rt rt-${rt}`}>{rt === 'ready' ? 'DJANGO READY' : rt === 'loading' ? 'DJANGO WAKING' : 'DJANGO ASLEEP'}</span>
          <span className="lines">{lines} {lines === 1 ? 'line' : 'lines'}</span>
          <button className="icon-btn" onClick={() => setCode(q.starter)} aria-label="Reset code"><RotateCcw size={16} /></button>
        </div>
        <div className="editor"><CodeEditor ref={editor} value={code} onChange={setCode} /></div>
      </div>

      <div className="card output-card" ref={outRef}>
        <div className="card-top"><span><Terminal size={14} /> OUTPUT</span><span className={`status s-${verdict.kind}`}>{status}</span></div>
        <pre aria-live="polite" className={verdict.kind === 'error' ? 'error' : ''}>
          {verdict.kind === 'error' ? verdict.text : verdict.kind === 'busy' ? verdict.text : output || 'Your result will appear here.'}
        </pre>
        {verdict.kind === 'ok' && <div className="verdict good"><div className="burst" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ ['--a' as string]: `${i * 45}deg` }} />)}</div><Cog size={18} /><div><b>{verdict.fresh ? 'Route wired!' : 'Still matches.'}</b><span>{verdict.fresh ? `+${q.xp} brass added to your workshop.` : 'Nice, this route was already wired.'}</span></div></div>}
        {verdict.kind === 'wrong' && <div className="verdict bad"><div><b>Not quite yet.</b><span>The output differs from what this level expects.{attempts < 2 ? ' Try the hint, then run again.' : ''}</span></div>
          {attempts >= 2 && !reveal && <button className="ghost" onClick={() => setReveal(true)}><Eye size={15} /> Show expected output</button>}
          {reveal && <pre className="expected">{expected || '(no output)'}</pre>}</div>}
      </div>

      <div className="dock play-dock">
        <div className="actions">
          <button className={`ghost hint-btn${hint ? ' on' : ''}`} onClick={() => setHint((h) => !h)} aria-pressed={hint}><Lightbulb size={17} /> Hint</button>
          {isDone && <button className="primary" onClick={() => (last ? onBack() : onOpen(q.id + 1))}>{last ? 'Back to map' : 'Next level'} <ArrowRight size={17} /></button>}
          <button className={isDone ? 'ghost run-btn' : 'primary run-btn'} onClick={run} disabled={busy}><Play size={15} fill="currentColor" />{busy ? 'Running' : isDone ? 'Run' : 'Run code'}</button>
        </div>
      </div>

      <Accessory editor={editor} action={<button className="primary run-mini" onPointerDown={keepFocus} onClick={run} disabled={busy}><Play size={15} fill="currentColor" /> Run</button>} />
    </div>
  );
}
