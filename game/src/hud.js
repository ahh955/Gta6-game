// Solmar City — the HUD: cash, health, wanted stars, ammo, speed, the live
// minimap, objective text and messages, plus every menu screen.

import { CFG, PALETTE } from './config.js';
import { doubloonsCollected } from './collectibles.js';

function text(ctx, str, x, y, font, color, align = 'left') {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10,10,14,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function drawStars(game, ctx) {
  const wanted = game.police.wanted;
  const cx = CFG.viewWidth / 2;
  let stars = '';
  for (let k = 0; k < 5; k += 1) stars += k < wanted ? '★' : '☆';
  text(ctx, stars, cx, 26, 'bold 26px system-ui, sans-serif', wanted > 0 ? '#ffd94d' : 'rgba(255,255,255,0.4)', 'center');
  // Bust meter.
  if (game.police.bustMeter > 0.02) {
    const w = 180;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, 44, w, 12);
    ctx.fillStyle = '#ff4d4d';
    ctx.fillRect(cx - w / 2, 44, w * game.police.bustMeter, 12);
    text(ctx, 'BUSTED?', cx, 66, 'bold 12px system-ui, sans-serif', '#ff6b6b', 'center');
  }
}

function drawMinimap(game, ctx) {
  const MW = 210;
  const MH = 156;
  const mx = CFG.viewWidth - MW - 14;
  const my = 14;
  const worldW = CFG.worldMaxX - CFG.worldMinX;
  const worldH = CFG.worldMaxY - CFG.worldMinY;
  const sx = MW / worldW;
  const sy = MH / worldH;
  const toMapX = (x) => mx + (x - CFG.worldMinX) * sx;
  const toMapY = (y) => my + (y - CFG.worldMinY) * sy;

  panel(ctx, mx - 4, my - 4, MW + 8, MH + 8);
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, MW, MH);
  ctx.clip();
  ctx.fillStyle = '#5d8a48';
  ctx.fillRect(mx, my, MW, MH);
  // Water.
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(toMapX(CFG.waterX), my, MW, MH);
  ctx.fillRect(mx, toMapY(CFG.waterY), MW, MH);
  // Beach + harbour.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(toMapX(CFG.beachX), my, toMapX(CFG.waterX) - toMapX(CFG.beachX), MH);
  ctx.fillStyle = '#a9a294';
  ctx.fillRect(mx, toMapY(CFG.harborY), MW, toMapY(CFG.waterY) - toMapY(CFG.harborY));
  // Roads.
  ctx.strokeStyle = '#3b3835';
  ctx.lineWidth = 3;
  for (const x of game.world.avenues) {
    ctx.beginPath();
    ctx.moveTo(toMapX(x), toMapY(CFG.worldMinY));
    ctx.lineTo(toMapX(x), toMapY(CFG.harborY));
    ctx.stroke();
  }
  for (const y of game.world.streets) {
    ctx.beginPath();
    ctx.moveTo(toMapX(CFG.worldMinX), toMapY(y));
    ctx.lineTo(toMapX(CFG.beachX), toMapY(y));
    ctx.stroke();
  }
  // Park.
  ctx.fillStyle = '#4e9440';
  ctx.fillRect(
    toMapX(game.world.park.x),
    toMapY(game.world.park.y),
    game.world.park.w * sx,
    game.world.park.h * sy,
  );
  // Doubloons.
  ctx.fillStyle = PALETTE.gold;
  for (const coin of game.doubloons) {
    if (coin.taken) continue;
    ctx.fillRect(toMapX(coin.x) - 1, toMapY(coin.y) - 1, 3, 3);
  }
  // Race gates.
  ctx.fillStyle = '#2ecc71';
  for (const race of game.racesList) {
    ctx.fillRect(toMapX(race.gate.x) - 2, toMapY(race.gate.y) - 2, 5, 5);
  }
  // Enemies.
  ctx.fillStyle = '#ff4d4d';
  for (const enemy of game.combat.enemies) {
    if (enemy.state !== 'alive') continue;
    ctx.fillRect(toMapX(enemy.x) - 2, toMapY(enemy.y) - 2, 4, 4);
  }
  // Police.
  const flash = Math.floor(game.time * 4) % 2 === 0;
  ctx.fillStyle = flash ? '#ff4d4d' : '#4d8dff';
  for (const car of game.cars) {
    if (car.ai !== 'police' || car.wrecked) continue;
    ctx.beginPath();
    ctx.arc(toMapX(car.x), toMapY(car.y), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cop of game.police.footCops) {
    if (cop.down) continue;
    ctx.fillRect(toMapX(cop.x) - 1, toMapY(cop.y) - 1, 3, 3);
  }
  // Objective.
  if (game.currentObjective) {
    const pulse = 3 + Math.sin(game.time * 5) * 1.5;
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(toMapX(game.currentObjective.x), toMapY(game.currentObjective.y), pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player.
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(toMapX(game.player.x), toMapY(game.player.y), 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawObjectiveArrow(game, ctx) {
  const objective = game.currentObjective;
  if (!objective) return;
  const cam = game.camera;
  const px = objective.x - cam.x;
  const py = objective.y - cam.y;
  if (px > 40 && px < CFG.viewWidth - 40 && py > 40 && py < CFG.viewHeight - 40) return;
  // Clamp to the screen edge and point at the objective.
  const cx = CFG.viewWidth / 2;
  const cy = CFG.viewHeight / 2;
  const dx = objective.x - game.player.x;
  const dy = objective.y - game.player.y;
  const angle = Math.atan2(dy, dx);
  const ex = cx + Math.cos(angle) * 200;
  const ey = cy + Math.sin(angle) * 130;
  const dist = Math.round(Math.hypot(dx, dy));
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(angle);
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-10, -11);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-10, 11);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  text(ctx, `${dist}m`, ex, ey + 24, 'bold 13px system-ui, sans-serif', PALETTE.gold, 'center');
}

function drawMessages(game, ctx) {
  const now = game.time;
  let shown = 0;
  for (let k = game.messages.length - 1; k >= 0 && shown < 3; k -= 1) {
    const m = game.messages[k];
    const age = now - m.at;
    if (age > 5) continue;
    const alpha = age > 4 ? 5 - age : 1;
    ctx.globalAlpha = alpha;
    text(ctx, m.text, CFG.viewWidth / 2, CFG.viewHeight - 120 + shown * 22, 'bold 15px system-ui, sans-serif', '#ffffff', 'center');
    ctx.globalAlpha = 1;
    shown += 1;
  }
}

function drawRaceHud(game, ctx) {
  const active = game.races.active;
  if (!active) return;
  if (active.countdown > 0) {
    const n = Math.ceil(active.countdown);
    text(ctx, n > 0 ? String(n) : 'GO!', CFG.viewWidth / 2, CFG.viewHeight / 2 - 60, 'bold 72px system-ui, sans-serif', n > 0 ? '#ffffff' : '#2ecc71', 'center');
    return;
  }
  const total = active.def.checkpoints.length;
  text(
    ctx,
    `${active.def.name}  ${active.time.toFixed(1)}s  —  checkpoint ${Math.min(active.checkpoint + 1, total)}/${total}`,
    CFG.viewWidth / 2,
    84,
    'bold 16px system-ui, sans-serif',
    '#ffffff',
    'center',
  );
}

function drawPlayingHud(game, ctx) {
  const player = game.player;
  // Top-left: cash, health, progress.
  panel(ctx, 14, 14, 230, 92);
  text(ctx, `$${game.save.cash.toLocaleString('en-US')}`, 28, 36, 'bold 22px system-ui, sans-serif', '#7cf29a');
  text(ctx, `Missions ${game.save.missionsDone}/5`, 28, 62, 'bold 14px system-ui, sans-serif', '#ffffff');
  text(ctx, `Doubloons ${doubloonsCollected(game)}/12`, 28, 84, 'bold 14px system-ui, sans-serif', PALETTE.gold);
  // Health bar.
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(150, 52, 80, 12);
  ctx.fillStyle = player.health > 30 ? '#4ddb6a' : '#ff4d4d';
  ctx.fillRect(150, 52, 80 * Math.max(0, player.health / CFG.playerHealth), 12);
  text(ctx, 'HP', 150, 78, 'bold 12px system-ui, sans-serif', '#ffffff');

  drawStars(game, ctx);
  drawMinimap(game, ctx);
  drawObjectiveArrow(game, ctx);

  // Bottom-left: weapon and ammo.
  if (player.onFoot) {
    const weapon = player.weapon === 'gun' ? 'PISTOL' : 'FISTS';
    const ammo = player.weapon === 'gun'
      ? player.reloading ? 'RELOADING...' : `${player.ammo} / ${CFG.pistolMag}`
      : 'Q to draw pistol';
    panel(ctx, 14, CFG.viewHeight - 58, 210, 44);
    text(ctx, weapon, 28, CFG.viewHeight - 40, 'bold 16px system-ui, sans-serif', '#ffffff');
    text(ctx, ammo, 28, CFG.viewHeight - 20, 'bold 13px system-ui, sans-serif', '#ffd94d');
  } else if (player.car) {
    // Bottom-right: speedometer.
    const kmh = Math.round((Math.abs(player.car.speed) / CFG.carMaxSpeed) * 200);
    panel(ctx, CFG.viewWidth - 154, CFG.viewHeight - 58, 140, 44);
    text(ctx, `${kmh}`, CFG.viewWidth - 84, CFG.viewHeight - 36, 'bold 26px system-ui, sans-serif', '#ffffff', 'center');
    text(ctx, 'KM/H', CFG.viewWidth - 84, CFG.viewHeight - 14, 'bold 11px system-ui, sans-serif', '#ffd94d', 'center');
  }

  // Objective line.
  if (game.currentObjective) {
    text(ctx, `► ${game.currentObjective.label}`, CFG.viewWidth / 2, CFG.viewHeight - 150, 'bold 16px system-ui, sans-serif', PALETTE.gold, 'center');
  }

  // Context hint.
  if (game.hint) {
    panel(ctx, CFG.viewWidth / 2 - 170, CFG.viewHeight - 36, 340, 30);
    text(ctx, game.hint, CFG.viewWidth / 2, CFG.viewHeight - 20, 'bold 15px system-ui, sans-serif', '#ffffff', 'center');
  }

  drawMessages(game, ctx);
  drawRaceHud(game, ctx);
}

function overlay(ctx) {
  ctx.fillStyle = 'rgba(8,10,18,0.72)';
  ctx.fillRect(0, 0, CFG.viewWidth, CFG.viewHeight);
}

function drawStartScreen(game, ctx) {
  overlay(ctx);
  text(ctx, 'SOLMAR CITY', CFG.viewWidth / 2, 130, 'bold 72px system-ui, sans-serif', '#ffd94d', 'center');
  text(ctx, 'An open-world crime game — built from scratch for make.fun', CFG.viewWidth / 2, 185, 'bold 18px system-ui, sans-serif', '#ffffff', 'center');
  const lines = [
    'WASD / Arrows — move and drive      Mouse — aim      Click — shoot',
    'E — steal / enter / exit a car      Q — pistol or fists      F — punch',
    'R — reload (or start a race at a gate)      Space — handbrake      Shift — sprint',
    'M — mute      Esc — pause',
    '',
    'Steal cars, run missions for Dario Reyes and Mama Luz, outrun the police,',
    'win street races and find all 12 golden doubloons.',
  ];
  lines.forEach((line, i) => {
    text(ctx, line, CFG.viewWidth / 2, 250 + i * 30, '16px system-ui, sans-serif', '#dddddd', 'center');
  });
  const blink = Math.floor(game.time * 1.5) % 2 === 0;
  if (blink) {
    text(ctx, 'PRESS ENTER OR CLICK TO PLAY', CFG.viewWidth / 2, 500, 'bold 26px system-ui, sans-serif', '#7cf29a', 'center');
  }
  text(
    ctx,
    `Cash $${game.save.cash}  •  Missions ${game.save.missionsDone}/5  •  Doubloons ${game.save.doubloons.length}/12`,
    CFG.viewWidth / 2,
    560,
    'bold 15px system-ui, sans-serif',
    '#ffd94d',
    'center',
  );
}

function drawPauseScreen(game, ctx) {
  overlay(ctx);
  text(ctx, 'PAUSED', CFG.viewWidth / 2, 200, 'bold 56px system-ui, sans-serif', '#ffffff', 'center');
  const lines = [
    'WASD — move / drive      E — car      Q — weapon      F — punch',
    'R — reload / race      Space — handbrake      M — mute',
    '',
    `Cash $${game.save.cash}   •   Missions ${game.save.missionsDone}/5   •   Doubloons ${game.save.doubloons.length}/12`,
  ];
  lines.forEach((line, i) => {
    text(ctx, line, CFG.viewWidth / 2, 290 + i * 32, '17px system-ui, sans-serif', '#dddddd', 'center');
  });
  text(ctx, 'PRESS ESC TO RESUME', CFG.viewWidth / 2, 460, 'bold 22px system-ui, sans-serif', '#7cf29a', 'center');
}

function drawEndScreen(game, ctx, title, color) {
  overlay(ctx);
  text(ctx, title, CFG.viewWidth / 2, 220, 'bold 64px system-ui, sans-serif', color, 'center');
  const lines = game.stateData ? game.stateData.lines : [];
  lines.forEach((line, i) => {
    text(ctx, line, CFG.viewWidth / 2, 300 + i * 34, 'bold 20px system-ui, sans-serif', '#ffffff', 'center');
  });
  text(ctx, 'PRESS ENTER TO CONTINUE', CFG.viewWidth / 2, 460, 'bold 22px system-ui, sans-serif', '#7cf29a', 'center');
}

function drawBriefing(game, ctx) {
  overlay(ctx);
  const def = game.stateData.def;
  text(ctx, def.name.toUpperCase(), CFG.viewWidth / 2, 170, 'bold 48px system-ui, sans-serif', '#ffd94d', 'center');
  text(ctx, `${def.giver}  •  Reward $${def.reward}`, CFG.viewWidth / 2, 220, 'bold 20px system-ui, sans-serif', '#ffffff', 'center');
  def.brief.forEach((line, i) => {
    text(ctx, line, CFG.viewWidth / 2, 290 + i * 30, 'italic 18px system-ui, sans-serif', '#dddddd', 'center');
  });
  text(ctx, 'PRESS ENTER TO START  •  ESC TO DECLINE', CFG.viewWidth / 2, 460, 'bold 22px system-ui, sans-serif', '#7cf29a', 'center');
}

export function drawHUD(game, ctx) {
  if (game.state === 'start') {
    drawStartScreen(game, ctx);
    return;
  }
  drawPlayingHud(game, ctx);
  if (game.state === 'paused') drawPauseScreen(game, ctx);
  else if (game.state === 'busted') drawEndScreen(game, ctx, 'BUSTED', '#4d8dff');
  else if (game.state === 'wasted') drawEndScreen(game, ctx, 'WASTED', '#ff4d4d');
  else if (game.state === 'briefing') drawBriefing(game, ctx);
  else if (game.state === 'complete') drawEndScreen(game, ctx, game.stateData.title, '#7cf29a');
  else if (game.state === 'raceResult') drawEndScreen(game, ctx, game.stateData.title, '#2ecc71');
}
