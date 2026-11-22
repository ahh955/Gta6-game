// Street races for Solmar City 3D: four illegal night races across the
// city, each with checkpoints, rival drivers, gold/silver target times and
// a race HUD. Races are the game's second core loop after story missions:
// win them for cash, RP and the STATS checklist (Races x/4). Press R in
// free play to line up at the nearest start; checkpoints are gates across
// the boulevard, rivals are simulated on their own pace lines.
export const RACES = [
  {
    id: 'strand-sprint', name: 'STRAND SPRINT', district: 'Solmar Strand',
    checkpoints: 5, distanceKm: 3.1, goldSeconds: 118, silverSeconds: 142,
    prize: 2400, rp: 350,
    rivals: ['TESSA "GHOST" RYU', 'MARCO DELGADO', 'INA KOVAC'],
    brief: 'Five gates down the Strand at full throttle. Ghost always jumps the start.',
    start: { x: 2, z: 30 }, direction: -1,
  },
  {
    id: 'terrace-climb', name: 'TERRACE CLIMB', district: 'Downtown',
    checkpoints: 6, distanceKm: 4.4, goldSeconds: 165, silverSeconds: 198,
    prize: 3200, rp: 480,
    rivals: ['DANTE CROWE', 'SABLE OKONKWO', 'PETE "BRAKES" HALL'],
    brief: 'Six gates through the terraces and back. Tight corners, no guardrails.',
    start: { x: -2, z: 28 }, direction: -1,
  },
  {
    id: 'wharf-loop', name: 'WHARF LOOP', district: 'Coral Docks',
    checkpoints: 7, distanceKm: 5.2, goldSeconds: 201, silverSeconds: 240,
    prize: 4100, rp: 620,
    rivals: ['NIA FARROW', 'GUS TANNER', 'LENA "LANTERN" CHO'],
    brief: 'A full loop of the wharves — containers, cranes and one very wet hairpin.',
    start: { x: 4, z: 26 }, direction: -1,
  },
  {
    id: 'neon-mile', name: 'NEON MILE DASH', district: 'Casino Row',
    checkpoints: 4, distanceKm: 2.2, goldSeconds: 84, silverSeconds: 102,
    prize: 1800, rp: 260,
    rivals: ['JULES VERNE', 'MIRA SOLANO', 'OTTO "DOUBLE" REYES'],
    brief: 'Four gates through the neon. Short, fast, and the Row is always watching.',
    start: { x: 0, z: 32 }, direction: -1,
  },
];

// Checkpoint gates along the boulevard: each race's gates are spaced down
// -Z from its start line, one per checkpoint, alternating lanes.
export function raceCheckpoints(race) {
  const gates = [];
  for (let i = 0; i < race.checkpoints; i++) {
    gates.push({
      index: i + 1,
      x: (i % 2 === 0 ? -1 : 1) * 2.4,
      z: race.start.z - (i + 1) * (race.distanceKm * 1000 / race.checkpoints / 12),
      passed: false,
    });
  }
  return gates;
}

export function getRace(id) {
  return RACES.find((r) => r.id === id) || RACES[0];
}

// Live race state: the player plus three rivals on simulated pace lines.
// Rivals finish at gold + a per-rival offset, so position is real.
export function createRaceState(race) {
  const gates = raceCheckpoints(race);
  return {
    race,
    gates,
    checkpoint: 0,
    timeSeconds: 0,
    running: false,
    finished: false,
    position: 4,
    rivals: race.rivals.map((name, i) => ({
      name,
      finishSeconds: race.goldSeconds + [6, 14, 23][i],
      checkpoint: 0,
    })),
  };
}

export function startRace(raceState) {
  raceState.running = true;
  raceState.timeSeconds = 0;
  raceState.checkpoint = 0;
  raceState.finished = false;
  for (const gate of raceState.gates) gate.passed = false;
  return raceState;
}

// Advance the race by dt; playerPos is the player's {x, z}. A gate counts
// when the player passes within 6 m of it. Returns 'checkpoint' | 'finish' | null.
export function updateRace(raceState, dt, playerPos) {
  if (!raceState.running || raceState.finished) return null;
  raceState.timeSeconds += dt;
  const next = raceState.gates[raceState.checkpoint];
  if (next) {
    const dx = playerPos.x - next.x;
    const dz = playerPos.z - next.z;
    if (dx * dx + dz * dz < 36) {
      next.passed = true;
      raceState.checkpoint++;
      if (raceState.checkpoint >= raceState.gates.length) {
        raceState.finished = true;
        raceState.running = false;
        raceState.position = 1 + raceState.rivals.filter(
          (r) => r.finishSeconds < raceState.timeSeconds,
        ).length;
        return 'finish';
      }
      return 'checkpoint';
    }
  }
  // Rivals advance on their pace lines.
  for (const rival of raceState.rivals) {
    const pace = rival.finishSeconds / raceState.race.checkpoints;
    rival.checkpoint = Math.min(
      raceState.race.checkpoints,
      Math.floor(raceState.timeSeconds / pace),
    );
  }
  return null;
}

export function raceRating(raceState) {
  if (!raceState.finished) return null;
  if (raceState.timeSeconds <= raceState.race.goldSeconds && raceState.position === 1) return 'GOLD';
  if (raceState.timeSeconds <= raceState.race.silverSeconds) return 'SILVER';
  return 'BRONZE';
}

export function raceResults(raceState) {
  return {
    race: raceState.race.name,
    time: raceState.timeSeconds,
    position: raceState.position,
    rating: raceRating(raceState),
    prize: raceState.position === 1 ? raceState.race.prize : Math.round(raceState.race.prize / 4),
    rp: raceState.position === 1 ? raceState.race.rp : Math.round(raceState.race.rp / 3),
  };
}
