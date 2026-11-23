// Procedural canvas textures for Solmar City 3D. Everything is drawn at
// runtime — the game ships no image files, so it loads with zero network.
import * as THREE from 'three';

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Building facade: rows of windows, a share of them lit warm.
export function makeFacadeTexture(baseColor, floors, litRatio, rng) {
  return canvasTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = baseColor; ctx.fillRect(0, 0, w, h);
    // subtle vertical shading
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.18)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    grad.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    const cols = 4, rows = floors;
    const cellW = w / cols, cellH = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Round 9: three window states instead of two — warm lit, cool
        // blue glass, dark — so the facade reads varied, not a yellow grid.
        const roll = rng.next();
        const state = roll < litRatio ? 'lit' : (roll < litRatio + 0.25 ? 'blue' : 'dark');
        ctx.fillStyle = state === 'lit' ? '#ffd166' : (state === 'blue' ? '#2b4a63' : '#1d2b3a');
        ctx.fillRect(c * cellW + 5, r * cellH + 6, cellW - 10, cellH - 12);
        if (state === 'lit') {
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(c * cellW + 5, r * cellH + 6, cellW - 10, 3);
        } else if (state === 'blue') {
          ctx.fillStyle = 'rgba(255,255,255,0.22)';
          ctx.fillRect(c * cellW + 5, r * cellH + 6, cellW - 10, 4);
        }
      }
      // Floor separator line: breaks the flat grid into readable storeys.
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(0, r * cellH, w, 2);
    }
    // ground-floor shopfront band
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, h - 26, w, 26);
    ctx.fillStyle = '#bfe9ff'; ctx.fillRect(6, h - 22, w - 12, 14);
  });
}

// Neon shop / casino sign with big readable text.
export function makeSignTexture(text, bg, fg, sub) {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = fg; ctx.lineWidth = 6; ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${sub ? 52 : 64}px Arial, sans-serif`;
    ctx.fillText(text, w / 2, sub ? h / 2 - 16 : h / 2);
    if (sub) {
      ctx.font = '700 26px Arial, sans-serif';
      ctx.fillText(sub, w / 2, h / 2 + 34);
    }
  });
}

// Striped awning over a shopfront.
export function makeAwningTexture(colorA, colorB) {
  return canvasTexture(128, 64, (ctx, w, h) => {
    for (let x = 0; x < w; x += 16) {
      ctx.fillStyle = (x / 16) % 2 === 0 ? colorA : colorB;
      ctx.fillRect(x, 0, 16, h);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0, h - 10, w, 10);
  });
}

// Asphalt tile: double yellow centre line, white dashes, edge lines.
export function makeRoadTexture() {
  const texture = canvasTexture(256, 256, (ctx, w, h) => {
    // Round 9: lighter asphalt — the top entries' roads read light grey in
    // the sun, and the dark round-8 road dragged the whole scene down.
    ctx.fillStyle = '#4c5058'; ctx.fillRect(0, 0, w, h);
    // asphalt speckle
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    // centre double yellow
    ctx.fillStyle = '#eab308';
    ctx.fillRect(w / 2 - 7, 0, 5, h); ctx.fillRect(w / 2 + 2, 0, 5, h);
    // lane dashes
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(w / 4 - 2, 20, 4, 90); ctx.fillRect((3 * w) / 4 - 2, 20, 4, 90);
    ctx.fillRect(w / 4 - 2, 150, 4, 90); ctx.fillRect((3 * w) / 4 - 2, 150, 4, 90);
    // edge lines
    ctx.fillRect(4, 0, 4, h); ctx.fillRect(w - 8, 0, 4, h);
  });
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function makeSidewalkTexture() {
  const texture = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#9aa0a6'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 3;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Police door decal: POLICE + unit number, for cruiser sides.
export function makePoliceDecalTexture(unit) {
  return canvasTexture(256, 96, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0f172a'; ctx.textAlign = 'center';
    ctx.font = '900 44px Arial, sans-serif';
    ctx.fillText('POLICE', w / 2, 48);
    ctx.font = '700 26px Arial, sans-serif';
    ctx.fillText('SOLMAR PD · ' + unit, w / 2, 82);
  });
}

export function makePlateTexture(text) {
  return canvasTexture(128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 5; ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = '#0f172a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 34px Arial, sans-serif';
    ctx.fillText(text, w / 2, h / 2 + 2);
  });
}

// Soft round glow sprite (sun, headlights, light bars, muzzle flash).
export function makeGlowTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  });
}

// Beach sand: warm base with darker grains and a few pale shells, so the
// beach reads as sand, not a beige plane.
export function makeSandTexture() {
  const texture = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#ead9a8'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(120,90,40,0.16)' : 'rgba(255,250,230,0.20)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,240,220,0.8)' : 'rgba(200,160,140,0.7)';
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Puffy cloud sprite.
export function makeCloudTexture(rng) {
  return canvasTexture(256, 128, (ctx) => {
    for (let i = 0; i < 14; i++) {
      const x = 40 + rng.next() * 176, y = 45 + rng.next() * 40, r = 18 + rng.next() * 26;
      const grad = ctx.createRadialGradient(x, y, 2, x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.85)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  });
}
