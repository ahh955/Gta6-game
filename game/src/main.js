// Solmar City 3D — entry point. A playable open-world crime game in the
// browser: ten story missions across seven districts, four street races,
// eight stunt jumps, twenty golden doubloons, district jobs, car export,
// shops, a crew with abilities, a tabbed pause menu (MAP/STORY/STATS/
// CREW/SAVE), a day/night cycle and three save slots. Drive the boulevard,
// run missions, outrun Solmar PD. URL params: ?shot=1..4 stages a
// screenshot pose (1 day chase, 2 night shootout, 3 stats screen, 4 title
// screen), ?seed=N fixes the city layout.
import * as THREE from 'three';
import { getMission } from './missions.js';
import { createCrewState } from './crew.js';
import { completionPercent } from './completion.js';
import { getRace, createRaceState, startRace, updateRace, raceResults } from './races.js';
import { getDialogue } from './dialogue.js';
import { drawPortrait } from './portraits.js';
import { createMenu } from './menu.js';
import { listSlots, loadSave, writeSave, clearSave } from './save.js';
import { buildWorld, SHOT_STATE, STAGED_CAREER, STAGED_SLOTS } from './world.js';
import { createPlayer, createChaseCamera } from './player.js';
import { createHud } from './hud.js';
import { createWantedSystem } from './police.js';
import { createAudio } from './audio.js';
import { phaseForHour, advanceClock, formatClock } from './daynight.js';

const params = new URLSearchParams(window.location.search);
const shotId = Math.max(1, Math.min(4, parseInt(params.get('shot') || '1', 10)));
const seed = parseInt(params.get('seed') || '1', 10);
const shotMode = params.has('shot');

// --- Renderer + scene (the #scene canvas already fills the page) ---
// Size the renderer from the canvas's LAID-OUT box, not window.innerHeight:
// headless Chrome reports innerHeight 87px short of the layout viewport, so
// sizing from innerHeight left an 87px dead band under the scene (the HUD,
// laid out against the real viewport, sat in it). The canvas CSS is
// position:fixed inset:0 at 100%, so clientWidth/clientHeight are the true
// frame; updateStyle=false keeps setSize from overriding that CSS.
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.14;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 900);

function fitRenderer() {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h, false);
}
fitRenderer();

// --- World ---
const world = buildWorld(scene, seed, shotId);
world.stageCamera(camera);

// --- Game state: staged per shot (each shot a different mission,
// district, money figure and rank) or loaded from the save in free play ---
const save = loadSave();
const shotState = SHOT_STATE[shotId];
const state = {
  cash: shotMode ? shotState.cash : save.cash,
  rp: shotMode ? shotState.rp : save.rp,
  missionId: shotMode ? shotState.missionId : save.missionId,
  missionStage: shotMode ? shotState.missionStage : save.missionStage,
  wanted: shotState.wanted,
  speedMph: shotState.speedMph,
  weapon: shotState.weapon,
  health: shotState.health,
  armor: shotState.armor,
  condition: shotState.condition,
  timerSeconds: shotState.timerSeconds,
  clock: shotState.clock,
  clockMinutes: 16 * 60 + 42,
  district: shotState.district,
  standing: shotState.standing,
  vehicle: shotState.vehicle,
  tip: shotState.tip,
  logLine: shotState.logLine,
  headingDeg: 0,
  headingRad: Math.PI,
  playerPos: { x: 2, z: 0 },
  cruisers: world.cruiserPositions,
  roadblock: true,
  onFoot: shotState.onFoot,
};

// --- Systems ---
const player = createPlayer(world.playerCar);
const chaseCamera = createChaseCamera(camera);
const wantedSystem = createWantedSystem();
wantedSystem.state.stars = state.wanted;
wantedSystem.state.heat = state.wanted * 20;
const crewState = createCrewState();
const audio = createAudio();
const hud = createHud(state);
const menu = createMenu();
let raceState = null;

// Mission dialogue on load.
const mission = getMission(state.missionId);
hud.showDialogue(mission.contact, mission.dialogue);

// --- Title slots: staged in shot 4, real saves in free play ---
function fillTitleSlots(slots) {
  const list = document.getElementById('title-slots');
  list.innerHTML = slots.map((slot, i) => {
    if (!slot) return `<li class="empty"><b>SLOT ${i + 1}</b><span>EMPTY — no save yet</span></li>`;
    const m = getMission(slot.missionId || 1);
    const completion = slot.completion ?? completionPercent(slot.progress);
    return `<li><b>SLOT ${i + 1} · ${m.act} — ${m.name}</b>
      <span>${completion}% · ${slot.missionsDone ?? slot.progress?.missionsDone ?? 0}/10 missions · ${slot.district || ''}</span>
      <span>$${(slot.cash || 0).toLocaleString('en-US')} · ${slot.savedAt || ''}</span></li>`;
  }).join('');
}

// --- Play mode: title screen, pause menu, dialogue screen, controls ---
const titleScreen = document.getElementById('title-screen');
const dialogueScreen = document.getElementById('dialogue-screen');
let playing = false;
let paused = false;

function showDialogueScreen(missionId) {
  const sceneData = getDialogue(missionId);
  document.getElementById('dialogue-screen-title').textContent = sceneData.title;
  document.getElementById('dialogue-screen-speaker').textContent = sceneData.speaker;
  document.getElementById('dialogue-screen-lines').textContent = sceneData.lines.join(' ');
  drawPortrait(document.getElementById('dialogue-screen-portrait'), sceneData.portrait);
  dialogueScreen.hidden = false;
}

function careerData() {
  return {
    missionId: state.missionId,
    cash: state.cash,
    rp: state.rp,
    progress: save.progress,
    ratings: save.ratings,
    career: save.career,
  };
}

function startGame() {
  titleScreen.style.display = 'none';
  audio.unlock();
  audio.playJingle();
  playing = true;
  if (!shotMode) showDialogueScreen(state.missionId);
}

if (shotMode) {
  // Screenshot mode: hide the control hint; each shot stages its own screen.
  document.getElementById('hint').style.display = 'none';
  if (shotId === 4) {
    // Title screen over the golden-hour vista: do NOT start the game.
    document.getElementById('hud').style.display = 'none';
    fillTitleSlots(STAGED_SLOTS);
  } else if (shotId === 3) {
    // STATS tab of the pause menu over the chase world.
    document.getElementById('hud').style.display = 'none';
    startGame();
    paused = true;
    document.getElementById('menu-clock').textContent = `${state.clock} · DAY`;
    menu.open('STATS', STAGED_CAREER);
  } else {
    startGame();
  }
} else {
  fillTitleSlots(listSlots());
  document.getElementById('play-btn').addEventListener('click', startGame);
  document.getElementById('new-game-btn').addEventListener('click', () => {
    clearSave();
    state.cash = 250;
    state.rp = 0;
    state.missionId = 1;
    state.missionStage = 1;
    state.district = 'Marina Bay';
    startGame();
  });
  document.getElementById('load-btn').addEventListener('click', () => {
    titleScreen.style.display = 'none';
    playing = true;
    paused = true;
    menu.open('SAVE', careerData());
  });
  document.getElementById('settings-btn').addEventListener('click', () => {
    const banner = document.getElementById('banner');
    banner.textContent = 'SETTINGS — SOUND ON · QUALITY HIGH';
    banner.style.display = 'block';
    setTimeout(() => { banner.style.display = 'none'; }, 2000);
  });
  dialogueScreen.addEventListener('click', () => {
    dialogueScreen.hidden = true;
  });
  window.addEventListener('keydown', (e) => {
    if ((e.code === 'KeyP' || e.code === 'Escape') && playing) {
      paused = !paused;
      if (paused) {
        document.getElementById('menu-clock').textContent = `${state.clock} · ${phaseForHour(state.clockMinutes / 60).name}`;
        menu.open('STATS', careerData());
      } else {
        menu.close();
      }
    }
    if (e.code === 'KeyM' && playing && crewState.useAbility('rosa')) {
      state.wanted = Math.max(0, state.wanted - 1);
      wantedSystem.state.stars = state.wanted;
    }
    if (e.code === 'KeyL' && playing && crewState.useAbility('dez')) {
      state.condition = 100;
    }
    if (e.code === 'KeyK' && playing && crewState.useAbility('pip')) {
      state.roadblock = !state.roadblock;
    }
    if (e.code === 'KeyF' && playing) {
      state.onFoot = !state.onFoot;
      player.state.onFoot = state.onFoot;
    }
    if (e.code === 'KeyR' && playing && !raceState?.running) {
      raceState = createRaceState(getRace('strand-sprint'));
      startRace(raceState);
      const banner = document.getElementById('banner');
      banner.textContent = 'STRAND SPRINT — GO!';
      banner.style.display = 'block';
      setTimeout(() => { banner.style.display = 'none'; }, 1500);
    }
    if (e.code.startsWith('Digit')) {
      const weapons = ['FISTS', '.38', 'SMG', '12G', 'AR-9'];
      const idx = Number(e.code.slice(5)) - 1;
      if (weapons[idx]) state.weapon = weapons[idx];
    }
  });
  window.addEventListener('resize', fitRenderer);
}

// Autosave on unload.
window.addEventListener('beforeunload', () => {
  writeSave({
    ...save,
    cash: state.cash,
    rp: state.rp,
    missionId: state.missionId,
    missionStage: state.missionStage,
    district: state.district,
    completedMissions: [1, 2, 3, 4, 5],
  });
});

// --- Main loop ---
const clock = new THREE.Clock();
let currentPhase = phaseForHour(state.clockMinutes / 60).name;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  if (playing && !paused) {
    if (!shotMode) {
      // Free play: drive with WASD, chase camera follows.
      const playerState = player.update(dt);
      chaseCamera.update(playerState, dt);
      state.speedMph = playerState.speed;
      state.headingRad = playerState.heading;
      state.headingDeg = THREE.MathUtils.radToDeg(playerState.heading);
      state.playerPos = { x: playerState.position.x, z: playerState.position.z };
      wantedSystem.update(dt, true, state.standing);
      state.wanted = wantedSystem.state.stars;
      state.timerSeconds = Math.max(0, state.timerSeconds - dt);
      audio.setEngine(state.speedMph, state.wanted);
      // Day/night clock: 1 game hour per 2 real minutes; relight on phase change.
      state.clockMinutes = advanceClock(state.clockMinutes, dt);
      state.clock = formatClock(state.clockMinutes);
      const phase = phaseForHour(state.clockMinutes / 60);
      if (phase.name !== currentPhase) {
        currentPhase = phase.name;
        world.applyPhase(phase);
      }
      // Street race progress.
      if (raceState && raceState.running) {
        const event = updateRace(raceState, dt, state.playerPos);
        const banner = document.getElementById('banner');
        if (event === 'checkpoint') {
          banner.textContent = `CHECKPOINT ${raceState.checkpoint}/${raceState.race.checkpoints}`;
          banner.style.display = 'block';
          setTimeout(() => { banner.style.display = 'none'; }, 1200);
        } else if (event === 'finish') {
          const results = raceResults(raceState);
          state.cash += results.prize;
          state.rp += results.rp;
          banner.textContent = `${results.rating} — ${results.position}${['ST', 'ND', 'RD', 'TH'][results.position - 1]} PLACE · +$${results.prize}`;
          banner.style.display = 'block';
          setTimeout(() => { banner.style.display = 'none'; }, 3000);
        }
      }
    } else {
      // Staged shot: the world animates around the fixed camera.
      state.timerSeconds = Math.max(0, state.timerSeconds - dt * 0.25);
    }
    crewState.update(dt);
    world.animate(camera);
    hud.update(time, raceState);
  }
  renderer.render(scene, camera);
}
loop();
