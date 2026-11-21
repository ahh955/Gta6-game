// Solmar City 3D — boot and game loop: builds the world, wires input,
// runs the loop, and hands staged shots to staging.js.
//
// Controls: WASD drive/walk · Space handbrake · E enter/exit car · F steal
// car · R radio · Q weapon wheel · C cover · 1-5 weapons · 6-8 crew · M map
// · Tab missions · P pause · Enter start.

import * as THREE from "three";
import { buildCity } from "./city.js";
import { spawnTraffic, spawnPeds, updateTraffic, updatePeds, flashLights, spinRotors, aimSpotlight } from "./vehicles.js";
import { Player, nearestCar } from "./player.js";
import { Police } from "./police.js";
import { MissionManager } from "./missions.js";
import { Combat } from "./combat.js";
import { Crew } from "./crew.js";
import { updateHUD, showDialogue, showToast } from "./hud.js";
import { Radio } from "./audio.js";
import { loadSave, writeSave } from "./save.js";
import { applyShot } from "./staging.js";

// Surface any load error on the page itself, so a headless check can see it.
window.addEventListener("error", (e) => {
  const box = document.getElementById("err");
  if (box) {
    box.classList.remove("hidden");
    box.textContent += `ERROR: ${e.message}\n`;
  }
});

const save = loadSave();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.getElementById("game-canvas").appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 600);
camera.position.set(-12, 4, 12);

const { city: cityGroup, wheel: ferrisWheel, wheelSpin: ferrisSpin } = buildCity(scene);
const traffic = spawnTraffic(scene, 12);
const peds = spawnPeds(scene, 18);
const player = new Player(scene);
const police = new Police(scene);
const missions = new MissionManager();
const combat = new Combat(scene);
const crew = new Crew();
const radio = new Radio();

const game = {
  scene,
  camera,
  renderer,
  cityGroup,
  ferrisWheel,
  traffic,
  peds,
  player,
  police,
  missions,
  combat,
  crew,
  radio,
  frozen: false,
  started: false,
  paused: false,
  state: {
    cash: save.cash,
    rp: save.rp,
  },
};

// Restore the saved mission.
missions.setMission(save.missionIndex, save.stageIndex);
missions.completedCount = save.completedMissions;

const input = {
  forward: false,
  back: false,
  left: false,
  right: false,
  handbrake: false,
};

function saveProgress() {
  const ok = writeSave({
    cash: game.state.cash,
    rp: game.state.rp,
    missionIndex: missions.currentIndex,
    stageIndex: missions.stageIndex,
    completedMissions: missions.completedCount,
    garage: save.garage,
    districtStanding: save.districtStanding,
    racesWon: save.racesWon,
  });
  if (ok) showToast("Progress saved — Solmar remembers.");
}

function startGame() {
  if (game.started) return;
  game.started = true;
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("hud").classList.remove("hidden");
  radio.start();
  showDialogue(
    "Juno Reyes",
    "Driver — Crew",
    "#f472b6",
    "JR",
    "Vex — the Coral Crown vault is ours tonight. Get to the casino, and mind the PD.",
  );
  showToast("MISSION 6 — VAULT RUN · Stage 3/4");
}

function toggleOverlay(id) {
  const el = document.getElementById(id);
  el.classList.toggle("hidden");
  game.paused = !document.getElementById("pause-menu").classList.contains("hidden") ||
    !document.getElementById("missions-menu").classList.contains("hidden") ||
    !document.getElementById("map-menu").classList.contains("hidden");
}

function useCrewAbility(index) {
  const member = crew.members[index];
  if (!member) return;
  const used = crew.useAbility(member.id);
  if (!used) {
    showToast(`${member.name} — ${member.ability} recharging (${Math.ceil(member.readyIn)}s)`);
    return;
  }
  if (member.id === "juno") {
    player.carSpeed = Math.min(player.carSpeed * 1.6, 62);
    showToast("SLIPSTREAM — Juno pushes the Vortex GT to the limit!");
  } else if (member.id === "marco") {
    player.carCondition = Math.min(100, player.carCondition + 50);
    showToast("FIELD REPAIR — Marco patches the car back up.");
  } else if (member.id === "tess") {
    police.setWanted(police.stars - 1);
    showToast("GHOST ROUTE — Tess loses a star of heat.");
  }
}

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === "enter" && !game.started) {
    startGame();
    return;
  }
  if (!game.started) return;
  if (k === "w" || k === "arrowup") input.forward = true;
  if (k === "s" || k === "arrowdown") input.back = true;
  if (k === "a" || k === "arrowleft") input.left = true;
  if (k === "d" || k === "arrowright") input.right = true;
  if (k === " ") input.handbrake = true;
  if (k === "e") {
    if (player.onFoot) {
      const car = nearestCar([player.car, ...traffic], player.position);
      if (car) {
        player.enterCar(car);
        showToast(car === player.car ? "Back in the Vortex GT." : "Car stolen — the PD noticed.");
        if (car !== player.car) police.addHeat(1);
      }
    } else {
      player.exitCar();
    }
  }
  if (k === "f" && player.onFoot) {
    const car = nearestCar(traffic, player.position, 8);
    if (car) {
      player.enterCar(car);
      police.addHeat(1);
      showToast("Carjacked! Wanted level up.");
    }
  }
  if (k === "r") {
    radio.nextStation();
    showToast(`Radio: ${radio.station.name}`);
  }
  if (k === "q") {
    combat.cycleWeapon(1);
    showToast(`Weapon: ${combat.currentWeapon.name}`);
  }
  if (k === "c") {
    combat.inCover = !combat.inCover;
    showToast(combat.inCover ? "In cover — damage halved." : "Out of cover.");
  }
  if (k >= "1" && k <= "5") combat.selectWeapon(Number(k) - 1);
  if (k === "6") useCrewAbility(0);
  if (k === "7") useCrewAbility(1);
  if (k === "8") useCrewAbility(2);
  if (k === "m") toggleOverlay("map-menu");
  if (k === "tab") {
    e.preventDefault();
    toggleOverlay("missions-menu");
  }
  if (k === "p") toggleOverlay("pause-menu");
  if (k === "g" && game.started) saveProgress();
  if (k === "n") {
    // Advance the mission (debug / demo shortcut).
    const res = missions.advanceStage();
    if (res.done) {
      game.state.cash += res.payout || 0;
      game.state.rp += 800;
      radio.sfx("cash");
      showToast(`Stage complete — $${(res.payout || 0).toLocaleString()} banked.`);
      saveProgress();
    } else {
      showToast(`Next stage: ${missions.stage}`);
    }
  }
});

window.addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  if (k === "w" || k === "arrowup") input.forward = false;
  if (k === "s" || k === "arrowdown") input.back = false;
  if (k === "a" || k === "arrowleft") input.left = false;
  if (k === "d" || k === "arrowright") input.right = false;
  if (k === " ") input.handbrake = false;
});

// Mouse: click to shoot, drag to orbit the camera on foot.
let dragging = false;
let lastX = 0;
let lastY = 0;
renderer.domElement.addEventListener("mousedown", (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  if (!game.started) {
    startGame();
    return;
  }
  radio.start();
  if (player.onFoot) {
    const from = player.position.clone();
    from.y = 1.5;
    const dir = new THREE.Vector3(Math.cos(player.heading), 0, -Math.sin(player.heading));
    if (combat.fire(from, dir)) {
      radio.sfx("shot");
      police.addHeat(0);
      police.resetSearchTimer();
    }
  }
});
window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  player.cameraYaw -= dx * 0.005;
  player.cameraPitch = THREE.MathUtils.clamp(player.cameraPitch + dy * 0.003, 0.05, 1.1);
});
window.addEventListener("mouseup", () => {
  dragging = false;
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// A staged shot (?shot=...) sets up its scene before the first frame.
const shot = applyShot(game);
if (shot) game.started = true;

const clock = new THREE.Clock();
let hudTick = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  // The Ferris wheel always turns, slowly.
  ferrisSpin.rotation.z += dt * 0.12;

  if (game.frozen) {
    // Staged shot: rotors spin, light bars flash, the spotlight holds —
    // but nothing drives, so the composition stays exactly as staged.
    for (const c of police.cruisers) flashLights(c, time);
    for (const b of police.roadblocks) {
      b.traverse((o) => {
        if (o.userData && o.userData.lightRed) flashLights(o, time);
      });
    }
    if (police.heli) {
      spinRotors(police.heli, dt);
      aimSpotlight(scene, police.heli, player.position);
    }
  } else if (game.started && !game.paused) {
    if (player.onFoot) player.updateOnFoot(dt, input);
    else player.updateDriving(dt, input);
    player.updateCamera(camera, dt);
    police.update(dt, time, player.position, player.heading);
    missions.update(dt);
    crew.update(dt);
    combat.updateGang(dt, player.position, time);
    combat.update(time);
    updateTraffic(traffic, dt);
    updatePeds(peds, dt, time, player.position);
    radio.update();
    if (police.stars >= 1 && Math.random() < dt * 0.2) radio.sfx("siren");
  }

  // HUD refreshes 5 times a second (the minimap redraws each tick).
  hudTick += dt;
  if (hudTick > 0.2) {
    hudTick = 0;
    if (game.started) updateHUD(game);
  }

  renderer.render(scene, camera);
}

updateHUD(game);
animate();
