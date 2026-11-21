// Sidewalk pedestrians: low-poly walkers who stroll the sidewalks and flee
// when shots are fired nearby (Builder B's combat calls fleeFrom()).
// API: createPedestrians(scene, world, count, rng) -> { peds,
//   update(dt, world), fleeFrom(x, z, radius), count }
import { CONFIG } from './config.js';
import { buildPersonMesh } from './player.js';
import { RNG, dist2D } from './util.js';

const SHIRTS = [0xd6457a, 0x45a8d6, 0x7ad645, 0xe8a33b, 0x8e7ad6, 0x3bc2b2, 0xd6d6d6];
const PANTS = [0x2a2a3a, 0x3a3a2a, 0x1a2a3a, 0x4a2a2a];
const SKINS = [0xc98a5e, 0x8a5a3a, 0xe8b88a, 0x6b4226];

export function createPedestrians(scene, world, count, rng = new RNG(CONFIG.seed + 7)) {
  const peds = [];

  function spawnPed() {
    const mesh = buildPersonMesh(
      rng.pick(SHIRTS), rng.pick(PANTS), rng.pick(SKINS),
    );
    // Start on a sidewalk edge next to a road.
    const c = rng.pick(world.roadCenters);
    const alongX = rng.chance(0.5);
    const t = rng.float(-180, 180);
    const x = alongX ? t : c + rng.pick([-10.5, 10.5]);
    const z = alongX ? c + rng.pick([-10.5, 10.5]) : t;
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    const ped = {
      mesh,
      heading: rng.float(0, Math.PI * 2),
      speed: rng.float(1.0, 1.8),
      state: 'walk', // 'walk' | 'flee'
      fleeT: 0,
      walkPhase: rng.float(0, Math.PI * 2),
      retargetT: rng.float(2, 8),
    };
    peds.push(ped);
    return ped;
  }

  for (let i = 0; i < count; i++) spawnPed();

  function fleeFrom(x, z, radius = 40) {
    for (const ped of peds) {
      const d = dist2D(x, z, ped.mesh.position.x, ped.mesh.position.z);
      if (d < radius) {
        ped.state = 'flee';
        ped.fleeT = 4 + (1 - d / radius) * 4;
        ped.heading = Math.atan2(ped.mesh.position.x - x, ped.mesh.position.z - z);
      }
    }
  }

  function update(dt, worldRef) {
    for (const ped of peds) {
      const m = ped.mesh;
      if (ped.state === 'flee') {
        ped.fleeT -= dt;
        ped.speed = 5.2;
        if (ped.fleeT <= 0) { ped.state = 'walk'; ped.speed = 1.4; }
      } else {
        ped.retargetT -= dt;
        if (ped.retargetT <= 0) {
          ped.retargetT = rng.float(3, 9);
          // Drift along the sidewalk grid: prefer axis-aligned headings.
          ped.heading = Math.floor(rng.float(0, 4)) * (Math.PI / 2) + rng.float(-0.3, 0.3);
        }
      }
      const nx = m.position.x + Math.sin(ped.heading) * ped.speed * dt;
      const nz = m.position.z + Math.cos(ped.heading) * ped.speed * dt;
      if (worldRef.isBlocked(nx, nz)) {
        // Turn around at a wall.
        ped.heading += Math.PI + rng.float(-0.5, 0.5);
      } else {
        m.position.x = nx;
        m.position.z = nz;
      }
      m.rotation.y = ped.heading;
      ped.walkPhase += ped.speed * dt * 2.4;
      const swing = Math.sin(ped.walkPhase) * 0.55;
      const u = m.userData;
      u.legL.rotation.x = swing;
      u.legR.rotation.x = -swing;
      u.armL.rotation.x = -swing * 0.8;
      u.armR.rotation.x = swing * 0.8;
    }
  }

  return { peds, update, fleeFrom, count: peds.length };
}
