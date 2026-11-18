// Hidden doubloons: twelve golden coins stashed around Solmar — the park, the beach, the
// harbor piers, and quiet corners of the grid. Each is worth $100 on the spot; finding all
// twelve pays a $1,000 bonus from Mama Luz. Found coins stay found in the save file.
export const DOUBLOON_SPOTS = [
  { x: 1750, y: 1550 }, // park, north-west lawn
  { x: 2050, y: 1750 }, // park, south-east lawn
  { x: 1900, y: 1500 }, // park, north edge
  { x: 600, y: 3220 }, // beach, west end
  { x: 2400, y: 3260 }, // beach, mid
  { x: 4200, y: 3240 }, // beach, east end
  { x: 3950, y: 3250 }, // harbor pier 1
  { x: 4470, y: 3250 }, // harbor pier 3
  { x: 400, y: 400 }, // north-west corner
  { x: 4400, y: 400 }, // north-east corner
  { x: 1000, y: 2900 }, // south street
  { x: 2800, y: 1900 }, // central crossing
];

export const DOUBLOON_COUNT = DOUBLOON_SPOTS.length;
export const DOUBLOON_REWARD = 100;
export const DOUBLOON_ALL_BONUS = 1000;

const PICKUP_RADIUS = 42;

export function createDoubloons() {
  return { found: new Array(DOUBLOON_COUNT).fill(false), count: 0 };
}

export function updateCollectibles(state) {
  const d = state.doubloons;
  if (d.count >= DOUBLOON_COUNT) return;
  const player = state.player;
  for (let i = 0; i < DOUBLOON_COUNT; i += 1) {
    if (d.found[i]) continue;
    const spot = DOUBLOON_SPOTS[i];
    if (Math.hypot(player.x - spot.x, player.y - spot.y) >= PICKUP_RADIUS) continue;
    d.found[i] = true;
    d.count += 1;
    state.player.money += DOUBLOON_REWARD;
    for (let k = 0; k < 14; k += 1) {
      const a = (k / 14) * Math.PI * 2;
      state.particles.push({
        x: spot.x, y: spot.y,
        vx: Math.cos(a) * 120,
        vy: Math.sin(a) * 120,
        life: 0.6, maxLife: 0.6, color: '#f2c94c', size: 4, kind: 'spark',
      });
    }
    if (d.count >= DOUBLOON_COUNT) {
      state.player.money += DOUBLOON_ALL_BONUS;
      state.events.push({ type: 'allDoubloons' });
    } else {
      state.events.push({ type: 'doubloon', text: `Doubloon ${d.count} of ${DOUBLOON_COUNT} — $100` });
    }
  }
}
