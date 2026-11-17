// The player, Dario Reyes: on foot he walks and sprints, aims at the mouse and shoots; in a
// car he drives it. E steps into the nearest car (stealing it unless it is already his) and
// back out at the driver's door. Health, money and ammo live here.
import { GUN, PLAYER, WANTED } from './config.js';
import { clampToCity, collideBuildings } from './world.js';
import { doorPosition, stepCar } from './vehicles.js';

export function createPlayer(x, y) {
  return {
    x,
    y,
    angle: -Math.PI / 2,
    aimAngle: -Math.PI / 2,
    health: PLAYER.maxHealth,
    money: 0,
    car: null,
    ownedCars: new Set(),
    ammo: GUN.magazine,
    reloading: 0,
    fireCooldown: 0,
    punchCooldown: 0,
    firing: false,
    moving: false,
    sprinting: false,
    invulnerable: 0,
    r: PLAYER.radius,
  };
}

/** The nearest car the player could step into, within reach. */
export function nearestCar(state, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of state.cars) {
    if (car.driver === 'police') continue;
    const d = Math.hypot(car.x - state.player.x, car.y - state.player.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

function stepOnFoot(state, dt, input) {
  const player = state.player;
  const move = input.move();
  const sprint = input.sprinting();
  const speed = sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  const len = Math.hypot(move.x, move.y);
  player.moving = len > 0;
  player.sprinting = sprint && len > 0;
  if (len > 0) {
    const nx = move.x / len;
    const ny = move.y / len;
    player.x += nx * speed * dt;
    player.y += ny * speed * dt;
    player.angle = Math.atan2(ny, nx);
  }
  const circle = { x: player.x, y: player.y, r: player.r };
  collideBuildings(state.city, circle);
  clampToCity(circle);
  player.x = circle.x;
  player.y = circle.y;
  // Aim follows the mouse (converted to world space by the caller through state.mouseWorld).
  const aim = state.mouseWorld;
  if (aim) player.aimAngle = Math.atan2(aim.y - player.y, aim.x - player.x);
  player.firing = input.firing();
}

function stepDriving(state, dt, input) {
  const player = state.player;
  const car = player.car;
  const move = input.move();
  const throttle = move.y < 0 ? 1 : move.y > 0 ? -1 : 0;
  const steer = move.x;
  const handbrake = input.sprinting();
  const result = stepCar(car, dt, throttle, steer, handbrake, state.city);
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  player.aimAngle = car.angle;
  player.moving = Math.abs(car.speed) > 10;
  if (result === 'crash') {
    state.events.push({ type: 'crash', x: car.x, y: car.y, big: true });
    state.camera.shake = Math.max(state.camera.shake, 8);
    if (Math.abs(car.speed) > 300) state.events.push({ type: 'damage', amount: 0 });
  }
  // Skid marks and exhaust while driving hard.
  if (handbrake && Math.abs(car.speed) > 220) {
    state.skidmarks.push({ x: car.x, y: car.y, angle: car.angle, life: 3 });
    if (state.skidmarks.length > 120) state.skidmarks.shift();
  }
  if (Math.abs(car.speed) > 60 && state.rng.chance(0.3)) {
    const bx = car.x - Math.cos(car.angle) * (car.spec.length / 2);
    const by = car.y - Math.sin(car.angle) * (car.spec.length / 2);
    state.particles.push({ x: bx, y: by, vx: -Math.cos(car.angle) * 30, vy: -Math.sin(car.angle) * 30, life: 0.5, maxLife: 0.5, color: 'rgba(120,120,120,0.5)', size: 5, kind: 'puff' });
  }
}

export function enterCar(state, car) {
  const player = state.player;
  player.car = car;
  car.driver = 'player';
  car.waitTimer = 0;
  if (!player.ownedCars.has(car.id)) {
    // A stolen car: the law notices.
    state.wanted.points += WANTED.stealCar;
    state.events.push({ type: 'crime', text: 'Car stolen! +WANTED' });
    state.events.push({ type: 'stolen', x: car.x, y: car.y });
  }
  state.events.push({ type: 'enterCar' });
}

export function exitCar(state) {
  const player = state.player;
  const car = player.car;
  if (!car) return;
  const door = doorPosition(car);
  player.car = null;
  car.driver = 'parked';
  car.speed = 0;
  player.x = door.x;
  player.y = door.y;
  const circle = { x: player.x, y: player.y, r: player.r };
  collideBuildings(state.city, circle);
  clampToCity(circle);
  player.x = circle.x;
  player.y = circle.y;
  player.ownedCars.add(car.id);
}

export function updatePlayer(state, dt, input, actions) {
  const player = state.player;
  if (player.invulnerable > 0) player.invulnerable -= dt;
  if (player.fireCooldown > 0) player.fireCooldown -= dt;
  if (player.punchCooldown > 0) player.punchCooldown -= dt;
  if (player.reloading > 0) {
    player.reloading -= dt;
    if (player.reloading <= 0) player.ammo = GUN.magazine;
  }
  if (actions.enter) {
    if (player.car) exitCar(state);
    else {
      const car = nearestCar(state, 70);
      if (car) enterCar(state, car);
    }
  }
  if (player.car) stepDriving(state, dt, input);
  else stepOnFoot(state, dt, input);
}

/** Damage the player; returns true when it killed him. */
export function damagePlayer(state, amount) {
  const player = state.player;
  if (player.invulnerable > 0 || player.health <= 0) return false;
  player.health = Math.max(0, player.health - amount);
  state.events.push({ type: 'playerHit', x: player.x, y: player.y });
  return player.health <= 0;
}

export function healPlayer(state, amount) {
  state.player.health = Math.min(PLAYER.maxHealth, state.player.health + amount);
}
