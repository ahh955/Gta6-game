// Solmar City — the entry point: builds the world, wires every system,
// runs the loop and owns the state machine (start, playing, pause, busted,
// wasted, briefing, mission complete, race result).

import { CFG } from './config.js';
import { makeRng } from './random.js';
import { buildWorld } from './world.js';
import { createInput, isDown, wasPressed, endFrameInput } from './input.js';
import { createAudio } from './audio.js';
import { loadSave, saveGame } from './save.js';
import { createPlayer, updatePlayer, nearestStealableCar, enterCar, exitCar, damagePlayer } from './player.js';
import { spawnTraffic, updateTraffic } from './traffic.js';
import { createPolice, updatePolice, setWanted, policeStation, hospital } from './police.js';
import { createCombat, updateCombat, playerShoot, playerPunch, spawnEnemies, spawnParticles } from './combat.js';
import { createMissions, missionSpots, updateMissions, tryStartMission, startMission, failMission, currentObjective, nextMissionDef } from './missions.js';
import { createRaces, updateRaces, raceAtGate, startRace, RACES } from './races.js';
import { createDoubloons, updateDoubloons } from './collectibles.js';
import { render } from './render.js';
import { applyShot } from './shots.js';

// Errors the playtest harness can read back.
window.__solmarErrors = [];
window.addEventListener('error', (event) => {
  window.__solmarErrors.push(String(event.message || event.error));
});

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = params.get('seed');
const seed = shotName ? 1337 : seedParam ? Number(seedParam) : (Date.now() % 2147483647);

const rng = makeRng(seed);
const world = buildWorld(rng);
const save = loadSave();
const input = createInput(canvas);
const audio = createAudio();
audio.setMuted(save.muted);

const game = {
  canvas,
  ctx,
  world,
  rng,
  input,
  audio,
  save,
  time: 0,
  state: 'start',
  stateData: null,
  messages: [],
  camera: { x: 0, y: 0 },
  cars: [],
  peds: [],
  nextCarId: 1,
  trafficRespawnAt: 0,
  player: null,
  police: createPolice(),
  combat: createCombat(),
  missions: createMissions(),
  races: createRaces(),
  racesList: RACES,
  doubloons: [],
  currentObjective: null,
  hint: null,
  pendingBusted: false,
  pendingWasted: false,
  shotMode: false,
  shotName: null,
  saveTimer: 0,
  message(text) {
    game.messages.push({ text, at: game.time });
    if (game.messages.length > 10) game.messages.shift();
  },
  spawnParticles(x, y, count, color, life) {
    spawnParticles(game, x, y, count, color, life);
  },
  damagePlayer(amount) {
    damagePlayer(game, amount);
  },
};

const traffic = spawnTraffic(world, rng);
game.cars = traffic.cars;
game.peds = traffic.peds;
game.nextCarId = traffic.nextCarId;

game.player = createPlayer(world.avenues[2] + 40, world.streets[2] + 40);
game.missions.spots = missionSpots(world);
game.doubloons = createDoubloons(world, save);

// A few harbour thugs keep free roam lively even between missions.
spawnEnemies(game, world.piers[1].x + 40, CFG.harborY + 90, 3, '#a03d2e');

game.camera.x = game.player.x - CFG.viewWidth / 2;
game.camera.y = game.player.y - CFG.viewHeight / 2;

if (shotName) applyShot(game, shotName);

// Expose the game for debugging and for the playtest harness.
window.__solmar = game;
window.__shotReady = false;

function clampCamera() {
  const cam = game.camera;
  cam.x = Math.max(CFG.worldMinX, Math.min(CFG.worldMaxX - CFG.viewWidth, cam.x));
  cam.y = Math.max(CFG.worldMinY, Math.min(CFG.worldMaxY - CFG.viewHeight, cam.y));
}

function updateCamera(dt) {
  const player = game.player;
  const lead = CFG.cameraLead;
  const targetX = player.x + (player.onFoot ? player.vx : player.car ? player.car.vx : 0) * lead - CFG.viewWidth / 2;
  const targetY = player.y + (player.onFoot ? player.vy : player.car ? player.car.vy : 0) * lead - CFG.viewHeight / 2;
  const k = Math.min(1, CFG.cameraSmooth * dt);
  game.camera.x += (targetX - game.camera.x) * k;
  game.camera.y += (targetY - game.camera.y) * k;
  clampCamera();
}

function computeHint() {
  const player = game.player;
  if (player.onFoot) {
    const def = tryStartMission(game);
    if (def) {
      game.hint = `Press E to talk to ${def.giver}`;
      return;
    }
    if (nearestStealableCar(game, 60)) {
      game.hint = 'Press E to steal the car';
      return;
    }
  } else {
    const race = raceAtGate(game);
    if (race) {
      game.hint = `Press R to start ${race.name} ($${race.reward})`;
      return;
    }
    game.hint = 'Press E to get out of the car';
    return;
  }
  game.hint = null;
}

function doBusted() {
  game.pendingBusted = false;
  const player = game.player;
  if (!player.onFoot) exitCar(game);
  failMission(game, 'busted by the police');
  const penalty = Math.min(game.save.cash, CFG.bustPenalty);
  game.save.cash -= penalty;
  game.police.wanted = 0;
  game.police.locked = false;
  game.police.bustMeter = 0;
  const station = policeStation(world);
  player.x = station.x;
  player.y = station.y;
  player.health = CFG.playerHealth;
  game.audio.busted();
  game.state = 'busted';
  game.stateData = { lines: [`The police caught you.`, `Fine: $${penalty}`, `Cash: $${game.save.cash}`] };
  if (!game.shotMode) saveGame(game.save);
}

function doWasted() {
  game.pendingWasted = false;
  const player = game.player;
  if (!player.onFoot) exitCar(game);
  failMission(game, 'wasted');
  const penalty = Math.min(game.save.cash, CFG.wastedPenalty);
  game.save.cash -= penalty;
  game.police.wanted = 0;
  game.police.locked = false;
  game.police.bustMeter = 0;
  const hosp = hospital(world);
  player.x = hosp.x;
  player.y = hosp.y;
  player.health = CFG.playerHealth;
  player.ammo = CFG.pistolMag;
  game.audio.wasted();
  game.state = 'wasted';
  game.stateData = { lines: ['You were wasted.', `Hospital bill: $${penalty}`, `Cash: $${game.save.cash}`] };
  if (!game.shotMode) saveGame(game.save);
}

function handlePlayingInput() {
  const player = game.player;
  if (wasPressed(input, 'Escape') || wasPressed(input, 'p')) {
    game.state = 'paused';
    return;
  }
  if (wasPressed(input, 'm')) {
    game.save.muted = !game.save.muted;
    game.audio.setMuted(game.save.muted);
    game.message(game.save.muted ? 'Sound off' : 'Sound on');
  }
  if (wasPressed(input, 'e')) {
    const def = player.onFoot ? tryStartMission(game) : null;
    if (def) {
      game.state = 'briefing';
      game.stateData = { def };
      return;
    }
    if (player.onFoot) {
      const car = nearestStealableCar(game, 60);
      if (car) enterCar(game, car);
    } else {
      exitCar(game);
    }
  }
  if (wasPressed(input, 'q') && player.onFoot) {
    player.weapon = player.weapon === 'gun' ? 'fists' : 'gun';
    game.audio.click();
  }
  if (wasPressed(input, 'f') && player.onFoot) playerPunch(game);
  if (wasPressed(input, 'r')) {
    const race = raceAtGate(game);
    if (race) {
      startRace(game, race);
    } else if (player.onFoot && player.weapon === 'gun' && !player.reloading && player.ammo < CFG.pistolMag) {
      player.reloading = true;
      player.reloadEndsAt = game.time + CFG.pistolReloadTime;
    }
  }
  if (input.mouseDown) playerShoot(game);
}

function updatePlaying(dt) {
  handlePlayingInput();
  if (game.state !== 'playing') return;
  game.currentObjective = currentObjective(game);
  computeHint();
  updatePlayer(game, dt);
  updateTraffic(game, dt);
  updatePolice(game, dt);
  updateCombat(game, dt);
  updateMissions(game, dt);
  updateRaces(game, dt);
  updateDoubloons(game, dt);
  updateCamera(dt);
  const driving = !game.player.onFoot && game.player.car;
  audio.engine(driving ? Math.abs(game.player.car.speed) / CFG.carMaxSpeed : 0, driving);
  audio.update(dt);
  if (game.pendingBusted) doBusted();
  if (game.pendingWasted) doWasted();
  game.saveTimer -= dt;
  if (game.saveTimer <= 0) {
    game.saveTimer = 15;
    if (!game.shotMode) saveGame(game.save);
  }
}

function update(dt) {
  if (game.state === 'playing') {
    updatePlaying(dt);
  } else if (game.state === 'start') {
    if (wasPressed(input, 'Enter') || input.mouseClicked) {
      audio.unlock();
      audio.startMusic();
      game.state = 'playing';
      game.message('Welcome to Solmar City!');
      const def = nextMissionDef(game);
      if (def) game.message(`See ${def.giver} — ${def.name} ($${def.reward})`);
    }
  } else if (game.state === 'paused') {
    if (wasPressed(input, 'Escape') || wasPressed(input, 'p')) game.state = 'playing';
  } else if (game.state === 'busted' || game.state === 'wasted') {
    if (wasPressed(input, 'Enter')) game.state = 'playing';
  } else if (game.state === 'briefing') {
    if (wasPressed(input, 'Enter')) {
      startMission(game, game.stateData.def);
      game.state = 'playing';
    } else if (wasPressed(input, 'Escape')) {
      game.state = 'playing';
    }
  } else if (game.state === 'complete' || game.state === 'raceResult') {
    if (wasPressed(input, 'Enter')) {
      if (!game.shotMode) saveGame(game.save);
      game.state = 'playing';
    }
  }
  endFrameInput(input);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  game.time += dt;
  update(dt);
  render(game);
  if (game.shotMode && game.time > 1.6 && !window.__shotReady) {
    window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
