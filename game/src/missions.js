// Solmar City — story missions: 8 linked jobs with staged objectives,
// dialogue, timers, a 3D objective beacon and cash + respect rewards.
// All characters, names and story are original. Press J to open the job
// list; window.__solmar.startMission(id) starts one directly.
// Missions own game.mission; the HUD tracker reads getHUD().
import * as THREE from '../vendor/three.module.min.js';
import { createVehicle } from './vehicles.js';
import { dist2D } from './util.js';

const MARA = { speaker: 'MARA SOLIS', initials: 'MS', color: '#d6457a' };
const DECK = { speaker: 'DECK WARD', initials: 'DW', color: '#e8a33b' };
const LENA = { speaker: 'LENA CRUZ', initials: 'LC', color: '#4da6ff' };
const TAVO = { speaker: 'BIG TAVO', initials: 'BT', color: '#7ad645' };
const NADIA = { speaker: 'NADIA FERRO', initials: 'NF', color: '#8e7ad6' };
const KANE = { speaker: 'SILAS KANE', initials: 'SK', color: '#ff4d4d' };
const RICO = { speaker: 'RICO VEGA', initials: 'RV', color: '#2e8b8b' };

function line(who, text) { return { ...who, text }; }

export const MISSIONS = [
  {
    id: 'first-gear', name: 'First Gear', giver: 'Mara Solis',
    desc: 'A simple delivery. Do not make it complicated.',
    reward: { cash: 400, respect: 15 },
    intro: [
      line(MARA, 'Rico. One package, Marina Bay to Coral Beach. Drive like the car is borrowed — because it is.'),
      line(RICO, 'Borrowed from who?'),
      line(MARA, 'From someone who will not miss it until tomorrow. Go.'),
    ],
    stages: [
      { type: 'goto', x: 0, z: -80, label: 'Pick up the package — Marina Bay' },
      { type: 'goto', x: 160, z: 160, label: 'Deliver the package — Coral Beach', time: 240 },
    ],
  },
  {
    id: 'hot-wheels', name: 'Hot Wheels', giver: 'Mara Solis',
    desc: 'Lift a Viento coupe from Marina Bay and bring it home.',
    reward: { cash: 700, respect: 20 }, recruit: 'deck',
    intro: [
      line(MARA, 'There is a gold Viento coupe parked in Marina Bay. The owner collects parking tickets, not cars. Take it.'),
      line(DECK, 'Gold coupe, huh? I know that car. Fast. Bring it to the garage and I will owe you one.'),
    ],
    stages: [
      { type: 'goto', x: 160, z: -80, label: 'Find the gold coupe — Marina Bay', onStart(ctx, m) { spawnTargetCar(ctx, m, 'coupe', 0xe8a33b, 160, -80); } },
      { type: 'enter', label: 'Steal the coupe', onStart(ctx) { ctx.showNotice('GET IN THE GOLD COUPE'); } },
      { type: 'goto', x: -80, z: 24, label: 'Deliver it to Rico\'s Garage', time: 200, needCar: true },
    ],
  },
  {
    id: 'heat-wave', name: 'Heat Wave', giver: 'Lena Cruz',
    desc: 'Three stars and nowhere to hide. Survive, then vanish.',
    reward: { cash: 500, respect: 20 }, recruit: 'lena',
    intro: [
      line(LENA, 'I borrowed a police radio to test something. It worked. They are coming for the signal — which is you. Sorry.'),
      line(RICO, 'Sorry? Lena!'),
      line(LENA, 'Survive a minute, then break line of sight and I will ghost your plate. Probably.'),
    ],
    stages: [
      { type: 'survive', seconds: 60, label: 'Stay ahead of the PD — 60s', onStart(ctx) { ctx.police.setWanted(3); } },
      { type: 'lose', label: 'Lose the cops — break line of sight' },
    ],
  },
  {
    id: 'dockside', name: 'Dockside Deal', giver: 'Mara Solis',
    desc: 'The Harbour Kings want the docks. Tell them no.',
    reward: { cash: 800, respect: 30 }, recruit: 'tavo',
    intro: [
      line(MARA, 'Silas Kane sent his crew to lean on the Old Town docks. Go lean back. Harder.'),
      line(TAVO, 'I am coming with you, Rico. Somebody has to carry the big bag.'),
    ],
    stages: [
      { type: 'goto', x: -160, z: 80, label: 'Reach the Old Town docks' },
      {
        type: 'kill', label: 'Take down Kane\'s crew (4)',
        onStart(ctx) {
          ctx.combat.spawnEnemies([
            { x: -160, z: 72 }, { x: -152, z: 88 }, { x: -168, z: 92 }, { x: -156, z: 64 },
          ]);
          ctx.showNotice('THE KINGS ARE HERE');
        },
      },
      { type: 'goto', x: -160, z: 160, label: 'Grab the payment and go' },
    ],
  },
  {
    id: 'sunset-sprint', name: 'Sunset Sprint', giver: 'Nadia Ferro',
    desc: 'Nadia\'s time trial across the beach boulevard.',
    reward: { cash: 600, respect: 20 },
    intro: [
      line(NADIA, 'You want a seat at the Marina races? Prove it. Four checkpoints, one sunset, no excuses.'),
      line(RICO, 'Four checkpoints. Watch me.'),
    ],
    stages: [
      { type: 'goto', x: 160, z: -80, label: 'Checkpoint 1 — Marina Bay', time: 240 },
      { type: 'goto', x: 160, z: 80, label: 'Checkpoint 2 — Beach Boulevard' },
      { type: 'goto', x: 80, z: 160, label: 'Checkpoint 3 — Coral Beach' },
      { type: 'goto', x: -80, z: 160, label: 'Checkpoint 4 — Old Town finish' },
    ],
  },
  {
    id: 'harbor-run', name: 'Harbour Run', giver: 'Mara Solis',
    desc: 'Hot cargo, cold cops, one long drive across the city.',
    reward: { cash: 900, respect: 30 },
    intro: [
      line(MARA, 'Cargo is waiting at the Marina hub. The PD knows the route, so take the long way and do not stop for red lights.'),
      line(RICO, 'There are no red lights in this city, Mara.'),
      line(MARA, 'Then you have no excuses.'),
    ],
    stages: [
      { type: 'goto', x: 160, z: -160, label: 'Pick up the harbour cargo', onStart(ctx) { ctx.police.setWanted(2); } },
      { type: 'goto', x: -160, z: 160, label: 'Run it to Old Town', time: 220 },
      { type: 'lose', label: 'Lose the tail' },
    ],
  },
  {
    id: 'inside-job', name: 'The Inside Job', giver: 'Lena Cruz',
    desc: 'Steal a truck, clear the warehouse, keep the wheels.',
    reward: { cash: 1200, respect: 40 },
    intro: [
      line(LENA, 'A cargo truck full of "lost" electronics is parked uptown. The warehouse guards work for Kane. You see where this goes.'),
      line(RICO, 'I take the truck, you open the gate, Tavo holds the door.'),
      line(LENA, 'Exactly. Try not to scratch the truck. It is the payment.'),
    ],
    stages: [
      { type: 'goto', x: 80, z: -160, label: 'Find the cargo truck', onStart(ctx, m) { spawnTargetCar(ctx, m, 'truck', 0xe8e8e8, 80, -160); } },
      { type: 'enter', label: 'Steal the truck' },
      { type: 'goto', x: -80, z: -80, label: 'Drive it to the warehouse', needCar: true, time: 200 },
      {
        type: 'kill', label: 'Clear the warehouse guards (3)',
        onStart(ctx) {
          ctx.combat.spawnEnemies([
            { x: -80, z: -72 }, { x: -72, z: -88 }, { x: -88, z: -88 },
          ]);
        },
      },
      { type: 'goto', x: -80, z: 24, label: 'Drop the truck at the garage' },
    ],
  },
  {
    id: 'last-tide', name: 'The Last Tide', giver: 'Mara Solis',
    desc: 'The finale: break the Kings, take the harbour score, go home.',
    reward: { cash: 2500, respect: 80 },
    intro: [
      line(MARA, 'This is it, Rico. Kane is moving the whole harbour score tonight. We take it, we take the city.'),
      line(KANE, 'Vega! You walk into my harbour, you swim out. Boys — hold the line!'),
      line(DECK, 'Crew is with you. Lena on the net, Tavo on the door, me on the wheel. Let us finish this.'),
    ],
    stages: [
      { type: 'goto', x: 0, z: 160, label: 'Rally the crew — Coral Beach' },
      {
        type: 'kill', label: 'Break the Kings\' harbour crew (5)',
        onStart(ctx) {
          ctx.combat.spawnEnemies([
            { x: 152, z: 152 }, { x: 168, z: 144 }, { x: 144, z: 168 },
            { x: 168, z: 168 }, { x: 160, z: 136 },
          ]);
        },
      },
      { type: 'goto', x: 160, z: -160, label: 'Take the harbour score' },
      { type: 'lose', label: 'Lose the 4-star heat', onStart(ctx) { ctx.police.setWanted(4); } },
      { type: 'goto', x: -160, z: 160, label: 'Bring it home — Safehouse' },
    ],
  },
];

function spawnTargetCar(ctx, m, type, color, x, z) {
  const car = createVehicle(ctx.render.scene, { type, color, x, z, heading: 0 });
  car._route = { alongX: true, center: 0, dir: 1, cruise: 0, parked: true };
  ctx.traffic.cars.push(car);
  m.targetCar = car;
}

export function createMissions(scene) {
  let current = null;
  let completed = [];
  let panel = null;
  let lastId = null;

  // Objective beacon: amber beam + ground ring, repositioned per stage.
  const beacon = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 34, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 17;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3.2, 24),
    new THREE.MeshBasicMaterial({ color: 0xffb347, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.1;
  beacon.add(beam, ring);
  beacon.visible = false;
  scene.add(beacon);

  function stageTarget(stage) {
    if (!stage) return null;
    if (stage.type === 'goto') return { x: stage.x, z: stage.z };
    if (stage.type === 'enter' && current?.targetCar) return { x: current.targetCar.x, z: current.targetCar.z };
    return null;
  }

  function beginStage(ctx, idx) {
    const stage = current.def.stages[idx];
    current.stageIdx = idx;
    current.timer = stage.time || stage.seconds || null;
    current.stageT = 0;
    stage.onStart?.(ctx, current);
    const t = stageTarget(stage);
    if (t) {
      beacon.position.set(t.x, 0, t.z);
      beacon.visible = true;
    } else {
      beacon.visible = false;
    }
    if (stage.dialogue) ctx.hud.showDialogue(stage.dialogue);
  }

  function startMission(ctx, id) {
    const def = MISSIONS.find((m) => m.id === id);
    if (!def) return false;
    if (current) {
      ctx.showNotice('FINISH THE CURRENT JOB FIRST');
      return false;
    }
    closePanel();
    ctx.combat.clearEnemies();
    current = { def, stageIdx: 0, timer: null, stageT: 0, targetCar: null };
    ctx.game.mission = current;
    lastId = id;
    ctx.showNotice(def.name.toUpperCase());
    if (def.intro) ctx.hud.showDialogue(def.intro);
    beginStage(ctx, 0);
    return true;
  }

  function failMission(ctx, reason) {
    if (!current) return;
    ctx.showNotice(`MISSION FAILED — ${reason}`);
    ctx.combat.clearEnemies();
    beacon.visible = false;
    current = null;
    ctx.game.mission = null;
  }

  function completeMission(ctx) {
    const def = current.def;
    ctx.game.cash += def.reward.cash;
    ctx.economy.addRespect(ctx, def.reward.respect);
    ctx.economy.addStanding(ctx.economy.districtStandingAt(ctx.player.x, ctx.player.z).district, 12);
    if (def.recruit) {
      ctx.crew.recruit(def.recruit);
      const member = ctx.crew.CREW.find((c) => c.id === def.recruit);
      ctx.showNotice(`${member.name.toUpperCase()} JOINED YOUR CREW`);
    }
    if (!completed.includes(def.id)) completed.push(def.id);
    ctx.showNotice(`JOB DONE — +$${def.reward.cash}  +${def.reward.respect} RESPECT`);
    beacon.visible = false;
    current = null;
    ctx.game.mission = null;
    ctx.saveGame?.(ctx);
  }

  function restartMission(ctx) {
    if (current) {
      const id = current.def.id;
      ctx.combat.clearEnemies();
      beacon.visible = false;
      current = null;
      ctx.game.mission = null;
      startMission(ctx, id);
      return;
    }
    if (lastId) startMission(ctx, lastId);
  }

  function update(dt, ctx) {
    if (!current) return;
    const stage = current.def.stages[current.stageIdx];
    current.stageT += dt;
    // Beacon pulse + follow a moving target car.
    const t = stageTarget(stage);
    if (t && stage.type === 'enter') beacon.position.set(t.x, 0, t.z);
    const pulse = 1 + Math.sin(ctx.game.time * 3) * 0.08;
    beacon.scale.set(pulse, 1, pulse);
    // Timers.
    if (current.timer !== null) {
      current.timer -= dt;
      if (current.timer <= 0) { failMission(ctx, 'OUT OF TIME'); return; }
    }
    // Target car wrecked = fail.
    if (current.targetCar?.wrecked) { failMission(ctx, 'TARGET CAR DESTROYED'); return; }

    let done = false;
    if (stage.type === 'goto') {
      const radius = stage.needCar ? 12 : 9;
      if (dist2D(ctx.player.x, ctx.player.z, stage.x, stage.z) < radius) {
        if (!stage.needCar || ctx.player.vehicle) done = true;
        else if (current.stageT > 2) ctx.showNotice('BRING THE CAR');
      }
    } else if (stage.type === 'enter') {
      if (ctx.player.vehicle && (!current.targetCar || ctx.player.vehicle === current.targetCar)) {
        done = true;
        ctx.police.addHeat(1);
      }
    } else if (stage.type === 'survive') {
      if (current.stageT >= stage.seconds) done = true;
    } else if (stage.type === 'lose') {
      if (ctx.police.wanted === 0) done = true;
    } else if (stage.type === 'kill') {
      current._kills = ctx.combat.enemiesAlive();
      if (ctx.combat.enemiesAlive() === 0) done = true;
    }
    if (!done) return;
    const next = current.stageIdx + 1;
    if (next >= current.def.stages.length) completeMission(ctx);
    else beginStage(ctx, next);
  }

  // ---- job list panel (J) ----
  function openPanel(ctx) {
    closePanel();
    panel = document.createElement('div');
    panel.id = 'shop-panel';
    let html = `<div class="shop-title">JOBS — MARA'S BOARD</div>`;
    html += `<div class="shop-desc">Pick a job. Finish it for cash and respect. Your crew grows as you do.</div>`;
    for (const m of MISSIONS) {
      const done = completed.includes(m.id);
      const active = current?.def.id === m.id;
      html += `<button class="shop-btn" data-mission="${m.id}" ${active ? 'disabled' : ''}>${done ? '✓ ' : ''}${m.name} — ${m.desc} <b>+$${m.reward.cash} · +${m.reward.respect} rep</b></button>`;
    }
    html += `<button class="shop-btn shop-close" data-mission="close">Close (J)</button>`;
    panel.innerHTML = html;
    panel.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-mission]');
      if (!btn) return;
      const id = btn.dataset.mission;
      if (id === 'close') { closePanel(); return; }
      startMission(ctx, id);
    });
    document.body.appendChild(panel);
  }

  function closePanel() {
    if (panel) { panel.remove(); panel = null; }
  }

  function handleKeys(ctx) {
    if (ctx.input.wasPressed('KeyJ')) {
      if (panel) closePanel();
      else openPanel(ctx);
    }
  }

  function getHUD() {
    if (!current) return null;
    const stage = current.def.stages[current.stageIdx];
    let timerText = '';
    if (current.timer !== null) {
      const t = Math.max(0, current.timer);
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      timerText = `⏱ ${m}:${String(s).padStart(2, '0')}`;
    } else if (stage.type === 'survive') {
      const left = Math.max(0, stage.seconds - current.stageT);
      timerText = `⏱ ${Math.ceil(left)}s`;
    } else if (stage.type === 'kill') {
      timerText = `☠ ${current._kills ?? ''} LEFT`;
    }
    return {
      title: current.def.name,
      stageText: `Stage ${current.stageIdx + 1}/${current.def.stages.length} — ${stage.label}`,
      timerText,
      objectives: current.def.stages.map((s, i) => ({
        text: s.label,
        done: i < current.stageIdx,
        active: i === current.stageIdx,
      })),
    };
  }

  return {
    MISSIONS,
    get current() { return current; },
    get completed() { return completed; },
    set completed(v) { completed = v; },
    get panelOpen() { return !!panel; },
    startMission, restartMission, failMission, update, handleKeys,
    openPanel, closePanel, getHUD,
    markerPos() {
      if (!current) return null;
      return stageTarget(current.def.stages[current.stageIdx]);
    },
  };
}
