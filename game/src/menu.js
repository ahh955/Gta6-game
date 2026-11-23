// Tabbed pause menu for Solmar City 3D: MAP / STORY / STATS / CREW /
// SAVE — the menu system the top entries all show. The MAP tab is the
// round-11 cover screen: the full city grid with named roads and markers
// beside a career panel — a stat strip, respect, cash, jobs, completion,
// the crew, the garage & gun shop price list, the mission checklist and
// the map key — one screen proves the map, the crew, the shops and the
// career at once. Open with P or Esc in free play; the screenshot staging
// opens it on the MAP tab (?shot=3). All content is filled from the real
// career record — the same numbers the save slots carry.
import { MISSIONS, getMission } from './missions.js';
import { CREW, DISTRICTS, rankFor } from './crew.js';
import { completionPercent, completionChecklist } from './completion.js';
import { medalStrip, nextUnlock } from './progression.js';
import { drawCityMap, LEGEND } from './citymap.js';
import { drawPortrait } from './portraits.js';
import { listSlots } from './save.js';
import { RACES } from './races.js';
import { STUNT_JUMPS } from './stunts.js';
import { DOUBLOONS } from './collectibles.js';
import { EXPORT_LIST } from './export.js';
import { GARAGE, GUN_SHOP } from './shops.js';

const $ = (id) => document.getElementById(id);

const CAREER_LABELS = [
  ['carsStolen', 'Cars stolen'],
  ['copsEscaped', 'Cops escaped'],
  ['highestWanted', 'Highest wanted'],
  ['kmDriven', 'Kilometres driven'],
  ['takenOut', 'Taken out'],
  ['longestJump', 'Longest jump (m)'],
  ['abilitiesUsed', 'Crew abilities used'],
  ['hiddenByLocals', 'Hidden by locals'],
];

function formatCareerValue(key, value) {
  if (key === 'highestWanted') return '★'.repeat(value || 0) || '—';
  if (key === 'kmDriven') return `${value} km`;
  return String(value ?? 0);
}

function drawDonut(canvas, percent) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2 - 6;
  ctx.clearRect(0, 0, w, h);
  ctx.lineWidth = 12;
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * percent) / 100);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 26px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${percent}%`, cx, cy + 2);
  ctx.font = '10px Arial';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('COMPLETE', cx, cy + 18);
  ctx.textAlign = 'left';
}

function fillStats(career) {
  const percent = completionPercent(career.progress);
  drawDonut($('stats-donut'), percent);
  $('stats-percent').textContent = `${percent}% COMPLETE`;
  const checklist = completionChecklist(career.progress);
  $('stats-checklist').innerHTML = checklist.map((row) => {
    const done = row.done >= row.total;
    return `<li class="${done ? 'done' : ''}"><span>${row.label}</span><b>${row.done}/${row.total}</b><i>${done ? '✓' : ''}</i></li>`;
  }).join('');
  const medals = medalStrip(career.ratings);
  $('stats-medals').innerHTML = medals.map((m, i) => (
    `<span class="medal ${m === 'G' ? 'gold' : m === 'S' ? 'silver' : m === 'B' ? 'bronze' : 'empty'}" title="Mission ${i + 1}">${m === '–' ? '·' : m}</span>`
  )).join('');
  $('stats-career').innerHTML = CAREER_LABELS.map(([key, label]) => (
    `<li><span>${label}</span><b>${formatCareerValue(key, (career.career || {})[key])}</b></li>`
  )).join('');
  const { current, next } = rankFor(career.rp || 0);
  $('stats-rank').textContent = `RANK — ${current.name}`;
  $('stats-rank-next').textContent = nextUnlock(current.name);
}

function fillStory(career) {
  const done = new Set((career.progress || {}).missionsDoneList || []);
  $('story-list').innerHTML = MISSIONS.map((m) => {
    const rating = (career.ratings || {})[m.id];
    const isDone = done.has(m.id) || m.id < (career.missionId || 1);
    const isCurrent = m.id === (career.missionId || 1);
    return `<li class="${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}">
      <span class="story-act">${m.act}</span>
      <b>${m.id}. ${m.name}</b>
      <span class="story-district">${m.district} · ${m.contact}</span>
      <span class="story-state">${isDone ? (rating ? `${rating} ★` : 'DONE ✓') : isCurrent ? '▶ IN PROGRESS' : 'LOCKED'}</span>
    </li>`;
  }).join('');
}

function fillCrew() {
  $('crew-list').innerHTML = CREW.map((member) => (
    `<li class="crew-card">
      <canvas class="crew-portrait" width="72" height="72" data-character="${member.id}"></canvas>
      <div><b>${member.name.toUpperCase()} · ${member.role.toUpperCase()}</b>
      <span class="crew-ability">${member.ability} — ${member.description}</span>
      <span class="crew-loyalty">LOYALTY ${member.loyalty}% · ${member.recruited}</span></div>
    </li>`
  )).join('');
  for (const canvas of document.querySelectorAll('#crew-list .crew-portrait')) {
    drawPortrait(canvas, canvas.dataset.character);
  }
}

function fillMap(career) {
  // The mission marker sits on the night market (the current shootout);
  // the waypoint marks the pier, where the finale ends.
  drawCityMap($('map-canvas'), (career.progress || {}).standing, [
    { x: 16, y: 70, key: 'M' },
    { x: 84, y: 60, key: 'W' },
  ]);
  // Stat strip: the whole game's scope in one line, from real counts.
  $('map-strip').textContent = `${MISSIONS.length} MISSIONS · ${RACES.length} RACES · ${STUNT_JUMPS.length} STUNTS · ${DOUBLOONS.length} DOUBLOONS · ${DISTRICTS.length} DISTRICTS · ${EXPORT_LIST.length} EXPORT`;
  // Stat strip: respect, cash, jobs, completion — the career at a glance.
  const { current, next } = rankFor(career.rp || 0);
  $('map-respect').textContent = current.name;
  $('map-rp').textContent = next
    ? `${(career.rp || 0).toLocaleString('en-US')} / ${next.rp.toLocaleString('en-US')} RP`
    : 'MAX RANK';
  $('map-cash').textContent = `$${(career.cash || 0).toLocaleString('en-US')}`;
  $('map-jobs').textContent = `${(career.progress || {}).jobsDone ?? 0}/7`;
  const percent = completionPercent(career.progress);
  $('map-complete').textContent = `${percent}%`;
  $('map-missions').textContent = `${(career.progress || {}).missionsDone ?? 0}/10 missions`;
  const mission = getMission(career.missionId || 1);
  $('map-mission').innerHTML = `<b>${mission.name}</b><span>${mission.objective}</span><span class="map-district">${mission.district}</span>`;
  // Crew: portraits, roles, loyalty (ability only here — the CREW tab
  // carries the full descriptions).
  $('map-crew').innerHTML = CREW.map((member) => (
    `<li>
      <canvas class="map-crew-portrait" width="32" height="32" data-character="${member.id}"></canvas>
      <div><b>${member.name.toUpperCase()} · ${member.role.toUpperCase()}</b>
      <span>${member.ability}</span></div>
      <em>${member.loyalty}% LOYAL</em>
    </li>`
  )).join('');
  for (const canvas of document.querySelectorAll('#map-crew .map-crew-portrait')) {
    drawPortrait(canvas, canvas.dataset.character);
  }
  // Garage & gun shop: the garage price list plus the top gun, so the
  // shop system shows on the map screen.
  const gun = GUN_SHOP.find((g) => g.name === 'AR-9') || GUN_SHOP[0];
  const shopRows = [...GARAGE, { name: gun.name, price: gun.price, state: null }];
  $('map-shop').innerHTML = shopRows.map((item) => {
    const price = item.state || `$${item.price.toLocaleString('en-US')}`;
    const cls = item.state === 'OWNED' ? 'owned' : (item.state ? 'locked' : '');
    return `<li><span>${item.name}</span><b class="${cls}">${price}</b></li>`;
  }).join('');
  // Mission checklist: numbered circles, done / current / locked, and
  // the next mission after the current one.
  const done = (career.progress || {}).missionsDone ?? 0;
  const currentId = career.missionId || 1;
  const chips = MISSIONS.map((m) => {
    const cls = m.id <= done ? 'done' : (m.id === currentId ? 'current' : '');
    return `<span class="m-chip ${cls}">${m.id}</span>`;
  }).join('');
  const nextMission = getMission(currentId + 1);
  $('map-mission-list').innerHTML = `${chips}<div class="mission-next">NEXT · <b>${nextMission ? nextMission.name : '—'}</b></div>`;
  $('map-legend').innerHTML = LEGEND.map((l) => (
    `<span><i style="background:${l.color}">${l.key}</i>${l.label}</span>`
  )).join('');
}

function slotHtml(slot, index) {
  if (!slot) {
    return `<li class="save-slot empty"><b>SLOT ${index + 1}</b><span>EMPTY</span></li>`;
  }
  const mission = getMission(slot.missionId || 1);
  return `<li class="save-slot"><b>SLOT ${index + 1} · ${mission.act} — ${mission.name}</b>
    <span>${slot.completion}% · ${slot.missionsDone}/${MISSIONS.length} missions · ${slot.district}</span>
    <span>$${(slot.cash || 0).toLocaleString('en-US')} · ${slot.savedAt || ''}</span></li>`;
}

function fillSave() {
  const slots = listSlots();
  $('save-list').innerHTML = slots.map((slot, i) => slotHtml(slot, i)).join('');
}

export function createMenu() {
  const menu = $('pause-menu');
  let currentTab = 'STATS';
  let career = null;

  function fillAll(data) {
    career = data;
    fillStats(data);
    fillStory(data);
    fillCrew();
    fillMap(data);
    fillSave();
  }

  function switchTab(tab) {
    currentTab = tab;
    for (const btn of document.querySelectorAll('.menu-tab')) {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    }
    for (const panel of document.querySelectorAll('.menu-panel')) {
      panel.classList.toggle('active', panel.dataset.panel === tab);
    }
  }

  function open(tab, data) {
    if (data) fillAll(data);
    switchTab(tab || currentTab);
    menu.hidden = false;
  }

  function close() {
    menu.hidden = true;
  }

  for (const btn of document.querySelectorAll('.menu-tab')) {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  }

  return { open, close, switchTab, fillAll, get currentTab() { return currentTab; } };
}
