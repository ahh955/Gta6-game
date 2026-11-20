// Solmar City — the game core: state, player movement and driving, carjacking,
// camera, input, interaction, the main loop and screenshot staging.

var G = null;

const Title = (() => {
  function menuButtons(vw, vh) {
    const w = 320, h = 48, x = vw / 2 - w / 2;
    const list = [
      { id: 'new', label: 'NEW GAME', x, y: vh * 0.52, w, h, hover: false },
    ];
    if (Save.hasSave()) list.push({ id: 'continue', label: 'CONTINUE', x, y: vh * 0.52 + 58, w, h, hover: false });
    list.push({ id: 'help', label: 'HOW TO PLAY', x, y: vh * 0.52 + 58 * list.length, w, h, hover: false });
    return list;
  }
  return { menuButtons };
})();

const Game = (() => {
  let canvas = null, g = null;
  let lastT = 0, frames = 0;
  let vw = 1280, vh = 720;
  let shotMode = null;

  function newState() {
    return {
      state: 'title',
      time: 0,
      cash: 500,
      respect: 0,
      standing: {},
      missionsDone: [],
      crew: { maya: false, ghost: false, lou: false },
      racesBest: {},
      collectibles: 0,
      player: {
        x: 500, y: 620, angle: -Math.PI / 2, vx: 0, vy: 0,
        hp: 100, armor: 0, inCar: false, car: null, dead: false,
        weapon: 'pistol', owned: ['fists', 'pistol'], ammo: { pistol: 120, smg: 0, shotgun: 0, rifle: 0 },
        cover: false, coverObj: null,
      },
      cars: [], peds: [], cops: [], enemies: [], bullets: [], particles: [], wrecks: [],
      mission: null,
      camera: { x: 0, y: 0 },
      keys: {}, mouse: { x: 0, y: 0, down: false, consumed: false },
      shake: 0,
    };
  }

  function init() {
    canvas = document.getElementById('game');
    g = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    G = newState();
    City.generate();
    Pedestrians.spawnInitial(60);
    Vehicles.spawnTraffic(22);
    // Parked cars around the city for stealing.
    const rng = Util.makeRng(777);
    for (let i = 0; i < 14; i++) {
      const pt = City.randomRoadPoint(rng);
      const model = Util.pick(rng, ['sedan', 'coupe', 'pickup', 'sport', 'van', 'muscle']);
      const car = Vehicles.makeCar(model, pt.vertical ? pt.x + 30 : pt.x, pt.vertical ? pt.y : pt.y + 30, pt.vertical ? Math.PI / 2 : 0, { driver: null });
      G.cars.push(car);
    }
    bindInput();
    const params = new URLSearchParams(window.location.search);
    shotMode = params.get('shot');
    if (shotMode && shotMode !== 'title') stageScreenshot(shotMode);
    lastT = performance.now();
    requestAnimationFrame(loop);
    window.__game = { get frames() { return frames; }, get state() { return G.state; } };
  }

  function resize() {
    vw = window.innerWidth; vh = window.innerHeight;
    canvas.width = vw; canvas.height = vh;
  }

  // --- Input ---
  function bindInput() {
    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      G.keys[e.code] = true;
      onKey(e.code);
    });
    window.addEventListener('keyup', e => { G.keys[e.code] = false; });
    window.addEventListener('blur', () => { G.keys = {}; });
    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      G.mouse.x = e.clientX - r.left;
      G.mouse.y = e.clientY - r.top;
      updateTitleHover();
    });
    canvas.addEventListener('mousedown', e => {
      G.mouse.down = true; G.mouse.consumed = false;
      AudioSys.ensure();
      if (G.state === 'title') { clickTitle(); return; }
      if (Combat.isWheelOpen()) { clickWheel(); return; }
      if (HUD.getResult()) { HUD.dismissResult(); return; }
    });
    window.addEventListener('mouseup', () => { G.mouse.down = false; });
    canvas.addEventListener('wheel', e => {
      if (G.state === 'play') Combat.cycleWeapon(e.deltaY > 0 ? 1 : -1);
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  function updateTitleHover() {
    if (G.state !== 'title') return;
    for (const b of Title.menuButtons(vw, vh)) {
      b.hover = G.mouse.x >= b.x && G.mouse.x <= b.x + b.w && G.mouse.y >= b.y && G.mouse.y <= b.y + b.h;
    }
  }

  function clickTitle() {
    for (const b of Title.menuButtons(vw, vh)) {
      if (G.mouse.x >= b.x && G.mouse.x <= b.x + b.w && G.mouse.y >= b.y && G.mouse.y <= b.y + b.h) {
        AudioSys.click();
        if (b.id === 'new') startGame(false);
        else if (b.id === 'continue') startGame(true);
        else if (b.id === 'help') HUD.setHelp(true);
        return;
      }
    }
    if (HUD.isHelpOpen()) HUD.setHelp(false);
  }

  function clickWheel() {
    const cx = vw / 2, cy = vh / 2, R = 120;
    Combat.ORDER.forEach((key, i) => {
      const a = -Math.PI / 2 + (i / Combat.ORDER.length) * Util.TAU;
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      if (Util.dist(G.mouse.x, G.mouse.y, x, y) < 34) Combat.selectWeapon(key);
    });
    Combat.setWheelOpen(false);
  }

  function startGame(continueSave) {
    if (continueSave) {
      const data = Save.loadGame();
      if (data) Save.applySave(data);
    }
    G.state = 'play';
    AudioSys.ensure();
    if (!continueSave) {
      HUD.toast('Welcome to Solmar City, Dare. Gold marker = your next job.', '#ffd23f');
      HUD.radioLine('ROSA: "Come see me at the safehouse, mijo."');
    } else {
      HUD.toast('Welcome back, Dare.', '#ffd23f');
    }
  }

  function onKey(code) {
    AudioSys.ensure();
    if (G.state === 'title') {
      if (code === 'Enter') startGame(Save.hasSave());
      if (code === 'KeyH') HUD.setHelp(!HUD.isHelpOpen());
      return;
    }
    if (HUD.isHelpOpen()) {
      if (code === 'KeyH' || code === 'Escape') HUD.setHelp(false);
      return;
    }
    if (HUD.isShopOpen()) {
      const shop = HUD.getShop();
      if (code === 'ArrowUp') { shop.selected = (shop.selected - 1 + shop.items.length) % shop.items.length; AudioSys.click(); }
      if (code === 'ArrowDown') { shop.selected = (shop.selected + 1) % shop.items.length; AudioSys.click(); }
      if (code === 'Enter') Economy.buyItem(shop, shop.items[shop.selected]);
      if (code === 'KeyE' || code === 'Escape') HUD.closeShop();
      return;
    }
    if (G.state === 'busted' || G.state === 'wasted') {
      if (code === 'Enter') respawn();
      return;
    }
    if (G.state === 'complete') {
      if (code === 'Enter') G.state = 'play';
      return;
    }
    if (G.state === 'pause') {
      if (code === 'Escape') G.state = 'play';
      if (code === 'KeyH') HUD.setHelp(true);
      if (code === 'KeyS') { Save.saveGame(); HUD.toast('Game saved.', '#7ec850'); }
      if (code === 'KeyR') { G = newState(); City.generate(); Pedestrians.spawnInitial(60); Vehicles.spawnTraffic(22); G.state = 'play'; }
      return;
    }
    if (G.state !== 'play') return;
    switch (code) {
      case 'Escape': G.state = 'pause'; break;
      case 'KeyE': interact(); break;
      case 'KeyC': Combat.tryToggleCover(); break;
      case 'KeyQ': Combat.setWheelOpen(true); break;
      case 'KeyN': { const st = AudioSys.nextStation(); HUD.toast('Radio: ' + st.name + ' — ' + st.style, '#ff9e5a'); break; }
      case 'KeyM': HUD.toast(AudioSys.toggleMute() ? 'Radio muted' : 'Radio on', '#ff9e5a'); break;
      case 'KeyH': if (G.player.inCar) AudioSys.horn(); else HUD.setHelp(true); break;
      case 'Digit1': Combat.selectWeapon('fists'); break;
      case 'Digit2': Combat.selectWeapon('pistol'); break;
      case 'Digit3': Combat.selectWeapon('smg'); break;
      case 'Digit4': Combat.selectWeapon('shotgun'); break;
      case 'Digit5': Combat.selectWeapon('rifle'); break;
      case 'Digit7': Crew.useAbility('maya'); break;
      case 'Digit8': Crew.useAbility('ghost'); break;
      case 'Digit9': Crew.useAbility('lou'); break;
      case 'KeyR': Combat.selectWeapon(G.player.weapon); break;
    }
  }

  function respawn() {
    const p = G.player;
    const fine = G.state === 'busted' ? 250 : 200;
    G.cash = Math.max(0, G.cash - fine);
    p.hp = 100; p.dead = false; p.inCar = false; p.car = null;
    p.x = 500; p.y = 620; p.armor = 0;
    if (G.state === 'busted') { p.owned = ['fists', 'pistol']; p.ammo = { pistol: 60, smg: 0, shotgun: 0, rifle: 0 }; p.weapon = 'pistol'; }
    Police.clearWanted();
    G.enemies = [];
    G.state = 'play';
    Save.saveGame();
  }

  // --- Interaction (E key) ---
  function interact() {
    const p = G.player;
    if (p.inCar) {
      // Exit the car.
      p.inCar = false;
      p.x = p.car.x + Math.cos(p.car.angle + Math.PI / 2) * 30;
      p.y = p.car.y + Math.sin(p.car.angle + Math.PI / 2) * 30;
      p.car.driver = null;
      p.car = null;
      AudioSys.click();
      return;
    }
    // Mission marker.
    const m = nearMissionMarker(90);
    if (m) { Missions.startMission(m.mission); return; }
    // Race hub.
    if (nearLandmark('raceHub', 130)) { openRaceMenu(); return; }
    // Shops / safehouse / garage.
    if (nearLandmark('garage', 110) && nearestCar(140)) {
      p.car = nearestCar(140);
      HUD.openShop(Economy.garageMenu());
      return;
    }
    if (nearLandmark('gunshop', 110)) { HUD.openShop(Economy.gunshopMenu()); return; }
    if (nearLandmark('diner', 110)) { HUD.openShop(Economy.dinerMenu()); return; }
    if (nearLandmark('safehouse', 110)) { Economy.sleepAtSafehouse(); return; }
    // Enter / carjack the nearest car.
    const car = nearestCar(60);
    if (car) {
      if (car.driver === 'traffic') {
        // Carjacking: the driver flees, heat rises.
        car.driver = null;
        Police.addHeat(10);
        Pedestrians.panicAt(car.x, car.y, 120);
        HUD.toast('Carjacked the ' + car.name + '!', '#ff5a3c');
      } else if (car.locked) {
        HUD.toast('Locked — smash the window? (mission car, just get in)', '#ffb347');
        car.locked = false;
      }
      p.inCar = true; p.car = car; car.driver = 'player';
      p.x = car.x; p.y = car.y;
      AudioSys.click();
    }
  }

  function openRaceMenu() {
    if (!G.player.inCar) { HUD.toast('You need a car to race!', '#ffb347'); return; }
    const items = Races.RACES.map(r => ({
      id: r.id, label: r.name + ' — prize ' + Util.formatMoney(r.prize[0]),
      desc: (G.racesBest[r.id] ? 'Best: ' + Util.formatTime(G.racesBest[r.id]) : 'No record yet') + ' · ' + r.checkpoints.length + ' checkpoints',
      price: 0,
      buy: () => Races.startRace(r.id),
    }));
    HUD.openShop({ title: 'MIDNIGHT MILE — STREET RACES', items });
  }

  function nearestCar(maxD) {
    let best = null, bd = maxD;
    for (const car of G.cars) {
      if (car.wreck) continue;
      const d = Util.dist(G.player.x, G.player.y, car.x, car.y);
      if (d < bd) { bd = d; best = car; }
    }
    return best;
  }

  function nearLandmark(key, maxD) {
    const L = City.LANDMARKS[key];
    return L && Util.dist(G.player.x, G.player.y, L.x, L.y) < maxD;
  }

  function nearMissionMarker(maxD) {
    for (const m of Missions.startMarkers()) {
      if (Util.dist(G.player.x, G.player.y, m.x, m.y) < maxD) return m;
    }
    return null;
  }

  // --- Player update ---
  function updatePlayer(dt) {
    const p = G.player;
    if (p.dead) return;
    if (p.inCar && p.car) {
      if (p.car.wreck) {
        // Baill out of a wrecked car.
        p.inCar = false;
        p.x = p.car.x + 34; p.y = p.car.y + 34;
        p.car = null;
        Combat.hurtPlayer(10, 'wreck');
        return;
      }
      const throttle = (G.keys['KeyW'] || G.keys['ArrowUp'] ? 1 : 0) - (G.keys['KeyS'] || G.keys['ArrowDown'] ? 1 : 0);
      const steer = (G.keys['KeyD'] || G.keys['ArrowRight'] ? 1 : 0) - (G.keys['KeyA'] || G.keys['ArrowLeft'] ? 1 : 0);
      const handbrake = !!G.keys['Space'];
      Vehicles.drive(p.car, throttle, steer, dt, handbrake);
      p.x = p.car.x; p.y = p.car.y; p.angle = p.car.angle;
      AudioSys.engineTick(Math.abs(p.car.speed) / Vehicles.topSpeed(p.car));
      // Running over peds is a crime.
      for (const ped of G.peds) {
        if (!ped.dead && Util.dist(ped.x, ped.y, p.x, p.y) < 24 && Math.abs(p.car.speed) > 120) {
          ped.dead = true;
          Police.addHeat(18);
          Pedestrians.panicAt(p.x, p.y, 260);
        }
      }
      return;
    }
    // On foot.
    let mx = 0, my = 0;
    if (G.keys['KeyW'] || G.keys['ArrowUp']) my -= 1;
    if (G.keys['KeyS'] || G.keys['ArrowDown']) my += 1;
    if (G.keys['KeyA'] || G.keys['ArrowLeft']) mx -= 1;
    if (G.keys['KeyD'] || G.keys['ArrowRight']) mx += 1;
    const moving = mx !== 0 || my !== 0;
    if (moving) {
      const len = Math.hypot(mx, my);
      mx /= len; my /= len;
      const sprint = G.keys['ShiftLeft'] || G.keys['ShiftRight'];
      const speed = p.cover ? 0 : (sprint ? 330 : 225);
      p.vx = mx * speed; p.vy = my * speed;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.cover) { p.cover = false; p.coverObj = null; }
      City.resolve(p, 11);
    } else { p.vx = 0; p.vy = 0; }
    // Face the mouse when armed, else the movement direction.
    if (G.mouse.down || p.weapon !== 'fists') p.angle = Combat.playerAimAngle();
    else if (moving) p.angle = Math.atan2(my, mx);
    Combat.tryShoot(dt);
  }

  function updateCamera(dt) {
    const p = G.player;
    const tx = Util.clamp(p.x - vw / 2, 0, Math.max(0, City.W - vw));
    const ty = Util.clamp(p.y - vh / 2, 0, Math.max(0, City.H - vh));
    G.camera.x += (tx - G.camera.x) * Math.min(1, dt * 6);
    G.camera.y += (ty - G.camera.y) * Math.min(1, dt * 6);
    G.shake = Math.max(0, G.shake - dt * 22);
  }

  // --- Main loop ---
  function loop(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    frames++;
    if (G.state === 'play') {
      G.time += dt;
      updatePlayer(dt);
      Police.update(dt);
      Combat.updateBullets(dt);
      Combat.updateEnemies(dt);
      Crew.updateAllies(dt);
      Pedestrians.update(dt);
      for (const car of G.cars) {
        if (car.driver === 'traffic') Vehicles.updateTraffic(car, dt);
        Vehicles.updateBurning(car, dt);
      }
      // Remove far-away wrecks' cars from the traffic list, keep the wreck marks.
      G.cars = G.cars.filter(c => !c.wreck || Util.dist(c.x, c.y, G.player.x, G.player.y) < 2000);
      for (const w of G.wrecks) w.t += dt;
      G.wrecks = G.wrecks.filter(w => w.t < 240);
      Vehicles.Particles.update(dt);
      Missions.update(dt);
      Races.update(dt);
      HUD.update(dt);
      updateCamera(dt);
      // Story complete screen.
      if (G.missionsDone.length >= Missions.DEFS.length && !G._completedShown) {
        G._completedShown = true;
        G.state = 'complete';
      }
    } else if (G.state === 'title') {
      G.time += dt;
      updateTitleHover();
    } else {
      HUD.update(dt);
    }
    // Weapon wheel closes on Q release.
    if (!G.keys['KeyQ'] && Combat.isWheelOpen() && G.state === 'play') Combat.setWheelOpen(false);
    render();
    requestAnimationFrame(loop);
  }

  // --- Rendering ---
  function render() {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, vw, vh);
    if (G.state === 'title') {
      HUD.drawTitle(g, vw, vh);
      if (HUD.isHelpOpen()) HUD.drawHud(g, vw, vh);
      return;
    }
    const cam = G.camera;
    const shX = (Math.random() - 0.5) * G.shake, shY = (Math.random() - 0.5) * G.shake;
    g.save();
    g.translate(-Math.round(cam.x + shX), -Math.round(cam.y + shY));
    City.drawGround(g, cam, vw, vh);
    City.drawLandmarkMarkers(g);
    Missions.drawMarkers(g);
    Races.draw(g);
    // Wrecks (burnt-out cars stay on the street).
    for (const w of G.wrecks) {
      g.save();
      g.translate(w.x, w.y);
      g.rotate(w.angle);
      g.fillStyle = '#1c1c1e';
      g.fillRect(-24, -11, 48, 22);
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.beginPath(); g.ellipse(0, 0, 30, 16, 0, 0, Util.TAU); g.fill();
      g.restore();
      if (w.t < 20 && Math.random() < 0.1) {
        Vehicles.Particles.spawn(w.x, w.y, { vx: 0, vy: -14, life: 1.2, size: 8, color: 'rgba(40,40,40,0.4)', kind: 'smoke' });
      }
    }
    for (const car of G.cars) Vehicles.drawCar(g, car);
    City.drawBuildings(g, cam, vw, vh);
    Pedestrians.draw(g);
    Combat.drawEnemies(g);
    Crew.drawAllies(g);
    Police.draw(g);
    drawPlayer(g);
    Combat.drawBullets(g);
    Vehicles.Particles.draw(g);
    City.drawDistrictLabel(g, cam, vw, vh);
    g.restore();
    // Screen-space HUD.
    HUD.drawHud(g, vw, vh);
    if (G.state === 'pause') HUD.drawPause(g, vw, vh);
    if (G.state === 'busted') HUD.drawBusted(g, vw, vh);
    if (G.state === 'wasted') HUD.drawWasted(g, vw, vh);
    if (G.state === 'complete') HUD.drawComplete(g, vw, vh);
  }

  function drawPlayer(g) {
    const p = G.player;
    if (p.dead || p.inCar) return;
    g.save();
    g.translate(p.x, p.y);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath(); g.ellipse(2, 3, 10, 6, 0, 0, Util.TAU); g.fill();
    // Cover shield ring.
    if (p.cover) {
      g.strokeStyle = '#7ec850';
      g.lineWidth = 2;
      g.setLineDash([6, 4]);
      g.beginPath(); g.arc(0, 0, 18, 0, Util.TAU); g.stroke();
      g.setLineDash([]);
    }
    g.rotate(p.angle);
    // Dare: teal jacket, dark jeans.
    g.fillStyle = '#1d7fa8';
    g.beginPath(); g.arc(0, 0, 9, 0, Util.TAU); g.fill();
    g.fillStyle = '#f2c89b';
    g.beginPath(); g.arc(5, 0, 5, 0, Util.TAU); g.fill();
    if (p.weapon !== 'fists') {
      g.fillStyle = '#222';
      const len = p.weapon === 'rifle' || p.weapon === 'shotgun' ? 18 : 11;
      g.fillRect(8, -2, len, 4);
    }
    // Aim line (short, subtle).
    if (p.weapon !== 'fists') {
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(26, 0); g.lineTo(60, 0); g.stroke();
    }
    g.restore();
  }

  // --- Screenshot staging (?shot=...) ---
  function stageScreenshot(mode) {
    G.state = 'play';
    const p = G.player;
    if (mode === 'drive') {
      const car = Vehicles.makeCar('sport', 1100, 1900, 0, { driver: 'player', color: '#e83a2f' });
      G.cars.push(car);
      p.inCar = true; p.car = car;
      p.x = car.x; p.y = car.y;
      car.speed = 320;
      G.cash = 2450; G.respect = 640;
      G.camera.x = Util.clamp(p.x - vw / 2, 0, City.W - vw);
      G.camera.y = Util.clamp(p.y - vh / 2, 0, City.H - vh);
      HUD.toast('Beachfront cruise — Marina Bay', '#ffd23f');
    } else if (mode === 'chase') {
      const car = Vehicles.makeCar('muscle', 1900, 1100, 0, { driver: 'player', color: '#7a2fd9', upgrade: { engine: 2, armor: 1, tires: 1 } });
      G.cars.push(car);
      p.inCar = true; p.car = car;
      p.x = car.x; p.y = car.y;
      car.speed = 420;
      G.cash = 5320; G.respect = 980;
      Police.setHeat(85);
      for (let i = 0; i < 3; i++) Police.spawnCruiser();
      Police.spawnHeli();
      Police.spawnRoadblock();
      G.camera.x = Util.clamp(p.x - vw / 2, 0, City.W - vw);
      G.camera.y = Util.clamp(p.y - vh / 2, 0, City.H - vh);
      HUD.toast('WANTED LEVEL 4 — CONDOR-1 overhead!', '#ff5a3c');
      HUD.radioLine('SPD DISPATCH: All units pursue — suspect armed and dangerous.');
    } else if (mode === 'mission') {
      p.x = 1700; p.y = 1420; p.angle = -Math.PI / 2;
      p.owned = ['fists', 'pistol', 'smg', 'shotgun', 'rifle'];
      p.ammo = { pistol: 120, smg: 240, shotgun: 60, rifle: 180 };
      p.weapon = 'rifle';
      p.armor = 60;
      G.cash = 3100; G.respect = 720;
      G.missionsDone = ['m1', 'm2', 'm3'];
      G.crew = { maya: true, ghost: true, lou: false };
      Missions.startMission(Missions.byId('m4'));
      // Jump straight into the shootout step.
      const cur = Missions.getCurrent();
      if (cur) { cur.stepIdx = 1; cur.data.killDone = 2; }
      Combat.spawnEnemy(1700, 1220, { weapon: 'smg' });
      Combat.spawnEnemy(1620, 1260, {});
      Combat.spawnEnemy(1800, 1240, {});
      p.cover = true;
      G.camera.x = Util.clamp(p.x - vw / 2, 0, City.W - vw);
      G.camera.y = Util.clamp(p.y - vh / 2, 0, City.H - vh);
    }
    window.__shotReady = true;
  }

  return { init, newState, nearestCar, nearLandmark, nearMissionMarker, startGame };
})();
