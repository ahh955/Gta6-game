// Solmar City — localStorage save/load. Plain JSON, one key, versioned.
// Saved: cash, respect, rank, missions completed, garage, district standing,
// weapons + ammo, crew, race best times, player position, time of day.
// No save exists on a fresh install; the title CONTINUE button stays hidden.
const KEY = 'solmar-city-save-v1';

export function hasSave() {
  try { return !!window.localStorage.getItem(KEY); } catch { return false; }
}

export function saveGame(ctx) {
  const { game, economy, combat, crew, races, player, render } = ctx;
  const data = {
    v: 1,
    savedAt: Date.now(),
    cash: game.cash,
    respect: game.respect,
    rank: game.rank,
    armor: game.armor || 0,
    completedMissions: ctx.missions ? ctx.missions.completed.slice() : [],
    garage: economy ? economy.garageState() : {},
    standing: economy ? economy.standingState() : {},
    weapons: combat ? combat.weaponState() : null,
    crew: crew ? crew.crewState() : {},
    bestTimes: races ? races.bestTimesState() : {},
    pos: { x: player.x, z: player.z },
    timeOfDay: render ? render.timeOfDay : 18.4,
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && data.v === 1 ? data : null;
  } catch { return null; }
}

// Apply a loaded save to the live game. Called from the CONTINUE button
// before play starts; every field is optional so old saves degrade safely.
export function applySave(ctx, data) {
  if (!data) return;
  const { game, economy, combat, crew, races, player, render } = ctx;
  if (typeof data.cash === 'number') game.cash = data.cash;
  if (typeof data.respect === 'number') game.respect = data.respect;
  if (typeof data.rank === 'string') game.rank = data.rank;
  if (typeof data.armor === 'number') game.armor = data.armor;
  if (Array.isArray(data.completedMissions) && ctx.missions) {
    ctx.missions.completed = data.completedMissions.slice();
  }
  if (data.garage && economy) economy.applyGarageState(data.garage);
  if (data.standing && economy) economy.applyStandingState(data.standing);
  if (data.weapons && combat) combat.applyWeaponState(data.weapons);
  if (data.crew && crew) crew.applyCrewState(data.crew);
  if (data.bestTimes && races) races.applyBestTimesState(data.bestTimes);
  if (data.pos && player) player.teleport(data.pos.x, data.pos.z);
  if (typeof data.timeOfDay === 'number' && render) render.setTimeOfDay(data.timeOfDay);
}

export function clearSave() {
  try { window.localStorage.removeItem(KEY); } catch { /* private mode */ }
}
