// Buildings for Solmar City 3D. Pastel Miami towers with lit-window facades,
// rooftop clutter, striped awnings and big readable neon signs — the street
// reads as a place, not a row of boxes.
import * as THREE from 'three';
import { makeAwningTexture, makeFacadeTexture, makeSignTexture } from './textures.js';
import { getBuildingModel, CITY_MID, CITY_TALL } from './assets.js';

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
  // Round 12 polish: ~40% of buildings are Kenney commercial models (real
  // window grids, rooftop detail, glass skyscrapers) scaled to fit their
  // slot — tall slots get skyscrapers. The primitive build below is the
  // fallback and the other 60% (it keeps the pastel + neon-sign variety).
  if (rng.chance(0.4)) {
    const pool = height > 20 ? CITY_TALL : CITY_MID;
    const kenney = getBuildingModel(rng.pick(pool), width, height, depth);
    if (kenney) return kenney;
  }
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
  // Parapet cap: a lighter rim on top of the roof slab, so the roofline
  // reads as a finished edge, not a cut box.
  const parapet = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.6, 0.25, depth + 0.6),
    new THREE.MeshStandardMaterial({ color: 0xd6d9de, roughness: 0.85 }),
  );
  parapet.position.y = height + 0.5;
  group.add(parapet);
  const clutterCount = rng.int(1, 3);
  for (let i = 0; i < clutterCount; i++) {
    const unit = new THREE.Mesh(
      new THREE.BoxGeometry(rng.range(0.8, 1.6), rng.range(0.5, 0.9), rng.range(0.8, 1.4)),
      new THREE.MeshStandardMaterial({ color: 0xb8bdc4, roughness: 0.8, metalness: 0.3 }),
    );
    unit.position.set(rng.range(-width / 2 + 1, width / 2 - 1), height + 0.7, rng.range(-depth / 2 + 1, depth / 2 - 1));
    group.add(unit);
  }
  // Round 9: setback upper tower on tall buildings — the flat slab roofline
  // was the single most "boxy" read in the round-8 screenshots.
  if (height > 18 && rng.chance(0.7)) {
    const topH = height * rng.range(0.16, 0.26);
    const topW = width * rng.range(0.45, 0.65);
    const topD = depth * rng.range(0.5, 0.7);
    const topFacade = makeFacadeTexture(baseColor, Math.max(2, Math.round(topH / 3.2)), 0.3, rng);
    const topBox = new THREE.Mesh(
      new THREE.BoxGeometry(topW, topH, topD),
      new THREE.MeshStandardMaterial({ map: topFacade, roughness: 0.85 }),
    );
    topBox.position.set(rng.range(-width / 6, width / 6), height + 0.4 + topH / 2, rng.range(-depth / 8, depth / 8));
    group.add(topBox);
    const topRoof = new THREE.Mesh(
      new THREE.BoxGeometry(topW + 0.3, 0.3, topD + 0.3),
      new THREE.MeshStandardMaterial({ color: 0x8a8f98, roughness: 0.9 }),
    );
    topRoof.position.set(topBox.position.x, height + 0.4 + topH + 0.15, topBox.position.z);
    group.add(topRoof);
  }
  if (rng.chance(0.5)) {
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, rng.range(2, 4), 6),
      new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.7, roughness: 0.4 }),
    );
    antenna.position.set(rng.range(-width / 4, width / 4), height + 1.8, rng.range(-depth / 4, depth / 4));
    group.add(antenna);
  }
  // Rooftop water tower on tall buildings: legs + tank + cone roof.
  if (height > 22 && rng.chance(0.45)) {
    const tower = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6b4a, roughness: 0.9 });
    for (const [lx, lz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 6), woodMat);
      leg.position.set(lx, 0.8, lz);
      tower.add(leg);
    }
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 1.8, 12), woodMat);
    tank.position.y = 2.5;
    tower.add(tank);
    const tankRoof = new THREE.Mesh(
      new THREE.ConeGeometry(1.3, 0.7, 12),
      new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.5, roughness: 0.5 }),
    );
    tankRoof.position.y = 3.75;
    tower.add(tankRoof);
    tower.position.set(rng.range(-width / 4, width / 4), height + 0.6, rng.range(-depth / 4, depth / 4));
    group.add(tower);
  }

  // Street-level shopfront: awning + big sign, facing the road (+z local).
  // Round 9: varied awning colours (round 8 was red/white everywhere) and
  // a dark glass storefront band so the ground floor reads as shops.
  const glassBand = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.92, 2.4, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x16283a, metalness: 0.85, roughness: 0.12 }),
  );
  glassBand.position.set(0, 1.35, depth / 2 + 0.06);
  group.add(glassBand);
  // Entrance: recessed dark door + canopy + pilasters, so the ground
  // floor reads as somewhere you can walk in.
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 2.5, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x0b1526, metalness: 0.7, roughness: 0.2 }),
  );
  door.position.set(0, 1.25, depth / 2 + 0.15);
  group.add(door);
  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 2.7, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.8 }),
  );
  doorFrame.position.set(0, 1.35, depth / 2 + 0.1);
  group.add(doorFrame);
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.1, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.4, roughness: 0.5 }),
  );
  canopy.position.set(0, 2.7, depth / 2 + 0.5);
  group.add(canopy);
  for (const px of [-1.35, 1.35]) {
    const pilaster = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 3.0, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.8 }),
    );
    pilaster.position.set(px, 1.5, depth / 2 + 0.15);
    group.add(pilaster);
  }
  // Window AC units on a few upper floors: small grey boxes that catch
  // the light and break the flat facade.
  const acCount = rng.int(1, 3);
  for (let i = 0; i < acCount; i++) {
    const ac = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.55, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xb8bdc4, metalness: 0.3, roughness: 0.8 }),
    );
    ac.position.set(
      rng.range(-width / 2 + 1.5, width / 2 - 1.5),
      rng.range(6, Math.max(7, height - 2)),
      depth / 2 + 0.24,
    );
    group.add(ac);
  }
  const AWNING_COLORS = [['#e11d48', '#ffffff'], ['#0ea5e9', '#ffffff'], ['#f59e0b', '#1f2937'], ['#22c55e', '#ffffff']];
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
    const [awA, awB] = rng.pick(AWNING_COLORS);
    const awning = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.8, 1.6),
      new THREE.MeshStandardMaterial({ map: makeAwningTexture(awA, awB), roughness: 0.8, side: THREE.DoubleSide }),
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
