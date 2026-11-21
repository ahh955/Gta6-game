// Solmar City — constants: city size, dusk palette, tuning.
export const CONFIG = {
  seed: 20261121,
  // City: square grid, blocks of 64 + 16-wide roads, 5x5 blocks.
  blockSize: 64,
  roadWidth: 16,
  blocks: 5,
  // Derived: half-extent of the drivable grid (roads at multiples of 80).
  gridStep: 80,
  // Beach strip on the east edge, ocean beyond it.
  beachStartX: 210,
  oceanStartX: 252,
  oceanWidth: 220,
  // Player / driving tuning.
  walkSpeed: 6,
  sprintSpeed: 10.5,
  carTopSpeed: 42,          // m/s (~95 mph)
  carAccel: 16,
  carBrake: 30,
  carReverseSpeed: 12,
  carTurnRate: 1.9,         // rad/s at full lock, scaled by speed
  // Police tuning.
  maxWanted: 5,
  cruisersPerStar: 1,       // +1 cruiser per star, capped below
  maxCruisers: 6,
  roadblockStars: 3,
  heliStars: 4,
  bustRange: 4.5,           // cruiser within this, player slow => busted
  bustTime: 2.5,            // seconds held still to get busted
  heatDecayPerSec: 0.02,    // wanted heat fades when unseen
};

export const PALETTE = {
  skyTop: 0x2a1a5e,
  skyMid: 0xb34a6e,
  skyHorizon: 0xff9a5c,
  sun: 0xffd27a,
  fog: 0xc96a6a,
  ground: 0x3d3a4a,
  road: 0x2b2a33,
  roadLine: 0xe8d44d,
  sidewalk: 0x6f6a7a,
  sand: 0xe8c98a,
  ocean: 0x1d5f7a,
  building: [0x8a7f9e, 0x6e6a8e, 0x9e8a7f, 0x5e6a8e, 0x8e7a6a, 0x7a6a9e],
  windowLit: 0xffd27a,
  windowDark: 0x1a2038,
  palmTrunk: 0x6b4a2f,
  palmLeaf: 0x2e7d4f,
  carColors: [0xc23b3b, 0x3b7ac2, 0xe8e8e8, 0x222226, 0xe8a33b, 0x3bc27a, 0x8e3bc2, 0xc2c2c2],
  policeWhite: 0xf2f2f2,
  policeBlack: 0x14141c,
};

export const DISTRICTS = [
  { name: 'Downtown Solmar', x0: -220, z0: -220, x1: 40, z1: 40 },
  { name: 'Marina Bay', x0: 40, z0: -220, x1: 220, z1: 40 },
  { name: 'Coral Beach', x0: 40, z0: 40, x1: 240, z1: 220 },
  { name: 'Old Town', x0: -220, z0: 40, x1: 40, z1: 220 },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d.name;
  }
  return x >= 210 ? 'Coral Beach' : 'Solmar City';
}
