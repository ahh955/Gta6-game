// Pedestrians for Solmar City 3D: articulated low-poly people — distinct
// heads, torsos, arms and legs with shoes, hands, necks and belts —
// strolling the sidewalks and the beach so the street feels alive.
// Legs and arms hang from hip/shoulder pivots, so they swing when the
// person walks (updatePedestrian) and can be posed (poseAim for the
// shootout's hero and gunmen). The model faces +X locally: left/right
// is the Z axis, forward is +X.
import * as THREE from 'three';

const SHIRTS = [0xef4444, 0x3b82f6, 0xf59e0b, 0x22c55e, 0xec4899, 0x8b5cf6, 0x14b8a6, 0xf8fafc, 0x111827];
const PANTS = [0x1e3a8a, 0x374151, 0x92400e, 0x065f46, 0x4c1d95];
const SKINS = [0xf2c89b, 0xd9a066, 0xa0663a, 0x8a5632, 0xf7d7b0];
const SHOE_COLORS = [0x1f2937, 0x44403c, 0x7c2d12, 0xf8fafc];
const HAIR_COLORS = [0x1f2937, 0x7c2d12, 0xfacc15, 0x78716c, 0x111827];

export function buildPedestrian(rng, opts = {}) {
  // Round 12 polish, revised: EVERY person is the articulated primitive
  // below. The Kenney Blocky Characters were tried for background
  // pedestrians first, but they read as square figures at readable size
  // (the title shot's beach people looked like toy blocks), so they are
  // out — the articulated figures, with real heads, swinging arms and
  // legs, read as people. The hero and gunmen were already primitive.
  const person = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: opts.shirt ?? rng.pick(SHIRTS), roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: opts.pants ?? rng.pick(PANTS), roughness: 0.85 });
  const skin = new THREE.MeshStandardMaterial({ color: opts.skin ?? rng.pick(SKINS), roughness: 0.65 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: rng.pick(SHOE_COLORS), roughness: 0.7 });

  const height = rng.range(1.6, 1.85);
  const scale = height / 1.75;
  const pivots = {};
  // Legs on hip pivots: capsule + shoe, so the walk swing reads.
  for (const [key, s] of [['legL', 1], ['legR', -1]]) {
    const hip = new THREE.Group();
    hip.position.set(0, 0.82, s * 0.11);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.62, 3, 8), pants);
    leg.position.set(0, -0.36, 0);
    hip.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.13), shoeMat);
    shoe.position.set(0.04, -0.76, 0);
    hip.add(shoe);
    person.add(hip);
    pivots[key] = hip;
  }
  // Torso: capsule + shoulder bar + belt, so it reads as a body, not a tube.
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), shirt);
  torso.position.set(0, 1.15, 0);
  person.add(torso);
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.56), shirt);
  shoulders.position.set(0, 1.38, 0);
  person.add(shoulders);
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.09, 0.44),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 }),
  );
  belt.position.set(0, 0.88, 0);
  person.add(belt);
  // Arms on shoulder pivots: capsule + skin hand.
  for (const [key, s] of [['armL', 1], ['armR', -1]]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(0, 1.38, s * 0.28);
    shoulder.rotation.x = s * 0.12; // arms hang slightly away from the body
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.5, 3, 8), shirt);
    arm.position.set(0, -0.3, 0);
    shoulder.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), skin);
    hand.position.set(0, -0.62, 0);
    shoulder.add(hand);
    person.add(shoulder);
    pivots[key] = shoulder;
  }
  // Neck + head + hair.
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.14, 8), skin);
  neck.position.set(0, 1.5, 0);
  person.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), skin);
  head.position.set(0, 1.62, 0);
  person.add(head);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: rng.pick(HAIR_COLORS), roughness: 0.9 }),
  );
  hair.position.set(0, 1.64, 0);
  person.add(hair);
  // Some wear sunglasses — a dark bar across the face reads at any distance.
  // Uniformed figures (gunmen) skip the accessories.
  if (!opts.uniform && rng.chance(0.2)) {
    const shades = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.06, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3, metalness: 0.4 }),
    );
    shades.position.set(0.12, 1.64, 0);
    person.add(shades);
  }
  // Some carry a beach bag or wear a hat.
  if (!opts.uniform && rng.chance(0.3)) {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.12),
      new THREE.MeshStandardMaterial({ color: rng.pick(SHIRTS), roughness: 0.8 }));
    bag.position.set(-0.05, 1.05, 0.26);
    person.add(bag);
  }
  if (!opts.uniform && rng.chance(0.25)) {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.06, 12),
      new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.9 }));
    hat.position.set(0, 1.76, 0);
    person.add(hat);
  }
  person.scale.setScalar(scale);
  person.userData.pivots = pivots;
  person.userData.shirtMat = shirt;
  person.userData.pantsMat = pants;
  person.userData.walkPhase = rng.next() * Math.PI * 2;
  person.userData.walkSpeed = rng.range(0.5, 1.1);
  return person;
}

// Walking gait: legs and arms swing opposite, with a gentle bob; the
// caller moves the group along the sidewalk.
export function updatePedestrian(person, time) {
  const phase = time * 4 * person.userData.walkSpeed + person.userData.walkPhase;
  const swing = Math.sin(phase);
  const p = person.userData.pivots;
  if (p) {
    p.legL.rotation.z = swing * 0.45;
    p.legR.rotation.z = -swing * 0.45;
    p.armL.rotation.z = -swing * 0.35;
    p.armR.rotation.z = swing * 0.35;
  }
  person.position.y = Math.abs(Math.sin(phase)) * 0.04;
  person.rotation.z = Math.sin(phase) * 0.03;
}

// Aim pose for the shootout: both arms forward holding a rifle, feet in
// a shooting stance. Hands end up near local (0.55, 1.14, +/-0.1) — put
// the rifle there. Never call on a walking pedestrian (updatePedestrian
// overwrites the arm rotations every frame).
export function poseAim(person) {
  const p = person.userData.pivots;
  if (!p) return;
  p.armL.rotation.z = 1.15;
  p.armL.rotation.x = -0.35;
  p.armR.rotation.z = 1.28;
  p.armR.rotation.x = 0.28;
  p.legL.rotation.z = 0.14;
  p.legR.rotation.z = -0.12;
}
