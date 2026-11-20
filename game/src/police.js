// Solmar City — Solmar PD dispatch: the 0-5 star wanted system, foot cops,
// cruiser pursuit, roadblocks at 3+ stars and the CONDOR-1 police helicopter
// at 4-5 stars. Bust and wasted outcomes live here too.

const Police = (() => {
  // Dispatch flavour: named units the radio chatter references.
  const UNITS = ['Unit 7', 'Unit 12', 'Unit 23', 'Unit 31', 'Unit 44'];
  const DISPATCH_LINES = [
    'All units: suspect flagged near {district}.',
    'CONDOR-1 is airborne, tracking the suspect vehicle.',
    'Roadblock requested on the {district} corridor.',
    'Suspect is armed. Approach with caution.',
    'Air support has eyes on the suspect.',
    'Set up a spike strip, northbound lanes.',
  ];

  let heat = 0; // 0-100 continuous; stars = floor(heat/20) capped at 5
  let lastDispatch = 0;
  let bustTimer = 0;
  let heli = null;
  let roadblocks = [];
  let sirenTimer = 0;

  function wanted() { return Math.min(5, Math.floor(heat / 20)); }
  function getHeat() { return heat; }
  function setHeat(v) { heat = Util.clamp(v, 0, 100); }
  function clearWanted() { heat = 0; bustTimer = 0; despawnAll(); }

  // heatGain: shooting 8, killing a ped 18, killing a cop 25, carjacking 10.
  function addHeat(amount) {
    if (G.state !== 'play') return;
    const before = wanted();
    heat = Util.clamp(heat + amount, 0, 100);
    const after = wanted();
    if (after > before) {
      HUD.toast('WANTED LEVEL ' + after + ' — Solmar PD responding', '#ff5a3c');
      dispatchChatter();
      if (after >= 3) HUD.toast('SPD roadblocks going up — avoid main roads', '#ffb347');
      if (after >= 4) HUD.toast('CONDOR-1 helicopter is on you!', '#ff5a3c');
    }
  }

  function dispatchChatter() {
    const d = City.districtAt(G.player.x, G.player.y).name;
    const line = DISPATCH_LINES[(Math.random() * DISPATCH_LINES.length) | 0].replace('{district}', d);
    HUD.radioLine('SPD DISPATCH: ' + line);
    AudioSys.sirenBlip();
  }

  function despawnAll() {
    G.cops = G.cops.filter(c => c.type !== 'foot' && c.type !== 'cruiser');
    heli = null;
    roadblocks = [];
  }

  function spawnFootCop() {
    const a = Math.random() * Util.TAU;
    const r = 420 + Math.random() * 160;
    let x = G.player.x + Math.cos(a) * r, y = G.player.y + Math.sin(a) * r;
    x = Util.clamp(x, 20, City.W - 20); y = Util.clamp(y, 20, City.WATER_Y - 20);
    if (City.collides(x, y, 10)) { const rp = City.nearestRoadPoint(x, y); x = rp.x; y = rp.y; }
    G.cops.push({ type: 'foot', x, y, angle: 0, hp: 50, speed: 235, shootCd: 1 + Math.random(), unit: UNITS[(Math.random() * UNITS.length) | 0], dead: false });
  }

  function spawnCruiser() {
    const rp = City.nearestRoadPoint(G.player.x + (Math.random() - 0.5) * 900, G.player.y + (Math.random() - 0.5) * 900);
    const car = Vehicles.makeCar('police', rp.x, rp.y, 0, { driver: 'cop' });
    G.cars.push(car);
    G.cops.push({ type: 'cruiser', car, hp: 100, shootCd: 1, unit: UNITS[(Math.random() * UNITS.length) | 0], ramCd: 0, dead: false });
  }

  function spawnRoadblock() {
    // Two cruisers parked across the road ahead of the player's heading.
    const p = G.player;
    const ahead = p.inCar ? p.car.angle : p.angle;
    const rp = City.nearestRoadPoint(p.x + Math.cos(ahead) * 520, p.y + Math.sin(ahead) * 520);
    const vertical = Math.abs(rp.x - p.x) > Math.abs(rp.y - p.y);
    const cars = [];
    for (const off of [-34, 34]) {
      const x = vertical ? rp.x + off : rp.x;
      const y = vertical ? rp.y : rp.y + off;
      const car = Vehicles.makeCar('police', x, y, vertical ? Math.PI / 2 : 0, { driver: null });
      G.cars.push(car);
      cars.push(car);
    }
    roadblocks.push({ x: rp.x, y: rp.y, cars, t: 0 });
    HUD.radioLine('SPD DISPATCH: Roadblock set on ' + City.districtAt(rp.x, rp.y).name + ' road.');
  }

  function spawnHeli() {
    if (heli) return;
    heli = { x: G.player.x - 300, y: G.player.y - 300, angle: 0, hp: 120, spotlight: true, searchT: 0 };
    HUD.radioLine('CONDOR-1: Air One overhead, suspect in sight.');
  }

  function update(dt) {
    const w = wanted();
    // Heat decays only while no cop has line of sight.
    const seen = G.cops.some(c => !c.dead && copSeesPlayer(c)) || (heli && Util.dist(heli.x, heli.y, G.player.x, G.player.y) < 700);
    if (w > 0 && !seen) heat = Math.max(0, heat - dt * 2.2);
    if (w === 0 && G.cops.length) despawnAll();

    // Spawn pressure scales with stars.
    const footWant = w >= 1 ? Math.min(2 + w, 7) : 0;
    const carWant = w >= 2 ? Math.min(w - 1, 4) : 0;
    const feet = G.cops.filter(c => c.type === 'foot' && !c.dead).length;
    const cars = G.cops.filter(c => c.type === 'cruiser' && !c.dead).length;
    if (feet < footWant && Math.random() < dt * 0.9) spawnFootCop();
    if (cars < carWant && Math.random() < dt * 0.7) spawnCruiser();
    if (w >= 3 && roadblocks.length < Math.min(w - 2, 3) && Math.random() < dt * 0.25) spawnRoadblock();
    if (w >= 4 && !heli) spawnHeli();
    if (w < 4 && heli) heli = null;
    // Roadblocks expire.
    for (let i = roadblocks.length - 1; i >= 0; i--) {
      roadblocks[i].t += dt;
      if (roadblocks[i].t > 45 || w < 3) {
        for (const c of roadblocks[i].cars) { const idx = G.cars.indexOf(c); if (idx >= 0) G.cars.splice(idx, 1); }
        roadblocks.splice(i, 1);
      }
    }
    // Dispatch chatter + sirens.
    lastDispatch += dt;
    if (w > 0 && lastDispatch > 14) { lastDispatch = 0; dispatchChatter(); }
    sirenTimer -= dt;
    if (w > 0 && sirenTimer <= 0) { sirenTimer = 3.5 + Math.random() * 2; AudioSys.sirenBlip(); }

    updateCops(dt);
    updateHeli(dt);
    updateBust(dt);
  }

  function copSeesPlayer(c) {
    const px = G.player.x, py = G.player.y;
    const cx = c.type === 'cruiser' ? c.car.x : c.x;
    const cy = c.type === 'cruiser' ? c.car.y : c.y;
    return Util.dist(cx, cy, px, py) < 560;
  }

  function updateCops(dt) {
    const p = G.player;
    for (let i = G.cops.length - 1; i >= 0; i--) {
      const c = G.cops[i];
      if (c.dead) { G.cops.splice(i, 1); continue; }
      if (c.type === 'foot') {
        if (c.hp <= 0) { c.dead = true; Vehicles.Particles.burst(c.x, c.y, 8, '#c94f4f', 100); Economy.addRespect(2); continue; }
        const d = Util.dist(c.x, c.y, p.x, p.y);
        const ang = Util.angleTo(c.x, c.y, p.x, p.y);
        c.angle += Util.angleDiff(c.angle, ang) * Math.min(1, dt * 8);
        // Foot cops sprint to the player but stop at shooting range.
        if (d > 190) {
          const nx = c.x + Math.cos(c.angle) * c.speed * dt;
          const ny = c.y + Math.sin(c.angle) * c.speed * dt;
          if (!City.collides(nx, ny, 10)) { c.x = nx; c.y = ny; }
          else { c.x += Math.cos(c.angle + 1.2) * c.speed * dt * 0.6; c.y += Math.sin(c.angle + 1.2) * c.speed * dt * 0.6; }
        }
        c.shootCd -= dt;
        if (d < 420 && c.shootCd <= 0 && wanted() >= 1) {
          c.shootCd = 0.9 + Math.random() * 0.8;
          Combat.enemyShoot(c.x, c.y, p.x, p.y, 8, 'cop');
        }
      } else if (c.type === 'cruiser') {
        const car = c.car;
        if (car.wreck) { c.dead = true; continue; }
        // Pursuit steering: aim at a point ahead of the player.
        const lead = p.inCar ? 0.45 : 0.15;
        const tx = p.x + (p.inCar ? Math.cos(p.car.angle) * p.car.speed * lead : 0);
        const ty = p.y + (p.inCar ? Math.sin(p.car.angle) * p.car.speed * lead : 0);
        const want = Util.angleTo(car.x, car.y, tx, ty);
        const steer = Util.clamp(Util.angleDiff(car.angle, want) * 2.2, -1, 1);
        const d = Util.dist(car.x, car.y, p.x, p.y);
        Vehicles.drive(car, d > 60 ? 1 : 0.2, steer, dt, false);
        // PIT nudge: tap the player's car sideways.
        c.ramCd -= dt;
        if (p.inCar && d < 70 && c.ramCd <= 0) {
          c.ramCd = 2.5;
          p.car.angle += (Math.random() - 0.5) * 0.5;
          p.car.speed *= 0.82;
          Vehicles.damage(p.car, 8, 'cop');
          AudioSys.crash();
        }
        // Cops shoot from the window at high wanted.
        c.shootCd -= dt;
        if (wanted() >= 3 && d < 380 && c.shootCd <= 0) {
          c.shootCd = 1.4 + Math.random();
          Combat.enemyShoot(car.x, car.y, p.x, p.y, 7, 'cop');
        }
        // Despawn far-away cruisers.
        if (d > 1400 && wanted() < 2) { c.dead = true; const idx = G.cars.indexOf(car); if (idx >= 0) G.cars.splice(idx, 1); }
      }
    }
  }

  function updateHeli(dt) {
    if (!heli) return;
    const p = G.player;
    const d = Util.dist(heli.x, heli.y, p.x, p.y);
    const ang = Util.angleTo(heli.x, heli.y, p.x, p.y);
    heli.angle += Util.angleDiff(heli.angle, ang) * Math.min(1, dt * 2);
    const speed = d > 160 ? 300 : 120;
    heli.x += Math.cos(heli.angle) * speed * dt;
    heli.y += Math.sin(heli.angle) * speed * dt;
    heli.searchT += dt;
    // The spotlight pins the player: heat never decays while it watches.
    if (heli.hp <= 0) {
      Vehicles.Particles.explosion(heli.x, heli.y);
      AudioSys.explosion();
      HUD.toast('CONDOR-1 shot down! +50 respect', '#ffd23f');
      Economy.addRespect(50);
      addHeat(20);
      heli = null;
    }
  }

  function updateBust(dt) {
    if (G.state !== 'play' || G.player.inCar || G.player.dead) { bustTimer = 0; return; }
    const p = G.player;
    // Busted: a foot cop stands next to a slow-moving player for 2 seconds.
    const near = G.cops.some(c => c.type === 'foot' && !c.dead && Util.dist(c.x, c.y, p.x, p.y) < 46);
    const moving = Math.abs(p.vx) + Math.abs(p.vy) > 60;
    if (near && wanted() > 0 && !moving) {
      bustTimer += dt;
      if (bustTimer > 2) {
        G.state = 'busted';
        AudioSys.missionFail();
      }
    } else bustTimer = Math.max(0, bustTimer - dt * 2);
  }

  function getBustProgress() { return Util.clamp(bustTimer / 2, 0, 1); }
  function getHeli() { return heli; }
  function getRoadblocks() { return roadblocks; }

  function draw(g) {
    // Foot cops: navy uniform, badge dot, cap.
    for (const c of G.cops) {
      if (c.type !== 'foot' || c.dead) continue;
      g.save();
      g.translate(c.x, c.y);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.beginPath(); g.ellipse(2, 3, 9, 5, 0, 0, Util.TAU); g.fill();
      g.rotate(c.angle);
      g.fillStyle = '#1d2f57';
      g.beginPath(); g.arc(0, 0, 8, 0, Util.TAU); g.fill();
      g.fillStyle = '#f2c89b';
      g.beginPath(); g.arc(4, 0, 4.5, 0, Util.TAU); g.fill();
      g.fillStyle = '#101c3a';
      g.beginPath(); g.arc(3, 0, 5, Math.PI * 0.9, Math.PI * 2.1); g.fill();
      g.fillStyle = '#ffd23f';
      g.fillRect(6, -2, 3, 4);
      g.restore();
    }
    // Roadblock barriers.
    for (const rb of roadblocks) {
      g.save();
      g.translate(rb.x, rb.y);
      g.fillStyle = '#ff5a3c';
      g.font = 'bold 11px Arial'; g.textAlign = 'center';
      g.fillText('SPD ROADBLOCK', 0, -52);
      g.restore();
    }
    // Helicopter with spotlight cone.
    if (heli) {
      const h = heli;
      g.save();
      // Spotlight on the player.
      const grad = g.createRadialGradient(G.player.x, G.player.y, 10, G.player.x, G.player.y, 120);
      grad.addColorStop(0, 'rgba(255,255,200,0.35)');
      grad.addColorStop(1, 'rgba(255,255,200,0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(G.player.x, G.player.y, 120, 0, Util.TAU); g.fill();
      // Shadow on the ground.
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.beginPath(); g.ellipse(h.x + 26, h.y + 30, 26, 12, h.angle, 0, Util.TAU); g.fill();
      g.translate(h.x, h.y);
      g.rotate(h.angle);
      g.fillStyle = '#1d2f57';
      g.beginPath(); g.ellipse(0, 0, 26, 11, 0, 0, Util.TAU); g.fill();
      g.fillStyle = '#bfe8f2';
      g.beginPath(); g.ellipse(14, 0, 8, 7, 0, 0, Util.TAU); g.fill();
      g.fillStyle = '#f2f2f2';
      g.fillRect(-4, -3, 22, 6);
      // Rotor blur.
      g.strokeStyle = 'rgba(20,20,20,0.5)';
      g.lineWidth = 3;
      const spin = G.time * 40;
      g.beginPath();
      g.moveTo(Math.cos(spin) * -34, Math.sin(spin) * -34);
      g.lineTo(Math.cos(spin) * 34, Math.sin(spin) * 34);
      g.stroke();
      g.fillStyle = '#fff';
      g.font = 'bold 8px Arial'; g.textAlign = 'center';
      g.fillText('CONDOR-1', 0, 3);
      g.restore();
    }
  }

  return { wanted, getHeat, setHeat, clearWanted, addHeat, dispatchChatter, despawnAll, update, draw, getBustProgress, getHeli, getRoadblocks, spawnFootCop, spawnCruiser, spawnRoadblock, spawnHeli };
})();
