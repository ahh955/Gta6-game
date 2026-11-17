// Combat: the player's pistol and fists, bullets that fly and hit cars, cops, rivals and
// walls, and the rival gang members (Los Tiburones) who fight back in the turf-war mission.
// Bullets are simple fast points; hits on buildings spark and die.
import { ENEMY, GUN, PLAYER, WANTED } from './config.js';
import { collideBuildings, insideBuilding } from './world.js';
import { damagePlayer } from './player.js';

export function createEnemy(x, y, rng) {
  return {
    x,
    y,
    angle: rng.range(0, Math.PI * 2),
    health: ENEMY.health,
    fireCooldown: rng.range(0.3, 1),
    state: 'hunt', // 'hunt' | 'shoot' | 'dead'
    r: 13,
    flash: 0,
  };
}

export function spawnEnemies(state, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const ex = x + Math.cos(angle) * (90 + state.rng.range(0, 120));
    const ey = y + Math.sin(angle) * (90 + state.rng.range(0, 120));
    if (insideBuilding(state.city, ex, ey)) continue;
    state.enemies.push(createEnemy(ex, ey, state.rng));
  }
}

function spawnBullet(state, x, y, angle, from, damage) {
  state.bullets.push({
    x,
    y,
    vx: Math.cos(angle) * GUN.bulletSpeed,
    vy: Math.sin(angle) * GUN.bulletSpeed,
    life: GUN.bulletLife,
    from, // 'player' | 'enemy' | 'cop'
    damage,
  });
  state.particles.push({ x, y, vx: 0, vy: 0, life: 0.06, maxLife: 0.06, color: '#ffd94a', size: 10, kind: 'flash' });
}

export function playerShoot(state) {
  const player = state.player;
  if (player.car || player.reloading > 0 || player.fireCooldown > 0) return;
  if (player.ammo <= 0) {
    player.reloading = GUN.reloadSeconds;
    state.events.push({ type: 'reload' });
    return;
  }
  player.ammo -= 1;
  player.fireCooldown = GUN.fireCooldown;
  const spread = (state.rng.next() - 0.5) * 2 * GUN.spread;
  const mx = player.x + Math.cos(player.aimAngle) * 20;
  const my = player.y + Math.sin(player.aimAngle) * 20;
  spawnBullet(state, mx, my, player.aimAngle + spread, 'player', GUN.bulletDamage);
  state.events.push({ type: 'shot', x: mx, y: my });
  // A shot near a cop is a crime.
  for (const cop of state.cops) {
    if (Math.hypot(cop.x - player.x, cop.y - player.y) < 400) {
      state.wanted.points += WANTED.shootNearCop;
      break;
    }
  }
}

export function playerPunch(state) {
  const player = state.player;
  if (player.car || player.punchCooldown > 0) return;
  player.punchCooldown = PLAYER.punchCooldown;
  const px = player.x + Math.cos(player.aimAngle) * PLAYER.punchRange;
  const py = player.y + Math.sin(player.aimAngle) * PLAYER.punchRange;
  state.events.push({ type: 'punch', x: px, y: py });
  let hit = false;
  for (const enemy of state.enemies) {
    if (enemy.state === 'dead') continue;
    if (Math.hypot(enemy.x - px, enemy.y - py) < 30) {
      enemy.health -= PLAYER.punchDamage;
      enemy.flash = 0.15;
      hit = true;
    }
  }
  for (const cop of state.cops) {
    if (Math.hypot(cop.x - px, cop.y - py) < 30) {
      cop.health -= PLAYER.punchDamage;
      state.wanted.points += WANTED.hitCop;
      hit = true;
    }
  }
  for (const ped of state.peds) {
    if (ped.state === 'down') continue;
    if (Math.hypot(ped.x - px, ped.y - py) < 28) {
      ped.state = 'down';
      ped.downTimer = 5;
      state.wanted.points += WANTED.hitPed;
      hit = true;
    }
  }
  if (hit) state.events.push({ type: 'hitLanded', x: px, y: py });
}

function bulletHitsBuilding(state, bullet, dt) {
  const steps = 3;
  for (let i = 1; i <= steps; i += 1) {
    const x = bullet.x + (bullet.vx * dt * i) / steps;
    const y = bullet.y + (bullet.vy * dt * i) / steps;
    if (insideBuilding(state.city, x, y)) return { x, y };
  }
  return null;
}

function updateBullet(state, bullet, dt) {
  const wall = bulletHitsBuilding(state, bullet, dt);
  if (wall) {
    state.particles.push({ x: wall.x, y: wall.y, vx: 0, vy: 0, life: 0.2, maxLife: 0.2, color: '#ffd94a', size: 5, kind: 'spark' });
    return false;
  }
  bullet.x += bullet.vx * dt;
  bullet.y += bullet.vy * dt;
  bullet.life -= dt;
  if (bullet.life <= 0) return false;

  if (bullet.from === 'player') {
    for (const enemy of state.enemies) {
      if (enemy.state === 'dead') continue;
      if (Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < 16) {
        enemy.health -= bullet.damage;
        enemy.flash = 0.15;
        state.events.push({ type: 'hitLanded', x: bullet.x, y: bullet.y });
        if (enemy.health <= 0) {
          enemy.state = 'dead';
          state.events.push({ type: 'enemyDown', x: enemy.x, y: enemy.y });
          state.pickups.push({ x: enemy.x, y: enemy.y, kind: 'cash', amount: 50 + state.rng.int(0, 100) });
        }
        return false;
      }
    }
    for (const cop of state.cops) {
      if (Math.hypot(cop.x - bullet.x, cop.y - bullet.y) < 16) {
        cop.health -= bullet.damage;
        state.wanted.points += WANTED.hitCop;
        if (cop.health <= 0) {
          cop.down = true;
          state.wanted.points += WANTED.killCop;
          state.events.push({ type: 'copDown', x: cop.x, y: cop.y });
        }
        return false;
      }
    }
    for (const car of state.cars) {
      if (car === state.player.car) continue;
      if (Math.hypot(car.x - bullet.x, car.y - bullet.y) < 26) {
        car.hp = Math.max(0, car.hp - bullet.damage * 0.4);
        state.events.push({ type: 'hitLanded', x: bullet.x, y: bullet.y });
        return false;
      }
    }
    for (const ped of state.peds) {
      if (ped.state === 'down') continue;
      if (Math.hypot(ped.x - bullet.x, ped.y - bullet.y) < 14) {
        ped.state = 'down';
        ped.downTimer = 8;
        state.wanted.points += WANTED.killPed;
        return false;
      }
    }
  } else {
    // Enemy and cop bullets can only hurt the player.
    const player = state.player;
    if (!player.car && Math.hypot(player.x - bullet.x, player.y - bullet.y) < 15) {
      if (damagePlayer(state, bullet.damage)) state.events.push({ type: 'wasted' });
      return false;
    }
    if (player.car && Math.hypot(player.car.x - bullet.x, player.car.y - bullet.y) < 28) {
      player.car.hp = Math.max(0, player.car.hp - bullet.damage * 0.3);
      return false;
    }
  }
  return true;
}

export function updateBullets(state, dt) {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    if (!updateBullet(state, state.bullets[i], dt)) state.bullets.splice(i, 1);
  }
}

function updateEnemy(state, enemy, dt) {
  if (enemy.state === 'dead') return;
  if (enemy.flash > 0) enemy.flash -= dt;
  enemy.fireCooldown -= dt;
  const player = state.player;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy);
  enemy.angle = Math.atan2(dy, dx);
  if (dist > ENEMY.shootRange) {
    enemy.state = 'hunt';
    enemy.x += (dx / dist) * ENEMY.speed * dt;
    enemy.y += (dy / dist) * ENEMY.speed * dt;
  } else {
    enemy.state = 'shoot';
    // Strafe a little so they are not standing targets.
    const strafe = Math.sin(state.time * 1.7 + enemy.x) * 30;
    enemy.x += -Math.sin(enemy.angle) * strafe * dt;
    enemy.y += Math.cos(enemy.angle) * strafe * dt;
    if (enemy.fireCooldown <= 0 && dist < ENEMY.shootRange) {
      enemy.fireCooldown = ENEMY.fireCooldown * state.rng.range(0.8, 1.3);
      const spread = (state.rng.next() - 0.5) * 0.22;
      spawnBullet(state, enemy.x, enemy.y, enemy.angle + spread, 'enemy', ENEMY.bulletDamage);
      state.events.push({ type: 'shot', x: enemy.x, y: enemy.y });
    }
  }
  const circle = { x: enemy.x, y: enemy.y, r: enemy.r };
  collideBuildings(state.city, circle);
  enemy.x = circle.x;
  enemy.y = circle.y;
}

export function updateEnemies(state, dt) {
  for (const enemy of state.enemies) updateEnemy(state, enemy, dt);
  // Clear the dead once the mission that spawned them is done.
  if (state.mission.index > 3 || !state.mission.active) {
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      if (state.enemies[i].state === 'dead') state.enemies.splice(i, 1);
    }
  }
}

export function updatePickups(state, dt) {
  const player = state.player;
  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const p = state.pickups[i];
    p.bob = (p.bob || 0) + dt;
    if (Math.hypot(p.x - player.x, p.y - player.y) < 34) {
      if (p.kind === 'cash') {
        player.money += p.amount;
        state.events.push({ type: 'pickup', text: `+$${p.amount}` });
      } else if (p.kind === 'health') {
        player.health = Math.min(100, player.health + 40);
        state.events.push({ type: 'pickup', text: '+40 health' });
      } else if (p.kind === 'ammo') {
        player.ammo = GUN.magazine;
        player.reloading = 0;
        state.events.push({ type: 'pickup', text: 'Ammo refilled' });
      }
      state.pickups.splice(i, 1);
    }
  }
}
