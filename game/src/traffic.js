// Solmar City — traffic and pedestrians. Cars drive on the right-hand side
// of the road and turn at intersections along quarter-circle arcs that stay
// on the asphalt; pedestrians walk a graph of sidewalk corners.

import { CFG, PALETTE } from './config.js';
import { randomRoadPoint } from './world.js';
import { addWanted } from './police.js';

const LANE = CFG.laneOffset;
const TURN_RADIUS = 18;

// The lane line a car drives on: its centreline plus the right-hand offset.
function laneCoord(world, axis, index, dir) {
  const centre = axis === 'v' ? world.avenues[index] : world.streets[index];
  return centre + dir * LANE;
}

function headingOf(axis, dir) {
  if (axis === 'v') return dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  return dir > 0 ? 0 : Math.PI;
}

// The next intersection ahead of a car driving on its road, or null.
function nextIntersectionAhead(world, car) {
  if (car.axis === 'v') {
    if (car.dir > 0) {
      for (let j = 0; j < world.streets.length; j += 1) {
        if (world.streets[j] > car.y + 4) return { i: car.index, j };
      }
    } else {
      for (let j = world.streets.length - 1; j >= 0; j -= 1) {
        if (world.streets[j] < car.y - 4) return { i: car.index, j };
      }
    }
  } else {
    if (car.dir > 0) {
      for (let i = 0; i < world.avenues.length; i += 1) {
        if (world.avenues[i] > car.x + 4) return { i, j: car.index };
      }
    } else {
      for (let i = world.avenues.length - 1; i >= 0; i -= 1) {
        if (world.avenues[i] < car.x - 4) return { i, j: car.index };
      }
    }
  }
  return null;
}

// Is this the last intersection on the car's road (straight would leave town)?
function isLastIntersection(world, car, cross) {
  if (car.axis === 'v') {
    return car.dir > 0 ? cross.j === world.streets.length - 1 : cross.j === 0;
  }
  return car.dir > 0 ? cross.i === world.avenues.length - 1 : cross.i === 0;
}

// Build the arc waypoints for a turn at an intersection. The arc is tangent
// to both lane lines: its centre is the lane-lines' crossing K plus
// r * (backwards-entry-heading + forwards-exit-heading).
function buildTurnPath(world, car, cross, turn) {
  const cx = world.avenues[cross.i];
  const cy = world.streets[cross.j];
  // The new road after the turn.
  let newAxis;
  let newIndex;
  let newDir;
  if (car.axis === 'v') {
    newAxis = 'h';
    newIndex = cross.j;
    // Going south, left is east; going north, left is west.
    newDir = turn === 'left' ? car.dir : -car.dir;
  } else {
    newAxis = 'v';
    newIndex = cross.i;
    // Going east, left is north; going west, left is south.
    newDir = turn === 'left' ? -car.dir : car.dir;
  }
  // Lane lines: entry and exit.
  const entryLane = laneCoord(world, car.axis, car.index, car.dir);
  const exitLane = laneCoord(world, newAxis, newIndex, newDir);
  // K: where the two lane lines cross.
  const kx = car.axis === 'v' ? entryLane : exitLane;
  const ky = car.axis === 'v' ? exitLane : entryLane;
  const hIn = { x: Math.cos(headingOf(car.axis, car.dir)), y: Math.sin(headingOf(car.axis, car.dir)) };
  const hOut = { x: Math.cos(headingOf(newAxis, newDir)), y: Math.sin(headingOf(newAxis, newDir)) };
  const r = TURN_RADIUS;
  const ccx = kx + r * (-hIn.x + hOut.x);
  const ccy = ky + r * (-hIn.y + hOut.y);
  const t1 = { x: kx - r * hIn.x, y: ky - r * hIn.y };
  const t2 = { x: kx + r * hOut.x, y: ky + r * hOut.y };
  const startAngle = Math.atan2(t1.y - ccy, t1.x - ccx);
  const endAngle = Math.atan2(t2.y - ccy, t2.x - ccx);
  let sweep = endAngle - startAngle;
  while (sweep > Math.PI) sweep -= Math.PI * 2;
  while (sweep < -Math.PI) sweep += Math.PI * 2;
  const points = [t1];
  const steps = 7;
  for (let s = 1; s <= steps; s += 1) {
    const a = startAngle + (sweep * s) / steps;
    points.push({ x: ccx + Math.cos(a) * r, y: ccy + Math.sin(a) * r });
  }
  points.push(t2);
  return { points, newAxis, newIndex, newDir };
}

function makeCar(id, x, y, angle, color, type) {
  return {
    id,
    x,
    y,
    angle,
    speed: 0,
    vx: 0,
    vy: 0,
    color,
    type,
    ai: null,
    parked: false,
    driven: false,
    wrecked: false,
    hp: 100,
    wasTraffic: false,
    axis: 'v',
    index: 0,
    dir: 1,
    state: 'drive',
    path: [],
    pathIdx: 0,
    nextCross: null,
    decided: false,
    turnTarget: null,
  };
}

function spawnTrafficCar(world, rng, id, minPlayerDist, player) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const spot = randomRoadPoint(world, rng);
    const dir = rng.chance(0.5) ? 1 : -1;
    const x = spot.axis === 'v' ? laneCoord(world, 'v', spot.index, dir) : spot.x;
    const y = spot.axis === 'v' ? spot.y : laneCoord(world, 'h', spot.index, dir);
    if (player && Math.hypot(x - player.x, y - player.y) < minPlayerDist) continue;
    const car = makeCar(id, x, y, headingOf(spot.axis, dir), rng.pick(PALETTE.carColors), rng.pick(['sedan', 'sedan', 'sedan', 'taxi', 'truck', 'sport']));
    car.ai = 'traffic';
    car.wasTraffic = true;
    car.axis = spot.axis;
    car.index = spot.index;
    car.dir = dir;
    car.speed = CFG.trafficSpeed * rng.range(0.85, 1.1);
    return car;
  }
  return null;
}

function spawnParkedCar(world, rng, id) {
  const spot = randomRoadPoint(world, rng);
  const side = rng.chance(0.5) ? 1 : -1;
  const offset = CFG.roadWidth / 2 + 4;
  let x;
  let y;
  let angle;
  if (spot.axis === 'v') {
    x = world.avenues[spot.index] + side * offset;
    y = spot.y;
    angle = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
  } else {
    x = spot.x;
    y = world.streets[spot.index] + side * offset;
    angle = rng.chance(0.5) ? 0 : Math.PI;
  }
  const car = makeCar(id, x, y, angle, rng.pick(PALETTE.carColors), rng.pick(['sedan', 'sedan', 'taxi', 'sport']));
  car.parked = true;
  return car;
}

// --- Pedestrians: a graph of sidewalk corners. ---

const CORNER = CFG.roadWidth / 2 + 10;

function nodeKey(i, j, sx, sy) {
  return `${i},${j},${sx},${sy}`;
}

function nodePos(world, key) {
  const [i, j, sx, sy] = key.split(',').map(Number);
  return {
    x: world.avenues[i] + sx * CORNER,
    y: world.streets[j] + sy * CORNER,
  };
}

function nodeNeighbours(world, key) {
  const [i, j, sx, sy] = key.split(',').map(Number);
  const out = [
    nodeKey(i, j, -sx, sy),
    nodeKey(i, j, sx, -sy),
    nodeKey(i, j, -sx, -sy),
  ];
  if (i + 1 < world.avenues.length) out.push(nodeKey(i + 1, j, -1, sy));
  if (i - 1 >= 0) out.push(nodeKey(i - 1, j, 1, sy));
  if (j + 1 < world.streets.length) out.push(nodeKey(i, j + 1, sx, -1));
  if (j - 1 >= 0) out.push(nodeKey(i, j - 1, sx, 1));
  return out;
}

function randomNode(world, rng) {
  return nodeKey(
    rng.int(0, world.avenues.length - 1),
    rng.int(0, world.streets.length - 1),
    rng.chance(0.5) ? 1 : -1,
    rng.chance(0.5) ? 1 : -1,
  );
}

function makePed(world, rng, node) {
  const pos = nodePos(world, node);
  return {
    x: pos.x,
    y: pos.y,
    angle: rng.range(0, Math.PI * 2),
    speed: CFG.pedSpeed * rng.range(0.8, 1.2),
    node,
    prevNode: null,
    target: null,
    color: rng.pick(['#d95d43', '#43a0d9', '#7bc96f', '#e8d44d', '#c98ad9', '#5b6ee8', '#e8a34d']),
    state: 'walk',
    timer: 0,
    fleeX: 0,
    fleeY: 0,
    phase: rng.range(0, Math.PI * 2),
  };
}

function pickNextNode(world, rng, ped) {
  const options = nodeNeighbours(world, ped.node).filter((n) => n !== ped.prevNode);
  const pool = options.length > 0 ? options : nodeNeighbours(world, ped.node);
  ped.target = rng.pick(pool);
}

function nearestNode(world, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (let i = 0; i < world.avenues.length; i += 1) {
    for (let j = 0; j < world.streets.length; j += 1) {
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          const nx = world.avenues[i] + sx * CORNER;
          const ny = world.streets[j] + sy * CORNER;
          const d = (nx - x) * (nx - x) + (ny - y) * (ny - y);
          if (d < bestDist) {
            bestDist = d;
            best = nodeKey(i, j, sx, sy);
          }
        }
      }
    }
  }
  return best;
}

// --- Public API ---

export function spawnTraffic(world, rng) {
  const cars = [];
  let id = 1;
  for (let k = 0; k < CFG.trafficCars; k += 1) {
    const car = spawnTrafficCar(world, rng, id, 0, null);
    if (car) {
      cars.push(car);
      id += 1;
    }
  }
  for (let k = 0; k < CFG.parkedCars; k += 1) {
    cars.push(spawnParkedCar(world, rng, id));
    id += 1;
  }
  const peds = [];
  for (let k = 0; k < CFG.pedestrians; k += 1) {
    const ped = makePed(world, rng, randomNode(world, rng));
    pickNextNode(world, rng, ped);
    peds.push(ped);
  }
  return { cars, peds, nextCarId: id };
}

// The speed a car should drive at, given the car ahead of it.
function carAheadSpeed(game, car) {
  const hx = Math.cos(car.angle);
  const hy = Math.sin(car.angle);
  let limit = CFG.trafficSpeed;
  for (const other of game.cars) {
    if (other === car || other.wrecked) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const along = dx * hx + dy * hy;
    const lat = Math.abs(-dx * hy + dy * hx);
    if (along > 0 && along < CFG.trafficMinGap + 40 && lat < 24) {
      if (along < 36) return 0;
      limit = Math.min(limit, CFG.trafficSpeed * ((along - 36) / CFG.trafficMinGap));
    }
  }
  return limit;
}

function updateTrafficCar(game, car, dt) {
  const world = game.world;
  if (car.wrecked) {
    car.speed = 0;
    return;
  }
  if (car.state === 'turn') {
    const target = car.path[car.pathIdx];
    if (!target) {
      car.state = 'drive';
      return;
    }
    const dx = target.x - car.x;
    const dy = target.y - car.y;
    const dist = Math.hypot(dx, dy);
    const step = car.speed * dt;
    if (dist <= Math.max(step, 5)) {
      car.x = target.x;
      car.y = target.y;
      car.pathIdx += 1;
      if (car.pathIdx >= car.path.length) {
        car.state = 'drive';
        if (car.turnTarget) {
          car.axis = car.turnTarget.newAxis;
          car.index = car.turnTarget.newIndex;
          car.dir = car.turnTarget.newDir;
          car.turnTarget = null;
        }
        car.nextCross = null;
        car.decided = false;
      }
    } else {
      car.angle = Math.atan2(dy, dx);
      car.x += (dx / dist) * step;
      car.y += (dy / dist) * step;
    }
    return;
  }

  // Driving along the lane: snap the lateral coordinate, advance lengthwise.
  const lane = laneCoord(world, car.axis, car.index, car.dir);
  if (car.axis === 'v') car.x = lane;
  else car.y = lane;
  car.angle = headingOf(car.axis, car.dir);

  const cross = nextIntersectionAhead(world, car);
  if (!cross) {
    // Safety net: drove off the end somehow — respawn elsewhere.
    const fresh = spawnTrafficCar(world, game.rng, car.id, 500, game.player);
    if (fresh) Object.assign(car, fresh);
    return;
  }
  const crossX = world.avenues[cross.i];
  const crossY = world.streets[cross.j];
  const distToCross = car.axis === 'v' ? Math.abs(crossY - car.y) : Math.abs(crossX - car.x);
  const crossKey = `${cross.i},${cross.j}`;
  if (car.nextCross !== crossKey) {
    car.nextCross = crossKey;
    car.decided = false;
  }
  if (!car.decided && distToCross < 48) {
    car.decided = true;
    const mustTurn = isLastIntersection(world, car, cross);
    const turn = mustTurn || game.rng.chance(CFG.trafficTurnChance);
    if (turn) {
      const side = game.rng.chance(0.5) ? 'left' : 'right';
      const built = buildTurnPath(world, car, cross, side);
      car.path = built.points;
      car.pathIdx = 0;
      car.turnTarget = built;
      car.state = 'turn';
      return;
    }
  }

  const targetSpeed = carAheadSpeed(game, car);
  car.speed += (targetSpeed - car.speed) * Math.min(1, 3 * dt);
  if (car.axis === 'v') car.y += car.dir * car.speed * dt;
  else car.x += car.dir * car.speed * dt;
}

function updatePed(game, ped, dt) {
  const world = game.world;
  ped.phase += dt * 8;
  if (ped.state === 'down') {
    ped.timer -= dt;
    if (ped.timer <= 0) {
      // Get up somewhere far from the player.
      const node = randomNode(world, game.rng);
      const pos = nodePos(world, node);
      if (Math.hypot(pos.x - game.player.x, pos.y - game.player.y) < 400) return;
      ped.node = node;
      ped.prevNode = null;
      ped.x = pos.x;
      ped.y = pos.y;
      ped.state = 'walk';
      pickNextNode(world, game.rng, ped);
    }
    return;
  }
  if (ped.state === 'flee') {
    ped.timer -= dt;
    const dx = ped.x - ped.fleeX;
    const dy = ped.y - ped.fleeY;
    const d = Math.hypot(dx, dy) || 1;
    ped.x += (dx / d) * CFG.pedFleeSpeed * dt;
    ped.y += (dy / d) * CFG.pedFleeSpeed * dt;
    ped.angle = Math.atan2(dy, dx);
    if (ped.timer <= 0) {
      ped.node = nearestNode(world, ped.x, ped.y);
      ped.prevNode = null;
      ped.state = 'walk';
      pickNextNode(world, game.rng, ped);
    }
    return;
  }
  if (!ped.target) pickNextNode(world, game.rng, ped);
  const target = nodePos(world, ped.target);
  const dx = target.x - ped.x;
  const dy = target.y - ped.y;
  const dist = Math.hypot(dx, dy);
  const step = ped.speed * dt;
  if (dist <= Math.max(step, 4)) {
    ped.x = target.x;
    ped.y = target.y;
    ped.prevNode = ped.node;
    ped.node = ped.target;
    ped.target = null;
  } else {
    ped.angle = Math.atan2(dy, dx);
    ped.x += (dx / dist) * step;
    ped.y += (dy / dist) * step;
  }
}

// Pedestrians near a gunshot run away from it.
export function scarePeds(game, x, y, radius) {
  for (const ped of game.peds) {
    if (ped.state !== 'walk') continue;
    if (Math.hypot(ped.x - x, ped.y - y) < radius) {
      ped.state = 'flee';
      ped.timer = 3;
      ped.fleeX = x;
      ped.fleeY = y;
    }
  }
}

export function updateTraffic(game, dt) {
  // Keep the streets full: replace stolen or wrecked traffic cars.
  let trafficCount = 0;
  for (const car of game.cars) {
    if (car.ai === 'traffic' && !car.wrecked) trafficCount += 1;
  }
  if (trafficCount < CFG.trafficCars) {
    game.trafficRespawnAt = (game.trafficRespawnAt || 0) - dt;
    if (game.trafficRespawnAt <= 0) {
      game.trafficRespawnAt = 1;
      const fresh = spawnTrafficCar(game.world, game.rng, game.nextCarId, 600, game.player);
      if (fresh) {
        game.nextCarId += 1;
        game.cars.push(fresh);
      }
    }
  }

  for (const car of game.cars) {
    if (car.ai === 'traffic') updateTrafficCar(game, car, dt);
  }

  // The player's car running a pedestrian over: wanted, and the ped goes down.
  const player = game.player;
  if (!player.onFoot && player.car && Math.abs(player.car.speed) > 60) {
    for (const ped of game.peds) {
      if (ped.state !== 'walk' && ped.state !== 'flee') continue;
      if (Math.hypot(ped.x - player.car.x, ped.y - player.car.y) < 28) {
        ped.state = 'down';
        ped.timer = 5;
        addWanted(game, 1);
        game.message('You hit a pedestrian! +1 star');
        game.audio.punch();
      }
    }
  }

  for (const ped of game.peds) updatePed(game, ped, dt);
}

// Shared with the police pursuit AI: lane geometry, intersection choices,
// arc turns, car-ahead braking and the car factory.
export {
  laneCoord,
  headingOf,
  nextIntersectionAhead,
  isLastIntersection,
  buildTurnPath,
  carAheadSpeed,
  makeCar,
};
