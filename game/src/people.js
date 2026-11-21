// Pedestrians for Solmar City 3D: simple capsule people in bright clothes,
// strolling the sidewalks and the beach so the street feels alive.
import * as THREE from 'three';

const SHIRTS = [0xef4444, 0x3b82f6, 0xf59e0b, 0x22c55e, 0xec4899, 0x8b5cf6, 0x14b8a6, 0xf8fafc, 0x111827];
const PANTS = [0x1e3a8a, 0x374151, 0x92400e, 0x065f46, 0x4c1d95];
const SKINS = [0xf2c89b, 0xd9a066, 0xa0663a, 0x8a5632, 0xf7d7b0];

export function buildPedestrian(rng) {
  const person = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: rng.pick(SHIRTS), roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: rng.pick(PANTS), roughness: 0.85 });
  const skin = new THREE.MeshStandardMaterial({ color: rng.pick(SKINS), roughness: 0.65 });

  const height = rng.range(1.6, 1.85);
  const scale = height / 1.75;
  // Legs.
  for (const s of [1, -1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.62, 3, 8), pants);
    leg.position.set(0, 0.5, s * 0.11);
    person.add(leg);
  }
  // Torso.
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), shirt);
  torso.position.set(0, 1.15, 0);
  person.add(torso);
  // Arms.
  for (const s of [1, -1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.5, 3, 8), shirt);
    arm.position.set(0, 1.12, s * 0.28);
    arm.rotation.x = s * 0.15;
    person.add(arm);
  }
  // Head + hair.
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), skin);
  head.position.set(0, 1.62, 0);
  person.add(head);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: rng.pick([0x1f2937, 0x7c2d12, 0xfacc15, 0x78716c]), roughness: 0.9 }),
  );
  hair.position.set(0, 1.64, 0);
  person.add(hair);
  // Some carry a beach bag or wear a hat.
  if (rng.chance(0.3)) {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.12),
      new THREE.MeshStandardMaterial({ color: rng.pick(SHIRTS), roughness: 0.8 }));
    bag.position.set(-0.05, 1.05, 0.26);
    person.add(bag);
  }
  if (rng.chance(0.25)) {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.06, 12),
      new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.9 }));
    hat.position.set(0, 1.76, 0);
    person.add(hat);
  }
  person.scale.setScalar(scale);
  person.userData.walkPhase = rng.next() * Math.PI * 2;
  person.userData.walkSpeed = rng.range(0.5, 1.1);
  return person;
}

// Gentle walking bob; the caller moves the group along the sidewalk.
export function updatePedestrian(person, time) {
  const phase = time * 4 * person.userData.walkSpeed + person.userData.walkPhase;
  person.position.y = Math.abs(Math.sin(phase)) * 0.04;
  person.rotation.z = Math.sin(phase) * 0.03;
}
