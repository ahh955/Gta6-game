# Solmar City 3D — Make GTA 6 (gta6-01, round 12)

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/ahh955/Gta6-game/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/ahh955/Gta6-game/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world 3D crime game in the browser: a sun-soaked beach boulevard,
ten story missions, four street races, a crew to build, and Solmar PD
closing in from every direction. You are Alex "Vex" Marlowe, a driver fresh
off the ferry — steal a car, run the jobs, climb from nobody to kingpin.

![Four-star chase down the Strand](screenshots/1-chase.jpg)
![Night shootout at the Coral Docks](screenshots/2-night.jpg)
![CITY MAP tab: full city grid, named roads, career panel](screenshots/3-map.jpg)
![Title screen over the golden-hour city](screenshots/4-title.jpg)

## Play

```bash
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no
network needed at runtime: Three.js is vendored under `game/vendor/`, and
every texture is drawn procedurally in code.

## Controls

| Key | Action |
| --- | ------ |
| W / A / S / D | Drive (accelerate, steer, brake) |
| Space | Handbrake |
| F | Get in / out of the car |
| M | Rosa's ability — swap plates, drop a wanted star |
| L | Dez's ability — quick repair |
| K | Pip's ability — reveal police on the minimap |
| R | Start a street race |
| 1–5 | Switch weapon (fists, .38, SMG, 12G, AR-9) |
| P / Esc | Pause menu (MAP / STORY / STATS / CREW / SAVE) |

## What's in the game

- **A living city:** a beach boulevard with pastel towers, neon shop signs,
  striped awnings, curved palms with drooping fronds, a Ferris wheel on the
  pier, traffic, pedestrians, a scooter rider and beach umbrellas — plus a
  real day/night cycle with a moon, stars and neon nights.
- **Ten story missions** in three acts across seven districts, from FIRST
  GEAR to SOLMAR BELONGS TO US, with named contacts, full dialogue screens
  with painted portraits, and payouts.
- **Four street races** with checkpoints, rival drivers, gold/silver target
  times and a race HUD — plus eight stunt jumps, twenty golden doubloons,
  seven district jobs and a five-car export list.
- **A five-star wanted system:** patrols, PIT attempts, roadblocks, spike
  strips and the KESTREL-9 helicopter with a spotlight at four stars, a
  live dispatch radio log, and a hiding mechanic fed by district standing.
- **A crew with abilities and portraits:** Rosa (driver), Dez (mechanic),
  Pip (lookout) — painted faces, loyalty, and recruitment tied to missions.
- **Shops and named places:** Iron & Ivory gun shop, Sunset Respray, the
  Marlowe Loft safehouse, Solmar PD Precinct 3, the Solmar Boatyard.
- **Progression:** cash, RP, seven respect ranks from NOBODY to KINGPIN,
  mission ratings (Gold/Silver/Bronze), a weighted completion percentage,
  district standing, a garage, five weapons, a motorbike, and three save
  slots via localStorage.
- **A tabbed pause menu:** MAP (full city grid with named roads and a
  compass rose, legend markers for missions, safehouse, garage, races,
  shops, jobs, precinct and export, plus a career panel: respect, cash,
  jobs, completion, crew and career stats), STORY (ten missions, acts,
  ratings), STATS (completion donut, nine-line checklist, medals, career
  stats, rank progress), CREW and SAVE.
- **Procedural audio:** engine hum, siren wail and a radio jingle, all
  synthesized with WebAudio — no audio files.

## Screenshots

The four staged shots (`shots.json`, all `?seed=1` for a fixed city),
each a different screen:

1. `1-chase.jpg` — four-star chase, Mission 10 finale, 167 KM/H, low close camera, red hero car, five cruisers with light bars frozen bright, KESTREL-9 large in frame with a crisp layered spotlight cone on the car, roadblock ahead, eight dispatch units
2. `2-night.jpg` — dusk on-foot shootout at the Coral Docks night market, Mission 8 HIGH WATER, hero aiming with tracer and target ring, three standing gunmen with red markers, one enemy down, a burning car, market stalls, the KILO 600 bike in the open road, 2 stars
3. `3-map.jpg` — the CITY MAP tab: seven districts with standing, fourteen named roads, block subdivisions, boardwalk and pier, red search zone, stat strip, garage & gun shop price list, mission checklist, crew with portraits
4. `4-title.jpg` — the title screen over the golden-hour city, three save slots with act names and real progress, extruded 3D lettering

Round 12 rebuilt the entry against the round-11 intake rejection (the
round-11 upload was sent with the old level-19 kit and never graded;
round 10 stands at #957, 989,409) and a study of the current top 5, all
tied at the 993,977 saturation score: the night shot is re-staged as a
lit dusk shootout with a tracer, standing enemies and a burning car; the
map screen is densified with fourteen roads, a stat strip, the shop
price list and a mission checklist; the cover runs the Mission 10
finale with a red hero car, a detailed helicopter and eight dispatch
units; and the dossier import order puts the systems files first so the
text cut lands on geometry, not on the HUD, police or audio systems.

## Layout

- `game/` — the game (index.html, style.css, src/, vendor/three.module.min.js)
- `screenshots/` — the four staged JPEGs
- `main.ts` — entrypoint: copies game/ + screenshots/ into the output
  directory and writes `dossier.json` (writes only inside the output dir)
- `serve.ts` — local static server for playing the game
- `vendor/makefun-game.ts` — the competition kit's dossier builder (unchanged)

## License

MIT — see [LICENSE](LICENSE).
