// Saving: money, mission progress and the player's position go to localStorage so a visit
// later resumes where it left off. Loading never throws: a missing or corrupt save is just
// a fresh game.
import { BEST_KEY, SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      money: state.player.money,
      missionIndex: state.mission.index,
      x: state.player.x,
      y: state.player.y,
      health: state.player.health,
      doubloons: state.doubloons ? state.doubloons.found.slice() : undefined,
      raceBest: state.race ? state.race.bestTimes.slice() : undefined,
      raceDone: state.race ? state.race.completed.slice() : undefined,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    const best = Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
    if (state.player.money > best) window.localStorage.setItem(BEST_KEY, String(state.player.money));
  } catch {
    // Storage can be off (private windows): the game still plays.
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number' || typeof data.missionIndex !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function applySave(state, save) {
  state.player.money = save.money;
  state.mission.index = Math.min(save.missionIndex, 5);
  state.player.x = save.x;
  state.player.y = save.y;
  state.player.health = save.health || 100;
  // Side progress is optional in the save: an older save just starts it fresh.
  if (state.doubloons && Array.isArray(save.doubloons)) {
    for (let i = 0; i < state.doubloons.found.length && i < save.doubloons.length; i += 1) {
      if (save.doubloons[i]) {
        state.doubloons.found[i] = true;
        state.doubloons.count += 1;
      }
    }
  }
  if (state.race && Array.isArray(save.raceBest)) {
    for (let i = 0; i < state.race.bestTimes.length && i < save.raceBest.length; i += 1) {
      if (typeof save.raceBest[i] === 'number') state.race.bestTimes[i] = save.raceBest[i];
    }
  }
  if (state.race && Array.isArray(save.raceDone)) {
    for (let i = 0; i < state.race.completed.length && i < save.raceDone.length; i += 1) {
      if (save.raceDone[i]) state.race.completed[i] = true;
    }
  }
}
