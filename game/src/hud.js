// Solmar City — HUD: fills every mount in index.html from live game state.
// Mission tracker (hidden with no mission), dispatch panel, dialogue box,
// weapon slots + wheel, district standing, cash/respect/rank, wanted stars,
// speedometer, radio, minimap (roads, player, police, heli, mission marker),
// crew + race status, notice passthrough, crosshair. Readable at 1280x720.
import { WEAPONS } from './combat.js';

const $ = (id) => document.getElementById(id);

export function createHUD(ctx) {
  const minimapCtx = $('minimap').getContext('2d');
  let timer = 0;
  let dialogue = null; // { lines, idx, t, onDone }
  let prevMouseDown = false;
  let wheelEl = null;
  let healthEl = null;

  // Health bar (no static mount for it): small bar above the weapon slots.
  healthEl = document.createElement('div');
  healthEl.id = 'health-bar-wrap';
  healthEl.innerHTML = '<div id="health-bar"><div id="health-fill"></div></div><span id="health-text"></span>';
  $('hud').appendChild(healthEl);

  function showDialogue(lines, onDone) {
    if (!lines || !lines.length) return;
    dialogue = { lines, idx: 0, t: 0, onDone };
    renderDialogue();
  }

  function renderDialogue() {
    const box = $('dialogue-box');
    if (!dialogue) { box.classList.add('hidden'); return; }
    const l = dialogue.lines[dialogue.idx];
    $('dialogue-portrait').textContent = l.initials || '?';
    $('dialogue-portrait').style.background = `linear-gradient(135deg, ${l.color || '#e08a2e'}, #2a1a3e)`;
    $('dialogue-speaker').textContent = l.speaker || '';
    $('dialogue-text').textContent = l.text || '';
    box.classList.remove('hidden');
  }

  function advanceDialogue() {
    if (!dialogue) return;
    dialogue.idx++;
    dialogue.t = 0;
    if (dialogue.idx >= dialogue.lines.length) {
      const done = dialogue.onDone;
      dialogue = null;
      $('dialogue-box').classList.add('hidden');
      done?.();
    } else renderDialogue();
  }

  function dialogueActive() { return !!dialogue; }

  function drawMinimap() {
    const ctx2 = minimapCtx;
    const S = 180;
    const range = 130;
    const { player, police, world } = ctx;
    ctx2.clearRect(0, 0, S, S);
    ctx2.fillStyle = '#10142a';
    ctx2.fillRect(0, 0, S, S);
    const toMap = (x, z) => [
      S / 2 + ((x - player.x) / range) * S,
      S / 2 + ((z - player.z) / range) * S,
    ];
    ctx2.strokeStyle = '#3a3a4a';
    ctx2.lineWidth = 7;
    for (const c of world.roadCenters) {
      const [ax] = toMap(c, 0);
      ctx2.beginPath(); ctx2.moveTo(ax, 0); ctx2.lineTo(ax, S); ctx2.stroke();
      const [, bz] = toMap(0, c);
      ctx2.beginPath(); ctx2.moveTo(0, bz); ctx2.lineTo(S, bz); ctx2.stroke();
    }
    const [bx] = toMap(232, 0);
    ctx2.fillStyle = '#e8c98a';
    ctx2.fillRect(bx, 0, S - bx, S);
    // Mission marker: pulsing amber diamond.
    const mp = ctx.missions?.markerPos?.();
    if (mp) {
      const [mx, my] = toMap(mp.x, mp.z);
      const pulse = 5 + Math.sin(ctx.game.time * 4) * 2;
      ctx2.save();
      ctx2.translate(mx, my);
      ctx2.rotate(Math.PI / 4);
      ctx2.fillStyle = '#ffb347';
      ctx2.fillRect(-pulse / 2, -pulse / 2, pulse, pulse);
      ctx2.restore();
    }
    // Race checkpoint.
    const rp = ctx.races?.checkpointPos?.();
    if (rp) {
      const [rx, ry] = toMap(rp.x, rp.z);
      ctx2.fillStyle = '#7ee787';
      ctx2.beginPath(); ctx2.arc(rx, ry, 5, 0, Math.PI * 2); ctx2.fill();
    }
    // Enemy blips.
    ctx2.fillStyle = '#ff4d4d';
    for (const e of ctx.combat?.enemies || []) {
      if (e.dead) continue;
      const [ex, ey] = toMap(e.mesh.position.x, e.mesh.position.z);
      ctx2.beginPath(); ctx2.arc(ex, ey, 3.5, 0, Math.PI * 2); ctx2.fill();
    }
    // Police blips.
    ctx2.fillStyle = '#4da6ff';
    for (const c of police.cruisers) {
      const [x, y] = toMap(c.x, c.z);
      ctx2.beginPath(); ctx2.arc(x, y, 4, 0, Math.PI * 2); ctx2.fill();
    }
    if (police.heli) {
      const [x, y] = toMap(police.heli.position.x, police.heli.position.z);
      ctx2.fillStyle = '#ffd27a';
      ctx2.beginPath(); ctx2.arc(x, y, 5, 0, Math.PI * 2); ctx2.fill();
    }
    // Player arrow.
    const [px, py] = toMap(player.x, player.z);
    ctx2.save();
    ctx2.translate(px, py);
    ctx2.rotate(Math.atan2(Math.sin(player.heading), Math.cos(player.heading)) + Math.PI);
    ctx2.fillStyle = '#ffffff';
    ctx2.beginPath();
    ctx2.moveTo(0, -7); ctx2.lineTo(5, 6); ctx2.lineTo(-5, 6); ctx2.closePath();
    ctx2.fill();
    ctx2.restore();
  }

  function fmtClock(t) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function update(dt, policeStatus) {
    const { game, player, police, traffic, audio, input } = ctx;
    // Dialogue: advance on E / click (rising edge), or auto-advance after 7s.
    const clicked = input.mouseDown && !prevMouseDown;
    prevMouseDown = input.mouseDown;
    if (dialogue) {
      dialogue.t += dt;
      if (input.wasPressed('KeyE') || clicked) advanceDialogue();
      else if (dialogue.t > 7) advanceDialogue();
    }
    drawMinimap();

    timer -= dt;
    if (timer > 0) return;
    timer = 0.12;

    // Wanted stars + bust meter.
    const w = police.wanted;
    let stars = '';
    for (let i = 0; i < 5; i++) stars += `<span class="${i < w ? 'star' : 'star-off'}">★</span>`;
    $('wanted-stars').innerHTML = stars;
    const bp = policeStatus?.bustProgress || 0;
    $('bust-meter').classList.toggle('hidden', bp <= 0.02);
    $('bust-fill').style.width = `${Math.min(100, bp * 100)}%`;

    // District + standing.
    const standing = ctx.economy.districtStandingAt(player.x, player.z);
    $('district-name').textContent = standing.district;
    $('district-standing').innerHTML =
      `Standing ${Math.round(standing.value)}/100 <span class="standing-bar"><span style="width:${standing.value}%"></span></span>`;

    // Cash / respect / rank.
    $('cash-display').textContent = `$${game.cash.toLocaleString('en-US')}`;
    $('respect-rank').textContent = game.rank;
    $('respect-fill').style.width = `${Math.min(100, game.respect)}%`;

    // Health.
    const hp = Math.round(player.health);
    $('health-fill').style.width = `${hp}%`;
    $('health-fill').style.background = hp > 50 ? '#7ee787' : hp > 25 ? '#ffb347' : '#ff4d4d';
    $('health-text').textContent = `HP ${hp}${game.armor > 0 ? `  🛡 ${Math.round(game.armor)}` : ''}`;

    // Mission tracker: hidden with no mission.
    const mh = ctx.missions?.getHUD?.();
    $('mission-tracker').classList.toggle('hidden', !mh);
    if (mh) {
      $('mission-title').textContent = mh.title;
      $('mission-stage').textContent = mh.stageText;
      $('mission-timer').textContent = mh.timerText;
      $('mission-objectives').innerHTML = mh.objectives.map((o) =>
        `<li class="${o.done ? 'done' : ''}">${o.done ? '✓ ' : o.active ? '▸ ' : '○ '}${o.text}</li>`,
      ).join('');
    }

    // Dispatch panel.
    const units = police.dispatchUnits(player.x, player.z);
    $('dispatch-panel').classList.toggle('hidden', units.length === 0);
    $('dispatch-units').innerHTML = units.map((u) =>
      `<li><span class="dispatch-callsign">${u.callsign}</span><span class="dispatch-status">${u.status}</span><span class="dispatch-dist">${u.dist}m</span></li>`,
    ).join('');

    // Speedometer + vehicle.
    if (player.vehicle) {
      $('vehicle-name').textContent = player.vehicle.label.toUpperCase();
      $('speed-value').textContent = String(Math.round(Math.abs(player.vehicle.speed) * 2.237));
      const cond = player.vehicle.health;
      $('condition-fill').style.width = `${cond}%`;
      $('condition-fill').style.background = cond > 50 ? '#7ee787' : cond > 25 ? '#ffb347' : '#ff4d4d';
      $('speedo-wrap').classList.remove('hidden');
    } else {
      $('vehicle-name').textContent = 'ON FOOT';
      $('speed-value').textContent = String(Math.round(player.speed * 2.237));
      $('condition-fill').style.width = '100%';
      $('condition-fill').style.background = '#7ee787';
    }

    // Radio.
    $('radio-station').textContent = audio.stationName;
    $('radio-track').textContent = audio.muted ? '(muted)' : audio.trackName;

    // Weapon slots.
    const combat = ctx.combat;
    $('weapon-slots').innerHTML = WEAPONS.map((wpn, i) => {
      const owned = combat.owns(i);
      const a = combat.ammoFor(i);
      const ammoTxt = !owned ? 'LOCKED' : wpn.ammo ? `${a.mag === Infinity ? '∞' : a.mag} / ${a.reserve}` : '—';
      return `<div class="weapon-slot ${i === combat.current ? 'active' : ''} ${owned ? '' : 'locked'}"><span class="w-key">${i + 1}</span><span>${wpn.name}</span><span>${ammoTxt}</span></div>`;
    }).join('');
    if (combat.reloading) {
      const slots = $('weapon-slots').children;
      if (slots[combat.current]) slots[combat.current].classList.add('reloading');
    }

    // Weapon wheel overlay (hold Q).
    if (combat.wheelOpen && !wheelEl) {
      wheelEl = document.createElement('div');
      wheelEl.id = 'weapon-wheel';
      $('hud').appendChild(wheelEl);
    }
    if (wheelEl) {
      wheelEl.classList.toggle('hidden', !combat.wheelOpen);
      if (combat.wheelOpen) {
        wheelEl.innerHTML = '<div class="wheel-title">WEAPON WHEEL — flick mouse / 1–5, release Q</div>' +
          WEAPONS.map((wpn, i) =>
            `<div class="wheel-slot ${i === combat.current ? 'active' : ''} ${combat.owns(i) ? '' : 'locked'}">${i + 1} ${wpn.name}</div>`,
          ).join('');
      }
    }

    // Crew status.
    const crewEl = $('crew-status');
    if (crewEl) {
      crewEl.innerHTML = ctx.crew.CREW.map((m) => {
        const rec = ctx.crew.isRecruited(m.id);
        const cd = Math.ceil(ctx.crew.cooldowns[m.id] || 0);
        const state = !rec ? '🔒' : cd > 0 ? `${cd}s` : '✓';
        return `<div class="crew-row"><span class="crew-key">${m.key.replace('Digit', '')}</span><span class="crew-name">${m.name}</span><span class="crew-state">${state}</span></div>`;
      }).join('');
    }

    // Race status.
    const raceEl = $('race-status');
    if (raceEl) {
      const race = ctx.races.active;
      if (race) {
        const pos = race.position || 1;
        raceEl.classList.remove('hidden');
        raceEl.innerHTML = `<b>${race.def.name.toUpperCase()}</b> · P${pos}/4 · CP ${race.cp}/${race.def.checkpoints.length} · ${fmtClock(race.time)}`;
      } else if (ctx.races.nearHub) {
        raceEl.classList.remove('hidden');
        raceEl.innerHTML = 'MARINA RACE HUB — press F to pick a race';
      } else {
        raceEl.classList.add('hidden');
      }
    }

    // Interaction prompt: shops/races first, then cars.
    const prompt = $('interaction-prompt');
    const nearLoc = ctx.economy?.nearLoc;
    const nearHub = ctx.races?.nearHub && !ctx.races.active;
    const nearCar = player.onFoot && player.nearestCarDistance(traffic) < 5;
    const showExit = !player.onFoot && player.vehicle && Math.abs(player.vehicle.speed) < 3;
    if (nearLoc) {
      prompt.classList.remove('hidden');
      prompt.textContent = `Press F — ${nearLoc.name}`;
    } else if (nearHub) {
      prompt.classList.remove('hidden');
      prompt.textContent = 'Press F — Marina Race Hub';
    } else if (nearCar) {
      prompt.classList.remove('hidden');
      prompt.textContent = 'Press E to enter car';
    } else if (showExit) {
      prompt.classList.remove('hidden');
      prompt.textContent = 'Press E to exit car';
    } else {
      prompt.classList.add('hidden');
    }

    // Crosshair: on foot with a ranged weapon, no UI open.
    const uiBusy = ctx.economy?.panelOpen || ctx.races?.panelOpen || ctx.missions?.panelOpen || dialogue;
    const showCross = player.onFoot && combat.current !== 0 && !uiBusy;
    $('crosshair').classList.toggle('hidden', !showCross);
    $('crosshair').textContent = combat.inCover ? '◉' : '+';
  }

  return { update, showDialogue, dialogueActive };
}
