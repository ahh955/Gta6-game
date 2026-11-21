// Solmar City 3D — the player: third-person on foot, chase-cam driving,
// entering and stealing cars, and the camera that follows both.

import * as THREE from "three";
import { makeCar, makePed } from "./vehicles.js";

const WALK_SPEED = 6;
const RUN_SPEED = 11;

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.onFoot = true;
    this.speed = 0; // mph, shown on the HUD
    this.carSpeed = 0; // world units per second
    this.heading = 0;
    this.carCondition = 87;
    this.carName = "Vortex GT";
    this.health = 100;
    this.armor = 50;

    // The on-foot character: Vex, in a coral jacket.
    this.walker = makePed(0xf97316, 0x1e293b);
    this.walker.scale.setScalar(1.05);
    this.walker.position.set(2, 0, 6);
    scene.add(this.walker);

    // The player's own car, parked by the marina until taken.
    this.car = makeCar(0xff5a1f, { spoiler: true, name: "Vortex GT" });
    this.car.position.set(0, 0, -2.6);
    scene.add(this.car);

    this.cameraYaw = Math.PI; // behind the car, looking forward
    this.cameraPitch = 0.32;
    this.cameraDistance = 9.5;
  }

  get position() {
    return this.onFoot ? this.walker.position : this.car.position;
  }

  get object() {
    return this.onFoot ? this.walker : this.car;
  }

  enterCar(car) {
    this.onFoot = false;
    this.car = car;
    this.carName = car.name === "Car" ? "Street Car" : car.name;
    this.walker.visible = false;
    this.carSpeed = 0;
    this.speed = 0;
  }

  exitCar() {
    this.onFoot = true;
    this.walker.visible = true;
    const side = new THREE.Vector3(0, 0, 2.2).applyQuaternion(this.car.quaternion);
    this.walker.position.copy(this.car.position).add(side);
    this.walker.rotation.copy(this.car.rotation);
    this.carSpeed = 0;
    this.speed = 0;
  }

  // Arcade driving: accelerate, brake, steer, handbrake drift.
  updateDriving(dt, input) {
    const car = this.car;
    const topSpeed = 62; // world units/s, about 140 mph
    if (input.forward) this.carSpeed += 26 * dt;
    if (input.back) this.carSpeed -= this.carSpeed > 0.5 ? 34 * dt : 10 * dt;
    if (!input.forward && !input.back) this.carSpeed -= this.carSpeed * 0.6 * dt;
    if (input.handbrake) this.carSpeed -= this.carSpeed * 1.8 * dt;
    this.carSpeed = THREE.MathUtils.clamp(this.carSpeed, -12, topSpeed);
    const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const grip = input.handbrake ? 1.9 : 1.0;
    const turnRate = steer * 1.5 * grip * Math.min(1, Math.abs(this.carSpeed) / 12);
    this.heading += turnRate * dt * Math.sign(this.carSpeed || 1);
    car.rotation.y = this.heading;
    const forward = new THREE.Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading));
    car.position.addScaledVector(forward, this.carSpeed * dt);
    // Keep the car inside the city.
    car.position.x = THREE.MathUtils.clamp(car.position.x, -100, 92);
    car.position.z = THREE.MathUtils.clamp(car.position.z, -100, 24);
    for (const w of car.userData.wheels) w.rotation.z += (this.carSpeed * dt) / 0.38;
    this.speed = Math.abs(this.carSpeed) * 2.25; // units/s -> mph
  }

  updateOnFoot(dt, input) {
    const w = this.walker;
    const move = new THREE.Vector3();
    const fwd = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    if (input.forward) move.add(fwd);
    if (input.back) move.sub(fwd);
    if (input.right) move.add(right);
    if (input.left) move.sub(right);
    const running = input.handbrake;
    if (move.lengthSq() > 0) {
      move.normalize();
      const speed = running ? RUN_SPEED : WALK_SPEED;
      w.position.addScaledVector(move, speed * dt);
      w.rotation.y = Math.atan2(-move.z, move.x);
      const t = performance.now() / 1000;
      w.userData.legL.rotation.x = Math.sin(t * 9) * 0.6;
      w.userData.legR.rotation.x = -Math.sin(t * 9) * 0.6;
      this.speed = speed * 2.25;
    } else {
      w.userData.legL.rotation.x = 0;
      w.userData.legR.rotation.x = 0;
      this.speed = 0;
    }
    w.position.x = THREE.MathUtils.clamp(w.position.x, -100, 92);
    w.position.z = THREE.MathUtils.clamp(w.position.z, -100, 24);
  }

  // Third-person camera: low and close behind the car, higher on foot.
  updateCamera(camera, dt) {
    const target = this.position.clone();
    target.y += this.onFoot ? 1.6 : 1.4;
    const dist = this.onFoot ? 7 : this.cameraDistance;
    const yaw = this.onFoot ? this.cameraYaw : this.heading + Math.PI;
    const pitch = this.cameraPitch;
    const desired = new THREE.Vector3(
      target.x + Math.cos(yaw) * Math.cos(pitch) * dist,
      target.y + Math.sin(pitch) * dist + (this.onFoot ? 0.6 : 0.4),
      target.z - Math.sin(yaw) * Math.cos(pitch) * dist,
    );
    if (desired.y < 1.1) desired.y = 1.1;
    camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
    camera.lookAt(target);
  }

  // Snap the camera for a staged shot: exact position, exact look target.
  stageCamera(camera, pos, lookAt) {
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
  }
}

// Find the nearest drivable car to a point (stealing).
export function nearestCar(cars, pos, maxDist = 6) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    const d = car.position.distanceTo(pos);
    if (d < bestD) {
      best = car;
      bestD = d;
    }
  }
  return best;
}
