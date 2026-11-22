// Solmar City 3D — entrypoint for the gta6-01 competition (round 11).
// Stages the game for the judge: copies game/ and screenshots/ into the
// output directory, then writes dossier.json via the kit's builder.
//
// Grader safety (round 6 failed on this): the grader runs this on a
// READ-ONLY root filesystem with /output as a bind mount. This file only
// ever creates directories and writes files INSIDE the output directory —
// it never deletes anything, never touches the repo, and never reads the
// clock. mkdirSync with recursive:true is safe on an existing directory.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || join(repoRoot, 'out');

function stageDirectory(name) {
  const source = join(repoRoot, name);
  if (!existsSync(source)) return 0;
  const target = join(outDir, name);
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true });
  return readdirSync(target, { recursive: true }).length;
}

mkdirSync(outDir, { recursive: true });
const gameEntries = stageDirectory('game');
const shotEntries = stageDirectory('screenshots');

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// Report what landed, so a failed staging is obvious from the log alone.
const shotBytes = existsSync(join(outDir, 'screenshots'))
  ? readdirSync(join(outDir, 'screenshots'))
    .map((file) => statSync(join(outDir, 'screenshots', file)).size)
    .reduce((sum, size) => sum + size, 0)
  : 0;
console.log(
  `Solmar City 3D (round 11): ${gameEntries} game entries, ${shotEntries} screenshots `
  + `(${shotBytes} bytes), dossier ${dossier.length} bytes -> ${join(outDir, 'dossier.json')}`,
);
