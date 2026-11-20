// Solmar City — HUD and screens: wanted stars, cash, health, the live canvas
// minimap, toasts, mission briefs, shop menus and the title/pause/busted/
// wasted/complete screens. Everything is drawn on the canvas.

const HUD = (() => {
  let toasts = [];
  let radioLines = [];
  let brief = null; // { def, t }
  let result = null; // { title, text, color, t }
  let shop = null; // { title, items, selected }
  let helpOpen = false;

  function toast(text, color) {
    toasts.push({ text, color: color || '#fff', t: 4 });
    if (toasts.length > 4) toasts.shift();
  }
  function radioLine(text) {
    radioLines.push({ text, t: 6 });
    if (radioLines.length > 3) radioLines.shift();
  }
  function showBrief(def) { brief = { def, t: 6 }; }
  function showResult(title, text, color) { result = { title, text, color, t: 6 }; }
  function openShop(menu) { shop = { title: menu.title, items: menu.items, selected: 0 }; }
  function closeShop() { shop = null; }
  function isShopOpen() { return !!shop; }
  function getShop() { return shop; }
  function setHelp(v) { helpOpen = v; }
  function isHelpOpen() { return helpOpen; }
  function getBrief() { return brief; }
  function getResult() { return result; }
  function dismissResult() { result = null; }

  function update(dt) {
    for (const t of toasts) t.t -= dt;
    toasts = toasts.filter(t => t.t > 0);
    for (const l of radioLines) l.t -= dt;
    radioLines = radioLines.filter(l => l.t > 0);
    if (brief) { brief.t -= dt; if (brief.t <= 0) brief = null; }
    if (result) { result.t -= dt; if (result.t <= 0) result = null; }
  }

  function drawPanel(g, x, y, w, h, alpha) {
    g.fillStyle = 'rgba(10,12,18,' + (alpha || 0.72) + ')';
    g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.18)';
    g.lineWidth = 1;
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  // --- Main HUD ---
  function drawHud(g, vw, vh) {
    const p = G.player;
    // Top-right: wanted stars + cash + respect.
    const w = Police.wanted();
    drawPanel(g, vw - 250, 12, 238, 96, 0.66);
    g.textAlign = 'right';
    g.font = 'bold 24px Arial';
    for (let i = 0; i < 5; i++) {
      g.fillStyle = i < w ? '#ffd23f' : 'rgba(255,255,255,0.25)';
      g.fillText('★', vw - 24 - (4 - i) * 28, 40);
    }
    g.font = 'bold 20px Arial';
    g.fillStyle = '#7ec850';
    g.fillText(Util.formatMoney(G.cash), vw - 24, 66);
    g.font = '13px Arial';
    g.fillStyle = '#ffd23f';
    g.fillText(Economy.rank().name.toUpperCase() + ' · ' + G.respect + ' RESPECT', vw - 24, 88);
    const next = Economy.nextRank();
    if (next) {
      g.fillStyle = '#bbb';
      g.font = '11px Arial';
      g.fillText('Next rank: ' + next.name + ' at ' + next.at, vw - 24, 102);
    }
    // Top-left: health + armor bars.
    drawPanel(g, 12, 12, 240, 58, 0.66);
    g.textAlign = 'left';
    g.font = 'bold 12px Arial';
    g.fillStyle = '#fff';
    g.fillText('DARE SOLIS', 22, 30);
    g.fillStyle = 'rgba(255,255,255,0.2)';
    g.fillRect(22, 38, 200, 10);
    g.fillStyle = p.hp > 30 ? '#7ec850' : '#ff5a3c';
    g.fillRect(22, 38, 200 * Util.clamp(p.hp / 100, 0, 1), 10);
    if (p.armor > 0) {
      g.fillStyle = 'rgba(255,255,255,0.2)';
      g.fillRect(22, 52, 200, 6);
      g.fillStyle = '#5aa2e8';
      g.fillRect(22, 52, 200 * Util.clamp(p.armor / 100, 0, 1), 6);
    }
    // Bust warning.
    const bust = Police.getBustProgress();
    if (bust > 0) {
      drawPanel(g, vw / 2 - 130, 12, 260, 34, 0.8);
      g.fillStyle = '#ff5a3c';
      g.font = 'bold 14px Arial'; g.textAlign = 'center';
      g.fillText('SPD IS GRABBING YOU — RUN!', vw / 2, 26);
      g.fillStyle = 'rgba(255,255,255,0.2)';
      g.fillRect(vw / 2 - 120, 32, 240, 6);
      g.fillStyle = '#ff5a3c';
      g.fillRect(vw / 2 - 120, 32, 240 * bust, 6);
    }
    // Bottom-right: weapon + ammo + radio.
    const wname = Combat.currentWeapon().name;
    drawPanel(g, vw - 250, vh - 96, 238, 84, 0.66);
    g.textAlign = 'right';
    g.font = 'bold 16px Arial';
    g.fillStyle = '#fff';
    g.fillText(wname.toUpperCase(), vw - 24, vh - 66);
    g.font = '13px Arial';
    g.fillStyle = '#bbb';
    const ammo = p.weapon === 'fists' ? '∞' : (p.ammo[p.weapon] || 0);
    g.fillText('AMMO ' + ammo + '  ·  Q: WEAPON WHEEL', vw - 24, vh - 46);
    const st = AudioSys.currentStation();
    g.fillStyle = AudioSys.isMuted() ? '#666' : '#ff9e5a';
    g.fillText((AudioSys.isMuted() ? 'RADIO MUTED' : '♪ ' + st.name) + '  ·  N: STATION', vw - 24, vh - 26);
    // Car health when driving.
    if (p.inCar && p.car) {
      drawPanel(g, vw - 250, vh - 132, 238, 28, 0.66);
      g.fillStyle = 'rgba(255,255,255,0.2)';
      g.fillRect(vw - 240, vh - 124, 180, 8);
      g.fillStyle = p.car.hp > 30 ? '#7ec850' : '#ff5a3c';
      g.fillRect(vw - 240, vh - 124, 180 * Util.clamp(p.car.hp / p.car.maxHp, 0, 1), 8);
      g.font = '11px Arial'; g.fillStyle = '#fff'; g.textAlign = 'right';
      g.fillText(p.car.name.toUpperCase(), vw - 24, vh - 116);
    }
    // Crew status bottom-left above the minimap.
    const crewY = vh - 278;
    drawPanel(g, 12, crewY, 210, 92, 0.66);
    g.textAlign = 'left';
    g.font = 'bold 12px Arial';
    g.fillStyle = '#ffd23f';
    g.fillText('CREW', 22, crewY + 18);
    g.font = '12px Arial';
    ['maya', 'ghost', 'lou'].forEach((id, i) => {
      const m = Crew.MEMBERS[id];
      const cd = Crew.cooldownLeft(id);
      g.fillStyle = Crew.recruited(id) ? (cd > 0 ? '#888' : m.color) : '#555';
      const first = id === 'lou' ? 'Lou' : m.name.split(' ')[0];
      const status = Crew.recruited(id) ? (cd > 0 ? ' (' + Math.ceil(cd) + 's)' : ' — READY') : ' — LOCKED';
      g.fillText('[' + m.abilityKey + '] ' + first + status, 22, crewY + 36 + i * 18);
    });
    // Mission objective banner.
    const obj = Missions.objectiveText();
    if (obj && Missions.getCurrent()) {
      const m = Missions.getCurrent().def;
      drawPanel(g, vw / 2 - 260, 12, 520, 54, 0.72);
      g.textAlign = 'center';
      g.font = 'bold 14px Arial';
      g.fillStyle = '#ffd23f';
      g.fillText(m.name.toUpperCase() + ' — ' + m.giver.toUpperCase(), vw / 2, 32);
      g.font = '13px Arial';
      g.fillStyle = '#fff';
      g.fillText(obj, vw / 2, 52);
    }
    drawMinimap(g, vw, vh);
    drawToasts(g, vw, vh);
    drawRadioLines(g, vw, vh);
    if (brief) drawBrief(g, vw, vh);
    if (result) drawResult(g, vw, vh);
    if (shop) drawShop(g, vw, vh);
    if (helpOpen) drawHelp(g, vw, vh);
    Combat.drawWeaponWheel(g, vw, vh);
    Races.drawRaceHud(g, vw);
    drawHints(g, vw, vh);
  }

  function drawHints(g, vw, vh) {
    const p = G.player;
    let hint = null;
    if (!p.inCar) {
      const nearCar = Game.nearestCar(60);
      if (nearCar) hint = 'E — ' + (nearCar.driver ? 'CARJACK the ' + nearCar.name : 'ENTER the ' + nearCar.name);
      else if (Game.nearLandmark('garage', 110) && p.car) hint = 'E — OPEN GARAGE';
      else if (Game.nearLandmark('gunshop', 110)) hint = 'E — ENTER SOLMAR ARMS';
      else if (Game.nearLandmark('diner', 110)) hint = 'E — ENTER SUNSET DINER';
      else if (Game.nearLandmark('safehouse', 110)) hint = 'E — SLEEP AT SAFEHOUSE (save + heal)';
      else if (Game.nearLandmark('raceHub', 130)) hint = 'E — STREET RACES';
      else if (Game.nearMissionMarker(90)) hint = 'E — START MISSION: ' + Missions.nextMission().name.toUpperCase();
      else if (Combat.findCover()) hint = 'C — TAKE COVER';
    } else {
      hint = 'E — EXIT CAR · SPACE — HANDBRAKE · H — HORN';
    }
    if (hint) {
      g.font = 'bold 14px Arial';
      const w = g.measureText(hint).width + 28;
      drawPanel(g, vw / 2 - w / 2, vh - 56, w, 30, 0.75);
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.fillText(hint, vw / 2, vh - 36);
    }
  }

  // --- Live minimap ---
  function drawMinimap(g, vw, vh) {
    const S = 168, x0 = 12, y0 = vh - S - 12;
    const sx = S / City.W, sy = S / City.H;
    drawPanel(g, x0 - 4, y0 - 4, S + 8, S + 8, 0.8);
    g.save();
    g.beginPath();
    g.rect(x0, y0, S, S);
    g.clip();
    g.fillStyle = '#d9cba8';
    g.fillRect(x0, y0, S, S);
    g.fillStyle = '#3fb8c9';
    g.fillRect(x0, y0 + City.WATER_Y * sy, S, S - City.WATER_Y * sy);
    g.fillStyle = '#f2e2b8';
    g.fillRect(x0, y0 + City.BEACH_Y * sy, S, (City.WATER_Y - City.BEACH_Y) * sy);
    g.strokeStyle = '#555';
    g.lineWidth = 3;
    for (const rx of City.V_ROADS) { g.beginPath(); g.moveTo(x0 + rx * sx, y0); g.lineTo(x0 + rx * sx, y0 + S); g.stroke(); }
    for (const ry of City.H_ROADS) { g.beginPath(); g.moveTo(x0, y0 + ry * sy); g.lineTo(x0 + S, y0 + ry * sy); g.stroke(); }
    // Landmarks.
    g.font = 'bold 9px Arial'; g.textAlign = 'center';
    for (const k in City.LANDMARKS) {
      const L = City.LANDMARKS[k];
      g.fillStyle = '#ffd23f';
      g.fillText(L.icon, x0 + L.x * sx, y0 + L.y * sy + 3);
    }
    // Mission marker + objective.
    for (const m of Missions.startMarkers()) {
      if (Missions.getCurrent()) break;
      g.fillStyle = '#ffd23f';
      g.beginPath(); g.arc(x0 + m.x * sx, y0 + m.y * sy, 5, 0, Util.TAU); g.fill();
    }
    const cur = Missions.getCurrent();
    if (cur) {
      const st = Missions.currentStep();
      if (st && st.x !== undefined) {
        g.fillStyle = '#ff5a3c';
        g.beginPath(); g.arc(x0 + st.x * sx, y0 + st.y * sy, 5, 0, Util.TAU); g.fill();
      }
    }
    // Cops (blue), enemies (red), player (white arrow).
    for (const c of G.cops) {
      if (c.dead) continue;
      const cx = c.type === 'cruiser' ? c.car.x : c.x;
      const cy = c.type === 'cruiser' ? c.car.y : c.y;
      g.fillStyle = '#2f6fff';
      g.fillRect(x0 + cx * sx - 2, y0 + cy * sy - 2, 4, 4);
    }
    const heli = Police.getHeli();
    if (heli) {
      g.fillStyle = '#2f6fff';
      g.beginPath(); g.arc(x0 + heli.x * sx, y0 + heli.y * sy, 4, 0, Util.TAU); g.fill();
    }
    for (const e of G.enemies) {
      if (e.dead) continue;
      g.fillStyle = '#ff2f2f';
      g.fillRect(x0 + e.x * sx - 2, y0 + e.y * sy - 2, 4, 4);
    }
    const p = G.player;
    g.save();
    g.translate(x0 + p.x * sx, y0 + p.y * sy);
    g.rotate(p.inCar ? p.car.angle : p.angle);
    g.fillStyle = '#fff';
    g.strokeStyle = '#111'; g.lineWidth = 1;
    g.beginPath();
    g.moveTo(7, 0); g.lineTo(-5, -5); g.lineTo(-5, 5);
    g.closePath(); g.fill(); g.stroke();
    g.restore();
    // North indicator.
    g.fillStyle = '#fff';
    g.font = 'bold 11px Arial';
    g.fillText('N', x0 + S - 10, y0 + 14);
    g.restore();
  }

  function drawToasts(g, vw, vh) {
    g.textAlign = 'center';
    toasts.forEach((t, i) => {
      const y = vh - 180 - i * 30;
      g.font = 'bold 15px Arial';
      const w = g.measureText(t.text).width + 30;
      drawPanel(g, vw / 2 - w / 2, y - 20, w, 26, 0.75);
      g.fillStyle = t.color;
      g.fillText(t.text, vw / 2, y - 2);
    });
  }

  function drawRadioLines(g, vw, vh) {
    g.textAlign = 'left';
    radioLines.forEach((l, i) => {
      g.font = '13px Arial';
      const y = 96 + i * 22;
      g.fillStyle = 'rgba(10,12,18,0.66)';
      const w = g.measureText(l.text).width + 16;
      g.fillRect(12, y - 14, w, 19);
      g.fillStyle = '#8fd0ff';
      g.fillText(l.text, 20, y);
    });
  }

  function drawBrief(g, vw, vh) {
    const d = brief.def;
    const w = 620, h = 150;
    const x = vw / 2 - w / 2, y = vh / 2 - h / 2 - 60;
    drawPanel(g, x, y, w, h, 0.9);
    g.textAlign = 'left';
    g.fillStyle = '#ffd23f';
    g.font = 'bold 22px Arial';
    g.fillText(d.name.toUpperCase(), x + 24, y + 36);
    g.fillStyle = '#ff9e5a';
    g.font = 'bold 13px Arial';
    g.fillText(d.giver.toUpperCase() + '  ·  REWARD ' + Util.formatMoney(d.reward) + '  ·  +' + d.respect + ' RESPECT', x + 24, y + 58);
    g.fillStyle = '#fff';
    g.font = '15px Arial';
    wrapText(g, d.brief, x + 24, y + 84, w - 48, 20);
  }

  function drawResult(g, vw, vh) {
    const w = 560, h = 170;
    const x = vw / 2 - w / 2, y = vh / 2 - h / 2 - 40;
    drawPanel(g, x, y, w, h, 0.92);
    g.textAlign = 'center';
    g.fillStyle = result.color;
    g.font = 'bold 28px Arial';
    g.fillText(result.title, vw / 2, y + 44);
    g.fillStyle = '#fff';
    g.font = '15px Arial';
    const lines = result.text.split('\n');
    lines.forEach((line, i) => g.fillText(line, vw / 2, y + 74 + i * 22));
    g.fillStyle = '#999';
    g.font = '12px Arial';
    g.fillText('Press any key to continue', vw / 2, y + h - 14);
  }

  function drawShop(g, vw, vh) {
    const w = 640, h = Math.min(480, 110 + shop.items.length * 44);
    const x = vw / 2 - w / 2, y = vh / 2 - h / 2;
    drawPanel(g, x, y, w, h, 0.94);
    g.textAlign = 'left';
    g.fillStyle = '#ffd23f';
    g.font = 'bold 20px Arial';
    g.fillText(shop.title, x + 24, y + 34);
    g.fillStyle = '#7ec850';
    g.font = 'bold 15px Arial';
    g.fillText('CASH: ' + Util.formatMoney(G.cash), x + 24, y + 58);
    g.fillStyle = '#999';
    g.font = '12px Arial';
    g.fillText('↑↓ select · ENTER buy · E / ESC close', x + w - 230, y + 58);
    shop.items.forEach((item, i) => {
      const iy = y + 76 + i * 44;
      if (i === shop.selected) {
        g.fillStyle = 'rgba(255,210,63,0.18)';
        g.fillRect(x + 12, iy - 6, w - 24, 38);
        g.strokeStyle = '#ffd23f';
        g.strokeRect(x + 12, iy - 6, w - 24, 38);
      }
      g.fillStyle = item.disabled ? '#666' : '#fff';
      g.font = 'bold 15px Arial';
      g.fillText(item.label, x + 24, iy + 12);
      g.fillStyle = '#aaa';
      g.font = '12px Arial';
      g.fillText(item.desc, x + 24, iy + 29);
    });
  }

  function drawHelp(g, vw, vh) {
    const w = 660, h = 470;
    const x = vw / 2 - w / 2, y = vh / 2 - h / 2;
    drawPanel(g, x, y, w, h, 0.95);
    g.textAlign = 'left';
    g.fillStyle = '#ffd23f';
    g.font = 'bold 22px Arial';
    g.fillText('HOW TO PLAY — SOLMAR CITY', x + 24, y + 36);
    const lines = [
      ['W A S D', 'Move on foot / drive (W accelerate, S brake/reverse)'],
      ['Mouse', 'Aim · Click to shoot · Hold Q for the weapon wheel'],
      ['E', 'Enter / exit car · Carjack · Talk · Hack · Open shops'],
      ['C', 'Take cover by a wall or car (70% less damage)'],
      ['Space', 'Handbrake while driving'],
      ['1-5', 'Select weapon · N radio station · M mute · H horn'],
      ['7 / 8 / 9', 'Crew abilities: Maya getaway car · Ghost SPD hack · Lou backup'],
      ['Esc', 'Pause · F5 save (auto-saves at missions & safehouse)'],
      ['', ''],
      ['GOAL', 'Run 9 story missions from the gold markers, win 5 street'],
      ['', 'races, build respect from Street Rat to Kingpin of Solmar,'],
      ['', 'and stay out of Solmar PD\'s way — or outrun them.'],
    ];
    g.font = '14px Arial';
    lines.forEach((row, i) => {
      const ly = y + 66 + i * 26;
      g.fillStyle = '#ffd23f';
      g.font = 'bold 14px Arial';
      g.fillText(row[0], x + 24, ly);
      g.fillStyle = '#ddd';
      g.font = '14px Arial';
      g.fillText(row[1], x + 140, ly);
    });
    g.fillStyle = '#999';
    g.font = '12px Arial';
    g.fillText('Press H or ESC to close', x + 24, y + h - 16);
  }

  function wrapText(g, text, x, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '', ly = y;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (g.measureText(test).width > maxW && line) {
        g.fillText(line, x, ly);
        line = word;
        ly += lineH;
      } else line = test;
    }
    if (line) g.fillText(line, x, ly);
  }

  // --- Full screens ---
  function drawTitle(g, vw, vh) {
    // Golden-hour sky.
    const sky = g.createLinearGradient(0, 0, 0, vh);
    sky.addColorStop(0, '#2b1d4e');
    sky.addColorStop(0.45, '#c94f7c');
    sky.addColorStop(0.75, '#ff9e5a');
    sky.addColorStop(1, '#ffd23f');
    g.fillStyle = sky;
    g.fillRect(0, 0, vw, vh);
    // Sun.
    g.fillStyle = '#fff3c9';
    g.beginPath(); g.arc(vw * 0.72, vh * 0.42, 70, 0, Util.TAU); g.fill();
    g.fillStyle = 'rgba(255,243,201,0.35)';
    g.beginPath(); g.arc(vw * 0.72, vh * 0.42, 110, 0, Util.TAU); g.fill();
    // City skyline silhouette.
    g.fillStyle = '#1d1430';
    const skyline = [120, 200, 150, 260, 180, 300, 210, 170, 240, 320, 190, 150, 280, 200, 160];
    let sx = 0;
    const bw = vw / skyline.length;
    skyline.forEach(h => {
      g.fillRect(sx, vh * 0.62 - h * 0.5, bw - 6, vh);
      // Lit windows.
      g.fillStyle = 'rgba(255,210,63,0.8)';
      for (let i = 0; i < 5; i++) g.fillRect(sx + 8 + (i % 3) * 14, vh * 0.62 - h * 0.5 + 12 + Math.floor(i / 3) * 18, 6, 8);
      g.fillStyle = '#1d1430';
      sx += bw;
    });
    // Beach strip.
    g.fillStyle = '#f2e2b8';
    g.fillRect(0, vh * 0.86, vw, vh * 0.14);
    g.fillStyle = '#1d7fa8';
    g.fillRect(0, vh * 0.94, vw, vh * 0.06);
    // Title.
    g.textAlign = 'center';
    g.fillStyle = '#fff';
    g.font = 'bold 88px "Arial Black", Arial';
    g.strokeStyle = 'rgba(0,0,0,0.55)';
    g.lineWidth = 10;
    g.strokeText('SOLMAR CITY', vw / 2, 150);
    g.fillText('SOLMAR CITY', vw / 2, 150);
    g.font = 'bold 22px Arial';
    g.fillStyle = '#ffd23f';
    g.fillText('A SUN-SOAKED OPEN-WORLD CRIME STORY', vw / 2, 188);
    g.font = '15px Arial';
    g.fillStyle = '#fff';
    g.fillText('9 story missions · 3-person crew · Solmar PD dispatch · 5 street races · garage · radio · saves', vw / 2, 216);
    // Menu buttons.
    const buttons = Title.menuButtons(vw, vh);
    buttons.forEach(b => {
      const hover = b.hover;
      g.fillStyle = hover ? '#ffd23f' : 'rgba(10,12,18,0.8)';
      g.fillRect(b.x, b.y, b.w, b.h);
      g.strokeStyle = '#ffd23f';
      g.lineWidth = 2;
      g.strokeRect(b.x, b.y, b.w, b.h);
      g.fillStyle = hover ? '#111' : '#fff';
      g.font = 'bold 18px Arial';
      g.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 6);
    });
    g.font = '13px Arial';
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillText('WASD move/drive · Mouse aim · E interact · Q weapon wheel · H help', vw / 2, vh - 24);
  }

  function drawPause(g, vw, vh) {
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillRect(0, 0, vw, vh);
    g.textAlign = 'center';
    g.fillStyle = '#fff';
    g.font = 'bold 44px Arial';
    g.fillText('PAUSED', vw / 2, vh / 2 - 90);
    g.font = '16px Arial';
    g.fillStyle = '#ffd23f';
    g.fillText(Economy.rank().name.toUpperCase() + ' · ' + G.respect + ' RESPECT · ' + Util.formatMoney(G.cash), vw / 2, vh / 2 - 56);
    g.fillStyle = '#fff';
    g.fillText('Missions complete: ' + G.missionsDone.length + ' / ' + Missions.DEFS.length, vw / 2, vh / 2 - 30);
    const st = Object.keys(G.standing).map(k => {
      const d = City.DISTRICTS.find(dd => dd.id === k);
      return (d ? d.name : k) + ' ' + G.standing[k];
    }).join('  ·  ');
    g.font = '13px Arial';
    g.fillStyle = '#bbb';
    g.fillText('DISTRICT STANDING: ' + (st || 'none yet'), vw / 2, vh / 2 - 6);
    g.font = '15px Arial';
    g.fillStyle = '#fff';
    g.fillText('ESC — resume   ·   H — help   ·   S — save game   ·   R — restart run', vw / 2, vh / 2 + 40);
  }

  function drawBusted(g, vw, vh) {
    g.fillStyle = 'rgba(10,20,60,0.88)';
    g.fillRect(0, 0, vw, vh);
    g.textAlign = 'center';
    g.fillStyle = '#8fd0ff';
    g.font = 'bold 72px "Arial Black", Arial';
    g.fillText('BUSTED', vw / 2, vh / 2 - 40);
    g.fillStyle = '#fff';
    g.font = '18px Arial';
    g.fillText('Solmar PD took you in. Bail cost you $250 and your weapons were kept.', vw / 2, vh / 2 + 4);
    g.fillText('Your crew is waiting at the safehouse.', vw / 2, vh / 2 + 32);
    g.font = '15px Arial';
    g.fillStyle = '#ffd23f';
    g.fillText('Press ENTER to get out and keep playing', vw / 2, vh / 2 + 80);
  }

  function drawWasted(g, vw, vh) {
    g.fillStyle = 'rgba(40,0,0,0.88)';
    g.fillRect(0, 0, vw, vh);
    g.textAlign = 'center';
    g.fillStyle = '#ff5a3c';
    g.font = 'bold 72px "Arial Black", Arial';
    g.fillText('WASTED', vw / 2, vh / 2 - 40);
    g.fillStyle = '#fff';
    g.font = '18px Arial';
    g.fillText('Solmar is unforgiving. You wake up at the safehouse, $200 lighter.', vw / 2, vh / 2 + 4);
    g.font = '15px Arial';
    g.fillStyle = '#ffd23f';
    g.fillText('Press ENTER to get back on your feet', vw / 2, vh / 2 + 80);
  }

  function drawComplete(g, vw, vh) {
    g.fillStyle = 'rgba(20,30,10,0.9)';
    g.fillRect(0, 0, vw, vh);
    g.textAlign = 'center';
    g.fillStyle = '#ffd23f';
    g.font = 'bold 54px "Arial Black", Arial';
    g.fillText('KINGPIN OF SOLMAR', vw / 2, vh / 2 - 60);
    g.fillStyle = '#fff';
    g.font = '18px Arial';
    g.fillText('All 9 story missions complete. The city is yours, Dare.', vw / 2, vh / 2 - 10);
    g.fillText('Keep playing: races, garage, respect and free roam never end.', vw / 2, vh / 2 + 20);
    g.font = '15px Arial';
    g.fillStyle = '#ffd23f';
    g.fillText('Press ENTER to keep playing', vw / 2, vh / 2 + 70);
  }

  return { toast, radioLine, showBrief, showResult, openShop, closeShop, isShopOpen, getShop, setHelp, isHelpOpen, getBrief, getResult, dismissResult, update, drawHud, drawTitle, drawPause, drawBusted, drawWasted, drawComplete, drawPanel };
})();
