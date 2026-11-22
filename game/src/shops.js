// Shops and named places for Solmar City 3D: where the money goes.
// IRON & IVORY sells weapons and vests, SUNSET RESPRAY repaints and
// repairs, and THE MARLOWE LOFT is the safehouse where the game saves.
// Named places also anchor the map: the MAP tab marks them, missions
// name them, and the dossier outline proves the city is a place, not a
// backdrop.
export const PLACES = [
  { name: 'THE MARLOWE LOFT', kind: 'SAFEHOUSE', district: 'Marina Bay', note: 'Your place. Saves here, garage below.' },
  { name: 'IRON & IVORY', kind: 'GUN SHOP', district: 'Downtown', note: 'Vera’s cousin sells iron. No receipts.' },
  { name: 'SUNSET RESPRAY', kind: 'RESPRAY', district: 'Strand Boulevard', note: 'New paint, new plates, new you.' },
  { name: 'SOLMAR PD PRECINCT 3', kind: 'POLICE', district: 'Downtown', note: 'Five stars start here. Avoid it.' },
  { name: 'SOLMAR BOATYARD', kind: 'CAR EXPORT', district: 'Coral Docks', note: 'Deliver the export list here.' },
  { name: 'SOLMAR PIER', kind: 'LANDMARK', district: 'Solmar Strand', note: 'The end of the boulevard. And of Voss.' },
  { name: 'MERIDIAN CASINO', kind: 'LANDMARK', district: 'Casino Row', note: 'Voss’s money, laundered nightly.' },
  { name: 'PASARU NIGHT MARKET', kind: 'MARKET', district: 'Coral Docks', note: 'Stalls, lanterns, and somewhere to hide.' },
];

export const GUN_SHOP = [
  { name: '.38', price: 400, ammo: '60 rounds', damage: 22 },
  { name: 'SMG', price: 1400, ammo: '30/60', damage: 16 },
  { name: '12G', price: 2200, ammo: '18 shells', damage: 65 },
  { name: 'AR-9', price: 3600, ammo: '120 rounds', damage: 34 },
  { name: 'KEVLAR VEST', price: 900, ammo: '+50 armour', damage: 0 },
];

export const RESPRAY = [
  { name: 'REPAIR', price: 300, note: 'Full condition restore.' },
  { name: 'NEW PAINT', price: 500, note: 'A colour the police have not seen.' },
  { name: 'CLEAN PLATES', price: 250, note: 'Drops one wanted star.' },
];

// Buy from a shop list: returns the purchase or null when unaffordable.
export function buyItem(cash, item) {
  if (cash < item.price) return null;
  return { item: item.name, price: item.price, cashLeft: cash - item.price };
}

export function placeByKind(kind) {
  return PLACES.filter((p) => p.kind === kind);
}
