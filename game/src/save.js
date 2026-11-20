// Solmar City — localStorage save: progress, cash, respect, crew, garage,
// weapons and race records survive between sessions.

const Save = (() => {
  const KEY = 'solmar-city-save-v1';

  function saveGame() {
    try {
      const data = {
        version: 1,
        cash: G.cash,
        respect: G.respect,
        standing: G.standing,
        missionsDone: G.missionsDone,
        crew: G.crew,
        player: {
          x: G.player.x, y: G.player.y, hp: G.player.hp, armor: G.player.armor,
          owned: G.player.owned, ammo: G.player.ammo, weapon: G.player.weapon,
        },
        car: G.player.car ? { model: G.player.car.model, color: G.player.car.color, upgrade: G.player.car.upgrade, hp: G.player.car.hp } : null,
        racesBest: G.racesBest,
        collectibles: G.collectibles,
        savedAt: Date.now(),
      };
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) { return false; }
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version !== 1) return null;
      return data;
    } catch (e) { return null; }
  }

  function hasSave() { return loadGame() !== null; }

  function applySave(data) {
    G.cash = data.cash || 0;
    G.respect = data.respect || 0;
    G.standing = data.standing || {};
    G.missionsDone = data.missionsDone || [];
    G.crew = data.crew || { maya: false, ghost: false, lou: false };
    if (data.player) {
      G.player.x = data.player.x; G.player.y = data.player.y;
      G.player.hp = data.player.hp; G.player.armor = data.player.armor || 0;
      G.player.owned = data.player.owned || ['fists', 'pistol'];
      G.player.ammo = data.player.ammo || { pistol: 120 };
      G.player.weapon = data.player.weapon || 'pistol';
    }
    if (data.car) {
      const car = Vehicles.makeCar(data.car.model, G.player.x + 40, G.player.y, 0, { driver: null, color: data.car.color, upgrade: data.car.upgrade });
      car.hp = data.car.hp || 100;
      G.cars.push(car);
    }
    G.racesBest = data.racesBest || {};
    G.collectibles = data.collectibles || 0;
  }

  function clearSave() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  return { saveGame, loadGame, hasSave, applySave, clearSave, KEY };
})();
