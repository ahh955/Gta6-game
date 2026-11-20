// Solmar City — vehicles: car models, traffic flow, arcade driving physics,
// damage, explosions and burning wrecks.

const Vehicles = (() => {
  // name, top speed px/s, acceleration, handling, body length/width, colours
  const MODELS = {
    sedan:   { name: 'Solmar Sedan',   top: 430, accel: 260, grip: 2.6, len: 46, wid: 22, colors: ['#c94f4f', '#4f7dc9', '#e8e4da', '#7a8a99'] },
    taxi:    { name: 'Bay Cab',        top: 420, accel: 250, grip: 2.6, len: 46, wid: 22, colors: ['#f2c230'] },
    coupe:   { name: 'Sunset Coupe',   top: 500, accel: 320, grip: 3.0, len: 46, wid: 22, colors: ['#d94f9e', '#3fb8a9', '#f2f2f2'] },
    sport:   { name: 'Viento GT',      top: 620, accel: 420, grip: 3.4, len: 48, wid: 22, colors: ['#e83a2f', '#2f6fe8', '#ffd23f', '#222'] },
    pickup:  { name: 'Rancher 4x4',    top: 400, accel: 240, grip: 2.4, len: 52, wid: 24, colors: ['#6b8e4e', '#8a5a3b', '#b8b0a0'] },
    van:     { name: 'Cargo Van',      top: 360, accel: 200, grip: 2.2, len: 56, wid: 24, colors: ['#e8e4da', '#7a8a99', '#4f7dc9'] },
    police:  { name: 'SPD Interceptor', top: 560, accel: 400, grip: 3.3, len: 48, wid: 22, colors: ['#101418'] },
    muscle:  { name: 'Kingfisher V8',  top: 540, accel: 380, grip: 2.7, len: 50, wid: 24, colors: ['#7a2fd9', '#e86a2f', '#222'] },
  };

  let nextId = 1;

  function makeCar(model, x, y, angle, opts) {
    opts = opts || {};
    const def = MODELS[model] || MODELS.sedan;
    const color = opts.color || def.colors[Math.floor(Math.random() * def.colors.length)];
    return {
      id: nextId++, model, def, name: def.name, x, y, angle: angle || 0,
      speed: 0, hp: 100, maxHp: 100, color,
      driver: opts.driver || null, // 'player' | 'traffic' | 'cop' | 'racer' | null (parked)
      burning: false, burnTime: 0, wreck: false, dead: false,
      siren: model === 'police', sirenPhase: Math.random() * 10,
      // Traffic lane-following:
      road: opts.road || null, dir: opts.dir || 1, lane: opts.lane || 0,
      upgrade: opts.upgrade || { engine: 0, armor: 0, tires: 0 },
      locked: !!opts.locked,
    };
  }

  function topSpeed(car) {
    let t = car.def.top;
    if (car.upgrade) t += car.upgrade.engine * 55;
    if (car.hp < 30) t *= 0.55;
    return t;
  }

  function drive(car, throttle, steer, dt, handbrake) {
    const def = car.def;
    const grip = def.grip + (car.upgrade ? car.upgrade.tires * 0.45 : 0);
    if (throttle > 0) car.speed += def.accel * throttle * dt * (1 + (car.upgrade ? car.upgrade.engine * 0.18 : 0));
    else if (throttle < 0) {
      if (car.speed > 20) car.speed -= def.accel * 1.6 * dt; // brake
      else car.speed = Math.max(-140, car.speed + def.accel * 0.7 * throttle * dt); // reverse
    }
    // Drag + rolling friction.
    car.speed -= car.speed * (handbrake ? 1.6 : 0.55) * dt;
    if (Math.abs(car.speed) < 4 && throttle === 0) car.speed = 0;
    car.speed = Util.clamp(car.speed, -150, topSpeed(car));
    const spdF = Util.clamp(Math.abs(car.speed) / 240, 0, 1);
    car.angle += steer * grip * spdF * dt * (car.speed < 0 ? -1 : 1) * (handbrake ? 1.5 : 1);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const p = { x: nx, y: ny };
    const hitWall = City.collides(p.x, p.y, car.def.len * 0.42);
    if (hitWall) {
      City.resolve(p, car.def.len * 0.42);
      if (Math.abs(car.speed) > 180) {
        damage(car, Math.abs(car.speed) * 0.06, null);
        AudioSys.crash();
        Particles.burst(car.x, car.y, 8, '#ffb347', 120);
        if (car.driver === 'player') Police.addHeat(0.2);
      }
      car.speed *= 0.35;
    }
    car.x = p.x; car.y = p.y;
  }

  function damage(car, amount, source) {
    if (car.wreck || car.dead) return;
    const armor = car.upgrade ? car.upgrade.armor : 0;
    car.hp -= amount * (1 - armor * 0.15);
    if (car.hp <= 35 && !car.burning) {
      car.burning = true; car.burnTime = 0;
      if (car.driver === 'player') HUD.toast('Your car is on fire! Bail out!', '#ff5a3c');
    }
    if (car.hp <= 0) explode(car);
  }

  function explode(car) {
    if (car.wreck) return;
    car.wreck = true; car.burning = false; car.hp = 0; car.speed = 0;
    car.driver = null;
    AudioSys.explosion();
    Particles.explosion(car.x, car.y);
    // Blast hurts nearby people.
    const hurt = (px, py, dmg) => {
      if (Util.dist(px, py, car.x, car.y) < 130) return dmg;
      return 0;
    };
    if (G && G.player) {
      const d = hurt(G.player.x, G.player.y, 45);
      if (d && !G.player.inCar) Combat.hurtPlayer(d, 'explosion');
      else if (d && G.player.inCar && G.player.car !== car) Combat.hurtPlayer(d * 0.5, 'explosion');
    }
    if (G) {
      for (const e of G.enemies) if (Util.dist(e.x, e.y, car.x, car.y) < 130) Combat.hurtEnemy(e, 90);
      for (const c of G.cops) if (c.type === 'foot' && Util.dist(c.x, c.y, car.x, car.y) < 130) c.hp -= 90;
    }
    G.wrecks.push({ x: car.x, y: car.y, angle: car.angle, color: '#1c1c1e', model: car.model, t: 0 });
    // Chain reaction: nearby cars catch fire.
    for (const o of G.cars) {
      if (o !== car && !o.wreck && Util.dist(o.x, o.y, car.x, car.y) < 120) {
        o.hp = Math.min(o.hp, 28); o.burning = true;
      }
    }
  }

  // --- Traffic ---
  function spawnTraffic(n) {
    const rng = Util.makeRng((Math.random() * 1e9) | 0);
    const models = ['sedan', 'sedan', 'taxi', 'coupe', 'pickup', 'van', 'muscle'];
    for (let i = 0; i < n; i++) {
      const pt = City.randomRoadPoint(rng);
      const model = Util.pick(rng, models);
      const dir = rng() < 0.5 ? 1 : -1;
      const lane = (rng() < 0.5 ? -1 : 1) * 22;
      const angle = pt.vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
      const car = makeCar(model, pt.vertical ? pt.x + lane : pt.x, pt.vertical ? pt.y : pt.y + lane, angle, {
        driver: 'traffic', road: pt, dir, lane,
      });
      car.speed = Util.range(rng, 120, 220);
      G.cars.push(car);
    }
  }

  function updateTraffic(car, dt) {
    if (car.wreck) return;
    // Follow the road; at an intersection sometimes turn onto the crossing road.
    const pt = car.road;
    if (pt.vertical) {
      car.y += car.dir * car.speed * dt;
      car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      car.x += (pt.x + car.lane - car.x) * Math.min(1, dt * 2);
      for (const ry of City.H_ROADS) {
        if (Math.abs(car.y - ry) < 6 && Math.random() < 0.25) {
          car.road = { x: car.x, y: ry, vertical: false };
          car.dir = Math.random() < 0.5 ? 1 : -1;
          car.lane = (Math.random() < 0.5 ? -1 : 1) * 22;
          car.y = ry + car.lane;
          break;
        }
      }
      if (car.y < -80) car.y = City.BEACH_Y + 40;
      if (car.y > City.BEACH_Y + 80) car.y = -40;
    } else {
      car.x += car.dir * car.speed * dt;
      car.angle = car.dir > 0 ? 0 : Math.PI;
      car.y += (pt.y + car.lane - car.y) * Math.min(1, dt * 2);
      for (const rx of City.V_ROADS) {
        if (Math.abs(car.x - rx) < 6 && Math.random() < 0.25) {
          car.road = { x: rx, y: car.y, vertical: true };
          car.dir = Math.random() < 0.5 ? 1 : -1;
          car.lane = (Math.random() < 0.5 ? -1 : 1) * 22;
          car.x = rx + car.lane;
          break;
        }
      }
      if (car.x < -80) car.x = City.W + 40;
      if (car.x > City.W + 80) car.x = -40;
    }
    // Slow down for the car ahead.
    let slow = false;
    for (const o of G.cars) {
      if (o === car || o.wreck) continue;
      const d = Util.dist(car.x, car.y, o.x, o.y);
      if (d < 70) {
        const ahead = Math.cos(Util.angleDiff(car.angle, Util.angleTo(car.x, car.y, o.x, o.y)));
        if (ahead > 0.7) { slow = true; break; }
      }
    }
    const target = slow ? 0 : 170;
    car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
  }

  function updateBurning(car, dt) {
    if (!car.burning || car.wreck) return;
    car.burnTime += dt;
    car.hp -= 7 * dt;
    if (Math.random() < dt * 22) {
      Particles.spawn(car.x + (Math.random() * 28 - 14), car.y + (Math.random() * 20 - 10), {
        vx: Math.random() * 40 - 20, vy: -(30 + Math.random() * 50),
        life: 0.3 + Math.random() * 0.4, size: 4 + Math.random() * 5,
        color: Math.random() < 0.5 ? '#ff7b2f' : '#ffd23f', kind: 'fire',
      });
    }
    if (Math.random() < dt * 6) {
      Particles.spawn(car.x, car.y - 6, {
        vx: Math.random() * 16 - 8, vy: -(20 + Math.random() * 20),
        life: 0.8 + Math.random() * 0.8, size: 8 + Math.random() * 8,
        color: 'rgba(40,40,40,0.5)', kind: 'smoke',
      });
    }
    if (car.hp <= 0) explode(car);
  }

  function drawCar(g, car) {
    const def = car.def;
    g.save();
    g.translate(car.x, car.y);
    g.rotate(car.angle);
    // Shadow.
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.fillRect(-def.len / 2 + 3, -def.wid / 2 + 4, def.len, def.wid);
    // Body.
    g.fillStyle = car.wreck ? '#242424' : car.color;
    roundRect(g, -def.len / 2, -def.wid / 2, def.len, def.wid, 7);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 1.5;
    g.stroke();
    // Cabin / windshield.
    g.fillStyle = car.wreck ? '#111' : '#bfe8f2';
    roundRect(g, -def.len / 2 + 13, -def.wid / 2 + 4, def.len - 30, def.wid - 8, 4);
    g.fill();
    g.fillStyle = car.wreck ? '#1a1a1a' : shadeColor(car.color, -30);
    g.fillRect(-def.len / 2 + 2, -def.wid / 2 + 3, 7, def.wid - 6);
    g.fillRect(def.len / 2 - 9, -def.wid / 2 + 3, 7, def.wid - 6);
    // Headlights.
    g.fillStyle = '#fff6b8';
    g.fillRect(def.len / 2 - 3, -def.wid / 2 + 2, 3, 5);
    g.fillRect(def.len / 2 - 3, def.wid / 2 - 7, 3, 5);
    if (car.model === 'taxi') {
      g.fillStyle = '#111';
      g.font = 'bold 8px Arial'; g.textAlign = 'center';
      g.fillText('TAXI', 0, 3);
    }
    if (car.model === 'police') {
      g.fillStyle = '#f2f2f2';
      g.fillRect(-def.len / 2 + 8, -def.wid / 2 + 2, def.len - 16, 5);
      g.fillRect(-def.len / 2 + 8, def.wid / 2 - 7, def.len - 16, 5);
      g.fillStyle = '#1d4ed8';
      g.font = 'bold 8px Arial'; g.textAlign = 'center';
      g.fillText('SPD', 0, 3);
      // Flashing light bar.
      const on = Math.floor(G.time * 6 + car.sirenPhase) % 2 === 0;
      g.fillStyle = on ? '#ff2f2f' : '#2f6fff';
      g.fillRect(-6, -def.wid / 2 - 1, 12, 4);
      g.fillStyle = on ? 'rgba(255,47,47,0.25)' : 'rgba(47,111,255,0.25)';
      g.beginPath(); g.arc(0, 0, 34, 0, Util.TAU); g.fill();
    }
    // Damage smoke / scorch.
    if (car.hp < 50 && !car.wreck) {
      g.fillStyle = 'rgba(20,20,20,0.35)';
      g.beginPath(); g.arc(def.len / 2 - 8, 0, 8, 0, Util.TAU); g.fill();
    }
    g.restore();
    // Fire glow on a burning car.
    if (car.burning) {
      g.fillStyle = 'rgba(255,120,30,' + (0.25 + Math.random() * 0.2) + ')';
      g.beginPath(); g.arc(car.x, car.y, 30, 0, Util.TAU); g.fill();
    }
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function shadeColor(hex, amt) {
    if (hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16);
    const r = Util.clamp((n >> 16) + amt, 0, 255), g2 = Util.clamp(((n >> 8) & 255) + amt, 0, 255), b = Util.clamp((n & 255) + amt, 0, 255);
    return 'rgb(' + r + ',' + g2 + ',' + b + ')';
  }

  // Particles live here so vehicles and combat share one system.
  const Particles = (() => {
    function spawn(x, y, o) {
      if (G.particles.length > 500) return;
      G.particles.push({ x, y, vx: o.vx || 0, vy: o.vy || 0, life: o.life || 0.5, maxLife: o.life || 0.5, size: o.size || 4, color: o.color || '#fff', kind: o.kind || 'dot', grav: o.grav || 0 });
    }
    function burst(x, y, n, color, speed) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Util.TAU, s = speed * (0.3 + Math.random() * 0.7);
        spawn(x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.25 + Math.random() * 0.35, size: 2 + Math.random() * 3, color, grav: 300 });
      }
    }
    function explosion(x, y) {
      burst(x, y, 26, '#ff7b2f', 260);
      burst(x, y, 18, '#ffd23f', 180);
      burst(x, y, 12, '#5a5a5a', 90);
      for (let i = 0; i < 8; i++) spawn(x, y, { vx: Math.random() * 80 - 40, vy: -10 - Math.random() * 50, life: 0.8 + Math.random(), size: 10 + Math.random() * 10, color: 'rgba(30,30,30,0.55)', kind: 'smoke' });
      G.shake = Math.min(14, G.shake + 10);
    }
    function update(dt) {
      for (let i = G.particles.length - 1; i >= 0; i--) {
        const p = G.particles[i];
        p.life -= dt;
        if (p.life <= 0) { G.particles.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += p.grav * dt;
        p.vx *= (1 - dt * 1.5); p.vy *= (1 - dt * 0.5);
      }
    }
    function draw(g) {
      for (const p of G.particles) {
        const a = Util.clamp(p.life / p.maxLife, 0, 1);
        g.globalAlpha = p.kind === 'smoke' ? a * 0.6 : a;
        g.fillStyle = p.color;
        g.beginPath();
        g.arc(p.x, p.y, p.size * (p.kind === 'smoke' ? (1.6 - a * 0.6) : 1), 0, Util.TAU);
        g.fill();
      }
      g.globalAlpha = 1;
    }
    return { spawn, burst, explosion, update, draw };
  })();

  return { MODELS, makeCar, topSpeed, drive, damage, explode, spawnTraffic, updateTraffic, updateBurning, drawCar, Particles };
})();
