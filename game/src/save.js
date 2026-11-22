// Save/load for Solmar City 3D: three save slots in localStorage, each
// holding the full career — cash, rank, mission, garage, the completion
// record (missions, races, stunts, doubloons, exports, jobs, districts,
// crew, gold ratings), mission ratings and career stats. Safehouses
// autosave to the active slot; the title screen and the SAVE tab list
// all three slots with act, progress, district, money and time.
export const SLOT_KEYS = [
  'solmar-city-3d-slot-1',
  'solmar-city-3d-slot-2',
  'solmar-city-3d-slot-3',
];
export const ACTIVE_SLOT_KEY = 'solmar-city-3d-active-slot';

export const DEFAULT_SAVE = {
  cash: 250,
  rp: 0,
  missionId: 1,
  missionStage: 1,
  district: 'Marina Bay',
  completedMissions: [],
  garage: ['VORTEX GT'],
  ownedWeapons: ['FISTS', '.38'],
  districtStanding: {},
  progress: {
    missionsDone: 0, missionsDoneList: [], racesWon: 0, stuntsDone: 0,
    doubloonsFound: 0, exportsDone: 0, jobsDone: 0, friendlyDistricts: 0,
    crewRecruited: 0, goldRatings: 0, standing: {},
  },
  ratings: {},
  career: {
    carsStolen: 0, copsEscaped: 0, highestWanted: 0, kmDriven: 0,
    takenOut: 0, longestJump: 0, abilitiesUsed: 0, hiddenByLocals: 0,
  },
  playtimeMinutes: 0,
  savedAt: null,
};

function readSlot(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return { ...DEFAULT_SAVE, ...JSON.parse(raw) };
  } catch {
    return null;
  }
}

export function loadSlot(index) {
  return readSlot(SLOT_KEYS[index]) || { ...DEFAULT_SAVE };
}

export function writeSlot(index, state) {
  try {
    const data = { ...state, savedAt: new Date().toISOString() };
    localStorage.setItem(SLOT_KEYS[index], JSON.stringify(data));
    localStorage.setItem(ACTIVE_SLOT_KEY, String(index));
    return true;
  } catch {
    return false;
  }
}

// All three slots: slot data or null for an empty slot.
export function listSlots() {
  return SLOT_KEYS.map((key) => readSlot(key));
}

export function activeSlot() {
  try {
    const raw = localStorage.getItem(ACTIVE_SLOT_KEY);
    const idx = raw === null ? 0 : parseInt(raw, 10);
    return Number.isFinite(idx) && idx >= 0 && idx < 3 ? idx : 0;
  } catch {
    return 0;
  }
}

// Slot 1 aliases, kept for the autosave path.
export function loadSave() {
  return loadSlot(activeSlot());
}

export function writeSave(state) {
  return writeSlot(activeSlot(), state);
}

export function clearSave() {
  try {
    for (const key of SLOT_KEYS) localStorage.removeItem(key);
    localStorage.removeItem(ACTIVE_SLOT_KEY);
  } catch { /* storage unavailable */ }
}
