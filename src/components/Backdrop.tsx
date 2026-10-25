import { useEffect, useMemo } from 'react';

/** Fixed deep-sea backdrop: drifting plankton specks, plus a glow ring wherever you touch ("it reacts when disturbed"). */
export function Backdrop() {
  const specks = useMemo(() => {
    let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    return Array.from({ length: 22 }, () => ({ x: r() * 100, y: r() * 100, size: 2 + r() * 4, d: 14 + r() * 22, delay: -r() * 30, o: 0.18 + r() * 0.4 }));
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('.cm-editor, input, textarea')) return;
      const el = document.createElement('span');
      el.className = 'ripple';
      el.style.left = `${e.clientX}px`; el.style.top = `${e.clientY}px`;
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove(), { once: true });
    };
    window.addEventListener('pointerdown', onDown, { passive: true });
    return () => window.removeEventListener('pointerdown', onDown);
  }, []);

  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop-glow" />
      {specks.map((p, i) => (
        <i key={i} className="speck" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, opacity: p.o, animationDuration: `${p.d}s`, animationDelay: `${p.delay}s` }} />
      ))}
    </div>
  );
}
