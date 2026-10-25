// Generates the Eclipsa icons and iOS splash screens from one vector mark. Run: npm run assets
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const pub = new URL('../public/', import.meta.url).pathname;
mkdirSync(`${pub}splash`, { recursive: true });

/** The mark on a 0..100 grid: corona rays, a mint ring, a black moon, brass registration ticks. */
const mark = (cx, cy, s) => {
  const rays = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2, long = i % 2 === 0, r1 = 0.27 * s, r2 = (long ? 0.5 : 0.38) * s;
    return `<line x1="${cx + Math.cos(a) * r1}" y1="${cy + Math.sin(a) * r1}" x2="${cx + Math.cos(a) * r2}" y2="${cy + Math.sin(a) * r2}" stroke="#8fdaa1" stroke-opacity="${long ? 0.8 : 0.42}" stroke-width="${s * (long ? 0.016 : 0.011)}" stroke-linecap="round"/>`;
  }).join('');
  const t = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([x, y]) => `<line x1="${cx + x * 0.56 * s}" y1="${cy + y * 0.56 * s}" x2="${cx + x * 0.66 * s}" y2="${cy + y * 0.66 * s}" stroke="#e8bd76" stroke-opacity=".75" stroke-width="${s * 0.014}" stroke-linecap="round"/>`).join('');
  return `<circle cx="${cx}" cy="${cy}" r="${0.62 * s}" fill="url(#halo)"/>${rays}${t}
  <circle cx="${cx}" cy="${cy}" r="${0.25 * s}" fill="none" stroke="#b9f0c8" stroke-width="${s * 0.02}"/>
  <circle cx="${cx + 0.045 * s}" cy="${cy - 0.02 * s}" r="${0.235 * s}" fill="#030806" stroke="#8fdaa1" stroke-opacity=".35" stroke-width="${s * 0.006}"/>`;
};
const defs = `<defs><radialGradient id="halo"><stop offset=".4" stop-color="#8fdaa1" stop-opacity=".4"/><stop offset="1" stop-color="#8fdaa1" stop-opacity="0"/></radialGradient>
<radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#10412a"/><stop offset=".6" stop-color="#07150e"/><stop offset="1" stop-color="#030806"/></radialGradient>
<pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#8fdaa1" stroke-opacity=".06"/></pattern></defs>`;
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}<rect width="${w}" height="${h}" fill="url(#bg)"/><rect width="${w}" height="${h}" fill="url(#grid)"/>${body}</svg>`;

const icon = (n, scale = 0.6) => svg(n, n, mark(n / 2, n / 2, n * scale));
const png = (s, file) => sharp(Buffer.from(s)).png().toFile(`${pub}${file}`);

await png(icon(512, 0.66), 'icon-512.png');
await png(icon(192, 0.66), 'icon-192.png');
await png(icon(512, 0.5), 'icon-maskable-512.png');   // inside the 80% safe zone
await png(icon(180, 0.66), 'apple-touch-icon.png');
await png(icon(32, 0.78), 'favicon-32.png');
writeFileSync(`${pub}favicon.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${defs}<rect width="64" height="64" rx="14" fill="url(#bg)"/>${mark(32, 32, 50)}</svg>`);

const sizes = [[1320, 2868], [1206, 2622], [1260, 2736], [1290, 2796], [1179, 2556], [1284, 2778], [1170, 2532], [1125, 2436], [1242, 2688], [828, 1792], [1242, 2208], [750, 1334], [640, 1136]];
for (const [w, h] of sizes) await png(svg(w, h, mark(w / 2, h * 0.44, Math.min(w, h) * 0.5)), `splash/splash-${w}x${h}.png`);
console.log('assets written');
