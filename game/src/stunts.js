// Stunt jumps for Solmar City 3D: eight ramps hidden around the city.
// Hit a ramp at speed and the game measures the jump — beat the par
// distance for the STUNT bonus, the STATS checklist (Stunt jumps x/8) and
// the career "longest jump" record. Ramps are world props (see world.js);
// this module owns the jump data, the distance math and the records.
export const STUNT_JUMPS = [
  { id: 'pier-launch', name: 'PIER LAUNCH', district: 'Solmar Strand', parMeters: 32, bonus: 600, hint: 'Off the end of Solmar Pier, full throttle.' },
  { id: 'casino-roof', name: 'CASINO ROOF GAP', district: 'Casino Row', parMeters: 26, bonus: 500, hint: 'The service ramp behind the Meridian casino.' },
  { id: 'dock-crane', name: 'DOCK CRANE DROP', district: 'Coral Docks', parMeters: 38, bonus: 800, hint: 'Over the container stacks at the north wharf.' },
  { id: 'marina-flyer', name: 'MARINA FLYER', district: 'Marina Bay', parMeters: 24, bonus: 450, hint: 'The yacht-club ramp at the end of the marina.' },
  { id: 'old-port-arch', name: 'OLD PORT ARCH', district: 'Old Port', parMeters: 30, bonus: 650, hint: 'Through the customs arch, airborne.' },
  { id: 'downtown-plunge', name: 'DOWNTOWN PLUNGE', district: 'Downtown', parMeters: 34, bonus: 700, hint: 'Down the parking-garage ramp, over the plaza.' },
  { id: 'strand-duo', name: 'STRAND DOUBLE', district: 'Strand Boulevard', parMeters: 28, bonus: 550, hint: 'Two ramps, one jump, the whole boulevard watching.' },
  { id: 'ferris-hop', name: 'FERRIS HOP', district: 'Solmar Strand', parMeters: 22, bonus: 400, hint: 'The boardwalk ramp under the Ferris wheel.' },
];

export function getStuntJump(id) {
  return STUNT_JUMPS.find((j) => j.id === id) || STUNT_JUMPS[0];
}

// Score a jump: distance in metres from takeoff to landing. Returns the
// result (cleared par or not, bonus earned, new record or not).
export function scoreJump(jumpId, distanceMeters, bestMeters) {
  const jump = getStuntJump(jumpId);
  const cleared = distanceMeters >= jump.parMeters;
  const record = distanceMeters > (bestMeters || 0);
  return {
    jump: jump.name,
    distance: Math.round(distanceMeters * 10) / 10,
    par: jump.parMeters,
    cleared,
    bonus: cleared ? jump.bonus : 0,
    record,
    newBest: Math.max(bestMeters || 0, distanceMeters),
  };
}

// Airtime distance from speed and ramp angle: v^2 * sin(2a) / g, with a
// small arcade boost so 100+ km/h jumps clear their pars.
export function jumpDistance(speedKmh, rampDegrees = 18) {
  const v = speedKmh / 3.6;
  const a = (rampDegrees * Math.PI) / 180;
  return (v * v * Math.sin(2 * a)) / 9.81 * 1.35;
}
