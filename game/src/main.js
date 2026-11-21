// Solmar City — boot, game loop, state machine, HUD wiring.
// States: 'title' -> 'playing' <-> 'paused' (+ 'help' overlay, 'busted', 'wasted').
// Builder B integration points: missions.js / hud.js / combat.js / economy.js
// hook into the exported `game` object and the window.__solmar debug handle.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG, districtAt } from './config.js';
import { Input } from './input.js';
import { createAudio } from './audio.js';
import { createRender } from './render.js';
import { createWorld } from './world.js';
import { createTraffic, createVehicle } from './vehicles.js';
import { createPlayer } from './player.js';
import { createPolice } from './police.js';
import { createPedestrians } from './pedestrians.js';
import { createMissions } from './missions.js';
import { createHUD } from './hud.js';
import { createCombat } from './combat.js';
import { createCrew } from './crew.js';
import { createEconomy } from './economy.js';
import { createRaces } from './races.js';
import { saveGame, loadSave, applySave, hasSave } from './save.js';
import { RNG } from './util.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed')) || CONFIG.seed;

const canvas = $('game');
const render = createRender(canvas);
const world = createWorld(render.scene, seed);
const input = new Input();
input.attach();
const audio = createAudio();
const rng = new RNG(seed + 1);

// Player starts downtown, next to a parked car.
const player = createPlayer(render.scene, { x: 0, z: 24 });
const starterCar = createVehicle(render.scene, { type: 'sedan', color: 0xc23b3b, x: 4, z: 28, heading: 0 });
starterCar._route = { alongX: true, center: 0, dir: 1, cruise: 0, parked: true };
const traffic = createTraffic(render.scene, world, 14, rng);
traffic.cars.push(starterCar);
const peds = createPedestrians(render.scene, world, 26, new RNG(seed + 7));

const game = {
  screen: 'title',
  cash: 250,
  respect: 0,
  rank: 'NOBODY',
  armor: 0,
  mission: null, // missions module owns this object.
  time: 0,
  pausedFrom: null,
};

const police = createPolice(render.scene, world, {
  onBusted: () => showScreen('busted'),
  onEscape: () => showNotice('YOU LOST THEM'),
});

// ---- Builder B modules (missions, HUD, combat, crew, economy, races) ----
const ctx = {
  game, player, police, traffic, peds, world, render, audio, input,
  showNotice, saveGame,
};
const missions = createMissions(render.scene);
const combat = createCombat(render.scene);
const crew = createCrew(render.scene);
const economy = createEconomy(render.scene);
const races = createRaces(render.scene);
Object.assign(ctx, { missions, combat, crew, economy, races });
const hud = createHUD(ctx);
ctx.hud = hud;

// ---- screens ----
function showScreen(name) {
  for (const id of ['title-screen', 'pause-screen', 'help-screen', 'busted-screen', 'wasted-screen']) {
    $(id).classList.add('hidden');
  }
  game.screen = name;
  if (name === 'title') { $('title-screen').classList.remove('hidden'); $('hud').classList.add('hidden'); }
  else if (name === 'paused') { $('pause-screen').classList.remove('hidden'); }
  else if (name === 'help') { $('help-screen').classList.remove('hidden'); }
  else if (name === 'busted') { $('busted-screen').classList.remove('hidden'); $('hud').classList.add('hidden'); }
  else if (name === 'wasted') { $('wasted-screen').classList.remove('hidden'); $('hud').classList.add('hidden'); }
  else if (name === 'playing') { $('hud').classList.remove('hidden'); }
}

function startPlaying() {
  audio.init();
  audio.resume();
  showScreen('playing');
  render.setMode(player.onFoot ? 'foot' : 'drive');
  input.requestPointerLock();
  if (!game.mission) showNotice('SOLMAR CITY');
}

function showNotice(text, ms = 2200) {
  const el = $('notice-banner');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(showNotice._t);
  showNotice._t = setTimeout(() => el.classList.add('hidden'), ms);
}

$('btn-start').addEventListener('click', startPlaying);
if (hasSave()) $('btn-continue').classList.remove('hidden');
$('btn-continue').addEventListener('click', () => {
  applySave(ctx, loadSave());
  startPlaying();
});
$('btn-resume').addEventListener('click', () => { showScreen('playing'); input.requestPointerLock(); });
$('btn-restart').addEventListener('click', () => { showScreen('playing'); window.__solmar?.restartMission?.(); });
$('btn-quit-title').addEventListener('click', () => { document.exitPointerLock?.(); showScreen('title'); });
$('btn-close-help').addEventListener('click', () => showScreen(game.pausedFrom || 'playing'));
$('btn-busted-respawn').addEventListener('click', () => {
  police.reset();
  police.clearWanted();
  missions.failMission(ctx, 'BUSTED');
  game.cash = Math.max(0, game.cash - 100);
  player.teleport(0, 24);
  player.setHealth(100);
  showScreen('playing');
});
$('btn-wasted-respawn').addEventListener('click', () => {
  police.reset();
  missions.failMission(ctx, 'WASTED');
  player.teleport(0, 24);
  player.setHealth(100);
  showScreen('playing');
});

// ---- screenshot presets (?shot=name) ----
// chaseCamOverride: for the chase screenshot the default chase cam looks
// down at the car and hides CONDOR-1, so the frame loop reframes the camera
// to hold both the player and the heli in shot.
let chaseCamOverride = false;

function applyShot(name) {
  if (name === 'start') {
    render.setMode('orbit');
    render.setOrbitTarget(0, 4, 0);
    return;
  }
  showScreen('playing');
  if (name === 'play') {
    player.teleport(164, -40);
    const car = traffic.nearestCar(164, -40, 60) || starterCar;
    player.enterVehicle(car);
    car.speed = 18;
    render.setMode('drive');
  } else if (name === 'chase') {
    player.teleport(164, -40);
    const car = traffic.nearestCar(164, -40, 60) || starterCar;
    player.enterVehicle(car);
    // Face north up Beach Boulevard so the chase camera sits on the road
    // behind the car with a clear line of sight (a traffic car's heading
    // can point at a building instead). This stretch is confirmed clear:
    // the play preset drives it without crashing. Slow crawl: fast enough
    // to hide the exit prompt and dodge the bust meter, slow enough that
    // CONDOR-1 stays right overhead.
    car.heading = 0;
    car.mesh.rotation.y = 0;
    car.speed = 6;
    police.setWanted(4);
    chaseCamOverride = true;
    // Headless screenshots capture after only a few frames, so fast-forward
    // the pursuit 10 simulated seconds: CONDOR-1 converges over the player
    // and the cruisers close in before the first rendered frame.
    for (let i = 0; i < 200; i++) police.update(0.05, player, world, null);
    // Drop CONDOR-1 to 20m for the shot so car and heli fit one frame;
    // it climbs back to patrol height within a second of real play.
    if (police.heli) police.heli.position.y = 20;
    // The ramming cruisers shove and batter the car during the fast-forward;
    // put it back on the road centre, healthy, so it reads in frame — then
    // put CONDOR-1 right back over it (the shove leaves the heli hovering
    // over the wrong spot otherwise).
    player.teleport(164, -40);
    car.health = 100;
    car.speed = 6;
    if (police.heli) police.heli.position.set(player.x, 20, player.z);
    render.setMode('drive');
  } else if (name === 'heli') {
    player.teleport(0, 0);
    police.setWanted(5);
  } else if (name === 'mission') {
    player.teleport(0, 24);
    render.setMode('foot');
    missions.startMission(ctx, 'first-gear');
  }
}

// ---- main loop ----
let last = performance.now();
let policeStatus = { wanted: 0, nearestDist: Infinity, bustProgress: 0 };
let lookYaw = 0; // mouse-look offset, decays back to chase cam
const clockTarget = new THREE.Vector3();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.time += dt;

  // Global keys.
  if (input.wasPressed('KeyM')) audio.toggleMute();
  if (input.wasPressed('KeyN')) { audio.nextStation(); showNotice(audio.stationName); }
  if (input.wasPressed('KeyH')) {
    if (game.screen === 'help') showScreen(game.pausedFrom || 'playing');
    else if (game.screen === 'playing' || game.screen === 'paused') {
      game.pausedFrom = game.screen;
      showScreen('help');
    }
  }
  if ((input.wasPressed('KeyP') || input.wasPressed('Escape')) && game.screen === 'playing') {
    $('pause-stats').textContent =
      `Cash $${game.cash}\nRespect ${game.rank} (${game.respect})\nJobs done ${missions.completed.length}/8\nWanted ${'★'.repeat(police.wanted) || '—'}\nDistrict ${districtAt(player.x, player.z)}`;
    showScreen('paused');
    document.exitPointerLock?.();
  } else if ((input.wasPressed('KeyP') || input.wasPressed('Escape')) && game.screen === 'paused') {
    showScreen('playing');
    input.requestPointerLock();
  }

  if (game.screen === 'title') {
    render.updateOrbit(dt);
    render.render();
    input.endFrame();
    return;
  }
  if (game.screen === 'paused' || game.screen === 'help') {
    render.render();
    input.endFrame();
    return;
  }
  if (game.screen === 'busted' || game.screen === 'wasted') {
    render.render();
    input.endFrame();
    return;
  }

  // Playing.
  lookYaw += input.mouseDX * 0.0022;
  lookYaw *= Math.exp(-1.2 * dt);
  render.addCamPitch(-input.mouseDY * 0.0009);

  player.update(dt, input, world, traffic);
  traffic.update(dt, world, player);
  peds.update(dt, world);
  policeStatus = police.update(dt, player, world, audio);
  world.update(dt, game.time);

  // Builder B systems.
  missions.handleKeys(ctx);
  missions.update(dt, ctx);
  combat.update(dt, ctx);
  crew.update(dt, ctx);
  economy.update(dt, ctx);
  races.update(dt, ctx);

  // Wasted check (Builder B combat damages the player).
  if (player.health <= 0) {
    showScreen('wasted');
    input.endFrame();
    return;
  }

  // Camera + engine audio follow the player / car.
  const target = player.pos;
  clockTarget.set(target.x, target.y, target.z);
  render.setMode(player.onFoot ? 'foot' : 'drive');
  render.updateCamera(dt, clockTarget, player.heading + lookYaw, player.vehicle ? Math.abs(player.vehicle.speed) / 42 : 0);
  // Keep the chase camera out of buildings: pull it toward the player
  // while its ground position sits inside a collider.
  const cam = render.camera;
  for (let i = 0; i < 8 && world.isBlocked(cam.position.x, cam.position.z); i++) {
    cam.position.lerp(clockTarget, 0.25);
    cam.position.y = Math.max(cam.position.y, 2.4);
    cam.lookAt(clockTarget.x, clockTarget.y + 1.8, clockTarget.z);
  }
  // Chase screenshot framing: wide shot from 30m behind on the road, pulled
  // up so CONDOR-1 and its spotlight stay in frame with the player car.
  // The heli is pinned low for the shot so it stays in frame with the car.
  if (chaseCamOverride && police.heli) {
    const hp = police.heli.position;
    if (hp.y > 20) hp.y = 20;
    cam.position.set(
      target.x - Math.sin(player.heading) * 30,
      12,
      target.z - Math.cos(player.heading) * 30,
    );
    cam.lookAt((target.x + hp.x) / 2, 10, (target.z + hp.z) / 2);
  }
  if (player.vehicle) {
    audio.setEngine(Math.abs(player.vehicle.speed) / 42, true);
    if (player.vehicle.wrecked && !player._wreckNoticed) {
      player._wreckNoticed = true;
      audio.explosion();
      showNotice('CAR DESTROYED');
    }
  } else {
    audio.setEngine(0, false);
    player._wreckNoticed = false;
  }
  audio.update();

  hud.update(dt, policeStatus);
  render.render();
  input.endFrame();
}

// ---- debug handle (testing + screenshots) ----
window.__solmar = {
  game, player, police, traffic, peds, world, render, audio, input,
  missions, combat, crew, economy, races, hud,
  teleport(x, z) { player.teleport(x, z); },
  setWanted(n) { police.setWanted(n); },
  setTime(hour) { render.setTimeOfDay(hour); },
  spawnCar(type = 'coupe', color = 0xe8a33b) {
    const car = createVehicle(render.scene, {
      type, color, x: player.x + 6, z: player.z + 2, heading: player.heading,
    });
    traffic.cars.push(car);
    return car;
  },
  giveCar(type = 'coupe') {
    const car = this.spawnCar(type);
    player.enterVehicle(car);
    return car;
  },
  applyShot,
  startMission(id) { return missions.startMission(ctx, id); },
  restartMission() { missions.restartMission(ctx); },
};

// Boot: title orbit behind the menu, or straight into a shot preset.
render.setMode('orbit');
render.setOrbitTarget(0, 4, 0);
const shot = params.get('shot');
if (shot) {
  // No audio.init() here: headless/screenshot runs have no user gesture,
  // and AudioContext would only warn. Real play inits audio on Start.
  applyShot(shot);
} else {
  showScreen('title');
}
requestAnimationFrame(frame);
