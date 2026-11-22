// Mission ratings and rank unlocks for Solmar City 3D: every story
// mission and race is graded GOLD / SILVER / BRONZE on time and
// objectives, and the medals show in the STATS tab and the STORY tab.
// Ranks unlock gear as respect grows — the next unlock is always visible
// in the STATS tab so the player knows what the next rank buys.
import { MISSIONS } from './missions.js';

// Gold par times per mission (seconds). Beat par with all objectives for
// GOLD; beat par + 60s for SILVER; anything else is BRONZE.
export const MISSION_PAR = {
  1: 240, 2: 300, 3: 330, 4: 420, 5: 450,
  6: 480, 7: 540, 8: 600, 9: 660, 10: 780,
};

export function rateMission(missionId, timeSeconds, objectivesDone, objectivesTotal) {
  const par = MISSION_PAR[missionId] || 480;
  const allObjectives = objectivesDone >= objectivesTotal;
  if (timeSeconds <= par && allObjectives) return 'GOLD';
  if (timeSeconds <= par + 60) return 'SILVER';
  return 'BRONZE';
}

export const RANK_UNLOCKS = [
  { rank: 'NOBODY', unlock: 'FISTS — you start with nothing.' },
  { rank: 'WHEELMAN', unlock: 'GARAGE ACCESS — store a second car at the loft.' },
  { rank: 'HUSTLER', unlock: 'KEVLAR VEST at Iron & Ivory.' },
  { rank: 'OPERATOR', unlock: 'SMG at Iron & Ivory + the KILO 600 bike.' },
  { rank: 'SHOT CALLER', unlock: '12G at Iron & Ivory + crew ability: Rosa’s second plate swap.' },
  { rank: 'UNDERBOSS', unlock: 'AR-9 at Iron & Ivory + the Meridian S export slot.' },
  { rank: 'KINGPIN', unlock: 'THE CITY — every shop discount, every door open.' },
];

export function unlockForRank(rankName) {
  const found = RANK_UNLOCKS.find((u) => u.rank === rankName);
  return found ? found.unlock : '';
}

export function nextUnlock(rankName) {
  const idx = RANK_UNLOCKS.findIndex((u) => u.rank === rankName);
  if (idx < 0 || idx >= RANK_UNLOCKS.length - 1) return 'MAX RANK — the city is yours.';
  return `Next: ${RANK_UNLOCKS[idx + 1].rank} — ${RANK_UNLOCKS[idx + 1].unlock}`;
}

// Medal strip for the STATS tab: one letter per completed mission.
export function medalStrip(ratings) {
  return MISSIONS.map((m) => {
    const r = (ratings || {})[m.id];
    return r ? r.charAt(0) : '–';
  });
}
