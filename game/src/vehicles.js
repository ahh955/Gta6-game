// Detailed low-poly vehicles for Solmar City 3D. Bodies are extruded side
// profiles with bevelled edges (a sleek silhouette, not a box), plus a glass
// cabin, real wheels with hubcaps, lights, spoilers and mirrors. Paint uses
// a metalness/roughness standard material so the sun and sky reflect in it.
import * as THREE from 'three';
import { makeGlowTexture, makePlateTexture, makePoliceDecalTexture } from './textures.js';
import { getCarModel } from './assets.js';

const glowTexture = makeGlowTexture();

function paintMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.28 });
}
// Satin paint for the police cruisers: round 8 used the metallic paint for
// the white body, but metalness without an environment map reflects black,
// so the "white" cruisers rendered as dark grey sedans. Low metalness lets
// the diffuse light do the work and the white actually reads white.
function satinMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.45 });
}
function glassMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0x101c2c, metalness: 0.9, roughness: 0.08 });
}
function darkMaterial(color = 0x14181d) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.6 });
}

function extrudeProfile(points, depth, bevel, material) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 3, steps: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  return new THREE.Mesh(geometry, material);
}

function makeWheel(radius, width, sporty) {
  const group = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width, 22),
    darkMaterial(0x0c0d0f),
  );
  tire.rotation.x = Math.PI / 2;
  group.add(tire);
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, width + 0.02, 16),
    new THREE.MeshStandardMaterial({ color: sporty ? 0xd7dde3 : 0x8f979e, metalness: 0.9, roughness: 0.25 }),
  );
  hub.rotation.x = Math.PI / 2;
  group.add(hub);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, width + 0.04, 10),
    darkMaterial(0x22262b),
  );
  cap.rotation.x = Math.PI / 2;
  group.add(cap);
  return group;
}

function addGlowSprite(parent, x, y, z, color, scale) {
  const material = new THREE.SpriteMaterial({
    map: glowTexture, color, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(x, y, z);
  sprite.scale.set(scale, scale, 1);
  parent.add(sprite);
  return sprite;
}

// The hero: a low, wide sports coupe. ~4.4 m long, 1.9 m wide.
// Round 12: the hero paint is lower-metalness than the traffic paint
// with a faint red emissive — the round-11 orange (metalness 0.85, no
// environment map) reflected black on the shadow side and read brown;
// the red has to hold on both sides of the car.
export function buildSportsCar(color = 0xe8112d, plate = 'SLMR 06') {
  // Round 12 polish: the Kenney sedan-sports (orange-red, spoiler, real
  // proportions) is the hero car when the pack loaded; the primitive
  // build below is the fallback. The plate is skipped on the Kenney car
  // (its rear detail is baked in).
  const kenney = getCarModel('carSports');
  if (kenney) return kenney;
  const car = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({
    color, metalness: 0.55, roughness: 0.3, emissive: 0x2a0505,
  });

  // Sleek lower body: low nose, rising beltline, short tail.
  const body = extrudeProfile([
    [-2.2, 0.28], [-2.2, 0.72], [-1.55, 0.82], [-0.9, 0.87],
    [0.6, 0.88], [1.6, 0.78], [2.08, 0.62], [2.2, 0.38], [2.2, 0.28],
  ], 1.7, 0.09, paint);
  car.add(body);

  // Glass cabin: raked windshield, low roof, fastback rear.
  const cabin = extrudeProfile([
    [-1.05, 0.86], [-0.55, 1.28], [0.25, 1.32], [0.78, 0.88],
  ], 1.42, 0.06, glassMaterial());
  car.add(cabin);
  // Roof panel in body colour over the glass.
  const roof = extrudeProfile([
    [-0.5, 1.26], [0.2, 1.3], [0.35, 1.24], [-0.45, 1.2],
  ], 1.3, 0.04, paint);
  car.add(roof);
  // Window pillars: thin body-colour strips over the glass cabin, so the
  // windshield, side glass and rear glass read as separate windows.
  for (const [px, tilt] of [[-0.55, 0.5], [-0.05, 0], [0.45, -0.5]]) {
    for (const z of [0.72, -0.72]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.04), paint);
      pillar.position.set(px, 1.08, z);
      pillar.rotation.z = tilt;
      car.add(pillar);
    }
  }

  // Wheels.
  const wheelPositions = [[1.45, 0.82], [1.45, -0.82], [-1.45, 0.82], [-1.45, -0.82]];
  for (const [x, z] of wheelPositions) {
    const wheel = makeWheel(0.34, 0.26, true);
    wheel.position.set(x, 0.34, z);
    car.add(wheel);
  }

  // Headlights (emissive + glow) and taillight bar.
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6c9, emissive: 0xfff2a8, emissiveIntensity: 2.2 });
  for (const z of [0.55, -0.55]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.34), headMat);
    head.position.set(2.18, 0.58, z);
    car.add(head);
    addGlowSprite(car, 2.3, 0.58, z, 0xfff2a8, 0.55);
  }
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0xef4444, emissiveIntensity: 1.6 });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 1.5), tailMat);
  tail.position.set(-2.21, 0.62, 0);
  car.add(tail);

  // Rear spoiler on twin struts.
  const spoilerMat = darkMaterial(0x1a1d21);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 1.6), spoilerMat);
  wing.position.set(-2.0, 1.02, 0); wing.rotation.z = -0.08;
  car.add(wing);
  for (const z of [0.6, -0.6]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.08), spoilerMat);
    strut.position.set(-2.0, 0.9, z);
    car.add(strut);
  }

  // Side mirrors, grille, side skirts, exhausts.
  for (const z of [0.98, -0.98]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.16), paint);
    mirror.position.set(0.72, 0.98, z);
    car.add(mirror);
  }
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 1.1), darkMaterial());
  grille.position.set(2.2, 0.38, 0);
  car.add(grille);
  for (const z of [0.88, -0.88]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.06), spoilerMat);
    skirt.position.set(0, 0.3, z);
    car.add(skirt);
  }
  // Side air intakes behind the doors.
  for (const z of [0.88, -0.88]) {
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.06), spoilerMat);
    intake.position.set(-0.95, 0.62, z);
    car.add(intake);
  }
  for (const z of [0.35, -0.35]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 10), darkMaterial(0x555b62));
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(-2.22, 0.32, z);
    car.add(pipe);
  }

  // License plate.
  const plateMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.21),
    new THREE.MeshStandardMaterial({ map: makePlateTexture(plate), roughness: 0.5 }),
  );
  plateMesh.position.set(-2.24, 0.48, 0);
  plateMesh.rotation.y = Math.PI;
  car.add(plateMesh);

  car.userData.wheels = car.children.filter((c) => c.type === 'Group');
  return car;
}

// Police interceptor: white sedan, black doors, roof light bar, push bar.
export function buildCruiser(unit = '7') {
  // Round 12 polish: the Kenney police car (white/black, baked light bar)
  // is the cruiser when the pack loaded — with OUR flashing lenses and
  // halos on its roof, so the bar still strobes red/blue (the baked bar
  // is static). The primitive build below is the fallback.
  const kenney = getCarModel('carPolice');
  if (kenney) {
    const redMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0xff1111, emissiveIntensity: 2.5 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, emissive: 0x1144ff, emissiveIntensity: 2.5 });
    const redLens = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 0.4), redMat);
    redLens.position.set(-0.54, 1.66, 0);
    kenney.add(redLens);
    const blueLens = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 0.4), blueMat);
    blueLens.position.set(0.14, 1.66, 0);
    kenney.add(blueLens);
    const redGlow = addGlowSprite(kenney, -0.54, 2.2, 0, 0xff1111, 3.6);
    const blueGlow = addGlowSprite(kenney, 0.14, 2.2, 0, 0x1144ff, 3.6);
    kenney.userData.flash = { redMat, blueMat, redGlow, blueGlow, phase: Math.random() * Math.PI * 2 };
    return kenney;
  }
  const car = new THREE.Group();
  const white = satinMaterial(0xf1f5f9);
  const black = satinMaterial(0x0f172a);

  const body = extrudeProfile([
    [-2.3, 0.3], [-2.3, 0.78], [-1.7, 0.86], [-0.9, 0.9],
    [0.7, 0.9], [1.7, 0.8], [2.2, 0.62], [2.3, 0.4], [2.3, 0.3],
  ], 1.78, 0.07, white);
  car.add(body);
  const cabin = extrudeProfile([
    [-1.2, 0.88], [-0.75, 1.34], [0.35, 1.36], [0.95, 0.9],
  ], 1.5, 0.05, glassMaterial());
  car.add(cabin);
  // Black roof + black door panels (two-tone).
  const roofPanel = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.05, 1.45), black);
  roofPanel.position.set(-0.2, 1.37, 0);
  car.add(roofPanel);
  // Window pillars over the glass cabin.
  for (const px of [-0.75, -0.2, 0.35]) {
    for (const z of [0.76, -0.76]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.44, 0.04), white);
      pillar.position.set(px, 1.12, z);
      car.add(pillar);
    }
  }
  for (const z of [0.9, -0.9]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 0.03), black);
    door.position.set(-0.1, 0.62, z);
    car.add(door);
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.43),
      new THREE.MeshStandardMaterial({ map: makePoliceDecalTexture(unit), transparent: true, roughness: 0.5 }),
    );
    decal.position.set(-0.1, 0.62, z + (z > 0 ? 0.02 : -0.02));
    if (z < 0) decal.rotation.y = Math.PI;
    car.add(decal);
  }

  const wheelPositions = [[1.5, 0.84], [1.5, -0.84], [-1.5, 0.84], [-1.5, -0.84]];
  for (const [x, z] of wheelPositions) {
    const wheel = makeWheel(0.35, 0.24, false);
    wheel.position.set(x, 0.35, z);
    car.add(wheel);
  }

  // Roof light bar: red left, blue right, flashing via update.
  // Round 11: the lenses are big solid emissive blocks, not just glow
  // sprites — additive halos wash out against a bright sky, but a solid
  // red/blue block on the roof reads in daylight at any distance. AND
  // the bar runs along the car's LENGTH (local X), not its width: the
  // car models face ±X in world space, so a bar across the width
  // foreshortens to a blob from the chase camera — along the length it
  // reads as a wide red/blue strip across the roof.
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.4), darkMaterial());
  barBase.position.set(-0.2, 1.5, 0);
  car.add(barBase);
  const redMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0xff1111, emissiveIntensity: 2.5 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, emissive: 0x1144ff, emissiveIntensity: 2.5 });
  const redLens = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 0.4), redMat);
  redLens.position.set(-0.54, 1.66, 0);
  car.add(redLens);
  const blueLens = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 0.4), blueMat);
  blueLens.position.set(0.14, 1.66, 0);
  car.add(blueLens);
  // Round 11: the halos sit 0.45 m above the bar and wider still, so the
  // flash clears the player car's roofline for the cruisers ahead — a
  // halo is a soft radial glow, so the float is invisible. They sit over
  // their lens (the bar runs along local X — see above).
  const redGlow = addGlowSprite(car, -0.54, 2.2, 0, 0xff1111, 3.6);
  const blueGlow = addGlowSprite(car, 0.14, 2.2, 0, 0x1144ff, 3.6);

  // Push bar + headlights + taillights.
  const pushMat = darkMaterial(0x22262b);
  for (const z of [0.5, -0.5]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), pushMat);
    post.position.set(2.34, 0.55, z);
    car.add(post);
  }
  const pushCross = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 1.1), pushMat);
  pushCross.position.set(2.34, 0.72, 0);
  car.add(pushCross);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6c9, emissive: 0xfff2a8, emissiveIntensity: 2 });
  for (const z of [0.6, -0.6]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.36), headMat);
    head.position.set(2.3, 0.6, z);
    car.add(head);
    addGlowSprite(car, 2.42, 0.6, z, 0xfff2a8, 0.5);
  }
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0xef4444, emissiveIntensity: 1.4 });
  for (const z of [0.6, -0.6]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.4), tailMat);
    tail.position.set(-2.31, 0.62, z);
    car.add(tail);
  }

  car.userData.flash = { redMat, blueMat, redGlow, blueGlow, phase: Math.random() * Math.PI * 2 };
  return car;
}

// Simpler traffic sedan in a random colour.
// Round 12 polish: traffic cars are Kenney models when the pack loaded —
// the colour deterministically picks the model (yellow is always the taxi),
// so the seeded layout stays identical run to run. The primitive build
// below is the fallback.
const TRAFFIC_MODELS = {
  0xfacc15: 'carTaxi', 0x2563eb: 'carSedan', 0xdc2626: 'carHatch',
  0xe5e7eb: 'carVan', 0x059669: 'carSuv', 0x9333ea: 'carTruck',
  0x0ea5e9: 'carDelivery',
};
const TRAFFIC_FALLBACK = ['carSedan', 'carSuv', 'carHatch', 'carVan', 'carTruck', 'carDelivery'];
export function buildTrafficCar(color) {
  const model = TRAFFIC_MODELS[color]
    || TRAFFIC_FALLBACK[(color >> 4) % TRAFFIC_FALLBACK.length];
  const kenney = getCarModel(model);
  if (kenney) return kenney;
  const car = new THREE.Group();
  const paint = paintMaterial(color);
  const body = extrudeProfile([
    [-2.1, 0.3], [-2.1, 0.76], [-1.5, 0.84], [-0.8, 0.88],
    [0.7, 0.88], [1.6, 0.78], [2.05, 0.6], [2.1, 0.38], [2.1, 0.3],
  ], 1.72, 0.06, paint);
  car.add(body);
  const cabin = extrudeProfile([
    [-1.05, 0.86], [-0.6, 1.26], [0.3, 1.28], [0.85, 0.88],
  ], 1.44, 0.05, glassMaterial());
  car.add(cabin);
  const wheelPositions = [[1.4, 0.82], [1.4, -0.82], [-1.4, 0.82], [-1.4, -0.82]];
  for (const [x, z] of wheelPositions) {
    const wheel = makeWheel(0.33, 0.22, false);
    wheel.position.set(x, 0.33, z);
    car.add(wheel);
  }
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6c9, emissive: 0xfff2a8, emissiveIntensity: 1.2 });
  for (const z of [0.55, -0.55]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.3), headMat);
    head.position.set(2.12, 0.56, z);
    car.add(head);
  }
  // Taillights + side mirrors + window pillars: the traffic cars were the
  // plainest vehicles in the frame (no rear lights at all).
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0xef4444, emissiveIntensity: 1.2 });
  for (const z of [0.55, -0.55]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.3), tailMat);
    tail.position.set(-2.11, 0.58, z);
    car.add(tail);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.14), paint);
    mirror.position.set(0.75, 0.95, z > 0 ? 0.92 : -0.92);
    car.add(mirror);
  }
  for (const px of [-0.6, -0.1, 0.4]) {
    for (const z of [0.73, -0.73]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.4, 0.04), paint);
      pillar.position.set(px, 1.06, z);
      car.add(pillar);
    }
  }
  return car;
}

// Small delivery scooter with a rider.
export function buildScooter(riderColor = 0xf97316) {
  const group = new THREE.Group();
  const bodyMat = paintMaterial(0xef4444);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.4), bodyMat);
  deck.position.set(0, 0.42, 0);
  group.add(deck);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.36), darkMaterial());
  seat.position.set(-0.3, 0.6, 0);
  group.add(seat);
  const column = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), bodyMat);
  column.position.set(0.5, 0.75, 0); column.rotation.z = -0.25;
  group.add(column);
  const bars = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), darkMaterial(0x555b62));
  bars.rotation.x = Math.PI / 2; bars.position.set(0.58, 1.05, 0);
  group.add(bars);
  const scootHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.1, 0.18),
    new THREE.MeshStandardMaterial({ color: 0xfff6c9, emissive: 0xfff2a8, emissiveIntensity: 1.6 }),
  );
  scootHead.position.set(0.62, 0.78, 0);
  group.add(scootHead);
  addGlowSprite(group, 0.7, 0.78, 0, 0xfff2a8, 0.5);
  for (const x of [0.55, -0.5]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 16), darkMaterial());
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 0.24, 0);
    group.add(wheel);
  }
  // Rider: capsule body + head + helmet.
  const riderMat = new THREE.MeshStandardMaterial({ color: riderColor, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.45, 4, 10), riderMat);
  body.position.set(-0.25, 1.0, 0); body.rotation.z = 0.12;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xf2c89b, roughness: 0.6 }));
  head.position.set(-0.2, 1.42, 0);
  group.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
  helmet.position.set(-0.2, 1.44, 0);
  group.add(helmet);
  return group;
}

// Vehicle catalogue: every drivable type in the city, with top speed and
// where it spawns. The KILO 600 bike is the fastest way through traffic
// and the night shot's ride.
export const VEHICLES = [
  { id: 'vortex-gt', name: 'VORTEX GT', type: 'SPORTS CAR', topSpeedKmh: 212, spawn: 'Strand Boulevard' },
  { id: 'kilo-600', name: 'KILO 600', type: 'MOTORBIKE', topSpeedKmh: 228, spawn: 'Coral Docks' },
  { id: 'cruiser', name: 'SOLMAR PD CRUISER', type: 'POLICE', topSpeedKmh: 196, spawn: 'Downtown' },
  { id: 'sedan', name: 'CITY SEDAN', type: 'TRAFFIC', topSpeedKmh: 150, spawn: 'Everywhere' },
  { id: 'scooter', name: 'DELIVERY SCOOTER', type: 'SCOOTER', topSpeedKmh: 80, spawn: 'Strand Boulevard' },
];

// The Kilo 600 motorbike: a low sport bike with a rider in leathers.
export function buildBike(color = 0x16a34a, withRider = true) {
  const bike = new THREE.Group();
  const paint = paintMaterial(color);
  // Wheels.
  for (const x of [0.62, -0.62]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.12, 18), darkMaterial());
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 0.32, 0);
    bike.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 10),
      new THREE.MeshStandardMaterial({ color: 0xd7dde3, metalness: 0.9, roughness: 0.25 }));
    hub.rotation.x = Math.PI / 2;
    hub.position.set(x, 0.32, 0);
    bike.add(hub);
  }
  // Frame + tank + seat + tail.
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.12), darkMaterial());
  frame.position.set(0, 0.55, 0);
  bike.add(frame);
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.3), paint);
  tank.position.set(0.18, 0.72, 0);
  bike.add(tank);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.09, 0.26), darkMaterial());
  seat.position.set(-0.32, 0.7, 0);
  bike.add(seat);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.24), paint);
  tail.position.set(-0.62, 0.74, 0);
  bike.add(tail);
  // Front fork + handlebars + headlight.
  const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 8), darkMaterial(0x555b62));
  fork.position.set(0.58, 0.55, 0);
  fork.rotation.z = -0.35;
  bike.add(fork);
  const bars = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), darkMaterial(0x555b62));
  bars.rotation.x = Math.PI / 2;
  bars.position.set(0.5, 0.88, 0);
  bike.add(bars);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6c9, emissive: 0xfff2a8, emissiveIntensity: 2.4 });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.22), headMat);
  head.position.set(0.68, 0.62, 0);
  bike.add(head);
  addGlowSprite(bike, 0.78, 0.62, 0, 0xfff2a8, 0.7);
  // Exhaust pipe, raked windscreen and fenders — the shapes that make it
  // read as a sport bike, not a frame on two wheels.
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.8, 10), darkMaterial(0x8a8f98));
  exhaust.rotation.z = Math.PI / 2;
  exhaust.position.set(-0.15, 0.32, 0.16);
  bike.add(exhaust);
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.28, 0.34),
    new THREE.MeshStandardMaterial({ color: 0x101c2c, metalness: 0.9, roughness: 0.08 }),
  );
  screen.position.set(0.52, 0.98, 0);
  screen.rotation.z = 0.5;
  bike.add(screen);
  for (const x of [0.62, -0.62]) {
    const fender = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.16), paint);
    fender.position.set(x, 0.62, 0);
    bike.add(fender);
  }
  if (withRider) {
    const leathers = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.4, 4, 10), leathers);
    torso.position.set(-0.28, 1.08, 0);
    torso.rotation.z = 0.35;
    bike.add(torso);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10),
      new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.3 }));
    helmet.position.set(-0.12, 1.42, 0);
    bike.add(helmet);
    for (const s of [1, -1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.42, 3, 8), leathers);
      leg.position.set(-0.18, 0.62, s * 0.16);
      leg.rotation.x = s * 0.3;
      bike.add(leg);
    }
  }
  return bike;
}

// Alternate the cruiser light bars: red and blue swap every half second.
// A cruiser with flash.frozen set (the staged chase/night shots) keeps
// BOTH lenses at full brightness instead: a still taken mid-alternation
// can catch one lens dark, and a dark bar reads as no police at all.
export function updateCruiserFlash(cruiser, time) {
  const flash = cruiser.userData.flash;
  if (!flash) return;
  if (flash.frozen) {
    flash.redMat.emissiveIntensity = 2.5;
    flash.blueMat.emissiveIntensity = 2.5;
    flash.redGlow.material.opacity = 0.95;
    flash.blueGlow.material.opacity = 0.95;
    return;
  }
  const on = Math.sin(time * 6 + flash.phase) > 0;
  flash.redMat.emissiveIntensity = on ? 2.5 : 0.5;
  flash.blueMat.emissiveIntensity = on ? 0.5 : 2.5;
  flash.redGlow.material.opacity = on ? 0.95 : 0.3;
  flash.blueGlow.material.opacity = on ? 0.3 : 0.95;
}
