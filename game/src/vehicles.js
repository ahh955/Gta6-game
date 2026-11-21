// Solmar City 3D — vehicles: player and traffic cars, Solmar PD cruisers
// with flashing light bars, and the police helicopter with its spotlight.

import * as THREE from "three";

const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
const glassMat = new THREE.MeshLambertMaterial({ color: 0x9fd8e8 });
const chromeMat = new THREE.MeshLambertMaterial({ color: 0xd7dee8 });

// A low-poly car: body, cabin, wheels, headlights. `opts` picks the paint,
// the spoiler and whether it is a police cruiser.
export function makeCar(color, opts = {}) {
  const car = new THREE.Group();
  car.name = opts.name || "Car";
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.85, 2.1), bodyMat);
  body.position.y = 0.62;
  car.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 1.9), bodyMat);
  nose.position.set(2.3, 0.55, 0);
  car.add(nose);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 1.85), glassMat);
  cabin.position.set(-0.25, 1.35, 0);
  car.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 1.7), bodyMat);
  roof.position.set(-0.25, 1.76, 0);
  car.add(roof);
  if (opts.spoiler) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 2.0), new THREE.MeshLambertMaterial({ color: 0x111827 }));
    wing.position.set(-2.2, 1.35, 0);
    car.add(wing);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.12), chromeMat);
    strut.position.set(-2.2, 1.1, 0.7);
    car.add(strut);
    const strut2 = strut.clone();
    strut2.position.z = -0.7;
    car.add(strut2);
  }
  // Headlights and taillights.
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c9 });
  for (const z of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 0.45), headMat);
    h.position.set(2.66, 0.62, z);
    car.add(h);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const z of [-0.7, 0.7]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.4), tailMat);
    t.position.set(-2.22, 0.66, z);
    car.add(t);
  }
  // Wheels.
  for (const [x, z] of [[1.45, 0.95], [1.45, -0.95], [-1.45, 0.95], [-1.45, -0.95]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.38, z);
    car.add(w);
  }
  car.userData.wheels = car.children.filter((c) => c.geometry === wheelGeo);
  return car;
}

// A Solmar PD cruiser: white body, black doors, light bar, push bar.
export function makeCruiser() {
  const car = makeCar(0xf8fafc, { name: "Solmar PD Cruiser" });
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
  for (const z of [-1.02, 1.02]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.08), doorMat);
    door.position.set(-0.1, 0.62, z);
    car.add(door);
  }
  // Light bar: red left, blue right, flashing by emissive intensity.
  const redMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0xff0000, emissiveIntensity: 2 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, emissive: 0x2244ff, emissiveIntensity: 2 });
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 1.9), new THREE.MeshLambertMaterial({ color: 0x111827 }));
  barBase.position.set(-0.25, 1.9, 0);
  car.add(barBase);
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.85), redMat);
  red.position.set(-0.25, 2.08, 0.48);
  car.add(red);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.85), blueMat);
  blue.position.set(-0.25, 2.08, -0.48);
  car.add(blue);
  // Push bar on the nose.
  const push = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 1.6), new THREE.MeshLambertMaterial({ color: 0x1f2937 }));
  push.position.set(2.75, 0.55, 0);
  car.add(push);
  car.userData.lightRed = redMat;
  car.userData.lightBlue = blueMat;
  return car;
}

// Flash a cruiser's light bar: red and blue alternate twice a second.
export function flashLights(car, time) {
  const on = Math.sin(time * 12) > 0;
  if (car.userData.lightRed) car.userData.lightRed.emissiveIntensity = on ? 3.2 : 0.25;
  if (car.userData.lightBlue) car.userData.lightBlue.emissiveIntensity = on ? 0.25 : 3.2;
}

// The Solmar PD helicopter: detailed body, skids, tail, spinning rotors,
// and a narrow white spotlight cone aimed at a target on the ground.
export function makeHelicopter() {
  const heli = new THREE.Group();
  heli.name = "KITE-1 Helicopter";
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1e3a5f });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.7, 2.0), bodyMat);
  body.position.y = 0;
  heli.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.7), bodyMat);
  nose.position.set(2.6, -0.15, 0);
  heli.add(nose);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 1.8), glassMat);
  glass.position.set(2.2, 0.45, 0);
  heli.add(glass);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.35, 2.05), new THREE.MeshLambertMaterial({ color: 0xfacc15 }));
  stripe.position.y = 0.1;
  heli.add(stripe);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.5, 0.5), bodyMat);
  tail.position.set(-4.2, 0.35, 0);
  heli.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.2), new THREE.MeshLambertMaterial({ color: 0xfacc15 }));
  fin.position.set(-6.2, 1.0, 0);
  heli.add(fin);
  // Skids.
  for (const z of [-0.9, 0.9]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 0.12), chromeMat);
    skid.position.set(0.3, -1.25, z);
    heli.add(skid);
    for (const x of [-0.9, 1.4]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), chromeMat);
      strut.position.set(x, -1.0, z);
      heli.add(strut);
    }
  }
  // Main rotor: mast + two long blades.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 8), chromeMat);
  mast.position.y = 1.2;
  heli.add(mast);
  const rotor = new THREE.Group();
  rotor.position.y = 1.65;
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.08, 0.45), bladeMat);
    blade.rotation.y = a;
    rotor.add(blade);
  }
  heli.add(rotor);
  // Tail rotor.
  const tailRotor = new THREE.Group();
  tailRotor.position.set(-6.4, 0.5, 0.35);
  for (const a of [0, Math.PI / 2]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.9, 0.18), bladeMat);
    b.rotation.x = a;
    tailRotor.add(b);
  }
  heli.add(tailRotor);
  // Searchlight housing under the nose.
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  lamp.position.set(2.4, -0.95, 0);
  heli.add(lamp);
  // The spotlight cone: narrow, angled from the heli down to its target.
  // It is NOT a child of the heli: aimSpotlight places it in world space,
  // so the beam stays a narrow angled beam whatever the heli's heading.
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1, 24, 1, true), coneMat);
  cone.visible = false;
  // Bright pool where the beam lands.
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(1.6, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.visible = false;
  heli.userData.rotor = rotor;
  heli.userData.tailRotor = tailRotor;
  heli.userData.cone = cone;
  heli.userData.pool = pool;
  return heli;
}

// Aim the heli's spotlight cone from its belly to a ground target. The cone
// is kept narrow on purpose: a beam, not a wash. The cone and pool are
// added to the scene on first use and aimed in world space.
export function aimSpotlight(scene, heli, target) {
  const cone = heli.userData.cone;
  const pool = heli.userData.pool;
  if (!cone.parent) scene.add(cone);
  if (!pool.parent) scene.add(pool);
  const origin = new THREE.Vector3();
  origin.setFromMatrixPosition(heli.matrixWorld);
  origin.y -= 0.9;
  const dir = new THREE.Vector3().subVectors(target, origin);
  const len = dir.length();
  cone.visible = true;
  pool.visible = true;
  // ConeGeometry is centred on its middle and points +Y; scale it to the
  // beam length, flip it to point down the beam, and put its middle halfway.
  cone.scale.set(1, len, 1);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize().negate());
  cone.position.copy(origin).addScaledVector(dir, 0.5);
  pool.position.set(target.x, 0.12, target.z);
}

export function spinRotors(heli, dt) {
  heli.userData.rotor.rotation.y += dt * 22;
  heli.userData.tailRotor.rotation.x += dt * 30;
}

const TRAFFIC_COLORS = [0xc2410c, 0x0e7490, 0x65a30d, 0x9333ea, 0xdc2626, 0x475569, 0xeab308, 0x0891b2];

// Traffic: cars that cruise the boulevard and the cross streets, wrapping
// around at the ends of their road.
export function spawnTraffic(scene, count = 12) {
  const cars = [];
  const routes = [
    { z: -2.6, dir: 1, min: -95, max: 85 }, // boulevard eastbound lane
    { z: 2.6, dir: -1, min: -95, max: 85 }, // boulevard westbound lane
    { x: -22.4, dir: 1, min: -95, max: 85, vertical: true },
    { x: 22.4, dir: -1, min: -95, max: 85, vertical: true },
    { z: -42.4, dir: 1, min: -95, max: 85 },
  ];
  for (let i = 0; i < count; i++) {
    const route = routes[i % routes.length];
    const car = makeCar(TRAFFIC_COLORS[i % TRAFFIC_COLORS.length]);
    const t = route.min + ((i * 37 + 11) % (route.max - route.min));
    if (route.vertical) {
      car.position.set(route.x, 0, t);
      car.rotation.y = route.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    } else {
      car.position.set(t, 0, route.z);
      car.rotation.y = route.dir > 0 ? 0 : Math.PI;
    }
    car.userData.route = route;
    car.userData.speed = 7 + (i % 4) * 1.5;
    scene.add(car);
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, dt) {
  for (const car of cars) {
    const r = car.userData.route;
    const step = r.dir * car.userData.speed * dt;
    if (r.vertical) {
      car.position.z += step;
      if (car.position.z > r.max) car.position.z = r.min;
      if (car.position.z < r.min) car.position.z = r.max;
    } else {
      car.position.x += step;
      if (car.position.x > r.max) car.position.x = r.min;
      if (car.position.x < r.min) car.position.x = r.max;
    }
    for (const w of car.userData.wheels) w.rotation.z += (car.userData.speed * dt) / 0.38;
  }
}

// Pedestrians: simple figures that walk the sidewalks; some flee.
export function makePed(shirtColor, pantsColor) {
  const ped = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xc68e5e });
  const shirt = new THREE.MeshLambertMaterial({ color: shirtColor });
  const pants = new THREE.MeshLambertMaterial({ color: pantsColor });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skin);
  head.position.y = 1.62;
  ped.add(head);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.3), shirt);
  torso.position.y = 1.1;
  ped.add(torso);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.22), pants);
  legL.position.set(0, 0.38, 0.15);
  ped.add(legL);
  const legR = legL.clone();
  legR.position.z = -0.15;
  ped.add(legR);
  ped.userData.legL = legL;
  ped.userData.legR = legR;
  return ped;
}

export function spawnPeds(scene, count = 18) {
  const shirts = [0xef4444, 0x3b82f6, 0x22c55e, 0xf59e0b, 0xec4899, 0x8b5cf6, 0xf8fafc];
  const peds = [];
  for (let i = 0; i < count; i++) {
    const ped = makePed(shirts[i % shirts.length], 0x1e293b);
    const side = i % 2 ? -8.2 : 8.2;
    ped.position.set(-90 + i * 10 + (i % 3) * 3, 0, side);
    ped.rotation.y = (i % 4 < 2 ? 0 : Math.PI) + (side < 0 ? 0 : Math.PI);
    ped.userData.walkSpeed = 1 + (i % 3) * 0.5;
    ped.userData.side = side;
    ped.userData.fleeing = false;
    scene.add(ped);
    peds.push(ped);
  }
  return peds;
}

export function updatePeds(peds, dt, time, threatPos) {
  for (const ped of peds) {
    const speed = ped.userData.fleeing ? 5.5 : ped.userData.walkSpeed;
    const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(ped.quaternion);
    ped.position.addScaledVector(forward, speed * dt);
    if (ped.position.x > 95) ped.position.x = -95;
    if (ped.position.x < -95) ped.position.x = 95;
    const swing = Math.sin(time * (ped.userData.fleeing ? 14 : 6) + ped.position.z) * 0.5;
    ped.userData.legL.rotation.x = swing;
    ped.userData.legR.rotation.x = -swing;
    if (threatPos) {
      const d = ped.position.distanceTo(threatPos);
      ped.userData.fleeing = d < 18;
      if (ped.userData.fleeing) {
        const away = new THREE.Vector3().subVectors(ped.position, threatPos);
        away.y = 0;
        ped.rotation.y = Math.atan2(-away.z, away.x);
      }
    }
  }
}
