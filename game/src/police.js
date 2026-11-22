// Wanted system and police dispatch for Solmar City 3D. Stars rise with
// crimes and fall with time in hiding; dispatch answers with named units —
// bird and sea callsigns, coloured status chips, distances — plus PIT
// attempts, roadblocks and the KESTREL-9 helicopter at four stars and
// above. The HUD also shows a live dispatch radio log line, and district
// standing feeds the hiding mechanic: in a FRIENDLY district locals hide
// you faster (see the "Hidden by locals" career stat).
export const DISPATCH_UNITS = [
  { callsign: 'FALCON-2', type: 'MARKSMAN', chip: 'PURSUIT', chipClass: 'orange', distance: 15 },
  { callsign: 'DOLPHIN-7', type: 'SHORE WATCH', chip: 'RESPONDING', chipClass: 'blue', distance: 187 },
  { callsign: 'REEF-12', type: 'INTERCEPTOR', chip: 'RAMMING', chipClass: 'red', distance: 7 },
  { callsign: 'OSPREY-4', type: 'FLANKER', chip: 'FLANKING', chipClass: 'purple', distance: 14 },
  { callsign: 'BARRACUDA-6', type: 'INTERCEPTOR', chip: 'RAMMING', chipClass: 'red', distance: 15 },
  { callsign: 'KESTREL-9', type: 'AIR SUPPORT', chip: 'SPOTLIGHT', chipClass: 'yellow', distance: 32 },
];

export const WANTED_LEVELS = [
  { stars: 0, label: 'CLEAN', response: 'No heat. The city is yours.' },
  { stars: 1, label: 'SPOTTED', response: 'One patrol unit investigates.' },
  { stars: 2, label: 'PURSUIT', response: 'Two cruisers in pursuit.' },
  { stars: 3, label: 'CODE 3', response: 'Roadblocks ahead; PIT attempts.' },
  { stars: 4, label: 'CODE 4', response: 'Helicopter deployed; spike strips.' },
  { stars: 5, label: 'MANHUNT', response: 'Every unit in the city. Good luck.' },
];

// Radio chatter for the dispatch log line under the unit list. The log
// rotates one line every few seconds; the staged shots pin a fitting one.
export const DISPATCH_LOG = [
  'FALCON-2: suspect north on the Strand',
  'KESTREL-9: spotlight on the suspect',
  'REEF-12: shots fired, Coral Docks',
  'DOLPHIN-7: cutting off the pier',
  'OSPREY-4: flanking through Downtown',
  'BARRACUDA-6: PIT failed, suspect rolling',
  'DISPATCH: the Vanguard is the priority',
];

export const HIDE_TIPS = [
  'DUCK BY A STALL TO HIDE',
  'FRIENDLY DISTRICTS HIDE YOU FASTER',
  'BREAK LINE OF SIGHT TO DROP THE HEAT',
];

export function wantedFor(stars) {
  return WANTED_LEVELS[Math.max(0, Math.min(5, stars))];
}

// Heat rises with crimes, decays while hidden; losing the tail drops a star.
// `standing` (0-100) shortens the hide time in friendly districts.
export function createWantedSystem() {
  const state = { stars: 0, heat: 0, hiddenTime: 0, spotted: false };
  return {
    state,
    commitCrime(weight) {
      state.heat = Math.min(100, state.heat + weight);
      state.stars = Math.min(5, Math.floor(state.heat / 20));
      state.spotted = state.stars > 0;
    },
    update(dt, inSight, standing = 50) {
      state.spotted = inSight && state.stars > 0;
      if (!inSight && state.stars > 0) {
        state.hiddenTime += dt;
        // Friendly districts hide you faster: 12s at 50 standing, 7s at 90.
        const hideTime = 12 - Math.max(0, standing - 50) * 0.125;
        if (state.hiddenTime > hideTime) {
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

// One rotating radio-log line, changing every 6 seconds.
export function dispatchLog(time) {
  const idx = Math.floor(time / 6) % DISPATCH_LOG.length;
  return DISPATCH_LOG[idx];
}
