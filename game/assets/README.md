# 3D model assets — Kenney (CC0)

The GLB models in this folder are from Kenney (https://kenney.nl), released
under Creative Commons Zero (CC0 1.0 Universal) — public domain, free for
personal and commercial use, no attribution required (credited here anyway).
Downloaded 23 Nov 2026 from kenney.nl as the pack ZIPs; only the models the
game actually loads were copied in.

| Folder | Pack | Source |
| --- | --- | --- |
| cars/ | Car Kit (v3.1) | https://kenney.nl/assets/car-kit |
| city/ | City Kit (Commercial) (v2.1) | https://kenney.nl/assets/city-kit-commercial |
| chars/ | Blocky Characters (v2.0) | https://kenney.nl/assets/blocky-characters |

Each pack's GLBs reference their texture by relative path
(`Textures/colormap.png` for cars/city, `Textures/texture-?.png` for
characters), so each folder keeps its own `Textures/` subfolder next to the
GLBs — move a GLB and its texture must move with it.

Models used (15 GLBs, ~2.4 MB total):
- cars: sedan, sedan-sports (hero car), hatchback-sports, suv, taxi,
  police (cruisers), van, truck, delivery.
- city: building-a, building-b, building-e, building-f,
  building-skyscraper-a, building-skyscraper-c.
- chars: character-a … character-f (Blocky Characters v2.0) are NOT loaded
  any more — the blocky figures read as square toy people at readable size,
  so all people are the articulated primitives in `../src/people.js`. The
  6 char GLBs stay in the repo, unused, for reference.

The game loads them with the vendored Three.js GLTFLoader
(`../vendor/loaders/GLTFLoader.js`, r160, matching `three.module.min.js` r160).
Every loader accessor returns null when its model failed to load, and the
builders in `../src/` fall back to the primitive-built meshes — a missing or
broken GLB never breaks the scene.
