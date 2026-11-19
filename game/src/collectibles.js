// Solmar City — twelve golden doubloons hidden around the city. Each is
// worth $100, and collecting all twelve pays a $1,000 bonus.

import { CFG } from './config.js';

function pointInBuilding(world, x, y) {
  for (const b of world.buildings) {
    if (x >= b.x - 6 && x <= b.x + b.w + 6 && y >= b.y - 6 && y <= b.y + b.h + 6) return true;
  }
  return false;
}

// Nudge a spot until it is not inside a building (alley spots can land on
// one, since the building layout is random).
function clearSpot(world, x, y) {
  let px = x;
  let py = y;
  for (let attempt = 0; attempt < 24 && pointInBuilding(world, px, py); attempt += 1) {
    px += 41;
    if (px > x + 160) {
      px = x;
      py += 47;
    }
  }
  return { x: px, y: py };
}

export function createDoubloons(world, save) {
  const park = world.park;
  const plaza = world.plaza;
  const rawSpots = [
    { x: park.cx - 60, y: park.cy + 24 },
    { x: park.cx + 52, y: park.y + 30 },
    { x: park.cx - 24, y: park.y + park.h - 30 },
    { x: CFG.beachX + 120, y: 300 },
    { x: CFG.beachX + 180, y: 1500 },
    { x: world.piers[0].x + 30, y: world.piers[0].y + world.piers[0].h - 24 },
    { x: world.piers[2].x + 30, y: world.piers[2].y + world.piers[2].h - 24 },
    clearSpot(world, world.avenues[1] + 150, world.streets[1] + 150),
    clearSpot(world, world.avenues[5] + 150, world.streets[3] + 150),
    clearSpot(world, world.avenues[0] + 150, world.streets[4] + 150),
    { x: plaza.cx, y: plaza.cy },
    clearSpot(world, world.avenues[6] + 120, world.streets[0] + 120),
  ];
  return rawSpots.map((spot, i) => ({
    x: spot.x,
    y: spot.y,
    taken: save.doubloons.includes(i),
    bobPhase: i * 0.7,
    index: i,
  }));
}

export function doubloonsCollected(game) {
  return game.doubloons.filter((d) => d.taken).length;
}

export function updateDoubloons(game, dt) {
  const player = game.player;
  for (const coin of game.doubloons) {
    if (coin.taken) continue;
    coin.bobPhase += dt * 3;
    if (Math.hypot(player.x - coin.x, player.y - coin.y) < 32) {
      coin.taken = true;
      game.save.doubloons.push(coin.index);
      game.save.cash += CFG.doubloonValue;
      game.save.totalEarned += CFG.doubloonValue;
      game.audio.coin();
      const count = doubloonsCollected(game);
      if (count >= CFG.doubloonCount) {
        game.save.cash += CFG.doubloonBonus;
        game.save.totalEarned += CFG.doubloonBonus;
        game.audio.missionDone();
        game.message(`All ${CFG.doubloonCount} doubloons! +$${CFG.doubloonBonus} bonus!`);
      } else {
        game.message(`Doubloon! +$${CFG.doubloonValue} (${count} / ${CFG.doubloonCount})`);
      }
    }
  }
}
