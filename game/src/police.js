// Solmar PD: 0-5 star wanted system, pursuit cruisers (chase + PIT nudges),
// roadblocks at 3+ stars, CONDOR-1 helicopter with searchlight at 4-5 stars.
// API: createPolice(scene, world, { onBusted, onEscape }) -> {
//   wanted, heat, cruisers, roadblocks, heli, busted,
//   setWanted(n), addHeat(n), clearWanted(),
//   dispatchUnits(playerPos) -> [{ callsign, status, dist }],
//   update(dt, player, world, audio), reset() }
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { RNG, clamp, dist2D } from './util.js';
import { createVehicle } from './vehicles.js';

const CALLSIGNS = ['UNIT 7', 'UNIT 12', 'UNIT 3', 'UNIT 21', 'UNIT 9', 'UNIT 15'];

export function createPolice(scene, world, hooks = {}) {
  const rng = new RNG(CONFIG.seed + 99);
  const cruisers = [];
  const roadblocks = [];
  let heat = 0; // float 0..5; wanted = floor(heat) (min 1 while heat > 0)
  let bustTimer = 0;
  let busted = false;
  let roadblockTimer = 0;
  let heli = null;
  let heliRotor = null;
  let heliSpot = null;
  let heliCone = null;

  function wanted() {
    if (heat <= 0.05) return 0;
    return clamp(Math.ceil(heat), 1, CONFIG.maxWanted);
  }

  function spawnCruiserNear(px, pz) {
    const p = world.randomRoadPoint(rng);
    // Prefer a spawn 40-80m from the player.
    let x = p.x;
    let z = p.z;
    for (let tries = 0; tries < 8; tries++) {
      const q = world.randomRoadPoint(rng);
      const d = dist2D(px, pz, q.x, q.z);
      if (d > 35 && d < 90) { x = q.x; z = q.z; break; }
    }
    const heading = Math.atan2(px - x, pz - z);
    const car = createVehicle(scene, { type: 'police', x, z, heading });
    car.setLights(true);
    car._callsign = CALLSIGNS[cruisers.length % CALLSIGNS.length];
    car._status = 'PURSUIT';
    cruisers.push(car);
    return car;
  }

  function removeCruiser(car) {
    const i = cruisers.indexOf(car);
    if (i >= 0) cruisers.splice(i, 1);
    car.dispose();
  }

  function buildHeli() {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1a2a4a });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 4.6), bodyMat);
    body.castShadow = true;
    g.add(body);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.9, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x9ad6e8 }),
    );
    glass.position.set(0, 0.35, 1.8);
    g.add(glass);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.2), bodyMat);
    tail.position.set(0, 0.3, -4.2);
    g.add(tail);
    heliRotor = new THREE.Mesh(
      new THREE.BoxGeometry(11, 0.08, 0.35),
      new THREE.MeshLambertMaterial({ color: 0x111111 }),
    );
    heliRotor.position.y = 1.1;
    g.add(heliRotor);
    const skidMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    for (const s of [-1, 1]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 3.4), skidMat);
      skid.position.set(s * 1.1, -1.0, 0);
      g.add(skid);
    }
    // Searchlight: spotlight + visible cone.
    heliSpot = new THREE.SpotLight(0xfff2b0, 60, 90, 0.42, 0.5, 1.2);
    heliSpot.position.set(0, -1, 1.5);
    g.add(heliSpot);
    g.add(heliSpot.target);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xfff2b0, transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    heliCone = new THREE.Mesh(new THREE.ConeGeometry(7, 34, 20, 1, true), coneMat);
    heliCone.position.set(0, -18, 0);
    heliCone.rotation.x = Math.PI; // apex up at the heli
    g.add(heliCone);
    g.position.set(0, 38, 0);
    scene.add(g);
    return g;
  }

  function spawnRoadblock(px, pz, heading) {
    // Two cruisers parked across the road ahead of the player's heading.
    const ahead = 55;
    const ax = px + Math.sin(heading) * ahead;
    const az = pz + Math.cos(heading) * ahead;
    const rp = world.nearestRoadPoint(ax, az);
    const onVerticalRoad = Math.abs(rp.x - ax) < Math.abs(rp.z - az);
    const perp = onVerticalRoad ? 0 : Math.PI / 2;
    for (const s of [-1, 1]) {
      const ox = onVerticalRoad ? s * 3.4 : 0;
      const oz = onVerticalRoad ? 0 : s * 3.4;
      const car = createVehicle(scene, {
        type: 'police', x: rp.x + ox, z: rp.z + oz, heading: perp + Math.PI / 2,
      });
      car.setLights(true);
      car._callsign = 'BLOCK';
      car._status = 'ROADBLOCK';
      car._block = true;
      roadblocks.push(car);
    }
  }

  function clearRoadblocks() {
    while (roadblocks.length) roadblocks.pop().dispose();
  }

  function setWanted(n) {
    heat = clamp(n, 0, CONFIG.maxWanted);
    if (heat <= 0) { clearRoadblocks(); bustTimer = 0; }
  }
  function addHeat(n) { heat = clamp(heat + n, 0, CONFIG.maxWanted); }
  function clearWanted() { setWanted(0); }

  function dispatchUnits(px, pz) {
    const units = cruisers.map((c) => ({
      callsign: c._callsign,
      status: c._status,
      dist: Math.round(dist2D(px, pz, c.x, c.z)),
    }));
    for (const b of roadblocks.slice(0, 2)) {
      units.push({ callsign: 'BLOCK', status: 'ROADBLOCK', dist: Math.round(dist2D(px, pz, b.x, b.z)) });
    }
    if (heli) units.push({ callsign: 'CONDOR-1', status: 'SPOTLIGHT', dist: Math.round(dist2D(px, pz, heli.position.x, heli.position.z)) });
    return units;
  }

  function update(dt, player, worldRef, audio) {
    const w = wanted();
    const px = player.x;
    const pz = player.z;
    const playerSpeed = player.vehicle ? Math.abs(player.vehicle.speed) : player.speed;

    // Cruiser count tracks wanted level.
    const wantCruisers = w === 0 ? 0 : Math.min(CONFIG.maxCruisers, w);
    while (cruisers.length < wantCruisers) spawnCruiserNear(px, pz);
    while (cruisers.length > wantCruisers) removeCruiser(cruisers[cruisers.length - 1]);

    // Roadblocks at 3+ stars, refreshed every 12s.
    if (w >= CONFIG.roadblockStars) {
      roadblockTimer -= dt;
      if (roadblocks.length === 0 || roadblockTimer <= 0) {
        clearRoadblocks();
        spawnRoadblock(px, pz, player.heading);
        roadblockTimer = 12;
      }
    } else if (roadblocks.length) clearRoadblocks();

    // Helicopter at 4+ stars.
    if (w >= CONFIG.heliStars) {
      if (!heli) heli = buildHeli();
      // Hover above the player with lag, ~38m up.
      heli.position.x += (px - heli.position.x) * Math.min(1, dt * 0.9);
      heli.position.z += (pz - heli.position.z) * Math.min(1, dt * 0.9);
      heli.position.y += (38 - heli.position.y) * Math.min(1, dt * 1.2);
      heli.rotation.y = Math.atan2(px - heli.position.x, pz - heli.position.z);
      heliRotor.rotation.y += dt * 28;
      heliSpot.target.position.set(px - heli.position.x, -heli.position.y, pz - heli.position.z);
      // Aim the cone at the player.
      heliCone.position.set((px - heli.position.x) * 0.5, -17, (pz - heli.position.z) * 0.5);
    } else if (heli) {
      scene.remove(heli);
      heli = null; heliRotor = null; heliSpot = null; heliCone = null;
    }

    // Pursuit AI: steer at the player, PIT nudge when alongside.
    let nearestDist = Infinity;
    for (const c of cruisers) {
      if (c.wrecked) { c.update(dt, worldRef); continue; }
      const d = dist2D(px, pz, c.x, c.z);
      nearestDist = Math.min(nearestDist, d);
      // Predict the player's position slightly ahead.
      const lead = 0.6;
      const tx = px + Math.sin(player.heading) * playerSpeed * lead;
      const tz = pz + Math.cos(player.heading) * playerSpeed * lead;
      const wantHeading = Math.atan2(tx - c.x, tz - c.z);
      let dh = wantHeading - c.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      const steer = clamp(dh * 2.4, -1, 1);
      // PIT: if close and beside the player car, ram sideways.
      const alongside = d < 7 && player.vehicle;
      c._status = alongside ? 'RAMMING' : 'PURSUIT';
      const throttle = d > 3.5 ? 1 : 0.4;
      c.setSteerVisual(steer);
      c.drive(dt, { throttle, steer, handbrake: false }, worldRef);
      c.update(dt, worldRef);
      // Ram the player's car when touching: shove + damage.
      if (player.vehicle && d < 4.2) {
        player.vehicle.damage(dt * 3);
        player.vehicle.mesh.position.x += Math.sin(c.heading) * dt * 2.2;
        player.vehicle.mesh.position.z += Math.cos(c.heading) * dt * 2.2;
      }
    }

    // Roadblock collision with the player's car.
    if (player.vehicle) {
      for (const b of roadblocks) {
        const d = dist2D(px, pz, b.x, b.z);
        if (d < 3.6 && Math.abs(player.vehicle.speed) > 4) {
          player.vehicle.damage(Math.abs(player.vehicle.speed) * 2.2);
          player.vehicle.speed *= -0.3;
          b.damage(15);
        }
      }
    }

    // Siren while any cruiser is near.
    if (audio) audio.siren(w > 0 && nearestDist < 120);

    // Bust: slow + surrounded.
    if (w > 0 && !busted) {
      if (playerSpeed < 1.5 && nearestDist < CONFIG.bustRange) {
        bustTimer += dt;
        if (bustTimer >= CONFIG.bustTime) {
          busted = true;
          hooks.onBusted?.();
        }
      } else {
        bustTimer = Math.max(0, bustTimer - dt * 2);
      }
    }

    // Heat decays when unseen (no cruiser close, no heli).
    if (w > 0 && nearestDist > 70 && !heli) {
      heat = Math.max(0, heat - CONFIG.heatDecayPerSec * dt * 10);
      if (heat <= 0) hooks.onEscape?.();
    }
    return { wanted: w, nearestDist, bustProgress: bustTimer / CONFIG.bustTime };
  }

  function reset() {
    heat = 0;
    busted = false;
    bustTimer = 0;
    while (cruisers.length) removeCruiser(cruisers[0]);
    clearRoadblocks();
    if (heli) { scene.remove(heli); heli = null; }
  }

  return {
    cruisers, roadblocks,
    get heli() { return heli; },
    get wanted() { return wanted(); },
    get heat() { return heat; },
    get busted() { return busted; },
    setWanted, addHeat, clearWanted, dispatchUnits, update, reset,
  };
}
