// Solmar City 3D — save system: the player's progress in localStorage,
// loaded on boot and written on every mission advance and manual save.

const SAVE_KEY = "solmar-city-3d-save-v1";

export function defaultSave() {
  return {
    cash: 18450,
    rp: 6200,
    missionIndex: 5,
    stageIndex: 2,
    completedMissions: 5,
    garage: ["Vortex GT", "Marlin S", "Coral Cruiser"],
    districtStanding: {
      marina: 62,
      boulevard: 48,
      casino: 71,
      port: 35,
      oldtown: 54,
      hills: 28,
    },
    racesWon: 2,
    savedAt: null,
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    return { ...defaultSave(), ...parsed };
  } catch {
    return defaultSave();
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, savedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}
