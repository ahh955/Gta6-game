// Solmar City — the crew: three recruitable allies with signature abilities.
// Maya drives, Ghost hacks the SPD network, Lou fights beside you.

const Crew = (() => {
  const MEMBERS = {
    maya: {
      name: 'Maya Reyes', role: 'Wheelwoman', color: '#e8635a',
      ability: 'Getaway Car', abilityKey: '7',
      desc: 'Calls in a tuned Viento GT getaway car to your location.',
      cooldown: 45,
    },
    ghost: {
      name: 'Ghost Tanaka', role: 'Hacker', color: '#5ad9c8',
      ability: 'SPD Hack', abilityKey: '8',
      desc: 'Wipes the SPD dispatch board: drops your wanted level by 2 stars.',
      cooldown: 60,
    },
    lou: {
      name: 'Big Lou Marín', role: 'Muscle', color: '#7ec850',
      ability: 'Backup', abilityKey: '9',
      desc: 'Lou shows up with a shotgun and fights beside you for 60 seconds.',
      cooldown: 75,
    },
  };

  let cooldowns = { maya: 0, ghost: 0, lou: 0 };
  let allies = [];

  function recruited(id) { return !!G.crew[id]; }
  function recruit(id) {
    if (G.crew[id]) return;
    G.crew[id] = true;
    const m = MEMBERS[id];
    HUD.toast(m.name + ' joined your crew! Press ' + m.abilityKey + ' for ' + m.ability, '#7ec850');
    Economy.addRespect(25);
  }
  function getAllies() { return allies; }
  function cooldownLeft(id) { return Math.max(0, cooldowns[id]); }

  function useAbility(id) {
    if (!recruited(id)) { HUD.toast(MEMBERS[id].name + ' is not in your crew yet', '#ffb347'); return; }
    if (cooldowns[id] > 0) { HUD.toast(MEMBERS[id].ability + ' recharging: ' + Math.ceil(cooldowns[id]) + 's', '#ffb347'); return; }
    cooldowns[id] = MEMBERS[id].cooldown;
    const p = G.player;
    if (id === 'maya') {
      const rp = City.nearestRoadPoint(p.x + 120, p.y);
      const car = Vehicles.makeCar('sport', rp.x, rp.y, 0, { driver: null, upgrade: { engine: 2, armor: 1, tires: 2 }, color: '#e83a2f' });
      G.cars.push(car);
      HUD.toast('Maya: "Getaway car is on the road, boss."', '#e8635a');
      HUD.radioLine('MAYA: Viento GT waiting nearby.');
      AudioSys.horn();
    } else if (id === 'ghost') {
      Police.setHeat(Math.max(0, Police.getHeat() - 40));
      HUD.toast('Ghost: "Dispatch board wiped. You are a ghost."', '#5ad9c8');
      HUD.radioLine('GHOST: SPD cameras looped for 60 seconds.');
      AudioSys.pickup();
    } else if (id === 'lou') {
      allies.push({
        id: 'lou', x: p.x + 30, y: p.y + 30, angle: 0, hp: 150, speed: 260,
        shootCd: 0.5, t: 60, dead: false,
      });
      HUD.toast('Lou: "I got your back, boss!"', '#7ec850');
      AudioSys.pickup();
    }
  }

  // Lou follows the player and shoots the nearest enemy.
  function updateAllies(dt) {
    const p = G.player;
    for (let i = allies.length - 1; i >= 0; i--) {
      const a = allies[i];
      a.t -= dt;
      if (a.t <= 0 || a.dead) { allies.splice(i, 1); continue; }
      // Find nearest enemy.
      let target = null, bd = 520;
      for (const e of G.enemies) {
        if (e.dead) continue;
        const d = Util.dist(a.x, a.y, e.x, e.y);
        if (d < bd) { bd = d; target = e; }
      }
      if (!target) {
        for (const c of G.cops) {
          if (c.type !== 'foot' || c.dead) continue;
          const d = Util.dist(a.x, a.y, c.x, c.y);
          if (d < bd) { bd = d; target = c; }
        }
      }
      if (target) {
        const ang = Util.angleTo(a.x, a.y, target.x, target.y);
        a.angle += Util.angleDiff(a.angle, ang) * Math.min(1, dt * 8);
        if (bd > 240) {
          const nx = a.x + Math.cos(a.angle) * a.speed * dt;
          const ny = a.y + Math.sin(a.angle) * a.speed * dt;
          if (!City.collides(nx, ny, 10)) { a.x = nx; a.y = ny; }
        }
        a.shootCd -= dt;
        if (a.shootCd <= 0 && bd < 460) {
          a.shootCd = 0.7;
          Combat.enemyShoot(a.x, a.y, target.x, target.y, 16, 'ally');
        }
      } else {
        // No target: follow the player.
        const d = Util.dist(a.x, a.y, p.x, p.y);
        if (d > 70) {
          const ang = Util.angleTo(a.x, a.y, p.x, p.y);
          a.angle += Util.angleDiff(a.angle, ang) * Math.min(1, dt * 8);
          const nx = a.x + Math.cos(a.angle) * a.speed * dt;
          const ny = a.y + Math.sin(a.angle) * a.speed * dt;
          if (!City.collides(nx, ny, 10)) { a.x = nx; a.y = ny; }
        }
      }
    }
    for (const k in cooldowns) cooldowns[k] = Math.max(0, cooldowns[k] - dt);
  }

  function drawAllies(g) {
    for (const a of allies) {
      g.save();
      g.translate(a.x, a.y);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.beginPath(); g.ellipse(2, 3, 10, 6, 0, 0, Util.TAU); g.fill();
      g.rotate(a.angle);
      g.fillStyle = '#7ec850';
      g.beginPath(); g.arc(0, 0, 10, 0, Util.TAU); g.fill();
      g.fillStyle = '#f2c89b';
      g.beginPath(); g.arc(5, 0, 5, 0, Util.TAU); g.fill();
      g.fillStyle = '#222';
      g.fillRect(9, -2, 12, 4);
      g.restore();
      g.fillStyle = '#fff';
      g.font = 'bold 10px Arial'; g.textAlign = 'center';
      g.fillText('LOU', a.x, a.y - 16);
    }
  }

  return { MEMBERS, recruited, recruit, getAllies, cooldownLeft, useAbility, updateAllies, drawAllies };
})();
