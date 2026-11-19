// Solmar City — screenshot poses. With ?shot=<name> in the URL the game
// skips the start screen and stages one honest moment of play: a real game
// state, rendered by the game's own code. The chase pose nudges two police
// cars into frame; the README says so.

import { CFG } from './config.js';
import { makeCar } from './traffic.js';
import { setWanted } from './police.js';
import { RACES, startRace } from './races.js';

function putPlayerInCar(game, x, y, angle, speed, color, type) {
  const car = makeCar(game.nextCarId, x, y, angle, color, type);
  game.nextCarId += 1;
  car.driven = true;
  car.speed = speed;
  car.vx = Math.cos(angle) * speed;
  car.vy = Math.sin(angle) * speed;
  game.cars.push(car);
  const player = game.player;
  player.onFoot = false;
  player.car = car;
  player.x = x;
  player.y = y;
  player.angle = angle;
  return car;
}

function stageRace(game) {
  const race = RACES[0]; // Beach Sprint
  const gate = race.gate;
  // The player launches from the gate in a red sports car, race just started.
  putPlayerInCar(game, gate.x, gate.y + 60, Math.PI / 2, 240, '#c23b2e', 'sport');
  startRace(game, race);
  game.races.active.countdown = 0;
  game.races.active.time = 1.4;
  game.message('Beach Sprint: checkpoint 1/12');
}

function stageDrive(game) {
  // Flat out east on Palm Street with traffic around.
  const street = game.world.streets[3];
  putPlayerInCar(game, 700, street + CFG.laneOffset, 0, 470, '#2e6fc2', 'sport');
  // A few neighbours for the frame.
  const neighbours = [
    { x: 950, y: street - CFG.laneOffset, angle: Math.PI, speed: 150, color: '#e8c53a', type: 'taxi' },
    { x: 1150, y: street + CFG.laneOffset, angle: 0, speed: 140, color: '#3aa655', type: 'sedan' },
    { x: 450, y: street + CFG.laneOffset, angle: 0, speed: 150, color: '#e8e8e8', type: 'sedan' },
  ];
  for (const n of neighbours) {
    const car = makeCar(game.nextCarId, n.x, n.y, n.angle, n.color, n.type);
    game.nextCarId += 1;
    car.speed = n.speed;
    car.ai = 'traffic';
    car.wasTraffic = true;
    car.axis = 'h';
    car.index = 3;
    car.dir = n.angle === 0 ? 1 : -1;
    game.cars.push(car);
  }
}

function stageChase(game) {
  // Three stars, two police cars right behind the player on Coral Avenue.
  const avenue = game.world.avenues[4];
  putPlayerInCar(game, avenue + CFG.laneOffset, 900, Math.PI / 2, 400, '#e8c53a', 'sport');
  setWanted(game, 3, false);
  const spots = [
    { x: avenue - CFG.laneOffset, y: 800 },
    { x: avenue + CFG.laneOffset, y: 760 },
  ];
  for (const spot of spots) {
    const car = makeCar(game.nextCarId, spot.x, spot.y, Math.PI / 2, '#f2f2f2', 'police');
    game.nextCarId += 1;
    car.ai = 'police';
    car.axis = 'v';
    car.index = 4;
    car.dir = 1;
    car.speed = 380;
    car.mode = 'ram';
    game.cars.push(car);
  }
  game.message('The police are on to you!');
}

function stageDoubloon(game) {
  // On foot in the park, one doubloon already found, another right ahead.
  const park = game.world.park;
  const player = game.player;
  player.x = park.cx - 40;
  player.y = park.cy + 60;
  player.angle = -Math.PI / 2;
  // Mark the first doubloon collected so the HUD reads 1 / 12.
  if (game.doubloons.length > 0) {
    game.doubloons[0].taken = true;
    if (!game.save.doubloons.includes(0)) game.save.doubloons.push(0);
  }
  // Stand the player next to the second coin.
  if (game.doubloons.length > 1) {
    player.x = game.doubloons[1].x - 24;
    player.y = game.doubloons[1].y + 30;
    player.angle = Math.atan2(game.doubloons[1].y - player.y, game.doubloons[1].x - player.x);
  }
  game.message('Doubloon! +$100 (1 / 12)');
}

const POSES = {
  race: stageRace,
  drive: stageDrive,
  chase: stageChase,
  doubloon: stageDoubloon,
};

// Returns true when a pose was applied.
export function applyShot(game, name) {
  const pose = POSES[name];
  if (!pose) return false;
  game.shotMode = true;
  game.shotName = name;
  pose(game);
  game.state = 'playing';
  // Centre the camera on the player at once (no sweep-in).
  game.camera.x = game.player.x - CFG.viewWidth / 2;
  game.camera.y = game.player.y - CFG.viewHeight / 2;
  return true;
}
