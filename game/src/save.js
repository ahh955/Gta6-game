// Solmar City — progress saved to localStorage: cash, missions, doubloons,
// race best times and the mute setting. Everything is guarded: a browser
// that refuses storage just plays without saving.

import { CFG, SAVE_KEY } from './config.js';

export function defaultSave() {
  return {
    cash: 150,
    missionsDone: 0,
    doubloons: [],
    raceBest: {},
    muted: false,
    totalEarned: 0,
  };
}

export function loadSave() {
  const save = defaultSave();
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return save;
    const parsed = JSON.parse(raw);
    if (typeof parsed.cash === 'number') save.cash = parsed.cash;
    if (typeof parsed.missionsDone === 'number') {
      save.missionsDone = Math.max(0, Math.min(5, parsed.missionsDone));
    }
    if (Array.isArray(parsed.doubloons)) {
      save.doubloons = parsed.doubloons.filter(
        (i) => Number.isInteger(i) && i >= 0 && i < CFG.doubloonCount,
      );
    }
    if (parsed.raceBest && typeof parsed.raceBest === 'object') save.raceBest = parsed.raceBest;
    if (typeof parsed.muted === 'boolean') save.muted = parsed.muted;
    if (typeof parsed.totalEarned === 'number') save.totalEarned = parsed.totalEarned;
  } catch (e) {
    // Corrupt or unavailable storage: play with a fresh save.
  }
  return save;
}

export function saveGame(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) {
    // Storage refused: ignore.
  }
}
