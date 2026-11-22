// Crew, ranks, districts and progression for Solmar City 3D. Three crew
// members with usable abilities and loyalty (Rosa the driver, Dez the
// mechanic, Pip the lookout), seven respect ranks from NOBODY to KINGPIN,
// and standing in each of the seven districts — standing is what makes
// locals hide you from the police, and each district carries a tagline
// and a landmark the HUD and the MAP tab show.
export const CREW = [
  {
    id: 'rosa', name: 'Rosa', role: 'Driver', ability: 'SWAP PLATES',
    description: 'Instantly drops one wanted star by swapping plates mid-chase.',
    cooldown: 45, color: '#2dd4bf', loyalty: 82, recruited: 'Recruited in HOT PLATES',
  },
  {
    id: 'dez', name: 'Dez', role: 'Mechanic', ability: 'QUICK FIX',
    description: 'Repairs the car to full condition wherever you are.',
    cooldown: 60, color: '#f59e0b', loyalty: 74, recruited: 'Recruited in LOW TIDE',
  },
  {
    id: 'pip', name: 'Pip', role: 'Lookout', ability: 'EYES OUT',
    description: 'Reveals police positions and roadblocks on the minimap.',
    cooldown: 30, color: '#a78bfa', loyalty: 68, recruited: 'Recruited in NEON RAIN',
  },
];

export const RANKS = [
  { name: 'NOBODY', rp: 0 },
  { name: 'WHEELMAN', rp: 800 },
  { name: 'HUSTLER', rp: 2000 },
  { name: 'OPERATOR', rp: 3900 },
  { name: 'SHOT CALLER', rp: 6500 },
  { name: 'UNDERBOSS', rp: 9500 },
  { name: 'KINGPIN', rp: 14000 },
];

export const WEAPONS = [
  { key: '1', name: 'FISTS', ammo: '∞', damage: 10 },
  { key: '2', name: '.38', ammo: '60', damage: 22 },
  { key: '3', name: 'SMG', ammo: '30/60', damage: 16 },
  { key: '4', name: '12G', ammo: '18', damage: 65 },
  { key: '5', name: 'AR-9', ammo: '120', damage: 34 },
];

export const DISTRICTS = [
  { name: 'Marina Bay', standing: 64, tagline: 'Yachts, gulls and the ferry home', landmark: 'The Marlowe Loft' },
  { name: 'Old Port', standing: 52, tagline: 'Salt air and old debts', landmark: 'Customs House' },
  { name: 'Strand Boulevard', standing: 58, tagline: 'Neon, palms and fast cars', landmark: 'Sunset Respray' },
  { name: 'Coral Docks', standing: 47, tagline: 'Stilt houses and the night market', landmark: 'Pasaru Night Market' },
  { name: 'Casino Row', standing: 71, tagline: 'The Row never sleeps, and neither does Voss', landmark: 'Meridian Casino' },
  { name: 'Downtown', standing: 38, tagline: 'Glass towers, hard pavement', landmark: 'Meridian Tower' },
  { name: 'Solmar Strand', standing: 64, tagline: 'The beach at the end of the chase', landmark: 'Solmar Pier' },
];

export function districtByName(name) {
  return DISTRICTS.find((d) => d.name === name) || DISTRICTS[6];
}

export function rankFor(rp) {
  let current = RANKS[0];
  let next = RANKS[1];
  for (let i = 0; i < RANKS.length; i++) {
    if (rp >= RANKS[i].rp) {
      current = RANKS[i];
      next = RANKS[i + 1] || null;
    }
  }
  const index = RANKS.indexOf(current);
  return { current, next, index, progress: next ? (rp - current.rp) / (next.rp - current.rp) : 1 };
}

export function createCrewState() {
  const cooldowns = {};
  for (const member of CREW) cooldowns[member.id] = 0;
  return {
    cooldowns,
    useAbility(id) {
      if (cooldowns[id] > 0) return false;
      const member = CREW.find((c) => c.id === id);
      cooldowns[id] = member.cooldown;
      return true;
    },
    update(dt) {
      for (const id of Object.keys(cooldowns)) {
        cooldowns[id] = Math.max(0, cooldowns[id] - dt);
      }
    },
  };
}
