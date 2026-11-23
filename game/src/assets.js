// Kenney CC0 GLB models (round 12 polish) — see ../assets/README.md.
// Loads the car / city packs once, hands out scaled clones.
// (The Blocky Characters pack is NOT loaded: the blocky figures read as
// square toy people at readable size, so all people are the articulated
// primitives in people.js. The char GLBs stay in the repo, unused.)
// Every accessor returns null when its model failed to load, so the
// builders fall back to the primitive meshes — a missing GLB never breaks
// the scene. Loaded with the vendored GLTFLoader (r160, matching the
// vendored three.module.min.js core).
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';

const cache = new Map(); // name -> gltf (scene + animations)
let ready = false;

const MODELS = {
  // Cars (Kenney cars face +Z; ~1.5 wide x 2.55 long, stubby).
  carSedan: 'assets/cars/sedan.glb',
  carSports: 'assets/cars/sedan-sports.glb',
  carHatch: 'assets/cars/hatchback-sports.glb',
  carSuv: 'assets/cars/suv.glb',
  carTaxi: 'assets/cars/taxi.glb',
  carPolice: 'assets/cars/police.glb',
  carVan: 'assets/cars/van.glb',
  carTruck: 'assets/cars/truck.glb',
  carDelivery: 'assets/cars/delivery.glb',
  // City buildings (~1 unit tile scale; scaled up x10 at placement).
  bldA: 'assets/city/building-a.glb',
  bldB: 'assets/city/building-b.glb',
  bldE: 'assets/city/building-e.glb',
  bldF: 'assets/city/building-f.glb',
  bldSkyA: 'assets/city/building-skyscraper-a.glb',
  bldSkyC: 'assets/city/building-skyscraper-c.glb',
};

export function modelsReady() { return ready; }

// Load every pack model sequentially with a fresh loader per model — 15
// small local files still load in ~1s, and sequential loads keep the load
// order deterministic. A single failure must not fail the rest, so each
// load carries its own catch; the game is usable as long as ANY model
// loaded (the rest fall back to primitives).
export async function loadModels() {
  if (ready) return true;
  let loaded = 0;
  for (const [name, url] of Object.entries(MODELS)) {
    try {
      const gltf = await new GLTFLoader().loadAsync(url);
      cache.set(name, gltf);
      loaded++;
    } catch { /* fall back to primitives for this model */ }
  }
  ready = loaded > 0;
  // Diagnostics for the screenshot driver (and any later debugging):
  // how many of the 15 pack models actually loaded.
  window.__modelsLoaded = loaded;
  window.__modelsTotal = Object.keys(MODELS).length;
  return ready;
}

// Deep-clone a cached model with shadows on.
function cloneModel(name) {
  const gltf = cache.get(name);
  if (!gltf) return null;
  const group = gltf.scene.clone(true);
  group.traverse((child) => {
    if (child.isMesh) { child.castShadow = true; child.receiveShadow = false; }
  });
  return { group, clips: gltf.animations };
}

// --- Cars ---
// Stretch the stubby Kenney cars to real-car proportions (1.8 wide x 4.2
// long) and re-face them to +X, so a clone behaves exactly like the
// primitive builders (rotation.y = PI faces -Z down-road). The stretch
// would turn the wheels elliptical, so each wheel node gets a counter-scale
// that leaves it round (0.69 m diameter, touching the ground exactly).
export function getCarModel(name) {
  const c = cloneModel(name);
  if (!c) return null;
  const wrap = new THREE.Group();
  c.group.rotation.y = Math.PI / 2; // +Z forward -> +X forward
  c.group.scale.set(1.2, 1.15, 1.65);
  // Mark the model group: the animate loop spins the player car's Group
  // children as wheels — without this marker it would roll the whole car.
  c.group.userData.kenneyModel = true;
  c.group.traverse((child) => {
    if (child.name.startsWith('wheel')) child.scale.set(0.8, 1.0, 0.7);
  });
  wrap.add(c.group);
  return wrap;
}

// --- Buildings ---
// Uniformly scale a Kenney building to fit its slot (width/height/depth),
// preserving its proportions, and re-center it on the slot. The models
// sit on y=0 already, so no vertical shift is needed.
export function getBuildingModel(name, slotW, slotH, slotD) {
  const c = cloneModel(name);
  if (!c) return null;
  const box = new THREE.Box3().setFromObject(c.group);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.x <= 0 || size.y <= 0 || size.z <= 0) return null;
  const s = Math.min(slotW / size.x, slotH / size.y, slotD / size.z);
  c.group.scale.setScalar(s);
  const box2 = new THREE.Box3().setFromObject(c.group);
  const center = new THREE.Vector3();
  box2.getCenter(center);
  c.group.position.x -= center.x;
  c.group.position.z -= center.z;
  return c.group;
}

export const CITY_MID = ['bldA', 'bldB', 'bldE', 'bldF'];
export const CITY_TALL = ['bldSkyA', 'bldSkyC'];
