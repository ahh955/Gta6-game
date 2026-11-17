// Pedestrians: Solmar's walkers. They stroll the sidewalks between random points, chat in
// place sometimes, and flee when they hear a gunshot or a car bears down on them. Hitting one
// is a crime the wanted system notices; a pedestrian a car runs down stays down.
import { PEDS } from './config.js';
import { clampToCity, collideBuildings, randomSidewalkPoint } from './world.js';

const SHIRT_COLORS = ['#e07a5f', '#81b29a', '#f2cc8f', '#6a8caf', '#c97b9a', '#9a8ac9', '#d8d8d8', '#5a9a7a'];

export function createPed(x, y, rng) {
  return {
    x,
    y,
    angle: rng.range(0, Math.PI * 2),
    target: null,
    state: 'walk', // 'walk' | 'flee' | 'down' | 'idle'
    stateTimer: rng.range(0, 4),
    speed: PEDS.walkSpeed * rng.range(0.8, 1.25),
    shirt: SHIRT_COLORS[Math.floor(rng.next() * SHIRT_COLORS.length)],
    skin: rng.pick(['#f2c9a0', '#d8a878', '#a87850', '#8a5f3a']),
    panic: 0,
    downTimer: 0,
    r: 12,
  };
}

export function spawnPedestrians(state) {
  for (let i = 0; i < PEDS.count; i += 1) {
    const p = randomSidewalkPoint(state.city, state.rng);
    const ped = createPed(p.x, p.y, state.rng);
    ped.target = randomSidewalkPoint(state.city, state.rng);
    state.peds.push(ped);
  }
}

function nearestDanger(state, ped) {
  let danger = null;
  let bestD = PEDS.fleeRadius;
  for (const car of state.cars) {
    if (Math.abs(car.speed) < 120) continue;
    const d = Math.hypot(car.x - ped.x, car.y - ped.y);
    if (d < bestD) {
      bestD = d;
      danger = car;
    }
  }
  const player = state.player;
  if (player.firing) {
    const d = Math.hypot(player.x - ped.x, player.y - ped.y);
    if (d < PEDS.fleeRadius * 1.4) danger = player;
  }
  return danger;
}

function movePed(state, ped, dt, tx, ty, speed) {
  const dx = tx - ped.x;
  const dy = ty - ped.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;
  ped.angle = Math.atan2(dy, dx);
  ped.x += (dx / dist) * speed * dt;
  ped.y += (dy / dist) * speed * dt;
  const circle = { x: ped.x, y: ped.y, r: ped.r };
  collideBuildings(state.city, circle);
  clampToCity(circle);
  ped.x = circle.x;
  ped.y = circle.y;
  return dist < 12;
}

function updatePed(state, ped, dt) {
  if (ped.state === 'down') {
    ped.downTimer -= dt;
    if (ped.downTimer <= 0) {
      // The pedestrian gets up and staggers away; the city never runs out of walkers.
      ped.state = 'flee';
      ped.panic = 3;
    }
    return;
  }
  const danger = nearestDanger(state, ped);
  if (danger && ped.state !== 'flee') {
    ped.state = 'flee';
    ped.panic = 2 + state.rng.next() * 2;
  }
  if (ped.state === 'flee') {
    ped.panic -= dt;
    const awayX = ped.x + (ped.x - (danger ? danger.x : state.player.x));
    const awayY = ped.y + (ped.y - (danger ? danger.y : state.player.y));
    movePed(state, ped, dt, awayX, awayY, PEDS.fleeSpeed);
    if (ped.panic <= 0) {
      ped.state = 'walk';
      ped.target = randomSidewalkPoint(state.city, state.rng);
    }
    return;
  }
  if (ped.state === 'idle') {
    ped.stateTimer -= dt;
    if (ped.stateTimer <= 0) {
      ped.state = 'walk';
      ped.target = randomSidewalkPoint(state.city, state.rng);
    }
    return;
  }
  if (!ped.target) ped.target = randomSidewalkPoint(state.city, state.rng);
  if (movePed(state, ped, dt, ped.target.x, ped.target.y, ped.speed)) {
    ped.target = null;
    if (state.rng.chance(0.25)) {
      ped.state = 'idle';
      ped.stateTimer = state.rng.range(2, 6);
    }
  }
}

export function updatePedestrians(state, dt) {
  for (const ped of state.peds) updatePed(state, ped, dt);
}

/** A car running a pedestrian down: the pedestrian goes down and it is a crime. */
export function checkPedCarHits(state) {
  const playerCar = state.player.car;
  for (const ped of state.peds) {
    if (ped.state === 'down') continue;
    for (const car of state.cars) {
      if (Math.abs(car.speed) < 60) continue;
      const dx = ped.x - car.x;
      const dy = ped.y - car.y;
      if (Math.abs(dx) > 40 || Math.abs(dy) > 40) continue;
      if (dx * dx + dy * dy < 26 * 26) {
        ped.state = 'down';
        ped.downTimer = 6;
        ped.angle = Math.atan2(dy, dx);
        state.events.push({ type: 'pedDown', x: ped.x, y: ped.y });
        if (car === playerCar) {
          state.wanted.points += 80;
          state.events.push({ type: 'crime', text: 'Pedestrian hit! +WANTED' });
        }
        break;
      }
    }
  }
}
