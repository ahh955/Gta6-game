// Solmar City — combat: the pistol, fists, bullets, gang members who shoot
// back, and the particles that make a hit feel like a hit.

import { CFG } from './config.js';
import { collideBuildings } from './world.js';
import { damagePlayer } from './player.js';
import { addWanted } from './police.js';
import { scarePeds } from './traffic.js';

export function createCombat() {
  return {
    bullets: [],
    enemies: [],
    particles: [],
    lastShotWantedAt: -99,
  };
}

export function spawnParticles(game, x, y, count, color, life = 0.6) {
  for (let k = 0; k < count; k += 1) {
    const angle = game.rng.range(0, Math.PI * 2);
    const speed = game.rng.range(20, 120);
    game.combat.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 20,
      life: life * game.rng.range(0.6, 1.2),
      maxLife: life,
      size: game.rng.range(2, 5),
      color,
    });
  }
}

export function playerShoot(game) {
  const player = game.player;
  if (player.weapon !== 'gun') return;
  if (player.reloading || player.fireTimer > 0) return;
  if (player.ammo <= 0) {
    // Dry fire: start a reload.
    player.reloading = true;
    player.reloadEndsAt = game.time + CFG.pistolReloadTime;
    return;
  }
  player.fireTimer = CFG.pistolFireInterval;
  player.ammo -= 1;
  const mx = game.camera.x + game.input.mouseX;
  const my = game.camera.y + game.input.mouseY;
  const angle = Math.atan2(my - player.y, mx - player.x);
  player.angle = angle;
  const gx = player.x + Math.cos(angle) * 20;
  const gy = player.y + Math.sin(angle) * 20;
  game.combat.bullets.push({
    x: gx,
    y: gy,
    vx: Math.cos(angle) * CFG.bulletSpeed,
    vy: Math.sin(angle) * CFG.bulletSpeed,
    from: 'player',
    life: CFG.pistolRange / CFG.bulletSpeed,
    damage: CFG.pistolDamage,
  });
  spawnParticles(game, gx, gy, 3, '#ffd94d', 0.12);
  game.audio.shot();
  scarePeds(game, player.x, player.y, 320);
  // Firing where the law can hear it draws heat.
  if (game.time - game.combat.lastShotWantedAt > 5) {
    let heard = false;
    for (const cop of game.police.footCops) {
      if (!cop.down && Math.hypot(cop.x - player.x, cop.y - player.y) < 320) heard = true;
    }
    for (const car of game.cars) {
      if (car.ai === 'police' && Math.hypot(car.x - player.x, car.y - player.y) < 320) heard = true;
    }
    if (heard) {
      game.combat.lastShotWantedAt = game.time;
      addWanted(game, 1);
      game.message('Shots fired near the police! +1 star');
    }
  }
}

export function playerPunch(game) {
  const player = game.player;
  if (player.punchTimer > 0) return;
  player.punchTimer = CFG.punchInterval;
  game.audio.punch();
  const px = player.x + Math.cos(player.angle) * CFG.punchRange;
  const py = player.y + Math.sin(player.angle) * CFG.punchRange;
  const targets = [];
  for (const enemy of game.combat.enemies) {
    if (enemy.state === 'alive') targets.push({ kind: 'enemy', obj: enemy, x: enemy.x, y: enemy.y });
  }
  for (const cop of game.police.footCops) {
    if (!cop.down) targets.push({ kind: 'cop', obj: cop, x: cop.x, y: cop.y });
  }
  for (const ped of game.peds) {
    if (ped.state === 'walk' || ped.state === 'flee') {
      targets.push({ kind: 'ped', obj: ped, x: ped.x, y: ped.y });
    }
  }
  let best = null;
  let bestDist = CFG.punchRange + 14;
  for (const t of targets) {
    const d = Math.hypot(t.x - px, t.y - py);
    if (d < bestDist) {
      bestDist = d;
      best = t;
    }
  }
  if (!best) return;
  const kx = Math.cos(player.angle) * 120;
  const ky = Math.sin(player.angle) * 120;
  if (best.kind === 'enemy') {
    best.obj.hp -= CFG.punchDamage;
    best.obj.x += kx * 0.2;
    best.obj.y += ky * 0.2;
    if (best.obj.hp <= 0) killEnemy(game, best.obj);
  } else if (best.kind === 'cop') {
    best.obj.hp -= CFG.punchDamage;
    addWanted(game, 1);
    game.message('You hit a cop! +1 star');
    if (best.obj.hp <= 0) killCop(game, best.obj);
  } else {
    best.obj.state = 'down';
    best.obj.timer = 5;
    addWanted(game, 1);
    game.message('You knocked out a pedestrian! +1 star');
  }
  spawnParticles(game, best.x, best.y, 4, '#ffe08a', 0.3);
}

export function spawnEnemies(game, x, y, count, color = '#2e8f83', mission = false) {
  for (let k = 0; k < count; k += 1) {
    const angle = game.rng.range(0, Math.PI * 2);
    const radius = game.rng.range(30, 160);
    game.combat.enemies.push({
      x: x + Math.cos(angle) * radius,
      y: y + Math.sin(angle) * radius,
      angle: 0,
      hp: CFG.enemyHealth,
      shootTimer: game.rng.range(0.5, 1.5),
      punchTimer: 0,
      speed: CFG.enemySpeed * game.rng.range(0.9, 1.15),
      state: 'alive',
      downTimer: 0,
      color,
      // Mission enemies count toward a mission objective; free-roam
      // thugs (the harbour crew) never do.
      mission,
      phase: game.rng.range(0, Math.PI * 2),
    });
  }
}

export function killEnemy(game, enemy) {
  if (enemy.state !== 'alive') return;
  enemy.state = 'down';
  enemy.downTimer = 4;
  game.save.cash += 25;
  game.save.totalEarned += 25;
  game.message('Gang member down! +$25');
  spawnParticles(game, enemy.x, enemy.y, 8, '#e85d3f', 0.5);
  game.audio.punch();
}

export function killCop(game, cop) {
  if (cop.down) return;
  cop.down = true;
  cop.downTimer = 6;
  addWanted(game, 2);
  game.message('You killed a cop! +2 stars');
  spawnParticles(game, cop.x, cop.y, 8, '#3f6fb5', 0.5);
}

function damageCar(game, car, amount) {
  if (car.wrecked) return;
  car.hp -= amount;
  if (car.hp <= 0) {
    car.wrecked = true;
    car.speed = 0;
    car.vx = 0;
    car.vy = 0;
    spawnParticles(game, car.x, car.y, 16, '#555555', 1.2);
    game.audio.crash();
    if (car.driven) game.message('Your car is wrecked! Get out and find another.');
  }
}

function pointInBuilding(world, x, y) {
  for (const b of world.buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
  }
  return false;
}

function updateBullets(game, dt) {
  const bullets = game.combat.bullets;
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead && pointInBuilding(game.world, b.x, b.y)) {
      spawnParticles(game, b.x, b.y, 3, '#ffd94d', 0.2);
      dead = true;
    }
    if (!dead) {
      for (const car of game.cars) {
        if (car.wrecked) continue;
        if (Math.hypot(car.x - b.x, car.y - b.y) < CFG.carRadius + 4) {
          damageCar(game, car, b.damage);
          spawnParticles(game, b.x, b.y, 3, '#ffd94d', 0.2);
          dead = true;
          break;
        }
      }
    }
    if (!dead && b.from === 'player') {
      for (const enemy of game.combat.enemies) {
        if (enemy.state !== 'alive') continue;
        if (Math.hypot(enemy.x - b.x, enemy.y - b.y) < 16) {
          enemy.hp -= b.damage;
          spawnParticles(game, b.x, b.y, 4, '#e85d3f', 0.3);
          if (enemy.hp <= 0) killEnemy(game, enemy);
          dead = true;
          break;
        }
      }
    }
    if (!dead && b.from === 'player') {
      for (const cop of game.police.footCops) {
        if (cop.down) continue;
        if (Math.hypot(cop.x - b.x, cop.y - b.y) < 15) {
          cop.hp -= b.damage;
          spawnParticles(game, b.x, b.y, 4, '#3f6fb5', 0.3);
          if (cop.hp <= 0) killCop(game, cop);
          dead = true;
          break;
        }
      }
    }
    if (!dead && b.from === 'player') {
      for (const ped of game.peds) {
        if (ped.state !== 'walk' && ped.state !== 'flee') continue;
        if (Math.hypot(ped.x - b.x, ped.y - b.y) < 14) {
          ped.state = 'down';
          ped.timer = 6;
          addWanted(game, 1);
          game.message('You shot a pedestrian! +1 star');
          dead = true;
          break;
        }
      }
    }
    if (!dead && b.from !== 'player') {
      const player = game.player;
      if (Math.hypot(player.x - b.x, player.y - b.y) < 15) {
        damagePlayer(game, b.damage);
        spawnParticles(game, b.x, b.y, 4, '#e85d3f', 0.3);
        dead = true;
      }
    }
    if (dead) bullets.splice(i, 1);
  }
}

function updateEnemies(game, dt) {
  const player = game.player;
  for (const enemy of game.combat.enemies) {
    if (enemy.state === 'down') {
      enemy.downTimer -= dt;
      continue;
    }
    enemy.phase += dt * 8;
    enemy.shootTimer -= dt;
    enemy.punchTimer = Math.max(0, enemy.punchTimer - dt);
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > 520) continue; // too far to care
    enemy.angle = Math.atan2(dy, dx);
    if (dist > 280) {
      enemy.x += (dx / dist) * enemy.speed * dt;
      enemy.y += (dy / dist) * enemy.speed * dt;
    } else if (dist < 60) {
      // Close enough to throw a punch.
      if (enemy.punchTimer <= 0) {
        enemy.punchTimer = 0.9;
        damagePlayer(game, CFG.enemyDamage);
        game.audio.punch();
      }
    } else {
      // Strafe at mid range and shoot.
      const strafe = Math.sin(enemy.phase * 0.5) > 0 ? 1 : -1;
      enemy.x += -dy / dist * strafe * enemy.speed * 0.4 * dt;
      enemy.y += dx / dist * strafe * enemy.speed * 0.4 * dt;
      if (enemy.shootTimer <= 0) {
        enemy.shootTimer = CFG.enemyShootInterval * game.rng.range(0.8, 1.3);
        const spread = game.rng.range(-0.14, 0.14);
        const angle = Math.atan2(dy, dx) + spread;
        game.combat.bullets.push({
          x: enemy.x + Math.cos(angle) * 18,
          y: enemy.y + Math.sin(angle) * 18,
          vx: Math.cos(angle) * 700,
          vy: Math.sin(angle) * 700,
          from: 'enemy',
          life: 0.7,
          damage: CFG.enemyDamage,
        });
        spawnParticles(game, enemy.x + Math.cos(angle) * 18, enemy.y + Math.sin(angle) * 18, 2, '#ffd94d', 0.1);
        game.audio.shot();
      }
    }
    const fixed = collideBuildings(game.world, enemy.x, enemy.y, CFG.playerRadius);
    enemy.x = fixed.x;
    enemy.y = fixed.y;
  }
  game.combat.enemies = game.combat.enemies.filter((e) => !(e.state === 'down' && e.downTimer <= 0));
}

export function updateCombat(game, dt) {
  updateBullets(game, dt);
  updateEnemies(game, dt);
  const particles = game.combat.particles;
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 30 * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
  // Wrecked cars keep smoking for a while.
  for (const car of game.cars) {
    if (car.wrecked && game.rng.chance(dt * 3)) {
      spawnParticles(game, car.x, car.y - 6, 1, '#666666', 1.0);
    }
  }
}
