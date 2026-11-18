// Traffic: cars that drive the road grid between intersections, keep their lane, slow for the
// car ahead and stop at a jam, plus the parked cars the player can steal. Traffic keeps the
// city feeling alive behind every screenshot.
import { TRAFFIC } from './config.js';
import { collideCars, createCar, stepCar } from './vehicles.js';
import { isOnRoad, nearestIntersection, randomRoadPoint } from './world.js';

const LANE_OFFSET = 27;

function lanePoint(x, y, dirX, dirY) {
  // Right-hand traffic: the lane sits to the right of the direction of travel.
  return { x: x - dirY * LANE_OFFSET, y: y + dirX * LANE_OFFSET };
}

/** A route along the grid: from the nearest intersection to a random far one, Manhattan-style. */
function makeRoute(city, rng, fromX, fromY) {
  const start = nearestIntersection(city, fromX, fromY);
  let target = city.intersections[Math.floor(rng.next() * city.intersections.length)];
  let guard = 0;
  while (Math.abs(target.x - start.x) + Math.abs(target.y - start.y) < 1200 && guard < 12) {
    target = city.intersections[Math.floor(rng.next() * city.intersections.length)];
    guard += 1;
  }
  const points = [];
  let cx = start.x;
  let cy = start.y;
  // First along the avenue, then along the street (or the reverse, at random).
  const xFirst = rng.chance(0.5);
  const legs = xFirst ? [{ x: target.x, y: cy }, { x: target.x, y: target.y }] : [{ x: cx, y: target.y }, { x: target.x, y: target.y }];
  for (let i = 0; i < legs.length; i += 1) {
    const leg = legs[i];
    const dx = Math.sign(leg.x - cx);
    const dy = Math.sign(leg.y - cy);
    if (dx === 0 && dy === 0) {
      cx = leg.x;
      cy = leg.y;
      continue;
    }
    points.push(lanePoint(leg.x, leg.y, dx, dy));
    // A corner needs two points: the lane point of the leg arriving at the corner and a
    // point 60 px along the leg leaving it, in that leg's lane. A single point makes the
    // car aim across the corner and cut it over the sidewalk; the pair steers the turn
    // through the intersection itself.
    if (i + 1 < legs.length) {
      const next = legs[i + 1];
      const ndx = Math.sign(next.x - leg.x);
      const ndy = Math.sign(next.y - leg.y);
      if (ndx !== 0 || ndy !== 0) points.push(lanePoint(leg.x + ndx * 60, leg.y + ndy * 60, ndx, ndy));
    }
    cx = leg.x;
    cy = leg.y;
  }
  return points.length > 0 ? points : [lanePoint(target.x, target.y, 1, 0)];
}

/**
 * The nearest point on a road centreline to a car that has left the road (pushed by a crash
 * or wedged on a corner): the closest avenue or street, whichever is nearer.
 */
function nearestRoadPoint(city, x, y) {
  let bestAx = city.intersections[0].x;
  let bestAd = Infinity;
  for (const p of city.intersections) {
    const d = Math.abs(p.x - x);
    if (d < bestAd) {
      bestAd = d;
      bestAx = p.x;
    }
  }
  let bestSy = city.intersections[0].y;
  let bestSd = Infinity;
  for (const p of city.intersections) {
    const d = Math.abs(p.y - y);
    if (d < bestSd) {
      bestSd = d;
      bestSy = p.y;
    }
  }
  return bestAd <= bestSd ? { x: bestAx, y } : { x, y: bestSy };
}

export function spawnTraffic(state) {
  const { city, rng } = state;
  for (let i = 0; i < TRAFFIC.count; i += 1) {
    const p = randomRoadPoint(rng);
    const type = rng.pick(['sedan', 'sedan', 'taxi', 'van', 'truck', 'sports']);
    const angle = rng.chance(0.5) ? (rng.chance(0.5) ? 0 : Math.PI) : rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
    const car = createCar(type, p.x, p.y, angle, 'traffic');
    car.route = makeRoute(city, rng, p.x, p.y);
    car.routeIndex = 0;
    car.speed = TRAFFIC.cruiseSpeed * rng.range(0.7, 1);
    state.cars.push(car);
  }
}

export function spawnParkedCars(state) {
  const { city, rng } = state;
  const types = ['sedan', 'sedan', 'taxi', 'van', 'sports', 'truck'];
  for (let i = 0; i < TRAFFIC.parkedCount; i += 1) {
    const p = randomRoadPoint(rng);
    // Parked along the kerb: just off the road's edge, aligned with it.
    const vertical = rng.chance(0.5);
    const x = vertical ? p.x + 44 : p.x;
    const y = vertical ? p.y : p.y + 44;
    if (!isOnRoad(city, x, y) && y < 3080) continue;
    const angle = vertical ? (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : rng.chance(0.5) ? 0 : Math.PI;
    state.cars.push(createCar(rng.pick(types), x, y, angle, 'parked'));
  }
  // The gold sports car for the final mission, parked at the harbor gate.
  const prize = createCar('sports', state.city.harborGate.x + 60, state.city.harborGate.y + 40, Math.PI / 2, 'parked');
  prize.color = '#f2c94c';
  prize.prizeCar = true;
  state.cars.push(prize);
}

function angleTo(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Is there a car or a pedestrian close ahead of this car? */
function blockedAhead(state, car) {
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  for (const other of state.cars) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const ahead = dx * fx + dy * fy;
    const side = Math.abs(dx * -fy + dy * fx);
    if (ahead > 0 && ahead < TRAFFIC.slowDistance && side < 30) return ahead;
  }
  for (const ped of state.peds) {
    if (ped.state === 'down') continue;
    const dx = ped.x - car.x;
    const dy = ped.y - car.y;
    const ahead = dx * fx + dy * fy;
    const side = Math.abs(dx * -fy + dy * fx);
    if (ahead > 0 && ahead < TRAFFIC.stopDistance && side < 26) return ahead;
  }
  return Infinity;
}

function driveTrafficCar(state, car, dt) {
  // Backing out of a jam: reverse briefly, steering the other way, then drive on.
  if (car.reverseTimer > 0) {
    car.reverseTimer -= dt;
    stepCar(car, dt, -1, -car.stuckSteer, false, state.city);
    return;
  }
  if (!car.route || car.routeIndex >= car.route.length) {
    car.route = makeRoute(state.city, state.rng, car.x, car.y);
    car.routeIndex = 0;
  }
  // Off the road (pushed by a crash, wedged on a corner): drive back to the nearest road
  // first instead of aiming across the blocks at a far waypoint. A building can sit between
  // the car and the road, so this branch has the same stuck detection as the main one: grind
  // for 1.5 s and the car backs out and falls back to the nearest intersection — open ground
  // with no building in the way — instead of pushing at the same wall again.
  if (!isOnRoad(state.city, car.x, car.y)) {
    const back = car.recoverToJunction
      ? nearestIntersection(state.city, car.x, car.y)
      : nearestRoadPoint(state.city, car.x, car.y);
    const wantAngle = angleTo(car.x, car.y, back.x, back.y);
    const steer = Math.max(-1, Math.min(1, angleDiff(wantAngle, car.angle) * 2.2));
    stepCar(car, dt, 0.5, steer, false, state.city);
    if (Math.abs(car.speed) < 25) {
      car.stuckTimer += dt;
      if (car.stuckTimer > 1.5) {
        car.stuckTimer = 0;
        car.reverseTimer = 1.2;
        car.stuckSteer = steer;
        car.recoverToJunction = true;
        car.route = makeRoute(state.city, state.rng, car.x, car.y);
        car.routeIndex = 0;
      }
    } else {
      car.stuckTimer = 0;
    }
    return;
  }
  car.recoverToJunction = false;
  const target = car.route[car.routeIndex];
  const dx = target.x - car.x;
  const dy = target.y - car.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 30) {
    car.routeIndex += 1;
    return;
  }
  const wantAngle = angleTo(car.x, car.y, target.x, target.y);
  const steer = Math.max(-1, Math.min(1, angleDiff(wantAngle, car.angle) * 2.2));
  const ahead = blockedAhead(state, car);
  let throttle = 0.65;
  if (ahead < TRAFFIC.stopDistance) throttle = -1;
  else if (ahead < TRAFFIC.slowDistance) throttle = 0.15;
  if (Math.abs(angleDiff(wantAngle, car.angle)) > 1.1) throttle = Math.min(throttle, 0.3);
  // Slow into a turn: a car that arrives at a corner at cruise speed swings wide onto the
  // sidewalk. When the next route point turns away from this leg, ease off early — the
  // turn radius shrinks with speed, so a slow car turns inside the intersection.
  const next = car.route[car.routeIndex + 1];
  if (next && dist < 200) {
    const legAngle = Math.atan2(next.y - target.y, next.x - target.x);
    if (Math.abs(angleDiff(legAngle, wantAngle)) > 0.5) throttle = Math.min(throttle, 0.2);
  }
  const result = stepCar(car, dt, throttle, steer, false, state.city);
  // A car pushing at full throttle without moving is wedged on a corner: back out and
  // pick a fresh route instead of grinding there for the rest of the game.
  if (throttle > 0 && Math.abs(car.speed) < 25) {
    car.stuckTimer += dt;
    if (car.stuckTimer > 2) {
      car.stuckTimer = 0;
      car.reverseTimer = 0.9;
      car.stuckSteer = steer;
      car.route = makeRoute(state.city, state.rng, car.x, car.y);
      car.routeIndex = 0;
    }
  } else {
    car.stuckTimer = 0;
  }
  if (result === 'crash') {
    // A traffic car that smashed into a wall picks a fresh route instead of grinding.
    car.route = makeRoute(state.city, state.rng, car.x, car.y);
    car.routeIndex = 0;
  }
  // A dead traffic car is towed away and a fresh one spawns elsewhere.
  if (car.hp <= 0) {
    car.hp = 100;
    const p = randomRoadPoint(state.rng);
    car.x = p.x;
    car.y = p.y;
    car.speed = 0;
    car.route = makeRoute(state.city, state.rng, p.x, p.y);
    car.routeIndex = 0;
  }
}

export function updateTraffic(state, dt) {
  for (const car of state.cars) {
    if (car.driver === 'traffic') driveTrafficCar(state, car, dt);
  }
}

/** Run after updateTraffic: resolves every car pair once per step. */
export function resolveCarCollisions(state, dt) {
  const cars = state.cars;
  for (const car of cars) {
    if (car.damageCooldown > 0) car.damageCooldown = Math.max(0, car.damageCooldown - dt);
  }
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      if (a.driver === 'parked' && b.driver === 'parked') continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (Math.abs(dx) > 90 || Math.abs(dy) > 90) continue;
      if (collideCars(a, b)) {
        state.events.push({ type: 'crash', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, big: true });
        state.camera.shake = Math.max(state.camera.shake, 6);
      }
    }
  }
}
