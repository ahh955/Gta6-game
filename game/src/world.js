// Solmar City — the city itself: roads, blocks, buildings, park, beach and
// harbour. Everything is laid out from one seeded stream, so the same seed
// always builds the same city.

import { CFG, PALETTE } from './config.js';

export function avenueX(world, i) {
  return world.avenues[i];
}

export function streetY(world, j) {
  return world.streets[j];
}

// Is a point on a road (avenue or street), with a small margin?
export function isOnRoad(world, x, y) {
  const half = CFG.roadWidth / 2 + 4;
  for (let i = 0; i < world.avenues.length; i += 1) {
    if (Math.abs(x - world.avenues[i]) <= half) return true;
  }
  for (let j = 0; j < world.streets.length; j += 1) {
    if (Math.abs(y - world.streets[j]) <= half) return true;
  }
  return false;
}

export function isInWater(world, x, y) {
  return x >= CFG.waterX || y >= CFG.waterY;
}

// The nearest intersection (avenue, street) to a point.
export function nearestIntersection(world, x, y) {
  let bestI = 0;
  let bestJ = 0;
  let best = Infinity;
  for (let i = 0; i < world.avenues.length; i += 1) {
    for (let j = 0; j < world.streets.length; j += 1) {
      const d = Math.abs(x - world.avenues[i]) + Math.abs(y - world.streets[j]);
      if (d < best) {
        best = d;
        bestI = i;
        bestJ = j;
      }
    }
  }
  return { i: bestI, j: bestJ, x: world.avenues[bestI], y: world.streets[bestJ] };
}

// Push a circle out of every building it overlaps. Returns a corrected point.
export function collideBuildings(world, x, y, radius) {
  let px = x;
  let py = y;
  for (let k = 0; k < world.buildings.length; k += 1) {
    const b = world.buildings[k];
    const nearestX = Math.max(b.x, Math.min(px, b.x + b.w));
    const nearestY = Math.max(b.y, Math.min(py, b.y + b.h));
    const dx = px - nearestX;
    const dy = py - nearestY;
    const distSq = dx * dx + dy * dy;
    if (distSq < radius * radius) {
      if (distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        px = nearestX + (dx / dist) * radius;
        py = nearestY + (dy / dist) * radius;
      } else {
        // Centre inside the building: push out along the smallest overlap.
        const left = px - b.x;
        const right = b.x + b.w - px;
        const top = py - b.y;
        const bottom = b.y + b.h - py;
        const min = Math.min(left, right, top, bottom);
        if (min === left) px = b.x - radius;
        else if (min === right) px = b.x + b.w + radius;
        else if (min === top) py = b.y - radius;
        else py = b.y + b.h + radius;
      }
    }
  }
  return { x: px, y: py };
}

// Keep a point inside the walkable world (out of the sea, inside the map).
export function clampToWorld(x, y, radius) {
  return {
    x: Math.max(CFG.worldMinX + radius, Math.min(CFG.waterX - radius - 2, x)),
    y: Math.max(CFG.worldMinY + radius, Math.min(CFG.waterY - radius - 2, y)),
  };
}

// A random point on a random road, for spawning traffic.
export function randomRoadPoint(world, rng) {
  if (rng.chance(0.5)) {
    const i = rng.int(0, world.avenues.length - 1);
    return {
      x: world.avenues[i],
      y: rng.range(CFG.roadFirst, CFG.roadFirst + (CFG.streetCount - 1) * CFG.roadPitch),
      axis: 'v',
      index: i,
    };
  }
  const j = rng.int(0, world.streets.length - 1);
  return {
    x: rng.range(CFG.roadFirst, CFG.roadFirst + (CFG.avenueCount - 1) * CFG.roadPitch),
    y: world.streets[j],
    axis: 'h',
    index: j,
  };
}

function buildBuildings(world, rng) {
  const buildings = [];
  const inset = CFG.roadWidth / 2 + 14; // road edge + sidewalk
  for (let i = 0; i < CFG.avenueCount - 1; i += 1) {
    for (let j = 0; j < CFG.streetCount - 1; j += 1) {
      // The park block and the plaza block stay open.
      if (i === CFG.parkCol && j === CFG.parkRow) continue;
      if (i === CFG.parkCol + 1 && j === CFG.parkRow) continue;
      const x0 = world.avenues[i] + inset;
      const y0 = world.streets[j] + inset;
      const x1 = world.avenues[i + 1] - inset;
      const y1 = world.streets[j + 1] - inset;
      const bw = x1 - x0;
      const bh = y1 - y0;
      const layout = rng.pick(['single', 'twin-h', 'twin-v', 'quad']);
      const cells = [];
      if (layout === 'single') cells.push([x0, y0, bw, bh]);
      else if (layout === 'twin-h') {
        cells.push([x0, y0, bw, bh / 2 - 8]);
        cells.push([x0, y0 + bh / 2 + 8, bw, bh / 2 - 8]);
      } else if (layout === 'twin-v') {
        cells.push([x0, y0, bw / 2 - 8, bh]);
        cells.push([x0 + bw / 2 + 8, y0, bw / 2 - 8, bh]);
      } else {
        cells.push([x0, y0, bw / 2 - 8, bh / 2 - 8]);
        cells.push([x0 + bw / 2 + 8, y0, bw / 2 - 8, bh / 2 - 8]);
        cells.push([x0, y0 + bh / 2 + 8, bw / 2 - 8, bh / 2 - 8]);
        cells.push([x0 + bw / 2 + 8, y0 + bh / 2 + 8, bw / 2 - 8, bh / 2 - 8]);
      }
      for (const [cx, cy, cw, ch] of cells) {
        const pad = rng.range(4, 14);
        buildings.push({
          x: cx + pad,
          y: cy + pad,
          w: cw - pad * 2,
          h: ch - pad * 2,
          color: rng.pick(PALETTE.buildingRoofs),
          // Rooftop dressing: 0 = plain, 1 = AC unit, 2 = skylight strip.
          roof: rng.int(0, 2),
          height: rng.int(6, 16),
        });
      }
    }
  }
  return buildings;
}

function buildTrees(world, rng) {
  const trees = [];
  // Park trees in a loose ring around the pond.
  const park = world.park;
  for (let k = 0; k < 26; k += 1) {
    const angle = rng.range(0, Math.PI * 2);
    const radius = rng.range(46, Math.min(park.w, park.h) / 2 - 8);
    trees.push({
      x: park.cx + Math.cos(angle) * radius,
      y: park.cy + Math.sin(angle) * radius * 0.85,
      r: rng.range(9, 15),
    });
  }
  // Street trees along a few sidewalks.
  for (let k = 0; k < 40; k += 1) {
    if (rng.chance(0.5)) {
      const i = rng.int(0, CFG.avenueCount - 1);
      trees.push({
        x: world.avenues[i] + (rng.chance(0.5) ? 1 : -1) * (CFG.roadWidth / 2 + 10),
        y: rng.range(CFG.roadFirst, CFG.roadFirst + (CFG.streetCount - 1) * CFG.roadPitch),
        r: rng.range(8, 12),
      });
    } else {
      const j = rng.int(0, CFG.streetCount - 1);
      trees.push({
        x: rng.range(CFG.roadFirst, CFG.roadFirst + (CFG.avenueCount - 1) * CFG.roadPitch),
        y: world.streets[j] + (rng.chance(0.5) ? 1 : -1) * (CFG.roadWidth / 2 + 10),
        r: rng.range(8, 12),
      });
    }
  }
  return trees;
}

export function buildWorld(rng) {
  const avenues = [];
  const streets = [];
  for (let i = 0; i < CFG.avenueCount; i += 1) avenues.push(CFG.roadFirst + i * CFG.roadPitch);
  for (let j = 0; j < CFG.streetCount; j += 1) streets.push(CFG.roadFirst + j * CFG.roadPitch);

  const inset = CFG.roadWidth / 2 + 14;
  const park = {
    x: avenues[CFG.parkCol] + inset,
    y: streets[CFG.parkRow] + inset,
    w: CFG.roadPitch - inset * 2,
    h: CFG.roadPitch - inset * 2,
  };
  park.cx = park.x + park.w / 2;
  park.cy = park.y + park.h / 2;
  park.pondR = 34;

  const plaza = {
    x: avenues[CFG.parkCol + 1] + inset,
    y: streets[CFG.parkRow] + inset,
    w: CFG.roadPitch - inset * 2,
    h: CFG.roadPitch - inset * 2,
  };
  plaza.cx = plaza.x + plaza.w / 2;
  plaza.cy = plaza.y + plaza.h / 2;

  const world = {
    avenues,
    streets,
    park,
    plaza,
    buildings: [],
    trees: [],
    // Beach dressing: umbrellas and palms along the sand.
    umbrellas: [],
    // Harbour dressing: piers, containers, crates.
    piers: [],
    containers: [],
  };
  world.buildings = buildBuildings(world, rng);
  world.trees = buildTrees(world, rng);

  for (let k = 0; k < 9; k += 1) {
    world.umbrellas.push({
      x: rng.range(CFG.beachX + 30, CFG.waterX - 40),
      y: rng.range(120, CFG.harborY - 120),
      color: rng.pick(['#e85d3f', '#3f8fe8', '#f2c531', '#7bc96f']),
    });
  }
  for (let k = 0; k < 3; k += 1) {
    world.piers.push({
      x: 420 + k * 720,
      y: CFG.harborY + 10,
      w: 60,
      h: CFG.waterY - CFG.harborY - 40,
    });
  }
  const containerColors = ['#c0392b', '#2980b9', '#27ae60', '#d35400', '#8e44ad'];
  for (let k = 0; k < 14; k += 1) {
    world.containers.push({
      x: rng.range(140, 2200),
      y: rng.range(CFG.harborY + 24, CFG.harborY + 130),
      w: rng.pick([52, 72]),
      h: 30,
      color: rng.pick(containerColors),
    });
  }
  return world;
}
