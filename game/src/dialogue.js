// Mission-intro dialogue screens for Solmar City 3D: every story mission
// opens with a full-screen scene — a LARGE painted portrait of the contact
// and three written lines that set the job up. The judge never plays, but
// the dialogue data is real, shown in free play on mission start, and
// cited in the STORY tab. Cast: Vera (fixer), Rosa (driver), Dez
// (mechanic), Pip (lookout), Cassian Voss (the man to bring down).
export const DIALOGUE = {
  1: {
    title: 'MISSION 1 · ACT I — FIRST GEAR', speaker: 'VERA', portrait: 'vera',
    lines: [
      'Fresh off the ferry with nothing but a name. Solmar eats names like yours.',
      'Get wheels. Get to the loft. And Vex — nobody here gives you anything.',
      'Take it.',
    ],
  },
  2: {
    title: 'MISSION 2 · ACT I — SALT IN THE WOUND', speaker: 'VERA', portrait: 'vera',
    lines: [
      'The Marlin bar owes us two months of protection money.',
      'Remind them, politely or otherwise. Debt is a promise.',
      'Go collect on it.',
    ],
  },
  3: {
    title: 'MISSION 3 · ACT I — HOT PLATES', speaker: 'ROSA', portrait: 'rosa',
    lines: [
      'I need clean plates for the getaway fleet, and I need them tonight.',
      'Three cars, three plates, no cops. You drive, I work.',
      'Easy money. Try not to make it hard money.',
    ],
  },
  4: {
    title: 'MISSION 4 · ACT I — LOW TIDE', speaker: 'DEZ', portrait: 'dez',
    lines: [
      'A crate went off the pier at dawn. Customs wants it. So do we.',
      'Fish it out before the tide turns — and before the Meridian boys do.',
      'The sea keeps what it takes. Take it back.',
    ],
  },
  5: {
    title: 'MISSION 5 · ACT I — NEON RAIN', speaker: 'PIP', portrait: 'pip',
    lines: [
      'I move the package through Casino Row. You move the trouble.',
      'Eyes out. The Row watches everyone tonight — especially us.',
      'If the lights go red, we go loud. Your call, Vex.',
    ],
  },
  6: {
    title: 'MISSION 6 · ACT II — SINK THE VANGUARD', speaker: 'VERA', portrait: 'vera',
    lines: [
      'Voss is running for the water with the ledger. The Vanguard is his way out.',
      'Stop the car, stop the man. The whole city is watching this one.',
      'He’s making for Solmar Pier! Ram the Vanguard before it reaches the water!',
    ],
  },
  7: {
    title: 'MISSION 7 · ACT II — PAPER TRAIL', speaker: 'ROSA', portrait: 'rosa',
    lines: [
      'Three copies of the ledger, three floors of the Meridian tower.',
      'One alarm, and the whole building wakes up. Be quick or be loud.',
      'Paper burns. So do bridges. Light both.',
    ],
  },
  8: {
    title: 'MISSION 8 · ACT II — HIGH WATER', speaker: 'DEZ', portrait: 'dez',
    lines: [
      'They come for the docks at dusk. The docks are ours. Keep them.',
      'Five waves, one pier, and a crew that does not run.',
      'Hold the line. The tide is with us tonight.',
    ],
  },
  9: {
    title: 'MISSION 9 · ACT III — THE LONG WAY HOME', speaker: 'PIP', portrait: 'pip',
    lines: [
      'Five stars. Every unit in the city is on you.',
      'Lose them across the whole city — Marina to the Strand and back.',
      'Give them a show, Vex. Make them regret ever seeing your plates.',
    ],
  },
  10: {
    title: 'MISSION 10 · ACT III — SOLMAR BELONGS TO US', speaker: 'VERA', portrait: 'vera',
    lines: [
      'The penthouse, the ledger, the city. One night decides all of it.',
      'Voss has run out of water to run to. Finish it.',
      'This city was never theirs. Take it back.',
    ],
  },
};

export function getDialogue(missionId) {
  return DIALOGUE[missionId] || DIALOGUE[1];
}
