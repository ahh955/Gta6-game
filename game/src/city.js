// Solmar City 3D — the city: districts, buildings, roads, beach, ocean,
// palms, Ferris wheel, casino neon, sun and clouds. All geometry is built
// procedurally from boxes, cylinders and canvas textures.

import * as THREE from "three";

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// A facade texture: lit windows on a warm wall, drawn once on a canvas.
function makeFacadeTexture(base, lit) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  const rand = seededRandom(base.length * 7919 + lit.length * 31);
  for (let y = 10; y < 246; y += 22) {
    for (let x = 8; x < 120; x += 20) {
      const on = rand() > 0.45;
      g.fillStyle = on ? lit : "#1e293b";
      g.fillRect(x, y, 14, 14);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSignTexture(text, sub) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const g = c.getContext("2d");
  g.fillStyle = "#0f0520";
  g.fillRect(0, 0, 512, 160);
  g.font = "bold 64px Arial";
  g.textAlign = "center";
  g.shadowColor = "#ff2ea6";
  g.shadowBlur = 24;
  g.fillStyle = "#ffd7f2";
  g.fillText(text, 256, 78);
  g.font = "bold 30px Arial";
  g.shadowColor = "#22d3ee";
  g.shadowBlur = 16;
  g.fillStyle = "#cffafe";
  g.fillText(sub, 256, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSunGlowTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(128, 128, 4, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,240,200,1)");
  grad.addColorStop(0.25, "rgba(255,190,90,0.85)");
  grad.addColorStop(0.6, "rgba(255,140,60,0.35)");
  grad.addColorStop(1, "rgba(255,140,60,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCity(scene) {
  const rand = seededRandom(20261121);
  const city = new THREE.Group();
  city.name = "SolmarCity";
  scene.add(city);

  // Golden-hour sky: warm blue with haze at the horizon.
  scene.background = new THREE.Color(0x87b5e0);
  scene.fog = new THREE.Fog(0xc7d8ea, 90, 320);

  // Sun: low in the west, warm and long-shadowed.
  const sun = new THREE.DirectionalLight(0xffd9a0, 2.6);
  sun.position.set(-90, 38, 40);
  sun.castShadow = false;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x8a6f4d, 1.15));
  const bounce = new THREE.DirectionalLight(0xffe7c2, 0.5);
  bounce.position.set(60, 30, -40);
  scene.add(bounce);

  // Sun glow sprite low in the western sky.
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshBasicMaterial({
      map: makeSunGlowTexture(),
      transparent: true,
      depthWrite: false,
      fog: false,
    }),
  );
  glow.position.set(-160, 26, 60);
  glow.lookAt(0, 8, 0);
  city.add(glow);

  // Clouds: flat white puffs high up.
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
  for (let i = 0; i < 14; i++) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(rand() * 3);
    for (let p = 0; p < puffs; p++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(4 + rand() * 5, 8, 6), cloudMat);
      s.scale.y = 0.45;
      s.position.set(p * 6 - puffs * 3, rand() * 1.5, rand() * 3);
      cloud.add(s);
    }
    cloud.position.set(-140 + rand() * 260, 55 + rand() * 25, -120 + rand() * 200);
    city.add(cloud);
  }

  // Ground: city slab.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 420),
    new THREE.MeshLambertMaterial({ color: 0x7d8a6a }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  city.add(ground);

  // Ocean: east of the city and south of the boulevard.
  const oceanMat = new THREE.MeshLambertMaterial({ color: 0x1e7fa8 });
  const oceanEast = new THREE.Mesh(new THREE.PlaneGeometry(220, 420), oceanMat);
  oceanEast.rotation.x = -Math.PI / 2;
  oceanEast.position.set(200, 0.02, 0);
  city.add(oceanEast);
  const oceanSouth = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), oceanMat);
  oceanSouth.rotation.x = -Math.PI / 2;
  oceanSouth.position.set(-10, 0.02, 140);
  city.add(oceanSouth);

  // Beach sand: south strip and east strip.
  const sandMat = new THREE.MeshLambertMaterial({ color: 0xe8d29a });
  const sandSouth = new THREE.Mesh(new THREE.PlaneGeometry(220, 14), sandMat);
  sandSouth.rotation.x = -Math.PI / 2;
  sandSouth.position.set(-10, 0.01, 20);
  city.add(sandSouth);
  const sandEast = new THREE.Mesh(new THREE.PlaneGeometry(14, 220), sandMat);
  sandEast.rotation.x = -Math.PI / 2;
  sandEast.position.set(86, 0.01, -10);
  city.add(sandEast);

  // Roads: asphalt strips with pale centre dashes.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2b2f36 });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e });
  function road(x, z, w, l, alongX) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(alongX ? l : w, alongX ? w : l), roadMat);
    r.rotation.x = -Math.PI / 2;
    r.position.set(x, 0.05, z);
    city.add(r);
    const n = Math.floor((alongX ? l : w) / 6);
    for (let i = 0; i < n; i++) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(alongX ? 3 : 0.5, alongX ? 0.5 : 3), dashMat);
      d.rotation.x = -Math.PI / 2;
      d.position.set(
        alongX ? x - l / 2 + 3 + i * 6 : x,
        0.07,
        alongX ? z : z - l / 2 + 3 + i * 6,
      );
      city.add(d);
    }
  }
  // Solmar Boulevard (the main east-west drag) and the grid.
  road(0, 0, 13, 190, true);
  road(0, -45, 10, 190, true);
  road(0, -90, 10, 190, true);
  road(0, 45, 10, 190, true);
  road(-70, -25, 10, 150, false);
  road(-25, -25, 10, 150, false);
  road(20, -25, 10, 150, false);
  road(60, -25, 10, 150, false);

  // Sidewalks along the boulevard.
  const walkMat = new THREE.MeshLambertMaterial({ color: 0xb8b0a0 });
  for (const z of [-8.2, 8.2]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(190, 3.4), walkMat);
    w.rotation.x = -Math.PI / 2;
    w.position.set(0, 0.06, z);
    city.add(w);
  }

  // Buildings: dense blocks north of the boulevard, taller toward the strip.
  const facades = [
    makeFacadeTexture("#e8b98a", "#ffe9a8"),
    makeFacadeTexture("#c98d6b", "#ffe9a8"),
    makeFacadeTexture("#a8c4d8", "#fff3b0"),
    makeFacadeTexture("#d8a7b1", "#ffe9a8"),
    makeFacadeTexture("#9db08a", "#fff3b0"),
  ];
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x5a5148 });
  function building(x, z, w, d, h, tex) {
    const g = new THREE.Group();
    const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ map: tex }));
    walls.position.y = h / 2;
    g.add(walls);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.8, d + 0.6), roofMat);
    roof.position.y = h + 0.4;
    g.add(roof);
    // Rooftop AC boxes and water tanks for silhouette.
    if (rand() > 0.4) {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 2), roofMat);
      ac.position.set(w / 4, h + 1.4, 0);
      g.add(ac);
    }
    g.position.set(x, 0, z);
    city.add(g);
    return g;
  }
  const blocks = [];
  for (let bx = -88; bx <= 70; bx += 22) {
    for (let bz = -78; bz <= -16; bz += 20) {
      if (rand() < 0.12) continue; // occasional plaza gap
      blocks.push([bx + rand() * 4, bz + rand() * 4]);
    }
  }
  for (const [x, z] of blocks) {
    const nearStrip = x > 10 && z > -30;
    const h = nearStrip ? 22 + rand() * 26 : 8 + rand() * 18;
    building(x, z, 13 + rand() * 5, 11 + rand() * 4, h, facades[Math.floor(rand() * facades.length)]);
  }
  // A few low buildings south of the boulevard (beach bars, shops).
  for (let x = -80; x <= 60; x += 18) {
    if (rand() < 0.3) continue;
    building(x + rand() * 4, 13.5, 9 + rand() * 3, 6, 4.5 + rand() * 3, facades[Math.floor(rand() * facades.length)]);
  }

  // Coral Crown casino: the strip landmark, with a neon sign.
  const casino = building(34, -20, 22, 16, 20, facades[3]);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 6.2),
    new THREE.MeshBasicMaterial({ map: makeSignTexture("CORAL CROWN", "CASINO • HOTEL • VAULT"), fog: false }),
  );
  sign.position.set(34, 16, -11.6);
  city.add(sign);
  const sign2 = sign.clone();
  sign2.position.set(34, 16, -28.4);
  sign2.rotation.y = Math.PI;
  city.add(sign2);
  void casino;

  // Billboard on the boulevard.
  const billboard = new THREE.Group();
  const posts = new THREE.Mesh(new THREE.BoxGeometry(0.8, 9, 0.8), new THREE.MeshLambertMaterial({ color: 0x444444 }));
  posts.position.y = 4.5;
  billboard.add(posts);
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 5),
    new THREE.MeshBasicMaterial({ map: makeSignTexture("SOLMAR NIGHTS", "RACE • WIN • REPEAT"), fog: false }),
  );
  board.position.y = 11;
  billboard.add(board);
  billboard.position.set(-34, 0, -11.5);
  city.add(billboard);

  // Ferris wheel on the east pier. The rim, spokes and cabs live in a
  // spin group that turns around the wheel's axle (local Z).
  const wheel = new THREE.Group();
  const wheelSpin = new THREE.Group();
  wheel.add(wheelSpin);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(11, 0.5, 8, 40),
    new THREE.MeshLambertMaterial({ color: 0xff5da2, emissive: 0x881144 }),
  );
  wheelSpin.add(rim);
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(21.5, 0.35, 0.35), new THREE.MeshLambertMaterial({ color: 0xf8fafc }));
    spoke.rotation.z = (i * Math.PI) / 8;
    wheelSpin.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.4, 12), new THREE.MeshLambertMaterial({ color: 0xfbbf24 }));
  hub.rotation.x = Math.PI / 2;
  wheelSpin.add(hub);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.8, 1.6),
      new THREE.MeshLambertMaterial({ color: i % 2 ? 0x22d3ee : 0xfacc15 }),
    );
    cab.position.set(Math.cos(a) * 11, Math.sin(a) * 11, 0);
    wheelSpin.add(cab);
  }
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 13, 0.8), new THREE.MeshLambertMaterial({ color: 0x64748b }));
  legL.position.set(-4, -8, 0);
  legL.rotation.z = 0.3;
  wheel.add(legL);
  const legR = legL.clone();
  legR.position.x = 4;
  legR.rotation.z = -0.3;
  wheel.add(legR);
  wheel.position.set(84, 14.5, -14);
  wheel.rotation.y = Math.PI / 2;
  city.add(wheel);

  // Pier decking under the wheel.
  const pier = new THREE.Mesh(new THREE.BoxGeometry(22, 0.8, 8), new THREE.MeshLambertMaterial({ color: 0x8a6f4d }));
  pier.position.set(84, 0.4, -14);
  city.add(pier);

  // Palms: trunk + fronds, lining the boulevard and the beach.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x2f9e44, side: THREE.DoubleSide });
  function palm(x, z, scale = 1) {
    const p = new THREE.Group();
    p.name = "Palm"; // staging hides palms that would block a shot
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 6.5, 6), trunkMat);
    trunk.position.y = 3.25;
    trunk.rotation.z = (rand() - 0.5) * 0.25;
    p.add(trunk);
    for (let i = 0; i < 7; i++) {
      const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 4.2), frondMat);
      frond.position.y = 6.6;
      frond.rotation.y = (i / 7) * Math.PI * 2;
      frond.rotation.x = -0.9;
      frond.translateY(1.6);
      p.add(frond);
    }
    p.position.set(x, 0, z);
    p.scale.setScalar(scale);
    city.add(p);
  }
  for (let x = -92; x <= 76; x += 9) {
    palm(x, -10.2, 0.9 + rand() * 0.5);
    if (rand() > 0.25) palm(x + 4, 10.4, 0.9 + rand() * 0.5);
  }
  for (let x = -80; x <= 70; x += 14) {
    palm(x + rand() * 6, 17 + rand() * 4, 1 + rand() * 0.6);
  }

  // Street lamps along the boulevard (warm glow at golden hour).
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
  const lampGlow = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (let x = -88; x <= 72; x += 16) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), lampMat);
    pole.position.set(x, 3.5, -7.6);
    city.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lampGlow);
    bulb.position.set(x, 7.1, -7.6);
    city.add(bulb);
  }

  return { city, wheel, wheelSpin, rand };
}
