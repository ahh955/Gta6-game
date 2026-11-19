// Solmar City — the program that hands the game in. It copies game/ and
// screenshots/ from this repository to the output directory and writes
// dossier.json with the kit's buildDossier, exactly as the scorer rebuilds
// it. Deterministic: two runs write the same bytes.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// The caps the bounty's gate holds the entry to.
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyFresh(name) {
  const target = join(outDir, name);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  cpSync(join(repoRoot, name), target, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyFresh('game');
copyFresh('screenshots');
const dossier = buildDossier(outDir, dossierCaps);
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Solmar City handed in: dossier.json (${dossier.length} bytes)`);
