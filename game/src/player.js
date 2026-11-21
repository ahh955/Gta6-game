// Third-person character: low-poly figure, WASD movement, sprint, jump,
// enter/exit cars (E). The player drives through the vehicle object while
// seated; on foot the mesh walks.
// API: createPlayer(scene, { x, z }) -> { mesh, pos, heading, speed,
//   onFoot, vehicle, health, enterVehicle(v), exitVehicle(),
//   update(dt, input, world, traffic), teleport(x, z), setHealth(n) }
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { clamp, dist2D } from './util.js';

export function buildPersonMesh(shirtColor, pantsColor, skinColor) {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: skinColor });
  const shirt = new THREE.MeshLambertMaterial({ color: shirtColor });
  const pants = new THREE.MeshLambertMaterial({ color: pantsColor });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skin);
  head.position.y = 1.62;
  head.castShadow = true;
  g.add(head);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), shirt);
  torso.position.y = 1.08;
  torso.castShadow = true;
  g.add(torso);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.26), pants);
  legL.position.set(-0.17, 0.36, 0);
  const legR = legL.clone();
  legR.position.x = 0.17;
  g.add(legL, legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.66, 0.2), shirt);
  armL.position.set(-0.42, 1.08, 0);
  const armR = armL.clone();
  armR.position.x = 0.42;
  g.add(armL, armR);
  g.userData = { legL, legR, armL, armR, torso, head };
  return g;
}

export function createPlayer(scene, opts = {}) {
  const mesh = buildPersonMesh(0x2e8b8b, 0x2a2a3a, 0xc98a5e);
  mesh.position.set(opts.x || 0, 0, opts.z || 8);
  scene.add(mesh);

  const p = {
    mesh,
    heading: 0,
    speed: 0,
    onFoot: true,
    vehicle: null,
    health: 100,
    _walkPhase: 0,
    _vy: 0,
    _grounded: true,

    get pos() { return this.vehicle ? this.vehicle.mesh.position : mesh.position; },
    get x() { return this.pos.x; },
    get z() { return this.pos.z; },

    enterVehicle(v) {
      if (!v || v.wrecked) return false;
      this.vehicle = v;
      this.onFoot = false;
      mesh.visible = false;
      return true;
    },

    exitVehicle() {
      if (!this.vehicle) return;
      const v = this.vehicle;
      // Step out on the left side of the car.
      const sx = v.x - Math.cos(v.heading) * 2.2;
      const sz = v.z + Math.sin(v.heading) * 2.2;
      mesh.position.set(sx, 0, sz);
      mesh.rotation.y = v.heading;
      this.heading = v.heading;
      this.vehicle = null;
      this.onFoot = true;
      mesh.visible = true;
    },

    teleport(x, z) {
      if (this.vehicle) {
        this.vehicle.mesh.position.set(x, 0, z);
        this.vehicle.speed = 0;
      } else {
        mesh.position.set(x, 0, z);
      }
    },

    setHealth(n) { this.health = clamp(n, 0, 100); },

    update(dt, input, world, traffic) {
      if (!this.onFoot) {
        // Driving: input steers the vehicle.
        const axis = input.moveAxis();
        const throttle = axis.y;
        const steer = -axis.x;
        const handbrake = input.isDown('Space');
        this.vehicle.setSteerVisual(steer);
        this.vehicle.drive(dt, { throttle, steer, handbrake }, world);
        this.vehicle.update(dt, world);
        this.heading = this.vehicle.heading;
        this.speed = Math.abs(this.vehicle.speed);
        if (input.wasPressed('KeyE')) this.exitVehicle();
        return;
      }
      // On foot.
      const axis = input.moveAxis();
      const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
      const targetSpeed = (axis.x || axis.y)
        ? (sprint ? CONFIG.sprintSpeed : CONFIG.walkSpeed)
        : 0;
      this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 10);
      if (axis.x || axis.y) {
        // Movement is camera-relative: forward = away from camera. The
        // camera sits behind the heading, so world heading = atan2 of input.
        const moveHeading = Math.atan2(axis.x, axis.y);
        let dh = moveHeading - this.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        this.heading += clamp(dh, -8 * dt, 8 * dt);
      }
      const nx = mesh.position.x + Math.sin(this.heading) * this.speed * dt;
      const nz = mesh.position.z + Math.cos(this.heading) * this.speed * dt;
      if (!world.isBlocked(nx, mesh.position.z)) mesh.position.x = nx;
      if (!world.isBlocked(mesh.position.x, nz)) mesh.position.z = nz;
      // Jump.
      if (input.wasPressed('Space') && this._grounded) {
        this._vy = 5.2;
        this._grounded = false;
      }
      if (!this._grounded) {
        this._vy -= 14 * dt;
        mesh.position.y += this._vy * dt;
        if (mesh.position.y <= 0) { mesh.position.y = 0; this._vy = 0; this._grounded = true; }
      }
      mesh.rotation.y = this.heading;
      // Walk cycle: swing limbs.
      this._walkPhase += this.speed * dt * 1.6;
      const swing = Math.sin(this._walkPhase) * clamp(this.speed / CONFIG.walkSpeed, 0, 1) * 0.6;
      const u = mesh.userData;
      u.legL.rotation.x = swing;
      u.legR.rotation.x = -swing;
      u.armL.rotation.x = -swing * 0.8;
      u.armR.rotation.x = swing * 0.8;
      // Enter nearest car.
      if (input.wasPressed('KeyE') && traffic) {
        const car = traffic.nearestCar(mesh.position.x, mesh.position.z, 5);
        if (car) this.enterVehicle(car);
      }
    },

    nearestCarDistance(traffic) {
      if (!traffic) return Infinity;
      const car = traffic.nearestCar(mesh.position.x, mesh.position.z, 6);
      return car ? dist2D(mesh.position.x, mesh.position.z, car.x, car.z) : Infinity;
    },
  };
  return p;
}
