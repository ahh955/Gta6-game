// Buildings for Solmar City 3D. Pastel Miami towers with lit-window facades,
// rooftop clutter, striped awnings and big readable neon signs — the street
// reads as a place, not a row of boxes.
import * as THREE from 'three';
import { makeAwningTexture, makeFacadeTexture, makeSignTexture } from './textures.js';

const PASTEL = [0xffe8d6, 0xffd6dd, 0xd6f5e3, 0xd6e8ff, 0xfff3c4, 0xf3e8ff, 0xfde68a, 0xffffff];
const SIGN_COLORS = [
  ['CASINO AZUL', '#0b2a6b', '#ffd166', 'SLOTS · TABLES · 24H'],
  ['CORAL CROWN', '#7c2d12', '#fef08a', 'HOTEL & RESORT'],
  ['SOLMAR NIGHTS', '#3b0764', '#f0abfc', 'ROOFTOP CLUB'],
  ['MARINA GRILL', '#14532d', '#fefce8', 'SEAFOOD · STEAKS'],
  ['PALM LIQUOR', '#450a0a', '#fca5a5', 'OPEN LATE'],
  ['VELOCE MOTORS', '#111827', '#67e8f9', 'SPORTS CARS'],
  ['SURF & SAND', '#0c4a6e', '#a5f3fc', 'BOARDS · RENTALS'],
  ['LA PERLA', '#500724', '#fda4af', 'COFFEE · PASTRIES'],
];

export function buildBuilding(width, depth, height, rng, signChance = 0.55) {
  const group = new THREE.Group();
  const baseColor = '#' + new THREE.Color(rng.pick(PASTEL)).getHexString();
  const facade = makeFacadeTexture(baseColor, Math.max(3, Math.round(height / 3.2)), 0.3, rng);
  const wallMat = new THREE.MeshStandardMaterial({ map: facade, roughness: 0.85 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
  body.position.y = height / 2;
  group.add(body);

  // Roof slab + rooftop clutter (AC units, water tank, antenna).
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.4, 0.4, depth + 0.4),
    new THREE.MeshStandardMaterial({ color: 0x8a8f98, roughness: 0.9 }),
  );
  roof.position.y = height + 0.2;
  group.add(roof);
  const clutterCount = rng.int(1, 3);
  for (let i = 0; i < clutterCount; i++) {
    const unit = new THREE.Mesh(
      new THREE.BoxGeometry(rng.range(0.8, 1.6), rng.range(0.5, 0.9), rng.range(0.8, 1.4)),
      new THREE.MeshStandardMaterial({ color: 0xb8bdc4, roughness: 0.8, metalness: 0.3 }),
    );
    unit.position.set(rng.range(-width / 2 + 1, width / 2 - 1), height + 0.7, rng.range(-depth / 2 + 1, depth / 2 - 1));
    group.add(unit);
  }
  if (rng.chance(0.5)) {
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, rng.range(2, 4), 6),
      new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.7, roughness: 0.4 }),
    );
    antenna.position.set(rng.range(-width / 4, width / 4), height + 1.8, rng.range(-depth / 4, depth / 4));
    group.add(antenna);
  }

  // Street-level shopfront: awning + big sign, facing the road (+z local).
  if (rng.next() < signChance) {
    const [text, bg, fg, sub] = rng.pick(SIGN_COLORS);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(width * 0.85, 7), 1.7),
      new THREE.MeshStandardMaterial({
        map: makeSignTexture(text, bg, fg, sub),
        emissive: 0xffffff, emissiveMap: makeSignTexture(text, bg, fg, sub), emissiveIntensity: 0.55,
        roughness: 0.6,
      }),
    );
    sign.position.set(0, 4.6, depth / 2 + 0.06);
    group.add(sign);
    const awning = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.8, 1.6),
      new THREE.MeshStandardMaterial({ map: makeAwningTexture('#e11d48', '#ffffff'), roughness: 0.8, side: THREE.DoubleSide }),
    );
    awning.position.set(0, 3.1, depth / 2 + 0.85);
    awning.rotation.x = -0.5;
    group.add(awning);
  }

  // Balconies on the upper floors.
  const balconyRows = Math.floor(height / 6);
  for (let row = 0; row < balconyRows; row++) {
    const y = 7 + row * 6;
    for (let bx = -1; bx <= 1; bx += 2) {
      if (!rng.chance(0.6)) continue;
      const balcony = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.15, 0.9),
        new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.8 }),
      );
      balcony.position.set(bx * (width / 4), y, depth / 2 + 0.45);
      group.add(balcony);
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.7, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.6, roughness: 0.4 }),
      );
      rail.position.set(bx * (width / 4), y + 0.45, depth / 2 + 0.88);
      group.add(rail);
    }
  }
  return group;
}
