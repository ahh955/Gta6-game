// Solmar City 3D — combat: the weapon wheel, the cover system, gang AI,
// muzzle flashes and explosions.

import * as THREE from "three";
import { WEAPONS } from "./config.js";
import { makePed } from "./vehicles.js";

export class Combat {
  constructor(scene) {
    this.scene = scene;
    this.weapons = WEAPONS.map((w) => ({ ...w, owned: true }));
    this.selected = 3; // AR-77 Carbine
    this.inCover = false;
    this.wheelOpen = false;
    this.gang = [];
    this.flashes = [];
    this.explosions = [];
    this.lastShotAt = 0;
  }

  get currentWeapon() {
    return this.weapons[this.selected];
  }

  selectWeapon(index) {
    if (index >= 0 && index < this.weapons.length && this.weapons[index].owned) {
      this.selected = index;
    }
  }

  cycleWeapon(dir) {
    this.selectWeapon((this.selected + dir + this.weapons.length) % this.weapons.length);
  }

  // Fire the selected weapon: spend ammo, spawn a muzzle flash, and (for
  // the RPG) an explosion downrange.
  fire(from, direction) {
    const w = this.currentWeapon;
    if (w.ammo <= 0) return false;
    w.ammo--;
    this.lastShotAt = performance.now() / 1000;
    this.spawnMuzzleFlash(from, direction);
    if (w.id === "launcher") {
      const hit = from.clone().addScaledVector(direction, 14);
      hit.y = 0.5;
      this.spawnExplosion(hit);
    }
    return true;
  }

  spawnMuzzleFlash(from, direction) {
    const flash = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 1.4, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.95 }),
    );
    flash.position.copy(from).addScaledVector(direction, 1.2);
    flash.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    flash.rotation.z += Math.PI / 2;
    this.scene.add(flash);
    const light = new THREE.PointLight(0xffb020, 8, 9);
    light.position.copy(flash.position);
    this.scene.add(light);
    this.flashes.push({ mesh: flash, light, born: performance.now() / 1000 });
  }

  spawnExplosion(pos) {
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xff7b00, transparent: true, opacity: 0.95 }),
    );
    group.add(core);
    const inner = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.95 }),
    );
    group.add(inner);
    for (let i = 0; i < 5; i++) {
      const smoke = new THREE.Mesh(
        new THREE.SphereGeometry(0.8 + Math.random() * 0.7, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0x44403c, transparent: true, opacity: 0.7 }),
      );
      smoke.position.set((Math.random() - 0.5) * 2, 1 + Math.random() * 1.5, (Math.random() - 0.5) * 2);
      group.add(smoke);
    }
    const light = new THREE.PointLight(0xff6b00, 20, 22);
    light.position.y = 1.5;
    group.add(light);
    group.position.copy(pos);
    this.scene.add(group);
    this.explosions.push({ group, born: performance.now() / 1000 });
  }

  // Gang AI: rival crew members who take cover, peek and fire at the player.
  spawnGang(count, around, radius = 14) {
    for (let i = 0; i < count; i++) {
      const g = makePed(0x7c3aed, 0x111827);
      const a = (i / count) * Math.PI * 2;
      g.position.set(around.x + Math.cos(a) * radius, 0, around.z + Math.sin(a) * radius);
      g.userData.state = "advancing";
      g.userData.nextShot = 1 + Math.random() * 2;
      this.scene.add(g);
      this.gang.push(g);
    }
  }

  updateGang(dt, playerPos, time) {
    for (const g of this.gang) {
      const toPlayer = new THREE.Vector3().subVectors(playerPos, g.position);
      const dist = toPlayer.length();
      g.rotation.y = Math.atan2(-toPlayer.z, toPlayer.x);
      if (dist > 16) {
        g.userData.state = "advancing";
        toPlayer.normalize();
        g.position.addScaledVector(toPlayer, 3.2 * dt);
      } else if (dist < 9) {
        g.userData.state = "retreating";
        toPlayer.normalize();
        g.position.addScaledVector(toPlayer, -2.5 * dt);
      } else {
        g.userData.state = "firing";
        if (time > g.userData.nextShot) {
          g.userData.nextShot = time + 0.8 + Math.random() * 1.4;
          const from = g.position.clone();
          from.y = 1.4;
          this.spawnMuzzleFlash(from, toPlayer.clone().normalize());
        }
      }
    }
  }

  update(time) {
    // Muzzle flashes live a tenth of a second; explosions fade over 1.2s.
    this.flashes = this.flashes.filter((f) => {
      if (time - f.born > 0.12) {
        this.scene.remove(f.mesh, f.light);
        return false;
      }
      return true;
    });
    this.explosions = this.explosions.filter((e) => {
      const age = time - e.born;
      if (age > 1.4) {
        this.scene.remove(e.group);
        return false;
      }
      const s = 1 + age * 1.4;
      e.group.scale.setScalar(s);
      e.group.children.forEach((c) => {
        if (c.material && c.material.transparent) c.material.opacity = Math.max(0, 0.95 - age * 0.6);
      });
      return true;
    });
  }
}
