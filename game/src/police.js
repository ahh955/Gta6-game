// Solmar City 3D — the Solmar PD: wanted stars, dispatch units, pursuits,
// PIT maneuvers, roadblocks and the police helicopter.

import * as THREE from "three";
import { makeCruiser, makeHelicopter, aimSpotlight, flashLights, spinRotors } from "./vehicles.js";
import { DISPATCH_UNITS } from "./config.js";

export class Police {
  constructor(scene) {
    this.scene = scene;
    this.stars = 0;
    this.searchTimer = 0;
    this.cruisers = [];
    this.heli = null;
    this.roadblocks = [];
    this.dispatch = DISPATCH_UNITS.map((u) => ({ ...u }));
  }

  setWanted(stars) {
    this.stars = THREE.MathUtils.clamp(stars, 0, 5);
    this.syncForce();
  }

  addHeat(amount) {
    this.setWanted(this.stars + amount);
  }

  // Match the visible police force to the wanted level: cruisers from 1
  // star, PIT and roadblocks from 3, the helicopter from 4.
  syncForce() {
    const wantCruisers = this.stars === 0 ? 0 : Math.min(2 + this.stars, 6);
    while (this.cruisers.length < wantCruisers) {
      const c = makeCruiser();
      this.scene.add(c);
      this.cruisers.push(c);
    }
    while (this.cruisers.length > wantCruisers) {
      const c = this.cruisers.pop();
      this.scene.remove(c);
    }
    if (this.stars >= 4 && !this.heli) {
      this.heli = makeHelicopter();
      this.scene.add(this.heli);
    }
    if (this.stars < 4 && this.heli) {
      this.scene.remove(this.heli);
      if (this.heli.userData.cone.parent) this.scene.remove(this.heli.userData.cone);
      if (this.heli.userData.pool.parent) this.scene.remove(this.heli.userData.pool);
      this.heli = null;
    }
    this.syncRoadblocks();
  }

  syncRoadblocks() {
    const want = this.stars >= 3 ? 1 : 0;
    while (this.roadblocks.length < want) {
      const block = new THREE.Group();
      for (const [x, angle] of [[-2.2, 0.5], [2.2, -0.5]]) {
        const c = makeCruiser();
        c.position.set(x, 0, 0);
        c.rotation.y = Math.PI / 2 + angle;
        block.add(c);
      }
      const barrierMat = new THREE.MeshLambertMaterial({ color: 0xf97316 });
      for (const x of [-4.5, 0, 4.5]) {
        const barrier = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 0.4), barrierMat);
        barrier.position.set(x, 0.5, 1.5);
        block.add(barrier);
      }
      this.scene.add(block);
      this.roadblocks.push(block);
    }
    while (this.roadblocks.length > want) {
      const b = this.roadblocks.pop();
      this.scene.remove(b);
    }
  }

  // Place the pursuit around the player: cruisers trailing, the heli above
  // and ahead, the roadblock further down the road.
  stagePursuit(playerPos, heading, opts = {}) {
    const fwd = new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading));
    const side = new THREE.Vector3(-fwd.z, 0, fwd.x);
    this.cruisers.forEach((c, i) => {
      const back = 7 + i * 4.5;
      const lat = (i % 2 === 0 ? -1 : 1) * (1.2 + (i % 3) * 0.8);
      c.position.copy(playerPos).addScaledVector(fwd, -back).addScaledVector(side, lat);
      c.rotation.y = heading;
    });
    if (this.heli) {
      this.heli.position.copy(playerPos).addScaledVector(fwd, opts.heliAhead ?? 8).addScaledVector(side, opts.heliSide ?? -7);
      this.heli.position.y = opts.heliHeight ?? 13;
      this.heli.rotation.y = heading + Math.PI / 2;
    }
    if (this.roadblocks.length > 0) {
      const rb = this.roadblocks[0];
      rb.position.copy(playerPos).addScaledVector(fwd, opts.roadblockAhead ?? 30);
      rb.rotation.y = heading;
    }
  }

  // Live pursuit: cruisers chase the player's position, ramming at close
  // range; the heli circles above and keeps its spotlight on the player.
  update(dt, time, playerPos, playerHeading) {
    const fwd = new THREE.Vector3(Math.cos(playerHeading), 0, -Math.sin(playerHeading));
    this.cruisers.forEach((c, i) => {
      flashLights(c, time + i * 0.7);
      const target = playerPos.clone().addScaledVector(fwd, -(6 + i * 4));
      const to = new THREE.Vector3().subVectors(target, c.position);
      to.y = 0;
      const dist = to.length();
      if (dist > 0.5) {
        const desired = Math.atan2(-to.z, to.x);
        let diff = desired - c.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        c.rotation.y += THREE.MathUtils.clamp(diff, -2.2 * dt, 2.2 * dt);
        // PIT: at 3+ stars the lead cruiser pulls alongside and rams.
        const speed = this.stars >= 3 && i === 0 && dist < 9 ? 26 : Math.min(24, dist * 1.5 + 6);
        c.position.addScaledVector(new THREE.Vector3(Math.cos(c.rotation.y), 0, -Math.sin(c.rotation.y)), speed * dt);
      }
      for (const w of c.userData.wheels) w.rotation.z += (20 * dt) / 0.38;
    });
    if (this.heli) {
      spinRotors(this.heli, dt);
      const orbit = time * 0.25;
      const target = playerPos.clone();
      target.x += Math.cos(orbit) * 9;
      target.z += Math.sin(orbit) * 9;
      target.y = 13 + Math.sin(time * 0.5) * 0.8;
      this.heli.position.lerp(target, 1 - Math.pow(0.05, dt));
      this.heli.rotation.y = Math.atan2(-(playerPos.z - this.heli.position.z), playerPos.x - this.heli.position.x) + Math.PI / 2;
      aimSpotlight(this.scene, this.heli, playerPos);
    }
    // Dispatch distances drift as units close in or fall back.
    for (const u of this.dispatch) {
      u.distance = Math.max(0.1, u.distance + (Math.sin(time * 0.3 + u.callsign.length) * 0.02 - 0.005) * dt * 10);
    }
    // Wanted decay: stay out of sight and the heat cools off.
    if (this.stars > 0) {
      this.searchTimer += dt;
      if (this.searchTimer > 45) {
        this.setWanted(this.stars - 1);
        this.searchTimer = 0;
      }
    }
  }

  resetSearchTimer() {
    this.searchTimer = 0;
  }
}
