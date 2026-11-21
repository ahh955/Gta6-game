// Procedural 3D city: grid of blocks with low-poly buildings (lit windows),
// roads with lane markings + crosswalks, sidewalks, palm trees, beach +
// ocean, streetlights, props. Seeded RNG => the same city every run.
// API: createWorld(scene, seed?) -> { group, colliders, bounds, roadCenters,
//   isBlocked(x, z), isOnRoad(x, z), nearestRoadPoint(x, z),
//   randomRoadPoint(rng), update(dt, time) }
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG, PALETTE } from './config.js';
import { RNG } from './util.js';

const ROAD_CENTERS = [-160, -80, 0, 80, 160];

export function createWorld(scene, seed = CONFIG.seed) {
  const rng = new RNG(seed);
  const group = new THREE.Group();
  group.name = 'solmar-city';
  scene.add(group);
  const colliders = [];
  const half = 200; // city half-extent

  const mat = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });

  // ---- ground ----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    mat(PALETTE.ground),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(60, -0.05, 0);
  ground.receiveShadow = true;
  group.add(ground);

  // ---- beach + ocean (east edge) ----
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(60, 560), mat(PALETTE.sand));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(232, 0.02, 0);
  sand.receiveShadow = true;
  group.add(sand);
  const oceanMat = new THREE.MeshLambertMaterial({ color: PALETTE.ocean, transparent: true, opacity: 0.92 });
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(300, 900), oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(420, 0.0, 0);
  group.add(ocean);

  // ---- roads (dark strips along each grid line) ----
  const roadMat = mat(PALETTE.road);
  for (const c of ROAD_CENTERS) {
    const ns = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.roadWidth, half * 2 + 40), roadMat);
    ns.rotation.x = -Math.PI / 2;
    ns.position.set(c, 0.01, 0);
    ns.receiveShadow = true;
    group.add(ns);
    const ew = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 40, CONFIG.roadWidth), roadMat);
    ew.rotation.x = -Math.PI / 2;
    ew.position.set(0, 0.01, c);
    ew.receiveShadow = true;
    group.add(ew);
  }

  // ---- lane markings + crosswalks (instanced flat quads) ----
  const dashGeo = new THREE.PlaneGeometry(0.5, 4);
  const dashMat = new THREE.MeshBasicMaterial({ color: PALETTE.roadLine });
  const dashXforms = [];
  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpE = new THREE.Euler();
  const tmpS = new THREE.Vector3(1, 1, 1);
  const tmpP = new THREE.Vector3();
  function dash(x, z, rotY) {
    tmpE.set(-Math.PI / 2, 0, rotY);
    tmpQ.setFromEuler(tmpE);
    tmpP.set(x, 0.03, z);
    tmpM.compose(tmpP, tmpQ, tmpS);
    dashXforms.push(tmpM.clone());
  }
  for (const c of ROAD_CENTERS) {
    for (let t = -196; t <= 196; t += 12) {
      // Skip dashes inside intersections.
      if (ROAD_CENTERS.some((o) => Math.abs(t - o) < 12)) continue;
      dash(c, t, 0);
      dash(t, c, Math.PI / 2);
    }
  }
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, dashXforms.length);
  dashXforms.forEach((m, i) => dashes.setMatrixAt(i, m));
  dashes.instanceMatrix.needsUpdate = true;
  group.add(dashes);

  // Crosswalk stripes at every intersection.
  const stripeGeo = new THREE.PlaneGeometry(1.6, 5);
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xe8e4da });
  const stripeXforms = [];
  function stripe(x, z, rotY) {
    tmpE.set(-Math.PI / 2, 0, rotY);
    tmpQ.setFromEuler(tmpE);
    tmpP.set(x, 0.03, z);
    tmpM.compose(tmpP, tmpQ, tmpS);
    stripeXforms.push(tmpM.clone());
  }
  for (const cx of ROAD_CENTERS) {
    for (const cz of ROAD_CENTERS) {
      for (let k = -2; k <= 2; k++) {
        stripe(cx + k * 2.6, cz - 10.5, 0);
        stripe(cx + k * 2.6, cz + 10.5, 0);
        stripe(cx - 10.5, cz + k * 2.6, Math.PI / 2);
        stripe(cx + 10.5, cz + k * 2.6, Math.PI / 2);
      }
    }
  }
  const stripes = new THREE.InstancedMesh(stripeGeo, stripeMat, stripeXforms.length);
  stripeXforms.forEach((m, i) => stripes.setMatrixAt(i, m));
  stripes.instanceMatrix.needsUpdate = true;
  group.add(stripes);

  // ---- sidewalks + buildings per block ----
  const sidewalkMat = mat(PALETTE.sidewalk);
  const buildingMats = PALETTE.building.map((c) => mat(c));
  const roofMat = mat(0x4a4458);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const winGeo = new THREE.PlaneGeometry(1.6, 2.2);
  const winLitMat = new THREE.MeshBasicMaterial({ color: PALETTE.windowLit });
  const winDarkMat = new THREE.MeshBasicMaterial({ color: PALETTE.windowDark });
  const litXforms = [];
  const darkXforms = [];

  function addWindows(bx, bz, w, d, h) {
    const floors = Math.max(1, Math.floor(h / 6));
    const colsX = Math.max(1, Math.floor(w / 5));
    const colsZ = Math.max(1, Math.floor(d / 5));
    const faces = [
      { dx: 0, dz: d / 2 + 0.06, ry: 0, cols: colsX, along: 'x' },
      { dx: 0, dz: -d / 2 - 0.06, ry: Math.PI, cols: colsX, along: 'x' },
      { dx: w / 2 + 0.06, dz: 0, ry: Math.PI / 2, cols: colsZ, along: 'z' },
      { dx: -w / 2 - 0.06, dz: 0, ry: -Math.PI / 2, cols: colsZ, along: 'z' },
    ];
    for (const f of faces) {
      for (let fl = 0; fl < floors; fl++) {
        for (let c = 0; c < f.cols; c++) {
          const off = (c - (f.cols - 1) / 2) * 5;
          const px = bx + f.dx + (f.along === 'x' ? off : 0);
          const pz = bz + f.dz + (f.along === 'z' ? off : 0);
          const py = 3 + fl * 6;
          tmpE.set(0, f.ry, 0);
          tmpQ.setFromEuler(tmpE);
          tmpP.set(px, py, pz);
          tmpM.compose(tmpP, tmpQ, tmpS);
          (rng.chance(0.55) ? litXforms : darkXforms).push(tmpM.clone());
        }
      }
    }
  }

  for (let ix = 0; ix < CONFIG.blocks; ix++) {
    for (let iz = 0; iz < CONFIG.blocks; iz++) {
      const bx0 = -200 + ix * 80 + 8; // block interior (road edge at +8)
      const bz0 = -200 + iz * 80 + 8;
      const cx = bx0 + 32;
      const cz = bz0 + 32;
      // Sidewalk slab for the whole block.
      const walk = new THREE.Mesh(boxGeo, sidewalkMat);
      walk.scale.set(64, 0.3, 64);
      walk.position.set(cx, 0.15, cz);
      walk.receiveShadow = true;
      group.add(walk);
      // Downtown (centre blocks) gets towers; outskirts get low blocks.
      const downtown = Math.abs(cx) <= 80 && Math.abs(cz) <= 80;
      const nB = downtown ? rng.int(1, 2) : rng.int(2, 4);
      for (let b = 0; b < nB; b++) {
        const w = rng.float(14, downtown ? 30 : 20);
        const d = rng.float(14, downtown ? 30 : 20);
        const h = downtown ? rng.float(24, 70) : rng.float(8, 22);
        const px = cx + rng.float(-24 + w / 2, 24 - w / 2);
        const pz = cz + rng.float(-24 + d / 2, 24 - d / 2);
        // Avoid overlapping an existing collider in this block.
        if (colliders.some((c) => px + w / 2 > c.x0 - 2 && px - w / 2 < c.x1 + 2 && pz + d / 2 > c.z0 - 2 && pz - d / 2 < c.z1 + 2)) continue;
        const bld = new THREE.Mesh(boxGeo, rng.pick(buildingMats));
        bld.scale.set(w, h, d);
        bld.position.set(px, h / 2 + 0.3, pz);
        bld.castShadow = true;
        bld.receiveShadow = true;
        group.add(bld);
        const roof = new THREE.Mesh(boxGeo, roofMat);
        roof.scale.set(w * 0.5, 1.2, d * 0.5);
        roof.position.set(px, h + 0.9, pz);
        group.add(roof);
        colliders.push({ x0: px - w / 2, x1: px + w / 2, z0: pz - d / 2, z1: pz + d / 2 });
        addWindows(px, pz, w, d, h);
      }
    }
  }
  const litWins = new THREE.InstancedMesh(winGeo, winLitMat, Math.max(1, litXforms.length));
  litXforms.forEach((m, i) => litWins.setMatrixAt(i, m));
  litWins.instanceMatrix.needsUpdate = true;
  group.add(litWins);
  const darkWins = new THREE.InstancedMesh(winGeo, winDarkMat, Math.max(1, darkXforms.length));
  darkXforms.forEach((m, i) => darkWins.setMatrixAt(i, m));
  darkWins.instanceMatrix.needsUpdate = true;
  group.add(darkWins);

  // ---- palm trees: beach row + boulevard rows (instanced) ----
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 7, 6);
  const trunkMat = mat(PALETTE.palmTrunk);
  const canopyGeo = new THREE.IcosahedronGeometry(3.4, 0);
  const canopyMat = mat(PALETTE.palmLeaf, { flatShading: true });
  const palmSpots = [];
  for (let z = -190; z <= 190; z += 14) {
    palmSpots.push([206, z + rng.float(-2, 2)]); // beach row
    if (rng.chance(0.6)) palmSpots.push([168, z + rng.float(-3, 3)]);
  }
  for (let x = -190; x <= 190; x += 18) {
    if (rng.chance(0.5)) palmSpots.push([x, 8 + rng.float(-1, 1)]);
    if (rng.chance(0.5)) palmSpots.push([x, -8 + rng.float(-1, 1)]);
  }
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palmSpots.length);
  const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, palmSpots.length);
  palmSpots.forEach(([x, z], i) => {
    const lean = rng.float(-0.12, 0.12);
    tmpE.set(lean, rng.float(0, Math.PI * 2), lean);
    tmpQ.setFromEuler(tmpE);
    tmpP.set(x, 3.5, z);
    tmpS.set(1, 1, 1);
    tmpM.compose(tmpP, tmpQ, tmpS);
    trunks.setMatrixAt(i, tmpM);
    tmpP.set(x, 7.6, z);
    tmpS.set(1, 0.55, 1);
    tmpM.compose(tmpP, tmpQ, tmpS);
    canopies.setMatrixAt(i, tmpM);
    colliders.push({ x0: x - 0.6, x1: x + 0.6, z0: z - 0.6, z1: z + 0.6 });
  });
  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  trunks.castShadow = true;
  canopies.castShadow = true;
  group.add(trunks);
  group.add(canopies);

  // ---- streetlights along every road (instanced poles + lamp heads) ----
  const poleGeo = new THREE.CylinderGeometry(0.18, 0.22, 7.5, 6);
  const poleMat = mat(0x2a2a33);
  const lampGeo = new THREE.SphereGeometry(0.55, 8, 6);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const lampSpots = [];
  for (const c of ROAD_CENTERS) {
    for (let t = -180; t <= 180; t += 40) {
      lampSpots.push([c + 9.5, t]);
      lampSpots.push([t, c - 9.5]);
    }
  }
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampSpots.length);
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, lampSpots.length);
  lampSpots.forEach(([x, z], i) => {
    tmpE.set(0, 0, 0);
    tmpQ.setFromEuler(tmpE);
    tmpS.set(1, 1, 1);
    tmpP.set(x, 3.75, z);
    tmpM.compose(tmpP, tmpQ, tmpS);
    poles.setMatrixAt(i, tmpM);
    tmpP.set(x, 7.6, z);
    tmpM.compose(tmpP, tmpQ, tmpS);
    lamps.setMatrixAt(i, tmpM);
  });
  poles.instanceMatrix.needsUpdate = true;
  lamps.instanceMatrix.needsUpdate = true;
  group.add(poles);
  group.add(lamps);

  // ---- props: benches + billboards ----
  const benchMat = mat(0x7a5a3a);
  for (let i = 0; i < 14; i++) {
    const bx = rng.pick(ROAD_CENTERS) + 10.5;
    const bz = rng.float(-180, 180);
    const bench = new THREE.Mesh(boxGeo, benchMat);
    bench.scale.set(2.4, 0.5, 0.9);
    bench.position.set(bx, 0.55, bz);
    bench.castShadow = true;
    group.add(bench);
  }
  const billboardFaces = [0xd6457a, 0x45a8d6, 0x7ad645];
  for (let i = 0; i < 4; i++) {
    const bx = rng.pick([-160, -80, 0, 80]);
    const bz = rng.pick([-160, -80, 0, 80, 160]);
    const post = new THREE.Mesh(boxGeo, poleMat);
    post.scale.set(0.8, 12, 0.8);
    post.position.set(bx + 12, 6, bz + 12);
    group.add(post);
    const face = new THREE.Mesh(
      boxGeo,
      new THREE.MeshBasicMaterial({ color: billboardFaces[i % 3] }),
    );
    face.scale.set(10, 5, 0.4);
    face.position.set(bx + 12, 14, bz + 12);
    group.add(face);
  }

  // ---- helpers ----
  function isBlocked(x, z) {
    if (x < -half - 8 || x > 262 || z < -half - 8 || z > half + 8) return true;
    for (const c of colliders) {
      if (x >= c.x0 && x <= c.x1 && z >= c.z0 && z <= c.z1) return true;
    }
    return false;
  }
  function isOnRoad(x, z) {
    const onX = ROAD_CENTERS.some((c) => Math.abs(x - c) <= CONFIG.roadWidth / 2);
    const onZ = ROAD_CENTERS.some((c) => Math.abs(z - c) <= CONFIG.roadWidth / 2);
    return onX || onZ;
  }
  function nearestRoadPoint(x, z) {
    let best = null;
    let bestD = Infinity;
    for (const c of ROAD_CENTERS) {
      const d1 = Math.abs(x - c);
      if (d1 < bestD) { bestD = d1; best = { x: c, z }; }
      const d2 = Math.abs(z - c);
      if (d2 < bestD) { bestD = d2; best = { x, z: c }; }
    }
    return best;
  }
  function randomRoadPoint(r) {
    const c = r.pick(ROAD_CENTERS);
    if (r.chance(0.5)) return { x: c + r.float(-3, 3), z: r.float(-180, 180) };
    return { x: r.float(-180, 180), z: c + r.float(-3, 3) };
  }

  function update(dt, time) {
    // Gentle ocean shimmer.
    oceanMat.opacity = 0.9 + Math.sin(time * 0.4) * 0.03;
  }

  return {
    group, colliders,
    bounds: { minX: -half, maxX: 262, minZ: -half, maxZ: half },
    roadCenters: ROAD_CENTERS,
    isBlocked, isOnRoad, nearestRoadPoint, randomRoadPoint, update,
  };
}
