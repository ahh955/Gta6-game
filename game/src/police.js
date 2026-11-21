// Wanted system and police dispatch for Solmar City 3D. Stars rise with
// crimes and fall with time in hiding; dispatch answers with named units —
// bird and sea callsigns, coloured status chips, distances — plus PIT
// attempts, roadblocks and the CONDOR-1 helicopter at four stars and above.
export const DISPATCH_UNITS = [
  { callsign: 'KITE-1', type: 'MARKSMAN', chip: 'PURSUIT', chipClass: 'orange', distance: 15 },
  { callsign: 'MARLIN-3', type: 'SHORE WATCH', chip: 'RESPONDING', chipClass: 'blue', distance: 187 },
  { callsign: 'CORAL-48', type: 'INTERCEPTOR', chip: 'RAMMING', chipClass: 'red', distance: 7 },
  { callsign: 'HERON-5', type: 'FLANKER', chip: 'FLANKING', chipClass: 'purple', distance: 14 },
  { callsign: 'TARPON-9', type: 'INTERCEPTOR', chip: 'RAMMING', chipClass: 'red', distance: 15 },
  { callsign: 'CONDOR-1', type: 'AIR SUPPORT', chip: 'SPOTLIGHT', chipClass: 'yellow', distance: 32 },
];

export const WANTED_LEVELS = [
  { stars: 0, label: 'CLEAN', response: 'No heat. The city is yours.' },
  { stars: 1, label: 'SPOTTED', response: 'One patrol unit investigates.' },
  { stars: 2, label: 'PURSUIT', response: 'Two cruisers in pursuit.' },
  { stars: 3, label: 'CODE 3', response: 'Roadblocks ahead; PIT attempts.' },
  { stars: 4, label: 'CODE 4', response: 'Helicopter deployed; spike strips.' },
  { stars: 5, label: 'MANHUNT', response: 'Every unit in the city. Good luck.' },
];

export function wantedFor(stars) {
  return WANTED_LEVELS[Math.max(0, Math.min(5, stars))];
}

// Heat rises with crimes, decays while hidden; losing the tail drops a star.
export function createWantedSystem() {
  const state = { stars: 0, heat: 0, hiddenTime: 0, spotted: false };
  return {
    state,
    commitCrime(weight) {
      state.heat = Math.min(100, state.heat + weight);
      state.stars = Math.min(5, Math.floor(state.heat / 20));
      state.spotted = state.stars > 0;
    },
    update(dt, inSight) {
      state.spotted = inSight && state.stars > 0;
      if (!inSight && state.stars > 0) {
        state.hiddenTime += dt;
        if (state.hiddenTime > 12) {
          state.stars = Math.max(0, state.stars - 1);
          state.heat = state.stars * 20;
          state.hiddenTime = 0;
        }
      } else {
        state.hiddenTime = 0;
      }
    },
    bribePaid(amount) {
      state.stars = Math.max(0, state.stars - 1);
      state.heat = state.stars * 20;
      return amount >= 1000;
    },
  };
}

// Dispatch lines for the HUD panel, distances jittered slightly per frame.
export function dispatchLines(time) {
  return DISPATCH_UNITS.map((unit, i) => ({
    ...unit,
    distance: Math.max(3, unit.distance + Math.round(Math.sin(time * 0.7 + i * 1.7) * 4)),
  }));
}
