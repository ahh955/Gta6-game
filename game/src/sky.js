// Sky, sun, clouds, ocean, beach and the Ferris wheel for Solmar City 3D —
// the golden-hour backdrop that makes the street read as a sun-soaked coast.
import * as THREE from 'three';
import { makeCloudTexture, makeGlowTexture } from './textures.js';

const glowTexture = makeGlowTexture();

export function buildSky(rng, goldenHour = false, night = false) {
  const sky = new THREE.Group();

  // Gradient dome: deep blue overhead, warm haze at the horizon.
  // Night: a dark dome with a pale moon and stars instead of the sun.
  const topColor = night ? new THREE.Color(0x0a1230)
    : goldenHour ? new THREE.Color(0x3b5bdb) : new THREE.Color(0x2f7fd0);
  const horizonColor = night ? new THREE.Color(0x1c2b52)
    : goldenHour ? new THREE.Color(0xffb26b) : new THREE.Color(0xcfe9f7);
  const domeGeometry = new THREE.SphereGeometry(420, 24, 14);
  const positions = domeGeometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const t = Math.max(0, Math.min(1, (positions.getY(i) / 420 + 0.08) * 1.6));
    color.copy(horizonColor).lerp(topColor, Math.pow(t, 0.7));
    colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
  }
  domeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const dome = new THREE.Mesh(domeGeometry, new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false,
  }));
  dome.renderOrder = -10;
  sky.add(dome);

  // Sun disc + glow, low in the west for golden hour. At night it is a
  // pale moon, high and small, with a field of stars around it.
  const sunPosition = night ? new THREE.Vector3(120, 210, -260)
    : goldenHour ? new THREE.Vector3(-180, 42, -260) : new THREE.Vector3(-120, 150, -220);
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture, color: night ? 0xdbeafe : goldenHour ? 0xffd27a : 0xfff7cc, transparent: true,
    opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  sun.position.copy(sunPosition);
  sun.scale.set(night ? 42 : 90, night ? 42 : 90, 1);
  sky.add(sun);
  if (night) {
    for (let i = 0; i < 90; i++) {
      const star = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture, color: 0xffffff, transparent: true,
        opacity: rng.range(0.3, 0.9), depthWrite: false, fog: false,
      }));
      star.position.set(rng.range(-380, 380), rng.range(60, 340), rng.range(-380, 60));
      star.scale.set(rng.range(1.5, 3.5), rng.range(1.5, 3.5), 1);
      sky.add(star);
    }
  }

  // Puffy clouds, scattered high.
  const cloudTexture = makeCloudTexture(rng);
  for (let i = 0; i < 14; i++) {
    const cloud = new THREE.Sprite(new THREE.SpriteMaterial({
      map: cloudTexture, transparent: true, opacity: rng.range(0.55, 0.9),
      depthWrite: false, fog: false,
    }));
    cloud.position.set(
      rng.range(-280, 280), rng.range(55, 110), rng.range(-320, 60),
    );
    cloud.scale.set(rng.range(50, 110), rng.range(18, 34), 1);
    sky.add(cloud);
  }
  return { sky, sunPosition };
}

// Ocean plane with a sandy beach strip and umbrellas.
export function buildBeach(rng) {
  const beach = new THREE.Group();
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 500),
    new THREE.MeshStandardMaterial({ color: 0x0e7d9c, metalness: 0.25, roughness: 0.12 }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(140, -0.15, -80);
  beach.add(ocean);
  // Gentle swell lines: lighter translucent strips.
  for (let i = 0; i < 8; i++) {
    const swell = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 1.2),
      new THREE.MeshBasicMaterial({ color: 0xbfeef5, transparent: true, opacity: 0.25 }),
    );
    swell.rotation.x = -Math.PI / 2;
    swell.position.set(90 + rng.range(-20, 40), -0.05, -220 + i * 30 + rng.range(-6, 6));
    beach.add(swell);
  }
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 500),
    new THREE.MeshStandardMaterial({ color: 0xead9a8, roughness: 0.95 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(34, -0.05, -80);
  beach.add(sand);

  // Beach umbrellas + towels.
  const umbrellaColors = [0xef4444, 0x3b82f6, 0xf59e0b, 0xec4899, 0x22c55e];
  for (let i = 0; i < 12; i++) {
    const umbrella = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.6, roughness: 0.4 }),
    );
    pole.position.y = 1.1;
    umbrella.add(pole);
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(1.7, 0.7, 10),
      new THREE.MeshStandardMaterial({ color: rng.pick(umbrellaColors), roughness: 0.7, side: THREE.DoubleSide }),
    );
    canopy.position.y = 2.3;
    umbrella.add(canopy);
    umbrella.position.set(rng.range(16, 46), 0, rng.range(-160, 20));
    umbrella.rotation.y = rng.range(0, Math.PI * 2);
    beach.add(umbrella);
    const towel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 1.9),
      new THREE.MeshStandardMaterial({ color: rng.pick(umbrellaColors), roughness: 0.9 }),
    );
    towel.rotation.x = -Math.PI / 2;
    towel.position.set(umbrella.position.x + 1.6, 0.02, umbrella.position.z + 0.6);
    beach.add(towel);
  }
  return beach;
}

// Ferris wheel on the pier — the skyline anchor at the end of the boulevard.
export function buildFerrisWheel() {
  const wheel = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.5, roughness: 0.4 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xec4899, emissiveIntensity: 0.6 });

  // Support legs.
  for (const z of [2.2, -2.2]) {
    for (const s of [1, -1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 24, 8), frameMat);
      leg.position.set(s * 5, 11, z);
      leg.rotation.z = s * 0.22;
      wheel.add(leg);
    }
  }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5.4, 12), frameMat);
  axle.rotation.x = Math.PI / 2;
  axle.position.y = 22;
  wheel.add(axle);

  // The rotating wheel: two rims, spokes, gondolas.
  const rotor = new THREE.Group();
  rotor.position.y = 22;
  for (const z of [2, -2]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(19, 0.35, 8, 48), frameMat);
    rim.position.z = z;
    rotor.add(rim);
  }
  const gondolaColors = [0xef4444, 0x3b82f6, 0xf59e0b, 0x22c55e, 0xa855f7, 0xec4899];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 19, 6), frameMat);
    spoke.position.set(Math.cos(angle) * 9.5, Math.sin(angle) * 9.5, 0);
    spoke.rotation.z = angle + Math.PI / 2;
    rotor.add(spoke);
    const gondola = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.8, 1.6),
      new THREE.MeshStandardMaterial({ color: gondolaColors[i % gondolaColors.length], roughness: 0.5 }),
    );
    gondola.position.set(Math.cos(angle) * 19, Math.sin(angle) * 19, 0);
    rotor.add(gondola);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), accentMat);
    bulb.position.set(Math.cos(angle) * 19, Math.sin(angle) * 19, 2.1);
    rotor.add(bulb);
  }
  wheel.add(rotor);
  wheel.userData.rotor = rotor;
  return wheel;
}

export function updateFerrisWheel(wheel, dt) {
  wheel.userData.rotor.rotation.z += dt * 0.05;
}
