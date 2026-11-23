// Police helicopter for Solmar City 3D: a recognisable two-tone airframe
// (rounded fuselage, glass cockpit, tail boom, skids, spinning main and tail
// rotors) plus a narrow white spotlight cone that tracks the player car.
// Round 12: the round-11 heli read as a featureless grey blob at cover
// distance — brighter teal, a yellow stripe, a translucent rotor disc
// (the thin blades alone vanish at 1280px) and a layered cone with a
// bright core, so the airframe reads as a helicopter, not a balloon.
import * as THREE from 'three';
import { makeGlowTexture } from './textures.js';

const glowTexture = makeGlowTexture();

export function buildHelicopter() {
  const heli = new THREE.Group();
  const teal = new THREE.MeshStandardMaterial({ color: 0x14b8a6, metalness: 0.6, roughness: 0.35 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.4, roughness: 0.35 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.4, roughness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0a1626, metalness: 0.95, roughness: 0.06 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.5, roughness: 0.5 });

  // Rounded fuselage: white so it reads against the sky even on the
  // shadow side, with a teal top shell and boom stripe.
  const fuselage = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 18), white);
  fuselage.scale.set(1.5, 1.05, 1.05);
  heli.add(fuselage);
  // Teal upper shell.
  const topShell = new THREE.Mesh(new THREE.SphereGeometry(1.52, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), teal);
  topShell.scale.set(1.5, 1.05, 1.05);
  topShell.position.y = 0.06;
  heli.add(topShell);
  // Glass cockpit bubble at the nose.
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(1.05, 20, 14, -Math.PI * 0.4, Math.PI * 0.8, Math.PI * 0.18, Math.PI * 0.5), glass);
  cockpit.scale.set(1.35, 1, 1);
  cockpit.position.set(1.15, 0.25, 0);
  cockpit.rotation.z = -0.15;
  heli.add(cockpit);

  // Tail boom: tapered cylinder + vertical fin + tail rotor.
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 3.4, 10), teal);
  boom.rotation.z = Math.PI / 2;
  boom.position.set(-3.4, 0.35, 0);
  heli.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.08), white);
  fin.position.set(-4.9, 0.75, 0);
  fin.rotation.z = 0.25;
  heli.add(fin);
  // Horizontal stabilizer on the boom + a white stripe along the boom top.
  const stabilizer = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 1.9), white);
  stabilizer.position.set(-4.15, 0.62, 0);
  heli.add(stabilizer);
  const boomStripe = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.1), white);
  boomStripe.position.set(-4.1, 0.62, 0);
  boomStripe.rotation.z = 0.06; // follows the boom's taper toward the tail
  heli.add(boomStripe);
  const tailRotor = new THREE.Group();
  const tailBladeMat = dark;
  for (const angle of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.5, 0.1), tailBladeMat);
    blade.rotation.x = angle;
    tailRotor.add(blade);
  }
  tailRotor.position.set(-4.95, 0.5, 0.22);
  heli.add(tailRotor);

  // Yellow cheatline stripe around the fuselage — the bright band that
  // makes the two-tone paint read at distance.
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.09, 8, 32), yellow);
  stripe.scale.set(1.5, 1.05, 1.05);
  stripe.rotation.y = Math.PI / 2;
  stripe.position.y = -0.15;
  heli.add(stripe);

  // Side doors: outlined panels + handles, so the fuselage reads as a
  // cabin with doors, not a plain balloon. The panel sits just proud of
  // the curved shell (surface z ~1.53-1.56 across the door's span).
  for (const z of [1.58, -1.58]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.05), dark);
    door.position.set(0.1, 0.05, z);
    heli.add(door);
    const doorInner = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.68, 0.06), white);
    doorInner.position.set(0.1, 0.05, z);
    heli.add(doorInner);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.06), dark);
    handle.position.set(0.35, 0.1, z + (z > 0 ? 0.05 : -0.05));
    heli.add(handle);
  }
  // Engine deck on top + twin exhausts angled back.
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.35, 0.95), dark);
  deck.position.set(-0.35, 1.62, 0);
  heli.add(deck);
  for (const z of [0.42, -0.42]) {
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.55, 10), dark);
    exhaust.position.set(-1.15, 1.6, z);
    exhaust.rotation.z = Math.PI / 2 - 0.3;
    heli.add(exhaust);
  }
  // Belly sensor turret (FLIR ball) under the nose + its glass lens.
  const turret = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), dark);
  turret.position.set(1.85, -1.15, 0);
  heli.add(turret);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), glass);
  lens.position.set(2.02, -1.18, 0);
  heli.add(lens);

  // Main rotor mast + two long blades + hub.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8), dark);
  mast.position.set(0, 1.75, 0);
  heli.add(mast);
  const rotor = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.4, roughness: 0.5 });
  for (const angle of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.05, 0.34), bladeMat);
    blade.rotation.y = angle;
    rotor.add(blade);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 12), dark);
  rotor.add(hub);
  rotor.position.set(0, 2.15, 0);
  heli.add(rotor);
  // Rotor disc: a translucent dark disc at blade height, the spinning
  // blur a real rotor reads as. Without it the two thin blades vanish
  // against the sky and the heli looks rotorless.
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(3.9, 32),
    new THREE.MeshBasicMaterial({
      color: 0x111827, transparent: true, opacity: 0.28,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(0, 2.18, 0);
  heli.add(disc);

  // Landing skids: two rails on struts.
  for (const z of [0.95, -0.95]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8), dark);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, -1.55, z);
    heli.add(rail);
    for (const x of [0.9, -0.9]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), dark);
      strut.position.set(x, -1.25, z);
      strut.rotation.x = z > 0 ? -0.35 : 0.35;
      heli.add(strut);
    }
  }

  // Belly spotlight housing + the narrow white cone.
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.3, 12), dark);
  housing.position.set(0.9, -1.35, 0);
  heli.add(housing);
  // Round 12: a LAYERED cone — a faint wide outer cone plus a bright
  // narrow core — reads as a crisp triangle beam instead of the round-11
  // soft wash (a single cone at 0.28 blew the centre white, at 0.15 it
  // vanished; the layered pair keeps the edges defined without washing
  // the road out). The cones' length is set by aimSpotlight() once the
  // caller knows the heli's altitude.
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfffbe8, transparent: true, opacity: 0.16,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.0, 11, 24, 1, true), coneMat);
  // Cone points down from the belly toward the ground.
  cone.position.set(0.9, -1.35 - 5.5, 0);
  cone.rotation.x = Math.PI;
  heli.add(cone);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.38,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const coneCore = new THREE.Mesh(new THREE.ConeGeometry(0.5, 11, 24, 1, true), coreMat);
  coneCore.position.set(0.9, -1.35 - 5.5, 0);
  coneCore.rotation.x = Math.PI;
  heli.add(coneCore);
  // Bright pool where the beam lands (positioned by aimSpotlight) —
  // smaller and brighter than round 11's, so the landing spot reads.
  const poolMat = new THREE.MeshBasicMaterial({
    map: glowTexture, color: 0xfff6c0, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.4, 24), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0.9, -12.6, 0);
  heli.add(pool);

  // Navigation lights: red left, green right, white strobe on the tail.
  for (const [z, color] of [[1.55, 0xff2222], [-1.55, 0x22ff66]]) {
    const light = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture, color, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    light.position.set(0, 0.1, z);
    light.scale.set(0.6, 0.6, 1);
    heli.add(light);
  }

  heli.userData.rotor = rotor;
  heli.userData.tailRotor = tailRotor;
  heli.userData.cone = cone;
  heli.userData.coneCore = coneCore;
  heli.userData.pool = pool;
  return heli;
}

// Stretch the spotlight cones so their tips land exactly on the ground,
// and put the bright pool there too. groundDistance is the heli's
// altitude in the heli's LOCAL units (divide by the group's scale when
// it is scaled).
export function aimSpotlight(heli, groundDistance) {
  const cone = heli.userData.cone;
  const coneCore = heli.userData.coneCore;
  const pool = heli.userData.pool;
  if (!cone || !pool) return;
  const length = Math.max(2, groundDistance - 1.35);
  cone.scale.y = length / 11;
  cone.position.y = -1.35 - length / 2;
  if (coneCore) {
    coneCore.scale.y = length / 11;
    coneCore.position.y = -1.35 - length / 2;
  }
  pool.position.y = -groundDistance;
}

// Spin both rotors; the main rotor blurs at speed.
export function updateHelicopter(heli, dt) {
  heli.userData.rotor.rotation.y += dt * 14;
  heli.userData.tailRotor.rotation.z += dt * 30;
  // Gentle hover bob.
  heli.position.y += Math.sin(performance.now() * 0.0011) * 0.0015;
}
