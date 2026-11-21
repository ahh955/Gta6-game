// HUD for Solmar City 3D: fills the staged panels in index.html — the
// mission tracker, the dispatch list with coloured chips, the status panel
// (cash, stars, rank, RP), vitals, speedometer, dialogue bar and the
// red-ring minimap drawn on #minimap.
import { dispatchLines } from './police.js';
import { rankFor } from './crew.js';
import { getMission } from './missions.js';

const $ = (id) => document.getElementById(id);

function formatCash(amount) {
  return '$' + amount.toLocaleString('en-US');
}

export function createHud(state) {
  const minimap = $('minimap');
  const minimapCtx = minimap.getContext('2d');

  function updateStars(stars) {
    const filled = '★'.repeat(stars);
    const empty = '☆'.repeat(5 - stars);
    $('stars').innerHTML = empty ? `${filled}<i>${empty}</i>` : filled;
    $('stars').style.color = stars >= 4 ? '#f87171' : '#facc15';
    $('air-unit').style.display = stars >= 4 ? 'block' : 'none';
  }

  function updateMission() {
    const mission = getMission(state.missionId);
    $('mission-num').textContent = `MISSION ${mission.id}`;
    $('mission-name').textContent = mission.name;
    $('mission-objective').textContent = mission.objective;
    $('mission-stage').textContent = `STAGE ${state.missionStage}/${mission.stages}`;
    $('mission-stage-fill').style.width = `${Math.round((state.missionStage / mission.stages) * 100)}%`;
    $('mission-next').textContent = mission.next || '—';
    const mins = Math.floor(state.timerSeconds / 60);
    const secs = Math.floor(state.timerSeconds % 60);
    $('mission-timer').textContent = `${mins}:${String(secs).padStart(2, '0')}`;
  }

  function updateDispatch(time) {
    const rows = dispatchLines(time).map((unit) => `
      <li><span class="unit-name">${unit.callsign}</span>
      <span class="unit-dist">${unit.distance}m</span>
      <span class="chip ${unit.chipClass}">${unit.chip}</span></li>`).join('');
    $('dispatch-list').innerHTML = rows;
    $('dispatch-count').textContent = `${dispatchLines(time).length} UNITS`;
    $('dispatch-foot').textContent = state.roadblock
      ? '+2 more units — roadblock ahead'
      : 'Roadblock cleared — units regrouping';
  }

  function drawMinimap(playerPos, heading, cruisers, roadblock) {
    const ctx = minimapCtx;
    const size = minimap.width;
    const cx = size / 2, cy = size / 2;
    ctx.clearRect(0, 0, size, size);
    // Water (right) and land (left), beach strip between.
    ctx.fillStyle = '#0e7d9c'; ctx.fillRect(size / 2, 0, size / 2, size);
    ctx.fillStyle = '#3f4a3a'; ctx.fillRect(0, 0, size / 2, size);
    ctx.fillStyle = '#ead9a8'; ctx.fillRect(size / 2 - 6, 0, 6, size);
    // Road running top to bottom.
    ctx.fillStyle = '#33373d';
    ctx.fillRect(size * 0.28, 0, size * 0.14, size);
    ctx.strokeStyle = '#eab308'; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(size * 0.35, 0); ctx.lineTo(size * 0.35, size); ctx.stroke();
    ctx.setLineDash([]);
    // City blocks.
    ctx.fillStyle = '#5b6672';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(10, 10 + i * 34, 34, 24);
      ctx.fillRect(52, 10 + i * 34, 20, 24);
    }
    // Mission marker (gold diamond) ahead.
    ctx.save();
    ctx.translate(cx - 6, 22);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
    // Roadblock marker (red X) ahead.
    if (roadblock) {
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - 24, 40); ctx.lineTo(cx - 8, 56);
      ctx.moveTo(cx - 8, 40); ctx.lineTo(cx - 24, 56);
      ctx.stroke();
    }
    // Cruisers (blue dots) around the player.
    ctx.fillStyle = '#38bdf8';
    for (const cruiser of cruisers) {
      const dx = (cruiser.x - playerPos.x) * 1.1;
      const dz = (cruiser.z - playerPos.z) * 1.1;
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dz, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Player arrow (white triangle, rotated to heading).
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-heading + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Red ring: the heat is on.
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx, cy, size / 2 - 4, 0, Math.PI * 2); ctx.stroke();
  }

  function updateWeapons() {
    for (const el of document.querySelectorAll('.weapon')) {
      const name = el.querySelector('.w-name').textContent;
      el.classList.toggle('active', name === state.weapon);
    }
  }

  function update(time) {
    $('cash').textContent = formatCash(state.cash);
    $('clock').textContent = state.clock;
    const { current, next, progress } = rankFor(state.rp);
    $('rank-name').textContent = current.name;
    $('rank-badge').textContent = `RANK ${['NOBODY', 'DRIVER', 'HUSTLER', 'FIXER', 'SHOT CALLER', 'CREW BOSS', 'KINGPIN'].indexOf(current.name) + 1}`;
    $('rp-text').textContent = next
      ? `${state.rp.toLocaleString('en-US')} / ${next.rp.toLocaleString('en-US')} RP`
      : `${state.rp.toLocaleString('en-US')} RP — MAX`;
    $('rp-fill').style.width = `${Math.round(progress * 100)}%`;
    updateStars(state.wanted);
    updateMission();
    updateDispatch(time);
    updateWeapons();
    $('speed').textContent = Math.round(state.speedMph);
    $('vehicle-name').textContent = state.onFoot ? 'ON FOOT' : 'VORTEX GT';
    $('health-fill').style.width = `${state.health}%`;
    $('health-num').textContent = state.health;
    $('armour-fill').style.width = `${state.armor}%`;
    $('armour-num').textContent = state.armor;
    $('condition-fill').style.width = `${state.condition}%`;
    $('condition-text').textContent = `${state.condition}% DENTED`;
    drawMinimap(state.playerPos, state.headingRad, state.cruisers, state.roadblock);
  }

  function showDialogue(speaker, text) {
    $('dialogue-name').textContent = speaker;
    $('dialogue-text').textContent = text;
    $('dialogue-avatar').textContent = speaker.charAt(0);
  }

  return { update, showDialogue };
}
