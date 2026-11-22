// Full-city map for Solmar City 3D: the MAP tab of the pause menu draws
// the whole city grid on a canvas — seven named districts with standing
// colours, the boulevard, the beach and ocean, and legend markers for
// missions, shops, the safehouse, side jobs, police and the export yard.
// The same module also draws the small district strip in the STATS tab.
// Districts are laid out on a fixed grid so the map is stable.
import { DISTRICTS } from './crew.js';
import { PLACES } from './shops.js';

// District rectangles on a 0-100 grid (x, y, w, h) — north is up.
export const DISTRICT_GRID = {
  'Marina Bay': { x: 4, y: 4, w: 30, h: 22 },
  'Old Port': { x: 4, y: 30, w: 30, h: 24 },
  'Coral Docks': { x: 4, y: 58, w: 30, h: 26 },
  'Downtown': { x: 38, y: 4, w: 30, h: 30 },
  'Casino Row': { x: 38, y: 38, w: 30, h: 22 },
  'Strand Boulevard': { x: 38, y: 64, w: 30, h: 20 },
  'Solmar Strand': { x: 72, y: 4, w: 24, h: 80 },
};

export const LEGEND = [
  { key: 'M', label: 'Mission', color: '#facc15' },
  { key: 'S', label: 'Safehouse', color: '#4ade80' },
  { key: 'G', label: 'Gun shop', color: '#f87171' },
  { key: 'R', label: 'Respray', color: '#38bdf8' },
  { key: 'J', label: 'Side job', color: '#a78bfa' },
  { key: 'P', label: 'Police', color: '#60a5fa' },
  { key: 'E', label: 'Car export', color: '#f59e0b' },
  { key: 'W', label: 'Waypoint', color: '#ffffff' },
];

function standingColor(standing) {
  if (standing >= 70) return '#4ade80'; // FRIENDLY
  if (standing >= 45) return '#facc15'; // NEUTRAL
  return '#f87171'; // HOSTILE
}

export function standingLabel(standing) {
  if (standing >= 70) return 'FRIENDLY';
  if (standing >= 45) return 'NEUTRAL';
  return 'HOSTILE';
}

// Draw the full map into a canvas. `standing` is { [district]: number };
// `markers` is [{ x, y, key }] in 0-100 grid coords.
export function drawCityMap(canvas, standing, markers) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const sx = (v) => (v / 100) * w;
  const sy = (v) => (v / 100) * h;
  ctx.clearRect(0, 0, w, h);

  // Ocean (east) + land (west).
  ctx.fillStyle = '#0e7490';
  ctx.fillRect(sx(72), 0, w - sx(72), h);
  ctx.fillStyle = '#2d3a2e';
  ctx.fillRect(0, 0, sx(72), h);
  // Beach strip.
  ctx.fillStyle = '#d9c48f';
  ctx.fillRect(sx(70), 0, sx(2), h);

  // District blocks.
  for (const d of DISTRICTS) {
    const g = DISTRICT_GRID[d.name];
    if (!g) continue;
    const s = (standing || {})[d.name] ?? d.standing;
    ctx.fillStyle = standingColor(s);
    ctx.globalAlpha = 0.28;
    ctx.fillRect(sx(g.x), sy(g.y), sx(g.w), sy(g.h));
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx(g.x), sy(g.y), sx(g.w), sy(g.h));
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.max(9, w * 0.016)}px Arial`;
    ctx.fillText(d.name.toUpperCase(), sx(g.x) + 4, sy(g.y) + 14);
    ctx.fillStyle = standingColor(s);
    ctx.font = `${Math.max(8, w * 0.013)}px Arial`;
    ctx.fillText(`${standingLabel(s)} · ${s}`, sx(g.x) + 4, sy(g.y) + 27);
  }

  // Boulevard (vertical) + cross streets.
  ctx.fillStyle = '#3a3f47';
  ctx.fillRect(sx(36), 0, sx(2), h);
  for (const y of [26, 56, 84]) {
    ctx.fillRect(0, sy(y), sx(72), sy(1.2));
  }

  // Place markers.
  const placeMarkers = {
    SAFEHOUSE: { x: 19, y: 15, key: 'S' },
    'GUN SHOP': { x: 53, y: 19, key: 'G' },
    RESPRAY: { x: 53, y: 74, key: 'R' },
    POLICE: { x: 62, y: 12, key: 'P' },
    'CAR EXPORT': { x: 19, y: 71, key: 'E' },
    LANDMARK: { x: 84, y: 60, key: 'M' },
    MARKET: { x: 12, y: 66, key: 'J' },
  };
  for (const place of PLACES) {
    const m = placeMarkers[place.kind];
    if (!m) continue;
    const legend = LEGEND.find((l) => l.key === m.key) || LEGEND[0];
    ctx.fillStyle = legend.color;
    ctx.beginPath();
    ctx.arc(sx(m.x), sy(m.y), Math.max(5, w * 0.011), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b1020';
    ctx.font = `800 ${Math.max(8, w * 0.012)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(m.key, sx(m.x), sy(m.y) + 3);
    ctx.textAlign = 'left';
  }
  for (const marker of markers || []) {
    const legend = LEGEND.find((l) => l.key === marker.key) || LEGEND[0];
    ctx.fillStyle = legend.color;
    ctx.beginPath();
    ctx.arc(sx(marker.x), sy(marker.y), Math.max(6, w * 0.013), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  return canvas;
}
