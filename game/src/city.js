// Solmar City — the city itself: road grid, six districts, seeded buildings,
// landmarks (safehouse, garage, shops, pier), collision and ground rendering.

const City = (() => {
  const W = 3600, H = 2400;
  const ROAD_W = 96;
  const V_ROADS = [300, 700, 1100, 1500, 1900, 2300, 2700, 3100];
  const H_ROADS = [300, 700, 1100, 1500, 1900];
  const BEACH_Y = 2060, WATER_Y = 2270;

  const DISTRICTS = [
    { id: 'oldtown', name: 'Old Town', x: 0, y: 0, w: 1200, h: 800, color: '#e8d9b0' },
    { id: 'hills', name: 'Vista Hills', x: 1200, y: 0, w: 1200, h: 800, color: '#d9e2b8' },
    { id: 'downtown', name: 'Downtown', x: 2400, y: 0, w: 1200, h: 1200, color: '#d8d2e8' },
    { id: 'marina', name: 'Marina Bay', x: 0, y: 800, w: 1200, h: 1260, color: '#b8dfe8' },
    { id: 'palms', name: 'Palm Court', x: 1200, y: 800, w: 1200, h: 1260, color: '#f2d9b8' },
    { id: 'harbor', name: 'Harbor East', x: 2400, y: 1200, w: 1200, h: 860, color: '#cfd8dc' },
  ];

  const PALETTES = {
    oldtown: ['#d9a066', '#c98a5a', '#e0b184', '#b57e4e'],
    hills: ['#f2ead8', '#e8dcc0', '#d9c9a8', '#cbb894'],
    downtown: ['#8fa3c8', '#7d94bd', '#a8b8d4', '#6e86ad'],
    marina: ['#f5e6c8', '#e8d5a8', '#f0dcb0', '#dcc491'],
    palms: ['#e8b4a0', '#dfa08c', '#f0c8b4', '#d18a70'],
    harbor: ['#9fb2b8', '#8ba0a8', '#b0c0c6', '#7d939c'],
  };

  let buildings = [];
  let trees = [];
  let props = [];

  // Landmarks the player visits: fixed positions on the road grid.
  const LANDMARKS = {
    safehouse: { x: 500, y: 500, name: "Rosa's Safehouse", icon: 'H' },
    garage: { x: 1700, y: 900, name: 'Solmar Customs Garage', icon: 'G' },
    gunshop: { x: 2500, y: 500, name: 'Solmar Arms', icon: 'A' },
    diner: { x: 900, y: 1700, name: 'Sunset Diner', icon: 'D' },
    pier: { x: 300, y: 2150, name: 'Solmar Pier', icon: 'P' },
    raceHub: { x: 2100, y: 1700, name: 'Midnight Mile Race Hub', icon: 'R' },
    plaza: { x: 1700, y: 1300, name: 'Solmar Plaza', icon: 'S' },
  };

  function districtAt(x, y) {
    for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
    return DISTRICTS[4];
  }

  function isRoad(x, y) {
    for (const rx of V_ROADS) if (Math.abs(x - rx) < ROAD_W / 2 && y >= 0 && y <= H) return true;
    for (const ry of H_ROADS) if (Math.abs(y - ry) < ROAD_W / 2 && x >= 0 && x <= W) return true;
    return false;
  }

  function isWater(x, y) { return y > WATER_Y; }
  function isBeach(x, y) { return y > BEACH_Y && y <= WATER_Y; }

  function generate() {
    buildings = []; trees = []; props = [];
    const rng = Util.makeRng(20261120);
    // Buildings fill the blocks between roads; each block holds 1-4 buildings.
    const xs = [0].concat(V_ROADS).concat([W]);
    const ys = [0].concat(H_ROADS).concat([BEACH_Y]);
    for (let bi = 0; bi < xs.length - 1; bi++) {
      for (let bj = 0; bj < ys.length - 1; bj++) {
        const bx0 = xs[bi] + (bi === 0 ? 20 : ROAD_W / 2 + 14);
        const bx1 = xs[bi + 1] - (bi === xs.length - 2 ? 20 : ROAD_W / 2 + 14);
        const by0 = ys[bj] + (bj === 0 ? 20 : ROAD_W / 2 + 14);
        const by1 = ys[bj + 1] - (bj === ys.length - 2 ? 20 : ROAD_W / 2 + 14);
        const bw = bx1 - bx0, bh = by1 - by0;
        if (bw < 90 || bh < 90) continue;
        const cx = bx0 + bw / 2, cy = by0 + bh / 2;
        const d = districtAt(cx, cy);
        // Keep landmark lots and the plaza clear.
        let clear = false;
        for (const k in LANDMARKS) {
          const L = LANDMARKS[k];
          if (Math.abs(L.x - cx) < bw / 2 + 90 && Math.abs(L.y - cy) < bh / 2 + 90) { clear = true; break; }
        }
        if (clear) continue;
        const palette = PALETTES[d.id] || PALETTES.palms;
        const count = rng() < 0.45 ? 1 : (rng() < 0.6 ? 2 : 4);
        if (count === 1) {
          addBuilding(bx0 + 8, by0 + 8, bw - 16, bh - 16, palette, rng, d.id);
        } else if (count === 2) {
          const vertical = rng() < 0.5;
          if (vertical) {
            addBuilding(bx0 + 8, by0 + 8, bw / 2 - 14, bh - 16, palette, rng, d.id);
            addBuilding(bx0 + bw / 2 + 6, by0 + 8, bw / 2 - 14, bh - 16, palette, rng, d.id);
          } else {
            addBuilding(bx0 + 8, by0 + 8, bw - 16, bh / 2 - 14, palette, rng, d.id);
            addBuilding(bx0 + 8, by0 + bh / 2 + 6, bw - 16, bh / 2 - 14, palette, rng, d.id);
          }
        } else {
          const hw = bw / 2 - 12, hh = bh / 2 - 12;
          addBuilding(bx0 + 6, by0 + 6, hw, hh, palette, rng, d.id);
          addBuilding(bx0 + bw / 2 + 6, by0 + 6, hw, hh, palette, rng, d.id);
          addBuilding(bx0 + 6, by0 + bh / 2 + 6, hw, hh, palette, rng, d.id);
          addBuilding(bx0 + bw / 2 + 6, by0 + bh / 2 + 6, hw, hh, palette, rng, d.id);
        }
        // Palm trees along the block edges.
        const nTrees = Util.intRange(rng, 1, 4);
        for (let t = 0; t < nTrees; t++) {
          trees.push({ x: Util.range(rng, bx0, bx1), y: Util.range(rng, by0, by1), r: Util.range(rng, 7, 11) });
        }
      }
    }
    // Palm rows along the beachfront.
    for (let x = 60; x < W; x += 90) {
      if (rng() < 0.8) trees.push({ x: x + Util.range(rng, -20, 20), y: BEACH_Y + 40 + Util.range(rng, 0, 60), r: 10, beach: true });
    }
    // Crates and containers at the harbor.
    for (let i = 0; i < 26; i++) {
      props.push({ x: Util.range(rng, 2500, 3500), y: Util.range(rng, 1300, 1950), w: 34, h: 22, color: Util.pick(rng, ['#c96f4a', '#4a7d96', '#7d9b4a', '#b8a24a']), kind: 'crate' });
    }
  }

  function addBuilding(x, y, w, h, palette, rng, district) {
    const color = Util.pick(rng, palette);
    const tall = district === 'downtown' ? Util.intRange(rng, 2, 5) : Util.intRange(rng, 1, 2);
    buildings.push({ x, y, w, h, color, tall, roof: shade(color, -18), district });
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Util.clamp((n >> 16) + amt, 0, 255), g = Util.clamp(((n >> 8) & 255) + amt, 0, 255), b = Util.clamp((n & 255) + amt, 0, 255);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function collides(x, y, rad) {
    if (x < rad || y < rad || x > W - rad || y > H - rad) return true;
    if (isWater(x, y)) return true;
    for (const b of buildings) if (Util.circleRect(x, y, rad, b)) return true;
    for (const p of props) if (Util.circleRect(x, y, rad, p)) return true;
    return false;
  }

  function resolve(p, rad) {
    for (const b of buildings) Util.resolveCircleRect(p, rad, b);
    for (const pr of props) Util.resolveCircleRect(p, rad, pr);
    p.x = Util.clamp(p.x, rad, W - rad);
    p.y = Util.clamp(p.y, rad, WATER_Y - rad);
  }

  function nearestRoadPoint(x, y) {
    let best = null, bd = Infinity;
    for (const rx of V_ROADS) { const d = Math.abs(x - rx); if (d < bd) { bd = d; best = { x: rx, y }; } }
    for (const ry of H_ROADS) { const d = Math.abs(y - ry); if (d < bd) { bd = d; best = { x, y: ry }; } }
    return best;
  }

  function randomRoadPoint(rng) {
    if (rng() < 0.5) return { x: Util.pick(rng, V_ROADS), y: Util.range(rng, 100, BEACH_Y - 100), vertical: true };
    return { x: Util.range(rng, 100, W - 100), y: Util.pick(rng, H_ROADS), vertical: false };
  }

  // --- Rendering ---
  function drawGround(g, cam, vw, vh) {
    // Base ground: warm sun-baked pavement tones per district.
    g.fillStyle = '#e9dcc0';
    g.fillRect(cam.x, cam.y, vw, vh);
    for (const d of DISTRICTS) {
      g.fillStyle = d.color;
      g.fillRect(d.x, d.y, d.w, d.h);
    }
    // Beach sand and water.
    g.fillStyle = '#f2e2b8';
    g.fillRect(0, BEACH_Y, W, WATER_Y - BEACH_Y);
    const grad = g.createLinearGradient(0, WATER_Y, 0, H);
    grad.addColorStop(0, '#3fb8c9');
    grad.addColorStop(1, '#1d7fa8');
    g.fillStyle = grad;
    g.fillRect(0, WATER_Y, W, H - WATER_Y);
    // Water sparkle lines.
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 2;
    for (let i = 0; i < 24; i++) {
      const wy = WATER_Y + 14 + i * 5;
      const off = ((G.time * 12 + i * 37) % 120);
      g.beginPath();
      g.moveTo(off, wy); g.lineTo(off + 60, wy);
      g.stroke();
    }
    // Roads.
    g.fillStyle = '#3d3a38';
    for (const rx of V_ROADS) g.fillRect(rx - ROAD_W / 2, 0, ROAD_W, BEACH_Y + 60);
    for (const ry of H_ROADS) g.fillRect(0, ry - ROAD_W / 2, W, ROAD_W);
    // Road edge lines + centre dashes.
    g.strokeStyle = 'rgba(255,255,255,0.5)';
    g.lineWidth = 3;
    g.setLineDash([26, 22]);
    for (const rx of V_ROADS) {
      g.beginPath(); g.moveTo(rx, 0); g.lineTo(rx, BEACH_Y + 60); g.stroke();
    }
    for (const ry of H_ROADS) {
      g.beginPath(); g.moveTo(0, ry); g.lineTo(W, ry); g.stroke();
    }
    g.setLineDash([]);
    // Sidewalk tint around roads.
    g.strokeStyle = 'rgba(0,0,0,0.08)';
    g.lineWidth = 10;
    for (const rx of V_ROADS) { g.strokeRect(rx - ROAD_W / 2 - 5, 0, ROAD_W + 10, BEACH_Y + 60); }
    for (const ry of H_ROADS) { g.strokeRect(0, ry - ROAD_W / 2 - 5, W, ROAD_W + 10); }
    // Crosswalks at every intersection.
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (const rx of V_ROADS) for (const ry of H_ROADS) {
      for (let i = -2; i <= 2; i++) {
        g.fillRect(rx - ROAD_W / 2 + 8 + i * 16, ry - ROAD_W / 2 - 14, 9, 22);
        g.fillRect(rx - ROAD_W / 2 + 8 + i * 16, ry + ROAD_W / 2 - 8, 9, 22);
      }
    }
  }

  function drawBuildings(g, cam, vw, vh) {
    for (const b of buildings) {
      if (b.x + b.w < cam.x - 60 || b.x > cam.x + vw + 60 || b.y + b.h < cam.y - 60 || b.y > cam.y + vh + 60) continue;
      // Golden-hour shadow to the south-east.
      g.fillStyle = 'rgba(60,30,10,0.25)';
      g.fillRect(b.x + 8 + b.tall * 3, b.y + 10 + b.tall * 3, b.w, b.h);
      g.fillStyle = b.color;
      g.fillRect(b.x, b.y, b.w, b.h);
      g.fillStyle = b.roof;
      g.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      // Rooftop detail: AC units and skylights.
      g.fillStyle = 'rgba(0,0,0,0.18)';
      const n = Math.max(1, Math.floor((b.w * b.h) / 9000));
      for (let i = 0; i < n; i++) {
        const px = b.x + 12 + ((i * 53) % Math.max(20, b.w - 30));
        const py = b.y + 12 + ((i * 37) % Math.max(20, b.h - 30));
        g.fillRect(px, py, 12, 10);
      }
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      g.lineWidth = 2;
      g.strokeRect(b.x, b.y, b.w, b.h);
    }
    for (const p of props) {
      g.fillStyle = p.color;
      g.fillRect(p.x, p.y, p.w, p.h);
      g.strokeStyle = 'rgba(0,0,0,0.3)';
      g.strokeRect(p.x, p.y, p.w, p.h);
    }
    // Palm trees: trunk dot + frond star.
    for (const t of trees) {
      if (t.x < cam.x - 30 || t.x > cam.x + vw + 30 || t.y < cam.y - 30 || t.y > cam.y + vh + 30) continue;
      g.fillStyle = 'rgba(60,30,10,0.25)';
      g.beginPath(); g.ellipse(t.x + 6, t.y + 7, t.r + 2, t.r * 0.6, 0, 0, Util.TAU); g.fill();
      g.fillStyle = '#2f8f4e';
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Util.TAU + 0.3;
        g.beginPath();
        g.ellipse(t.x + Math.cos(a) * t.r * 0.7, t.y + Math.sin(a) * t.r * 0.7, t.r * 0.75, t.r * 0.32, a, 0, Util.TAU);
        g.fill();
      }
      g.fillStyle = '#7a5230';
      g.beginPath(); g.arc(t.x, t.y, 3, 0, Util.TAU); g.fill();
    }
  }

  function drawLandmarkMarkers(g) {
    for (const k in LANDMARKS) {
      const L = LANDMARKS[k];
      g.save();
      g.translate(L.x, L.y);
      const bob = Math.sin(G.time * 2 + L.x) * 3;
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.beginPath(); g.ellipse(0, 14, 16, 6, 0, 0, Util.TAU); g.fill();
      g.fillStyle = '#ffd23f';
      g.strokeStyle = '#7a4d00';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, -26 + bob); g.lineTo(14, -8 + bob); g.lineTo(-14, -8 + bob);
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#222';
      g.font = 'bold 13px Arial';
      g.textAlign = 'center';
      g.fillText(L.icon, 0, -11 + bob);
      g.restore();
    }
  }

  function drawDistrictLabel(g, cam, vw, vh) {
    const d = districtAt(G.player.x, G.player.y);
    if (!d) return;
    g.save();
    g.font = 'bold 15px Arial';
    g.textAlign = 'left';
    g.fillStyle = 'rgba(0,0,0,0.45)';
    const tw = g.measureText(d.name.toUpperCase()).width;
    g.fillRect(cam.x + vw - tw - 34, cam.y + vh - 44, tw + 20, 26);
    g.fillStyle = '#fff';
    g.fillText(d.name.toUpperCase(), cam.x + vw - tw - 24, cam.y + vh - 26);
    g.restore();
  }

  return { W, H, ROAD_W, V_ROADS, H_ROADS, BEACH_Y, WATER_Y, DISTRICTS, LANDMARKS, districtAt, isRoad, isWater, isBeach, generate, collides, resolve, nearestRoadPoint, randomRoadPoint, drawGround, drawBuildings, drawLandmarkMarkers, drawDistrictLabel, get buildings() { return buildings; }, get trees() { return trees; } };
})();
