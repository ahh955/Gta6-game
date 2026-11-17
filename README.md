# Solmar City — an open-world crime game

An original open-world crime game in the spirit of GTA 6, playable in a desktop browser from
static files with no network request. Built by an AI agent for
[make.fun](https://make.fun/r/xsff4jzh)'s "Make GTA 6" bounty.

## The game

Solmar City is a sun-soaked coastal city. You are Dario Reyes, a wheelman with an empty
wallet, running jobs for Mama Luz, a fixer who works out of a taco truck. Explore the city
on foot and by car, steal cars, outrun the law, and work through five missions with a story.

**Systems:**

- **Open world** — a grid city with avenues, streets, blocks, a central park, a beach
  promenade and a harbor district, all generated from a seed.
- **Driving** — enter and exit cars, steal parked and traffic cars, arcade handling with
  acceleration, braking, steering and handbrake slides.
- **Traffic** — AI cars drive the road grid in their lanes, slow for the car ahead and stop
  at jams; pedestrians stroll the sidewalks and flee from danger.
- **Wanted level** — 0 to 5 stars. Stealing cars, hitting pedestrians and shooting near cops
  raise the heat; laying low out of sight cools it. Foot cops chase and arrest you; police
  cars chase and ram. Get caught and you are busted.
- **Missions + story** — five jobs with briefings, objectives, waypoints on the minimap and
  cash rewards: a car theft, a getaway drive under pursuit, a timed delivery, a turf-war
  shootout, and a final heist in a gold sports car.
- **Combat** — pistol with aim, ammo and reload, punches, rival gang members who hunt and
  shoot back, health and ammo pickups.
- **HUD** — live canvas minimap (player, traffic, police, mission markers, north), money,
  health, wanted stars, objective banner, speedometer and dialogue box.
- **Start, pause and save** — title screen, pause menu, and progress (money, missions,
  position) saved to localStorage.
- **Sound** — everything synthesized live with WebAudio: engine hum, police sirens,
  gunshots, pickups, mission jingles and a slow golden-hour music loop. No audio files.

Everything is original: the city, characters, vehicles, names, story, art and music are the
game's own. Nothing comes from Rockstar Games or any other commercial game.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Move on foot, drive (W accelerate, S brake/reverse, A/D steer) |
| Shift | Sprint on foot, handbrake while driving |
| Mouse | Aim |
| Click | Shoot |
| E | Enter / exit car |
| F | Punch |
| P / Esc | Pause |
| M | Mute |
| Enter / Space | Start, continue dialogue |

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no dependencies.

## Layout

- `game/index.html` — the page; loads the game from `game/src/`.
- `game/src/` — the game's own source, one job per file: `config.js` (tuning),
  `random.js` (seeded RNG), `input.js`, `world.js` (city generation), `vehicles.js`
  (car physics), `traffic.js`, `pedestrians.js`, `player.js`, `combat.js`, `police.js`
  (wanted level), `missions.js`, `story.js`, `audio.js`, `save.js`, `hud.js` (HUD and
  minimap), `render.js`, `shots.js` (screenshot poses), `game.js` (state and the step),
  `main.js` (boot and the loop).
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes
  `dossier.json` with the kit's `vendor/makefun-game.ts`.
- `screenshots/` — four real renders of the game: the title, driving, a police chase and a
  mission firefight.

## License

MIT. See `LICENSE`.
