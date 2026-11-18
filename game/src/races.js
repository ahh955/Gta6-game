// Street races: three checkpoint races with a start gate each, a clock, cash for finishing
// and a bonus for beating the gold time. Press R near a gate (in a car) to start; the race
// pays when the last checkpoint is crossed. Best times and wins are saved.
export const RACES = [
  {
    name: 'Beach Sprint',
    start: { x: 400, y: 2900 },
    checkpoints: [
      { x: 1600, y: 2900 },
      { x: 2800, y: 2900 },
      { x: 4400, y: 2900 },
    ],
    reward: 300,
    goldTime: 18,
    goldBonus: 200,
    hint: 'Flat out along the beach road — three checkpoints, no turns.',
  },
  {
    name: 'Harbor Loop',
    start: { x: 4000, y: 2900 },
    checkpoints: [
      { x: 4400, y: 2900 },
      { x: 4400, y: 1400 },
      { x: 4000, y: 1400 },
      { x: 4000, y: 2900 },
    ],
    reward: 400,
    goldTime: 25,
    goldBonus: 250,
    hint: 'A loop around the harbor blocks — four checkpoints, three sharp turns.',
  },
  {
    name: 'Downtown Dash',
    start: { x: 1000, y: 400 },
    checkpoints: [
      { x: 3400, y: 400 },
      { x: 3400, y: 2400 },
      { x: 1000, y: 2400 },
      { x: 1000, y: 400 },
    ],
    reward: 600,
    goldTime: 45,
    goldBonus: 400,
    hint: 'The big one: a full loop of downtown — four checkpoints, traffic everywhere.',
  },
];

const GATE_RADIUS = 110;
const CHECKPOINT_RADIUS = 120;

export function createRaceState() {
  return {
    active: false,
    index: -1,
    checkpoint: 0,
    timer: 0,
    bestTimes: [null, null, null],
    completed: [false, false, false],
  };
}

/** The race whose start gate the player is standing at, or -1. */
export function raceGateNear(state) {
  const player = state.player;
  for (let i = 0; i < RACES.length; i += 1) {
    const g = RACES[i].start;
    if (Math.hypot(player.x - g.x, player.y - g.y) < GATE_RADIUS) return i;
  }
  return -1;
}

function burst(state, x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    state.particles.push({
      x, y,
      vx: Math.cos(a) * 140,
      vy: Math.sin(a) * 140,
      life: 0.7, maxLife: 0.7, color, size: 5, kind: 'spark',
    });
  }
}

function startRace(state, index) {
  const r = state.race;
  const def = RACES[index];
  r.active = true;
  r.index = index;
  r.checkpoint = 0;
  r.timer = 0;
  state.events.push({ type: 'raceStart', name: def.name, hint: def.hint });
  burst(state, def.start.x, def.start.y, '#3fd2ff', 16);
}

/** The R key: start the race at the gate under the player, if there is one. */
export function tryStartRace(state) {
  const r = state.race;
  if (r.active || state.mission.active || state.dialogue) return;
  const index = raceGateNear(state);
  if (index === -1) return;
  if (!state.player.car) {
    state.events.push({ type: 'raceNeedCar' });
    return;
  }
  startRace(state, index);
}

function finishRace(state) {
  const r = state.race;
  const def = RACES[r.index];
  const time = r.timer;
  const gold = time <= def.goldTime;
  const reward = def.reward + (gold ? def.goldBonus : 0);
  state.player.money += reward;
  r.completed[r.index] = true;
  if (r.bestTimes[r.index] === null || time < r.bestTimes[r.index]) r.bestTimes[r.index] = time;
  burst(state, state.player.x, state.player.y, '#ffd94a', 24);
  state.events.push({
    type: 'raceComplete',
    text: gold
      ? `${def.name} in ${time.toFixed(1)}s — GOLD TIME! +$${reward}`
      : `${def.name} in ${time.toFixed(1)}s — +$${reward}`,
    reward,
  });
  r.active = false;
  r.index = -1;
  r.checkpoint = 0;
  r.timer = 0;
}

/** Called when the player is busted or wasted mid-race: the race is over, no payout. */
export function cancelRace(state) {
  const r = state.race;
  r.active = false;
  r.index = -1;
  r.checkpoint = 0;
  r.timer = 0;
}

export function updateRaces(state, dt, actions) {
  if (actions && actions.race) tryStartRace(state);
  const r = state.race;
  if (!r.active) return;
  r.timer += dt;
  const def = RACES[r.index];
  const cp = def.checkpoints[r.checkpoint];
  if (cp && Math.hypot(state.player.x - cp.x, state.player.y - cp.y) < CHECKPOINT_RADIUS) {
    r.checkpoint += 1;
    burst(state, cp.x, cp.y, '#3fd2ff', 12);
    if (r.checkpoint >= def.checkpoints.length) finishRace(state);
    else state.events.push({ type: 'checkpoint', text: `Checkpoint ${r.checkpoint} of ${def.checkpoints.length}` });
  }
}

/** The next checkpoint's position while a race runs, for the HUD and the minimap. */
export function raceWaypoint(state) {
  const r = state.race;
  if (!r.active) return null;
  return RACES[r.index].checkpoints[r.checkpoint] || null;
}

export function raceStatusText(state) {
  const r = state.race;
  if (!r.active) return '';
  const def = RACES[r.index];
  return `${def.name} — ${r.checkpoint}/${def.checkpoints.length} checkpoints`;
}
