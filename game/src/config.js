// Every tuning number and colour in one place. The world is a fixed-size city in pixels;
// the camera shows a 1280x720 window of it, so no rule below depends on the screen size.

export const STEP = 1 / 60;

export const VIEW = { width: 1280, height: 720 };

export const CITY = {
  width: 4800,
  height: 3600,
  roadWidth: 110,
  avenues: [400, 1000, 1600, 2200, 2800, 3400, 4000, 4400],
  streets: [400, 900, 1400, 1900, 2400, 2900],
  parkBlock: { x0: 1655, y0: 1455, x1: 2145, y1: 1845 },
  beachTop: 3100,
  waterTop: 3360,
  harbor: { x0: 3800, y0: 2900, x1: 4700, y1: 3360 },
};

export const PLAYER = {
  radius: 13,
  walkSpeed: 210,
  sprintSpeed: 330,
  maxHealth: 100,
  punchRange: 34,
  punchDamage: 20,
  punchCooldown: 0.35,
};

export const GUN = {
  magazine: 12,
  reloadSeconds: 1.2,
  fireCooldown: 0.22,
  bulletSpeed: 900,
  bulletDamage: 34,
  bulletLife: 0.9,
  spread: 0.045,
};

export const CAR = {
  accel: 420,
  brake: 700,
  reverseMax: 180,
  friction: 0.9,
  grip: 2.6,
  steerRate: 2.4,
  handbrakeGrip: 0.7,
};

export const CAR_TYPES = {
  sedan: { length: 52, width: 26, maxSpeed: 560, accelScale: 1.0, name: 'Sedan' },
  taxi: { length: 52, width: 26, maxSpeed: 540, accelScale: 1.0, name: 'Taxi' },
  sports: { length: 54, width: 26, maxSpeed: 780, accelScale: 1.35, name: 'Sports' },
  truck: { length: 66, width: 28, maxSpeed: 430, accelScale: 0.8, name: 'Truck' },
  van: { length: 60, width: 28, maxSpeed: 470, accelScale: 0.85, name: 'Van' },
  police: { length: 54, width: 26, maxSpeed: 660, accelScale: 1.15, name: 'Police' },
};

export const TRAFFIC = {
  count: 26,
  parkedCount: 22,
  cruiseSpeed: 260,
  slowDistance: 130,
  stopDistance: 55,
};

export const PEDS = {
  count: 42,
  walkSpeed: 55,
  fleeSpeed: 190,
  fleeRadius: 220,
};

export const WANTED = {
  thresholds: [0, 100, 250, 450, 700, 1000],
  stealCar: 60,
  hitPed: 80,
  killPed: 150,
  hitCop: 120,
  killCop: 220,
  shootNearCop: 40,
  decayPerSecond: 9,
  unseenGrace: 5,
  maxLevel: 5,
};

export const POLICE = {
  footSpeed: 235,
  bustDistance: 46,
  bustSeconds: 2.5,
  carBustDistance: 95,
  maxFootCops: 8,
  maxCars: 5,
  spawnDistance: 750,
};

export const ENEMY = {
  health: 100,
  speed: 165,
  shootRange: 380,
  fireCooldown: 0.9,
  bulletDamage: 9,
  countMission: 6,
};

export const MISSION_REWARDS = [500, 800, 1000, 1200, 2500];

export const PALETTE = {
  asphalt: '#57504a',
  asphaltDark: '#4a443f',
  roadMark: '#e8dcc0',
  sidewalk: '#b3a284',
  sidewalkEdge: '#9c8c6f',
  block: '#a08e6d',
  grass: '#7fae5a',
  grassDark: '#6d9c4c',
  sand: '#ecd9a0',
  water: '#2f6f9e',
  waterDeep: '#245a82',
  building: ['#e8b4a0', '#f0d0a0', '#c8d8c8', '#a8c8d8', '#d8b8d0', '#f5e6c8', '#c9b8e0', '#e0a8a8'],
  roof: ['#8a7a68', '#7a6a58', '#6a7a6a', '#6a7a8a'],
  tree: '#4e7d3a',
  treeDark: '#3f6630',
  player: '#2f7fd8',
  playerDark: '#1f5fa8',
  enemy: '#c0392b',
  cop: '#1f3a5f',
  copLightRed: '#ff3b30',
  copLightBlue: '#3b82ff',
  hudText: '#ffffff',
  hudPanel: 'rgba(12, 14, 20, 0.72)',
  money: '#7dd87d',
  star: '#ffd94a',
  gold: '#f2c94c',
  danger: '#ff5a4e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const SAVE_KEY = 'solmar-city.save.v1';
export const BEST_KEY = 'solmar-city.best';
