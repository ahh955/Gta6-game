# Solmar City

[![Solmar City — make.fun bounty](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Solmar City rank](https://make.fun/badge/gta6-01/ahh955/Gta6-game/rank.svg)](https://make.fun/c/gta6-01/leaderboard)
[![Solmar City reward](https://make.fun/badge/gta6-01/ahh955/Gta6-game/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game in 3D. Solmar City is a sun-soaked coastal
city at golden hour: palm-lined beach boulevards, a downtown of lit towers, a
working port, and the Solmar PD watching every corner. Play as a small-time
wheelman climbing the city's respect ladder — one job, one chase, one
roadblock at a time.

Everything here is original: no Rockstar names, logos, characters, maps or
assets. The game runs fully offline in desktop Chrome from static files, with
zero network requests at runtime. Built with vendored three.js.

## Features

- **Open 3D world** — a procedural dusk city: downtown towers with lit
  windows, beach + ocean, palm boulevards, streetlights, traffic and
  pedestrians, all from a seeded layout so the city is stable every run.
- **8 story missions** — a linked campaign from your first delivery job to
  the big harbour score, with mission tracker, dialogue and staged objectives.
- **Solmar PD dispatch** — a 0–5 star wanted system with pursuing cruisers,
  PIT manoeuvres, **roadblocks at 3+ stars** and the **CONDOR-1 helicopter**
  with a searchlight at 4–5 stars. Named dispatch panel with unit callsigns,
  distances and statuses.
- **3-person crew** — recruit and bring crew members on jobs; each has a
  skill that changes how a mission plays.
- **Respect ranks + district standing** — earn respect per district; higher
  standing opens new jobs, shops and races.
- **Garage upgrades** — tune engine, armour, tyres and paint on the cars
  you drive, and repair wrecks back to full health.
- **Shops + safehouse** — buy weapons, ammo and armour at Solmar Arms, eat
  at the Sunset Diner to heal, and sleep at the safehouse to save.
- **Weapon wheel** — pistols, SMG, shotgun and more, with a cover system for
  shootouts.
- **3 radio stations** — synthesized in-browser stations (sunset synthwave,
  coastal reggae-dub, night drive jazz-funk). N switches station, M mutes.
- **5 street races** — checkpoint races across the city against rival drivers.
- **Exploding cars** — damage, smoke, fire and wrecks that stay on the street.
- **Minimap** — a live circular minimap with mission markers, police and
  points of interest.
- **Saves** — progress, cash, respect, garage and mission state persist in
  localStorage.

## Controls

| Key / input | Action |
|---|---|
| W / A / S / D | Move / drive (accelerate, steer, brake / reverse) |
| Shift | Sprint (on foot) |
| Space | Handbrake (driving) / jump (on foot) |
| E | Enter / exit car |
| Mouse | Look around (third-person camera) |
| Left click | Shoot (on foot) |
| C | Take / leave cover |
| Q (hold) | Weapon wheel (flick mouse to pick) |
| 1 / 2 / 3 / 4 / 5 | Weapon slots |
| R | Reload |
| J | Job list (start a mission) |
| F | Shop / garage / safehouse / race hub |
| 7 / 8 / 9 | Crew abilities (getaway car / hack heat / backup) |
| N | Next radio station |
| M | Mute / unmute audio |
| H | Help |
| P / Esc | Pause (restart mission from the pause menu) |

## Play it

Serve the `game/` folder with any static server and open it in desktop
Chrome — or run the included one:

```sh
node serve.ts
# then open http://localhost:8080
```

No build step, no install, no network. The game is plain static files:
`game/index.html` plus ES modules under `game/src/`, with three.js vendored
at `game/vendor/three.module.min.js`.

## Layout

```
main.ts                  Node 22 entry program: copies game/ + screenshots/
                         to /output (or $MAKEFUN_OUTPUT_DIR) and writes
                         dossier.json via vendor/makefun-game.ts
serve.ts                 tiny static server for local testing (port 8080)
vendor/makefun-game.ts   make.fun dossier builder (kit scaffolding)
game/
  index.html             entrypoint: canvas + DOM HUD mount points
  style.css              HUD + screens styling
  vendor/
    three.module.min.js  vendored three.js 0.160.0
  src/
    main.js              boot, game loop, state machine, debug handle
    config.js            constants: city size, dusk palette, tuning
    util.js              seeded RNG + math helpers
    input.js             keyboard + mouse state
    audio.js             WebAudio SFX + 3 synthesized radio stations
    render.js            renderer, sun + shadows, fog, camera rig
    world.js             procedural 3D city: buildings, roads, beach, palms
    vehicles.js          car models, arcade driving, traffic, damage
    player.js            third-person character, enter/exit cars
    police.js            wanted stars, pursuit, roadblocks, CONDOR-1 heli
    pedestrians.js       sidewalk walkers who flee from gunfire
    missions.js          8 story missions, objectives, dialogue, beacon
    hud.js               mission tracker, dispatch, dialogue, minimap
    combat.js            5 weapons, shooting, cover, enemy gang AI
    crew.js              3 recruitable crew + abilities (keys 7/8/9)
    economy.js           ranks, district standing, garage, shops, safehouse
    races.js             5 street races, rival AI, standings, best times
    save.js              localStorage save/load
screenshots/             4 staged screenshots (first by name is the cover)
```

## Debug handle

For testing and screenshots, the running game exposes `window.__solmar`
with the live state plus `teleport(x, z)`, `setWanted(n)`,
`setTime(hour)`, `spawnCar(type)` and `startMission(id)` helpers.

## License

MIT — see [LICENSE](LICENSE).
