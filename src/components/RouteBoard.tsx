import { Check } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Question } from '../questions';

const W = 340, H = 300, COLS = 5, ROWS = 4;

/** Node positions: a top-down snake on a clean grid, like a wiring plan. Traces only ever run straight (across a row, or down a column). */
const place = (i: number) => { const row = Math.floor(i / COLS), col = row % 2 === 0 ? i % COLS : COLS - 1 - (i % COLS); return { x: ((col + 0.5) / COLS) * W, y: ((row + 0.5) / ROWS) * H }; };

type Props = { items: Question[]; done: Set<number>; nextId: number | null; onOpen: (id: number) => void };

export function RouteBoard({ items, done, nextId, onOpen }: Props) {
  const pts = items.map((_, i) => place(i));
  return (
    <div className="board" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
        {pts.slice(1).map((p, i) => {
          const a = pts[i], lit = done.has(items[i].id) && done.has(items[i + 1].id), half = done.has(items[i].id);
          return <path key={i} d={`M${a.x} ${a.y}L${p.x} ${p.y}`} className={lit ? 'trace lit' : half ? 'trace half' : 'trace'} />;
        })}
      </svg>
      {items.map((q, i) => {
        const isDone = done.has(q.id), isNext = q.id === nextId;
        const style = { left: `${(pts[i].x / W) * 100}%`, top: `${(pts[i].y / H) * 100}%` } as CSSProperties;
        return (
          <button key={q.id} style={style} className={`node${isDone ? ' done' : ''}${isNext ? ' next' : ''}`} onClick={() => onOpen(q.id)}
            aria-label={`Level ${q.id}: ${q.title}${isDone ? ', completed' : isNext ? ', next up' : ''}`}>
            <span className={`node-body${q.id > 999 ? ' long' : ''}`}>{isDone ? <Check size={13} strokeWidth={3} /> : String(q.id).padStart(3, '0')}</span>
          </button>
        );
      })}
    </div>
  );
}
