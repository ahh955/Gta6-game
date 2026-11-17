// The city of Solmar: a seeded grid of avenues and streets, blocks with buildings, a central
// park, a beach and a harbor district. This module only builds the place and answers questions
// about it (is this a road? does this circle hit a building? where is a random road point?);
// the actors that live in it live in their own modules.
import { CITY, PALETTE } from './config.js';

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
}

/** The blocks between the roads: each is {x, y, width, height} in world pixels. */
function buildBlocks() {
  const blocks = [];
  const xs = [0, ...CITY.avenues, CITY.width];
  const ys = [0, ...CITY.streets, CITY.beachTop];
  const half = CITY.roadWidth / 2;
  for (let ix = 0; ix < xs.length - 1; ix += 1) {
    for (let iy = 0; iy < ys.length - 1; iy += 1) {
      const x0 = ix === 0 ? 0 : xs[ix] + half;
      const x1 = ix === xs.length - 2 ? CITY.width : xs[ix + 1] - half;
      const y0 = iy === 0 ? 0 : ys[iy] + half;
      const y1 = iy === ys.length - 2 ? CITY.beachTop : ys[iy + 1] - half;
      if (x1 - x0 > 60 && y1 - y0 > 60) blocks.push({ x: x0, y: y0, width: x1 - x0, height: y1 - y0 });
    }
  }
  return blocks;
}

function buildBuildings(rng, blocks) {
  const buildings = [];
  const park = { x: CITY.parkBlock.x0, y: CITY.parkBlock.y0, width: CITY.parkBlock.x1 - CITY.parkBlock.x0, height: CITY.parkBlock.y1 - CITY.parkBlock.y0 };
  for (const block of blocks) {
    if (rectsOverlap(block, park)) continue;
    // One to four buildings per block, inset from the sidewalk edge.
    const cols = block.width > 380 ? 2 : 1;
    const rows = block.height > 320 ? 2 : 1;
    const cellW = block.width / cols;
    const cellH = block.height / rows;
    for (let cx = 0; cx < cols; cx += 1) {
      for (let cy = 0; cy < rows; cy += 1) {
        if (rng.chance(0.12)) continue; // an empty lot: a parking patch or yard
        const inset = 16 + rng.range(0, 14);
        const w = cellW - inset * 2 - rng.range(0, 30);
        const h = cellH - inset * 2 - rng.range(0, 30);
        const tall = rng.chance(0.16);
        buildings.push({
          x: block.x + cx * cellW + inset,
          y: block.y + cy * cellH + inset,
          width: Math.max(50, w),
          height: Math.max(50, h),
          heightPx: tall ? rng.int(34, 52) : rng.int(10, 24),
          color: rng.pick(PALETTE.building),
          roof: rng.pick(PALETTE.roof),
          tower: tall,
          helipad: tall && rng.chance(0.3),
        });
      }
    }
  }
  return buildings;
}

function buildTrees(rng) {
  const trees = [];
  const park = CITY.parkBlock;
  for (let i = 0; i < 46; i += 1) {
    trees.push({
      x: rng.range(park.x0 + 20, park.x1 - 20),
      y: rng.range(park.y0 + 20, park.y1 - 20),
      r: rng.range(9, 15),
    });
  }
  // Palms along the beach promenade.
  for (let x = 120; x < CITY.width - 100; x += 130) {
    trees.push({ x: x + rng.range(-20, 20), y: CITY.beachTop + 42 + rng.range(-8, 8), r: 11, palm: true });
  }
  return trees;
}

function buildIntersections() {
  const points = [];
  for (const x of CITY.avenues) {
    for (const y of CITY.streets) points.push({ x, y });
  }
  return points;
}

export function createCity(rng) {
  const blocks = buildBlocks();
  return {
    width: CITY.width,
    height: CITY.height,
    blocks,
    buildings: buildBuildings(rng, blocks),
    trees: buildTrees(rng),
    intersections: buildIntersections(),
    // Landmarks the missions and the spawn points use.
    garage: { x: 1000, y: 2400 },
    safehouse: { x: 3400, y: 400 },
    plaza: { x: 1900, y: 1650 },
    harborGate: { x: 4150, y: 3050 },
    hospital: { x: 600, y: 900 },
    policeStation: { x: 2800, y: 1400 },
  };
}

/** True when the point is on a road (avenue or street), not on a block or the beach. */
export function isOnRoad(city, x, y) {
  const half = CITY.roadWidth / 2;
  if (y >= CITY.beachTop) return false;
  for (const ax of CITY.avenues) if (Math.abs(x - ax) <= half) return true;
  for (const sy of CITY.streets) if (Math.abs(y - sy) <= half) return true;
  return false;
}

/** True when the point is in the water strip at the south edge. */
export function isInWater(x, y) {
  return y >= CITY.waterTop;
}

/** True when the point is on sand (beach) or in the harbor yard. */
export function isOnSand(x, y) {
  return y >= CITY.beachTop && y < CITY.waterTop;
}

/**
 * Push a circle out of every building it overlaps; returns true when it hit one. The push is
 * axis-separated so a car sliding along a wall keeps its along-wall speed.
 */
export function collideBuildings(city, circle) {
  let hit = false;
  for (const b of city.buildings) {
    const nx = Math.max(b.x, Math.min(circle.x, b.x + b.width));
    const ny = Math.max(b.y, Math.min(circle.y, b.y + b.height));
    const dx = circle.x - nx;
    const dy = circle.y - ny;
    const distSq = dx * dx + dy * dy;
    if (distSq >= circle.r * circle.r) continue;
    hit = true;
    if (distSq === 0) {
      // Centre inside the building: push out along the shortest side.
      const left = circle.x - b.x;
      const right = b.x + b.width - circle.x;
      const top = circle.y - b.y;
      const bottom = b.y + b.height - circle.y;
      const min = Math.min(left, right, top, bottom);
      if (min === left) circle.x = b.x - circle.r;
      else if (min === right) circle.x = b.x + b.width + circle.r;
      else if (min === top) circle.y = b.y - circle.r;
      else circle.y = b.y + b.height + circle.r;
    } else {
      const dist = Math.sqrt(distSq);
      circle.x = nx + (dx / dist) * circle.r;
      circle.y = ny + (dy / dist) * circle.r;
    }
  }
  return hit;
}

/** Keep a circle inside the city and out of the water. */
export function clampToCity(circle) {
  circle.x = Math.max(circle.r, Math.min(CITY.width - circle.r, circle.x));
  circle.y = Math.max(circle.r, Math.min(CITY.waterTop - circle.r - 2, circle.y));
}

/** The nearest intersection to a point (traffic routes through these). */
export function nearestIntersection(city, x, y) {
  let best = city.intersections[0];
  let bestD = Infinity;
  for (const p of city.intersections) {
    const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** A random point on a road, away from the map edge. */
export function randomRoadPoint(rng) {
  if (rng.chance(0.5)) {
    return { x: rng.pick(CITY.avenues) + rng.range(-30, 30), y: rng.range(200, CITY.beachTop - 200) };
  }
  return { x: rng.range(200, CITY.width - 200), y: rng.pick(CITY.streets) + rng.range(-30, 30) };
}

/** A random point on a sidewalk (a block's edge strip). */
export function randomSidewalkPoint(city, rng) {
  const block = rng.pick(city.blocks);
  const edge = rng.int(0, 3);
  const m = 14;
  if (edge === 0) return { x: rng.range(block.x + m, block.x + block.width - m), y: block.y + m };
  if (edge === 1) return { x: rng.range(block.x + m, block.x + block.width - m), y: block.y + block.height - m };
  if (edge === 2) return { x: block.x + m, y: rng.range(block.y + m, block.y + block.height - m) };
  return { x: block.x + block.width - m, y: rng.range(block.y + m, block.y + block.height - m) };
}

/** True when the point is inside any building (spawn checks use this). */
export function insideBuilding(city, x, y) {
  for (const b of city.buildings) if (inRect(x, y, b)) return true;
  return false;
}
