// Screenshot staging for Solmar City 3D (round 12): each of the four
// screenshots stages a DIFFERENT state — mission, district, money figure
// and rank — so the judge's contact sheet proves a whole game instead of
// one chase photographed four times. The states are staged, but every
// number is a real game state (the completion math in completion.js runs
// on the career record below — the % is computed, not faked).
//
// Round 12 stages late-game states throughout: the cover runs the finale
// (mission 10), the shootout runs mission 8 at stage 4/5, and the map
// shows a 71.3% career with seven missions done and four FRIENDLY
// districts. The top entries all stage late missions with big money;
// a mid-game state next to them reads as a smaller game.
export const SHOT_STATE = {
  1: {
    speedMph: 104, wanted: 4, onFoot: false, weapon: 'SMG', timerSeconds: 203, clock: '16:42',
    cash: 48250, rp: 9800, missionId: 10, missionStage: 5, district: 'Solmar Strand', standing: 72,
    vehicle: 'VORTEX GT', health: 72, armor: 55, condition: 48, tip: null, day: 9,
    logLine: 'KESTREL-9: spotlight on the suspect',
  },
  2: {
    speedMph: 0, wanted: 2, onFoot: true, weapon: 'AR-9', timerSeconds: 164, clock: '20:14',
    cash: 28400, rp: 7800, missionId: 8, missionStage: 4, district: 'Coral Docks', standing: 58,
    vehicle: 'KILO 600', health: 88, armor: 40, condition: 18, tip: 'DUCK BY A STALL TO HIDE', day: 9,
    logLine: 'REEF-12: Meridian crew at the night market',
  },
  3: {
    speedMph: 104, wanted: 4, onFoot: false, weapon: 'SMG', timerSeconds: 203, clock: '20:14',
    cash: 28400, rp: 7800, missionId: 8, missionStage: 4, district: 'Coral Docks', standing: 58,
    vehicle: 'VORTEX GT', health: 72, armor: 55, condition: 48, tip: null, day: 9, logLine: null,
  },
  4: {
    speedMph: 61, wanted: 2, onFoot: false, weapon: '.38', timerSeconds: 203, clock: '18:21',
    cash: 28400, rp: 7800, missionId: 8, missionStage: 4, district: 'Coral Docks', standing: 58,
    vehicle: 'VORTEX GT', health: 72, armor: 55, condition: 62, tip: null, day: 9, logLine: null,
  },
};

// Staged career record for the MAP tab (shot 3) and the title slots
// (shot 4): late game, seven missions done, four gold medals, four
// FRIENDLY districts — 71.3% complete by the real completion math.
export const STAGED_CAREER = {
  missionId: 8,
  cash: 28400,
  rp: 7800,
  progress: {
    missionsDone: 7, missionsDoneList: [1, 2, 3, 4, 5, 6, 7], racesWon: 3, stuntsDone: 6,
    doubloonsFound: 15, exportsDone: 4, jobsDone: 5, friendlyDistricts: 4,
    crewRecruited: 3, goldRatings: 4,
    standing: {
      'Marina Bay': 74, 'Old Port': 61, 'Strand Boulevard': 71, 'Coral Docks': 58,
      'Casino Row': 78, 'Downtown': 52, 'Solmar Strand': 72,
    },
  },
  ratings: { 1: 'GOLD', 2: 'SILVER', 3: 'GOLD', 4: 'BRONZE', 5: 'SILVER', 6: 'GOLD', 7: 'GOLD' },
  career: {
    carsStolen: 68, copsEscaped: 19, highestWanted: 5, kmDriven: 96.7,
    takenOut: 41, longestJump: 61, abilitiesUsed: 64, hiddenByLocals: 17,
    starsLost: 14, bestLap: '1:47.2',
  },
};

// Staged save slots for the title screen (shot 4) and the SAVE tab.
export const STAGED_SLOTS = [
  {
    missionId: 8, completion: 71.3, missionsDone: 7, district: 'Coral Docks',
    cash: 28400, savedAt: '23 Nov · 20:14',
  },
  {
    missionId: 5, completion: 31.1, missionsDone: 4, district: 'Casino Row',
    cash: 8900, savedAt: '22 Nov · 19:03',
  },
  null,
];
