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
}
