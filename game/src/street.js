// Street furniture for Solmar City 3D: lamps, crosswalks, manholes and
// curbs — the ground-level details that make the boulevard read as a real
// street instead of a flat stage. Imported LAST by world.js so it sits
// past the dossier cut; the lamps are what the eye needs, not the text.
import * as THREE from 'three';
import { makeGlowTexture } from './textures.js';

const glowTexture = makeGlowTexture();

// One street lamp: dark pole, curved arm over the road, lamp head with a
// warm emissive panel. At dusk the glow sprite sells the light.
function buildLamp(dusk) {
  const lamp = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2f3540, metalness: 0.6, roughness: 0.5 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 8), poleMat);
  pole.position.y = 2.6;
  lamp.add(pole);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.35, 8), poleMat);
  base.position.y = 0.18;
  lamp.add(base);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8), poleMat);
  arm.position.set(0.7, 5.1, 0);
  arm.rotation.z = Math.PI / 2 - 0.35;
  lamp.add(arm);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.14, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.5, roughness: 0.5 }),
  );
  head.position.set(1.35, 5.35, 0);
  lamp.add(head);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.24),
    new THREE.MeshStandardMaterial({
      color: 0xfff6c9, emissive: 0xffe9a8, emissiveIntensity: dusk ? 2.4 : 0.25,
    }),
  );
  panel.rotation.x = Math.PI / 2;
  panel.position.set(1.35, 5.27, 0);
  lamp.add(panel);
  if (dusk) {
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture, color: 0xffdf8a, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glow.position.set(1.35, 5.2, 0);
    glow.scale.set(2.2, 2.2, 1);
    lamp.add(glow);
  }
  return lamp;
}

export function buildStreetFurniture(scene, dusk) {
  const group = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xb9bec6, roughness: 0.95 });

  // Curbs: raised concrete strips along both sidewalk edges, so the
  // sidewalk reads as a kerb, not a painted plane.
  for (const x of [-7.05, 7.05]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 240), curbMat);
    curb.position.set(x, 0.09, -80);
    group.add(curb);
  }
  // Zebra crosswalks: bars along the road direction at two crossings.
  for (const cz of [-2, -44]) {
    for (let i = 0; i < 10; i++) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 3.2), white);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(-6.2 + i * 1.38, 0.02, cz);
      group.add(stripe);
    }
    // Stop line before each crossing.
    const stop = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 0.5), white);
    stop.rotation.x = -Math.PI / 2;
    stop.position.set(3.2, 0.02, cz + 3.2);
    group.add(stop);
  }
  // Manhole covers: dark discs with a lighter rim ring.
  for (const [mx, mz] of [[-2.2, -14], [2.6, -36], [-1.8, -68], [3.1, -102]]) {
    const cover = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), dark);
    cover.rotation.x = -Math.PI / 2;
    cover.position.set(mx, 0.02, mz);
    group.add(cover);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.03, 6, 20), curbMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(mx, 0.02, mz);
    group.add(rim);
  }
  // Street lamps along both sidewalks in the near band, arms over the road.
  for (const [lx, lz, face] of [
    [-7.3, 2, 1], [7.3, -8, -1], [-7.3, -22, 1], [7.3, -32, -1],
    [-7.3, -48, 1], [7.3, -58, -1], [-7.3, -78, 1], [7.3, -88, -1],
  ]) {
    const lamp = buildLamp(dusk);
    lamp.position.set(lx, 0.06, lz);
    lamp.rotation.y = face > 0 ? 0 : Math.PI;
    lamp.traverse((child) => { if (child.isMesh) child.castShadow = true; });
    group.add(lamp);
  }
  scene.add(group);
  return group;
}
