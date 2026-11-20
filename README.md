# Solmar City

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/ahh955/Gta6-game/rank.svg)](https://make.fun/c/gta6-01/leaderboard)
[![reward](https://make.fun/badge/gta6-01/ahh955/Gta6-game/reward.svg)](https://make.fun/bounty/gta6-01)

A sun-soaked open-world crime game for the [make.fun GTA 6 bounty](https://make.fun/bounty/gta6-01) — 2D top-down canvas, zero dependencies, plays offline in desktop Chrome from static files. You are Dare Solis, back in your home city of Solmar to take it back from the Viper gang, one job at a time.

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080. No build step, no network requests.

## What's in the city

- **9 story missions** with a named cast — Rosa Vega, Maya Reyes, Ghost Tanaka, Big Lou Marín, and the Viper boss Silas Vane — each with cash and respect rewards.
- **Solmar PD dispatch**: 0–5 wanted stars, foot cops, cruiser pursuit with PIT nudges, roadblocks at 3+ stars, and the CONDOR-1 police helicopter at 4–5 stars. Get busted or wasted and you wake up at the safehouse, lighter in the pocket.
- **3-person crew with abilities**: Maya calls in a getaway car (7), Ghost hacks the SPD board to drop 2 wanted stars (8), Lou fights beside you (9).
- **Respect ranks and district standing**: climb from Street Rat to Kingpin of Solmar; each of the six districts tracks your standing.
- **Garage with upgrades**: engine tuning, plated armor, sport tires, repaints and repairs at Solmar Customs.
- **Shops and a safehouse**: Solmar Arms (weapons + ammo + body armor), Sunset Diner (heals), and Rosa's Safehouse (sleep to save, heal and clear your wanted level).
- **Weapon wheel** (hold Q): fists, pistol, SMG, shotgun, rifle — plus a **cover system** (C by a wall or car) for shootouts.
- **3 radio stations**, all synthesized live with WebAudio: SOL 98.5 synthwave, Bay Breeze 101 chill, Heatwave 99 street bass (N to switch, M to mute).
- **5 street races** at the Midnight Mile hub against three AI rivals, with checkpoints, live standings and records.
- **Car theft and carjacking**, traffic, pedestrians who flee gunfire, **exploding cars and burning wrecks**, a live canvas minimap, and localStorage saves.

## Controls

| Keys | Action |
| --- | --- |
| WASD / arrows | Move on foot / drive |
| Mouse | Aim · click to shoot |
| E | Enter/exit car · carjack · talk · hack · shops |
| Q (hold) / 1–5 / wheel | Weapon wheel / select weapon |
| C | Take cover |
| Space | Handbrake |
| 7 / 8 / 9 | Crew abilities |
| N / M / H | Radio station / mute / horn |
| Esc | Pause · H help |

## Layout

- `game/index.html` + `game/style.css` — page shell, canvas.
- `game/src/` — one file per system: `city.js` (map + districts), `vehicles.js` (cars, traffic, explosions), `pedestrians.js`, `police.js` (wanted + dispatch), `combat.js` (weapons, enemies, cover), `crew.js`, `missions.js` (9 story jobs), `races.js`, `economy.js` (garage, shops, respect), `save.js`, `audio.js` (SFX + radio), `hud.js` (HUD, minimap, screens), `game.js` (core loop), `main.js` (boot).
- `main.ts` — the make.fun entry program: copies `game/` + `screenshots/` to `/output` and writes `dossier.json`.
- `screenshots/` — four real renders of the running game.

All content is original: the city, characters, vehicles, names, story, art and music are invented for this entry. Nothing from any commercial game.

## License

MIT — see [LICENSE](LICENSE).
