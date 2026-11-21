// Solmar City — street races: 5 checkpoint races from the Marina race hub.
// 3 AI rival cars, live standings, best-time records in localStorage.
// Press F at the hub to pick a race; finish first for the big payout.
import * as THREE from '../vendor/three.module.min.js';
import { createVehicle } from './vehicles.js';
import { clamp, dist2D } from './util.js';

export const HUB = { x: 160, z: -160, name: 'Marina Race Hub' };

export const RACES = [
  {
    id: 'beach-sprint', name: 'Beach Sprint', laps: 1, prize: 500,
    checkpoints: [[160, -80], [160, 0], [160, 80], [160, 160], [80, 160]],
    rivals: ['coupe', 'sedan', 'coupe'],
  },
  {
    id: 'downtown-loop', name: 'Downtown Loop', laps: 1, prize: 600,
    checkpoints: [[0, -160], [-80, -160], [-160, -80], [-160, 80], [-80, 160], [0, 160], [80, 80]],
    rivals: ['coupe', 'coupe', 'sedan'],
  },
  {
    id: 'harbour-dash', name: 'Harbour Dash', laps: 1, prize: 700,
    checkpoints: [[160, -80], [80, -80], [0, -80], [0, 0], [80, 0], [160, 0], [160, 80]],
    rivals: ['coupe', 'coupe', 'coupe'],
  },
  {
    id: 'old-town-climb', name: 'Old Town Climb', laps: 1, prize: 800,
    checkpoints: [[-160, -80], [-160, 0], [-80, 0], [-80, 80], [-160, 80], [-160, 160], [-80, 160]],
    rivals: ['coupe', 'sedan', 'truck'],
  },
  {
    id: 'sunset-grand', name: 'Sunset Grand Tour', laps: 1, prize: 1500,
    checkpoints: [[160, -80], [80, -160], [0, -160], [-160, -160], [-160, 160], [0, 160], [160, 160], [160, 80]],
    rivals: ['coupe', 'coupe', 'coupe'],
  },
];

const RIVAL_COLORS = [0x3b7ac2, 0x8e3bc2, 0xe8e8e8];
const RIVAL_NAMES = ['Vex', 'Mira', 'Juno'];

export function createRaces(scene) {
  const bestTimes = {};
  let race = null; // active race state
  let panel = null;
  let marker = null;
  let nearHub = false;

  // Hub marker: checkered ring at the start line.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3, 4.2, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(HUB.x, 0.08, HUB.z);
  scene.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 26, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.set(HUB.x, 13, HUB.z);
  scene.add(beam);

  function fmtTime(t) {
    const m = Math.floor(t / 60);
    const s = t - m * 60;
    return `${m}:${s.toFixed(1).padStart(4, '0')}`;
  }

  function openPanel(ctx) {
    closePanel();
    panel = document.createElement('div');
    panel.id = 'shop-panel';
    let html = `<div class="shop-title">${HUB.name.toUpperCase()}</div>`;
    html += `<div class="shop-desc">Nadia Ferro runs the street scene. Pick a race — first across the line takes the pot. Bring a car; yours will do.</div>`;
    for (const r of RACES) {
      const best = bestTimes[r.id];
      html += `<button class="shop-btn" data-race="${r.id}">${r.name} — ${r.checkpoints.length} checkpoints — $${r.prize}${best ? ` <b>Best ${fmtTime(best)}</b>` : ''}</button>`;
    }
    html += `<button class="shop-btn shop-close" data-race="close">Close (F)</button>`;
    panel.innerHTML = html;
    panel.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-race]');
      if (!btn) return;
      const id = btn.dataset.race;
      if (id === 'close') { closePanel(); return; }
      startRace(ctx, id);
    });
    document.body.appendChild(panel);
  }

  function closePanel() {
    if (panel) { panel.remove(); panel = null; }
  }

  function checkpointMarker() {
    if (marker) return marker;
    const g = new THREE.Group();
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.4, 30, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x7ee787, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
    );
    cyl.position.y = 15;
    const ground = new THREE.Mesh(
      new THREE.RingGeometry(2.8, 3.6, 24),
      new THREE.MeshBasicMaterial({ color: 0x7ee787, side: THREE.DoubleSide }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.1;
    g.add(cyl, ground);
    scene.add(g);
    marker = g;
    return g;
  }

  function startRace(ctx, id) {
    const def = RACES.find((r) => r.id === id);
    if (!def) return;
    closePanel();
    if (!ctx.player.vehicle) {
      ctx.showNotice('YOU NEED A CAR TO RACE');
      return;
    }
    // Line the rivals up beside the player.
    const rivals = def.rivals.map((type, i) => {
      const car = createVehicle(scene, {
        type, color: RIVAL_COLORS[i % RIVAL_COLORS.length],
        x: ctx.player.x + (i - 1) * 4, z: ctx.player.z - 6,
        heading: ctx.player.heading,
      });
      car._route = { alongX: true, center: 0, dir: 1, cruise: 0, parked: true };
      ctx.traffic.cars.push(car);
      return {
        car, name: RIVAL_NAMES[i % RIVAL_NAMES.length],
        cp: 0, stuckT: 0, skill: 0.82 + i * 0.05 + Math.random() * 0.06,
      };
    });
    race = {
      def, rivals, cp: 0, time: 0, finished: false,
      standings: [{ name: 'YOU', cp: 0, dist: 0 }],
    };
    const m = checkpointMarker();
    m.visible = true;
    const [cx, cz] = def.checkpoints[0];
    m.position.set(cx, 0, cz);
    ctx.showNotice(`${def.name.toUpperCase()} — GO!`);
  }

  function finishRace(ctx, position) {
    const def = race.def;
    const payout = position === 1 ? def.prize : position === 2 ? Math.round(def.prize * 0.4) : position === 3 ? Math.round(def.prize * 0.2) : 0;
    const t = race.time;
    if (!bestTimes[def.id] || t < bestTimes[def.id]) {
      bestTimes[def.id] = t;
      ctx.showNotice(`NEW BEST — ${fmtTime(t)}`);
    }
    if (payout > 0) {
      ctx.game.cash += payout;
      ctx.economy.addRespect(ctx, position === 1 ? 12 : 5);
    }
    ctx.showNotice(position === 1 ? `YOU WON — $${payout}` : `P${position} — $${payout}`);
    cleanupRace(ctx);
    ctx.saveGame?.(ctx);
  }

  function cleanupRace(ctx) {
    if (!race) return;
    for (const r of race.rivals) {
      const i = ctx.traffic.cars.indexOf(r.car);
      if (i >= 0) ctx.traffic.cars.splice(i, 1);
      r.car.dispose();
    }
    if (marker) marker.visible = false;
    race = null;
  }

  function driveRival(r, dt, ctx) {
    const car = r.car;
    if (car.wrecked) return;
    const cps = race.def.checkpoints;
    if (r.cp >= cps.length) { car.drive(dt, { throttle: 0, steer: 0 }, ctx.world); return; }
    const [tx, tz] = cps[r.cp];
    const d = dist2D(car.x, car.z, tx, tz);
    if (d < 10) { r.cp++; return; }
    const wantHeading = Math.atan2(tx - car.x, tz - car.z);
    let dh = wantHeading - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    const steer = clamp(dh * 2.2, -1, 1);
    // Rivals cruise a touch under top speed so a good driver can win.
    const target = car.topSpeed * r.skill;
    const throttle = car.speed < target ? 1 : 0;
    car.setSteerVisual(steer);
    car.drive(dt, { throttle, steer, handbrake: false }, ctx.world);
    car.update(dt, ctx.world);
    if (Math.abs(car.speed) < 0.5 && throttle > 0) {
      r.stuckT += dt;
      if (r.stuckT > 3) {
        // Stuck on a wall: drop back to the last checkpoint.
        const [lx, lz] = cps[Math.max(0, r.cp - 1)];
        car.mesh.position.set(lx, 0, lz);
        car.speed = 0;
        r.stuckT = 0;
      }
    } else r.stuckT = 0;
  }

  function standings(ctx) {
    const cps = race.def.checkpoints;
    const entries = [{ name: 'YOU', cp: race.cp, dist: race.cp < cps.length ? dist2D(ctx.player.x, ctx.player.z, cps[race.cp][0], cps[race.cp][1]) : 0, finished: race.cp >= cps.length }];
    for (const r of race.rivals) {
      entries.push({
        name: r.name, cp: r.cp,
        dist: r.cp < cps.length ? dist2D(r.car.x, r.car.z, cps[r.cp][0], cps[r.cp][1]) : 0,
        finished: r.cp >= cps.length,
      });
    }
    entries.sort((a, b) => (b.cp - a.cp) || (a.dist - b.dist));
    return entries;
  }

  function update(dt, ctx) {
    nearHub = dist2D(ctx.player.x, ctx.player.z, HUB.x, HUB.z) < 12;
    if (ctx.input.wasPressed('KeyF') && nearHub && !race && !ctx.economy?.panelOpen) {
      if (panel) closePanel();
      else openPanel(ctx);
    }
    if (!race) return;
    race.time += dt;
    // Player checkpoint.
    const cps = race.def.checkpoints;
    if (race.cp < cps.length) {
      const [cx, cz] = cps[race.cp];
      if (dist2D(ctx.player.x, ctx.player.z, cx, cz) < 10) {
        race.cp++;
        if (race.cp < cps.length) {
          const [nx, nz] = cps[race.cp];
          marker.position.set(nx, 0, nz);
          ctx.showNotice(`CHECKPOINT ${race.cp}/${cps.length}`);
        }
      }
    }
    for (const r of race.rivals) driveRival(r, dt, ctx);
    const order = standings(ctx);
    race.standings = order;
    const myPos = order.findIndex((e) => e.name === 'YOU') + 1;
    race.position = myPos;
    // Finish: player crosses the last checkpoint, or all rivals finish first.
    if (race.cp >= cps.length) {
      finishRace(ctx, myPos);
      return;
    }
    if (race.rivals.every((r) => r.cp >= cps.length)) {
      finishRace(ctx, 4);
    }
  }

  return {
    HUB, RACES,
    get active() { return race; },
    get nearHub() { return nearHub; },
    get panelOpen() { return !!panel; },
    bestTimes,
    fmtTime,
    startRace, update, closePanel,
    checkpointPos() {
      if (!race || race.cp >= race.def.checkpoints.length) return null;
      const [x, z] = race.def.checkpoints[race.cp];
      return { x, z };
    },
    bestTimesState() { return { ...bestTimes }; },
    applyBestTimesState(s) { Object.assign(bestTimes, s); },
  };
}
