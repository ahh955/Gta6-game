// Completion tracking for Solmar City 3D: one weighted percentage over
// everything the game has to offer, shown in the STATS tab, the save
// slots and the title screen. Weights: story missions 40%, street races
// 10%, stunt jumps 8%, doubloons 10%, car export 8%, district jobs 8%,
// friendly districts 8%, crew recruited 4%, gold ratings 4% — 100% total.
// The checklist below is what the STATS tab renders, line by line.
import { MISSIONS } from './missions.js';
import { RACES } from './races.js';
import { STUNT_JUMPS } from './stunts.js';
import { DOUBLOONS } from './collectibles.js';
import { EXPORT_LIST } from './export.js';
import { JOBS } from './jobs.js';
import { DISTRICTS } from './crew.js';

export const COMPLETION_WEIGHTS = {
  story: 40, races: 10, stunts: 8, doubloons: 10, exports: 8,
  jobs: 8, districts: 8, crew: 4, gold: 4,
};

// `progress` is the career record: { missionsDone, racesWon, stuntsDone,
// doubloonsFound, exportsDone, jobsDone, friendlyDistricts, crewRecruited,
// goldRatings }. All counts; the function does the weighting.
export function completionPercent(progress) {
  const p = progress || {};
  const frac = (done, total) => (total > 0 ? Math.min(1, done / total) : 0);
  const parts = [
    frac(p.missionsDone || 0, MISSIONS.length) * COMPLETION_WEIGHTS.story,
    frac(p.racesWon || 0, RACES.length) * COMPLETION_WEIGHTS.races,
    frac(p.stuntsDone || 0, STUNT_JUMPS.length) * COMPLETION_WEIGHTS.stunts,
    frac(p.doubloonsFound || 0, DOUBLOONS.length) * COMPLETION_WEIGHTS.doubloons,
    frac(p.exportsDone || 0, EXPORT_LIST.length) * COMPLETION_WEIGHTS.exports,
    frac(p.jobsDone || 0, JOBS.length) * COMPLETION_WEIGHTS.jobs,
    frac(p.friendlyDistricts || 0, DISTRICTS.length) * COMPLETION_WEIGHTS.districts,
    frac(p.crewRecruited || 0, 3) * COMPLETION_WEIGHTS.crew,
    frac(p.goldRatings || 0, MISSIONS.length) * COMPLETION_WEIGHTS.gold,
  ];
  return Math.round(parts.reduce((a, b) => a + b, 0) * 10) / 10;
}

export function completionChecklist(progress) {
  const p = progress || {};
  return [
    { label: 'Story missions', done: p.missionsDone || 0, total: MISSIONS.length },
    { label: 'Street races won', done: p.racesWon || 0, total: RACES.length },
    { label: 'Stunt jumps', done: p.stuntsDone || 0, total: STUNT_JUMPS.length },
    { label: 'Golden doubloons', done: p.doubloonsFound || 0, total: DOUBLOONS.length },
    { label: 'Cars exported', done: p.exportsDone || 0, total: EXPORT_LIST.length },
    { label: 'District jobs', done: p.jobsDone || 0, total: JOBS.length },
    { label: 'Districts FRIENDLY', done: p.friendlyDistricts || 0, total: DISTRICTS.length },
    { label: 'Crew recruited', done: p.crewRecruited || 0, total: 3 },
    { label: 'Gold ratings', done: p.goldRatings || 0, total: MISSIONS.length },
  ];
}
