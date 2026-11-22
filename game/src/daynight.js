// Day/night cycle for Solmar City 3D: the city runs on a 24-hour clock
// (1 game hour = 2 real minutes in free play). Time of day drives the sun
// colour and height, the sky gradient, the fog, the neon signs and the
// helicopter searchlight — night is a real lighting state, not a filter,
// which is what makes the night shootout shot honest staging. The staged
// screenshots pin the clock (16:42 day, 21:47 night, 18:21 golden hour).
export const DAY_PHASES = [
  { name: 'NIGHT', from: 21, to: 5, sunColor: 0x8fb4ff, sunIntensity: 0.55, hemi: 0.35, fog: 0x0d1526, skyTop: 0x0a1230, skyHorizon: 0x1c2b52, neon: true },
  { name: 'DAWN', from: 5, to: 8, sunColor: 0xffb27a, sunIntensity: 1.6, hemi: 0.8, fog: 0xd8c9b0, skyTop: 0x5b7fd4, skyHorizon: 0xffc98a, neon: false },
  { name: 'DAY', from: 8, to: 17, sunColor: 0xfff2d9, sunIntensity: 3.0, hemi: 1.5, fog: 0xcfe9f7, skyTop: 0x2f7fd0, skyHorizon: 0xcfe9f7, neon: false },
  { name: 'GOLDEN HOUR', from: 17, to: 19, sunColor: 0xffc07a, sunIntensity: 2.4, hemi: 0.9, fog: 0xf7c98a, skyTop: 0x3b5bdb, skyHorizon: 0xffb26b, neon: false },
  { name: 'DUSK', from: 19, to: 21, sunColor: 0xff8a5c, sunIntensity: 1.2, hemi: 0.55, fog: 0x8a6a8f, skyTop: 0x2b3a6e, skyHorizon: 0xff9a7a, neon: true },
];

export function phaseForHour(hour) {
  const h = ((hour % 24) + 24) % 24;
  for (const phase of DAY_PHASES) {
    if (phase.from < phase.to) {
      if (h >= phase.from && h < phase.to) return phase;
    } else if (h >= phase.from || h < phase.to) {
      return phase;
    }
  }
  return DAY_PHASES[2];
}

// Sun position for an hour: rises east, sets west, low at dawn/dusk.
export function sunPositionForHour(hour) {
  const h = ((hour % 24) + 24) % 24;
  const dayT = (h - 6) / 12; // 0 at 06:00, 1 at 18:00
  const angle = Math.PI * Math.max(0, Math.min(1, dayT));
  return {
    x: -Math.cos(angle) * 120,
    y: Math.sin(angle) * 110 + 8,
    z: -120,
  };
}

// Advance the clock by dt seconds of real time (1 game hour = 120s).
export function advanceClock(clockMinutes, dtSeconds) {
  return (clockMinutes + dtSeconds / 2) % 1440;
}

export function formatClock(clockMinutes) {
  const h = Math.floor(clockMinutes / 60);
  const m = Math.floor(clockMinutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
