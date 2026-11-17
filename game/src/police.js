// The law: a wanted level from 0 to 5 stars that rises with crimes and cools when the player
// lays low out of sight, foot cops who run the player down and arrest him, and police cars
// that chase and ram. Getting busted ends the run (and fails the active mission).
import { POLICE, WANTED } from './config.js';
import { createCar, stepCar } from './vehicles.js';
import { randomRoadPoint } from './world.js';

export function wantedLevel(points) {
  let level = 0;
  for (let i = 0; i < WANTED.thresholds.length; i += 1) {
    if (points >= WANTED.thresholds[i]) level = i;
  }
  return Math.min(level, WANTED.maxLevel);
}

function createFootCop(x, y) {
  return { x, y, angle: 0, health: 60, speed: POLICE.footSpeed, down: false, r: 13 };
}

function spawnPointNear(state, rng) {
  const player = state.player;
  for (let tries = 0; tries < 12; tries += 1) {
    const p = randomRoadPoint(rng);
    const d = Math.hypot(p.x - player.x, p.y - player.y);
    if (d > POLICE.spawnDistance * 0.7 && d < POLICE.spawnDistance * 1.6) return p;
  }
  return { x: player.x + POLICE.spawnDistance, y: player.y };
}

function desiredFootCops(level) {
  return Math.min(level * 2, POLICE.maxFootCops);
}

function desiredPoliceCars(level) {
  if (level < 2) return 0;
  return Math.min(level - 1, POLICE.maxCars);
}

function countPoliceCars(state) {
  let n = 0;
  for (const car of state.cars) if (car.driver === 'police') n += 1;
  return n;
}

function spawnPolice(state) {
  const level = state.wanted.level;
  const alive = state.cops.filter((c) => !c.down).length;
  for (let i = alive; i < desiredFootCops(level); i += 1) {
    const p = spawnPointNear(state, state.rng);
    state.cops.push(createFootCop(p.x, p.y));
  }
  for (let i = countPoliceCars(state); i < desiredPoliceCars(level); i += 1) {
    const p = spawnPointNear(state, state.rng);
    const car = createCar('police', p.x, p.y, Math.atan2(state.player.y - p.y, state.player.x - p.x), 'police');
    car.speed = 200;
    state.cars.push(car);
  }
}

function anyCopSeesPlayer(state) {
  const player = state.player;
  for (const cop of state.cops) {
    if (!cop.down && Math.hypot(cop.x - player.x, cop.y - player.y) < 500) return true;
  }
  for (const car of state.cars) {
    if (car.driver === 'police' && Math.hypot(car.x - player.x, car.y - player.y) < 600) return true;
  }
  return false;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function updateFootCop(state, cop, dt) {
  if (cop.down) return;
  const player = state.player;
  const dx = player.x - cop.x;
  const dy = player.y - cop.y;
  const dist = Math.hypot(dx, dy);
  cop.angle = Math.atan2(dy, dx);
  if (dist > 24) {
    cop.x += (dx / dist) * cop.speed * dt;
    cop.y += (dy / dist) * cop.speed * dt;
  }
  // A cop on foot shoots at a fleeing player who is far but wanted hard.
  if (state.wanted.level >= 3 && dist > 120 && dist < 420 && !player.car) {
    cop.shootTimer = (cop.shootTimer || 0) - dt;
    if (cop.shootTimer <= 0) {
      cop.shootTimer = 1.4;
      state.bullets.push({
        x: cop.x,
        y: cop.y,
        vx: Math.cos(cop.angle + (state.rng.next() - 0.5) * 0.3) * 900,
        vy: Math.sin(cop.angle + (state.rng.next() - 0.5) * 0.3) * 900,
        life: 0.9,
        from: 'cop',
        damage: 7,
      });
      state.events.push({ type: 'shot', x: cop.x, y: cop.y });
    }
  }
}

function updatePoliceCar(state, car, dt) {
  const player = state.player;
  const wantAngle = Math.atan2(player.y - car.y, player.x - car.x);
  const steer = Math.max(-1, Math.min(1, angleDiff(wantAngle, car.angle) * 2.4));
  // Aim slightly ahead of a moving player to cut him off.
  const lead = 0.35;
  const tx = player.x + (player.car ? Math.cos(player.car.angle) * player.car.speed * lead : 0);
  const ty = player.y + (player.car ? Math.sin(player.car.angle) * player.car.speed * lead : 0);
  const leadAngle = Math.atan2(ty - car.y, tx - car.x);
  const leadSteer = Math.max(-1, Math.min(1, angleDiff(leadAngle, car.angle) * 2.4));
  const result = stepCar(car, dt, 1, (steer + leadSteer) / 2, false, state.city);
  car.sirenPhase += dt * 6;
  if (result === 'crash') {
    car.speed = Math.max(car.speed, 120);
  }
  if (car.hp <= 0) {
    // A wrecked police car is abandoned; a fresh one will spawn if the heat stays on.
    car.driver = 'parked';
    car.hp = 100;
    state.events.push({ type: 'copCarWrecked', x: car.x, y: car.y });
  }
}

function checkBusted(state, dt) {
  const player = state.player;
  if (state.wanted.level === 0) {
    state.bustProgress = 0;
    return;
  }
  let caught = false;
  if (!player.car) {
    for (const cop of state.cops) {
      if (!cop.down && Math.hypot(cop.x - player.x, cop.y - player.y) < POLICE.bustDistance) {
        caught = true;
        break;
      }
    }
  } else {
    const speed = Math.abs(player.car.speed);
    if (speed < 25) {
      for (const car of state.cars) {
        if (car.driver === 'police' && Math.hypot(car.x - player.x, car.y - player.y) < POLICE.carBustDistance) {
          caught = true;
          break;
        }
      }
      for (const cop of state.cops) {
        if (!cop.down && Math.hypot(cop.x - player.x, cop.y - player.y) < POLICE.bustDistance) {
          caught = true;
          break;
        }
      }
    }
  }
  if (caught) {
    state.bustProgress += dt;
    if (state.bustProgress >= POLICE.bustSeconds) state.events.push({ type: 'busted' });
  } else {
    state.bustProgress = Math.max(0, state.bustProgress - dt * 2);
  }
}

export function updatePolice(state, dt) {
  const wanted = state.wanted;
  wanted.level = wantedLevel(wanted.points);
  if (wanted.level > 0) {
    spawnPolice(state);
    if (anyCopSeesPlayer(state)) wanted.unseenTimer = 0;
    else {
      wanted.unseenTimer += dt;
      if (wanted.unseenTimer > WANTED.unseenGrace) {
        wanted.points = Math.max(0, wanted.points - WANTED.decayPerSecond * dt);
      }
    }
  } else {
    // The heat is off: cops walk away, police cars leave.
    for (let i = state.cops.length - 1; i >= 0; i -= 1) state.cops.splice(i, 1);
    for (let i = state.cars.length - 1; i >= 0; i -= 1) {
      if (state.cars[i].driver === 'police') state.cars.splice(i, 1);
    }
    state.bustProgress = 0;
  }
  for (const cop of state.cops) updateFootCop(state, cop, dt);
  for (const car of state.cars) {
    if (car.driver === 'police') updatePoliceCar(state, car, dt);
  }
  // Downed cops are cleared once the heat drops.
  if (wanted.level === 0) state.cops.length = 0;
  checkBusted(state, dt);
}

/** Add wanted points for a crime, clamped to the top of the scale. */
export function addWanted(state, points) {
  state.wanted.points = Math.min(WANTED.thresholds[WANTED.maxLevel], state.wanted.points + points);
  state.wanted.level = wantedLevel(state.wanted.points);
}
