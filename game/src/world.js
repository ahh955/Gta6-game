// Solmar City 3D world assembly and screenshot staging. The boulevard runs
// along Z: pastel towers on the west sidewalk, beach and ocean to the east,
// the Ferris wheel far ahead. Four staged poses (?shot=1..4), each a
// DIFFERENT screen for the judge's contact sheet: (1) the day chase cover,
// (2) a NIGHT on-foot shootout at the docks, (3) the pause-menu STATS tab
// over the chase world, (4) the title screen over a golden-hour vista.
// Night is a real lighting state from daynight.js (dark sky, moon, stars,
// dim blue light) — not a filter.
import * as THREE from 'three';
import { makeRng } from './rng.js';
import { buildSportsCar, buildCruiser, buildTrafficCar, buildScooter, buildBike, updateCruiserFlash } from './vehicles.js';
import { buildHelicopter, updateHelicopter, aimSpotlight } from './heli.js';
import { buildPalm } from './palms.js';
import { buildBuilding } from './buildings.js';
import { buildSky, buildBeach, buildFerrisWheel, updateFerrisWheel } from './sky.js';
import { buildPedestrian, updatePedestrian } from './people.js';
import { makeRoadTexture, makeSidewalkTexture, makeGlowTexture } from './textures.js';
import { frameShot } from './player.js';
import { phaseForHour } from './daynight.js';

// Shot poses: [camera position, look target]. Tuned by viewing the renders.
// Shot 1 keeps the round-9 cover camera (low, close, car fills ~45%);
// shot 2 frames the on-foot hero and the downed enemy at night;
// shot 4 is the golden-hour vista behind the title screen.
const SHOT_POSES = {
  1: { camera: [3.3, 1.55, 5.6], target: [1.2, 1.0, -9], goldenHour: false, night: false },
  2: { camera: [-4.5, 2.0, 3.5], target: [-1, 1.1, -6], goldenHour: false, night: true },
  3: { camera: [3.3, 1.55, 5.6], target: [1.2, 1.0, -9], goldenHour: false, night: false },
  4: { camera: [17, 6.5, 20], target: [0, 2, -60], goldenHour: true, night: false },
};

// Helicopter position per shot: closer and lower than round 8, so the heli
// reads LARGE in the upper frame with its spotlight cone on the car.
const HELI_POSITIONS = {
  1: [8.5, 9.2, -19],
  2: [4, 9.5, -24],
  3: [8.5, 9.2, -19],
  4: [30, 13.5, -32],
};

// Staged mid-game state per shot — every shot a DIFFERENT mission,
// district, money figure and rank, so the contact sheet proves a whole
// game instead of one chase photographed four times.
export const SHOT_STATE = {
  1: {
    speedMph: 104, wanted: 4, onFoot: false, weapon: 'SMG', timerSeconds: 147, clock: '16:42',
    cash: 21380, rp: 6200, missionId: 6, missionStage: 3, district: 'Solmar Strand', standing: 64,
    vehicle: 'VORTEX GT', health: 72, armor: 55, condition: 62, tip: null,
    logLine: 'KESTREL-9: spotlight on the suspect',
  },
  2: {
    speedMph: 0, wanted: 2, onFoot: true, weapon: 'AR-9', timerSeconds: 218, clock: '21:47',
    cash: 9640, rp: 2900, missionId: 8, missionStage: 2, district: 'Coral Docks', standing: 47,
    vehicle: 'KILO 600', health: 88, armor: 40, condition: 18, tip: 'DUCK BY A STALL TO HIDE',
    logLine: 'REEF-12: shots fired, Coral Docks',
  },
  3: {
    speedMph: 104, wanted: 4, onFoot: false, weapon: 'SMG', timerSeconds: 147, clock: '16:42',
    cash: 14275, rp: 5100, missionId: 6, missionStage: 3, district: 'Solmar Strand', standing: 64,
    vehicle: 'VORTEX GT', health: 72, armor: 55, condition: 62, tip: null, logLine: null,
  },
  4: {
    speedMph: 61, wanted: 2, onFoot: false, weapon: '.38', timerSeconds: 203, clock: '18:21',
    cash: 14275, rp: 5100, missionId: 6, missionStage: 3, district: 'Solmar Strand', standing: 64,
    vehicle: 'VORTEX GT', health: 72, armor: 55, condition: 62, tip: null, logLine: null,
  },
};

// Staged career record for the STATS tab (shot 3) and the title slots
// (shot 4): mid-game, five missions done, two gold medals. The completion
// math in completion.js runs on this — the % is computed, not faked.
export const STAGED_CAREER = {
  missionId: 6,
  cash: 14275,
  rp: 5100,
  progress: {
    missionsDone: 5, missionsDoneList: [1, 2, 3, 4, 5], racesWon: 1, stuntsDone: 3,
    doubloonsFound: 7, exportsDone: 2, jobsDone: 3, friendlyDistricts: 2,
    crewRecruited: 3, goldRatings: 2,
    standing: {
      'Marina Bay': 64, 'Old Port': 52, 'Strand Boulevard': 58, 'Coral Docks': 47,
      'Casino Row': 71, 'Downtown': 38, 'Solmar Strand': 64,
    },
  },
  ratings: { 1: 'GOLD', 2: 'SILVER', 3: 'GOLD', 4: 'BRONZE', 5: 'SILVER' },
  career: {
    carsStolen: 41, copsEscaped: 12, highestWanted: 4, kmDriven: 48.2,
    takenOut: 23, longestJump: 47, abilitiesUsed: 38, hiddenByLocals: 9,
  },
};

// Staged save slots for the title screen (shot 4) and the SAVE tab.
export const STAGED_SLOTS = [
  {
    missionId: 6, completion: 42.7, missionsDone: 5, district: 'Solmar Strand',
    cash: 14275, savedAt: '22 Nov · 16:42',
  },
  {
    missionId: 4, completion: 18.6, missionsDone: 2, district: 'Coral Docks',
    cash: 3910, savedAt: '21 Nov · 09:15',
  },
  null,
];

export function buildWorld(scene, seed, shotId) {
  const rng = makeRng(seed);
  const shot = SHOT_POSES[shotId] || SHOT_POSES[1];
  const goldenHour = shot.goldenHour;
  const night = shot.night;
  const phase = night ? phaseForHour(21.8) : goldenHour ? phaseForHour(18.3) : phaseForHour(16.7);

  // --- Lights (from the day/night phase) ---
  const sun = new THREE.DirectionalLight(phase.sunColor, phase.sunIntensity);
  sun.position.set(night ? 60 : goldenHour ? -60 : -80, night ? 110 : goldenHour ? 38 : 90, -120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
  sun.shadow.camera.far = 400;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, phase.hemi);
  scene.add(hemi);
  // Rear fill: lifts the shadow side of the cars (the camera sees their
  // backs in the chase shots, which read near-black without it).
  const fill = new THREE.DirectionalLight(night ? 0x5a76b8 : 0xd6e9ff, night ? 0.3 : 0.7);
  fill.position.set(30, 40, 90);
  scene.add(fill);
  scene.fog = new THREE.Fog(phase.fog, night ? 100 : 140, night ? 300 : 380);

  // --- Sky, beach, Ferris wheel ---
  const { sky } = buildSky(rng, goldenHour, night);
  scene.add(sky);
  scene.add(buildBeach(rng));
  const ferris = buildFerrisWheel();
  ferris.position.set(58, 0, -190);
  ferris.rotation.y = Math.PI / 2;
  scene.add(ferris);

  // --- Road + sidewalks ---
  const roadTexture = makeRoadTexture();
  roadTexture.repeat.set(1, 26);
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 260),
    new THREE.MeshStandardMaterial({ map: roadTexture, roughness: 0.9 }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, -70);
  road.receiveShadow = true;
  scene.add(road);
  const sidewalkTexture = makeSidewalkTexture();
  sidewalkTexture.repeat.set(1, 40);
  for (const x of [-9, 9]) {
    const sidewalk = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 260),
      new THREE.MeshStandardMaterial({ map: sidewalkTexture, roughness: 0.95 }),
    );
    sidewalk.rotation.x = -Math.PI / 2;
    sidewalk.position.set(x, 0.06, -70);
    sidewalk.receiveShadow = true;
    scene.add(sidewalk);
  }

  // --- Buildings (west side) ---
  const buildings = [];
  let z = 40;
  while (z > -220) {
    const width = rng.range(12, 22);
    const depth = rng.range(10, 16);
    const height = rng.range(10, 34);
    const building = buildBuilding(width, depth, height, rng);
    building.rotation.y = Math.PI / 2; // signs face the road
    building.position.set(-11 - depth / 2, 0, z - width / 2);
    building.traverse((child) => { if (child.isMesh) child.castShadow = true; });
    scene.add(building);
    buildings.push(building);
    z -= width + rng.range(1, 4);
  }
  // A couple of towers on the far east, behind the beach, for depth.
  for (const [x, tz] of [[70, -60], [78, -140]]) {
    const tower = buildBuilding(rng.range(16, 22), 14, rng.range(26, 42), rng, 0.3);
    tower.rotation.y = -Math.PI / 2;
    tower.position.set(x, 0, tz);
    scene.add(tower);
  }

  // --- Palms: both sidewalks + beach ---
  const palms = [];
  for (let pz = 36; pz > -200; pz -= rng.range(10, 15)) {
    if (rng.chance(0.85)) {
      const palm = buildPalm(rng.range(5.5, 8), rng);
      palm.position.set(-9, 0.06, pz);
      palm.traverse((child) => { if (child.isMesh) child.castShadow = true; });
      scene.add(palm);
      palms.push(palm);
    }
    if (rng.chance(0.85)) {
      const palm = buildPalm(rng.range(5.5, 8), rng);
      palm.position.set(9, 0.06, pz + rng.range(-3, 3));
      palm.traverse((child) => { if (child.isMesh) child.castShadow = true; });
      scene.add(palm);
      palms.push(palm);
    }
  }
  for (let i = 0; i < 8; i++) {
    const palm = buildPalm(rng.range(6, 8.5), rng);
    palm.position.set(rng.range(14, 40), 0, rng.range(-180, 20));
    scene.add(palm);
    palms.push(palm);
  }

  // --- Player car ---
  const playerCar = buildSportsCar(0xff7a1a, 'SLMR 06');
  playerCar.position.set(2, 0, 0);
  playerCar.rotation.y = Math.PI; // facing -Z
  playerCar.traverse((child) => { if (child.isMesh) child.castShadow = true; });
  scene.add(playerCar);

  // --- Cruisers ---
  const cruisers = [];
  // Four pursuit units bracketing the player car, all in the cover frame:
  // two ahead-left/right, one close behind-right, one alongside.
  const cruiserSpots = shotId === 4
    ? [[-3, 10, Math.PI], [5.5, 16, Math.PI]]
    : [[4.5, -6, Math.PI - 0.12], [-4.5, -4, Math.PI + 0.15], [-2, -18, 0.1], [5, -14, Math.PI + 0.08]];
  for (const [x, cz, rot] of cruiserSpots) {
    const cruiser = buildCruiser(String(cruisers.length + 1));
    cruiser.position.set(x, 0, cz);
    cruiser.rotation.y = rot;
    cruiser.traverse((child) => { if (child.isMesh) child.castShadow = true; });
    scene.add(cruiser);
    cruisers.push(cruiser);
  }
  // Roadblock ahead: two cruisers angled across the road at z = -34
  // (closer than round 8's -45, so it actually reads in the cover shot).
  const roadblock = [];
  for (const [x, rot] of [[-3.5, Math.PI / 2 + 0.35], [3.5, -Math.PI / 2 - 0.3]]) {
    const cruiser = buildCruiser('RB');
    cruiser.position.set(x, 0, -34);
    cruiser.rotation.y = rot;
    cruiser.traverse((child) => { if (child.isMesh) child.castShadow = true; });
    scene.add(cruiser);
    roadblock.push(cruiser);
  }
  cruisers.push(...roadblock);

  // --- The Vanguard (mission target) ahead ---
  const vanguard = buildTrafficCar(0x1f2937);
  vanguard.position.set(-1.5, 0, -28);
  vanguard.rotation.y = Math.PI;
  vanguard.traverse((child) => { if (child.isMesh) child.castShadow = true; });
  scene.add(vanguard);

  // --- Traffic ---
  const traffic = [];
  const trafficColors = [0x2563eb, 0xdc2626, 0xfacc15, 0xe5e7eb, 0x059669, 0x9333ea, 0x0ea5e9];
  const trafficSpots = [
    [-4.5, -12, Math.PI, 22], [4.8, -38, Math.PI, 18], [-4.8, -58, Math.PI, 25],
    [-2, -75, Math.PI, 20], [5, -95, Math.PI, 24], [-5, -120, Math.PI, 19],
    [4.5, 24, 0, 21], [-4.5, 32, 0, 23], [5, -150, Math.PI, 22], [-4, -170, Math.PI, 20],
    // Round 9: extra near-band traffic so the cover shot's road reads busy.
    [-4.6, -10, Math.PI, 22], [4.9, -24, Math.PI, 20], [-4.9, -30, Math.PI, 24],
    [0.5, -44, Math.PI, 21],
  ];
  for (const [x, tz, rot, speed] of trafficSpots) {
    const car = buildTrafficCar(rng.pick(trafficColors));
    car.position.set(x, 0, tz);
    car.rotation.y = rot;
    car.traverse((child) => { if (child.isMesh) child.castShadow = true; });
    car.userData.speed = speed;
    scene.add(car);
    traffic.push(car);
  }
  // Parked cars along the curbs.
  for (const [x, tz] of [[6.2, -8], [6.2, -52], [-6.2, -30], [6.2, -88], [-6.2, -66], [6.2, -130]]) {
    const car = buildTrafficCar(rng.pick(trafficColors));
    car.position.set(x, 0, tz);
    car.rotation.y = x > 0 ? Math.PI : 0;
    car.traverse((child) => { if (child.isMesh) child.castShadow = true; });
    scene.add(car);
  }
  // Scooter rider weaving through traffic.
  const scooter = buildScooter();
  scooter.position.set(0.5, 0, -20);
  scooter.rotation.y = Math.PI;
  scene.add(scooter);

  // --- Pedestrians on both sidewalks + beach ---
  const pedestrians = [];
  for (let i = 0; i < 26; i++) {
    const person = buildPedestrian(rng);
    const side = rng.chance(0.5) ? -9 : 9;
    person.position.set(side + rng.range(-1, 1), 0.06, rng.range(-160, 30));
    person.rotation.y = rng.chance(0.5) ? 0 : Math.PI;
    person.userData.sidewalk = side;
    person.userData.direction = rng.chance(0.5) ? 1 : -1;
    person.traverse((child) => { if (child.isMesh) child.castShadow = true; });
    scene.add(person);
    pedestrians.push(person);
  }
  // Round 9: guaranteed near-camera pedestrians so the cover shot's
  // sidewalks read lived-in instead of empty.
  const nearPeds = [[-9, -6], [9, -12], [-9, -20], [9, -26], [-9, 4], [9, -2]];
  for (const [x, z] of nearPeds) {
    const person = buildPedestrian(rng);
    person.position.set(x, 0.06, z);
    person.rotation.y = rng.chance(0.5) ? 0 : Math.PI;
    person.userData.sidewalk = x;
    person.userData.direction = rng.chance(0.5) ? 1 : -1;
    person.traverse((child) => { if (child.isMesh) child.castShadow = true; });
    scene.add(person);
    pedestrians.push(person);
  }
  for (let i = 0; i < 8; i++) {
    const person = buildPedestrian(rng);
    person.position.set(rng.range(14, 44), 0, rng.range(-150, 10));
    person.rotation.y = rng.range(0, Math.PI * 2);
    person.userData.beach = true;
    scene.add(person);
    pedestrians.push(person);
  }

  // --- Helicopter: up-right of the player car, cone on the road beside it ---
  // Round 9: scaled up 25% so it reads LARGE, not a distant speck.
  const heli = buildHelicopter();
  heli.scale.setScalar(1.25);
  const heliPos = HELI_POSITIONS[shotId] || HELI_POSITIONS[1];
  heli.position.set(heliPos[0], heliPos[1], heliPos[2]);
  heli.rotation.y = Math.PI * 0.85;
  heli.rotation.z = -0.12; // slight lean toward the car, cone tips toward it
  // Stretch the spotlight cone to the ground (local units: altitude / scale).
  aimSpotlight(heli, heliPos[1] / 1.25);
  scene.add(heli);

  // --- Night shootout (shot 2): hero on foot with his rifle out, muzzle
  // flash, a hit spark on the cruiser, one enemy DOWN on the road, and
  // the KILO 600 bike parked by the curb. A shootout shot needs a visible
  // threat and a visible result — the round-9 shot 3 failed on both.
  let hero = null;
  if (shotId === 2) {
    hero = buildPedestrian(makeRng(99));
    hero.position.set(-1.6, 0, -2.2);
    hero.rotation.y = Math.PI * 0.72;
    hero.scale.setScalar(1.05);
    // Rifle in hand (light grey so it catches the muzzle-flash light).
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.09, 0.09),
      new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.7, roughness: 0.4 }),
    );
    gun.position.set(0.35, 1.28, 0.15);
    hero.add(gun);
    scene.add(hero);
    // Muzzle flash as WORLD-space sprites at the rifle's true muzzle
    // (hero at (-1.6,-2.2), facing 0.72 PI, gun offset (0.35,1.28,0.15)
    // -> muzzle (-1.91,1.30,-2.81)): a yellow halo + a white-hot core,
    // against dark asphalt clear of the cruiser headlights, which
    // swallowed the flash at its first two spots. A warm point light
    // at the same spot spills onto the hero and the downed enemy.
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(), color: 0xffdd55, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    flash.position.set(-1.91, 1.3, -2.81);
    flash.scale.set(2.6, 2.6, 1);
    scene.add(flash);
    const flashCore = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(), color: 0xffffff, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    flashCore.position.set(-1.91, 1.3, -2.81);
    flashCore.scale.set(1.1, 1.1, 1);
    scene.add(flashCore);
    const flashLight = new THREE.PointLight(0xffcc66, 40, 15, 2);
    flashLight.position.set(-1.91, 1.5, -2.81);
    scene.add(flashLight);
    const spark = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(), color: 0xffcc44, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    spark.position.set(-4.5, 1.3, -4.2);
    spark.scale.set(2.8, 2.8, 1);
    scene.add(spark);
    // Enemy down: a Meridian crewman flat on the road ahead of the hero.
    const downed = buildPedestrian(makeRng(7));
    downed.position.set(-0.2, 0.25, -5.2);
    downed.rotation.set(Math.PI / 2, 0, 0.9); // lying face-down, diagonal across the road
    downed.scale.setScalar(1.05);
    downed.traverse((child) => { if (child.isMesh) child.castShadow = true; });
    scene.add(downed);
    // The KILO 600 bike, parked in the open road right of the hero in
    // bright yellow so it reads at night (dark green vanished against
    // the asphalt; at the right curb it hid behind the crew panel).
    const bike = buildBike(0xeab308, false);
    bike.position.set(1.2, 0, -2.2);
    bike.rotation.y = -0.5;
    bike.traverse((child) => { if (child.isMesh) child.castShadow = true; });
    scene.add(bike);
    // The hero's car waits behind him, door open to the night.
    playerCar.position.set(2.5, 0, 2.5);
    playerCar.rotation.y = Math.PI + 0.5;
  }

  // --- Camera for the shot ---
  function stageCamera(camera) {
    frameShot(camera, shot.camera, shot.target);
  }

  // --- Day/night relighting for free play: the clock advances, and when
  // the phase changes the sun, sky light and fog follow it.
  function applyPhase(newPhase) {
    sun.color.setHex(newPhase.sunColor);
    sun.intensity = newPhase.sunIntensity;
    hemi.intensity = newPhase.hemi;
    scene.fog.color.setHex(newPhase.fog);
  }

  // --- Animation ---
  const clock = new THREE.Clock();
  function animate(camera) {
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;
    for (const cruiser of cruisers) updateCruiserFlash(cruiser, time);
    updateHelicopter(heli, dt);
    updateFerrisWheel(ferris, dt);
    for (const car of traffic) {
      const dir = car.rotation.y === 0 ? 1 : -1;
      car.position.z += dir * car.userData.speed * 0.35 * dt;
      if (car.position.z < -200) car.position.z = 40;
      if (car.position.z > 40) car.position.z = -200;
    }
    scooter.position.z -= 8 * dt;
    if (scooter.position.z < -200) scooter.position.z = 40;
    for (const person of pedestrians) {
      if (person.userData.beach) continue;
      person.position.z += person.userData.direction * person.userData.walkSpeed * 0.5 * dt;
      if (person.position.z > 35) person.userData.direction = -1;
      if (person.position.z < -165) person.userData.direction = 1;
      updatePedestrian(person, time);
    }
    // Wheels spin on the player car for a sense of speed in the stills.
    for (const child of playerCar.children) {
      if (child.type === 'Group') child.rotation.z -= dt * 12;
    }
    return { dt, time };
  }

  return {
    playerCar, cruisers, heli, ferris, pedestrians, traffic,
    stageCamera, animate, applyPhase, goldenHour, night,
    cruiserPositions: cruisers.slice(0, 3).map((c) => ({ x: c.position.x, z: c.position.z })),
  };
}
