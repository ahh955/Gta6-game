// Solmar City — the player: on foot and behind the wheel. Arcade driving
// with a little slide, car stealing, and the health / ammo the HUD shows.

import { CFG } from './config.js';
import { collideBuildings, clampToWorld } from './world.js';
import { isDown } from './input.js';
import { addWanted } from './police.js';

export function createPlayer(x, y) {
  return {
    x,
    y,
    angle: -Math.PI / 2, // facing north
    vx: 0,
    vy: 0,
    onFoot: true,
    car: null,
    health: CFG.playerHealth,
    lastDamageAt: -99,
    weapon: 'gun', // 'gun' or 'fists'
    ammo: CFG.pistolMag,
    reloading: false,
    reloadEndsAt: 0,
    fireTimer: 0,
    punchTimer: 0,
    speed: 0, // current speed, for the HUD and the bust check
    moving: false,
  };
}

// The nearest car the player could steal, within reach.
export function nearestStealableCar(game, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const car of game.cars) {
    if (car.wrecked || car.driven) continue;
    const dx = car.x - game.player.x;
    const dy = car.y - game.player.y;
    const d = Math.hypot(dx, dy);
    if (d < bestDist) {
      bestDist = d;
      best = car;
    }
  }
  return best;
}

export function enterCar(game, car) {
  const player = game.player;
  player.onFoot = false;
  player.car = car;
  car.driven = true;
  car.ai = null;
  car.parked = false;
  car.speed = 0;
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  game.audio.click();
  // Stealing a car the driver was using is always noticed; a parked car
  // only when a cop is close enough to see it happen.
  if (car.wasTraffic) {
    addWanted(game, 1);
    game.message('You jacked a car! +1 star');
  } else {
    let seen = false;
    for (const cop of game.police.footCops) {
      if (Math.hypot(cop.x - car.x, cop.y - car.y) < 260) seen = true;
    }
    if (seen) {
      addWanted(game, 1);
      game.message('A cop saw the theft! +1 star');
    }
  }
}

export function exitCar(game) {
  const player = game.player;
  const car = player.car;
  if (!car) return;
  car.driven = false;
  car.parked = true;
  car.speed = 0;
  // Step out to the car's left side.
  const sideX = Math.cos(car.angle + Math.PI / 2);
  const sideY = Math.sin(car.angle + Math.PI / 2);
  player.x = car.x + sideX * 30;
  player.y = car.y + sideY * 30;
  player.onFoot = true;
  player.car = null;
  player.vx = 0;
  player.vy = 0;
  const fixed = collideBuildings(game.world, player.x, player.y, CFG.playerRadius);
  player.x = fixed.x;
  player.y = fixed.y;
  const clamped = clampToWorld(player.x, player.y, CFG.playerRadius);
  player.x = clamped.x;
  player.y = clamped.y;
}

export function damagePlayer(game, amount) {
  const player = game.player;
  if (player.health <= 0) return;
  player.health = Math.max(0, player.health - amount);
  player.lastDamageAt = game.time;
  if (player.health <= 0) game.pendingWasted = true;
}

function updateOnFoot(game, dt) {
  const player = game.player;
  const input = game.input;
  let mx = 0;
  let my = 0;
  if (isDown(input, 'w') || isDown(input, 'ArrowUp')) my -= 1;
  if (isDown(input, 's') || isDown(input, 'ArrowDown')) my += 1;
  if (isDown(input, 'a') || isDown(input, 'ArrowLeft')) mx -= 1;
  if (isDown(input, 'd') || isDown(input, 'ArrowRight')) mx += 1;
  const sprint = isDown(input, 'Shift');
  const speed = sprint ? CFG.sprintSpeed : CFG.walkSpeed;
  player.moving = mx !== 0 || my !== 0;
  if (player.moving) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    player.vx = mx * speed;
    player.vy = my * speed;
    player.angle = Math.atan2(my, mx);
  } else {
    player.vx = 0;
    player.vy = 0;
  }
  player.speed = Math.hypot(player.vx, player.vy);
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  const fixed = collideBuildings(game.world, player.x, player.y, CFG.playerRadius);
  player.x = fixed.x;
  player.y = fixed.y;
  const clamped = clampToWorld(player.x, player.y, CFG.playerRadius);
  player.x = clamped.x;
  player.y = clamped.y;
}

function updateDriving(game, dt) {
  const player = game.player;
  const car = player.car;
  const input = game.input;
  const forward = isDown(input, 'w') || isDown(input, 'ArrowUp');
  const back = isDown(input, 's') || isDown(input, 'ArrowDown');
  const left = isDown(input, 'a') || isDown(input, 'ArrowLeft');
  const right = isDown(input, 'd') || isDown(input, 'ArrowRight');
  const handbrake = isDown(input, ' ');

  if (forward) car.speed += CFG.carAccel * dt;
  if (back) {
    if (car.speed > 5) car.speed -= CFG.carBrake * dt;
    else car.speed -= CFG.carAccel * 0.55 * dt;
  }
  if (!forward && !back) {
    // Rolling drag.
    car.speed -= car.speed * 0.9 * dt;
    if (Math.abs(car.speed) < 4) car.speed = 0;
  }
  car.speed = Math.max(-CFG.carReverseMax, Math.min(CFG.carMaxSpeed, car.speed));

  // Steering fades with speed so the car stays controllable at 200 km/h.
  const speedFactor = Math.min(1, Math.abs(car.speed) / 120);
  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  const dirSign = car.speed >= 0 ? 1 : -1;
  car.angle += steer * CFG.carTurnRate * speedFactor * dirSign * dt;

  // Velocity: forward plus a lateral slide that grip kills off.
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  const grip = handbrake ? 1.6 : CFG.carGrip;
  const latX = -fy;
  const latY = fx;
  const latSpeed = car.vx * latX + car.vy * latY;
  const killed = latSpeed * Math.min(1, grip * dt);
  car.vx -= latX * killed;
  car.vy -= latY * killed;
  // Blend the velocity toward the forward speed.
  const fwdSpeed = car.vx * fx + car.vy * fy;
  const blend = Math.min(1, 8 * dt);
  car.vx += fx * (car.speed - fwdSpeed) * blend;
  car.vy += fy * (car.speed - fwdSpeed) * blend;

  car.x += car.vx * dt;
  car.y += car.vy * dt;

  // Buildings stop the car with a thud.
  const before = { x: car.x, y: car.y };
  const fixed = collideBuildings(game.world, car.x, car.y, CFG.carRadius);
  car.x = fixed.x;
  car.y = fixed.y;
  if (fixed.x !== before.x || fixed.y !== before.y) {
    if (Math.abs(car.speed) > 220) {
      game.audio.crash();
      game.spawnParticles(car.x, car.y, 8, '#cccccc');
    }
    car.speed *= 0.35;
    car.vx *= 0.35;
    car.vy *= 0.35;
  }
  const clamped = clampToWorld(car.x, car.y, CFG.carRadius);
  car.x = clamped.x;
  car.y = clamped.y;

  // Tire smoke when sliding hard or handbraking.
  const slide = Math.abs(latSpeed);
  if ((handbrake && Math.abs(car.speed) > 120) || slide > 160) {
    game.spawnParticles(car.x - fx * 18, car.y - fy * 18, 1, '#dddddd', 0.5);
  }

  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  player.speed = Math.abs(car.speed);
  player.moving = Math.abs(car.speed) > 10;
}

export function updatePlayer(game, dt) {
  const player = game.player;
  player.fireTimer = Math.max(0, player.fireTimer - dt);
  player.punchTimer = Math.max(0, player.punchTimer - dt);
  if (player.reloading && game.time >= player.reloadEndsAt) {
    player.reloading = false;
    player.ammo = CFG.pistolMag;
  }
  // Slow health regen after a quiet spell.
  if (player.health > 0 && player.health < CFG.playerHealth && game.time - player.lastDamageAt > CFG.healthRegenDelay) {
    player.health = Math.min(CFG.playerHealth, player.health + CFG.healthRegenRate * dt);
  }
  if (player.onFoot) updateOnFoot(game, dt);
  else updateDriving(game, dt);
}
