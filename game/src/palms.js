// Palm trees for Solmar City 3D. Trunks lean in stacked segments; fronds are
// real 3D shapes — tapered, bent downward, veined — arranged in a drooping
// crown, never flat planes.
import * as THREE from 'three';

const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8a6b4a, roughness: 0.9 });
const frondMaterial = new THREE.MeshStandardMaterial({
  color: 0x22a355, roughness: 0.75, side: THREE.DoubleSide,
});
const frondMaterialDark = new THREE.MeshStandardMaterial({
  color: 0x1a7f43, roughness: 0.75, side: THREE.DoubleSide,
});
const coconutMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4f2a, roughness: 0.8 });

// One frond: a plane bent along its length and tapered to a point.
function makeFrond(length, width, droop) {
  const segments = 8;
  const geometry = new THREE.PlaneGeometry(width, length, 1, segments);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i); // -length/2 .. length/2
    const t = (y + length / 2) / length; // 0 at base, 1 at tip
    // Taper toward the tip.
    position.setX(i, position.getX(i) * (1 - t * 0.85));
    // Bend downward along the length, more near the tip.
    position.setZ(i, -droop * t * t * length * 0.45);
    // Slight V-fold down the middle rib.
    const x = position.getX(i);
    position.setZ(i, position.getZ(i) - Math.abs(x) * 0.35);
  }
  geometry.computeVertexNormals();
  // Move the pivot to the frond's base so it can be rotated from the crown.
  geometry.translate(0, length / 2, 0);
  return new THREE.Mesh(geometry, Math.random() < 0.5 ? frondMaterial : frondMaterialDark);
}

export function buildPalm(height, rng) {
  const palm = new THREE.Group();
  const lean = rng.range(-0.12, 0.12);
  const segments = 5;
  const segmentHeight = height / segments;
  let x = 0;
  for (let i = 0; i < segments; i++) {
    const radiusBottom = 0.22 - (i / segments) * 0.08;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusBottom - 0.02, radiusBottom + 0.02, segmentHeight + 0.1, 7),
      trunkMaterial,
    );
    trunk.position.set(x, segmentHeight * (i + 0.5), 0);
    trunk.rotation.z = lean;
    palm.add(trunk);
    x += lean * segmentHeight;
  }
  const crownX = x;
  const crownY = height;

  // Crown of drooping fronds.
  const frondCount = rng.int(8, 10);
  for (let i = 0; i < frondCount; i++) {
    const frond = makeFrond(rng.range(2.4, 3.1), rng.range(0.55, 0.75), rng.range(0.8, 1.3));
    const angle = (i / frondCount) * Math.PI * 2 + rng.range(-0.15, 0.15);
    frond.position.set(crownX, crownY, 0);
    frond.rotation.order = 'YXZ';
    frond.rotation.y = angle;
    frond.rotation.x = -Math.PI / 2 + rng.range(0.45, 0.9);
    palm.add(frond);
  }
  // A few upright new fronds at the top.
  for (let i = 0; i < 3; i++) {
    const frond = makeFrond(1.6, 0.45, 0.4);
    frond.position.set(crownX, crownY, 0);
    frond.rotation.order = 'YXZ';
    frond.rotation.y = (i / 3) * Math.PI * 2;
    frond.rotation.x = -Math.PI / 2 + rng.range(1.1, 1.4);
    palm.add(frond);
  }
  // Coconuts under the crown.
  for (let i = 0; i < 4; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), coconutMaterial);
    const a = (i / 4) * Math.PI * 2;
    nut.position.set(crownX + Math.cos(a) * 0.28, crownY - 0.25, Math.sin(a) * 0.28);
    palm.add(nut);
  }
  return palm;
}
