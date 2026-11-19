// Solmar City — three checkpoint street races. Press R in a car near a
// race gate to start; drive the rings in order and beat the gold time for
// a bonus. Best times are saved.

import { CFG } from './config.js';

export const RACES = [
  {
    id: 'beach',
    name: 'Beach Sprint',
    reward: 300,
    goldTime: 26,
    gate: { x: 2200, y: 100 },
    checkpoints: [
      { x: 2200, y: 400 },
      { x: 2200, y: 700 },
      { x: 2200, y: 1000 },
      { x: 2200, y: 1300 },
      { x: 2200, y: 1600 },
      { x: 1900, y: 1600 },
      { x: 1600, y: 1600 },
      { x: 1300, y: 1600 },
      { x: 1000, y: 1600 },
      { x: 700, y: 1600 },
      { x: 400, y: 1600 },
      { x: 100, y: 1600 },
    ],
  },
  {
    id: 'downtown',
    name: 'Downtown Loop',
    reward: 450,
    goldTime: 22,
    gate: { x: 1000, y: 100 },
    checkpoints: [
      { x: 1300, y: 100 },
      { x: 1600, y: 100 },
      { x: 1900, y: 100 },
      { x: 1900, y: 400 },
      { x: 1900, y: 700 },
      { x: 1900, y: 1000 },
      { x: 1600, y: 1000 },
      { x: 1300, y: 1000 },
      { x: 1000, y: 1000 },
      { x: 1000, y: 700 },
      { x: 1000, y: 400 },
      { x: 1000, y: 100 },
    ],
  },
  {
    id: 'harbor',
    name: 'Harbor Run',
    reward: 600,
    goldTime: 25,
    gate: { x: 100, y: 1600 },
    checkpoints: [
      { x: 400, y: 1600 },
      { x: 700, y: 1600 },
      { x: 1000, y: 1600 },
      { x: 1300, y: 1600 },
      { x: 1600, y: 1600 },
      { x: 1900, y: 1600 },
      { x: 2200, y: 1600 },
      { x: 2200, y: 1300 },
      { x: 2200, y: 1000 },
      { x: 2200, y: 700 },
      { x: 1900, y: 700 },
      { x: 1600, y: 700 },
    ],
  },
];

export function createRaces() {
  return {
    active: null, // { def, checkpoint, time, countdown }
  };
}

// The race gate the player is standing at (in a car), if any.
export function raceAtGate(game) {
  if (game.player.onFoot || game.races.active) return null;
  for (const race of RACES) {
    if (Math.hypot(game.player.x - race.gate.x, game.player.y - race.gate.y) < 80) {
      return race;
    }
  }
  return null;
}

export function startRace(game, race) {
  game.races.active = { def: race, checkpoint: 0, time: 0, countdown: 3.2 };
  game.audio.raceStart();
  game.message(`${race.name}: 3... 2... 1... GO!`);
}

function finishRace(game) {
  const active = game.races.active;
  const def = active.def;
  const time = active.time;
  game.races.active = null;
  const gold = time <= def.goldTime;
  const reward = def.reward + (gold ? CFG.raceGoldBonus : 0);
  game.save.cash += reward;
  game.save.totalEarned += reward;
  const prevBest = game.save.raceBest[def.id];
  const isBest = !prevBest || time < prevBest;
  if (isBest) game.save.raceBest[def.id] = Math.round(time * 100) / 100;
  game.audio.missionDone();
  game.state = 'raceResult';
  game.stateData = {
    title: 'RACE FINISHED',
    lines: [
      `${def.name} — ${time.toFixed(2)}s`,
      `Reward: $${reward}${gold ? ' (gold time bonus!)' : ''}`,
      isBest ? 'New best time!' : `Best: ${game.save.raceBest[def.id].toFixed(2)}s`,
    ],
  };
}

export function updateRaces(game, dt) {
  const active = game.races.active;
  if (!active) return;
  if (active.countdown > 0) {
    active.countdown -= dt;
    // Hold the car still during the countdown.
    if (game.player.car) {
      game.player.car.speed = 0;
      game.player.car.vx = 0;
      game.player.car.vy = 0;
    }
    return;
  }
  active.time += dt;
  const cp = active.def.checkpoints[active.checkpoint];
  if (!cp) {
    finishRace(game);
    return;
  }
  if (Math.hypot(game.player.x - cp.x, game.player.y - cp.y) < 58) {
    active.checkpoint += 1;
    game.audio.checkpoint();
    if (active.checkpoint >= active.def.checkpoints.length) {
      finishRace(game);
    }
  }
}
