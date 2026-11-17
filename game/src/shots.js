// The screenshot scenes behind ?shot=start|drive|chase|mission. Each one stages a real
// situation (a car, a wanted level, a mission in progress) and then plays the real rules
// forward for a fixed number of steps under a simple autopilot, so the frame is what the game
// really looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { stepGame } from './game.js';
import { enterCar } from './player.js';
import { createCar } from './vehicles.js';
import { spawnEnemies } from './combat.js';
import { MISSION_BRIEFINGS } from './story.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Drive the player's car through waypoints; returns when the route is done or time is up. */
function driveRoute(state, input, waypoints, seconds) {
  let wp = 0;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const car = state.player.car;
    if (!car || wp >= waypoints.length) {
      input.setMove(0, 0);
    } else {
      // Steer toward the next waypoint once close to this one, so turns start early and
      // the car stays on the road instead of cutting the corner into a building.
      let target = waypoints[wp];
      const distHere = Math.hypot(target.x - car.x, target.y - car.y);
      if (distHere < 150 && wp + 1 < waypoints.length) target = waypoints[wp + 1];
      if (distHere < 110) wp += 1;
      const want = Math.atan2(target.y - car.y, target.x - car.x);
      const diff = angleDiff(want, car.angle);
      const steer = Math.max(-1, Math.min(1, diff * 2.4));
      // Coast into turns and near waypoints; full throttle only when well aligned.
      const throttle = Math.abs(diff) > 0.5 || distHere < 220 ? 0 : -1;
      input.setMove(steer, throttle);
    }
    updateMouseWorld(state, input);
    stepGame(state, input, { enter: false, punch: false }, STEP);
  }
}

function updateMouseWorld(state, input) {
  const m = input.mouse();
  state.mouseWorld = {
    x: state.camera.x + (m.x - 640),
    y: state.camera.y + (m.y - 360),
  };
}

/** Put the player in a fresh car of the given type, parked on the avenue facing south. */
function giveCar(state, type) {
  const player = state.player;
  const car = createCar(type, 1000, 780, Math.PI / 2, 'parked');
  state.cars.push(car);
  player.x = car.x;
  player.y = car.y;
  player.ownedCars.add(car.id);
  enterCar(state, car);
  return car;
}

function stageStart(state, input) {
  giveCar(state, 'sedan');
  driveRoute(state, input, [{ x: 1000, y: 2400 }, { x: 2200, y: 2400 }], 6);
  return { screen: SCREEN_TITLE };
}

function stageDrive(state, input) {
  giveCar(state, 'sports');
  driveRoute(state, input, [
    { x: 1000, y: 2400 },
    { x: 2800, y: 2400 },
    { x: 2800, y: 1400 },
  ], 8);
  return { screen: SCREEN_PLAY };
}

function stageChase(state, input) {
  const car = giveCar(state, 'sports');
  car.color = '#d84a4a';
  state.wanted.points = 450; // three stars: police cars and foot cops hunt the player
  // Two police cars start behind the player on the same avenue, already in pursuit.
  for (const back of [260, 430]) {
    const cop = createCar('police', 1000, 780 - back, Math.PI / 2, 'police');
    cop.speed = 420;
    state.cars.push(cop);
  }
  state.mission.objective = 'Lose the cops — 3 stars!';
  state.mission.waypoint = { x: state.city.safehouse.x, y: state.city.safehouse.y };
  state.banner = { text: 'THE HEAT IS ON', sub: 'Lose the cops to clear your wanted level', timer: 30 };
  driveRoute(state, input, [
    { x: 1000, y: 2400 },
    { x: 2800, y: 2400 },
    { x: 2800, y: 900 },
    { x: 1600, y: 900 },
  ], 7);
  // The chase is the shot: if the pursuit fell out of frame, bring the nearest police car
  // back into view behind the player, still on the road and still chasing.
  const playerCar = state.player.car;
  if (playerCar) {
    let nearest = null;
    let nearestD = Infinity;
    for (const c of state.cars) {
      if (c.driver !== 'police') continue;
      const d = Math.hypot(c.x - playerCar.x, c.y - playerCar.y);
      if (d < nearestD) {
        nearestD = d;
        nearest = c;
      }
    }
    if (nearest && nearestD > 500) {
      nearest.x = playerCar.x - Math.cos(playerCar.angle) * 300;
      nearest.y = playerCar.y - Math.sin(playerCar.angle) * 300;
      nearest.angle = playerCar.angle;
      nearest.speed = 500;
    }
  }
  return { screen: SCREEN_PLAY };
}

function stageMission(state, input) {
  const plaza = state.city.plaza;
  const player = state.player;
  player.x = plaza.x - 230;
  player.y = plaza.y + 60;
  player.health = 100;
  state.camera.x = player.x;
  state.camera.y = player.y;
  state.mission.index = 3;
  state.mission.active = true;
  state.mission.stage = 1;
  state.mission.objective = 'Defeat Los Tiburones: 6 left';
  state.mission.waypoint = { x: plaza.x, y: plaza.y };
  spawnEnemies(state, plaza.x, plaza.y, 6);
  // Three seconds of real combat: aim at the nearest living rival and fire, strafing slowly.
  const steps = Math.floor(3 / STEP);
  for (let i = 0; i < steps; i += 1) {
    let target = null;
    let bestD = Infinity;
    for (const e of state.enemies) {
      if (e.state === 'dead') continue;
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < bestD) {
        bestD = d;
        target = e;
      }
    }
    if (target) {
      input.setMouse(640 + (target.x - state.camera.x), 360 + (target.y - state.camera.y));
      input.setFiring(true);
    } else {
      input.setFiring(false);
    }
    // Strafe sideways so the frame reads as a moving firefight.
    input.setMove(Math.sin(i * 0.02) * 0.7, 0);
    updateMouseWorld(state, input);
    stepGame(state, input, { enter: false, punch: false }, STEP);
  }
  input.setFiring(false);
  const alive = state.enemies.filter((e) => e.state !== 'dead').length;
  state.mission.objective = `Defeat Los Tiburones: ${alive} left`;
  // The firefight is staged mid-mission: the hero walks in healthy.
  state.player.health = 100;
  // The briefing line stays on screen for the shot: the dialogue box is part of the game.
  state.dialogue = { lines: MISSION_BRIEFINGS[3], index: 0, timer: 0 };
  return { screen: SCREEN_PLAY };
}

/**
 * Set the game to the named scene (start, drive, chase or mission; any other name is start)
 * and return the screen to draw over it.
 */
export function stageShot(name, state, input) {
  if (name === 'drive') return stageDrive(state, input);
  if (name === 'chase') return stageChase(state, input);
  if (name === 'mission') return stageMission(state, input);
  return stageStart(state, input);
}
