// Painted character portraits for Solmar City 3D: procedural canvas
// portraits — a face per character, drawn from a small feature set (skin,
// hair, eyes, mouth, shirt, background) so every crew member, contact and
// rival has a real face instead of a letter avatar. Used in the HUD
// dialogue bar, the crew panel, the CREW tab and the dialogue screens.
// Deterministic: the same character always draws the same face.
export const CHARACTERS = {
  vex: { name: 'VEX', skin: '#d9a066', hair: '#1f2937', hairStyle: 'short', shirt: '#374151', bg: '#1e293b', accent: '#facc15' },
  vera: { name: 'VERA', skin: '#f2c89b', hair: '#7c2d12', hairStyle: 'bun', shirt: '#7c3aed', bg: '#2e1065', accent: '#f9a8d4' },
  rosa: { name: 'ROSA', skin: '#a0663a', hair: '#111827', hairStyle: 'long', shirt: '#0d9488', bg: '#134e4a', accent: '#2dd4bf' },
  dez: { name: 'DEZ', skin: '#8a5632', hair: '#000000', hairStyle: 'fade', shirt: '#b45309', bg: '#451a03', accent: '#f59e0b' },
  pip: { name: 'PIP', skin: '#f7d7b0', hair: '#facc15', hairStyle: 'mohawk', shirt: '#6d28d9', bg: '#2e1065', accent: '#a78bfa' },
  voss: { name: 'VOSS', skin: '#e8b98a', hair: '#78716c', hairStyle: 'slick', shirt: '#0f172a', bg: '#111827', accent: '#ef4444' },
};

export function getCharacter(id) {
  return CHARACTERS[id] || CHARACTERS.vex;
}

// Draw a portrait into a <canvas> (any size — the art scales to it).
export function drawPortrait(canvas, characterId) {
  const c = getCharacter(characterId);
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const u = Math.min(w, h) / 100; // one unit = 1% of the short side
  ctx.clearRect(0, 0, w, h);

  // Background + halo ring.
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = c.accent;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.46, 38 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Shoulders / shirt.
  ctx.fillStyle = c.shirt;
  ctx.beginPath();
  ctx.moveTo(w * 0.12, h);
  ctx.quadraticCurveTo(w * 0.2, h * 0.74, w * 0.5, h * 0.74);
  ctx.quadraticCurveTo(w * 0.8, h * 0.74, w * 0.88, h);
  ctx.closePath();
  ctx.fill();

  // Neck + face.
  ctx.fillStyle = c.skin;
  ctx.fillRect(w * 0.44, h * 0.58, w * 0.12, h * 0.18);
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.42, 26 * u, 30 * u, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair by style.
  ctx.fillStyle = c.hair;
  if (c.hairStyle === 'long') {
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.3, 30 * u, 26 * u, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(w * 0.2, h * 0.28, 7 * u, 42 * u);
    ctx.fillRect(w * 0.73, h * 0.28, 7 * u, 42 * u);
  } else if (c.hairStyle === 'bun') {
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.26, 26 * u, 16 * u, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.12, 9 * u, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.hairStyle === 'mohawk') {
    ctx.beginPath();
    ctx.moveTo(w * 0.42, h * 0.24);
    ctx.lineTo(w * 0.5, h * 0.02);
    ctx.lineTo(w * 0.58, h * 0.24);
    ctx.closePath();
    ctx.fill();
  } else if (c.hairStyle === 'fade') {
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.24, 24 * u, 12 * u, 0, Math.PI, 0);
    ctx.fill();
  } else if (c.hairStyle === 'slick') {
    ctx.beginPath();
    ctx.ellipse(w * 0.54, h * 0.24, 24 * u, 12 * u, 0.15, Math.PI, 0);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.26, 27 * u, 15 * u, 0, Math.PI, 0);
    ctx.fill();
  }

  // Eyes + brows + mouth.
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.ellipse(w * 0.4, h * 0.42, 3.4 * u, 4.4 * u, 0, 0, Math.PI * 2);
  ctx.ellipse(w * 0.6, h * 0.42, 3.4 * u, 4.4 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(w * 0.41, h * 0.405, 1.2 * u, 0, Math.PI * 2);
  ctx.arc(w * 0.61, h * 0.405, 1.2 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c.hair;
  ctx.lineWidth = 2.2 * u;
  ctx.beginPath();
  ctx.moveTo(w * 0.34, h * 0.34);
  ctx.lineTo(w * 0.46, h * 0.325);
  ctx.moveTo(w * 0.54, h * 0.325);
  ctx.lineTo(w * 0.66, h * 0.34);
  ctx.stroke();
  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 2.4 * u;
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.56, 9 * u, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  return canvas;
}
