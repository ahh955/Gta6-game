// Detailed low-poly vehicles for Solmar City 3D. Bodies are extruded side
// profiles with bevelled edges (a sleek silhouette, not a box), plus a glass
// cabin, real wheels with hubcaps, lights, spoilers and mirrors. Paint uses
// a metalness/roughness standard material so the sun and sky reflect in it.
import * as THREE from 'three';
import { makeGlowTexture, makePlateTexture, makePoliceDecalTexture } from './textures.js';

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
export function buildSportsCar(color = 0xff7a1a, plate = 'SLMR 06') {
  const car = new THREE.Group();
  const paint = paintMaterial(color);

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
  // Round 9: bigger lenses and much stronger glow — in round 8 the bars
  // read as tiny dots; the top entries' cruisers flash visibly.
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 1.3), darkMaterial());
  barBase.position.set(-0.2, 1.46, 0);
  car.add(barBase);
  const redMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0xff2222, emissiveIntensity: 7 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, emissive: 0x2266ff, emissiveIntensity: 7 });
  const redLens = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.6), redMat);
  redLens.position.set(-0.2, 1.57, 0.32);
  car.add(redLens);
  const blueLens = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.6), blueMat);
  blueLens.position.set(-0.2, 1.57, -0.32);
  car.add(blueLens);
  const redGlow = addGlowSprite(car, -0.2, 1.75, 0.32, 0xff2222, 2.6);
  const blueGlow = addGlowSprite(car, -0.2, 1.75, -0.32, 0x2266ff, 2.6);

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
export function buildTrafficCar(color) {
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

// Alternate the cruiser light bars: red and blue swap every half second.
export function updateCruiserFlash(cruiser, time) {
  const flash = cruiser.userData.flash;
  if (!flash) return;
  const on = Math.sin(time * 6 + flash.phase) > 0;
  flash.redMat.emissiveIntensity = on ? 7 : 1.2;
  flash.blueMat.emissiveIntensity = on ? 1.2 : 7;
  flash.redGlow.material.opacity = on ? 0.95 : 0.3;
  flash.blueGlow.material.opacity = on ? 0.3 : 0.95;
}
