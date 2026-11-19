// Solmar City — the wanted system: stars, foot cops who chase and bust,
// and police cars that hunt the player across the road grid.

import { CFG } from './config.js';
import { collideBuildings, clampToWorld, randomRoadPoint } from './world.js';
import {
  laneCoord,
  headingOf,
  nextIntersectionAhead,
  isLastIntersection,
  buildTurnPath,
  carAheadSpeed,
  makeCar,
} from './traffic.js';

export function policeStation(world) {
  return { x: world.avenues[1] + 70, y: world.streets[1] + 70 };
}

export function hospital(world) {
  return { x: world.avenues[6] - 70, y: world.streets[4] - 70 };
}

export function createPolice() {
  return {
    wanted: 0,
    locked: false, // a mission holds the wanted level fixed
    footCops: [],
    bustMeter: 0,
    lastSeenAt: 0,
    decayTimer: 0,
    spawnTimer: 0,
    nextCopId: 1,
  };
}

export function addWanted(game, amount) {
  const police = game.police;
  if (police.locked) return;
  const before = police.wanted;
  police.wanted = Math.max(0, Math.min(5, police.wanted + amount));
  if (police.wanted > before) police.lastSeenAt = game.time;
}

export function setWanted(game, level, locked) {
  game.police.wanted = Math.max(0, Math.min(5, level));
  game.police.locked = !!locked;
  game.police.lastSeenAt = game.time;
  game.police.decayTimer = 0;
}

function desiredFootCops(wanted) {
  return [0, 2, 3, 5, 6, 8][wanted];
}

function desiredPoliceCars(wanted) {
  return [0, 0, 1, 2, 3, 4][wanted];
}

function spawnFootCop(game) {
  const world = game.world;
  const player = game.player;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const spot = randomRoadPoint(world, game.rng);
    const dist = Math.hypot(spot.x - player.x, spot.y - player.y);
    if (dist < 420 || dist > 900) continue;
    const cop = {
      id: game.police.nextCopId,
      x: spot.x,
      y: spot.y,
      angle: 0,
      hp: CFG.copHealth,
      speed: 205,
      punchTimer: 0,
      down: false,
      downTimer: 0,
    };
    game.police.nextCopId += 1;
    game.police.footCops.push(cop);
    return;
  }
}

function spawnPoliceCar(game) {
  const world = game.world;
  const player = game.player;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const spot = randomRoadPoint(world, game.rng);
    const dist = Math.hypot(spot.x - player.x, spot.y - player.y);
    if (dist < 480 || dist > 1000) continue;
    const dir = game.rng.chance(0.5) ? 1 : -1;
    const x = spot.axis === 'v' ? laneCoord(world, 'v', spot.index, dir) : spot.x;
    const y = spot.axis === 'v' ? spot.y : laneCoord(world, 'h', spot.index, dir);
    const car = makeCar(game.nextCarId, x, y, headingOf(spot.axis, dir), CFG.policeCar, 'police');
    game.nextCarId += 1;
    car.ai = 'police';
    car.axis = spot.axis;
    car.index = spot.index;
    car.dir = dir;
    car.speed = 300;
    car.mode = 'pursue';
    game.cars.push(car);
    return;
  }
}

function reattachToRoad(game, car) {
  const world = game.world;
  // Snap the car to the nearest road lane and keep its heading's axis.
  let best = null;
  let bestDist = Infinity;
  for (let i = 0; i < world.avenues.length; i += 1) {
    const d = Math.abs(car.x - world.avenues[i]);
    if (d < bestDist) {
      bestDist = d;
      best = { axis: 'v', index: i };
    }
  }
  for (let j = 0; j < world.streets.length; j += 1) {
    const d = Math.abs(car.y - world.streets[j]);
    if (d < bestDist) {
      bestDist = d;
      best = { axis: 'h', index: j };
    }
  }
  const heading = Math.cos(car.angle) >= 0;
  if (best.axis === 'v') {
    car.dir = Math.sin(car.angle) >= 0 ? 1 : -1;
    car.x = laneCoord(world, 'v', best.index, car.dir);
  } else {
    car.dir = heading ? 1 : -1;
    car.y = laneCoord(world, 'h', best.index, car.dir);
  }
  car.axis = best.axis;
  car.index = best.index;
  car.angle = headingOf(car.axis, car.dir);
  car.state = 'drive';
  car.path = [];
  car.nextCross = null;
  car.decided = false;
  car.turnTarget = null;
  car.mode = 'pursue';
}

// Pick the intersection option that gets closest to the player.
function choosePursuitOption(game, car, cross) {
  const world = game.world;
  const player = game.player;
  const options = [];
  const mustTurn = isLastIntersection(world, car, cross);
  if (!mustTurn) {
    // Straight: one block ahead on the same road.
    let px = car.x;
    let py = car.y;
    if (car.axis === 'v') py = world.streets[cross.j] + car.dir * CFG.roadPitch;
    else px = world.avenues[cross.i] + car.dir * CFG.roadPitch;
    options.push({ kind: 'straight', dist: Math.abs(px - player.x) + Math.abs(py - player.y) });
  }
  for (const side of ['left', 'right']) {
    const built = buildTurnPath(world, car, cross, side);
    const last = built.points[built.points.length - 1];
    let px = last.x;
    let py = last.y;
    if (built.newAxis === 'v') py += built.newDir * CFG.roadPitch;
    else px += built.newDir * CFG.roadPitch;
    options.push({
      kind: side,
      dist: Math.abs(px - player.x) + Math.abs(py - player.y),
      built,
    });
  }
  options.sort((a, b) => a.dist - b.dist);
  return options[0];
}

function updatePoliceCar(game, car, dt) {
  const world = game.world;
  const player = game.player;
  if (car.wrecked) {
    car.speed = 0;
    return;
  }
  const distToPlayer = Math.hypot(player.x - car.x, player.y - car.y);

  if (car.mode === 'ram') {
    if (distToPlayer > 300) {
      reattachToRoad(game, car);
      return;
    }
    const want = Math.atan2(player.y - car.y, player.x - car.x);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-3.2 * dt, Math.min(3.2 * dt, diff));
    car.speed += (440 - car.speed) * Math.min(1, 2 * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    const fixed = collideBuildings(world, car.x, car.y, CFG.carRadius);
    if (fixed.x !== car.x || fixed.y !== car.y) {
      car.x = fixed.x;
      car.y = fixed.y;
      car.speed *= 0.5;
    }
    const clamped = clampToWorld(car.x, car.y, CFG.carRadius);
    car.x = clamped.x;
    car.y = clamped.y;
    return;
  }

  // Pursue mode: road driving with greedy intersection choices.
  if (distToPlayer < 130) {
    car.mode = 'ram';
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

  const lane = laneCoord(world, car.axis, car.index, car.dir);
  if (car.axis === 'v') car.x = lane;
  else car.y = lane;
  car.angle = headingOf(car.axis, car.dir);

  const cross = nextIntersectionAhead(world, car);
  if (!cross) {
    reattachToRoad(game, car);
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
    const choice = choosePursuitOption(game, car, cross);
    if (choice.kind !== 'straight') {
      car.path = choice.built.points;
      car.pathIdx = 0;
      car.turnTarget = choice.built;
      car.state = 'turn';
      return;
    }
  }
  const targetSpeed = Math.max(300, Math.min(430, carAheadSpeed(game, car) + 180));
  car.speed += (targetSpeed - car.speed) * Math.min(1, 2.5 * dt);
  if (car.axis === 'v') car.y += car.dir * car.speed * dt;
  else car.x += car.dir * car.speed * dt;
}

function updateFootCop(game, cop, dt) {
  const player = game.player;
  if (cop.down) {
    cop.downTimer -= dt;
    return;
  }
  cop.punchTimer = Math.max(0, cop.punchTimer - dt);
  const dx = player.x - cop.x;
  const dy = player.y - cop.y;
  const dist = Math.hypot(dx, dy) || 1;
  // Cops sprint a little faster than the player walks, slower than a sprint.
  const speed = cop.speed;
  cop.angle = Math.atan2(dy, dx);
  if (dist > 26) {
    cop.x += (dx / dist) * speed * dt;
    cop.y += (dy / dist) * speed * dt;
  }
  const fixed = collideBuildings(game.world, cop.x, cop.y, CFG.playerRadius);
  cop.x = fixed.x;
  cop.y = fixed.y;
  const clamped = clampToWorld(cop.x, cop.y, CFG.playerRadius);
  cop.x = clamped.x;
  cop.y = clamped.y;
  // Punch when close to an on-foot player.
  if (dist < 34 && player.onFoot && cop.punchTimer <= 0) {
    cop.punchTimer = 0.9;
    game.damagePlayer(6);
    game.audio.punch();
  }
}

export function updatePolice(game, dt) {
  const police = game.police;
  const player = game.player;

  if (police.wanted <= 0) {
    police.bustMeter = 0;
    // The heat is off: cops and police cars leave.
    police.footCops.length = 0;
    game.cars = game.cars.filter((car) => car.ai !== 'police');
    game.audio.siren(false);
    return;
  }

  // Spawning to keep the pressure on.
  police.spawnTimer -= dt;
  const policeCars = game.cars.filter((car) => car.ai === 'police' && !car.wrecked);
  if (police.spawnTimer <= 0) {
    police.spawnTimer = 0.8;
    if (police.footCops.filter((c) => !c.down).length < desiredFootCops(police.wanted)) {
      spawnFootCop(game);
    } else if (policeCars.length < desiredPoliceCars(police.wanted)) {
      spawnPoliceCar(game);
    }
  }

  // A cop nearby means the player is seen.
  let seen = false;
  for (const cop of police.footCops) {
    if (!cop.down && Math.hypot(cop.x - player.x, cop.y - player.y) < 420) seen = true;
  }
  for (const car of policeCars) {
    if (Math.hypot(car.x - player.x, car.y - player.y) < 420) seen = true;
  }
  if (seen) {
    police.lastSeenAt = game.time;
    police.decayTimer = 0;
  } else if (!police.locked && game.time - police.lastSeenAt > CFG.wantedDecayDelay) {
    police.decayTimer += dt;
    if (police.decayTimer >= CFG.wantedDecayInterval) {
      police.decayTimer = 0;
      police.wanted -= 1;
      game.message(`Wanted level dropped to ${police.wanted} star${police.wanted === 1 ? '' : 's'}`);
    }
  }

  // Bust meter: caught flat-footed by a cop, or boxed in while driving.
  let catching = 0;
  for (const cop of police.footCops) {
    if (cop.down) continue;
    const d = Math.hypot(cop.x - player.x, cop.y - player.y);
    if (player.onFoot && d < 36 && player.speed < 60) catching += 1;
    if (!player.onFoot && player.car && Math.abs(player.car.speed) < 30 && d < 44) catching += 1;
  }
  if (!player.onFoot && player.car && Math.abs(player.car.speed) < 30) {
    for (const car of policeCars) {
      if (Math.hypot(car.x - player.x, car.y - player.y) < 75) catching += 1;
    }
  }
  if (catching > 0) {
    police.bustMeter = Math.min(1, police.bustMeter + (Math.min(2, catching) * dt) / CFG.bustTime);
    if (police.bustMeter >= 1) game.pendingBusted = true;
  } else {
    police.bustMeter = Math.max(0, police.bustMeter - 0.5 * dt);
  }

  for (const cop of police.footCops) updateFootCop(game, cop, dt);
  police.footCops = police.footCops.filter((c) => !(c.down && c.downTimer <= 0));
  for (const car of game.cars) {
    if (car.ai === 'police') updatePoliceCar(game, car, dt);
  }

  // Siren when a police car is near.
  let nearSiren = false;
  for (const car of policeCars) {
    if (Math.hypot(car.x - player.x, car.y - player.y) < 520) nearSiren = true;
  }
  game.audio.siren(nearSiren);
}
