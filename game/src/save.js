// Save/load for Solmar City 3D: progress, cash, rank, garage and mission
// state persist in localStorage; safehouses autosave on entry.
const SAVE_KEY = 'solmar-city-3d-save-v1';

export const DEFAULT_SAVE = {
  cash: 250,
  rp: 0,
  missionId: 1,
  missionStage: 1,
  completedMissions: [],
  garage: ['VORTEX GT'],
  ownedWeapons: ['FISTS', '.38'],
  districtStanding: {},
  playtimeMinutes: 0,
  savedAt: null,
};

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    return { ...DEFAULT_SAVE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function writeSave(state) {
  try {
    const data = { ...state, savedAt: new Date().toISOString() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
}
