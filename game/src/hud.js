// Solmar City 3D — the HUD: wanted stars, cash, rank, mission tracker,
// dispatch panel, weapon slots, crew abilities, dialogue, speedometer and
// the detailed minimap (street grid, coloured dots, search-zone ring).

import { RESPECT_RANKS, DISTRICTS } from "./config.js";

function el(id) {
  return document.getElementById(id);
}

function fmtCash(n) {
  return "$" + n.toLocaleString("en-US");
}

export function rankForRp(rp) {
  let rank = RESPECT_RANKS[0];
  let next = RESPECT_RANKS[1];
  for (let i = 0; i < RESPECT_RANKS.length; i++) {
    if (rp >= RESPECT_RANKS[i].rp) {
      rank = RESPECT_RANKS[i];
      next = RESPECT_RANKS[i + 1] || null;
    }
  }
  const span = next ? next.rp - rank.rp : 1;
  const progress = next ? Math.min(1, (rp - rank.rp) / span) : 1;
  return { rank, next, progress };
}

export function districtAt(x, z) {
  if (z > 10) return DISTRICTS[1];
  if (x > 25 && z > -35) return DISTRICTS[2];
  if (x < -55) return DISTRICTS[3];
  if (x > 55) return DISTRICTS[0];
  if (z < -60) return DISTRICTS[5];
  if (x < -25 && z < -35) return DISTRICTS[4];
  return DISTRICTS[1];
}

export function updateHUD(game) {
  const { player, police, missions, combat, crew, radio, state } = game;

  // Wanted stars.
  const stars = el("hud-stars");
  stars.textContent = "★".repeat(police.stars) + "☆".repeat(5 - police.stars);
  stars.className = "stars" + (police.stars >= 4 ? " hot" : police.stars >= 2 ? " warm" : "");

  el("hud-cash").textContent = fmtCash(state.cash);
  const { rank, next, progress } = rankForRp(state.rp);
  el("hud-rank").textContent = rank.name;
  el("hud-rp").textContent = next
    ? `${state.rp.toLocaleString()} / ${next.rp.toLocaleString()} RP`
    : `${state.rp.toLocaleString()} RP — MAX`;
  el("hud-rp-bar").style.width = `${Math.round(progress * 100)}%`;

  // Health + armour.
  el("hud-hp-bar").style.width = `${player.health}%`;
  el("hud-armor-bar").style.width = `${player.armor}%`;
  el("hud-hp-text").textContent = `${player.health} HP · ${player.armor} ARMOR`;

  // Mission tracker.
  const m = missions.current;
  el("hud-mission-title").textContent = `MISSION ${m.id} — ${m.title}`;
  el("hud-mission-stage").textContent = missions.stageLabel;
  el("hud-mission-objective").textContent = missions.stage;
  el("hud-mission-next").textContent = `NEXT: ${missions.nextStage}`;
  el("hud-mission-timer").textContent = missions.timerLabel;
  el("hud-mission-giver").textContent = `From ${m.giver} · $${m.payout.toLocaleString()} payout`;

  // Dispatch panel.
  const list = el("hud-dispatch-list");
  list.innerHTML = police.dispatch
    .map(
      (u) => `<div class="dispatch-row">
        <span class="dispatch-call">${u.callsign}</span>
        <span class="dispatch-kind">${u.kind}</span>
        <span class="dispatch-chip" style="background:${u.chipColor}">${u.chip}</span>
        <span class="dispatch-dist">${u.distance.toFixed(1)} mi</span>
      </div>`,
    )
    .join("");

  // Weapon slots.
  const slots = el("hud-weapons");
  slots.innerHTML = combat.weapons
    .map(
      (w, i) => `<div class="weapon-slot${i === combat.selected ? " active" : ""}">
        <span class="weapon-key">${w.slot}</span>
        <span class="weapon-name">${w.name}</span>
        <span class="weapon-ammo">${w.ammo} / ${w.max}</span>
      </div>`,
    )
    .join("");

  // Crew abilities.
  const crewEl = el("hud-crew");
  crewEl.innerHTML = crew.members
    .map(
      (c) => `<div class="crew-card">
        <span class="crew-face" style="background:${c.color}">${c.initials}</span>
        <span class="crew-info"><b>${c.name}</b><i>${c.role} · ${c.ability}</i>
        <em>${c.readyIn > 0 ? `Ready in ${Math.ceil(c.readyIn)}s` : "READY — press " + (c.id === "juno" ? "1" : c.id === "marco" ? "2" : "3")}</em></span>
      </div>`,
    )
    .join("");

  // Speedometer + car.
  el("hud-speed").textContent = String(Math.round(player.speed));
  el("hud-car").textContent = player.onFoot ? "ON FOOT" : player.carName.toUpperCase();
  el("hud-condition").textContent = player.onFoot ? "—" : `CONDITION ${player.carCondition}%`;
  el("hud-condition-bar").style.width = `${player.carCondition}%`;

  // Radio.
  el("hud-radio").textContent = radio.label;

  // Location + district standing.
  const d = districtAt(player.position.x, player.position.z);
  el("hud-location").textContent = `Solmar Blvd — ${d.name}`;
  el("hud-standing").textContent = `${d.name} standing: ${d.standing}%`;
  el("hud-standing-bar").style.width = `${d.standing}%`;

  drawMinimap(game);
}

// The minimap: a street grid, the beach and ocean, the player arrow,
// police (blue), mission target (gold), crew (green) and the red
// search-zone ring while wanted.
export function drawMinimap(game) {
  const canvas = el("minimap");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const S = canvas.width;
  const W = 220; // world units across the map
  const toMap = (x, z) => [((x + 110) / W) * S, ((z + 110) / W) * S];
  ctx.clearRect(0, 0, S, S);

  // Land, beach, ocean.
  ctx.fillStyle = "#3f5a3a";
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = "#1e7fa8";
  ctx.fillRect(toMap(90, -110)[0], 0, S, S);
  ctx.fillRect(0, toMap(-110, 25)[1], S, S);
  ctx.fillStyle = "#e8d29a";
  ctx.fillRect(toMap(78, -110)[0], 0, toMap(90, 0)[0] - toMap(78, 0)[0], S);
  ctx.fillRect(0, toMap(-110, 14)[1], S, toMap(-110, 25)[1] - toMap(-110, 14)[1]);

  // Street grid.
  ctx.strokeStyle = "#2b2f36";
  ctx.lineWidth = 5;
  for (const z of [0, -45, -90, 45]) {
    const [, y] = toMap(0, z);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(S, y);
    ctx.stroke();
  }
  for (const x of [-70, -25, 20, 60]) {
    const [mx] = toMap(x, 0);
    ctx.beginPath();
    ctx.moveTo(mx, 0);
    ctx.lineTo(mx, S);
    ctx.stroke();
  }
  ctx.strokeStyle = "#f5d76e";
  ctx.lineWidth = 1;
  const [, by] = toMap(0, 0);
  ctx.beginPath();
  ctx.moveTo(0, by);
  ctx.lineTo(S, by);
  ctx.stroke();

  // Search-zone ring while wanted.
  const { player, police } = game;
  const [px, py] = toMap(player.position.x, player.position.z);
  if (police.stars > 0) {
    ctx.strokeStyle = "rgba(239,68,68,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, py, 18 + police.stars * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(239,68,68,0.12)";
    ctx.beginPath();
    ctx.arc(px, py, 18 + police.stars * 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mission target (gold diamond) and safehouse (house green).
  const [tx, ty] = toMap(34, -20);
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.moveTo(tx, ty - 7);
  ctx.lineTo(tx + 6, ty);
  ctx.lineTo(tx, ty + 7);
  ctx.lineTo(tx - 6, ty);
  ctx.closePath();
  ctx.fill();
  const [hx, hy] = toMap(-25, -45);
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(hx - 4, hy - 4, 8, 8);

  // Traffic (white), police (blue), gang (purple).
  const dot = (x, z, color, r = 3) => {
    const [mx, my] = toMap(x, z);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const c of game.traffic) dot(c.position.x, c.position.z, "#e2e8f0", 2.5);
  for (const c of police.cruisers) dot(c.position.x, c.position.z, "#3b82f6", 3.5);
  if (police.heli) dot(police.heli.position.x, police.heli.position.z, "#38bdf8", 4);
  for (const g of game.combat.gang) dot(g.position.x, g.position.z, "#a855f7", 3);

  // Player arrow (white triangle, pointing along heading).
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(-player.heading);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-6, -5.5);
  ctx.lineTo(-6, 5.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Dialogue box: a named character, their portrait and role, and a line.
export function showDialogue(name, role, color, initials, line) {
  el("hud-dialogue-face").textContent = initials;
  el("hud-dialogue-face").style.background = color;
  el("hud-dialogue-name").textContent = name;
  el("hud-dialogue-role").textContent = role;
  el("hud-dialogue-line").textContent = line;
  el("hud-dialogue").classList.remove("hidden");
}

export function hideDialogue() {
  el("hud-dialogue").classList.add("hidden");
}

// Toast: a short centred message (mission updates, saves, pickups).
let toastTimer = null;
export function showToast(text, ms = 2600) {
  const t = el("hud-toast");
  t.textContent = text;
  t.classList.remove("hidden");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), ms);
}
