// Missions: five jobs with objectives, waypoints on the minimap, timers, and cash rewards.
// When no mission is active a yellow marker waits at the next job's start; walking or driving
// into it opens the briefing, and the job begins. Completing a job pays and unlocks the next.
import { MISSION_REWARDS } from './config.js';
import { MISSION_BRIEFINGS, MISSION_COMPLETE_LINES, MISSION_HINTS, MISSION_NAMES } from './story.js';
import { spawnEnemies } from './combat.js';
import { createCar } from './vehicles.js';

export const MISSION_COUNT = 5;

export function createMissionState() {
  return {
    index: 0,
    active: false,
    started: false,
    stage: 0,
    checkpoint: 0,
    timer: 0,
    waypoint: null,
    objective: '',
    briefing: null,
    briefingIndex: 0,
    complete: false,
    failed: false,
    failTimer: 0,
    car: null,
    checkpoints: [],
    enemiesLeft: 0,
  };
}

/** Where the next job's start marker waits. */
export function missionStartPoint(state) {
  const c = state.city;
  switch (state.mission.index) {
    case 0:
      return { x: 1000, y: 900 };
    case 1:
      return { x: 1600, y: 1900 };
    case 2:
      return { x: 2800, y: 900 };
    case 3:
      return { x: c.plaza.x, y: c.plaza.y - 260 };
    case 4:
      return { x: c.harborGate.x - 260, y: c.harborGate.y - 120 };
    default:
      return null;
  }
}

function setObjective(state, text, waypoint) {
  state.mission.objective = text;
  state.mission.waypoint = waypoint || null;
}

function beginMission(state) {
  const m = state.mission;
  m.active = true;
  m.started = true;
  m.stage = 0;
  m.checkpoint = 0;
  m.failed = false;
  m.complete = false;
  m.briefing = MISSION_BRIEFINGS[m.index];
  m.briefingIndex = 0;
  state.dialogue = { lines: m.briefing, index: 0, timer: 0 };
  if (m.index === 1) {
    // The getaway sedan waits at the job's start.
    const p = missionStartPoint(state);
    const car = createCar('sedan', p.x + 40, p.y + 30, 0, 'parked');
    car.color = '#4a7dd8';
    car.getawayCar = true;
    state.cars.push(car);
    m.car = car;
    m.checkpoints = [
      { x: 2200, y: 900 },
      { x: 3400, y: 1900 },
      { x: 3400, y: 400 },
    ];
    setObjective(state, 'Get in the blue sedan', { x: car.x, y: car.y });
  } else if (m.index === 2) {
    m.timer = 150;
    m.checkpoints = [
      { x: 400, y: 2400 },
      { x: 4000, y: 2900 },
      { x: 2200, y: 400 },
    ];
    setObjective(state, 'Deliver to drop 1 of 3', m.checkpoints[0]);
  } else if (m.index === 0) {
    setObjective(state, 'Steal a car', null);
  } else if (m.index === 3) {
    setObjective(state, 'Go to the plaza', { x: state.city.plaza.x, y: state.city.plaza.y });
  } else if (m.index === 4) {
    const prize = state.cars.find((c) => c.prizeCar);
    setObjective(state, 'Steal the gold sports car', prize ? { x: prize.x, y: prize.y } : { x: state.city.harborGate.x, y: state.city.harborGate.y });
  }
  state.events.push({ type: 'missionStart', name: MISSION_NAMES[m.index] });
}

function completeMission(state) {
  const m = state.mission;
  m.active = false;
  m.complete = true;
  state.player.money += MISSION_REWARDS[m.index];
  state.events.push({ type: 'missionComplete', text: MISSION_COMPLETE_LINES[m.index], reward: MISSION_REWARDS[m.index] });
  m.index += 1;
  m.stage = 0;
  m.checkpoint = 0;
  m.waypoint = null;
  m.objective = '';
  m.car = null;
  if (m.index >= MISSION_COUNT) {
    state.events.push({ type: 'gameComplete' });
  }
}

function failMission(state, reason) {
  const m = state.mission;
  m.active = false;
  m.failed = true;
  m.failTimer = 3;
  m.objective = '';
  m.waypoint = null;
  state.events.push({ type: 'missionFailed', text: reason });
  // The getaway car stays where it is; the next attempt starts fresh.
  m.car = null;
}

function near(x1, y1, x2, y2, dist) {
  return Math.hypot(x1 - x2, y1 - y2) < dist;
}

function updateMission0(state) {
  const m = state.mission;
  const player = state.player;
  if (m.stage === 0) {
    if (player.car) {
      m.stage = 1;
      setObjective(state, 'Drive to the garage', { x: state.city.garage.x, y: state.city.garage.y });
    }
  } else if (near(player.x, player.y, state.city.garage.x, state.city.garage.y, 110)) {
    completeMission(state);
  }
}

function updateMission1(state) {
  const m = state.mission;
  const player = state.player;
  if (m.stage === 0) {
    if (player.car === m.car) {
      m.stage = 1;
      m.checkpoint = 0;
      state.wanted.points = Math.max(state.wanted.points, 250);
      setObjective(state, 'Reach checkpoint 1 of 3', m.checkpoints[0]);
    }
    return;
  }
  const cp = m.checkpoints[m.checkpoint];
  if (cp && near(player.x, player.y, cp.x, cp.y, 120)) {
    m.checkpoint += 1;
    state.events.push({ type: 'checkpoint', text: `Checkpoint ${m.checkpoint} of 3` });
    if (m.checkpoint >= m.checkpoints.length) {
      m.stage = 2;
      setObjective(state, 'Reach the safehouse', { x: state.city.safehouse.x, y: state.city.safehouse.y });
    } else {
      setObjective(state, `Reach checkpoint ${m.checkpoint + 1} of 3`, m.checkpoints[m.checkpoint]);
    }
  }
  if (m.stage === 2 && near(player.x, player.y, state.city.safehouse.x, state.city.safehouse.y, 130)) {
    completeMission(state);
  }
}

function updateMission2(state, dt) {
  const m = state.mission;
  const player = state.player;
  m.timer -= dt;
  if (m.timer <= 0) {
    failMission(state, 'Too slow — the clients cancelled.');
    return;
  }
  const cp = m.checkpoints[m.checkpoint];
  if (cp && near(player.x, player.y, cp.x, cp.y, 110)) {
    m.checkpoint += 1;
    state.events.push({ type: 'checkpoint', text: `Drop ${m.checkpoint} of 3 done` });
    if (m.checkpoint >= m.checkpoints.length) completeMission(state);
    else setObjective(state, `Deliver to drop ${m.checkpoint + 1} of 3`, m.checkpoints[m.checkpoint]);
  }
}

function updateMission3(state) {
  const m = state.mission;
  const player = state.player;
  if (m.stage === 0) {
    if (near(player.x, player.y, state.city.plaza.x, state.city.plaza.y, 260)) {
      m.stage = 1;
      spawnEnemies(state, state.city.plaza.x, state.city.plaza.y, 6);
      m.enemiesLeft = 6;
      setObjective(state, 'Defeat Los Tiburones: 6 left', { x: state.city.plaza.x, y: state.city.plaza.y });
      state.events.push({ type: 'combatStart' });
    }
    return;
  }
  const alive = state.enemies.filter((e) => e.state !== 'dead').length;
  m.enemiesLeft = alive;
  setObjective(state, `Defeat Los Tiburones: ${alive} left`, { x: state.city.plaza.x, y: state.city.plaza.y });
  if (alive === 0) completeMission(state);
}

function updateMission4(state) {
  const m = state.mission;
  const player = state.player;
  const prize = state.cars.find((c) => c.prizeCar);
  if (m.stage === 0) {
    if (player.car === prize) {
      m.stage = 1;
      state.wanted.points = Math.max(state.wanted.points, 700);
      setObjective(state, 'Lose the cops, then reach the garage', { x: state.city.garage.x, y: state.city.garage.y });
    }
    return;
  }
  if (state.wanted.level === 0 && near(player.x, player.y, state.city.garage.x, state.city.garage.y, 130)) {
    completeMission(state);
  } else if (state.wanted.level === 0) {
    setObjective(state, 'Heat is off — reach the garage', { x: state.city.garage.x, y: state.city.garage.y });
  } else {
    setObjective(state, `Lose the cops (${state.wanted.level} stars), then reach the garage`, { x: state.city.garage.x, y: state.city.garage.y });
  }
}

export function updateMissions(state, dt) {
  const m = state.mission;
  if (m.failed) {
    m.failTimer -= dt;
    if (m.failTimer <= 0) m.failed = false;
    return;
  }
  if (!m.active) {
    // The start marker waits: walk or drive into it to begin the next job.
    if (m.index >= MISSION_COUNT) return;
    const start = missionStartPoint(state);
    if (start && near(state.player.x, state.player.y, start.x, start.y, 90)) beginMission(state);
    return;
  }
  if (state.dialogue) return; // the briefing pauses the job until it is read
  if (m.index === 0) updateMission0(state);
  else if (m.index === 1) updateMission1(state);
  else if (m.index === 2) updateMission2(state, dt);
  else if (m.index === 3) updateMission3(state);
  else if (m.index === 4) updateMission4(state);
}

/** Called when the player is busted or wasted mid-mission. */
export function failActiveMission(state, reason) {
  if (state.mission.active) failMission(state, reason);
}

export function missionHint(state) {
  if (state.mission.index >= MISSION_COUNT) return 'All jobs done — Solmar is yours. Free roam!';
  if (state.mission.active) return MISSION_HINTS[state.mission.index];
  return `Next job: ${MISSION_NAMES[state.mission.index]} — reach the yellow M marker.`;
}
