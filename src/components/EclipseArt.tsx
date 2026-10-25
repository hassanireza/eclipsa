import { useId } from 'react';

/** The Eclipsa mark: a black moon crossing the sun, mint corona rays and two blueprint rings. Hero art and empty states. */
export function EclipseArt({ size = 120, rings = true, className = '' }: { size?: number; rings?: boolean; className?: string }) {
  const id = useId().replace(/:/g, '');
  const rays = Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2, long = i % 2 === 0, r1 = 150, r2 = long ? 300 : 230; return <line key={i} x1={Math.cos(a) * r1} y1={Math.sin(a) * r1} x2={Math.cos(a) * r2} y2={Math.sin(a) * r2} stroke="#8fdaa1" strokeOpacity={long ? 0.55 : 0.28} strokeWidth={long ? 5 : 3.5} strokeLinecap="round" />; });
  return (
    <svg className={className} width={size} height={size} viewBox="-400 -400 800 800" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`h${id}`}><stop offset=".35" stopColor="#8fdaa1" stopOpacity=".5" /><stop offset=".6" stopColor="#3c9f63" stopOpacity=".16" /><stop offset="1" stopColor="#3c9f63" stopOpacity="0" /></radialGradient>
        <radialGradient id={`m${id}`} cx="42%" cy="40%" r="70%"><stop offset="0" stopColor="#0b1812" /><stop offset="1" stopColor="#030806" /></radialGradient>
      </defs>
      <circle r="360" fill={`url(#h${id})`} />
      <g className="cell-ring a">{rays}</g>
      {rings && <>
        <circle className="cell-ring b" r="330" fill="none" stroke="#8fdaa1" strokeOpacity=".22" strokeWidth="3" strokeDasharray="4 12" />
        <path d="M-330 0H-180M180 0H330M0 -330V-180M0 180V330" stroke="#e8bd76" strokeOpacity=".5" strokeWidth="4" strokeLinecap="round" />
      </>}
      <circle r="150" fill="none" stroke="#b9f0c8" strokeOpacity=".9" strokeWidth="6" />
      <circle className="cell-core" cx="26" cy="-10" r="140" fill={`url(#m${id})`} stroke="#8fdaa1" strokeOpacity=".35" strokeWidth="3" />
      {rings && <g fill="#e8bd76"><circle cx="-330" cy="0" r="10" className="twinkle" /><circle cx="330" cy="0" r="8" opacity=".8" /><circle cx="0" cy="-330" r="12" className="twinkle t2" /></g>}
    </svg>
  );
}
