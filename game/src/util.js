// Solmar City — shared helpers: math, deterministic random, small utilities.
// Every module reads these; nothing here touches the DOM or the game state.

const Util = (() => {
  const TAU = Math.PI * 2;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function dist(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); }
  function dist2(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; }
  function angleTo(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); }

  // Shortest signed turn from angle a toward angle b, in (-PI, PI].
  function angleDiff(a, b) {
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  }

  // Deterministic mulberry32 RNG so the city layout is identical every load.
  function makeRng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function range(rng, lo, hi) { return lo + rng() * (hi - lo); }
  function intRange(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }

  function formatMoney(n) { return '$' + Math.floor(n).toLocaleString('en-US'); }
  function formatTime(sec) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // Point-in-rect test with an optional margin.
  function inRect(x, y, r, m) {
    m = m || 0;
    return x >= r.x - m && x <= r.x + r.w + m && y >= r.y - m && y <= r.y + r.h + m;
  }

  // Circle vs rect overlap, used for building collision.
  function circleRect(cx, cy, rad, r) {
    const nx = clamp(cx, r.x, r.x + r.w), ny = clamp(cy, r.y, r.y + r.h);
    return dist2(cx, cy, nx, ny) < rad * rad;
  }

  // Push a circle out of a rect; returns true when a push happened.
  function resolveCircleRect(p, rad, r) {
    const nx = clamp(p.x, r.x, r.x + r.w), ny = clamp(p.y, r.y, r.y + r.h);
    const dx = p.x - nx, dy = p.y - ny, d2 = dx * dx + dy * dy;
    if (d2 >= rad * rad) return false;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      p.x = nx + (dx / d) * rad;
      p.y = ny + (dy / d) * rad;
    } else {
      // Centre inside the rect: push out along the smallest penetration.
      const left = p.x - r.x, right = r.x + r.w - p.x;
      const top = p.y - r.y, bottom = r.y + r.h - p.y;
      const min = Math.min(left, right, top, bottom);
      if (min === left) p.x = r.x - rad;
      else if (min === right) p.x = r.x + r.w + rad;
      else if (min === top) p.y = r.y - rad;
      else p.y = r.y + r.h + rad;
    }
    return true;
  }

  return { TAU, clamp, lerp, dist, dist2, angleTo, angleDiff, makeRng, pick, range, intRange, formatMoney, formatTime, inRect, circleRect, resolveCircleRect };
})();
