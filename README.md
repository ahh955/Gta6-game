# Solmar City 3D — Make GTA 6 (round 6)

[![Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/ahh955/Gta6-game/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/ahh955/Gta6-game/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game in the spirit of GTA 6, built from scratch in
three.js for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01).
No Rockstar names, characters, maps or assets — Solmar City, its people and its
story are all invented here.

## Play it

```sh
cd game
python3 -m http.server 8080
```

Then open <http://localhost:8080> in desktop Chrome. Everything is static files
under `game/` — three.js is vendored as `game/vendor/three.module.min.js` — so
the game runs fully offline with no network request.

## The game

**Solmar City** is a sun-soaked coastal crime city: a palm-lined beach
boulevard, a neon casino strip, a marina, a port, and six districts, each with
its own standing. You play **Dara "Vex" Marlowe**, a wheelman climbing the
underworld from street racer to fixer.

- **10 story missions** with stages, timers, objectives and NEXT steps, from a
  first getaway to a casino-vault heist.
- **Solmar PD dispatch**: 6+ named units (KITE-1, MARLIN-3, CORAL-48, TERN 5,
  HERON 2, MAKO 6) with live status chips and distances; a 5-star wanted
  system, PIT maneuvers and roadblocks at 3+ stars, and a police helicopter
  with a spotlight cone at 4–5 stars.
- **Combat**: a weapon wheel with 5+ weapons and ammo, a cover system, gang AI
  and shootouts.
- **Crew**: a 3-person crew — driver, mechanic, lookout — each with an ability
  and a portrait.
- **Progression**: 7 respect ranks, 6-district standing, a garage, shops and a
  safehouse, plus 5 street races.
- **World**: traffic cars and fleeing pedestrians, a detailed minimap with a
  street grid and a red search-zone ring, 3 WebAudio radio stations with named
  songs, and a save system (localStorage).
- **Controls**: WASD drive / walk, Space handbrake, E enter–exit car, F steal
  car, R radio, Q weapon wheel, C cover, M map, P pause, Tab missions.

## Screenshots

The four screenshots in `screenshots/` are real renders of this game, taken
with headless Chromium from the staging URLs the game itself supports:

| Shot | Scene |
| --- | --- |
| `01-chase.jpg` | 4-star chase at 100+ MPH, three cruisers, police heli with spotlight |
| `02-drive.jpg` | Beach boulevard at speed, traffic and pedestrians |
| `03-mission.jpg` | Mid-shootout on foot, muzzle flash and fleeing pedestrians |
| `04-city.jpg` | Wide golden-hour view of the whole city |

Staging is a first-class feature of the game: `?shot=cover|drive|mission|city`
sets up each exact mid-game scene (player state, car, cruisers, heli, HUD) so
the screenshots show the game at its best. The same scenes are reachable by
playing — drive fast past the cops and the chase finds you.

## Layout

```
main.ts            entry program: copies game/ + screenshots/ to /output,
                   writes dossier.json with vendor/makefun-game.ts
game/
  index.html       the game page (HUD, menus, import map)
  src/
    main.js        boot, game loop, input wiring
    city.js        Solmar City: districts, buildings, roads, palms, beach
    vehicles.js    cars, traffic, police cruisers, helicopter
    player.js      on-foot + driving character and camera
    police.js      wanted level, dispatch, PIT, roadblocks, spotlight
    missions.js    10 story missions, stages, timers, objectives
    combat.js      weapon wheel, cover system, gang AI
    crew.js        3-person crew, abilities, portraits
    hud.js         HUD, minimap, dispatch panel, dialogue
    audio.js       3 WebAudio radio stations + sound effects
    save.js        save/load (localStorage)
    staging.js     ?shot= staging scenes for screenshots
  vendor/
    three.module.min.js   three.js 0.160.0, vendored
screenshots/      4 real renders, 1280x720, each under 256 KiB
```

## License

MIT — see [LICENSE](LICENSE).
