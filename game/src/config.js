// Solmar City — tuning constants and the sun-soaked palette.
// Every number the game balances on lives here, so a tweak never means
// hunting through the systems.

export const CFG = {
  // Canvas (fixed internal resolution; CSS scales it to the window).
  viewWidth: 1280,
  viewHeight: 720,

  // City grid: 8 avenues (vertical roads) by 6 streets (horizontal roads).
  avenueCount: 8,
  streetCount: 6,
  roadPitch: 300, // distance between neighbouring road centrelines
  roadFirst: 100, // centreline of the first avenue / street
  roadWidth: 72,
  laneOffset: 18, // right-hand traffic: cars drive this far right of centre

  // World bounds. The beach runs along the east edge, the harbour south.
  worldMinX: -80,
  worldMinY: -80,
  worldMaxX: 2800,
  worldMaxY: 2150,
  beachX: 2400, // sand starts here
  waterX: 2680, // sea starts here
  harborY: 1800, // docks start here
  waterY: 2050, // sea starts here (south)

  // Park: the two blocks between avenues 3-4 and streets 2-3.
  parkCol: 3,
  parkRow: 2,

  // Population.
  trafficCars: 26,
  parkedCars: 10,
  pedestrians: 42,

  // Player on foot.
  walkSpeed: 175,
  sprintSpeed: 265,
  playerRadius: 13,
  playerHealth: 100,
  healthRegenDelay: 5, // seconds without damage before regen starts
  healthRegenRate: 6, // hp per second

  // Driving.
  carAccel: 620, // px/s^2
  carBrake: 900,
  carReverseMax: 220,
  carMaxSpeed: 560, // px/s, about 200 km/h on the HUD
  carTurnRate: 2.6, // rad/s at full lock, scaled by speed
  carGrip: 6.5, // how fast lateral slide is killed
  carRadius: 16,
  carLength: 46,
  carWidth: 24,

  // Traffic.
  trafficSpeed: 150,
  trafficMinGap: 78, // px to the car ahead before braking
  trafficTurnChance: 0.34,

  // Pedestrians.
  pedSpeed: 55,
  pedFleeSpeed: 150,

  // Combat.
  pistolDamage: 25,
  pistolMag: 12,
  pistolFireInterval: 0.22,
  pistolReloadTime: 1.2,
  pistolRange: 520,
  bulletSpeed: 900,
  punchDamage: 15,
  punchRange: 46,
  punchInterval: 0.45,
  enemyHealth: 50,
  enemyShootInterval: 1.8,
  enemyDamage: 7,
  enemySpeed: 120,
  copHealth: 50,
  copPunchDamage: 6,

  // Wanted / police.
  bustTime: 3.0, // seconds of being caught before BUSTED
  bustPenalty: 200,
  wastedPenalty: 100,
  wantedDecayDelay: 10, // seconds unseen before stars start dropping
  wantedDecayInterval: 8,
  maxFootCops: 8,
  maxPoliceCars: 5,

  // Economy.
  doubloonValue: 100,
  doubloonBonus: 1000, // for collecting all 12
  doubloonCount: 12,
  raceGoldBonus: 200,

  // Camera.
  cameraLead: 0.25, // fraction of the view the camera leads the player by
  cameraSmooth: 5,
};

export const PALETTE = {
  grass: '#79a95b',
  grassDark: '#6b9a4e',
  asphalt: '#3b3835',
  asphaltEdge: '#2e2b29',
  laneDash: '#e8d44d',
  sidewalk: '#b3a284',
  sidewalkEdge: '#9c8c6e',
  sand: '#ecd9a0',
  water: '#3d9dbf',
  waterDeep: '#2b7ea3',
  parkGrass: '#5f9e4d',
  buildingRoofs: ['#c96f4a', '#d9a441', '#7d9bb5', '#b5b0a4', '#a9719e', '#6fae8f', '#c9c2b4'],
  buildingSide: '#8d8578',
  carColors: ['#c23b2e', '#2e6fc2', '#e8c53a', '#3aa655', '#e8e8e8', '#2b2b2b', '#c27ba0', '#4aa8c2', '#e67e22', '#7d5ba6'],
  policeCar: '#f2f2f2',
  playerShirt: '#e8b13a',
  gold: '#f2c531',
};

export const SAVE_KEY = 'solmar-city-save-v1';
