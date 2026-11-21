// Solmar City — combat: 5 weapons, mouse-aim shooting, weapon wheel (hold
// Q), number keys, cover (C), enemy gang AI with health bars. Shooting
// makes pedestrians flee and raises police heat; killing mission enemies
// is how shootout stages are cleared.
import * as THREE from '../vendor/three.module.min.js';
import { buildPersonMesh } from './player.js';
import { clamp, dist2D } from './util.js';

export const WEAPONS = [
  { name: 'FISTS', damage: 15, rate: 0.45, mag: Infinity, range: 3, spread: 0, auto: false, ammo: false },
  { name: 'PISTOL', damage: 25, rate: 0.28, mag: 12, range: 60, spread: 0.01, auto: false, ammo: true },
  { name: 'SMG', damage: 16, rate: 0.09, mag: 30, range: 45, spread: 0.04, auto: true, ammo: true },
  { name: 'SHOTGUN', damage: 14, rate: 0.85, mag: 6, range: 22, spread: 0.12, auto: false, ammo: true, pellets: 6 },
  { name: 'RIFLE', damage: 45, rate: 0.5, mag: 20, range: 110, spread: 0.004, auto: false, ammo: true },
];

const GANG_COLORS = [
  { shirt: 0x8e2f2f, pants: 0x1a1a1a, skin: 0xc98a5e },
  { shirt: 0x2f4a8e, pants: 0x222226, skin: 0x8a5a3a },
  { shirt: 0x3a7a2f, pants: 0x1a1a2a, skin: 0xe8b88a },
];

export function createCombat(scene) {
  const owned = new Set([0, 1]); // fists + pistol from the start
  const ammo = WEAPONS.map((w, i) => ({ mag: w.mag === Infinity ? Infinity : w.mag, reserve: i === 1 ? 60 : i === 0 ? 0 : 30 }));
  let current = 1;
  let cooldown = 0;
  let reloading = 0;
  let inCover = false;
  let coverAt = null;
  let wheelAccum = 0;
  let wheelOpen = false;
  const enemies = [];
  const allies = [];
  const tracers = [];
  const raycaster = new THREE.Raycaster();
  const center = new THREE.Vector2(0, 0);
  let killCount = 0;
  let shotsFired = 0;

  function makeHealthBar() {
    const g = new THREE.Group();
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x881111, transparent: true, opacity: 0.85 }),
    );
    const fg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x7ee787 }),
    );
    fg.position.z = 0.01;
    g.add(bg, fg);
    g.position.y = 2.15;
    g.userData.fg = fg;
    return g;
  }

  function spawnFighter(x, z, opts = {}) {
    const c = GANG_COLORS[enemies.length % GANG_COLORS.length];
    const mesh = buildPersonMesh(
      opts.ally ? 0x2e8b8b : c.shirt, opts.ally ? 0x2a2a3a : c.pants, c.skin,
    );
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    const bar = makeHealthBar();
    mesh.add(bar);
    const f = {
      mesh, bar, health: 100, dead: false, deadT: 0,
      heading: Math.atan2(0 - x, 0 - z),
      shootT: 1 + Math.random(),
      walkPhase: Math.random() * 6,
      ally: !!opts.ally,
      lifeT: opts.lifeT || Infinity,
    };
    (opts.ally ? allies : enemies).push(f);
    return f;
  }

  function spawnEnemies(list) {
    const out = [];
    for (const s of list) out.push(spawnFighter(s.x, s.z));
    return out;
  }

  function damageEnemy(e, dmg) {
    if (!e || e.dead) return;
    e.health -= dmg;
    const frac = clamp(e.health / 100, 0, 1);
    e.bar.userData.fg.scale.x = Math.max(0.001, frac);
    e.bar.userData.fg.position.x = -(1 - frac) * 0.65;
    if (e.health <= 0) {
      e.dead = true;
      e.deadT = 4;
      e.mesh.rotation.z = Math.PI / 2;
      e.mesh.position.y = 0.4;
      e.bar.visible = false;
      if (!e.ally) killCount++;
    }
  }

  function damagePlayer(ctx, n) {
    let remaining = n;
    if (ctx.game.armor > 0) {
      const absorbed = Math.min(ctx.game.armor, remaining);
      ctx.game.armor -= absorbed;
      remaining -= absorbed;
    }
    if (remaining > 0) ctx.player.setHealth(ctx.player.health - remaining);
  }

  function shootTracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: 0xffe9a8, transparent: true, opacity: 0.9,
    }));
    scene.add(line);
    tracers.push({ line, life: 0.09 });
  }

  function fire(ctx) {
    const w = WEAPONS[current];
    const p = ctx.player;
    if (!p.onFoot) return;
    if (cooldown > 0 || reloading > 0) return;
    if (w.ammo) {
      if (ammo[current].mag <= 0) { reload(); return; }
      ammo[current].mag--;
    }
    cooldown = w.rate;
    shotsFired++;
    ctx.audio.shot();
    ctx.peds.fleeFrom(p.x, p.z, 45);
    ctx.police.addHeat(0.1);
    const pellets = w.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      raycaster.setFromCamera(center, ctx.render.camera);
      if (w.spread) {
        raycaster.ray.direction.x += (Math.random() - 0.5) * w.spread;
        raycaster.ray.direction.y += (Math.random() - 0.5) * w.spread;
        raycaster.ray.direction.normalize();
      }
      const targets = [];
      for (const e of enemies) if (!e.dead) targets.push(e.mesh);
      for (const c of ctx.traffic.cars) targets.push(c.mesh);
      for (const c of ctx.police.cruisers) targets.push(c.mesh);
      for (const b of ctx.police.roadblocks) targets.push(b.mesh);
      for (const ped of ctx.peds.peds) targets.push(ped.mesh);
      const hits = raycaster.intersectObjects(targets, true);
      const from = p.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0));
      let end = raycaster.ray.at(w.range, new THREE.Vector3());
      if (hits.length && hits[0].distance < w.range) {
        end = hits[0].point.clone();
        const hit = hits[0].object;
        // Walk up to the top-level group to identify what was hit.
        let root = hit;
        while (root.parent && root.parent !== scene) root = root.parent;
        const enemy = enemies.find((e) => e.mesh === root);
        if (enemy) {
          damageEnemy(enemy, w.damage);
        } else {
          const car = [...ctx.traffic.cars, ...ctx.police.cruisers, ...ctx.police.roadblocks]
            .find((c) => c.mesh === root);
          if (car) {
            car.damage(w.damage * 0.6);
            if (car.wrecked) ctx.audio.explosion();
          } else {
            // Pedestrian hit: they run, and the cops notice.
            ctx.peds.fleeFrom(p.x, p.z, 60);
            ctx.police.addHeat(0.5);
          }
        }
      }
      shootTracer(from, end);
    }
    // Fists: short-range swing instead of a raycast.
    if (current === 0) {
      for (const e of enemies) {
        if (!e.dead && dist2D(p.x, p.z, e.mesh.position.x, e.mesh.position.z) < 3) {
          damageEnemy(e, w.damage);
        }
      }
    }
  }

  function reload() {
    const w = WEAPONS[current];
    if (!w.ammo || reloading > 0) return;
    if (ammo[current].mag >= w.mag || ammo[current].reserve <= 0) return;
    reloading = 1.1;
  }

  function finishReload() {
    const w = WEAPONS[current];
    const need = w.mag - ammo[current].mag;
    const take = Math.min(need, ammo[current].reserve);
    ammo[current].mag += take;
    ammo[current].reserve -= take;
  }

  function tryCover(ctx) {
    const p = ctx.player;
    if (inCover) { leaveCover(); return; }
    if (!p.onFoot) return;
    // Cover = a car within 4m, or a wall within 2.5m ahead.
    const car = ctx.traffic.nearestCar(p.x, p.z, 4);
    const aheadX = p.x + Math.sin(p.heading) * 2.5;
    const aheadZ = p.z + Math.cos(p.heading) * 2.5;
    const wall = ctx.world.isBlocked(aheadX, aheadZ);
    if (car) {
      const side = Math.atan2(p.x - car.x, p.z - car.z);
      p.mesh.position.set(car.x + Math.sin(side) * 2.4, 0, car.z + Math.cos(side) * 2.4);
      coverAt = { x: p.mesh.position.x, z: p.mesh.position.z };
    } else if (wall) {
      coverAt = { x: p.x, z: p.z };
    } else {
      ctx.showNotice('NO COVER NEARBY');
      return;
    }
    inCover = true;
    p.mesh.scale.y = 0.8;
    ctx.showNotice('IN COVER — C TO LEAVE');
  }

  function leaveCover() {
    inCover = false;
    coverAt = null;
  }

  function updateFighter(f, dt, ctx, isAlly) {
    if (f.dead) {
      f.deadT -= dt;
      if (f.deadT <= 0) {
        scene.remove(f.mesh);
        const arr = isAlly ? allies : enemies;
        const i = arr.indexOf(f);
        if (i >= 0) arr.splice(i, 1);
      }
      return;
    }
    if (isAlly) {
      f.lifeT -= dt;
      if (f.lifeT <= 0) {
        scene.remove(f.mesh);
        allies.splice(allies.indexOf(f), 1);
        return;
      }
    }
    // Face the camera with the health bar.
    f.bar.lookAt(ctx.render.camera.position);
    // Target: enemies hunt the player; allies hunt the nearest live enemy.
    let tx, tz, targetEnemy = null;
    if (isAlly) {
      let best = 30;
      for (const e of enemies) {
        if (e.dead) continue;
        const d = dist2D(f.mesh.position.x, f.mesh.position.z, e.mesh.position.x, e.mesh.position.z);
        if (d < best) { best = d; targetEnemy = e; }
      }
      if (targetEnemy) { tx = targetEnemy.mesh.position.x; tz = targetEnemy.mesh.position.z; }
      else { tx = ctx.player.x; tz = ctx.player.z; } // follow the player
    } else {
      tx = ctx.player.x; tz = ctx.player.z;
    }
    const d = dist2D(f.mesh.position.x, f.mesh.position.z, tx, tz);
    const wantHeading = Math.atan2(tx - f.mesh.position.x, tz - f.mesh.position.z);
    let dh = wantHeading - f.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    f.heading += clamp(dh, -5 * dt, 5 * dt);
    f.mesh.rotation.y = f.heading;
    // Advance until in range, then stand and shoot.
    const stopDist = isAlly ? (targetEnemy ? 14 : 5) : 16;
    if (d > stopDist) {
      const sp = 4.2;
      const nx = f.mesh.position.x + Math.sin(f.heading) * sp * dt;
      const nz = f.mesh.position.z + Math.cos(f.heading) * sp * dt;
      if (!ctx.world.isBlocked(nx, nz)) { f.mesh.position.x = nx; f.mesh.position.z = nz; }
      f.walkPhase += sp * dt * 2.2;
      const swing = Math.sin(f.walkPhase) * 0.5;
      const u = f.mesh.userData;
      u.legL.rotation.x = swing; u.legR.rotation.x = -swing;
      u.armL.rotation.x = -swing * 0.8; u.armR.rotation.x = swing * 0.8;
    }
    // Shoot.
    const inRange = isAlly ? !!targetEnemy : d < 32;
    if (inRange) {
      f.shootT -= dt;
      if (f.shootT <= 0) {
        f.shootT = 1.4 + Math.random() * 0.9;
        const from = f.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0));
        const to = isAlly
          ? targetEnemy.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0))
          : ctx.player.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
        shootTracer(from, to);
        ctx.audio.shot();
        if (isAlly) {
          if (Math.random() < 0.6) damageEnemy(targetEnemy, 22);
        } else {
          let hitChance = 0.55 - Math.max(0, d - 12) * 0.012;
          if (inCover) hitChance *= 0.45;
          if (!ctx.player.onFoot) hitChance *= 0.5;
          if (Math.random() < hitChance) {
            if (ctx.player.vehicle) ctx.player.vehicle.damage(4);
            else damagePlayer(ctx, 5 + Math.random() * 4);
            ctx.showNotice('TAKING FIRE');
          }
        }
      }
    }
  }

  function update(dt, ctx) {
    cooldown = Math.max(0, cooldown - dt);
    if (reloading > 0) {
      reloading -= dt;
      if (reloading <= 0) finishReload();
    }
    // Weapon switching: number keys 1-5.
    for (let i = 0; i < 5; i++) {
      if (ctx.input.wasPressed(`Digit${i + 1}`) && owned.has(i)) {
        current = i; reloading = 0;
      }
    }
    // Weapon wheel: hold Q, flick the mouse left/right to cycle.
    wheelOpen = ctx.input.isDown('KeyQ');
    if (wheelOpen) {
      wheelAccum += ctx.input.mouseDX;
      if (wheelAccum > 70) { wheelAccum = 0; cycle(1); }
      else if (wheelAccum < -70) { wheelAccum = 0; cycle(-1); }
    } else wheelAccum = 0;
    if (ctx.input.wasPressed('KeyR')) reload();
    if (ctx.input.wasPressed('KeyC')) tryCover(ctx);
    if (!ctx.player.onFoot && inCover) leaveCover();
    if (inCover) ctx.player.mesh.scale.y = 0.8;
    else ctx.player.mesh.scale.y = 1;

    const uiBusy = ctx.economy?.panelOpen || ctx.races?.panelOpen || ctx.hud?.dialogueActive();
    if (!uiBusy && ctx.player.onFoot) {
      const w = WEAPONS[current];
      const wantFire = w.auto ? ctx.input.mouseDown : ctx.input.mouseDown && !fire._held;
      fire._held = ctx.input.mouseDown;
      if (wantFire) fire(ctx);
    } else {
      fire._held = ctx.input.mouseDown;
    }

    for (const e of [...enemies]) updateFighter(e, dt, ctx, false);
    for (const a of [...allies]) updateFighter(a, dt, ctx, true);

    for (let i = tracers.length - 1; i >= 0; i--) {
      const t = tracers[i];
      t.life -= dt;
      t.line.material.opacity = Math.max(0, t.life / 0.09) * 0.9;
      if (t.life <= 0) {
        scene.remove(t.line);
        t.line.geometry.dispose();
        tracers.splice(i, 1);
      }
    }
  }

  function cycle(dir) {
    const ownedList = WEAPONS.map((_, i) => i).filter((i) => owned.has(i));
    const idx = ownedList.indexOf(current);
    current = ownedList[(idx + dir + ownedList.length) % ownedList.length];
    reloading = 0;
  }

  return {
    enemies, allies,
    get current() { return current; },
    get currentWeapon() { return WEAPONS[current]; },
    get inCover() { return inCover; },
    get reloading() { return reloading > 0; },
    get killCount() { return killCount; },
    get shotsFired() { return shotsFired; },
    get wheelOpen() { return wheelOpen; },
    owns(i) { return owned.has(i); },
    giveWeapon(i) { owned.add(i); current = i; },
    addAmmo(n) { ammo[current].reserve += n; },
    ammoFor(i) { return ammo[i]; },
    spawnEnemies, spawnFighter, damageEnemy, damagePlayer,
    enemiesAlive() { return enemies.filter((e) => !e.dead).length; },
    clearEnemies() {
      for (const e of [...enemies]) { scene.remove(e.mesh); }
      enemies.length = 0;
      for (const a of [...allies]) { scene.remove(a.mesh); }
      allies.length = 0;
    },
    leaveCover, update,
    weaponState() {
      return { owned: [...owned], current, ammo: ammo.map((a) => ({ ...a })) };
    },
    applyWeaponState(s) {
      if (Array.isArray(s.owned)) { owned.clear(); s.owned.forEach((i) => owned.add(i)); }
      if (typeof s.current === 'number' && owned.has(s.current)) current = s.current;
      if (Array.isArray(s.ammo)) {
        s.ammo.forEach((a, i) => { if (ammo[i] && a) Object.assign(ammo[i], a); });
      }
    },
  };
}
