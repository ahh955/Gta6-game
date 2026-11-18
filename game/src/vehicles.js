// Cars: their types, arcade physics (accelerate, brake, steer by speed, handbrake slides) and
// collisions with buildings and each other. A car is driven by the player, by traffic AI, by
// the police, or parked; the physics is the same for all of them.
import { CAR, CAR_TYPES } from './config.js';
import { clampToCity, collideBuildings } from './world.js';

export const CAR_COLORS = ['#d84a4a', '#4a7dd8', '#e8e8e8', '#3a3a3a', '#d8a24a', '#5aa86a', '#7a5ac8', '#c8c8c8', '#2a8a9a', '#b84a7a'];

let nextId = 1;

export function createCar(type, x, y, angle, driver) {
  const spec = CAR_TYPES[type];
  const id = nextId;
  nextId += 1;
  return {
    id,
    type,
    spec,
    x,
    y,
    angle,
    speed: 0,
    steer: 0,
    driver, // 'player' | 'traffic' | 'police' | 'parked' | 'mission'
    color: type === 'taxi' ? '#f2c94c' : type === 'police' ? '#f0f0f0' : CAR_COLORS[(id * 7 + 3) % CAR_COLORS.length],
    hp: 100,
    smoke: 0,
    damageCooldown: 0,
    stuckTimer: 0,
    reverseTimer: 0,
    stuckSteer: 0,
    sirenPhase: 0,
    brakeLights: false,
    handbrake: false,
    route: null,
    routeIndex: 0,
    waitTimer: 0,
    r: Math.max(spec.length, spec.width) / 2,
  };
}

/**
 * One physics step. `throttle` is -1 (reverse/brake) to 1, `steer` is -1 to 1, `handbrake`
 * loosens the grip so the car slides. Returns 'crash' when the car hit a building hard.
 */
export function stepCar(car, dt, throttle, steer, handbrake, city) {
  const spec = car.spec;
  const maxSpeed = spec.maxSpeed * (car.hp < 30 ? 0.6 : 1);
  if (throttle > 0) car.speed += CAR.accel * spec.accelScale * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 30) car.speed -= CAR.brake * dt;
    else car.speed = Math.max(-CAR.reverseMax, car.speed + CAR.accel * 0.6 * throttle * dt);
  }
  // Drag and rolling friction.
  car.speed -= car.speed * CAR.friction * dt;
  if (Math.abs(car.speed) < 4 && throttle === 0) car.speed = 0;
  car.speed = Math.max(-CAR.reverseMax, Math.min(maxSpeed, car.speed));

  const speedFactor = Math.min(1, Math.abs(car.speed) / 220);
  const direction = car.speed >= 0 ? 1 : -1;
  car.steer += (steer - car.steer) * Math.min(1, dt * 8);
  car.angle += car.steer * CAR.steerRate * speedFactor * direction * dt;
  if (handbrake) car.angle += car.steer * 1.6 * speedFactor * direction * dt;

  const grip = handbrake ? CAR.handbrakeGrip : CAR.grip;
  const forwardX = Math.cos(car.angle);
  const forwardY = Math.sin(car.angle);
  // Velocity is mostly along the nose; the rest is sideways slide that grip bleeds off.
  const vx = forwardX * car.speed;
  const vy = forwardY * car.speed;
  const slide = car.slide || 0;
  const newSlide = slide * Math.max(0, 1 - grip * dt);
  car.slide = newSlide;
  car.x += (vx - Math.sin(car.angle) * newSlide) * dt;
  car.y += (vy + Math.cos(car.angle) * newSlide) * dt;
  if (handbrake && Math.abs(car.speed) > 200) car.slide = (car.slide || 0) + car.steer * car.speed * 0.12 * dt;

  car.brakeLights = throttle < 0 || handbrake;
  car.handbrake = handbrake;

  const beforeX = car.x;
  const beforeY = car.y;
  const circle = { x: car.x, y: car.y, r: Math.min(spec.length, spec.width) * 0.42 };
  const hit = collideBuildings(city, circle);
  car.x = circle.x;
  car.y = circle.y;
  clampToCity({ x: car.x, y: car.y, r: 20 });
  if (hit) {
    const impact = Math.abs(car.speed);
    car.speed *= 0.35;
    // Damage at most once per half second: grinding along a wall must not shred the car.
    if (car.damageCooldown <= 0) {
      car.hp = Math.max(0, car.hp - impact * 0.012);
      car.damageCooldown = 0.5;
    }
    car.smoke = car.hp < 50 ? 1 : car.smoke;
    if (Math.abs(beforeX - car.x) > 0.01 || Math.abs(beforeY - car.y) > 0.01) {
      car.slide = (car.slide || 0) * 0.5;
    }
    return impact > 180 ? 'crash' : 'bump';
  }
  return null;
}

/** Push two overlapping cars apart and trade some speed; returns true on a hard hit. */
export function collideCars(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const minD = (a.r + b.r) * 0.8;
  const distSq = dx * dx + dy * dy;
  if (distSq >= minD * minD || distSq === 0) return false;
  const dist = Math.sqrt(distSq);
  const push = (minD - dist) / 2;
  const nx = dx / dist;
  const ny = dy / dist;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
  const relSpeed = Math.abs(a.speed - b.speed);
  a.speed *= 0.7;
  b.speed *= 0.7;
  // Damage at most once per half second per car: a long shove is one hit, not fifty.
  if (a.damageCooldown <= 0) {
    a.hp = Math.max(0, a.hp - relSpeed * 0.008);
    a.damageCooldown = 0.5;
  }
  if (b.damageCooldown <= 0) {
    b.hp = Math.max(0, b.hp - relSpeed * 0.008);
    b.damageCooldown = 0.5;
  }
  return relSpeed > 200;
}

/** The world point of the driver's door (where the player steps out). */
export function doorPosition(car) {
  return {
    x: car.x - Math.sin(car.angle) * (car.spec.width / 2 + 16),
    y: car.y + Math.cos(car.angle) * (car.spec.width / 2 + 16),
  };
}
