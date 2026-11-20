// Solmar City — street races: five checkpoint races against three AI rivals,
// started at the Midnight Mile Race Hub. Placement pays cash and respect.

const Races = (() => {
  const RACES = [
    { id: 'beach', name: 'Beachfront Sprint', district: 'marina', laps: 1,
      checkpoints: [[300, 1900], [1100, 1900], [1900, 1900], [2700, 1900], [3100, 1500], [3100, 700]], prize: [800, 400, 150] },
    { id: 'downtown', name: 'Downtown Dash', district: 'downtown', laps: 1,
      checkpoints: [[2700, 300], [2700, 1100], [1900, 1100], [1900, 300], [3100, 300], [3100, 1100]], prize: [1000, 500, 200] },
    { id: 'harbor', name: 'Harbor Loop', district: 'harbor', laps: 1,
      checkpoints: [[3100, 1500], [2300, 1500], [2300, 1900], [3100, 1900], [2700, 1500]], prize: [1200, 600, 250] },
    { id: 'hills', name: 'Vista Hills Climb', district: 'hills', laps: 1,
      checkpoints: [[1500, 300], [700, 300], [700, 700], [1500, 700], [2300, 300], [2300, 700]], prize: [1500, 750, 300] },
    { id: 'grand', name: 'Solmar Grand Tour', district: 'palms', laps: 1,
      checkpoints: [[300, 300], [3100, 300], [3100, 1900], [300, 1900], [1500, 1100], [300, 1100]], prize: [2500, 1200, 500] },
  ];

  const RIVALS = [
    { name: 'Nina "Nitro" Vale', color: '#d94f9e', skill: 0.92 },
    { name: 'Rex Dalton', color: '#2f6fe8', skill: 0.85 },
    { name: 'Kiko Luna', color: '#7ec850', skill: 0.78 },
  ];

  let active = null;

  function getActive() { return active; }
  function byId(id) { return RACES.find(r => r.id === id); }

  function startRace(id) {
    const def = byId(id);
    if (!def) return;
    if (!G.player.inCar) { HUD.toast('You need a car to race — steal one first!', '#ffb347'); return; }
    const start = def.checkpoints[0];
    // Line everyone up at the first checkpoint.
    G.player.car.x = start[0]; G.player.car.y = start[1] + 60;
    G.player.car.angle = 0; G.player.car.speed = 0;
    G.player.x = start[0]; G.player.y = start[1] + 60;
    const rivals = RIVALS.map((r, i) => {
      const car = Vehicles.makeCar('sport', start[0] - 60, start[1] + 30 + i * 30, 0, { driver: 'racer', color: r.color });
      G.cars.push(car);
      return { name: r.name, skill: r.skill, car, cp: 1, finished: false, finishTime: 0 };
    });
    active = { def, cp: 1, time: 0, countdown: 3, rivals, finished: false, place: 0 };
    HUD.toast(def.name + ' — reach every checkpoint!', '#ffd23f');
    HUD.radioLine('RACE CONTROL: ' + def.name + '. Green flag in 3...');
    AudioSys.horn();
  }

  function update(dt) {
    if (!active) return;
    const r = active;
    if (r.countdown > 0) {
      r.countdown -= dt;
      if (r.countdown <= 0) { HUD.toast('GO!', '#7ec850'); AudioSys.horn(); }
      return;
    }
    r.time += dt;
    const p = G.player;
    // Player checkpoints.
    if (r.cp < r.def.checkpoints.length) {
      const [cx, cy] = r.def.checkpoints[r.cp];
      if (Util.dist(p.x, p.y, cx, cy) < 110) {
        r.cp++;
        AudioSys.pickup();
        if (r.cp >= r.def.checkpoints.length) finishPlayer();
        else HUD.toast('Checkpoint ' + r.cp + '/' + r.def.checkpoints.length, '#7ec850');
      }
    }
    // Rival AI: steer through checkpoints.
    for (const rv of r.rivals) {
      if (rv.finished) continue;
      const cp = r.def.checkpoints[Math.min(rv.cp, r.def.checkpoints.length - 1)];
      const car = rv.car;
      const want = Util.angleTo(car.x, car.y, cp[0], cp[1]);
      const steer = Util.clamp(Util.angleDiff(car.angle, want) * 2.4, -1, 1);
      Vehicles.drive(car, 1, steer, dt, false);
      car.speed = Math.min(car.speed, Vehicles.topSpeed(car) * rv.skill);
      if (Util.dist(car.x, car.y, cp[0], cp[1]) < 110) {
        rv.cp++;
        if (rv.cp >= r.def.checkpoints.length) {
          rv.finished = true; rv.finishTime = r.time;
          HUD.radioLine('RACE CONTROL: ' + rv.name + ' finished!');
        }
      }
    }
    // Timeout: 6 minutes.
    if (r.time > 360 && !r.finished) {
      HUD.toast('Race timed out.', '#ff5a3c');
      cancelRace();
    }
  }

  function finishPlayer() {
    const r = active;
    r.finished = true;
    const finishedBefore = r.rivals.filter(rv => rv.finished).length;
    r.place = finishedBefore + 1;
    const prize = r.def.prize[r.place - 1] || 0;
    const best = G.racesBest[r.def.id];
    const isRecord = !best || r.time < best;
    if (isRecord) G.racesBest[r.def.id] = r.time;
    if (prize > 0) {
      Economy.addCash(prize);
      Economy.addRespect(r.place === 1 ? 80 : r.place === 2 ? 40 : 20);
      HUD.showResult('RACE COMPLETE', r.def.name + '\nPlace: ' + r.place + ' of 4 · Time ' + Util.formatTime(r.time) +
        (isRecord ? '\nNEW RECORD!' : '') + '\nPrize: ' + Util.formatMoney(prize), '#7ec850');
      AudioSys.missionDone();
    } else {
      HUD.showResult('RACE OVER', r.def.name + '\nPlace: ' + r.place + ' of 4 · Time ' + Util.formatTime(r.time) +
        '\nNo prize this time — the podium pays.', '#ff5a3c');
      AudioSys.missionFail();
    }
    Save.saveGame();
    cleanupRivals();
    active = null;
  }

  function cancelRace() {
    cleanupRivals();
    active = null;
  }

  function cleanupRivals() {
    if (!active) return;
    for (const rv of active.rivals) {
      const idx = G.cars.indexOf(rv.car);
      if (idx >= 0) G.cars.splice(idx, 1);
    }
  }

  function draw(g) {
    if (!active) return;
    const r = active;
    // Checkpoint markers: next one big and gold, later ones small.
    for (let i = r.cp; i < r.def.checkpoints.length; i++) {
      const [cx, cy] = r.def.checkpoints[i];
      const next = i === r.cp;
      g.save();
      g.translate(cx, cy);
      g.fillStyle = next ? 'rgba(255,210,63,0.35)' : 'rgba(255,255,255,0.12)';
      g.beginPath(); g.arc(0, 0, next ? 90 : 60, 0, Util.TAU); g.fill();
      g.strokeStyle = next ? '#ffd23f' : 'rgba(255,255,255,0.5)';
      g.lineWidth = 3;
      g.setLineDash([10, 8]);
      g.beginPath(); g.arc(0, 0, next ? 90 : 60, 0, Util.TAU); g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#fff';
      g.font = 'bold 16px Arial'; g.textAlign = 'center';
      g.fillText(next ? 'NEXT' : '' + (i + 1), 0, 6);
      g.restore();
    }
    // Guide line from player to next checkpoint.
    if (r.cp < r.def.checkpoints.length) {
      const [cx, cy] = r.def.checkpoints[r.cp];
      g.strokeStyle = 'rgba(255,210,63,0.5)';
      g.lineWidth = 4;
      g.setLineDash([18, 14]);
      g.beginPath(); g.moveTo(G.player.x, G.player.y); g.lineTo(cx, cy); g.stroke();
      g.setLineDash([]);
    }
  }

  function drawRaceHud(g, vw) {
    if (!active) return;
    const r = active;
    g.save();
    g.textAlign = 'center';
    if (r.countdown > 0) {
      g.font = 'bold 90px Arial';
      g.fillStyle = '#ffd23f';
      g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 8;
      const n = Math.ceil(r.countdown);
      g.strokeText(n, vw / 2, 240);
      g.fillText(n, vw / 2, 240);
    }
    g.font = 'bold 18px Arial';
    g.fillStyle = '#fff';
    g.fillText(r.def.name.toUpperCase() + '  ·  CP ' + Math.min(r.cp, r.def.checkpoints.length) + '/' + r.def.checkpoints.length + '  ·  ' + Util.formatTime(r.time), vw / 2, 34);
    // Live standings.
    const rows = [{ name: 'YOU', cp: r.cp, finished: r.finished, t: r.time }].concat(r.rivals.map(rv => ({ name: rv.name, cp: rv.cp, finished: rv.finished, t: rv.finishTime })));
    rows.sort((a, b) => (b.finished - a.finished) || (b.cp - a.cp) || (a.t - b.t));
    g.font = '13px Arial';
    g.textAlign = 'left';
    rows.forEach((row, i) => {
      g.fillStyle = row.name === 'YOU' ? '#ffd23f' : '#fff';
      g.fillText((i + 1) + '. ' + row.name + (row.finished ? ' — DONE' : ' — CP ' + row.cp), 16, 120 + i * 20);
    });
    g.restore();
  }

  return { RACES, RIVALS, getActive, byId, startRace, update, cancelRace, draw, drawRaceHud };
})();
