[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/ahh955/Gta6-game/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/ahh955/Gta6-game/reward.svg)](https://make.fun/bounty/gta6-01)

# Solmar City

An original 2D top-down open-world crime game, built from scratch for the
[Make GTA 6 bounty on make.fun](https://make.fun/bounty/gta6-01). Pure HTML5
canvas, dependency-free, zero vendored code: every system below is the game's
own source under `game/src/`.

## The city

Solmar City is a sun-soaked coastal city: 8 avenues by 6 streets of drivable
roads, a park with a pond, a beach on the east edge and a working harbour to
the south. Traffic flows on the right-hand side of the road, pedestrians walk
the sidewalks, and the sea sparkles along two edges of the map.

## What you can do

- **Drive and steal cars** — walk up to any car and press E. Parked cars are
  free unless a cop watches you take one; jacking a moving car always draws
  heat. Arcade handling with a handbrake (Space) for slides and tire smoke.
- **Wanted system (0–5 stars)** — stealing, hitting pedestrians and shooting
  near the police raise your wanted level. Foot cops chase and punch you;
  police cars hunt you across the road grid and ram. Get caught flat-footed
  and the bust meter fills: BUSTED costs a $200 fine. Die and the hospital
  charges $100.
- **5 story missions** — work for Dario Reyes and Mama Luz against the Los
  Tiburones gang: steal the gold Comet, run Mama Luz's spices against the
  clock, take the park back from six gang members, survive three stars for a
  minute, and pull the harbour heist. Rewards run $500 to $2,500.
- **3 street races** — Beach Sprint ($300), Downtown Loop ($450) and Harbor
  Run ($600). Press R in a car at a race gate; beat the gold time for a $200
  bonus. Best times are saved.
- **12 golden doubloons** — hidden around the park, beach, harbour, alleys
  and plaza. $100 each, $1,000 bonus for all twelve.
- **Combat** — a pistol with a 12-round magazine (click to shoot, R to
  reload), fists (Q to switch, F to punch), and gang members who shoot back.
- **Progress that saves** — cash, missions, doubloons, race best times and
  the mute setting persist in localStorage.
- **Sound** — every effect and the music loop are synthesized with WebAudio.
  No audio files.

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrows | Move on foot, drive |
| Mouse | Aim (click to shoot) |
| E | Steal / enter / exit a car, talk to a mission giver |
| Q | Pistol or fists |
| F | Punch |
| R | Reload — or start a race at a race gate |
| Space | Handbrake |
| Shift | Sprint |
| M | Mute |
| Esc / P | Pause |

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. The game is static files
under `game/` with no build step and no network request.

## Screenshots

The four screenshots in `screenshots/` are real renders of this game's own
code, taken in headless Chromium from the `?shot=` poses defined in
`game/src/shots.js` (see `shots.json` for the list). The chase shot nudges
two police cars into frame behind the player, and the race shot starts the
Beach Sprint timer; everything else in every shot is the game playing itself.

## Layout

- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` with the kit's `buildDossier`.
- `game/index.html` — the page: one canvas, one module script.
- `game/src/` — one file per system: `world` (city layout), `traffic`
  (cars and pedestrians), `police` (wanted level and pursuit), `player`,
  `combat`, `missions`, `races`, `collectibles`, `render` (scene),
  `hud` (panels, minimap, menus), `audio` (synthesized sound), `shots`
  (screenshot poses), plus `config`, `random`, `input`, `save`, `main`.
- `vendor/makefun-game.ts` — the kit's dossier library, copied unchanged.
- `serve.ts` — a tiny static server for local play.

## License

MIT — see `LICENSE`.
