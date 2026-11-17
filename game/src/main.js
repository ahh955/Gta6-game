// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps,
// and the renderer paints what is there. The game moves between title, play, paused, busted,
// wasted and complete screens; dialogue (the story's lines) pauses the world until read.
//
// ?seed=N fixes the city. ?shot=start|drive|chase|mission (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createGame, respawnAfterTrouble, stepGame } from './game.js';
import { ACTION_ADVANCE, ACTION_CONFIRM, ACTION_ENTER, ACTION_MUTE, ACTION_PAUSE, ACTION_PUNCH, createInput, createScriptedInput } from './input.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_COMPLETE, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WASTED } from './render.js';
import { createAudio } from './audio.js';
import { applySave, loadGame, readBest, saveGame } from './save.js';
import { stageShot } from './shots.js';
import { INTRO_LINES, MISSION_HINTS, MISSION_NAMES } from './story.js';

const MAX_FRAME = 0.25;
const DIALOGUE_SECONDS = 5.5;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const audio = createAudio();

const dummyInput = {
  move: () => ({ x: 0, y: 0 }),
  sprinting: () => false,
  firing: () => false,
  mouse: () => ({ x: 640, y: 360, inside: false }),
  takeActions: () => 0,
};

function runShot(name) {
  const state = createGame(seed);
  state.started = true;
  state.shotMode = true;
  const input = createScriptedInput();
  const scene = stageShot(name, state, input);
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const state = createGame(seed);
  const saved = loadGame();
  if (saved) {
    applySave(state, saved);
    state.hasSave = true;
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;
  }
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let dialogueTimer = 0;

  function announce(message) {
    status.textContent = message;
  }

  function setBanner(text, sub, seconds) {
    state.banner = { text, sub: sub || '', timer: seconds || 2.5 };
  }

  function handleEvents() {
    const events = state.events.splice(0, state.events.length);
    for (const event of events) {
      if (event.type === 'shot') audio.shot();
      else if (event.type === 'crash') audio.crash();
      else if (event.type === 'carWrecked') {
        audio.crash();
        setBanner('YOUR CAR IS WRECKED', 'Find another ride', 2.5);
      } else if (event.type === 'pickup') audio.pickup();
      else if (event.type === 'punch') audio.punch();
      else if (event.type === 'enterCar') audio.enterCar();
      else if (event.type === 'crime') setBanner(event.text, '', 2);
      else if (event.type === 'missionStart') {
        audio.missionStart();
        setBanner(`MISSION: ${event.name}`, MISSION_HINTS[state.mission.index] || '', 4);
      } else if (event.type === 'missionComplete') {
        audio.missionComplete();
        setBanner('MISSION COMPLETE', event.text, 4);
        saveGame(state);
      } else if (event.type === 'missionFailed') {
        setBanner('MISSION FAILED', event.text, 3);
      } else if (event.type === 'checkpoint') {
        audio.pickup();
        setBanner(event.text, '', 1.5);
      } else if (event.type === 'gameComplete') {
        screen = SCREEN_COMPLETE;
        saveGame(state);
      } else if (event.type === 'busted') {
        respawnAfterTrouble(state, 'busted');
        screen = SCREEN_BUSTED;
        announce('Busted. You lost $200 and your mission failed.');
      } else if (event.type === 'wasted') {
        respawnAfterTrouble(state, 'wasted');
        screen = SCREEN_WASTED;
        announce('Wasted. You wake up at the hospital, $200 lighter.');
      } else if (event.type === 'autosave') {
        saveGame(state);
      }
    }
  }

  function startGame() {
    state.started = true;
    audio.start();
    screen = SCREEN_PLAY;
    if (!state.hasSave) {
      state.dialogue = { lines: INTRO_LINES, index: 0, timer: 0 };
      dialogueTimer = 0;
    }
    announce(`Playing. Next job: ${MISSION_NAMES[state.mission.index] || 'free roam'}.`);
  }

  function stepOnce(actions) {
    const mouse = input.mouse();
    state.mouseWorld = {
      x: state.camera.x + (mouse.x - 640),
      y: state.camera.y + (mouse.y - 360),
    };
    stepGame(state, input, actions, STEP);
    handleEvents();
  }

  function advanceDialogue() {
    const d = state.dialogue;
    if (!d) return;
    d.index += 1;
    dialogueTimer = 0;
    if (d.index >= d.lines.length) state.dialogue = null;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) audio.setMuted(!audio.isMuted());
    if (actions & ACTION_ADVANCE) advanceDialogue();

    if (screen === SCREEN_TITLE) {
      accumulator += dt;
      while (accumulator >= STEP) {
        stepGame(state, dummyInput, { enter: false, punch: false }, STEP);
        state.events.length = 0;
        accumulator -= STEP;
      }
      if (actions & ACTION_CONFIRM) startGame();
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else {
        if (state.dialogue) {
          dialogueTimer += dt;
          if (dialogueTimer > DIALOGUE_SECONDS) advanceDialogue();
        } else {
          accumulator += dt;
          const stepActions = { enter: Boolean(actions & ACTION_ENTER), punch: Boolean(actions & ACTION_PUNCH) };
          let stepped = false;
          while (accumulator >= STEP) {
            stepOnce(stepped ? { enter: false, punch: false } : stepActions);
            stepped = true;
            accumulator -= STEP;
            if (state.dialogue) break;
          }
        }
        audio.update(dt, state);
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (screen === SCREEN_BUSTED || screen === SCREEN_WASTED || screen === SCREEN_COMPLETE) {
      if (actions & ACTION_CONFIRM) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    renderer.draw(state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });
  window.addEventListener('pointerdown', () => audio.start(), { once: true });
  window.addEventListener('keydown', () => audio.start(), { once: true });

  announce('Solmar City. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
