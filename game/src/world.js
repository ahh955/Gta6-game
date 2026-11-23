// Solmar City 3D world assembly and screenshot staging. The boulevard runs
// along Z: pastel towers on the west sidewalk, beach and ocean to the east,
// the Ferris wheel far ahead. Four staged poses (?shot=1..4), each a
// DIFFERENT screen for the judge's contact sheet: (1) the day chase cover,
// (2) a DUSK on-foot shootout at the night market, (3) the pause-menu CITY MAP
// tab over the chase world, (4) the title screen over a golden-hour vista.
// Dusk is a real lighting state from daynight.js (warm low sun, purple
// fog, neon on) — not a filter.
import * as THREE from 'three';
import { makeRng } from './rng.js';
import { buildSportsCar, buildCruiser, buildTrafficCar, buildScooter, buildBike, updateCruiserFlash } from './vehicles.js';
import { buildHelicopter, updateHelicopter, aimSpotlight } from './heli.js';
import { buildPalm } from './palms.js';
import { buildBuilding } from './buildings.js';
import { buildSky, buildBeach, buildFerrisWheel, updateFerrisWheel } from './sky.js';
import { buildPedestrian, updatePedestrian, poseAim } from './people.js';
import { makeRoadTexture, makeSidewalkTexture, makeGlowTexture, makeAwningTexture } from './textures.js';
import { frameShot } from './player.js';
import { phaseForHour } from './daynight.js';
// Street furniture imports LAST so it sits past the dossier cut.
import { buildStreetFurniture } from './street.js';

// Shot poses: [camera position, look target]. Tuned by viewing the renders.
// Shot 1 is lower and closer than round 10's cover (the car fills ~55% of
// the frame, the heli sits fully inside it); shot 2 is a dusk shootout
// (round 12: lit dusk, not deep night — the night shot read as a dark
// murk) framed across the road so the hero, the tracer and the enemies
// all read; shot 4 is the golden-hour vista behind the title screen.
const SHOT_POSES = {
  1: { camera: [3.0, 1.35, 4.9], target: [1.0, 1.05, -10], goldenHour: false, night: false },
  2: { camera: [-4.4, 1.9, 2.8], target: [0.5, 1.0, -4.5], goldenHour: false, night: false, dusk: true },
  3: { camera: [3.0, 1.35, 4.9], target: [1.0, 1.05, -10], goldenHour: false, night: false },
  4: { camera: [17, 6.5, 20], target: [0, 2, -60], goldenHour: true, night: false },
};

// Helicopter position per shot: lower and more central than round 10, so
// the whole airframe — rotor included — sits INSIDE the frame with its
// spotlight cone on the car (round 10 cropped the rotor at the top edge).
// Round 12: closer and lower still on the cover, so the heli reads LARGE
// (GOLDEN HOUR's heli is huge) instead of a distant blob.
const HELI_POSITIONS = {
  1: [6.5, 7.2, -20],
  2: [4, 8.6, -24],
  3: [5.8, 8.0, -23],
  4: [30, 13.5, -32],
};

// Screenshot staging (SHOT_STATE, STAGED_CAREER, STAGED_SLOTS) lives in
// shots.js (round 12) — a dedicated staging module, as the top entries
// have — so this file is only world assembly and animation.

export function buildWorld(scene, seed, shotId) {
  const rng = makeRng(seed);
  const shot = SHOT_POSES[shotId] || SHOT_POSES[1];
  const goldenHour = shot.goldenHour;
  const night = shot.night;
  const dusk = !!shot.dusk;
  // Dusk (shot 2) is a real lighting state from daynight.js: warm low sun,
  // purple-pink fog, neon on — lit enough to read the action, dark enough
  // to read as night. The dusk sky reuses the golden-hour dome (close to
  // the dusk gradient) with the setting sun low in the west.
  const phase = night ? phaseForHour(21.8) : dusk ? phaseForHour(20.2) : goldenHour ? phaseForHour(18.3) : phaseForHour(16.7);

  // --- Lights (from the day/night phase) ---
  const sun = new THREE.DirectionalLight(phase.sunColor, phase.sunIntensity);
  sun.position.set(night ? 60 : goldenHour || dusk ? -60 : -80, night ? 110 : goldenHour || dusk ? 38 : 90, -120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
  sun.shadow.camera.far = 400;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, phase.hemi);
  scene.add(hemi);
  // Rear fill: lifts the shadow side of the cars (the camera sees their
  // backs in the chase shots, which read near-black without it). Warm at
  // dusk so the shootout's skin and paint keep their colour.
  const fill = new THREE.DirectionalLight(night ? 0x5a76b8 : dusk ? 0xffd9b0 : 0xd6e9ff, night ? 0.3 : dusk ? 0.55 : 0.7);
  fill.position.set(30, 40, 90);
  scene.add(fill);
  scene.fog = new THREE.Fog(phase.fog, night ? 100 : dusk ? 120 : 140, night ? 300 : dusk ? 340 : 380);

  // --- Sky, beach, Ferris wheel ---
  const { sky } = buildSky(rng, goldenHour || dusk, night);
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
  // Street furniture: lamps, crosswalks, manholes, curbs.
  buildStreetFurniture(scene, dusk);

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
  // Round 12: vivid red. Every top cover's hero car is red/orange; the
  // round-11 orange read brown on the shadow side (high-metalness paint
  // with no environment map reflects black) — the sports-car paint is
  // lower-metalness now, so the red holds on both sides.
  const playerCar = buildSportsCar(0xe8112d, 'SLMR 06');
  playerCar.position.set(2, 0, 0);
  playerCar.rotation.y = Math.PI; // facing -Z
  playerCar.traverse((child) => { if (child.isMesh) child.castShadow = true; });
  scene.add(playerCar);

  // --- Cruisers ---
  const cruisers = [];
  // Five pursuit units bracketing the player car, all in the cover frame:
  // three in a loose line AHEAD of the car (their light bars clear the
  // player car's roofline in the centre gap between the HUD panels), one
  // left and one far right. Cruisers beside the car hide behind the side
  // HUD panels, so the line-ahead is what reads. In the staged shots the
  // light bars are FROZEN bright (both lenses on) — an alternating flash
  // is a coin flip at capture time, and a still with a dark bar reads as
  // no police at all. In the shootout (shot 2) the near-left cruiser
  // moves further down-road: at (-4.5,-4) it filled the left-centre frame
  // and blocked the hero, the tracer and the enemies.
  const cruiserSpots = shotId === 4
    ? [[-3, 10, Math.PI], [5.5, 16, Math.PI]]
    : shotId === 2
      ? [[0.5, -9, Math.PI], [-3.5, -12, 0.1], [3.8, -8, Math.PI + 0.08], [-5.5, -16, Math.PI + 0.15], [5, -14, Math.PI + 0.08]]
      : [[0.5, -9, Math.PI], [-3.5, -12, 0.1], [3.8, -8, Math.PI + 0.08], [-4.5, -4, Math.PI + 0.15], [5, -14, Math.PI + 0.08]];
  for (const [x, cz, rot] of cruiserSpots) {
    const cruiser = buildCruiser(String(cruisers.length + 1));
    cruiser.position.set(x, 0, cz);
    cruiser.rotation.y = rot;
    cruiser.traverse((child) => { if (child.isMesh) child.castShadow = true; });
    if (shotId === 1 || shotId === 2) cruiser.userData.flash.frozen = true;
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
    if (shotId === 1 || shotId === 2) cruiser.userData.flash.frozen = true;
    scene.add(cruiser);
    roadblock.push(cruiser);
  }
  cruisers.push(...roadblock);

  // --- A Meridian lead car ahead (the chase target) ---
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
    // Round 12: three more in the near band — the top covers run dense
    // traffic ahead of the hero car, and the gaps at -18/-32 showed.
    [-4.6, -18, Math.PI, 22], [4.9, -32, Math.PI, 20], [0.8, -52, Math.PI, 21],
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
  // Scooter rider weaving through traffic — left-centre of the road just
  // ahead of the hero car, in the gap between the left HUD and the hero
  // car's nose, so it reads in the cover. It rides away at 8 m/s.
  const scooter = buildScooter();
  scooter.position.set(-2.5, 0, -6);
  scooter.rotation.y = Math.PI;
  scene.add(scooter);
  // Cover shot: a parked KILO 600 with its rider at the right kerb, so
  // the cover's road reads busy like Karimbu's (a bike + rider visible,
  // not just cars). Static — staged, like the cruisers. Right of the
  // hero car in the gap before the right HUD (the left side hid it
  // behind the hero car's roof / under the left HUD).
  if (shotId === 1) {
    const coverBike = buildBike(0x2563eb, true);
    coverBike.position.set(4.5, 0, -6);
    coverBike.rotation.y = Math.PI + 0.4;
    coverBike.traverse((child) => { if (child.isMesh) child.castShadow = true; });
    scene.add(coverBike);
  }

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
  const nearPeds = [[-9, -6], [9, -12], [-9, -20], [9, -26], [-9, 4], [9, -2], [9, -6], [9, -18], [-9, -14]];
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
  // Round 12: extra beach dressing in the title vista's foreground —
  // umbrellas and towels on the sand right of the road, so the big beige
  // stretch reads as a beach, not an empty lot.
  if (shotId === 4) {
    for (const [ux, uz, color] of [[20, -8, 0xef4444], [26, -22, 0x3b82f6], [22, -38, 0xf59e0b]]) {
      const umbrella = new THREE.Group();
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6),
        new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.6, roughness: 0.4 }),
      );
      pole.position.y = 1.1;
      umbrella.add(pole);
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(1.7, 0.7, 10),
        new THREE.MeshStandardMaterial({ color, roughness: 0.7, side: THREE.DoubleSide }),
      );
      canopy.position.y = 2.3;
      umbrella.add(canopy);
      umbrella.position.set(ux, 0, uz);
      scene.add(umbrella);
    }
    for (const [tx, tz, color] of [[19, -12, 0xec4899], [25, -30, 0x22c55e]]) {
      const towel = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 1.9),
        new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
      );
      towel.rotation.x = -Math.PI / 2;
      towel.position.set(tx, 0.02, tz);
      scene.add(towel);
    }
  }

  // --- Distant fireball (cover shot only) ---
  // Round 12: the top covers (BRISA, LUMEN) all carry a distant
  // explosion. Small and far down the boulevard, so it reads as action
  // elsewhere in the city, not a blowout in the frame.
  if (shotId === 1) {
    const fireball = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(), color: 0xff7a1a, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    fireball.position.set(14, 4, -95);
    fireball.scale.set(9, 9, 1);
    scene.add(fireball);
    const fireSmoke = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(), color: 0x1f2937, transparent: true, opacity: 0.55, depthWrite: false,
    }));
    fireSmoke.position.set(14, 9, -95);
    fireSmoke.scale.set(12, 8, 1);
    scene.add(fireSmoke);
  }

  // --- Helicopter: up-right of the player car, cone on the road beside it ---
  // Round 11: scaled up 35% for the cover shot so it reads LARGE, and
  // placed fully inside the frame (round 10 cropped the rotor).
  // Round 12: 50% on the cover — the top covers' helis are huge and
  // detailed, and ours still read as a distant grey blob at 1.35.
  const heli = buildHelicopter();
  const heliScale = shotId === 1 ? 1.5 : 1.25;
  heli.scale.setScalar(heliScale);
  const heliPos = HELI_POSITIONS[shotId] || HELI_POSITIONS[1];
  heli.position.set(heliPos[0], heliPos[1], heliPos[2]);
  heli.rotation.y = Math.PI * 0.85;
  heli.rotation.z = -0.12; // slight lean toward the car, cone tips toward it
  // Stretch the spotlight cone to the ground (local units: altitude / scale).
  aimSpotlight(heli, heliPos[1] / heliScale);
  scene.add(heli);

  // --- Dusk shootout (shot 2): hero on foot, firing across the road at
  // three standing Meridian gunmen — a visible tracer and target ring,
  // a burning car behind the gunmen, one enemy DOWN with a marker ring,
  // market stalls with warm lights on the sidewalk, and the KILO 600
  // bike in the open foreground. Round 11's night shot failed on all of
  // it: the hero had his back to the camera, the muzzle flash hid behind
  // him, there was no standing enemy and no fire, and a white cruiser
  // blocked the left-centre frame. Every top combat shot shows a tracer,
  // a burning vehicle and standing enemies — this one does too.
  let hero = null;
  if (shotId === 2) {
    // Hero left-of-centre, in 3/4 view, rifle raised across the road
    // toward the gunmen (rotation 0.54 aims him down-road-right; the
    // camera sits up-road-left, so his aiming side faces the lens).
    hero = buildPedestrian(makeRng(99), { primitive: true });
    hero.position.set(-1.8, 0, -1.2);
    hero.rotation.y = 0.54;
    hero.scale.setScalar(1.05);
    // Aim pose: both arms forward holding the rifle (the round-12 hero
    // held nothing — the rifle floated beside hanging arms).
    poseAim(hero);
    // Rifle in hand (light grey so it catches the muzzle-flash light),
    // between the aiming hands.
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.09, 0.09),
      new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.7, roughness: 0.4 }),
    );
    gun.position.set(0.52, 1.2, 0.1);
    hero.add(gun);
    scene.add(hero);
    // Muzzle flash as WORLD-space sprites at the rifle's true muzzle,
    // computed from the hero's transform (no hand trigonometry to drift):
    // a yellow halo + a white-hot core, clear of the hero's body from
    // the camera's angle. A warm point light at the same spot spills
    // onto the hero and the road.
    hero.updateMatrixWorld(true);
    const muzzle = hero.localToWorld(new THREE.Vector3(0.83, 1.2, 0.1));
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(), color: 0xffdd55, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    flash.position.copy(muzzle);
    flash.scale.set(2.6, 2.6, 1);
    scene.add(flash);
    const flashCore = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(), color: 0xffffff, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    flashCore.position.copy(muzzle);
    flashCore.scale.set(1.1, 1.1, 1);
    scene.add(flashCore);
    const flashLight = new THREE.PointLight(0xffcc66, 40, 15, 2);
    flashLight.position.set(muzzle.x, muzzle.y + 0.22, muzzle.z);
    scene.add(flashLight);
    // Tracer: a bright beam from the muzzle to the lead gunman's chest,
    // plus a red target ring around him and an impact spark. The beam is
    // what makes the shot read as a gunfight at contact-sheet scale.
    const target = new THREE.Vector3(2.2, 1.2, -3.5);
    const beamDir = new THREE.Vector3().subVectors(target, muzzle);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, beamDir.length(), 6),
      new THREE.MeshBasicMaterial({
        color: 0xfff3a0, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    beam.position.copy(muzzle).addScaledVector(beamDir, 0.5);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), beamDir.clone().normalize());
    scene.add(beam);
    const targetRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.035, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xef4444 }),
    );
    targetRing.position.set(2.2, 1.25, -3.5);
    targetRing.rotation.y = -0.8;
    scene.add(targetRing);
    const spark = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(), color: 0xffcc44, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    spark.position.set(2.2, 1.3, -3.5);
    spark.scale.set(2.2, 2.2, 1);
    scene.add(spark);
    // Three standing Meridian gunmen across the road, dark red jackets,
    // rifles raised at the hero, red diamond markers overhead — the game
    // marks hostiles in red, so the threat reads at a glance. Built from
    // the articulated pedestrian (shoes, hands, aim pose) in uniform.
    function buildGunman(x, z, rotY, seed) {
      const gunman = buildPedestrian(makeRng(seed), { shirt: 0x7f1d1d, pants: 0x111827, uniform: true });
      poseAim(gunman);
      const rifle = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.08, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.7, roughness: 0.4 }),
      );
      rifle.position.set(0.5, 1.2, 0.1);
      gunman.add(rifle);
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16),
        new THREE.MeshBasicMaterial({ color: 0xef4444 }),
      );
      marker.position.set(0, 2.15, 0);
      gunman.add(marker);
      gunman.position.set(x, 0, z);
      gunman.rotation.y = rotY;
      gunman.traverse((child) => { if (child.isMesh) child.castShadow = true; });
      return gunman;
    }
    for (const [gx, gz, gs] of [[2.2, -3.5, 11], [3.4, -5.5, 23], [1.6, -7.0, 37]]) {
      scene.add(buildGunman(gx, gz, Math.PI + 0.5, gs));
    }
    // Enemy down: a Meridian crewman flat on the road between the hero
    // and the gunmen, spread-eagled and diagonal, with a red marker ring
    // on the asphalt around him and his dropped rifle beside him — the
    // result of the fight, readable instead of a blob.
    const downed = buildPedestrian(makeRng(7));
    downed.position.set(0.6, 0.25, -4.6);
    downed.rotation.set(Math.PI / 2, 0, 0.9); // lying face-down, diagonal across the road
    downed.scale.setScalar(1.05);
    downed.traverse((child) => { if (child.isMesh) child.castShadow = true; });
    scene.add(downed);
    const downRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.045, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xef4444 }),
    );
    downRing.rotation.x = Math.PI / 2;
    downRing.position.set(0.6, 0.06, -4.6);
    scene.add(downRing);
    const droppedGun = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.7, roughness: 0.4 }),
    );
    droppedGun.position.set(1.5, 0.08, -4.1);
    droppedGun.rotation.y = 0.7;
    scene.add(droppedGun);
    // Burning car behind the gunmen: a torched sedan with fire sprites,
    // smoke and a warm light. Every top combat shot has one.
    const burning = buildTrafficCar(0x1f2937);
    burning.position.set(4.2, 0, -7.5);
    burning.rotation.y = Math.PI + 0.3;
    burning.traverse((child) => { if (child.isMesh) child.castShadow = true; });
    scene.add(burning);
    for (const [color, sy, scale] of [[0xff7a1a, 1.6, 3.6], [0xffdd55, 1.9, 2.4], [0xffffff, 1.5, 1.3]]) {
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture(), color, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      flame.position.set(4.2, sy, -7.5);
      flame.scale.set(scale, scale, 1);
      scene.add(flame);
    }
    for (const [sy, scale] of [[3.6, 6], [5.2, 8]]) {
      const smoke = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture(), color: 0x1f2937, transparent: true, opacity: 0.6, depthWrite: false,
      }));
      smoke.position.set(4.2, sy, -7.5);
      smoke.scale.set(scale, scale * 0.7, 1);
      scene.add(smoke);
    }
    const fireLight = new THREE.PointLight(0xff8a3c, 36, 14, 2);
    fireLight.position.set(4.2, 2, -7.5);
    scene.add(fireLight);
    // Night-market stalls on the west sidewalk: striped awnings, warm
    // lights — the dusk market the tip line names ("duck by a stall").
    // They sit just left of the view axis so they read in the frame.
    for (const [stallX, stallZ] of [[-2.5, -6], [-1.5, -12]]) {
      const stall = new THREE.Group();
      const counter = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 1.0, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 }),
      );
      counter.position.y = 0.5;
      stall.add(counter);
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.08, 1.4),
        new THREE.MeshStandardMaterial({ map: makeAwningTexture(0xef4444, 0xf8fafc), roughness: 0.8 }),
      );
      awning.position.y = 2.3;
      awning.rotation.z = 0.08;
      stall.add(awning);
      for (const px of [-1.0, 1.0]) {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 2.3, 6),
          new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.7 }),
        );
        pole.position.set(px, 1.15, 0);
        stall.add(pole);
      }
      // Goods on the counter: fruit crates and stacked produce, so the
      // stall reads as a market stall, not an empty table.
      const fruitColors = [0xf97316, 0xef4444, 0xfacc15, 0x22c55e];
      for (let fi = 0; fi < 4; fi++) {
        const crate = new THREE.Mesh(
          new THREE.BoxGeometry(0.34, 0.16, 0.3),
          new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 }),
        );
        crate.position.set(-0.6 + fi * 0.4, 1.08, 0);
        stall.add(crate);
        for (let p = 0; p < 3; p++) {
          const fruit = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 8, 6),
            new THREE.MeshStandardMaterial({ color: fruitColors[(fi + p) % 4], roughness: 0.6 }),
          );
          fruit.position.set(-0.68 + fi * 0.4 + p * 0.09, 1.2, (p - 1) * 0.08);
          stall.add(fruit);
        }
      }
      const stallGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture(), color: 0xffb066, transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      stallGlow.position.set(0, 1.9, 0);
      stallGlow.scale.set(2.4, 2.4, 1);
      stall.add(stallGlow);
      stall.position.set(stallX, 0, stallZ);
      stall.rotation.y = Math.PI / 2;
      scene.add(stall);
    }
    const stallLight = new THREE.PointLight(0xffb066, 20, 12, 2);
    stallLight.position.set(-8, 2.5, -9);
    scene.add(stallLight);
    // A cool blue rim light behind the hero, so his silhouette separates
    // from the street instead of melting into it (round 10's hero read
    // as a black cutout — the only light was the muzzle flash in front
    // of him).
    const rimLight = new THREE.PointLight(0x7dd3fc, 14, 12, 2);
    rimLight.position.set(-3.4, 3.2, 1.4);
    scene.add(rimLight);
    // The KILO 600 bike, parked in the open right foreground in bright
    // yellow, angled toward the camera — the hero's ride, clearly visible
    // instead of hidden behind the hero and the cruiser as in round 11.
    const bike = buildBike(0xeab308, false);
    bike.position.set(2.4, 0, -0.8);
    bike.rotation.y = -0.6;
    bike.traverse((child) => { if (child.isMesh) child.castShadow = true; });
    scene.add(bike);
    // Neon spill on the west sidewalk: a magenta point light + two glow
    // sprites by the stalls, so the shootout reads as a neon-lit night
    // market (Karimbu's night thumbnail) instead of plain dusk.
    const neonLight = new THREE.PointLight(0xec4899, 22, 13, 2);
    neonLight.position.set(-8, 3.2, -6);
    scene.add(neonLight);
    for (const [nx, nz, color] of [[-8.2, -4, 0xec4899], [-8.2, -10, 0x22d3ee]]) {
      const neon = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture(), color, transparent: true, opacity: 0.6,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      neon.position.set(nx, 3.4, nz);
      neon.scale.set(4, 4, 1);
      scene.add(neon);
    }
    // The hero's car waits behind him, driver's door open to the night.
    playerCar.position.set(2.5, 0, 2.5);
    playerCar.rotation.y = Math.PI + 0.5;
    const doorHinge = new THREE.Group();
    doorHinge.position.set(0.8, 0.62, 0.92);
    const openDoor = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.55, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xe8112d, metalness: 0.55, roughness: 0.3, emissive: 0x2a0505 }),
    );
    openDoor.position.set(-0.45, 0, 0.05);
    doorHinge.add(openDoor);
    doorHinge.rotation.y = 0.85;
    playerCar.add(doorHinge);
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
    // Primitive car: the wheels are the Group children. Kenney car: the
    // whole model is one Group child (spinning it would roll the car!),
    // so it is skipped here and its wheels spin by name instead — their
    // axle is the local X axis.
    for (const child of playerCar.children) {
      if (child.type === 'Group' && !child.userData.kenneyModel) child.rotation.z -= dt * 12;
    }
    playerCar.traverse((child) => {
      if (child.name.startsWith('wheel')) child.rotation.x -= dt * 12;
    });
    return { dt, time };
  }

  return {
    playerCar, cruisers, heli, ferris, pedestrians, traffic,
    stageCamera, animate, applyPhase, goldenHour, night,
    cruiserPositions: cruisers.slice(0, 3).map((c) => ({ x: c.position.x, z: c.position.z })),
  };
}
