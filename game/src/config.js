// Solmar City 3D — shared game data: districts, ranks, weapons, crew, radio,
// missions. Every name here is invented for this game.

export const DISTRICTS = [
  { id: "marina", name: "Marina District", standing: 62, color: "#38bdf8" },
  { id: "boulevard", name: "Solmar Boulevard", standing: 48, color: "#f59e0b" },
  { id: "casino", name: "Casino Strip", standing: 71, color: "#e879f9" },
  { id: "port", name: "Port Solmar", standing: 35, color: "#94a3b8" },
  { id: "oldtown", name: "Old Town", standing: 54, color: "#a3e635" },
  { id: "hills", name: "Coral Hills", standing: 28, color: "#fb7185" },
];

export const RESPECT_RANKS = [
  { name: "NOBODY", rp: 0 },
  { name: "RUNNER", rp: 500 },
  { name: "HUSTLER", rp: 1500 },
  { name: "WHEELMAN", rp: 3000 },
  { name: "FIXER", rp: 5500 },
  { name: "SHOT CALLER", rp: 9000 },
  { name: "KINGPIN", rp: 14000 },
];

export const WEAPONS = [
  { id: "pistol", name: "P-9 Pistol", ammo: 84, max: 120, slot: "1", damage: 22 },
  { id: "smg", name: "VK-9 SMG", ammo: 210, max: 300, slot: "2", damage: 14 },
  { id: "shotgun", name: "Marauder 12G", ammo: 36, max: 48, slot: "3", damage: 55 },
  { id: "rifle", name: "AR-77 Carbine", ammo: 150, max: 240, slot: "4", damage: 30 },
  { id: "launcher", name: "Hornet RPG", ammo: 4, max: 8, slot: "5", damage: 200 },
];

export const CREW = [
  {
    id: "juno",
    name: "Juno Reyes",
    role: "Driver",
    ability: "Slipstream",
    abilityDesc: "Double top speed for 10s",
    cooldown: 45,
    color: "#f472b6",
    initials: "JR",
  },
  {
    id: "marco",
    name: "Marco 'Wrench' Ito",
    role: "Mechanic",
    ability: "Field Repair",
    abilityDesc: "Restore 50% car condition",
    cooldown: 60,
    color: "#fbbf24",
    initials: "MI",
  },
  {
    id: "tess",
    name: "Tess Okafor",
    role: "Lookout",
    ability: "Ghost Route",
    abilityDesc: "Drop 1 wanted star",
    cooldown: 90,
    color: "#34d399",
    initials: "TO",
  },
];

export const RADIO_STATIONS = [
  {
    id: "solmar-fm",
    name: "SOLMAR FM 101.2",
    genre: "Sunset synthwave",
    songs: [
      { title: "Neon Tide", artist: "The Marliners" },
      { title: "Boulevard Hearts", artist: "Cassette Palms" },
      { title: "Gold Hour Run", artist: "Vex & The Sirens" },
    ],
  },
  {
    id: "coral-talk",
    name: "CORAL TALK 88.4",
    genre: "Street talk & news",
    songs: [
      { title: "The 6 O'Clock Siren", artist: "DJ Marisol" },
      { title: "Port Authority Blues", artist: "Harbor Line" },
    ],
  },
  {
    id: "wave-973",
    name: "WAVE 97.3",
    genre: "Coastal house",
    songs: [
      { title: "Salt Air", artist: "Palm Court Club" },
      { title: "High Tide Drive", artist: "Luna Ferrera" },
      { title: "Night Ferry", artist: "The Breakers" },
    ],
  },
];

export const DISPATCH_UNITS = [
  { callsign: "KITE-1", kind: "Air unit", chip: "SPOTLIGHT", chipColor: "#38bdf8", distance: 0.2 },
  { callsign: "MARLIN-3", kind: "Interceptor", chip: "RAMMING", chipColor: "#ef4444", distance: 0.1 },
  { callsign: "CORAL-48", kind: "Patrol", chip: "Pursuit", chipColor: "#f97316", distance: 0.3 },
  { callsign: "TERN 5", kind: "Patrol", chip: "Pursuit", chipColor: "#f97316", distance: 0.5 },
  { callsign: "HERON 2", kind: "Roadblock", chip: "ROADBLOCK", chipColor: "#eab308", distance: 0.8 },
  { callsign: "MAKO 6", kind: "Interceptor", chip: "FIRING", chipColor: "#ef4444", distance: 0.4 },
];

export const MISSIONS = [
  { id: 1, title: "FIRST GEAR", giver: "Juno Reyes", payout: 800, stages: ["Meet Juno at the marina", "Steal the Vortex GT", "Lose the cops", "Deliver the car to the safehouse"] },
  { id: 2, title: "SALT & SMOKE", giver: "Marco Ito", payout: 1200, stages: ["Pick up the package at the port", "Dodge the rival crew", "Drop it at Old Town"] },
  { id: 3, title: "NEON RUN", giver: "Tess Okafor", payout: 1500, stages: ["Win the boulevard race", "Shake the tail", "Photo the casino vault door"] },
  { id: 4, title: "HIGH TIDE", giver: "Captain Sal", payout: 2200, stages: ["Boat chase along the marina", "Board the smuggler yacht", "Recover the ledger"] },
  { id: 5, title: "GHOST ROUTE", giver: "Tess Okafor", payout: 2600, stages: ["Drive the decoy through the strip", "Swap cars in the parking garage", "Vanish at 0 stars"] },
  { id: 6, title: "VAULT RUN", giver: "Dara Marlowe", payout: 4200, stages: ["Case the Coral Crown casino", "Cut the vault power", "Grab the cash — escape the vault", "Outrun the Solmar PD dragnet"] },
  { id: 7, title: "KINGFISH", giver: "Juno Reyes", payout: 3800, stages: ["Tail the Kingfish convoy", "Ambush at the port gates", "Take the shipment"] },
  { id: 8, title: "BURNING TIDE", giver: "Marco Ito", payout: 5100, stages: ["Rig the rival garage", "Cover the crew's exit", "Burn the evidence"] },
  { id: 9, title: "THE LONG CON", giver: "Dara Marlowe", payout: 6800, stages: ["Plant the forged deeds", "Win the casino auction", "Walk out clean"] },
  { id: 10, title: "SOLMAR HEIST", giver: "The Crew", payout: 12000, stages: ["Breach the Coral Crown vault", "Hold the lobby", "Load the getaway boat", "Escape Solmar by sea"] },
];

export const STREET_RACES = [
  { name: "Boulevard Sprint", district: "Solmar Boulevard", laps: 2, prize: 900 },
  { name: "Marina Loop", district: "Marina District", laps: 3, prize: 1200 },
  { name: "Casino Dash", district: "Casino Strip", laps: 2, prize: 1500 },
  { name: "Port Haul", district: "Port Solmar", laps: 3, prize: 1800 },
  { name: "Hills Climb", district: "Coral Hills", laps: 1, prize: 2400 },
];

export const GARAGE_CARS = [
  { name: "Vortex GT", topSpeed: 142, accel: 8.2, handling: 8.8, owned: true },
  { name: "Marlin S", topSpeed: 128, accel: 7.4, handling: 7.9, owned: true },
  { name: "Coral Cruiser", topSpeed: 96, accel: 5.1, handling: 6.2, owned: true },
  { name: "Sunset Stallion", topSpeed: 155, accel: 9.1, handling: 8.4, owned: false, price: 24000 },
];

export const PLAYER = {
  name: "Dara 'Vex' Marlowe",
  cash: 18450,
  rp: 6200,
  rankIndex: 4,
};
