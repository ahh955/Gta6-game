// Solmar City — economy: cash, respect ranks, district standing, the garage
// upgrade shop, weapon and food shops, and the safehouse.

const Economy = (() => {
  const RANKS = [
    { name: 'Street Rat', at: 0 },
    { name: 'Hustler', at: 200 },
    { name: 'Enforcer', at: 500 },
    { name: 'Boss', at: 900 },
    { name: 'Kingpin of Solmar', at: 1500 },
  ];

  const UPGRADES = {
    engine: { name: 'Engine Tuning', levels: [500, 1200, 2500], desc: '+55 top speed, +18% acceleration per level' },
    armor: { name: 'Plated Armor', levels: [600, 1300, 2600], desc: '+15% damage resistance per level' },
    tires: { name: 'Sport Tires', levels: [400, 900], desc: '+handling and grip per level' },
  };
  const PAINTS = [
    { name: 'Sunset Red', color: '#e83a2f', price: 200 },
    { name: 'Ocean Blue', color: '#2f6fe8', price: 200 },
    { name: 'Palm Gold', color: '#ffd23f', price: 300 },
    { name: 'Midnight', color: '#222222', price: 300 },
    { name: 'Coral Pink', color: '#d94f9e', price: 250 },
  ];

  const FOOD = [
    { name: 'Sunset Taco', price: 25, heal: 30 },
    { name: 'Harbor Fish Plate', price: 60, heal: 70 },
    { name: 'Kingpin Feast', price: 120, heal: 100 },
  ];

  function rank() {
    let r = RANKS[0];
    for (const rank of RANKS) if (G.respect >= rank.at) r = rank;
    return r;
  }
  function nextRank() {
    for (const r of RANKS) if (G.respect < r.at) return r;
    return null;
  }

  function addCash(n) { G.cash += n; }
  function spendCash(n) {
    if (G.cash < n) return false;
    G.cash -= n;
    return true;
  }
  function addRespect(n) {
    const before = rank().name;
    G.respect += n;
    const d = City.districtAt(G.player.x, G.player.y);
    if (d) G.standing[d.id] = Math.min(100, (G.standing[d.id] || 0) + Math.ceil(n / 10));
    if (rank().name !== before) {
      HUD.toast('RESPECT RANK UP: ' + rank().name, '#ffd23f');
      AudioSys.missionDone();
    }
  }

  // --- Garage ---
  function garageMenu() {
    const car = G.player.car;
    if (!car) return null;
    const items = [];
    for (const key of ['engine', 'armor', 'tires']) {
      const u = UPGRADES[key];
      const lvl = car.upgrade[key] || 0;
      const maxed = lvl >= u.levels.length;
      items.push({
        id: 'up_' + key, label: u.name + ' — Lv ' + lvl + '/' + u.levels.length + (maxed ? ' (MAX)' : ' — ' + Util.formatMoney(u.levels[lvl])),
        desc: u.desc, price: maxed ? 0 : u.levels[lvl], disabled: maxed,
        buy: () => { car.upgrade[key] = lvl + 1; car.maxHp = 100 + (car.upgrade.armor || 0) * 40; car.hp = car.maxHp; },
      });
    }
    for (const paint of PAINTS) {
      items.push({
        id: 'paint_' + paint.name, label: 'Repaint: ' + paint.name + ' — ' + Util.formatMoney(paint.price),
        desc: 'Fresh coat at Solmar Customs.', price: paint.price,
        buy: () => { car.color = paint.color; },
      });
    }
    items.push({
      id: 'repair', label: 'Full Repair — ' + Util.formatMoney(150), desc: 'Fix every dent and refill the tank.',
      price: 150, buy: () => { car.hp = car.maxHp; car.burning = false; },
    });
    return { title: 'SOLMAR CUSTOMS GARAGE — ' + car.name, items };
  }

  // --- Weapon shop ---
  function gunshopMenu() {
    const items = [];
    for (const key of Combat.ORDER) {
      if (key === 'fists') continue;
      const w = Combat.WEAPONS[key];
      const owned = G.player.owned.includes(key);
      if (!owned) {
        items.push({
          id: 'buy_' + key, label: w.name + ' — ' + Util.formatMoney(w.price),
          desc: 'Damage ' + w.damage + ' · Range ' + w.range + (w.auto ? ' · automatic' : '') + (w.pellets ? ' · ' + w.pellets + ' pellets' : ''),
          price: w.price,
          buy: () => { G.player.owned.push(key); G.player.ammo[key] = w.ammo; },
        });
      } else {
        items.push({
          id: 'ammo_' + key, label: w.name + ' ammo (+' + w.ammo + ') — ' + Util.formatMoney(Math.floor(w.price / 4)),
          desc: 'Top up your ' + w.name + '.', price: Math.floor(w.price / 4),
          buy: () => { G.player.ammo[key] = (G.player.ammo[key] || 0) + w.ammo; },
        });
      }
    }
    items.push({
      id: 'armor', label: 'Body Armor (+50) — ' + Util.formatMoney(300),
      desc: 'Absorbs 60% of incoming damage until depleted.', price: 300,
      buy: () => { G.player.armor = Math.min(100, G.player.armor + 50); },
    });
    return { title: 'SOLMAR ARMS — licensed dealer', items };
  }

  // --- Diner ---
  function dinerMenu() {
    return {
      title: 'SUNSET DINER — eat up, boss',
      items: FOOD.map(f => ({
        id: 'food_' + f.name, label: f.name + ' — ' + Util.formatMoney(f.price) + ' (+' + f.heal + ' HP)',
        desc: 'Fresh off the grill.', price: f.price,
        buy: () => { G.player.hp = Math.min(100, G.player.hp + f.heal); },
      })),
    };
  }

  function buyItem(menu, item) {
    if (item.disabled) return;
    if (!spendCash(item.price)) { HUD.toast('Not enough cash — ' + Util.formatMoney(item.price) + ' needed', '#ff5a3c'); return; }
    item.buy();
    AudioSys.pickup();
    HUD.toast('Purchased: ' + item.label.split(' — ')[0], '#7ec850');
  }

  // --- Safehouse ---
  function sleepAtSafehouse() {
    G.player.hp = 100;
    G.player.armor = Math.max(G.player.armor, 25);
    Police.clearWanted();
    Save.saveGame();
    HUD.toast('Rested at the safehouse. Health restored, wanted cleared, game saved.', '#7ec850');
    AudioSys.missionDone();
  }

  return { RANKS, UPGRADES, PAINTS, FOOD, rank, nextRank, addCash, spendCash, addRespect, garageMenu, gunshopMenu, dinerMenu, buyItem, sleepAtSafehouse };
})();
