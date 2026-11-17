// Solmar City's story: Dario Reyes, a wheelman with an empty wallet, works for Mama Luz, a
// fixer who runs the city's jobs from a taco truck. The rival crew is Los Tiburones. Every
// name, place and line here is original.

export const INTRO_LINES = [
  { who: 'DARIO', text: 'Solmar City. Sun, salt air, and everybody owes somebody.' },
  { who: 'DARIO', text: 'I came here with an empty wallet and a fast right foot.' },
  { who: 'MAMA LUZ', text: 'You want work, wheelman? The city is hiring. Start with wheels.' },
  { who: 'MAMA LUZ', text: 'Steal a car, bring it to my garage. No scratches. Well... few scratches.' },
];

export const MISSION_BRIEFINGS = [
  [
    { who: 'MAMA LUZ', text: 'First job, easy money. Any car on the street is yours if you take it.' },
    { who: 'MAMA LUZ', text: 'Drive it to the garage on 3rd Street. The yellow marker shows the way.' },
  ],
  [
    { who: 'MAMA LUZ', text: 'A courier needs a ride across town, and the cops are feeling nosy.' },
    { who: 'MAMA LUZ', text: 'Take the blue sedan, hit the three checkpoints, lose the tail.' },
    { who: 'COURIER', text: 'Just drive, man. Drive like the rent is due. Because it is.' },
  ],
  [
    { who: 'MAMA LUZ', text: 'Three drops, one sunset. The clients pay extra if you are fast.' },
    { who: 'MAMA LUZ', text: 'Clock is ticking, wheelman. Do not keep the city waiting.' },
  ],
  [
    { who: 'MAMA LUZ', text: 'Los Tiburones think the plaza is theirs. Show them the deed.' },
    { who: 'DARIO', text: 'On foot, up close. Finally, a job with some leg room.' },
  ],
  [
    { who: 'MAMA LUZ', text: 'The big one. A gold sports car waits at the harbor, and everyone wants it.' },
    { who: 'MAMA LUZ', text: 'Take it, shake the whole police department, bring it home.' },
    { who: 'DARIO', text: 'Gold car, five stars, one sunset. Let us see what Solmar is made of.' },
  ],
];

export const MISSION_COMPLETE_LINES = [
  'Clean wheels, clean money. $500 is yours.',
  'The courier made it. The cops are still looking. $800.',
  'Every drop on time. The clients love you. $1000.',
  'The plaza is ours again. Los Tiburones will remember today. $1200.',
  'The gold car is home. You are a legend now, wheelman. $2500.',
];

export const MISSION_NAMES = [
  'First Wheels',
  'The Getaway',
  'Sunset Delivery',
  'Turf War',
  'The Big Score',
];

export const MISSION_HINTS = [
  'Press E near a car to steal it, then follow the yellow marker to the garage.',
  'Drive through the checkpoints in order. The police will chase you.',
  'Reach all three drop points before the timer runs out.',
  'Defeat every Tiburones fighter in the plaza. Aim with the mouse, click to shoot.',
  'Steal the gold sports car at the harbor, lose the cops, bring it to the garage.',
];

export const GAME_COMPLETE_LINE = 'Every job done. Solmar City is yours, wheelman.';
