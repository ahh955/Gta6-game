// Crew, ranks and progression for Solmar City 3D. Three crew members with
// usable abilities, seven respect ranks, and standing in each district.
export const CREW = [
  {
    id: 'mira', name: 'Mira', role: 'Driver', ability: 'SWAP PLATES',
    description: 'Instantly drops one wanted star by swapping plates mid-chase.',
    cooldown: 45, color: '#2dd4bf',
  },
  {
    id: 'lio', name: 'Lio', role: 'Mechanic', ability: 'QUICK FIX',
    description: 'Repairs the car to full condition wherever you are.',
    cooldown: 60, color: '#f59e0b',
  },
  {
    id: 'kiki', name: 'Kiki', role: 'Lookout', ability: 'EYES OUT',
    description: 'Reveals police positions and roadblocks on the minimap.',
    cooldown: 30, color: '#a78bfa',
  },
];

export const RANKS = [
  { name: 'NOBODY', rp: 0 },
  { name: 'DRIVER', rp: 800 },
  { name: 'HUSTLER', rp: 2000 },
  { name: 'FIXER', rp: 3900 },
  { name: 'SHOT CALLER', rp: 6500 },
  { name: 'CREW BOSS', rp: 9500 },
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
  { name: 'Marina Bay', standing: 62 },
  { name: 'Old Port', standing: 48 },
  { name: 'Strand Boulevard', standing: 58 },
  { name: 'Coral Docks', standing: 41 },
  { name: 'Casino Row', standing: 70 },
  { name: 'Downtown', standing: 35 },
  { name: 'Solmar Strand', standing: 58 },
];

export function rankFor(rp) {
  let current = RANKS[0];
  let next = RANKS[1];
  for (let i = 0; i < RANKS.length; i++) {
    if (rp >= RANKS[i].rp) {
      current = RANKS[i];
      next = RANKS[i + 1] || null;
    }
  }
  return { current, next, progress: next ? (rp - current.rp) / (next.rp - current.rp) : 1 };
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
