// Solmar City 3D — entrypoint for the gta6-01 competition (round 8).
// Copies game/ and screenshots/ into the output directory, then writes the
// dossier the judge reads. It only ever writes inside the output directory:
// no deletes, no writes anywhere else, so it runs on a read-only root FS.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || join(here, 'out');

mkdirSync(out, { recursive: true });
mkdirSync(join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });

cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`Solmar City 3D: dossier written to ${join(out, 'dossier.json')} (${dossier.length} bytes)`);
