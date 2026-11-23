// Story missions for Solmar City 3D: ten jobs across the city's seven
// districts, in three acts — Act I Arrival (jobs 1-5), Act II Voss's Fall
// (jobs 6-8), Act III Reckoning (jobs 9-10). Each mission has stages, a
// named contact, dialogue and a payout. The staged screenshots run
// mission 6 mid-job (cover) and mission 8 at night (shootout). The
// antagonist is Cassian Voss and the Meridian syndicate; the fixer who
// hands out the jobs is Vera. Dialogue screens live in dialogue.js;
// ratings in progression.js.
export const MISSIONS = [
  {
    id: 1, name: 'FIRST GEAR', act: 'ACT I', chapter: 'Arrival', district: 'Marina Bay',
    objective: 'Steal a car and reach the safehouse', stages: 2,
    payout: 500, contact: 'VERA',
    brief: 'Fresh off the ferry with nothing but a name. Get wheels, get moving.',
    dialogue: 'Welcome to Solmar. Nobody here gives you anything — take it.',
  },
  {
    id: 2, name: 'SALT IN THE WOUND', act: 'ACT I', chapter: 'Arrival', district: 'Old Port',
    objective: 'Collect the debt from the dockside bar', stages: 3,
    payout: 900, contact: 'VERA',
    brief: 'The Marlin owes us. Remind them, politely or otherwise.',
    dialogue: 'Debt is a promise. Go collect on it.',
    next: 'Hot Plates',
  },
  {
    id: 3, name: 'HOT PLATES', act: 'ACT I', chapter: 'The Crew', district: 'Strand Boulevard',
    objective: 'Swap plates on three marked cars', stages: 3,
    payout: 1400, contact: 'ROSA',
    brief: 'Rosa needs clean plates for the getaway fleet. You drive, she works.',
    dialogue: 'Three cars, three plates, no cops. Easy money.',
    next: 'Low Tide',
  },
  {
    id: 4, name: 'LOW TIDE', act: 'ACT I', chapter: 'The Crew', district: 'Coral Docks',
    objective: 'Recover the sunken crate before the tide turns', stages: 4,
    payout: 2200, contact: 'DEZ',
    brief: 'A crate went off the pier at dawn. Fish it out before customs does.',
    dialogue: 'The sea keeps what it takes. Take it back.',
    next: 'Neon Rain',
  },
  {
    id: 5, name: 'NEON RAIN', act: 'ACT I', chapter: 'The Crew', district: 'Casino Row',
    objective: 'Escort the courier through Casino Row', stages: 4,
    payout: 3000, contact: 'PIP',
    brief: 'Pip moves the package; you move the trouble out of her way.',
    dialogue: 'Eyes out. The Row watches everyone tonight.',
    next: 'Sink the Vanguard',
  },
  {
    id: 6, name: 'SINK THE VANGUARD', act: 'ACT II', chapter: "Voss's Fall", district: 'Solmar Strand',
    objective: "Sink Voss's Vanguard before it reaches the pier", stages: 4,
    payout: 5200, contact: 'VERA',
    brief: "Voss is running for the water with the ledger. Stop the car, stop the man.",
    dialogue: "He's making for Solmar Pier! Ram the Vanguard before it reaches the water!",
    next: 'Vanish',
  },
  {
    id: 7, name: 'PAPER TRAIL', act: 'ACT II', chapter: "Voss's Fall", district: 'Downtown',
    objective: 'Burn the ledger copies in the Meridian tower', stages: 4,
    payout: 6800, contact: 'ROSA',
    brief: 'Three copies, three floors, one alarm. Be quick or be loud.',
    dialogue: 'Paper burns. So do bridges. Light both.',
    next: 'High Water',
  },
  {
    id: 8, name: 'HIGH WATER', act: 'ACT II', chapter: "Voss's Fall", district: 'Coral Docks',
    objective: 'Hold the docks against the Meridian crew', stages: 5,
    payout: 8400, contact: 'DEZ',
    brief: 'They come for the docks at dusk. The docks are ours. Keep them.',
    dialogue: 'Hold the line. The tide is with us tonight.',
    next: 'The Long Way Home',
  },
  {
    id: 9, name: 'THE LONG WAY HOME', act: 'ACT III', chapter: 'Reckoning', district: 'Strand Boulevard',
    objective: 'Lose a five-star heat across the whole city', stages: 5,
    payout: 12000, contact: 'PIP',
    brief: 'Every unit in the city is on you. Make them regret it.',
    dialogue: 'Five stars. The whole city is watching. Give them a show.',
    next: 'Solmar Belongs to Us',
  },
  {
    id: 10, name: 'SOLMAR BELONGS TO US', act: 'ACT III', chapter: 'Reckoning', district: 'Solmar Strand',
    objective: 'Take the Meridian penthouse and end it', stages: 6,
    payout: 25000, contact: 'VERA',
    brief: 'The penthouse, the ledger, the city. One night decides all of it.',
    dialogue: 'This city was never theirs. Take it back.',
  },
];

export const STORY = {
  city: 'Solmar City',
  hero: 'Alex "Vex" Marlowe',
  antagonist: 'Cassian Voss of the Meridian syndicate',
  fixer: 'Vera',
  premise: 'A driver fresh off the ferry climbs from nobody to kingpin across ten jobs, building a crew, a garage and a reputation — while Solmar PD closes in.',
  districts: ['Marina Bay', 'Old Port', 'Strand Boulevard', 'Coral Docks', 'Casino Row', 'Downtown', 'Solmar Strand'],
};

export function getMission(id) {
  return MISSIONS.find((m) => m.id === id) || MISSIONS[0];
}

export function missionProgress(state) {
  const done = MISSIONS.filter((m) => m.id < state.missionId).length;
  return { done, total: MISSIONS.length, percent: Math.round((done / MISSIONS.length) * 100) };
}
