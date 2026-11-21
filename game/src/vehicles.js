// Low-poly cars: arcade driving physics, traffic AI, damage + explosions.
// API:
//   VEHICLE_TYPES — { sedan, coupe, truck, taxi, police, van } tuning + size.
//   buildCarMesh(type, color) -> THREE.Group (userData: { wheels, bodyMat, lightL, lightR })
//   createVehicle(scene, { type, color, x, z, heading, police }) -> vehicle:
//     { mesh, type, color, heading, speed, health, wrecked, burning, isPolice,
//       drive(dt, { throttle, steer, handbrake }, world),
//       update(dt, world), damage(amount), explode(), setLights(on), dispose() }
//   createTraffic(scene, world, count, rng) -> { cars, update(dt, world, playerPos),
//     nearestCar(x, z, maxDist), addCar(opts), removeCar(v) }
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG, PALETTE } from './config.js';
import { clamp, dist2D } from './util.js';

export const VEHICLE_TYPES = {
  sedan: { length: 4.4, width: 1.9, height: 0.75, cabin: 0.62, topSpeed: 40, accel: 16, label: 'Solmar Sedan' },
  coupe: { length: 4.1, width: 1.85, height: 0.65, cabin: 0.55, topSpeed: 46, accel: 19, label: 'Viento Coupe' },
  truck: { length: 5.6, width: 2.1, height: 1.0, cabin: 0.8, topSpeed: 32, accel: 11, label: 'Hauler Truck' },
  taxi: { length: 4.4, width: 1.9, height: 0.75, cabin: 0.62, topSpeed: 38, accel: 15, label: 'Solmar Taxi' },
  police: { length: 4.5, width: 1.95, height: 0.75, cabin: 0.62, topSpeed: 44, accel: 18, label: 'Solmar PD Cruiser' },
  van: { length: 5.0, width: 2.0, height: 1.15, cabin: 0.5, topSpeed: 34, accel: 12, label: 'Cargo Van' },
};

const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });

export function buildCarMesh(type, color) {
  const t = VEHICLE_TYPES[type] || VEHICLE_TYPES.sedan;
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(t.width, t.height, t.length), bodyMat);
  body.position.y = 0.62;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(t.width * 0.86, t.cabin, t.length * 0.5), glassMat);
  cabin.position.set(0, 0.62 + t.height / 2 + t.cabin / 2 - 0.05, -t.length * 0.08);
  cabin.castShadow = true;
  g.add(cabin);
  // Headlights + taillights.
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.1), headMat);
    h.position.set(s * (t.width / 2 - 0.35), 0.62, t.length / 2 + 0.02);
    g.add(h);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.1), tailMat);
    tl.position.set(s * (t.width / 2 - 0.35), 0.62, -t.length / 2 - 0.02);
    g.add(tl);
  }
  // Wheels.
  const wheels = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(sx * (t.width / 2 - 0.05), 0.36, sz * (t.length / 2 - 0.75));
    w.castShadow = true;
    g.add(w);
    wheels.push(w);
  }
  let lightL = null;
  let lightR = null;
  if (type === 'police' || type === 'taxi') {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(t.width * 0.7, 0.16, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x222222 }),
    );
    bar.position.set(0, 0.62 + t.height / 2 + t.cabin + 0.05, -t.length * 0.05);
    g.add(bar);
    if (type === 'police') {
      lightL = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.22, 0.42),
        new THREE.MeshBasicMaterial({ color: 0xff2222 }),
      );
      lightL.position.set(-0.42, 0.62 + t.height / 2 + t.cabin + 0.12, -t.length * 0.05);
      lightR = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.22, 0.42),
        new THREE.MeshBasicMaterial({ color: 0x2244ff }),
      );
      lightR.position.set(0.42, 0.62 + t.height / 2 + t.cabin + 0.12, -t.length * 0.05);
      g.add(lightL, lightR);
    } else {
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.24, 0.4),
        new THREE.MeshBasicMaterial({ color: 0xffe94d }),
      );
      sign.position.set(0, 0.62 + t.height / 2 + t.cabin + 0.1, -t.length * 0.05);
      g.add(sign);
    }
  }
  g.userData = { wheels, bodyMat, lightL, lightR, type };
  return g;
}

export function createVehicle(scene, opts = {}) {
  const type = opts.type || 'sedan';
  const t = VEHICLE_TYPES[type] || VEHICLE_TYPES.sedan;
  const color = opts.color ?? (type === 'police' ? PALETTE.policeWhite : 0xc23b3b);
  const mesh = buildCarMesh(type, color);
  mesh.position.set(opts.x || 0, 0, opts.z || 0);
  mesh.rotation.y = opts.heading || 0;
  scene.add(mesh);

  const v = {
    mesh, type, color,
    label: t.label,
    heading: opts.heading || 0,
    speed: 0,
    health: 100,
    wrecked: false,
    burning: false,
    isPolice: type === 'police' || !!opts.police,
    lightsOn: false,
    topSpeed: t.topSpeed,
    accel: t.accel,
    length: t.length,
    width: t.width,
    _smoke: [],
    _fire: null,
    _fireLight: null,
    _flashT: 0,

    get x() { return mesh.position.x; },
    get z() { return mesh.position.z; },

    drive(dt, input, world) {
      if (this.wrecked) { this.speed = 0; return; }
      const { throttle = 0, steer = 0, handbrake = false } = input;
      // throttle: +1 accel, -1 brake/reverse.
      if (throttle > 0) this.speed += this.accel * throttle * dt;
      else if (throttle < 0) {
        if (this.speed > 0.5) this.speed -= CONFIG.carBrake * dt;
        else this.speed = Math.max(this.speed + this.accel * 0.5 * throttle * dt, -CONFIG.carReverseSpeed);
      } else {
        // Drag + rolling resistance.
        this.speed -= this.speed * (handbrake ? 2.2 : 0.35) * dt;
        if (Math.abs(this.speed) < 0.05) this.speed = 0;
      }
      this.speed = clamp(this.speed, -CONFIG.carReverseSpeed, this.topSpeed);
      const speedFactor = clamp(Math.abs(this.speed) / 10, 0, 1);
      const dir = this.speed >= 0 ? 1 : -1;
      this.heading += steer * CONFIG.carTurnRate * speedFactor * dir * dt * (handbrake ? 1.6 : 1);
      const nx = mesh.position.x + Math.sin(this.heading) * this.speed * dt;
      const nz = mesh.position.z + Math.cos(this.heading) * this.speed * dt;
      if (world && world.isBlocked(nx, nz)) {
        // Crash: bounce back, take damage, spark the speed off.
        if (Math.abs(this.speed) > 6) this.damage(Math.abs(this.speed) * 1.6);
        this.speed *= -0.25;
      } else {
        mesh.position.x = nx;
        mesh.position.z = nz;
      }
      mesh.rotation.y = this.heading;
      this._spinWheels(dt);
    },

    _spinWheels(dt) {
      const spin = (this.speed * dt) / 0.36;
      for (const w of mesh.userData.wheels) w.rotation.x += spin;
      // Body roll + pitch for feel.
      mesh.rotation.z = clamp(-this._lastSteer * this.speed * 0.0012, -0.06, 0.06);
    },

    setSteerVisual(steer) { this._lastSteer = steer; },

    update(dt, world) {
      this._lastSteer = this._lastSteer || 0;
      // Police lightbar flash.
      if (this.isPolice && this.lightsOn) {
        this._flashT += dt;
        const on = Math.floor(this._flashT * 6) % 2 === 0;
        if (mesh.userData.lightL) mesh.userData.lightL.visible = on;
        if (mesh.userData.lightR) mesh.userData.lightR.visible = !on;
      }
      // Smoke when hurt, fire when wrecked.
      if (this.health < 45 && !this.wrecked && Math.random() < dt * 6) this._puff(0x555555, 0.5);
      if (this.burning) {
        if (this._fire) {
          const s = 1 + Math.sin(performance.now() * 0.02) * 0.25;
          this._fire.scale.set(s, s * 1.4, s);
          this._fireLight.intensity = 2.5 + Math.random() * 2;
        }
        if (Math.random() < dt * 10) this._puff(0x222222, 1.1);
      }
      for (let i = this._smoke.length - 1; i >= 0; i--) {
        const p = this._smoke[i];
        p.life -= dt;
        p.mesh.position.y += dt * 2.2;
        p.mesh.scale.multiplyScalar(1 + dt * 0.8);
        p.mesh.material.opacity = Math.max(0, p.life / p.maxLife) * 0.55;
        if (p.life <= 0) {
          mesh.parent?.remove(p.mesh);
          p.mesh.material.dispose();
          this._smoke.splice(i, 1);
        }
      }
    },

    _puff(color, size) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(size, 6, 5),
        new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.55 }),
      );
      m.position.set(mesh.position.x + (Math.random() - 0.5), 1.4, mesh.position.z + (Math.random() - 0.5));
      mesh.parent?.add(m);
      this._smoke.push({ mesh: m, life: 1.6, maxLife: 1.6 });
    },

    damage(amount) {
      if (this.wrecked) return;
      this.health -= amount;
      if (this.health <= 0) this.explode();
    },

    explode() {
      if (this.wrecked) return;
      this.wrecked = true;
      this.burning = true;
      this.health = 0;
      this.speed = 0;
      mesh.userData.bodyMat.color.setHex(0x1c1a1a);
      // Fireball: emissive cone + point light; wreck mesh stays on the street.
      const fireMat = new THREE.MeshBasicMaterial({ color: 0xff7722, transparent: true, opacity: 0.9 });
      this._fire = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.2, 8), fireMat);
      this._fire.position.set(mesh.position.x, 1.8, mesh.position.z);
      mesh.parent?.add(this._fire);
      this._fireLight = new THREE.PointLight(0xff7722, 4, 22, 1.6);
      this._fireLight.position.set(mesh.position.x, 3, mesh.position.z);
      mesh.parent?.add(this._fireLight);
      // Tilt the wreck.
      mesh.rotation.z = (Math.random() - 0.5) * 0.14;
      mesh.rotation.x = (Math.random() - 0.5) * 0.1;
    },

    setLights(on) {
      this.lightsOn = on;
      if (mesh.userData.lightL) mesh.userData.lightL.visible = on;
      if (mesh.userData.lightR) mesh.userData.lightR.visible = on;
    },

    dispose() {
      scene.remove(mesh);
      if (this._fire) mesh.parent?.remove(this._fire);
      if (this._fireLight) mesh.parent?.remove(this._fireLight);
    },
  };
  v._lastSteer = 0;
  return v;
}

export function createTraffic(scene, world, count, rng) {
  const cars = [];
  const types = ['sedan', 'coupe', 'truck', 'taxi', 'van'];

  function spawnRouteCar() {
    const alongX = rng.chance(0.5);
    const center = rng.pick(world.roadCenters);
    const dir = rng.chance(0.5) ? 1 : -1;
    const t = rng.float(-180, 180);
    const x = alongX ? t : center + dir * 4;
    const z = alongX ? center + dir * 4 : t;
    const heading = alongX ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    const car = createVehicle(scene, {
      type: rng.pick(types),
      color: rng.pick(PALETTE.carColors),
      x, z, heading,
    });
    car._route = { alongX, center, dir, cruise: rng.float(8, 13) };
    cars.push(car);
    return car;
  }

  for (let i = 0; i < count; i++) spawnRouteCar();

  function carAhead(car, dist) {
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    for (const o of cars) {
      if (o === car || o.wrecked) continue;
      const dx = o.x - car.x;
      const dz = o.z - car.z;
      const along = dx * fx + dz * fz;
      if (along > 0 && along < dist && Math.abs(dx * fz - dz * fx) < 2.4) return o;
    }
    return null;
  }

  function update(dt, worldRef, player) {
    for (const car of cars) {
      if (car.wrecked) { car.update(dt, worldRef); continue; }
      // Parked cars (no route) and the car the player is driving are not
      // steered by traffic; they still get lights/smoke updates.
      if (player && car === player.vehicle) { car.update(dt, worldRef); continue; }
      const r = car._route;
      if (!r || r.parked) { car.update(dt, worldRef); continue; }
      // At an intersection, sometimes turn onto the crossing road.
      const pos = r.alongX ? car.x : car.z;
      const nearest = worldRef.roadCenters.find((c) => Math.abs(pos - c) < 2.5);
      if (nearest !== undefined && rng.chance(dt * 0.5)) {
        const newAlongX = !r.alongX;
        const newDir = rng.chance(0.5) ? 1 : -1;
        r.alongX = newAlongX;
        r.center = nearest;
        r.dir = newDir;
        car.heading = newAlongX ? (newDir > 0 ? Math.PI / 2 : -Math.PI / 2) : (newDir > 0 ? 0 : Math.PI);
      }
      // Steer back onto the lane centre.
      const lane = r.alongX ? car.z : car.x;
      const laneTarget = r.center + r.dir * 4;
      const laneErr = laneTarget - lane;
      const wantHeading = r.alongX
        ? (r.dir > 0 ? Math.PI / 2 : -Math.PI / 2) + clamp(-laneErr * 0.06 * r.dir, -0.3, 0.3)
        : (r.dir > 0 ? 0 : Math.PI) + clamp(laneErr * 0.06 * r.dir, -0.3, 0.3);
      let dh = wantHeading - car.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      const steer = clamp(dh * 2.2, -1, 1);
      const blocked = carAhead(car, 11);
      const throttle = blocked ? (car.speed > 0.5 ? -1 : 0) : (car.speed < r.cruise ? 1 : 0);
      car.setSteerVisual(steer);
      car.drive(dt, { throttle, steer, handbrake: false }, worldRef);
      car.update(dt, worldRef);
      // Respawning: a car that leaves the city loops back on the far side.
      if (car.x < -210 || car.x > 215 || car.z < -210 || car.z > 210) {
        const p = worldRef.randomRoadPoint(rng);
        car.mesh.position.set(p.x, 0, p.z);
        car.speed = 0;
      }
    }
  }

  return {
    cars,
    update,
    addCar(opts) {
      const car = createVehicle(scene, opts);
      car._route = { alongX: true, center: 0, dir: 1, cruise: 10 };
      cars.push(car);
      return car;
    },
    removeCar(car) {
      const i = cars.indexOf(car);
      if (i >= 0) cars.splice(i, 1);
      car.dispose();
    },
    nearestCar(x, z, maxDist) {
      let best = null;
      let bestD = maxDist;
      for (const c of cars) {
        if (c.wrecked) continue;
        const d = dist2D(x, z, c.x, c.z);
        if (d < bestD) { bestD = d; best = c; }
      }
      return best;
    },
  };
}
