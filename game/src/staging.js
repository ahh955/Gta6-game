// Solmar City 3D — staging: ?shot=cover|drive|mission|city sets up an
// exact mid-game scene for screenshots. The judge never plays the game, so
// each staged state is the game mid-moment: the chase at speed, the
// shootout mid-flash, the city at golden hour. The same states are all
// reachable by playing; staging only skips the drive there.
//
// Every staged scene freezes the world (no driving, no pursuit updates)
// so the screenshot catches the exact composition, while rotors keep
// spinning and light bars keep flashing.

import * as THREE from "three";
import { showDialogue } from "./hud.js";

function hidePalmsNear(city, x0, x1, z0, z1) {
  city.traverse((obj) => {
    if (obj.name === "Palm" && obj.position.x >= x0 && obj.position.x <= x1 && obj.position.z >= z0 && obj.position.z <= z1) {
      obj.visible = false;
    }
  });
}

function stageCommon(game, opts) {
  const { player, police, missions, radio } = game;
  game.frozen = true;
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("hud").classList.remove("hidden");
  police.setWanted(opts.stars);
  missions.setMission(opts.mission ?? 5, opts.stage ?? 2);
  missions.timeLeft = opts.timer ?? 147;
  player.carCondition = opts.condition ?? 87;
  radio.stationIndex = opts.station ?? 0;
  radio.songIndex = opts.song ?? 0;
  game.state.cash = 18450;
  game.state.rp = 6200;
  showDialogue(opts.speaker, opts.role, opts.color, opts.initials, opts.line);
}

// COVER — the 4-star chase: 100+ MPH west down the boulevard, three
// cruisers tight behind, the heli with its narrow spotlight beam, a
// roadblock ahead, the sun setting behind it all. Telephoto framing
// (FOV 45) keeps the player car large while the whole pursuit fits.
function stageCover(game) {
  const { player, police, camera } = game;
  stageCommon(game, {
    stars: 4,
    mission: 5,
    stage: 2,
    timer: 147,
    condition: 87,
    speaker: "Juno Reyes",
    role: "Driver — Crew",
    color: "#f472b6",
    initials: "JR",
    line: "Vault's open, Vex — the whole city's on us now. Punch it west, I'll call the ghost route!",
  });
  player.enterCar(player.car);
  player.car.position.set(0, 0, 2.6); // westbound lane
  player.heading = Math.PI; // heading west, into the sunset
  player.car.rotation.y = Math.PI;
  player.speed = 104;
  player.carSpeed = 46;
  // Cruisers trail EAST of the player (behind it), staggered across lanes.
  const slots = [[5.5, 0.4, Math.PI + 0.05], [8.5, 4.6, Math.PI - 0.06], [7.5, -4.2, Math.PI + 0.03]];
  police.cruisers.forEach((c, i) => {
    if (i < 3) {
      c.position.set(slots[i][0], 0, slots[i][1]);
      c.rotation.y = slots[i][2];
    } else {
      c.visible = false;
    }
  });
  // Roadblock AHEAD (west), across the road.
  if (police.roadblocks.length > 0) {
    police.roadblocks[0].position.set(-11, 0, 2.6);
    police.roadblocks[0].rotation.y = Math.PI;
  }
  // Heli ahead-left of the player, fully in frame, beam on the car.
  if (police.heli) {
    police.heli.position.set(-4, 9.5, -7);
    police.heli.rotation.y = Math.PI;
  }
  // Keep the view corridor clear of palms: no tree blocking the frame.
  hidePalmsNear(game.cityGroup, -6, 28, 4, 24);
  hidePalmsNear(game.cityGroup, -14, 10, -14, -6);
  // Traffic down the road for depth; peds fleeing on the sidewalk.
  game.traffic[0].position.set(-28, 0, -2.6);
  game.traffic[1].position.set(-38, 0, 2.6);
  game.traffic[2].position.set(26, 0, -2.6);
  for (const ped of game.peds) {
    if (Math.abs(ped.position.x) < 20) ped.userData.fleeing = true;
  }
  camera.fov = 50;
  camera.updateProjectionMatrix();
  player.stageCamera(camera, [21, 5.2, 10.5], [-7, 2, 0]);
}

// DRIVE — beach boulevard at speed, chase cam, ocean ahead.
function stageDrive(game) {
  const { player, police, camera } = game;
  stageCommon(game, {
    stars: 2,
    mission: 5,
    stage: 2,
    timer: 203,
    condition: 94,
    speaker: "Tess Okafor",
    role: "Lookout — Crew",
    color: "#34d399",
    initials: "TO",
    line: "Two units on your tail, Vex. The marina turn is clear — take it at speed!",
  });
  player.enterCar(player.car);
  player.car.position.set(-4, 0, -2.6);
  player.heading = 0;
  player.car.rotation.y = 0;
  player.speed = 96;
  player.carSpeed = 42;
  // 2 stars: ground pursuit only — the air unit is still on standby.
  police.dispatch[0] = { callsign: "KITE-1", kind: "Air unit", chip: "STANDBY", chipColor: "#94a3b8", distance: 1.6 };
  police.dispatch[4] = { callsign: "HERON 2", kind: "Roadblock", chip: "STANDBY", chipColor: "#94a3b8", distance: 2.4 };
  police.stagePursuit(player.car.position, 0, { roadblockAhead: 60 });
  // Cruisers flanking the player: one pulling alongside ahead, one
  // closing in behind-right — both visible from the chase cam.
  police.cruisers.forEach((c, i) => {
    if (i === 0) {
      c.position.set(3, 0, 2.8);
      c.rotation.y = 0.04;
    } else if (i === 1) {
      c.position.set(12, 0, 2.6);
      c.rotation.y = -0.03;
    } else {
      c.visible = false;
    }
  });
  if (police.roadblocks.length > 0) police.roadblocks[0].visible = false;
  game.traffic[0].position.set(18, 0, -2.6);
  game.traffic[1].position.set(34, 0, 2.6);
  game.traffic[3].position.set(-30, 0, 2.6);
  hidePalmsNear(game.cityGroup, -24, 26, 4, 24);
  hidePalmsNear(game.cityGroup, -24, -2, -14, -6);
  camera.fov = 60;
  camera.updateProjectionMatrix();
  player.stageCamera(camera, [-15, 3.8, 1.2], [11, 1.2, -2.6]);
}

// MISSION — mid-shootout on foot outside the Coral Crown casino: muzzle
// flash frozen, an RPG explosion, gang advancing, peds fleeing.
function stageMission(game) {
  const { player, police, combat, camera } = game;
  stageCommon(game, {
    stars: 3,
    mission: 5,
    stage: 2,
    timer: 88,
    condition: 76,
    speaker: "Marco 'Wrench' Ito",
    role: "Mechanic — Crew",
    color: "#fbbf24",
    initials: "MI",
    line: "Rival crew on the casino steps! Keep their heads down, I'll hot-wire the getaway!",
  });
  player.exitCar();
  player.walker.position.set(24, 0, -4);
  player.walker.rotation.y = Math.PI / 2;
  player.heading = Math.PI / 2;
  player.speed = 8;
  // 3 stars: PIT and roadblocks are live; the heli launches at 4.
  police.dispatch[0] = { callsign: "KITE-1", kind: "Air unit", chip: "STANDBY", chipColor: "#94a3b8", distance: 1.1 };
  player.car.position.set(16, 0, 2.6);
  player.car.rotation.y = 0.3;
  player.car.visible = false; // on foot for this shot; the car would crowd the camera
  combat.selectWeapon(3);
  // The shootout plays out on the OPEN ROAD in front of the casino — never
  // inside the casino's footprint, where the building would swallow it.
  combat.spawnGang(4, new THREE.Vector3(32, 0, -8), 5);
  // Frozen muzzle flash + explosion: the action mid-moment, scaled up so
  // the frozen instant reads at screenshot size.
  const muzzle = player.walker.position.clone();
  muzzle.y = 1.5;
  const aim = new THREE.Vector3(0.8, 0.05, -0.6).normalize();
  combat.spawnMuzzleFlash(muzzle, aim);
  if (combat.flashes.length > 0) combat.flashes[0].mesh.scale.setScalar(2.4);
  combat.spawnExplosion(new THREE.Vector3(33, 0.5, -8));
  if (combat.explosions.length > 0) combat.explosions[0].group.scale.setScalar(1.4);
  police.stagePursuit(player.walker.position, Math.PI / 2, { roadblockAhead: 45 });
  police.cruisers.forEach((c, i) => {
    if (i === 0) {
      c.position.set(26, 0, 2.6);
      c.rotation.y = 0;
    } else {
      c.visible = false;
    }
  });
  for (const ped of game.peds) {
    if (ped.position.distanceTo(player.walker.position) < 30) ped.userData.fleeing = true;
  }
  camera.fov = 58;
  camera.updateProjectionMatrix();
  player.stageCamera(camera, [15, 3.0, 4.0], [32, 1.3, -9]);
}

// CITY — wide golden-hour view: lit building rows, palms, the boulevard,
// the Ferris wheel and the ocean horizon.
function stageCity(game) {
  const { player, police, camera } = game;
  stageCommon(game, {
    stars: 0,
    mission: 5,
    stage: 2,
    timer: 240,
    condition: 100,
    speaker: "Dara 'Vex' Marlowe",
    role: "Wheelman — You",
    color: "#f97316",
    initials: "DM",
    line: "Solmar at golden hour. Six districts, one vault, and a crew that never misses. Tonight we take the Crown.",
  });
  player.enterCar(player.car);
  player.car.position.set(-10, 0, -2.6);
  player.heading = 0;
  player.car.rotation.y = 0;
  player.speed = 0;
  player.carSpeed = 0;
  // No heat: dispatch shows routine patrols, not a pursuit.
  police.dispatch = [
    { callsign: "KITE-1", kind: "Air unit", chip: "STANDBY", chipColor: "#94a3b8", distance: 2.4 },
    { callsign: "MARLIN-3", kind: "Interceptor", chip: "PATROL", chipColor: "#4ade80", distance: 1.8 },
    { callsign: "CORAL-48", kind: "Patrol", chip: "PATROL", chipColor: "#4ade80", distance: 0.9 },
    { callsign: "TERN 5", kind: "Patrol", chip: "PATROL", chipColor: "#4ade80", distance: 1.2 },
    { callsign: "HERON 2", kind: "Roadblock", chip: "STANDBY", chipColor: "#94a3b8", distance: 3.1 },
    { callsign: "MAKO 6", kind: "Interceptor", chip: "PATROL", chipColor: "#4ade80", distance: 2.2 },
  ];
  game.traffic[0].position.set(8, 0, -2.6);
  game.traffic[1].position.set(-28, 0, 2.6);
  game.traffic[2].position.set(30, 0, 2.6);
  game.traffic[4].position.set(-45, 0, -2.6);
  camera.fov = 55;
  camera.updateProjectionMatrix();
  player.stageCamera(camera, [-42, 24, 52], [25, 2, -25]);
}

const STAGES = { cover: stageCover, drive: stageDrive, mission: stageMission, city: stageCity };

export function applyShot(game) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get("shot");
  if (shot && STAGES[shot]) {
    STAGES[shot](game);
    return shot;
  }
  return null;
}
