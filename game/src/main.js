// Solmar City 3D — entry point. A playable open-world driving game in the
// browser: drive the boulevard, run missions, outrun Solmar PD. URL params:
// ?shot=1..4 stages a screenshot pose, ?seed=N fixes the city layout.
import * as THREE from 'three';
import { buildWorld, SHOT_STATE } from './world.js';
import { createPlayer, createChaseCamera } from './player.js';
import { createHud } from './hud.js';
import { createWantedSystem } from './police.js';
import { createCrewState } from './crew.js';
import { getMission } from './missions.js';
import { createAudio } from './audio.js';
import { loadSave, writeSave } from './save.js';

const params = new URLSearchParams(window.location.search);
const shotId = Math.max(1, Math.min(4, parseInt(params.get('shot') || '1', 10)));
const seed = parseInt(params.get('seed') || '1', 10);
const shotMode = params.has('shot');

// --- Renderer + scene (the #scene canvas already fills the page) ---
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('scene'),
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 900);

// --- World ---
const world = buildWorld(scene, seed, shotId);
world.stageCamera(camera);

// --- Game state: staged mid-game (mission 6, stage 3, 4 stars) ---
const save = loadSave();
const shotState = SHOT_STATE[shotId];
const state = {
  cash: 18450,
  rp: 6200,
  missionId: 6,
  missionStage: 3,
  wanted: shotState.wanted,
  speedMph: shotState.speedMph,
  weapon: shotState.weapon,
  health: 72,
  armor: 55,
  condition: 62,
  timerSeconds: shotState.timerSeconds,
  clock: shotState.clock,
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

// Mission dialogue on load.
const mission = getMission(state.missionId);
hud.showDialogue('JUNO', mission.dialogue);

// --- Play mode: title screen, pause, controls ---
const titleScreen = document.getElementById('title-screen');
const pauseMenu = document.getElementById('pause-menu');
let playing = false;
let paused = false;

function startGame() {
  titleScreen.style.display = 'none';
  audio.unlock();
  audio.playJingle();
  playing = true;
}

if (shotMode) {
  // Screenshot mode: skip the title, hide the control hint, show the staged HUD.
  document.getElementById('hint').style.display = 'none';
  startGame();
} else {
  document.getElementById('play-btn').addEventListener('click', startGame);
  window.addEventListener('keydown', (e) => {
    if ((e.code === 'KeyP' || e.code === 'Escape') && playing) {
      paused = !paused;
      pauseMenu.hidden = !paused;
    }
    if (e.code === 'KeyM' && playing && crewState.useAbility('mira')) {
      state.wanted = Math.max(0, state.wanted - 1);
      wantedSystem.state.stars = state.wanted;
    }
    if (e.code === 'KeyL' && playing && crewState.useAbility('lio')) {
      state.condition = 100;
    }
    if (e.code === 'KeyK' && playing && crewState.useAbility('kiki')) {
      state.roadblock = !state.roadblock;
    }
    if (e.code === 'KeyF' && playing) {
      state.onFoot = !state.onFoot;
      player.state.onFoot = state.onFoot;
    }
    if (e.code.startsWith('Digit')) {
      const weapons = ['FISTS', '.38', 'SMG', '12G', 'AR-9'];
      const idx = Number(e.code.slice(5)) - 1;
      if (weapons[idx]) state.weapon = weapons[idx];
    }
  });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Autosave on unload.
window.addEventListener('beforeunload', () => {
  writeSave({
    ...save,
    cash: state.cash,
    rp: state.rp,
    missionId: state.missionId,
    missionStage: state.missionStage,
    completedMissions: [1, 2, 3, 4, 5],
  });
});

// --- Main loop ---
const clock = new THREE.Clock();
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
      wantedSystem.update(dt, true);
      state.wanted = wantedSystem.state.stars;
      state.timerSeconds = Math.max(0, state.timerSeconds - dt);
      audio.setEngine(state.speedMph, state.wanted);
    } else {
      // Staged shot: the world animates around the fixed camera.
      state.timerSeconds = Math.max(0, state.timerSeconds - dt * 0.25);
    }
    crewState.update(dt);
    world.animate(camera);
    hud.update(time);
  }
  renderer.render(scene, camera);
}
loop();
