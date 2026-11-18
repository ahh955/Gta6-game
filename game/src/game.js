// The game itself: its whole state in one object, and one step that advances every system in
// order. No drawing and no browser here except localStorage through save.js — the renderer
// paints what this builds, and main.js drives the loop.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createCity } from './world.js';
import { createPlayer, damagePlayer, updatePlayer } from './player.js';
import { playerPunch, playerShoot, updateBullets, updateEnemies, updatePickups } from './combat.js';
import { checkPedCarHits, spawnPedestrians, updatePedestrians } from './pedestrians.js';
import { resolveCarCollisions, spawnParkedCars, spawnTraffic, updateTraffic } from './traffic.js';
import { updatePolice } from './police.js';
import { createMissionState, failActiveMission, missionStartPoint, updateMissions } from './missions.js';
import { cancelRace, createRaceState, updateRaces } from './races.js';
import { createDoubloons, updateCollectibles } from './collectibles.js';

export function createGame(seed) {
  const rng = createRandom(seed);
  const city = createCity(rng);
  const state = {
    seed,
    rng,
    city,
    time: 0,
    player: createPlayer(1000, 700),
    cars: [],
    peds: [],
    cops: [],
    enemies: [],
    bullets: [],
    pickups: [],
    particles: [],
    skidmarks: [],
    wanted: { points: 0, level: 0, unseenTimer: 0 },
    mission: createMissionState(),
    missionStart: null,
    race: createRaceState(),
    doubloons: createDoubloons(),
    camera: { x: 1000, y: 700, shake: 0 },
    bustProgress: 0,
    dialogue: null,
    banner: null,
    events: [],
    mouseWorld: null,
    saveTimer: 0,
    hasSave: false,
    started: false,
  };
  spawnTraffic(state);
  spawnParkedCars(state);
  spawnPedestrians(state);
  state.missionStart = missionStartPoint(state);
  // A few pickups scattered where a player will find them.
  state.pickups.push(
    { x: city.hospital.x + 30, y: city.hospital.y + 20, kind: 'health', amount: 0 },
    { x: city.plaza.x - 120, y: city.plaza.y + 100, kind: 'ammo', amount: 0 },
    { x: city.garage.x - 80, y: city.garage.y - 60, kind: 'cash', amount: 150 },
    { x: 2200, y: 1400, kind: 'health', amount: 0 },
    { x: 4000, y: 900, kind: 'ammo', amount: 0 },
  );
  return state;
}

function updateParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.skidmarks.length - 1; i >= 0; i -= 1) {
    state.skidmarks[i].life -= dt;
    if (state.skidmarks[i].life <= 0) state.skidmarks.splice(i, 1);
  }
}

function updateCamera(state, dt) {
  const cam = state.camera;
  const player = state.player;
  const k = Math.min(1, dt * 4);
  cam.x += (player.x - cam.x) * k;
  cam.y += (player.y - cam.y) * k;
  cam.x = Math.max(640, Math.min(state.city.width - 640, cam.x));
  cam.y = Math.max(360, Math.min(state.city.height - 360, cam.y));
  cam.shake = Math.max(0, cam.shake - dt * 22);
}

/**
 * One fixed step. `actions` is { enter, punch, advance } for this step's one-shot presses.
 * Dialogue pauses the world: the briefing is a cutscene, not a fight.
 */
export function stepGame(state, input, actions, dt) {
  if (state.dialogue) return;
  state.time += dt;
  state.missionStart = state.mission.active ? null : missionStartPoint(state);

  updatePlayer(state, dt, input, { enter: actions.enter });
  if (input.firing()) playerShoot(state);
  if (actions.punch) playerPunch(state);

  updateTraffic(state, dt);
  resolveCarCollisions(state, dt);
  updatePedestrians(state, dt);
  checkPedCarHits(state);
  updateEnemies(state, dt);
  updateBullets(state, dt);
  updatePickups(state, dt);
  updatePolice(state, dt);
  // Missions only run once the player has started (never on the title backdrop) and never
  // during a staged screenshot, where the scene sets its own mission state. Races and
  // doubloons follow the same rule, so a screenshot drive never collects one by accident.
  if (state.started && !state.shotMode) {
    updateMissions(state, dt);
    updateRaces(state, dt, actions);
    updateCollectibles(state);
  }
  updateParticles(state, dt);
  updateCamera(state, dt);

  if (state.banner) {
    state.banner.timer -= dt;
    if (state.banner.timer <= 0) state.banner = null;
  }
  // A wrecked player car strands the driver on foot.
  const car = state.player.car;
  if (car && car.hp <= 0) {
    state.player.car = null;
    car.driver = 'parked';
    car.speed = 0;
    state.events.push({ type: 'carWrecked', x: car.x, y: car.y });
  }
  state.saveTimer += dt;
  if (state.saveTimer > 20) {
    state.saveTimer = 0;
    state.events.push({ type: 'autosave' });
  }
}

/** The player was busted or wasted: penalty, respawn, mission failed, heat cleared. */
export function respawnAfterTrouble(state, kind) {
  const player = state.player;
  player.money = Math.max(0, player.money - 200);
  player.health = 100;
  player.ammo = 12;
  player.reloading = 0;
  if (player.car) {
    player.car.driver = 'parked';
    player.car.speed = 0;
    player.car = null;
  }
  const spot = kind === 'busted' ? state.city.policeStation : state.city.hospital;
  player.x = spot.x + 60;
  player.y = spot.y + 40;
  player.angle = -Math.PI / 2;
  player.aimAngle = -Math.PI / 2;
  state.wanted.points = 0;
  state.wanted.level = 0;
  state.bustProgress = 0;
  state.cops.length = 0;
  for (let i = state.cars.length - 1; i >= 0; i -= 1) {
    if (state.cars[i].driver === 'police') state.cars.splice(i, 1);
  }
  state.enemies.length = 0;
  state.bullets.length = 0;
  cancelRace(state);
  failActiveMission(state, kind === 'busted' ? 'Busted — the job is blown.' : 'Wasted — the job is blown.');
  state.camera.x = player.x;
  state.camera.y = player.y;
  state.events.push({ type: 'autosave' });
}

export { STEP };
