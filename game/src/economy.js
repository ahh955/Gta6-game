// Solmar City — economy: respect ranks, 6-district standing, garage
// upgrades, shops (weapons / ammo / armour / diner) and the safehouse.
// Owns game.cash / game.respect / game.rank alongside missions.js.
// Shops open with F near a marked location; a small DOM panel lists items.
import * as THREE from '../vendor/three.module.min.js';
import { districtAt } from './config.js';
import { clamp, dist2D } from './util.js';

export const RANKS = [
  { name: 'NOBODY', min: 0 },
  { name: 'HUSTLER', min: 25 },
  { name: 'WHEELMAN', min: 60 },
  { name: 'DEALER', min: 110 },
  { name: 'ENFORCER', min: 180 },
  { name: 'SHOT-CALLER', min: 280 },
  { name: 'KINGPIN', min: 420 },
];

export function rankFor(respect) {
  let rank = RANKS[0].name;
  for (const r of RANKS) if (respect >= r.min) rank = r.name;
  return rank;
}

// Six districts: the four config districts plus the harbour strip (east)
// and the hill quarter (far north-west), which the standing system tracks.
export const DISTRICT6 = [
  'Downtown Solmar', 'Marina Bay', 'Coral Beach', 'Old Town',
  'Harbour Point', 'Palm Heights',
];

export function district6At(x, z) {
  if (x >= 200) return 'Harbour Point';
  if (x < -120 && z < -120) return 'Palm Heights';
  return districtAt(x, z);
}

const GARAGE_ITEMS = [
  { id: 'engine', name: 'Engine tune', desc: '+4 top speed / level', max: 3, cost: [600, 1200, 1800] },
  { id: 'armor', name: 'Armour plating', desc: '-20% damage taken / level', max: 3, cost: [500, 1000, 1500] },
  { id: 'tires', name: 'Grip tyres', desc: '+acceleration / level', max: 2, cost: [400, 800] },
  { id: 'repaint', name: 'Fresh repaint', desc: 'Sunset-gold respray', max: 1, cost: [250] },
  { id: 'repair', name: 'Full repair', desc: 'Restore car to 100%', max: 99, cost: [150] },
];

const GUN_ITEMS = [
  { id: 'smg', name: 'SMG', desc: 'Fast full-auto, 30-round mag', cost: 800, weapon: 2 },
  { id: 'shotgun', name: 'Shotgun', desc: 'Huge close-range damage', cost: 1200, weapon: 3 },
  { id: 'rifle', name: 'Rifle', desc: 'Long range, heavy rounds', cost: 2000, weapon: 4 },
  { id: 'ammo', name: 'Ammo box', desc: '+60 rounds, current weapon', cost: 120, ammo: true },
  { id: 'vest', name: 'Kevlar vest', desc: '+50 armour (absorbs bullets)', cost: 350, vest: true },
];

// Shop / garage / safehouse spots: all on roads so nothing sits in a wall.
const LOCATIONS = [
  { kind: 'garage', name: "Rico's Garage", x: -80, z: 24, color: 0xffb347 },
  { kind: 'guns', name: 'Solmar Arms', x: 80, z: -24, color: 0xff4d4d },
  { kind: 'diner', name: 'Sunset Diner', x: 0, z: 168, color: 0x7ee787 },
  { kind: 'safehouse', name: 'Safehouse', x: -160, z: 160, color: 0x4da6ff },
];

export function createEconomy(scene) {
  const standing = {};
  for (const d of DISTRICT6) standing[d] = 10;
  const garage = { engine: 0, armor: 0, tires: 0, repaint: 0 };
  let panel = null; // open shop panel element
  let panelKind = null;
  let nearLoc = null;

  // 3D markers: a coloured beacon ring + pole at each location.
  for (const loc of LOCATIONS) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 3, 24),
      new THREE.MeshBasicMaterial({ color: loc.color, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(loc.x, 0.08, loc.z);
    scene.add(ring);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 26, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: loc.color, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
    );
    beam.position.set(loc.x, 13, loc.z);
    scene.add(beam);
  }

  function addRespect(ctx, n) {
    const before = ctx.game.rank;
    ctx.game.respect = Math.max(0, ctx.game.respect + n);
    ctx.game.rank = rankFor(ctx.game.respect);
    if (ctx.game.rank !== before) {
      ctx.showNotice(`RANK UP — ${ctx.game.rank}`);
    }
  }

  function addStanding(district, n) {
    if (district in standing) standing[district] = clamp(standing[district] + n, 0, 100);
  }

  function spend(ctx, amount) {
    if (ctx.game.cash < amount) { ctx.showNotice('NOT ENOUGH CASH'); return false; }
    ctx.game.cash -= amount;
    return true;
  }

  // Apply owned garage levels to a car the player just entered.
  function applyToVehicle(v) {
    if (!v || v._garageApplied) return;
    v._garageApplied = true;
    v._baseTopSpeed = v.topSpeed;
    v._baseAccel = v.accel;
    v._origColor = v.mesh.userData.bodyMat.color.getHex();
    v.topSpeed = v._baseTopSpeed + garage.engine * 4;
    v.accel = v._baseAccel + garage.tires * 1.6;
    if (garage.repaint) v.mesh.userData.bodyMat.color.setHex(0xe8a33b);
    if (garage.armor > 0) {
      const origDamage = v.damage.bind(v);
      v.damage = (n) => origDamage(n * (1 - 0.2 * garage.armor));
    }
  }

  function repairVehicle(ctx) {
    const v = ctx.player.vehicle;
    if (!v) { ctx.showNotice('NO CAR HERE'); return; }
    if (v.wrecked) {
      v.wrecked = false;
      v.burning = false;
      v.speed = 0;
      if (v._fire) { v.mesh.parent?.remove(v._fire); v._fire = null; }
      if (v._fireLight) { v.mesh.parent?.remove(v._fireLight); v._fireLight = null; }
      v.mesh.rotation.set(0, v.heading, 0);
      v.mesh.userData.bodyMat.color.setHex(v._origColor ?? 0xc23b3b);
    }
    v.health = 100;
    ctx.showNotice('CAR REPAIRED');
  }

  // ---- shop panel (DOM) ----
  function closePanel() {
    if (panel) { panel.remove(); panel = null; panelKind = null; }
  }

  function openPanel(ctx, loc) {
    closePanel();
    panelKind = loc.kind;
    panel = document.createElement('div');
    panel.id = 'shop-panel';
    const items = loc.kind === 'garage' ? GARAGE_ITEMS : loc.kind === 'guns' ? GUN_ITEMS : null;
    let html = `<div class="shop-title">${loc.name.toUpperCase()}</div>`;
    html += `<div class="shop-cash">Cash $${ctx.game.cash.toLocaleString('en-US')}</div>`;
    if (loc.kind === 'diner') {
      html += `<div class="shop-desc">Hot food, cold drinks, zero questions. A full meal restores your health.</div>`;
      html += `<button class="shop-btn" data-buy="meal">Full meal — $25 (heal to 100)</button>`;
    } else if (loc.kind === 'safehouse') {
      html += `<div class="shop-desc">Your place. Sleep to save the game, heal up and let the heat die down.</div>`;
      html += `<button class="shop-btn" data-buy="sleep">Sleep — save + heal + clear wanted</button>`;
    } else {
      for (const it of items) {
        const lvl = it.id in garage ? garage[it.id] : 0;
        const maxed = it.max && lvl >= it.max && it.id !== 'repair';
        const cost = Array.isArray(it.cost) ? (it.id === 'repair' ? it.cost[0] : it.cost[lvl] ?? it.cost[it.cost.length - 1]) : it.cost;
        const owned = it.weapon !== undefined && ctx.combat?.owns(it.weapon);
        const label = maxed ? 'MAXED' : owned ? 'OWNED' : `$${cost.toLocaleString('en-US')}`;
        html += `<button class="shop-btn" data-buy="${it.id}" ${maxed || owned ? 'disabled' : ''}>${it.name} — ${it.desc} <b>${label}</b></button>`;
      }
    }
    html += `<button class="shop-btn shop-close" data-buy="close">Close (F)</button>`;
    panel.innerHTML = html;
    panel.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-buy]');
      if (!btn) return;
      buy(ctx, loc, btn.dataset.buy);
    });
    document.body.appendChild(panel);
  }

  function buy(ctx, loc, id) {
    if (id === 'close') { closePanel(); return; }
    if (id === 'meal') {
      if (!spend(ctx, 25)) return;
      ctx.player.setHealth(100);
      ctx.showNotice('FED AND RESTED — HEALTH 100');
      closePanel();
      return;
    }
    if (id === 'sleep') {
      ctx.player.setHealth(100);
      ctx.police.clearWanted();
      ctx.render.setTimeOfDay(18.4);
      ctx.saveGame?.(ctx);
      ctx.showNotice('GAME SAVED');
      closePanel();
      return;
    }
    if (loc.kind === 'garage') {
      const it = GARAGE_ITEMS.find((g) => g.id === id);
      if (!it) return;
      if (id === 'repair') {
        if (!ctx.player.vehicle) { ctx.showNotice('BRING A CAR TO THE GARAGE'); return; }
        if (!spend(ctx, it.cost[0])) return;
        repairVehicle(ctx);
        return;
      }
      if (garage[id] >= it.max) return;
      if (!spend(ctx, it.cost[garage[id]])) return;
      garage[id]++;
      if (ctx.player.vehicle) {
        // Re-apply on the current car: reset flags so levels take effect.
        ctx.player.vehicle._garageApplied = false;
        applyToVehicle(ctx.player.vehicle);
      }
      ctx.showNotice(`${it.name.toUpperCase()} INSTALLED`);
      openPanel(ctx, loc); // refresh prices
      return;
    }
    if (loc.kind === 'guns') {
      const it = GUN_ITEMS.find((g) => g.id === id);
      if (!it) return;
      if (it.weapon !== undefined && ctx.combat?.owns(it.weapon)) return;
      if (!spend(ctx, it.cost)) return;
      if (it.weapon !== undefined) ctx.combat.giveWeapon(it.weapon);
      else if (it.ammo) ctx.combat.addAmmo(60);
      else if (it.vest) ctx.game.armor = clamp((ctx.game.armor || 0) + 50, 0, 100);
      ctx.showNotice(`${it.name.toUpperCase()} BOUGHT`);
      openPanel(ctx, loc);
    }
  }

  function update(dt, ctx) {
    // Proximity: nearest location within 12m.
    nearLoc = null;
    let best = 12;
    for (const loc of LOCATIONS) {
      const d = dist2D(ctx.player.x, ctx.player.z, loc.x, loc.z);
      if (d < best) { best = d; nearLoc = loc; }
    }
    if (ctx.input.wasPressed('KeyF')) {
      if (panel) closePanel();
      else if (nearLoc && !ctx.races?.hubOpen) openPanel(ctx, nearLoc);
    }
    // Garage levels follow the car the player is driving.
    if (ctx.player.vehicle) applyToVehicle(ctx.player.vehicle);
  }

  return {
    standing,
    garage,
    locations: LOCATIONS,
    get nearLoc() { return nearLoc; },
    get panelOpen() { return !!panel; },
    addRespect, addStanding, spend, applyToVehicle, repairVehicle,
    openPanel, closePanel, update,
    districtStandingAt(x, z) {
      const d = district6At(x, z);
      return { district: d, value: standing[d] ?? 10 };
    },
    garageState() { return { ...garage }; },
    applyGarageState(s) { Object.assign(garage, s); },
    standingState() { return { ...standing }; },
    applyStandingState(s) { Object.assign(standing, s); },
  };
}
