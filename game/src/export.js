// Car export for Solmar City 3D: a standing order from the Solmar
// Boatyard — five named models to steal and deliver to the docks. Each
// delivery pays the list value and counts on the STATS checklist
// (Export x/5). Export cars are marked on the minimap with a gold anchor
// when nearby; delivering with low damage pays a clean bonus.
export const EXPORT_LIST = [
  { id: 'vortex-gt', model: 'VORTEX GT', color: 'Sunset Orange', value: 4200, district: 'Strand Boulevard' },
  { id: 'meridian-s', model: 'MERIDIAN S', color: 'Midnight Black', value: 6800, district: 'Downtown' },
  { id: 'coral-cruiser', model: 'CORAL CRUISER', color: 'Seafoam', value: 3100, district: 'Coral Docks' },
  { id: 'neon-coupe', model: 'NEON COUPE', color: 'Casino Pink', value: 5400, district: 'Casino Row' },
  { id: 'marina-roadster', model: 'MARINA ROADSTER', color: 'Harbour White', value: 4700, district: 'Marina Bay' },
];

export function getExport(id) {
  return EXPORT_LIST.find((e) => e.id === id) || EXPORT_LIST[0];
}

// Deliver a car: condition 0-100 (100 = showroom). A clean delivery
// (condition >= 80) pays a 25% bonus. Returns null when already delivered.
export function deliverExport(delivered, id, condition) {
  if (delivered[id]) return null;
  const car = getExport(id);
  const clean = condition >= 80;
  return {
    model: car.model,
    value: car.value,
    bonus: clean ? Math.round(car.value * 0.25) : 0,
    total: car.value + (clean ? Math.round(car.value * 0.25) : 0),
    clean,
    delivered: { ...delivered, [id]: true },
  };
}
