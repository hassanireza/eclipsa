import { ArrowLeft, ArrowLeftToLine, ArrowRight, ArrowRightToLine, ChevronLeft, CornerDownLeft, CopyPlus, Hash, IndentDecrease, MoveDown, MoveUp, Redo2, Search, TextSelect, Trash2, Undo2, Wrench } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { EditorCommand, EditorHandle } from './CodeEditor';

/** Keep the keyboard (and editor focus) alive when a toolbar button is pressed. */
export const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault();

const SYMBOLS = ['=', '(', ')', ':', '"', "'", '[', ']', '{', '}', ',', '.', '+', '-', '*', '/', '%', '#', '<', '>', '_', '!', '&', '|', '\\'];

/** A toolbar key. A tap fires once (so dragging the bar to scroll never triggers a key); `repeat` keys keep firing while held. */
function Key({ label, title, onFire, repeat, className = '', children }: { label: string; title?: string; onFire: () => void; repeat?: boolean; className?: string; children: ReactNode }) {
  const hold = useRef(0), loop = useRef(0), repeated = useRef(false);
  const stop = () => { window.clearTimeout(hold.current); window.clearInterval(loop.current); };
  useEffect(() => stop, []);
  return (
    <button
      className={`key ${className}`} aria-label={label} title={title ?? label}
      onPointerDown={(e) => {
        e.preventDefault(); repeated.current = false;
        if (repeat) hold.current = window.setTimeout(() => { repeated.current = true; onFire(); loop.current = window.setInterval(onFire, 70); }, 380);
      }}
      onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => { if (repeated.current) { repeated.current = false; return; } onFire(); }}
    >{children}</button>
  );
}

/** One slim row glued above the keyboard.
 *  Tools page (default), ordered by how often phone coders reach for them: new line, tab, undo, cursor ←/→, find, comment, …
 *  Symbols page: the punctuation that lives two taps deep on the iOS keyboard. The primary action stays pinned on the right. */
export function Accessory({ editor, action }: { editor: React.RefObject<EditorHandle | null>; action: ReactNode }) {
  const [page, setPage] = useState<'tools' | 'symbols'>('tools');
  const cmd = (name: EditorCommand) => () => editor.current?.command(name);
  return (
    <div className="accessory">
      <div className="keys" role="toolbar" aria-label={page === 'tools' ? 'Editor tools' : 'Code symbols'} key={page}>
        {page === 'tools' ? (
          <>
            <Key label="New line below (Ctrl+Enter)" onFire={cmd('newline')} className="wide accent"><span className="glyph">Ctrl+</span><CornerDownLeft size={15} /></Key>
            <Key label="Tab: indent four spaces" onFire={cmd('tab')} className="wide accent"><span className="glyph">⇥ TAB</span></Key>
            <Key label="Undo (Ctrl+Z)" onFire={cmd('undo')}><Undo2 size={18} /></Key>
            <Key label="Move cursor left" onFire={cmd('left')} repeat><ArrowLeft size={18} /></Key>
            <Key label="Move cursor right" onFire={cmd('right')} repeat><ArrowRight size={18} /></Key>
            <Key label="Find and replace (Ctrl+F)" onFire={cmd('find')}><Search size={18} /></Key>
            <Key label="Comment or uncomment line (Ctrl+/)" onFire={cmd('comment')}><Hash size={18} /></Key>
            <Key label="Outdent (Shift+Tab)" onFire={cmd('outdent')}><IndentDecrease size={18} /></Key>
            <Key label="Redo (Ctrl+Shift+Z)" onFire={cmd('redo')}><Redo2 size={18} /></Key>
            <Key label="Duplicate line" onFire={cmd('duplicate')}><CopyPlus size={18} /></Key>
            <Key label="Delete line (Ctrl+Shift+K)" onFire={cmd('deleteLine')}><Trash2 size={18} /></Key>
            <Key label="Move line up (Alt+Up)" onFire={cmd('moveUp')} repeat><MoveUp size={18} /></Key>
            <Key label="Move line down (Alt+Down)" onFire={cmd('moveDown')} repeat><MoveDown size={18} /></Key>
            <Key label="Select line (Ctrl+L)" onFire={cmd('selectLine')}><TextSelect size={18} /></Key>
            <Key label="Go to start of line (Home)" onFire={cmd('home')}><ArrowLeftToLine size={18} /></Key>
            <Key label="Go to end of line (End)" onFire={cmd('end')}><ArrowRightToLine size={18} /></Key>
            <Key label="Show code symbols" onFire={() => setPage('symbols')} className="wide"><span className="glyph">( )</span></Key>
          </>
        ) : (
          <>
            <Key label="Back to editor tools" onFire={() => setPage('tools')} className="wide accent"><ChevronLeft size={16} /><Wrench size={15} /></Key>
            {SYMBOLS.map((k) => <Key key={k} label={`Insert ${k}`} onFire={() => editor.current?.insert(k)}>{k}</Key>)}
          </>
        )}
      </div>
      {action}
    </div>
  );
}
