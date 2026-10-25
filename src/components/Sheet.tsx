import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** Accessible bottom sheet: focus is moved in and restored, Escape and backdrop close it, page scroll is locked. */
export function Sheet({ eyebrow, title, onClose, children }: { eyebrow: string; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('no-scroll'); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden="true" />
        <header><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        {children}
      </div>
    </div>
  );
}
