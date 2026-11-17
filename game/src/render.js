// Drawing only: the city, its cars and people, the golden-hour light, and the screens. The
// camera follows the player and the 1280x720 view is scaled to fit the window. Flat canvas
// shapes throughout — no images, no network.
import { CITY, FONT, PALETTE, VIEW } from './config.js';
import { drawDialogue, drawHud } from './hud.js';
import { INTRO_LINES, MISSION_NAMES } from './story.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_COMPLETE = 'complete';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawRoads(ctx, city, view) {
  const half = CITY.roadWidth / 2;
  ctx.fillStyle = PALETTE.asphalt;
  for (const ax of CITY.avenues) ctx.fillRect(ax - half, 0, CITY.roadWidth, CITY.beachTop);
  for (const sy of CITY.streets) ctx.fillRect(0, sy - half, CITY.width, CITY.roadWidth);
  // Centre dashes.
  ctx.strokeStyle = PALETTE.roadMark;
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 30]);
  ctx.beginPath();
  for (const ax of CITY.avenues) {
    ctx.moveTo(ax, 0);
    ctx.lineTo(ax, CITY.beachTop);
  }
  for (const sy of CITY.streets) {
    ctx.moveTo(0, sy);
    ctx.lineTo(CITY.width, sy);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // Crosswalks at every intersection.
  ctx.fillStyle = 'rgba(232, 220, 192, 0.75)';
  for (const ax of CITY.avenues) {
    for (const sy of CITY.streets) {
      for (let i = -2; i <= 2; i += 1) {
        ctx.fillRect(ax - half + 8, sy + i * 12 - 3, 14, 6);
        ctx.fillRect(ax + half - 22, sy + i * 12 - 3, 14, 6);
        ctx.fillRect(ax + i * 12 - 3, sy - half + 8, 6, 14);
        ctx.fillRect(ax + i * 12 - 3, sy + half - 22, 6, 14);
      }
    }
  }
  void view;
}

function drawGround(ctx, city) {
  // Sidewalk blocks first, then the park, beach and water.
  ctx.fillStyle = PALETTE.block;
  ctx.fillRect(0, 0, CITY.width, CITY.beachTop);
  ctx.fillStyle = PALETTE.sidewalk;
  for (const b of city.blocks) ctx.fillRect(b.x, b.y, b.width, b.height);
  const park = CITY.parkBlock;
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(park.x0, park.y0, park.x1 - park.x0, park.y1 - park.y0);
  ctx.fillStyle = PALETTE.grassDark;
  ctx.beginPath();
  ctx.ellipse((park.x0 + park.x1) / 2, (park.y0 + park.y1) / 2, 150, 90, 0, 0, Math.PI * 2);
  ctx.fill();
  // Promenade, sand, water.
  ctx.fillStyle = '#c8b490';
  ctx.fillRect(0, CITY.beachTop - 30, CITY.width, 30);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, CITY.beachTop, CITY.width, CITY.waterTop - CITY.beachTop);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(0, CITY.waterTop, CITY.width, CITY.height - CITY.waterTop);
  ctx.fillStyle = PALETTE.waterDeep;
  for (let x = 0; x < CITY.width; x += 260) {
    ctx.beginPath();
    ctx.ellipse(x + 90, CITY.waterTop + 90, 120, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Harbor piers.
  ctx.fillStyle = '#7a6a52';
  const harbor = CITY.harbor;
  for (let i = 0; i < 3; i += 1) {
    const px = harbor.x0 + 120 + i * 260;
    ctx.fillRect(px, harbor.y0 + 260, 60, CITY.height - harbor.y0 - 260);
  }
  ctx.fillStyle = '#8a7a62';
  ctx.fillRect(harbor.x0, harbor.y0, harbor.x1 - harbor.x0, 60);
}

function drawBuildings(ctx, city) {
  for (const b of city.buildings) {
    // A long golden-hour shadow to the east.
    ctx.fillStyle = 'rgba(40, 30, 20, 0.25)';
    ctx.fillRect(b.x + b.heightPx * 0.5, b.y + b.heightPx * 0.5, b.width, b.height);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.width, b.height);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 6, b.y + 6, b.width - 12, b.height - 12);
    if (b.tower) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(b.x + 10, b.y + 10, b.width - 20, 8);
      ctx.fillRect(b.x + 10, b.y + 26, b.width - 20, 8);
    }
    if (b.helipad) {
      ctx.strokeStyle = '#f2c94c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + b.height / 2, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f2c94c';
      ctx.font = `bold 20px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('H', b.x + b.width / 2, b.y + b.height / 2);
      ctx.textBaseline = 'alphabetic';
    }
  }
}

function drawTrees(ctx, city) {
  for (const t of city.trees) {
    ctx.fillStyle = 'rgba(40, 30, 20, 0.25)';
    ctx.beginPath();
    ctx.arc(t.x + 6, t.y + 8, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = t.palm ? '#3f7d4a' : PALETTE.tree;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.treeDark;
    ctx.beginPath();
    ctx.arc(t.x - t.r * 0.25, t.y - t.r * 0.25, t.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCarBody(ctx, car) {
  const { length, width } = car.spec;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundRect(ctx, -length / 2 + 4, -width / 2 + 5, length, width, 8);
  ctx.fill();
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -length / 2, -width / 2, length, width, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, -length / 2, -width / 2, length, width, 8);
  ctx.stroke();
  // Windshield and rear window.
  ctx.fillStyle = 'rgba(30, 60, 90, 0.85)';
  roundRect(ctx, length * 0.08, -width / 2 + 4, length * 0.22, width - 8, 4);
  ctx.fill();
  roundRect(ctx, -length * 0.32, -width / 2 + 4, length * 0.18, width - 8, 4);
  ctx.fill();
  // Roof.
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, -length * 0.12, -width / 2 + 5, length * 0.2, width - 10, 4);
  ctx.fill();
  // Headlights and brake lights.
  ctx.fillStyle = '#fff8c8';
  ctx.fillRect(length / 2 - 3, -width / 2 + 3, 3, 6);
  ctx.fillRect(length / 2 - 3, width / 2 - 9, 3, 6);
  ctx.fillStyle = car.brakeLights ? '#ff2a1e' : '#a02020';
  ctx.fillRect(-length / 2, -width / 2 + 3, 3, 6);
  ctx.fillRect(-length / 2, width / 2 - 9, 3, 6);
  if (car.type === 'taxi') {
    ctx.fillStyle = '#222222';
    ctx.font = `bold 9px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 3);
  }
  if (car.type === 'police') {
    ctx.fillStyle = '#1f3a5f';
    ctx.fillRect(-length * 0.1, -width / 2, length * 0.2, width);
    const phase = Math.floor(car.sirenPhase) % 2 === 0;
    ctx.fillStyle = phase ? '#ff3b30' : '#7a1010';
    ctx.fillRect(-4, -width / 2 + 2, 8, 6);
    ctx.fillStyle = phase ? '#101f7a' : '#3b82ff';
    ctx.fillRect(-4, width / 2 - 8, 8, 6);
  }
  if (car.type === 'sports') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-length / 2 - 2, -width / 2 - 1, 4, width + 2);
  }
  // Smoke from a wrecked car.
  if (car.hp < 50) {
    ctx.fillStyle = 'rgba(60,60,60,0.5)';
    ctx.beginPath();
    ctx.arc(length / 2 - 6, 0, 7 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, shirt, skin, down, flash) {
  ctx.save();
  ctx.translate(x, y);
  if (down) {
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(2, 4, 16, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(15, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 11, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = flash > 0 ? '#ffffff' : shirt;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(4, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  // Arms point forward when aiming.
  ctx.strokeStyle = shirt;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(2, -6);
  ctx.lineTo(14, -2);
  ctx.moveTo(2, 6);
  ctx.lineTo(14, 2);
  ctx.stroke();
  ctx.restore();
}

function drawWaypoint(ctx, state) {
  const wp = state.mission.waypoint;
  if (!wp) return;
  const pulse = 1 + Math.sin(state.time * 4) * 0.12;
  ctx.save();
  ctx.translate(wp.x, wp.y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = 'rgba(255, 217, 74, 0.25)';
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd94a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd94a';
  ctx.beginPath();
  ctx.moveTo(0, -52);
  ctx.lineTo(12, -30);
  ctx.lineTo(-12, -30);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMissionMarker(ctx, state) {
  if (state.mission.active || state.mission.index >= 5) return;
  const start = state.missionStart;
  if (!start) return;
  const bounce = Math.sin(state.time * 3) * 6;
  ctx.save();
  ctx.translate(start.x, start.y + bounce - 40);
  ctx.fillStyle = '#ffd94a';
  ctx.font = `bold 44px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('M', 0, 0);
  ctx.restore();
  ctx.fillStyle = 'rgba(255, 217, 74, 0.3)';
  ctx.beginPath();
  ctx.arc(start.x, start.y, 60, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.kind === 'puff' ? (1.6 - a) : 1), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawLighting(ctx, camera) {
  // Golden-hour wash: warm at the top, a soft vignette at the edges.
  const g = ctx.createLinearGradient(0, camera.y - VIEW.height / 2, 0, camera.y + VIEW.height / 2);
  g.addColorStop(0, 'rgba(255, 190, 90, 0.10)');
  g.addColorStop(0.6, 'rgba(255, 170, 80, 0.04)');
  g.addColorStop(1, 'rgba(60, 30, 60, 0.10)');
  ctx.fillStyle = g;
  ctx.fillRect(camera.x - VIEW.width / 2, camera.y - VIEW.height / 2, VIEW.width, VIEW.height);
}

function drawPanel(ctx, title, lines, prompt, accent) {
  const width = 640;
  const height = 150 + lines.length * 32 + 70;
  const x = (VIEW.width - width) / 2;
  const y = (VIEW.height - height) / 2;
  ctx.fillStyle = 'rgba(10, 12, 18, 0.88)';
  roundRect(ctx, x, y, width, height, 14);
  ctx.fill();
  ctx.strokeStyle = accent || 'rgba(242, 201, 76, 0.7)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, width, height, 14);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `bold 44px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, VIEW.width / 2, y + 66);
  ctx.font = `19px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < lines.length; i += 1) ctx.fillText(lines[i], VIEW.width / 2, y + 112 + i * 32);
  if (prompt) {
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillStyle = '#f2c94c';
    ctx.fillText(prompt, VIEW.width / 2, y + height - 30);
  }
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / VIEW.width, height / VIEW.height);
    view.x = (width - VIEW.width * view.scale) / 2;
    view.y = (height - VIEW.height * view.scale) / 2;
  }

  function drawWorld(state) {
    const cam = state.camera;
    context.save();
    context.translate(VIEW.width / 2 - cam.x, VIEW.height / 2 - cam.y);
    if (cam.shake > 0.2) {
      context.translate((Math.random() - 0.5) * cam.shake, (Math.random() - 0.5) * cam.shake);
    }
    drawGround(context, state.city);
    drawRoads(context, state.city, view);
    drawBuildings(context, state.city);
    drawTrees(context, state.city);
    // Skid marks under everything that moves.
    context.strokeStyle = 'rgba(20, 20, 20, 0.35)';
    context.lineWidth = 5;
    for (const s of state.skidmarks) {
      context.beginPath();
      context.moveTo(s.x - Math.cos(s.angle) * 12, s.y - Math.sin(s.angle) * 12);
      context.lineTo(s.x + Math.cos(s.angle) * 12, s.y + Math.sin(s.angle) * 12);
      context.stroke();
    }
    drawWaypoint(context, state);
    drawMissionMarker(context, state);
    // Pickups.
    for (const p of state.pickups) {
      const bob = Math.sin((p.bob || 0) * 4) * 3;
      context.fillStyle = p.kind === 'cash' ? '#7dd87d' : p.kind === 'health' ? '#ffffff' : '#ffd94a';
      context.beginPath();
      context.arc(p.x, p.y + bob, 10, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = p.kind === 'health' ? '#e53b2f' : '#222222';
      context.font = `bold 13px ${FONT}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(p.kind === 'cash' ? '$' : p.kind === 'health' ? '+' : 'A', p.x, p.y + bob);
      context.textBaseline = 'alphabetic';
    }
    for (const car of state.cars) drawCarBody(context, car);
    for (const ped of state.peds) {
      drawPerson(context, ped.x, ped.y, ped.angle, ped.shirt, ped.skin, ped.state === 'down', 0);
    }
    for (const enemy of state.enemies) {
      if (enemy.state === 'dead') drawPerson(context, enemy.x, enemy.y, enemy.angle, '#c0392b', '#d8a878', true, 0);
      else drawPerson(context, enemy.x, enemy.y, enemy.angle, '#c0392b', '#d8a878', false, enemy.flash);
    }
    for (const cop of state.cops) {
      if (cop.down) drawPerson(context, cop.x, cop.y, cop.angle, '#1f3a5f', '#d8a878', true, 0);
      else drawPerson(context, cop.x, cop.y, cop.angle, '#1f3a5f', '#d8a878', false, 0);
    }
    const player = state.player;
    if (!player.car) {
      drawPerson(context, player.x, player.y, player.aimAngle, PALETTE.player, '#d8a878', false, 0);
    }
    // Bullets as bright streaks.
    context.strokeStyle = '#ffe27a';
    context.lineWidth = 3;
    for (const b of state.bullets) {
      context.beginPath();
      context.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      context.lineTo(b.x, b.y);
      context.stroke();
    }
    drawParticles(context, state);
    drawLighting(context, cam);
    context.restore();
  }

  function drawTitle(state, best) {
    // A golden title over the living city.
    context.fillStyle = 'rgba(20, 12, 8, 0.35)';
    context.fillRect(0, 0, VIEW.width, VIEW.height);
    context.textAlign = 'center';
    context.fillStyle = '#ffffff';
    context.font = `bold 92px ${FONT}`;
    context.shadowColor = 'rgba(0,0,0,0.6)';
    context.shadowBlur = 24;
    context.fillText('SOLMAR CITY', VIEW.width / 2, 218);
    context.shadowBlur = 0;
    context.font = `bold 26px ${FONT}`;
    context.fillStyle = '#f2c94c';
    context.fillText('AN OPEN-WORLD CRIME STORY', VIEW.width / 2, 262);
    context.font = `19px ${FONT}`;
    context.fillStyle = 'rgba(255,255,255,0.92)';
    context.fillText('Steal cars. Outrun the law. Run five jobs for Mama Luz.', VIEW.width / 2, 320);
    context.fillText('A city on foot and by car — traffic, police, missions, and one gold sunset.', VIEW.width / 2, 348);
    const pulse = 0.75 + Math.sin(state.time * 3) * 0.25;
    context.globalAlpha = pulse;
    context.font = `bold 24px ${FONT}`;
    context.fillStyle = '#ffffff';
    context.fillText(state.hasSave ? 'Press Space or click — Continue your story' : 'Press Space or click — Start your story', VIEW.width / 2, 430);
    context.globalAlpha = 1;
    context.font = `15px ${FONT}`;
    context.fillStyle = 'rgba(255,255,255,0.75)';
    context.fillText('WASD move & drive  •  Mouse aim, Click shoot  •  E enter car  •  F punch  •  P pause  •  M mute', VIEW.width / 2, 500);
    if (best > 0) {
      context.font = `16px ${FONT}`;
      context.fillStyle = '#7dd87d';
      context.fillText(`Best fortune so far: $${best.toLocaleString('en-US')}`, VIEW.width / 2, 540);
    }
    context.font = `14px ${FONT}`;
    context.fillStyle = 'rgba(255,255,255,0.55)';
    context.fillText('An original game: its city, names, story, art and music are all its own.', VIEW.width / 2, VIEW.height - 24);
  }

  function drawBanner(state) {
    const banner = state.banner;
    if (!banner || banner.timer <= 0) return;
    const alpha = Math.min(1, banner.timer);
    context.save();
    context.globalAlpha = alpha;
    context.textAlign = 'center';
    context.font = `bold 34px ${FONT}`;
    context.fillStyle = '#ffffff';
    context.shadowColor = 'rgba(0,0,0,0.7)';
    context.shadowBlur = 12;
    context.fillText(banner.text, VIEW.width / 2, 130);
    if (banner.sub) {
      context.font = `19px ${FONT}`;
      context.fillStyle = '#f2c94c';
      context.fillText(banner.sub, VIEW.width / 2, 164);
    }
    context.restore();
  }

  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#141210';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawWorld(state);
    if (screen === SCREEN_TITLE) {
      drawTitle(state, best);
      return;
    }
    drawHud(context, state, screen);
    drawBanner(state);
    drawDialogue(context, state);
    if (screen === SCREEN_PAUSED) {
      const jobLine = state.mission.active
        ? `Mission: ${MISSION_NAMES[state.mission.index]}`
        : MISSION_NAMES[state.mission.index] ? `Next job: ${MISSION_NAMES[state.mission.index]}` : 'All jobs done.';
      drawPanel(context, 'Paused', ['The city waits for no one. Except now.', jobLine], 'Press P to resume');
    } else if (screen === SCREEN_BUSTED) {
      drawPanel(context, 'BUSTED', ['The Solmar police caught up with you.', 'Your mission failed. Bail is $200 — the city keeps the rest.'], 'Press Space to walk free', '#3b82ff');
    } else if (screen === SCREEN_WASTED) {
      drawPanel(context, 'WASTED', ['Solmar is a beautiful place to get hurt.', 'You wake up at the hospital, lighter by $200.'], 'Press Space to get back up', '#ff5a4e');
    } else if (screen === SCREEN_COMPLETE) {
      drawPanel(context, 'SOLMAR IS YOURS', ['Every job done. Every sunset earned.', `Final fortune: $${state.player.money.toLocaleString('en-US')}`], 'Press Space to keep roaming');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
