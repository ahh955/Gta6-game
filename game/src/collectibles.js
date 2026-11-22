// Collectibles for Solmar City 3D: twenty golden doubloons hidden on
// rooftops, walls and piers across the seven districts. Finding them all
// is the completionist's chase — the STATS checklist tracks them
// (Doubloons x/20) and each one pays a small finder bonus. Doubloons are
// world pickups (gold discs, see world.js); this module owns their data
// and the found-set bookkeeping.
export const DOUBLOONS = [
  { id: 'd01', name: 'MARINA LIGHT', district: 'Marina Bay', hint: 'On the lighthouse catwalk.', bonus: 150 },
  { id: 'd02', name: 'FERRY TOKEN', district: 'Marina Bay', hint: 'Under the ferry terminal bench.', bonus: 150 },
  { id: 'd03', name: 'YACHT CLUB', district: 'Marina Bay', hint: 'Behind the yacht-club flagpole.', bonus: 150 },
  { id: 'd04', name: 'CUSTOMS SEAL', district: 'Old Port', hint: 'On the customs-house cornice.', bonus: 150 },
  { id: 'd05', name: 'ANCHOR CHAIN', district: 'Old Port', hint: 'Where the anchor chain meets the quay.', bonus: 150 },
  { id: 'd06', name: 'FISHMONGER', district: 'Old Port', hint: 'On the fish-market awning.', bonus: 150 },
  { id: 'd07', name: 'PALM CROWN', district: 'Strand Boulevard', hint: 'In the tallest palm by the Strand.', bonus: 200 },
  { id: 'd08', name: 'BOARDWALK STAR', district: 'Strand Boulevard', hint: 'Under the boardwalk stage.', bonus: 200 },
  { id: 'd09', name: 'NEON REFLECT', district: 'Strand Boulevard', hint: 'On the neon sign above the arcade.', bonus: 200 },
  { id: 'd10', name: 'CRANE HOOK', district: 'Coral Docks', hint: 'On the crane hook at the north wharf.', bonus: 200 },
  { id: 'd11', name: 'CONTAINER KING', district: 'Coral Docks', hint: 'Atop the blue container stack.', bonus: 200 },
  { id: 'd12', name: 'TIDE POOL', district: 'Coral Docks', hint: 'In the tide pool under pier 4.', bonus: 200 },
  { id: 'd13', name: 'JACKPOT', district: 'Casino Row', hint: 'Inside the Meridian fountain.', bonus: 300 },
  { id: 'd14', name: 'HIGH ROLLER', district: 'Casino Row', hint: 'On the penthouse balcony rail.', bonus: 300 },
  { id: 'd15', name: 'ROULETTE', district: 'Casino Row', hint: 'Behind the roulette wheel display.', bonus: 300 },
  { id: 'd16', name: 'SKYLINE', district: 'Downtown', hint: 'On the Meridian tower roof edge.', bonus: 300 },
  { id: 'd17', name: 'PLAZA PIGEON', district: 'Downtown', hint: 'Under the plaza pigeon statue.', bonus: 300 },
  { id: 'd18', name: 'FERRIS GOLD', district: 'Solmar Strand', hint: 'In the top gondola of the wheel.', bonus: 250 },
  { id: 'd19', name: 'PIER END', district: 'Solmar Strand', hint: 'At the very end of Solmar Pier.', bonus: 250 },
  { id: 'd20', name: 'SURF SHACK', district: 'Solmar Strand', hint: 'On the surf-shack roof.', bonus: 250 },
];

export function getDoubloon(id) {
  return DOUBLOONS.find((d) => d.id === id) || DOUBLOONS[0];
}

// A found-set is a plain object { [id]: true }. collect() returns the
// bonus earned (0 when already found) and the new count.
export function collectDoubloon(found, id) {
  if (found[id]) return { bonus: 0, count: Object.keys(found).length, already: true };
  const next = { ...found, [id]: true };
  return { bonus: getDoubloon(id).bonus, count: Object.keys(next).length, already: false, found: next };
}

export function doubloonsInDistrict(district) {
  return DOUBLOONS.filter((d) => d.district === district);
}
