// Solmar City — story missions: nine jobs with a named cast, told in steps
// (drive to a marker, clear enemies, hack terminals, survive, escape).
// Completing a job pays cash, respect and unlocks the next one.

const Missions = (() => {
  // Cast: Rico "Dare" Solis (you), Rosa Vega (auntie, safehouse), Maya Reyes,
  // Ghost Tanaka, Big Lou Marín, and the Viper boss, Silas Vane.
  const DEFS = [
    { id: 'm1', name: 'Welcome to Solmar', giver: 'Rosa Vega', reward: 300, respect: 60,
      brief: 'Rosa: "Dare, you are home. My house is your house — drive over and let me see your face."',
      steps: [
        { type: 'goto', x: 500, y: 500, text: 'Drive to Rosa\'s Safehouse' },
        { type: 'talk', text: 'Rosa: "The Vipers run the east side now. We take our city back — one job at a time."' },
      ] },
    { id: 'm2', name: 'Wheels for Maya', giver: 'Maya Reyes', reward: 600, respect: 100,
      brief: 'Maya: "I need a Viento GT for a job. There is one parked near the Marina. Bring it to the garage — and try not to scratch it."',
      steps: [
        { type: 'steal', model: 'sport', x: 700, y: 1700, text: 'Steal the Viento GT near the Marina' },
        { type: 'deliver', x: 1700, y: 900, text: 'Deliver the Viento GT to Solmar Customs Garage' },
      ],
      onComplete: () => Crew.recruit('maya') },
    { id: 'm3', name: 'Ghost in the Machine', giver: 'Ghost Tanaka', reward: 800, respect: 120,
      brief: 'Ghost: "SPD cameras watch every corner. Hack three of their relay boxes downtown and I can blind them — but the cops will notice."',
      steps: [
        { type: 'hack', points: [[2700, 300], [3100, 700], [2300, 700]], text: 'Hack the SPD relay boxes (hold E)' },
        { type: 'escape', text: 'Lose the cops — get your wanted level to zero' },
      ],
      onComplete: () => Crew.recruit('ghost') },
    { id: 'm4', name: "Lou's Last Stand", giver: 'Big Lou Marín', reward: 1000, respect: 150,
      brief: 'Lou: "The Vipers cornered me at the plaza! I need backup NOW — bring a gun and use the walls for cover."',
      steps: [
        { type: 'goto', x: 1700, y: 1300, text: 'Reach Solmar Plaza' },
        { type: 'kill', count: 8, spawn: [[1700, 1300]], text: 'Defend Lou — take out 8 Vipers (C = cover)' },
      ],
      onComplete: () => Crew.recruit('lou') },
    { id: 'm5', name: 'Harbor Heist', giver: 'Rosa Vega', reward: 1400, respect: 180,
      brief: 'Rosa: "A Viper shipment sits at Harbor East. Grab the crates, load them in a van and bring them home. Quietly, if you can."',
      steps: [
        { type: 'goto', x: 2900, y: 1700, text: 'Reach the Harbor East docks' },
        { type: 'collect', points: [[2900, 1500], [3100, 1700], [2700, 1900]], text: 'Grab the 3 Viper crates (walk over them)' },
        { type: 'deliver', x: 500, y: 500, text: 'Bring the goods back to the Safehouse' },
      ] },
    { id: 'm6', name: 'The Marina Run', giver: 'Maya Reyes', reward: 1200, respect: 150,
      brief: 'Maya: "A buyer waits at the pier in 90 seconds. Drive like the tide is chasing you — because the Vipers are."',
      steps: [
        { type: 'timed', x: 300, y: 2150, seconds: 90, text: 'Reach Solmar Pier in 90 seconds' },
      ] },
    { id: 'm7', name: 'Roadblock Runner', giver: 'Ghost Tanaka', reward: 1600, respect: 200,
      brief: 'Ghost: "I leaked a fake tip — SPD thinks you robbed the bank. Roadblocks are up everywhere. Get home and lay low."',
      steps: [
        { type: 'wanted', stars: 3, text: 'SPD is on you — survive the heat' },
        { type: 'escape', text: 'Shake the cops and reach the Safehouse' },
        { type: 'goto', x: 500, y: 500, text: 'Reach the Safehouse' },
      ] },
    { id: 'm8', name: "The Kingpin's Gambit", giver: 'Rosa Vega', reward: 2500, respect: 300,
      brief: 'Rosa: "Silas Vane runs the Vipers from the old casino downtown. End it, Dare. Take his lieutenants, then take him."',
      steps: [
        { type: 'goto', x: 2700, y: 500, text: 'Reach the old casino in Downtown' },
        { type: 'kill', count: 6, spawn: [[2700, 500]], text: 'Clear Vane\'s lieutenants' },
        { type: 'boss', name: 'Silas Vane', x: 2700, y: 500, text: 'Defeat Silas Vane' },
      ] },
    { id: 'm9', name: 'Solmar Sunrise', giver: 'Rosa Vega', reward: 5000, respect: 500,
      brief: 'Rosa: "One last run, Dare. The Vipers\' money boat leaves from the pier at dawn. Take the money, lose the cops, and come home a legend."',
      steps: [
        { type: 'goto', x: 300, y: 2150, text: 'Reach Solmar Pier' },
        { type: 'kill', count: 6, spawn: [[300, 2150]], text: 'Take the pier from the Vipers' },
        { type: 'escape', text: 'CONDOR-1 is up — lose the cops' },
        { type: 'goto', x: 500, y: 500, text: 'Come home to the Safehouse' },
      ] },
  ];

  let current = null; // { def, stepIdx, data }
  let markers = [];

  function byId(id) { return DEFS.find(d => d.id === id); }
  function nextMission() { return DEFS.find(d => !G.missionsDone.includes(d.id)); }
  function getCurrent() { return current; }
  function isDone(id) { return G.missionsDone.includes(id); }

  // Mission start markers live around the city; the next job's marker is gold.
  function startMarkers() {
    const next = nextMission();
    if (!next) return [];
    const spots = {
      m1: [500, 500], m2: [900, 1700], m3: [2500, 700], m4: [1700, 1300],
      m5: [2900, 1500], m6: [2100, 1700], m7: [1500, 900], m8: [2700, 500], m9: [300, 2150],
    };
    const s = spots[next.id] || [500, 500];
    return [{ x: s[0], y: s[1], mission: next }];
  }

  function startMission(def) {
    if (current) return;
    if (Races.getActive()) { HUD.toast('Finish the race first!', '#ffb347'); return; }
    current = { def, stepIdx: 0, data: {}, startedAt: G.time };
    markers = [];
    HUD.showBrief(def);
    AudioSys.pickup();
    enterStep();
  }

  function enterStep() {
    const st = current.def.steps[current.stepIdx];
    const d = current.data;
    d.hackDone = 0; d.collectDone = 0; d.killDone = 0; d.timer = 0; d.stealCar = null; d.holdT = 0;
    if (st.type === 'kill') spawnSquad(st.spawn[0][0], st.spawn[0][1], st.count, false);
    if (st.type === 'boss') {
      const b = Combat.spawnEnemy(st.x + 60, st.y, { hp: 220, boss: true, name: st.name, weapon: 'smg' });
      d.boss = b;
      spawnSquad(st.x, st.y, 3, false);
    }
    if (st.type === 'steal') {
      const car = Vehicles.makeCar(st.model, st.x, st.y, 0, { driver: null, locked: true });
      G.cars.push(car);
      d.stealCar = car;
    }
    if (st.type === 'wanted') Police.setHeat(60);
    if (st.type === 'escape' && current.def.id === 'm9') Police.setHeat(80);
    updateObjective();
  }

  function spawnSquad(x, y, n, spread) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Util.TAU;
      const r = spread ? 260 : 120 + Math.random() * 160;
      const ex = Util.clamp(x + Math.cos(a) * r, 20, City.W - 20);
      const ey = Util.clamp(y + Math.sin(a) * r, 20, City.WATER_Y - 20);
      Combat.spawnEnemy(ex, ey, { weapon: Math.random() < 0.3 ? 'smg' : 'pistol' });
    }
  }

  function currentStep() { return current ? current.def.steps[current.stepIdx] : null; }
  function objectiveText() {
    if (!current) return null;
    const st = currentStep();
    let extra = '';
    if (st.type === 'kill') extra = ' (' + current.data.killDone + '/' + st.count + ')';
    if (st.type === 'hack') extra = ' (' + current.data.hackDone + '/' + st.points.length + ')';
    if (st.type === 'collect') extra = ' (' + current.data.collectDone + '/' + st.points.length + ')';
    if (st.type === 'timed') extra = ' — ' + Math.ceil(st.seconds - current.data.timer) + 's left';
    return st.text + extra;
  }

  function updateObjective() { /* HUD reads objectiveText() each frame */ }

  function advanceStep() {
    current.stepIdx++;
    if (current.stepIdx >= current.def.steps.length) completeMission();
    else enterStep();
  }

  function onEnemyKilled(e) {
    if (!current) return;
    const st = currentStep();
    if (st.type === 'kill') {
      current.data.killDone++;
      if (current.data.killDone >= st.count) advanceStep();
    } else if (st.type === 'boss' && e === current.data.boss) {
      advanceStep();
    }
  }

  function update(dt) {
    if (!current) return;
    const st = currentStep();
    const d = current.data;
    const p = G.player;
    d.timer += dt;
    if (st.type === 'goto' || st.type === 'deliver') {
      if (Util.dist(p.x, p.y, st.x, st.y) < 90) advanceStep();
    } else if (st.type === 'talk') {
      if (d.timer > 3.5) advanceStep();
    } else if (st.type === 'steal') {
      if (p.inCar && p.car === d.stealCar) advanceStep();
    } else if (st.type === 'hack') {
      const pt = st.points[d.hackDone];
      if (pt && Util.dist(p.x, p.y, pt[0], pt[1]) < 60) {
        if (G.keys['KeyE']) {
          d.holdT += dt;
          if (d.holdT > 1.6) {
            d.holdT = 0;
            d.hackDone++;
            AudioSys.pickup();
            Police.addHeat(12);
            HUD.toast('Relay hacked (' + d.hackDone + '/' + st.points.length + ')', '#5ad9c8');
            if (d.hackDone >= st.points.length) advanceStep();
          }
        } else d.holdT = Math.max(0, d.holdT - dt * 2);
      } else d.holdT = 0;
    } else if (st.type === 'collect') {
      const pt = st.points[d.collectDone];
      if (pt && Util.dist(p.x, p.y, pt[0], pt[1]) < 55) {
        d.collectDone++;
        AudioSys.pickup();
        if (d.collectDone >= st.points.length) advanceStep();
      }
    } else if (st.type === 'timed') {
      if (Util.dist(p.x, p.y, st.x, st.y) < 90) advanceStep();
      else if (d.timer > st.seconds) failMission('Out of time — the buyer left.');
    } else if (st.type === 'wanted') {
      if (Police.wanted() >= st.stars) advanceStep();
    } else if (st.type === 'escape') {
      if (Police.wanted() === 0) advanceStep();
    }
    // Mission fail conditions.
    if (p.dead) failMission('You got wasted.');
    if (G.state === 'busted') failMission('Busted by Solmar PD.');
  }

  function completeMission() {
    const def = current.def;
    G.missionsDone.push(def.id);
    Economy.addCash(def.reward);
    Economy.addRespect(def.respect);
    AudioSys.missionDone();
    HUD.showResult('MISSION COMPLETE', def.name + '\n' + Util.formatMoney(def.reward) + '  ·  +' + def.respect + ' respect' +
      (G.missionsDone.length >= DEFS.length ? '\n\nYou finished the story — Solmar is yours, Kingpin.' : ''),
      '#7ec850');
    if (def.onComplete) def.onComplete();
    current = null;
    G.enemies = [];
    Save.saveGame();
  }

  function failMission(reason) {
    const def = current.def;
    current = null;
    G.enemies = [];
    AudioSys.missionFail();
    HUD.showResult('MISSION FAILED', def.name + '\n' + reason + '\nDrive back to the gold marker to retry.', '#ff5a3c');
  }

  function drawMarkers(g) {
    // Next-mission start marker.
    for (const m of startMarkers()) {
      if (current) break;
      g.save();
      g.translate(m.x, m.y);
      const bob = Math.sin(G.time * 2.5) * 4;
      g.fillStyle = 'rgba(255,210,63,0.25)';
      g.beginPath(); g.arc(0, 0, 46, 0, Util.TAU); g.fill();
      g.fillStyle = '#ffd23f';
      g.font = 'bold 34px Arial'; g.textAlign = 'center';
      g.fillText(m.mission.giver[0], 0, 12 + bob);
      g.strokeStyle = '#7a4d00'; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, 30, 0, Util.TAU); g.stroke();
      g.fillStyle = '#fff';
      g.font = 'bold 12px Arial';
      g.fillText(m.mission.name.toUpperCase(), 0, -40);
      g.restore();
    }
    if (!current) return;
    const st = currentStep();
    // Objective markers per step type.
    const drawTarget = (x, y, label, color) => {
      g.save();
      g.translate(x, y);
      const pulse = 1 + Math.sin(G.time * 4) * 0.08;
      g.fillStyle = color || 'rgba(255,210,63,0.3)';
      g.beginPath(); g.arc(0, 0, 70 * pulse, 0, Util.TAU); g.fill();
      g.strokeStyle = '#ffd23f'; g.lineWidth = 3;
      g.setLineDash([12, 8]);
      g.beginPath(); g.arc(0, 0, 70 * pulse, 0, Util.TAU); g.stroke();
      g.setLineDash([]);
      if (label) {
        g.fillStyle = '#fff';
        g.font = 'bold 13px Arial'; g.textAlign = 'center';
        g.fillText(label, 0, -80);
      }
      g.restore();
    };
    const d = current.data;
    if (st.type === 'goto' || st.type === 'deliver' || st.type === 'timed') drawTarget(st.x, st.y, 'OBJECTIVE');
    if (st.type === 'steal' && d.stealCar) drawTarget(d.stealCar.x, d.stealCar.y, 'STEAL IT');
    if (st.type === 'hack') st.points.forEach((pt, i) => { if (i >= d.hackDone) drawTarget(pt[0], pt[1], i === d.hackDone ? 'HOLD E TO HACK' : 'RELAY ' + (i + 1)); });
    if (st.type === 'collect') st.points.forEach((pt, i) => { if (i >= d.collectDone) drawTarget(pt[0], pt[1], 'CRATE'); });
    if (st.type === 'kill' || st.type === 'boss') drawTarget(st.spawn ? st.spawn[0][0] : st.x, st.spawn ? st.spawn[0][1] : st.y, 'CLEAR THE AREA', 'rgba(255,90,60,0.25)');
    // Guide line to the current target.
    let tx = null, ty = null;
    if (st.x !== undefined) { tx = st.x; ty = st.y; }
    else if (st.type === 'hack') { const pt = st.points[d.hackDone]; if (pt) { tx = pt[0]; ty = pt[1]; } }
    else if (st.type === 'collect') { const pt = st.points[d.collectDone]; if (pt) { tx = pt[0]; ty = pt[1]; } }
    else if (st.type === 'steal' && d.stealCar) { tx = d.stealCar.x; ty = d.stealCar.y; }
    if (tx !== null) {
      g.strokeStyle = 'rgba(255,210,63,0.45)';
      g.lineWidth = 4;
      g.setLineDash([18, 14]);
      g.beginPath(); g.moveTo(G.player.x, G.player.y); g.lineTo(tx, ty); g.stroke();
      g.setLineDash([]);
    }
    // Hack progress ring.
    if (st.type === 'hack' && d.holdT > 0) {
      g.save();
      g.translate(G.player.x, G.player.y - 30);
      g.fillStyle = 'rgba(0,0,0,0.6)';
      g.fillRect(-30, -8, 60, 10);
      g.fillStyle = '#5ad9c8';
      g.fillRect(-29, -7, 58 * (d.holdT / 1.6), 8);
      g.restore();
    }
  }

  return { DEFS, byId, nextMission, getCurrent, isDone, startMarkers, startMission, currentStep, objectiveText, onEnemyKilled, update, drawMarkers };
})();
