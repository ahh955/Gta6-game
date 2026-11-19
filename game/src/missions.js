// Solmar City — five story missions with Dario Reyes, Mama Luz and the
// Los Tiburones gang. Missions unlock one after another; each pays cash on
// completion and saves its progress.

import { CFG } from './config.js';
import { setWanted } from './police.js';
import { spawnEnemies } from './combat.js';
import { makeCar } from './traffic.js';

// Every mission place, derived from the city layout.
export function missionSpots(world) {
  return {
    dario: { x: world.avenues[2], y: world.streets[1] },
    goldCar: { x: world.avenues[4] + 40, y: world.streets[0] + 120 },
    garage: { x: world.avenues[2], y: world.streets[2] },
    diner: { x: world.avenues[1], y: world.streets[3] },
    package: { x: world.piers[0].x + 30, y: world.piers[0].y + 120 },
    parkGate: { x: world.park.cx, y: world.park.y + world.park.h + 46 },
    parkCentre: { x: world.park.cx, y: world.park.cy },
    safehouse: { x: world.avenues[6], y: world.streets[2] },
    warehouse: { x: world.avenues[5], y: world.streets[5] },
    truck: { x: world.piers[1].x + 30, y: CFG.harborY + 70 },
  };
}

export const MISSION_DEFS = [
  {
    id: 0,
    name: 'First Wheels',
    giver: 'Dario Reyes',
    reward: 500,
    letter: 'D',
    brief: [
      'Dario Reyes: "Listen, kid. A gold Comet is sitting up on Palm Avenue,',
      'keys in it, owner nowhere. Bring it to my garage and I will make it',
      'worth your while. Five hundred, no questions."',
    ],
    startKey: 'dario',
  },
  {
    id: 1,
    name: "Mama Luz's Errand",
    giver: 'Mama Luz',
    reward: 800,
    letter: 'L',
    brief: [
      'Mama Luz: "My spice shipment is waiting at the harbour, mijo, and my',
      'lunch crowd arrives in ninety seconds. Pick it up and bring it to the',
      'diner. Drive like your abuela is watching. She is."',
    ],
    startKey: 'diner',
  },
  {
    id: 2,
    name: 'Turf War',
    giver: 'Dario Reyes',
    reward: 1200,
    letter: 'D',
    brief: [
      'Dario Reyes: "Los Tiburones took the park. Six of them, armed, acting',
      'like they own Solmar. Take the park back and the whole city hears',
      'about it. Twelve hundred. Do not miss."',
    ],
    startKey: 'parkGate',
  },
  {
    id: 3,
    name: 'The Getaway',
    giver: 'Mama Luz',
    reward: 1800,
    letter: 'L',
    brief: [
      'Mama Luz: "The police know your face now, mijo. Three stars, and they',
      'will not stop. Stay free for one minute, then come home to the',
      'safehouse. Eighteen hundred, and I cook for a week."',
    ],
    startKey: 'safehouse',
  },
  {
    id: 4,
    name: 'Harbor Heist',
    giver: 'Dario Reyes',
    reward: 2500,
    letter: 'D',
    brief: [
      'Dario Reyes: "Last job, biggest pay. A Tiburones truck full of cargo',
      'is sitting at the harbour. Take it, lose the heat as best you can,',
      'and bring it to my warehouse. Twenty-five hundred. You are a legend',
      'after this, kid."',
    ],
    startKey: 'warehouse',
  },
];

export function createMissions() {
  return {
    active: null, // { def, step, timer, targetCar, enemiesLeft }
    spots: null, // filled by main.js once the world exists
  };
}

export function nextMissionIndex(game) {
  return game.save.missionsDone;
}

export function nextMissionDef(game) {
  const idx = nextMissionIndex(game);
  if (idx >= MISSION_DEFS.length) return null;
  return MISSION_DEFS[idx];
}

// Where the player goes to start the next mission (or the active objective).
export function currentObjective(game) {
  const missions = game.missions;
  if (missions.active) {
    const a = missions.active;
    const spots = missions.spots;
    if (a.def.id === 0) {
      if (a.step === 0) return { x: spots.goldCar.x, y: spots.goldCar.y, label: 'Steal the gold Comet' };
      return { x: spots.garage.x, y: spots.garage.y, label: 'Deliver the Comet to the garage' };
    }
    if (a.def.id === 1) {
      if (a.step === 0) return { x: spots.package.x, y: spots.package.y, label: 'Pick up the spice shipment' };
      return { x: spots.diner.x, y: spots.diner.y, label: `Deliver to Mama Luz (${Math.ceil(a.timer)}s)` };
    }
    if (a.def.id === 2) {
      return { x: spots.parkCentre.x, y: spots.parkCentre.y, label: `Clear the park (${a.enemiesLeft} left)` };
    }
    if (a.def.id === 3) {
      if (a.step === 0) return { x: game.player.x, y: game.player.y, label: `Stay free (${Math.ceil(a.timer)}s)` };
      return { x: spots.safehouse.x, y: spots.safehouse.y, label: 'Reach the safehouse' };
    }
    if (a.def.id === 4) {
      if (a.step === 0) return { x: spots.truck.x, y: spots.truck.y, label: 'Steal the Tiburones truck' };
      return { x: spots.warehouse.x, y: spots.warehouse.y, label: 'Deliver the truck to the warehouse' };
    }
  }
  const def = nextMissionDef(game);
  if (!def) return null;
  const spot = missions.spots[def.startKey];
  return { x: spot.x, y: spot.y, label: `See ${def.giver}: ${def.name}` };
}

export function tryStartMission(game) {
  if (game.missions.active) return null;
  const def = nextMissionDef(game);
  if (!def) return null;
  const spot = game.missions.spots[def.startKey];
  if (Math.hypot(game.player.x - spot.x, game.player.y - spot.y) > 70) return null;
  return def;
}

function spawnMissionCar(game, spot, color, type) {
  const car = makeCar(game.nextCarId, spot.x, spot.y, 0, color, type);
  game.nextCarId += 1;
  car.parked = true;
  car.missionCar = true;
  game.cars.push(car);
  return car;
}

export function startMission(game, def) {
  const spots = game.missions.spots;
  const active = { def, step: 0, timer: 0, targetCar: null, enemiesLeft: 0 };
  if (def.id === 0) {
    active.targetCar = spawnMissionCar(game, spots.goldCar, '#e8c53a', 'sport');
  } else if (def.id === 2) {
    spawnEnemies(game, spots.parkCentre.x, spots.parkCentre.y, 6, '#2e8f83', true);
    active.enemiesLeft = 6;
  } else if (def.id === 3) {
    setWanted(game, 3, true);
    active.timer = 60;
  } else if (def.id === 4) {
    active.targetCar = spawnMissionCar(game, spots.truck, '#5b6ee8', 'truck');
  }
  game.missions.active = active;
  game.message(`Mission started: ${def.name} ($${def.reward})`);
}

function completeMission(game) {
  const active = game.missions.active;
  const def = active.def;
  game.missions.active = null;
  game.save.cash += def.reward;
  game.save.totalEarned += def.reward;
  game.save.missionsDone = Math.max(game.save.missionsDone, def.id + 1);
  game.audio.missionDone();
  game.state = 'complete';
  game.stateData = {
    title: 'MISSION COMPLETE',
    lines: [def.name, `Reward: $${def.reward}`, game.save.missionsDone >= MISSION_DEFS.length ? 'All missions complete. Solmar City is yours!' : `Next: ${MISSION_DEFS[game.save.missionsDone].name}`],
  };
}

export function failMission(game, reason) {
  const active = game.missions.active;
  if (!active) return;
  if (active.def.id === 3) setWanted(game, game.police.wanted, false);
  if (active.targetCar) {
    game.cars = game.cars.filter((c) => c !== active.targetCar);
  }
  if (active.def.id === 2) {
    // Only the mission's own gang members count; the harbour thugs are
    // free-roam and never block the objective.
    game.combat.enemies = game.combat.enemies.filter((e) => !e.mission || e.state === 'down');
  }
  game.missions.active = null;
  game.message(`Mission failed: ${reason}`);
}

export function updateMissions(game, dt) {
  const active = game.missions.active;
  if (!active) return;
  const spots = game.missions.spots;
  const player = game.player;

  if (active.def.id === 0) {
    if (active.step === 0) {
      if (!player.onFoot && player.car === active.targetCar) {
        active.step = 1;
        game.message('Got the Comet! Take it to Dario\'s garage.');
      }
    } else if (!player.onFoot && player.car === active.targetCar) {
      if (Math.hypot(player.x - spots.garage.x, player.y - spots.garage.y) < 70) {
        completeMission(game);
      }
    }
  } else if (active.def.id === 1) {
    if (active.step === 0) {
      if (Math.hypot(player.x - spots.package.x, player.y - spots.package.y) < 46) {
        active.step = 1;
        active.timer = 90;
        game.message('Got the spices! 90 seconds to the diner!');
        game.audio.checkpoint();
      }
    } else {
      active.timer -= dt;
      if (active.timer <= 0) {
        failMission(game, 'the lunch crowd came and went');
      } else if (Math.hypot(player.x - spots.diner.x, player.y - spots.diner.y) < 70) {
        completeMission(game);
      }
    }
  } else if (active.def.id === 2) {
    const alive = game.combat.enemies.filter((e) => e.state === 'alive' && e.mission).length;
    active.enemiesLeft = alive;
    if (alive === 0) completeMission(game);
  } else if (active.def.id === 3) {
    if (active.step === 0) {
      active.timer -= dt;
      if (active.timer <= 0) {
        active.step = 1;
        setWanted(game, game.police.wanted, false);
        game.message('You outlasted them! Get to the safehouse.');
      }
    } else if (Math.hypot(player.x - spots.safehouse.x, player.y - spots.safehouse.y) < 70) {
      completeMission(game);
    }
  } else if (active.def.id === 4) {
    if (active.step === 0) {
      if (!player.onFoot && player.car === active.targetCar) {
        active.step = 1;
        setWanted(game, 2, false);
        game.message('You have the truck! The police are on to you!');
      }
    } else if (!player.onFoot && player.car === active.targetCar) {
      if (Math.hypot(player.x - spots.warehouse.x, player.y - spots.warehouse.y) < 70) {
        completeMission(game);
      }
    }
  }
}
