// Solmar City — the scene renderer: camera, city, water, cars, people,
// bullets and particles, all on one canvas. The HUD lives in hud.js.

import { CFG, PALETTE } from './config.js';
import { drawHUD } from './hud.js';

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function inView(game, x, y, margin) {
  const cam = game.camera;
  return (
    x > cam.x - margin &&
    x < cam.x + CFG.viewWidth + margin &&
    y > cam.y - margin &&
    y < cam.y + CFG.viewHeight + margin
  );
}

function drawGround(game, ctx) {
  const cam = game.camera;
  const w = CFG.viewWidth;
  const h = CFG.viewHeight;
  // Grass base.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(cam.x, cam.y, w, h);

  // Sea (east and south) with animated wave lines.
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(Math.max(cam.x, CFG.waterX), cam.y, w, h);
  ctx.fillRect(cam.x, Math.max(cam.y, CFG.waterY), w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  const t = game.time;
  for (let k = 0; k < 12; k += 1) {
    const wy = CFG.waterY + 30 + k * 90 + Math.sin(t * 0.8 + k) * 6;
    if (wy < cam.y || wy > cam.y + h) continue;
    ctx.beginPath();
    ctx.moveTo(cam.x, wy);
    ctx.lineTo(cam.x + w, wy + Math.sin(t + k * 2) * 8);
    ctx.stroke();
  }
  for (let k = 0; k < 12; k += 1) {
    const wx = CFG.waterX + 30 + k * 90 + Math.sin(t * 0.8 + k * 1.7) * 6;
    if (wx < cam.x || wx > cam.x + w) continue;
    ctx.beginPath();
    ctx.moveTo(wx, cam.y);
    ctx.lineTo(wx + Math.sin(t + k) * 8, cam.y + h);
    ctx.stroke();
  }

  // Sand beach.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(CFG.beachX, cam.y, CFG.waterX - CFG.beachX, h);
  // Harbour concrete.
  ctx.fillStyle = '#a9a294';
  ctx.fillRect(cam.x, CFG.harborY, w, CFG.waterY - CFG.harborY);
}

function drawRoads(game, ctx) {
  const world = game.world;
  const half = CFG.roadWidth / 2;
  const side = half + 12;
  // Sidewalks.
  ctx.fillStyle = PALETTE.sidewalk;
  for (const x of world.avenues) {
    ctx.fillRect(x - side, CFG.worldMinY, side * 2, CFG.harborY - CFG.worldMinY);
  }
  for (const y of world.streets) {
    ctx.fillRect(CFG.worldMinX, y - side, CFG.beachX - CFG.worldMinX, side * 2);
  }
  // Asphalt.
  ctx.fillStyle = PALETTE.asphalt;
  for (const x of world.avenues) {
    ctx.fillRect(x - half, CFG.worldMinY, half * 2, CFG.harborY - CFG.worldMinY);
  }
  for (const y of world.streets) {
    ctx.fillRect(CFG.worldMinX, y - half, CFG.beachX - CFG.worldMinX, half * 2);
  }
  // Centre dashes.
  ctx.fillStyle = PALETTE.laneDash;
  for (const x of world.avenues) {
    for (let y = CFG.roadFirst; y < CFG.harborY; y += 44) {
      if (world.streets.some((sy) => Math.abs(sy - y) < 40)) continue;
      ctx.fillRect(x - 2, y, 4, 22);
    }
  }
  for (const y of world.streets) {
    for (let x = CFG.roadFirst; x < CFG.beachX; x += 44) {
      if (world.avenues.some((ax) => Math.abs(ax - x) < 40)) continue;
      ctx.fillRect(x, y - 2, 22, 4);
    }
  }
  // Crosswalks at every intersection.
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (const x of world.avenues) {
    for (const y of world.streets) {
      ctx.fillRect(x - half, y - half - 8, half * 2, 5);
      ctx.fillRect(x - half, y + half + 3, half * 2, 5);
      ctx.fillRect(x - half - 8, y - half, 5, half * 2);
      ctx.fillRect(x + half + 3, y - half, 5, half * 2);
    }
  }
}

function drawParkAndPlaza(game, ctx) {
  const world = game.world;
  const park = world.park;
  ctx.fillStyle = PALETTE.parkGrass;
  ctx.fillRect(park.x, park.y, park.w, park.h);
  // Paths crossing the park.
  ctx.strokeStyle = '#c9b489';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(park.x, park.cy);
  ctx.lineTo(park.x + park.w, park.cy);
  ctx.moveTo(park.cx, park.y);
  ctx.lineTo(park.cx, park.y + park.h);
  ctx.stroke();
  // Pond.
  ctx.fillStyle = PALETTE.waterDeep;
  ctx.beginPath();
  ctx.arc(park.cx, park.cy, park.pondR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(park.cx - 8, park.cy - 8, park.pondR * 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Trees.
  for (const tree of world.trees) {
    if (!inView(game, tree.x, tree.y, 30)) continue;
    ctx.fillStyle = '#3f7a34';
    ctx.beginPath();
    ctx.arc(tree.x + 3, tree.y + 4, tree.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4e9440';
    ctx.beginPath();
    ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Plaza: paving and planters.
  const plaza = world.plaza;
  ctx.fillStyle = '#b8b0a0';
  ctx.fillRect(plaza.x, plaza.y, plaza.w, plaza.h);
  ctx.strokeStyle = '#9c9484';
  ctx.lineWidth = 2;
  for (let k = 1; k < 4; k += 1) {
    ctx.beginPath();
    ctx.moveTo(plaza.x + (plaza.w / 4) * k, plaza.y);
    ctx.lineTo(plaza.x + (plaza.w / 4) * k, plaza.y + plaza.h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(plaza.x, plaza.y + (plaza.h / 4) * k);
    ctx.lineTo(plaza.x + plaza.w, plaza.y + (plaza.h / 4) * k);
    ctx.stroke();
  }
  // Beach umbrellas.
  for (const u of world.umbrellas) {
    if (!inView(game, u.x, u.y, 30)) continue;
    ctx.fillStyle = u.color;
    ctx.beginPath();
    ctx.arc(u.x, u.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(u.x, u.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Harbour piers and containers.
  ctx.fillStyle = '#8a7a5c';
  for (const pier of world.piers) ctx.fillRect(pier.x, pier.y, pier.w, pier.h);
  for (const c of world.containers) {
    if (!inView(game, c.x, c.y, 80)) continue;
    ctx.fillStyle = c.color;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(c.x, c.y, c.w, 5);
  }
}

function drawBuildings(game, ctx) {
  for (const b of game.world.buildings) {
    if (!inView(game, b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h))) continue;
    // Drop shadow for height.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + b.height * 0.5, b.y + b.height * 0.5, b.w, b.h);
    ctx.fillStyle = PALETTE.buildingSide;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
    // Rooftop dressing.
    if (b.roof === 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(b.x + b.w / 2 - 10, b.y + b.h / 2 - 8, 20, 16);
    } else if (b.roof === 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(b.x + 8, b.y + b.h / 2 - 3, b.w - 16, 6);
    }
  }
}

function drawDoubloons(game, ctx) {
  for (const coin of game.doubloons) {
    if (coin.taken || !inView(game, coin.x, coin.y, 40)) continue;
    const bob = Math.sin(coin.bobPhase) * 4;
    const glow = 0.5 + Math.sin(coin.bobPhase) * 0.2;
    ctx.fillStyle = `rgba(242,197,49,${0.25 * glow})`;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y + bob, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y + bob, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b8911f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y + bob, 10, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawRaceGates(game, ctx) {
  // Race start gates.
  for (const race of game.racesList) {
    if (!inView(game, race.gate.x, race.gate.y, 120)) continue;
    const active = game.races.active && game.races.active.def.id === race.id;
    ctx.save();
    ctx.translate(race.gate.x, race.gate.y);
    ctx.fillStyle = active ? '#2ecc71' : '#27ae60';
    ctx.fillRect(-6, -52, 12, 104);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RACE', 0, -60);
    ctx.fillText(race.name.toUpperCase(), 0, -80);
    ctx.restore();
  }
  // Checkpoint rings for the active race.
  const active = game.races.active;
  if (active) {
    const cps = active.def.checkpoints;
    for (let k = active.checkpoint; k < cps.length; k += 1) {
      const cp = cps[k];
      if (!inView(game, cp.x, cp.y, 80)) continue;
      const isNext = k === active.checkpoint;
      ctx.strokeStyle = isNext ? '#2ecc71' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = isNext ? 5 : 3;
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 52, 0, Math.PI * 2);
      ctx.stroke();
      if (isNext) {
        ctx.fillStyle = 'rgba(46,204,113,0.15)';
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 52, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawObjectiveMarker(game, ctx) {
  const objective = game.currentObjective;
  if (!objective) return;
  const { x, y } = objective;
  if (!inView(game, x, y, 120)) return;
  const pulse = 1 + Math.sin(game.time * 4) * 0.12;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(242,197,49,0.25)';
  ctx.beginPath();
  ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  // A floating diamond above the marker.
  ctx.fillStyle = PALETTE.gold;
  const bob = Math.sin(game.time * 3) * 5;
  ctx.beginPath();
  ctx.moveTo(0, -52 + bob);
  ctx.lineTo(12, -38 + bob);
  ctx.lineTo(0, -24 + bob);
  ctx.lineTo(-12, -38 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCar(game, ctx, car) {
  if (!inView(game, car.x, car.y, 60)) return;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const len = CFG.carLength;
  const wid = CFG.carWidth;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundedRect(ctx, -len / 2 + 2, -wid / 2 + 3, len, wid, 8);
  ctx.fill();
  // Body.
  ctx.fillStyle = car.wrecked ? '#3a3a3a' : car.color;
  roundedRect(ctx, -len / 2, -wid / 2, len, wid, 8);
  ctx.fill();
  if (car.type === 'police') {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-4, -wid / 2, 10, wid);
    // Flashing light bar.
    const flash = Math.floor(game.time * 6) % 2 === 0;
    ctx.fillStyle = flash ? '#ff2e2e' : '#2e6fff';
    ctx.fillRect(-6, -wid / 2 - 2, 12, 5);
    ctx.fillStyle = flash ? '#2e6fff' : '#ff2e2e';
    ctx.fillRect(-6, wid / 2 - 3, 12, 5);
  }
  if (car.type === 'taxi') {
    ctx.fillStyle = '#f2c531';
    ctx.fillRect(-4, -5, 10, 10);
  }
  // Windshield and roof.
  ctx.fillStyle = 'rgba(180,220,240,0.9)';
  ctx.fillRect(4, -wid / 2 + 3, 10, wid - 6);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-10, -wid / 2 + 4, 12, wid - 8);
  // Headlights.
  ctx.fillStyle = '#fff8c9';
  ctx.fillRect(len / 2 - 3, -wid / 2 + 2, 3, 5);
  ctx.fillRect(len / 2 - 3, wid / 2 - 7, 3, 5);
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, shirt, down, phase, gun) {
  ctx.save();
  ctx.translate(x, y);
  if (down) {
    ctx.rotate(Math.PI / 2);
    ctx.globalAlpha = 0.7;
  }
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(2, 3, 11, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  // Head.
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(Math.cos(angle) * 3, Math.sin(angle) * 3, 6, 0, Math.PI * 2);
  ctx.fill();
  if (gun && !down) {
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 8, Math.sin(angle) * 8);
    ctx.lineTo(Math.cos(angle) * 20, Math.sin(angle) * 20);
    ctx.stroke();
  }
  // Walk bob.
  if (!down && phase !== undefined) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.arc(-Math.cos(angle) * 6, -Math.sin(angle) * 6 + Math.sin(phase) * 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBulletsAndParticles(game, ctx) {
  for (const b of game.combat.bullets) {
    ctx.strokeStyle = '#ffe08a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.012, b.y - b.vy * 0.012);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const p of game.combat.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSpeedLines(game, ctx) {
  const player = game.player;
  if (player.onFoot || !player.car) return;
  const speed01 = Math.min(1, Math.abs(player.car.speed) / CFG.carMaxSpeed);
  if (speed01 < 0.55) return;
  const count = Math.floor((speed01 - 0.5) * 24);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  for (let k = 0; k < count; k += 1) {
    const y = (k * 97 + Math.floor(game.time * 900)) % CFG.viewHeight;
    const x = (k * 211 + 130) % CFG.viewWidth;
    const len = 30 + speed01 * 60;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - len, y);
    ctx.stroke();
  }
}

export function render(game) {
  const ctx = game.ctx;
  ctx.clearRect(0, 0, CFG.viewWidth, CFG.viewHeight);
  ctx.save();
  ctx.translate(-game.camera.x, -game.camera.y);

  drawGround(game, ctx);
  drawRoads(game, ctx);
  drawParkAndPlaza(game, ctx);
  drawBuildings(game, ctx);
  drawDoubloons(game, ctx);
  drawRaceGates(game, ctx);
  drawObjectiveMarker(game, ctx);

  for (const car of game.cars) drawCar(game, ctx, car);

  for (const ped of game.peds) {
    if (!inView(game, ped.x, ped.y, 30)) continue;
    drawPerson(ctx, ped.x, ped.y, ped.angle, ped.color, ped.state === 'down', ped.phase, false);
  }
  for (const enemy of game.combat.enemies) {
    if (!inView(game, enemy.x, enemy.y, 30)) continue;
    drawPerson(ctx, enemy.x, enemy.y, enemy.angle, enemy.color, enemy.state === 'down', enemy.phase, true);
  }
  for (const cop of game.police.footCops) {
    if (!inView(game, cop.x, cop.y, 30)) continue;
    drawPerson(ctx, cop.x, cop.y, cop.angle, '#2e4a8f', cop.down, undefined, false);
  }
  const player = game.player;
  if (player.onFoot && inView(game, player.x, player.y, 40)) {
    drawPerson(
      ctx,
      player.x,
      player.y,
      player.angle,
      PALETTE.playerShirt,
      false,
      game.time * 8,
      player.weapon === 'gun',
    );
  }

  drawBulletsAndParticles(game, ctx);
  ctx.restore();

  drawSpeedLines(game, ctx);
  drawHUD(game, ctx);
}
