// Police helicopter for Solmar City 3D: a recognisable two-tone airframe
// (rounded fuselage, glass cockpit, tail boom, skids, spinning main and tail
// rotors) plus a narrow white spotlight cone that tracks the player car.
import * as THREE from 'three';
import { makeGlowTexture } from './textures.js';

const glowTexture = makeGlowTexture();

export function buildHelicopter() {
  const heli = new THREE.Group();
  const teal = new THREE.MeshStandardMaterial({ color: 0x0e7490, metalness: 0.7, roughness: 0.3 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.5, roughness: 0.35 });
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
  const tailRotor = new THREE.Group();
  const tailBladeMat = dark;
  for (const angle of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.5, 0.1), tailBladeMat);
    blade.rotation.x = angle;
    tailRotor.add(blade);
  }
  tailRotor.position.set(-4.95, 0.5, 0.22);
  heli.add(tailRotor);

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
  // Round 9: brighter and narrower — the round-8 cone (opacity 0.11) was
  // invisible against a bright sky. The cone's length is set by
  // aimSpotlight() once the caller knows the heli's altitude.
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfffbe8, transparent: true, opacity: 0.2,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.3, 11, 24, 1, true), coneMat);
  // Cone points down from the belly toward the ground.
  cone.position.set(0.9, -1.35 - 5.5, 0);
  cone.rotation.x = Math.PI;
  heli.add(cone);
  // Bright pool where the beam lands (positioned by aimSpotlight).
  const poolMat = new THREE.MeshBasicMaterial({
    map: glowTexture, color: 0xfff6c0, transparent: true, opacity: 0.6,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), poolMat);
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
  heli.userData.pool = pool;
  return heli;
}

// Stretch the spotlight cone so its tip lands exactly on the ground, and
// put the bright pool there too. groundDistance is the heli's altitude in
// the heli's LOCAL units (divide by the group's scale when it is scaled).
export function aimSpotlight(heli, groundDistance) {
  const cone = heli.userData.cone;
  const pool = heli.userData.pool;
  if (!cone || !pool) return;
  const length = Math.max(2, groundDistance - 1.35);
  cone.scale.y = length / 11;
  cone.position.y = -1.35 - length / 2;
  pool.position.y = -groundDistance;
}

// Spin both rotors; the main rotor blurs at speed.
export function updateHelicopter(heli, dt) {
  heli.userData.rotor.rotation.y += dt * 14;
  heli.userData.tailRotor.rotation.z += dt * 30;
  // Gentle hover bob.
  heli.position.y += Math.sin(performance.now() * 0.0011) * 0.0015;
}
