// Solmar City — combat: the weapon wheel (fists, pistol, SMG, shotgun,
// rifle), bullets, rival-gang enemy AI and the cover system for shootouts.

const Combat = (() => {
  const WEAPONS = {
    fists:   { name: 'Fists',    slot: 1, damage: 12, range: 46, rate: 0.35, auto: false, spread: 0, ammo: Infinity, price: 0, kick: 0 },
    pistol:  { name: 'P9 Pistol', slot: 2, damage: 22, range: 420, rate: 0.28, auto: false, spread: 0.03, ammo: 120, price: 250, kick: 1 },
    smg:     { name: 'VK-9 SMG', slot: 3, damage: 14, range: 360, rate: 0.09, auto: true, spread: 0.09, ammo: 240, price: 900, kick: 0.6 },
    shotgun: { name: 'M870 Scatter', slot: 4, damage: 16, range: 260, rate: 0.8, auto: false, spread: 0.22, ammo: 60, price: 1400, kick: 3, pellets: 6 },
    rifle:   { name: 'AR-7 Rifle', slot: 5, damage: 34, range: 560, rate: 0.16, auto: true, spread: 0.04, ammo: 180, price: 2200, kick: 1.4 },
  };
  const ORDER = ['fists', 'pistol', 'smg', 'shotgun', 'rifle'];

  let wheelOpen = false;
  let shootCd = 0;
  let meleeCd = 0;

  function currentWeapon() { return WEAPONS[G.player.weapon] || WEAPONS.fists; }
  function isWheelOpen() { return wheelOpen; }
  function setWheelOpen(v) { wheelOpen = v; }
  function ownedWeapons() { return G.player.owned; }

  function selectWeapon(key) {
    if (!WEAPONS[key]) return;
    if (!G.player.owned.includes(key)) { HUD.toast(WEAPONS[key].name + ' not owned — buy it at Solmar Arms', '#ffb347'); return; }
    G.player.weapon = key;
    AudioSys.click();
  }

  function cycleWeapon(dir) {
    const owned = ORDER.filter(w => G.player.owned.includes(w));
    const idx = owned.indexOf(G.player.weapon);
    const next = owned[(idx + dir + owned.length) % owned.length];
    if (next) G.player.weapon = next;
  }

  function playerAimAngle() {
    // Mouse aim in world space; fallback to facing.
    const cam = G.camera;
    const wx = cam.x + G.mouse.x, wy = cam.y + G.mouse.y;
    return Util.angleTo(G.player.x, G.player.y, wx, wy);
  }

  function tryShoot(dt) {
    shootCd -= dt; meleeCd -= dt;
    const p = G.player;
    if (p.inCar || p.dead) return;
    const w = currentWeapon();
    if (w === WEAPONS.fists) {
      if (G.mouse.down && meleeCd <= 0) {
        meleeCd = w.rate;
        meleeAttack();
      }
      return;
    }
    const wantFire = w.auto ? G.mouse.down : (G.mouse.down && !G.mouse.consumed);
    if (!wantFire || shootCd > 0) return;
    const ammo = p.ammo[p.weapon] || 0;
    if (ammo <= 0) {
      HUD.toast('Out of ammo — buy more at Solmar Arms', '#ff5a3c');
      AudioSys.click();
      shootCd = 0.4;
      G.mouse.consumed = true;
      return;
    }
    shootCd = w.rate;
    G.mouse.consumed = true;
    p.ammo[p.weapon] = ammo - 1;
    const aim = playerAimAngle();
    p.angle = aim;
    const pellets = w.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const a = aim + (Math.random() - 0.5) * 2 * w.spread;
      const speed = 900;
      G.bullets.push({
        x: p.x + Math.cos(aim) * 16, y: p.y + Math.sin(aim) * 16,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: w.range / speed, damage: w.damage, from: 'player', kind: p.weapon,
      });
    }
    AudioSys.shot(p.weapon);
    Vehicles.Particles.burst(p.x + Math.cos(aim) * 20, p.y + Math.sin(aim) * 20, 3, '#ffd23f', 120);
    G.shake = Math.min(6, G.shake + w.kick * 0.4);
    Police.addHeat(2);
    Pedestrians.panicAt(p.x, p.y, 300);
  }

  function meleeAttack() {
    const p = G.player;
    const aim = playerAimAngle();
    p.angle = aim;
    AudioSys.crash();
    const reach = 52;
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (Util.dist(p.x, p.y, e.x, e.y) < reach && Math.cos(Util.angleDiff(aim, Util.angleTo(p.x, p.y, e.x, e.y))) > 0.5) {
        hurtEnemy(e, WEAPONS.fists.damage);
      }
    }
    for (const c of G.cops) {
      if (c.type === 'foot' && !c.dead && Util.dist(p.x, p.y, c.x, c.y) < reach) {
        c.hp -= WEAPONS.fists.damage;
        Police.addHeat(6);
      }
    }
    for (const ped of G.peds) {
      if (!ped.dead && Util.dist(p.x, p.y, ped.x, ped.y) < reach) {
        ped.dead = true;
        Police.addHeat(18);
        Pedestrians.panicAt(p.x, p.y, 260);
      }
    }
  }

  function enemyShoot(x, y, tx, ty, damage, from) {
    const a = Util.angleTo(x, y, tx, ty) + (Math.random() - 0.5) * 0.16;
    const speed = 820;
    G.bullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0.7, damage, from, kind: 'pistol' });
    AudioSys.shot('pistol');
    Vehicles.Particles.burst(x, y, 2, '#ffd23f', 90);
  }

  function hurtPlayer(amount, source) {
    const p = G.player;
    if (p.dead || G.state !== 'play') return;
    if (p.cover) amount *= 0.3; // cover absorbs most incoming fire
    if (p.armor > 0) {
      const absorbed = Math.min(p.armor, amount * 0.6);
      p.armor -= absorbed;
      amount -= absorbed;
    }
    p.hp -= amount;
    G.shake = Math.min(8, G.shake + 3);
    if (p.hp <= 0) {
      p.hp = 0; p.dead = true;
      G.state = 'wasted';
      AudioSys.missionFail();
    }
  }

  function hurtEnemy(e, damage) {
    if (e.dead) return;
    e.hp -= damage;
    Vehicles.Particles.burst(e.x, e.y, 4, '#c94f4f', 90);
    if (e.hp <= 0) {
      e.dead = true;
      Economy.addCash(15 + Math.floor(Math.random() * 30));
      Economy.addRespect(4);
      if (G.mission) Missions.onEnemyKilled(e);
    }
  }

  function updateBullets(dt) {
    for (let i = G.bullets.length - 1; i >= 0; i--) {
      const b = G.bullets[i];
      b.life -= dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      let hit = b.life <= 0;
      if (!hit && City.collides(b.x, b.y, 2)) {
        hit = true;
        Vehicles.Particles.burst(b.x, b.y, 3, '#d8d0c0', 80);
      }
      // Cars block bullets and take damage.
      if (!hit) {
        for (const car of G.cars) {
          if (car.wreck) continue;
          const dx = b.x - car.x, dy = b.y - car.y;
          const ca = Math.cos(-car.angle), sa = Math.sin(-car.angle);
          const lx = dx * ca - dy * sa, ly = dx * sa + dy * ca;
          if (Math.abs(lx) < car.def.len / 2 && Math.abs(ly) < car.def.wid / 2) {
            hit = true;
            if (b.from === 'player') Vehicles.damage(car, b.damage, 'player');
            break;
          }
        }
      }
      if (!hit && (b.from === 'player' || b.from === 'ally')) {
        for (const e of G.enemies) {
          if (!e.dead && Util.dist(b.x, b.y, e.x, e.y) < 13) { hurtEnemy(e, b.damage); hit = true; break; }
        }
        if (!hit) {
          for (const c of G.cops) {
            if (c.type === 'foot' && !c.dead && Util.dist(b.x, b.y, c.x, c.y) < 13) {
              c.hp -= b.damage;
              if (b.from === 'player') Police.addHeat(10);
              hit = true; break;
            }
          }
        }
        if (!hit) {
          const h = Police.getHeli();
          if (h && Util.dist(b.x, b.y, h.x, h.y) < 30) { h.hp -= b.damage; hit = true; }
        }
        if (!hit && b.from === 'player') {
          for (const ped of G.peds) {
            if (!ped.dead && Util.dist(b.x, b.y, ped.x, ped.y) < 11) {
              ped.dead = true;
              Police.addHeat(18);
              Pedestrians.panicAt(b.x, b.y, 300);
              hit = true; break;
            }
          }
        }
      }
      if (!hit && (b.from === 'enemy' || b.from === 'cop')) {
        const p = G.player;
        if (!p.dead && Util.dist(b.x, b.y, p.x, p.y) < (p.inCar ? 24 : 13)) {
          if (p.inCar && p.car) Vehicles.damage(p.car, b.damage * 0.5, b.from);
          else hurtPlayer(b.damage, b.from);
          hit = true;
        }
        if (!hit) {
          for (const a of Crew.getAllies()) {
            if (!a.dead && Util.dist(b.x, b.y, a.x, a.y) < 13) { a.hp -= b.damage; if (a.hp <= 0) a.dead = true; hit = true; break; }
          }
        }
      }
      if (hit) G.bullets.splice(i, 1);
    }
  }

  // --- Enemy AI (rival gang "Los Vipers") ---
  function spawnEnemy(x, y, opts) {
    opts = opts || {};
    const e = {
      x, y, angle: 0, hp: opts.hp || 60, speed: 150 + Math.random() * 40,
      weapon: opts.weapon || 'pistol', shootCd: 0.5 + Math.random(),
      state: opts.state || 'attack', tx: opts.tx || x, ty: opts.ty || y,
      boss: !!opts.boss, name: opts.name || 'Viper', dead: false,
    };
    G.enemies.push(e);
    return e;
  }

  function updateEnemies(dt) {
    const p = G.player;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = Util.dist(e.x, e.y, p.x, p.y);
      const ang = Util.angleTo(e.x, e.y, p.x, p.y);
      e.angle += Util.angleDiff(e.angle, ang) * Math.min(1, dt * 6);
      // Advance until in range, strafe while shooting.
      if (d > 260) {
        const nx = e.x + Math.cos(e.angle) * e.speed * dt;
        const ny = e.y + Math.sin(e.angle) * e.speed * dt;
        if (!City.collides(nx, ny, 10)) { e.x = nx; e.y = ny; }
      } else if (d < 130) {
        e.x -= Math.cos(e.angle) * e.speed * 0.5 * dt;
        e.y -= Math.sin(e.angle) * e.speed * 0.5 * dt;
      }
      e.shootCd -= dt;
      if (d < 430 && e.shootCd <= 0 && !p.dead && G.state === 'play') {
        e.shootCd = (e.weapon === 'smg' ? 0.5 : 1.0) + Math.random() * 0.7;
        enemyShoot(e.x, e.y, p.x, p.y, e.boss ? 14 : 9, 'enemy');
      }
    }
    G.enemies = G.enemies.filter(e => !e.dead || e.deathT < 999);
  }

  // --- Cover system ---
  function findCover() {
    const p = G.player;
    // Cover = a building wall or a car side within arm's reach.
    for (const b of City.buildings) {
      if (Util.dist(p.x, p.y, Util.clamp(p.x, b.x, b.x + b.w), Util.clamp(p.y, b.y, b.y + b.h)) < 26) return { kind: 'wall', x: p.x, y: p.y };
    }
    for (const car of G.cars) {
      if (!car.wreck && Util.dist(p.x, p.y, car.x, car.y) < 40) return { kind: 'car', x: car.x, y: car.y };
    }
    return null;
  }

  function tryToggleCover() {
    const p = G.player;
    if (p.inCar) return;
    if (p.cover) { p.cover = false; p.coverObj = null; return; }
    const c = findCover();
    if (c) {
      p.cover = true; p.coverObj = c;
      HUD.toast('In cover — incoming damage reduced 70%', '#7ec850');
    } else {
      HUD.toast('No cover nearby — stand by a wall or car', '#ffb347');
    }
  }

  function drawEnemies(g) {
    for (const e of G.enemies) {
      if (e.dead) continue;
      g.save();
      g.translate(e.x, e.y);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.beginPath(); g.ellipse(2, 3, 9, 5, 0, 0, Util.TAU); g.fill();
      g.rotate(e.angle);
      // Viper gang: purple jacket, gold chain dot.
      g.fillStyle = e.boss ? '#5a1d8a' : '#7a2fd9';
      g.beginPath(); g.arc(0, 0, e.boss ? 10 : 8, 0, Util.TAU); g.fill();
      g.fillStyle = '#f2c89b';
      g.beginPath(); g.arc(4, 0, 4.5, 0, Util.TAU); g.fill();
      g.fillStyle = '#ffd23f';
      g.fillRect(2, -1.5, 4, 3);
      // Gun.
      g.fillStyle = '#222';
      g.fillRect(8, -1.5, 10, 3);
      g.restore();
      // Health bar for the boss.
      if (e.boss) {
        g.fillStyle = 'rgba(0,0,0,0.6)';
        g.fillRect(e.x - 22, e.y - 26, 44, 6);
        g.fillStyle = '#ff5a3c';
        g.fillRect(e.x - 21, e.y - 25, 42 * Util.clamp(e.hp / 200, 0, 1), 4);
        g.fillStyle = '#fff';
        g.font = 'bold 10px Arial'; g.textAlign = 'center';
        g.fillText(e.name.toUpperCase(), e.x, e.y - 30);
      }
    }
  }

  function drawBullets(g) {
    g.fillStyle = '#fff2a8';
    for (const b of G.bullets) {
      g.save();
      g.translate(b.x, b.y);
      g.rotate(Math.atan2(b.vy, b.vx));
      g.fillRect(-5, -1, 10, 2);
      g.restore();
    }
  }

  function drawWeaponWheel(g, vw, vh) {
    if (!wheelOpen) return;
    const cx = vw / 2, cy = vh / 2, R = 120;
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, vw, vh);
    g.fillStyle = 'rgba(20,20,28,0.92)';
    g.beginPath(); g.arc(cx, cy, R + 34, 0, Util.TAU); g.fill();
    g.strokeStyle = '#ffd23f'; g.lineWidth = 2;
    g.stroke();
    g.fillStyle = '#fff';
    g.font = 'bold 16px Arial'; g.textAlign = 'center';
    g.fillText('WEAPON WHEEL', cx, cy - R - 44);
    g.font = '12px Arial'; g.fillStyle = '#bbb';
    g.fillText('Click a weapon or press 1-5', cx, cy - R - 26);
    ORDER.forEach((key, i) => {
      const a = -Math.PI / 2 + (i / ORDER.length) * Util.TAU;
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      const owned = G.player.owned.includes(key);
      const active = G.player.weapon === key;
      g.fillStyle = active ? '#ffd23f' : (owned ? '#2f3a4a' : '#1a1a1a');
      g.beginPath(); g.arc(x, y, 34, 0, Util.TAU); g.fill();
      g.strokeStyle = active ? '#fff' : '#555'; g.lineWidth = 2; g.stroke();
      g.fillStyle = active ? '#111' : (owned ? '#fff' : '#666');
      g.font = 'bold 13px Arial';
      g.fillText(WEAPONS[key].name, x, y - 2);
      g.font = '11px Arial';
      g.fillText(owned ? (key === 'fists' ? '∞' : (G.player.ammo[key] || 0) + ' ammo') : 'LOCKED', x, y + 14);
      g.fillStyle = '#888';
      g.font = '10px Arial';
      g.fillText('[' + WEAPONS[key].slot + ']', x, y + 28);
    });
  }

  return { WEAPONS, ORDER, currentWeapon, isWheelOpen, setWheelOpen, selectWeapon, cycleWeapon, playerAimAngle, tryShoot, enemyShoot, hurtPlayer, hurtEnemy, updateBullets, spawnEnemy, updateEnemies, tryToggleCover, findCover, drawEnemies, drawBullets, drawWeaponWheel };
})();
