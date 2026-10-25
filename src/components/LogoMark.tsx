import { useId } from 'react';

/** Small, crisp brand tile for the header: a tiny eclipse. Pure vector strokes, no blur filters, so it stays sharp on 3x screens. */
export function LogoMark({ size = 30 }: { size?: number }) {
  const id = useId().replace(/:/g, '');
  const rays = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <line key={i} x1={16 + Math.cos(a) * 8.4} y1={16 + Math.sin(a) * 8.4} x2={16 + Math.cos(a) * (i % 2 ? 11 : 12.6)} y2={16 + Math.sin(a) * (i % 2 ? 11 : 12.6)} stroke="#8fdaa1" strokeOpacity={i % 2 ? 0.5 : 0.85} strokeWidth="1.2" strokeLinecap="round" />; });
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" shapeRendering="geometricPrecision" style={{ display: 'block', flex: 'none' }}>
      <defs><linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0f3322" /><stop offset="1" stopColor="#030a07" /></linearGradient></defs>
      <rect x=".5" y=".5" width="31" height="31" rx="8" fill={`url(#g${id})`} stroke="#8fdaa1" strokeOpacity=".3" />
      {rays}
      <circle cx="16" cy="16" r="7.2" fill="none" stroke="#b9f0c8" strokeWidth="1.1" />
      <circle cx="17.6" cy="15.2" r="6.6" fill="#030806" />
    </svg>
  );
}
