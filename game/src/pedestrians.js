// Solmar City — pedestrians: sidewalk walkers, beachgoers, panicked crowds
// that flee gunfire and explosions.

const Pedestrians = (() => {
  const SHIRTS = ['#e8635a', '#5aa2e8', '#7ec850', '#e8c85a', '#b45ae8', '#5ad9c8', '#f2f2f2', '#ff9e5a'];
  const PANTS = ['#2f3a4a', '#5a4a3a', '#3a5a7a', '#6a6a6a', '#7a3a5a'];
  const SKINS = ['#f2c89b', '#d9a06b', '#a06b3f', '#8a5a30', '#e8b88a'];

  function makePed(x, y) {
    return {
      x, y, angle: Math.random() * Util.TAU,
      speed: 40 + Math.random() * 40,
      shirt: SHIRTS[(Math.random() * SHIRTS.length) | 0],
      pants: PANTS[(Math.random() * PANTS.length) | 0],
      skin: SKINS[(Math.random() * SKINS.length) | 0],
      state: 'walk', // walk | flee | cower
      tx: x, ty: y, retarget: 0, panic: 0, dead: false, walkPhase: Math.random() * 10,
    };
  }

  function spawnInitial(n) {
    for (let i = 0; i < n; i++) {
      // Peds walk on sidewalks beside roads and on the beachfront.
      let x, y, tries = 0;
      do {
        x = Math.random() * City.W;
        y = Math.random() * City.BEACH_Y;
        tries++;
      } while (tries < 12 && (City.collides(x, y, 10) || City.isRoad(x, y)));
      G.peds.push(makePed(x, y));
    }
    // Beachgoers.
    for (let i = 0; i < 10; i++) {
      G.peds.push(makePed(100 + Math.random() * (City.W - 200), City.BEACH_Y + 30 + Math.random() * 120));
    }
  }

  function panicAt(x, y, radius) {
    for (const p of G.peds) {
      if (Util.dist(p.x, p.y, x, y) < radius) {
        p.state = 'flee';
        p.panic = 3 + Math.random() * 3;
        const a = Util.angleTo(x, y, p.x, p.y) + (Math.random() - 0.5);
        p.tx = p.x + Math.cos(a) * 300;
        p.ty = p.y + Math.sin(a) * 300;
      }
    }
  }

  function update(dt) {
    for (const p of G.peds) {
      if (p.dead) continue;
      p.walkPhase += dt * (p.state === 'flee' ? 14 : 7);
      if (p.state === 'flee') {
        p.panic -= dt;
        if (p.panic <= 0) p.state = 'walk';
      }
      const speed = p.state === 'flee' ? p.speed * 2.4 : p.speed;
      p.retarget -= dt;
      if (p.retarget <= 0 || Util.dist(p.x, p.y, p.tx, p.ty) < 12) {
        if (p.state === 'walk') {
          const a = Math.random() * Util.TAU;
          p.tx = p.x + Math.cos(a) * (80 + Math.random() * 160);
          p.ty = p.y + Math.sin(a) * (80 + Math.random() * 160);
        }
        p.retarget = 2 + Math.random() * 3;
      }
      const targetAngle = Util.angleTo(p.x, p.y, p.tx, p.ty);
      p.angle += Util.angleDiff(p.angle, targetAngle) * Math.min(1, dt * 6);
      const nx = p.x + Math.cos(p.angle) * speed * dt;
      const ny = p.y + Math.sin(p.angle) * speed * dt;
      if (!City.collides(nx, ny, 9)) { p.x = nx; p.y = ny; }
      else { p.retarget = 0; }
      p.x = Util.clamp(p.x, 10, City.W - 10);
      p.y = Util.clamp(p.y, 10, City.WATER_Y - 10);
    }
    // Keep the streets populated near the player.
    if (G.peds.filter(p => !p.dead).length < 34) {
      const pt = City.randomRoadPoint(Math.random);
      const px = pt.vertical ? pt.x + 70 : pt.x;
      const py = pt.vertical ? pt.y : pt.y + 70;
      if (!City.collides(px, py, 10)) G.peds.push(makePed(px, py));
    }
  }

  function draw(g) {
    for (const p of G.peds) {
      if (p.dead) continue;
      g.save();
      g.translate(p.x, p.y);
      // Shadow.
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.beginPath(); g.ellipse(2, 3, 9, 5, 0, 0, Util.TAU); g.fill();
      const swing = Math.sin(p.walkPhase) * 3;
      g.rotate(p.angle);
      // Legs (two small rects swinging).
      g.fillStyle = p.pants;
      g.fillRect(-4, -6 + swing * 0.4, 8, 4);
      g.fillRect(-4, 2 - swing * 0.4, 8, 4);
      // Body.
      g.fillStyle = p.shirt;
      g.beginPath(); g.arc(0, 0, 7, 0, Util.TAU); g.fill();
      // Head.
      g.fillStyle = p.skin;
      g.beginPath(); g.arc(4, 0, 4.5, 0, Util.TAU); g.fill();
      // Panic marker.
      if (p.state === 'flee') {
        g.fillStyle = '#ff2f2f';
        g.font = 'bold 12px Arial'; g.textAlign = 'center';
        g.fillText('!', -8, -8);
      }
      g.restore();
    }
  }

  return { makePed, spawnInitial, panicAt, update, draw };
})();
