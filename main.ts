// Solmar City — gta6-01 entry program (Node 22, standard library only).
// Hands the game in: copies game/ and screenshots/ from this repository to
// /output (or MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with the kit's vendored buildDossier library.
// The game is plain static files: game/index.html plays offline in desktop
// Chrome with no network request and no build step.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Gate caps from the kit's reference/gate.json.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function fail(message: string): never {
  throw new Error('solmar-city main.ts: ' + message);
}

// Validate the screenshots before copying: 3-4 files, each a whole PNG or
// JPEG of at most 256 KiB, so a bad capture fails loudly here instead of
// silently producing an invalid entry.
function checkScreenshots(dir: string): void {
  if (!existsSync(dir)) fail('screenshots/ is missing');
  const files = readdirSync(dir)
    .filter((f) => !f.startsWith('.'))
    .sort();
  if (files.length < 3 || files.length > CAPS.screenshots.max) {
    fail('expected 3-4 screenshots, found ' + files.length);
  }
  for (const f of files) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(f)) fail('bad screenshot name: ' + f);
    if (!/\.(png|jpe?g)$/i.test(f)) fail('screenshot is not PNG or JPEG: ' + f);
    const bytes = statSync(join(dir, f)).size;
    if (bytes > CAPS.screenshots.max_bytes) fail('screenshot over 256 KiB: ' + f);
  }
}

// Validate the game tree before copying: index.html must exist and stay
// under the gate's 1 MiB cap, and the whole tree under its file/size caps,
// so an oversized asset fails loudly here instead of at grading time.
function checkGame(dir: string): void {
  const index = join(dir, 'index.html');
  if (!existsSync(index)) fail('game/index.html is missing');
  if (statSync(index).size > 1048576) fail('game/index.html is over 1 MiB');
  let files = 0;
  let bytes = 0;
  const walk = (d: string): void => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isSymbolicLink()) fail('symlink in game/: ' + p);
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile()) {
        files += 1;
        bytes += statSync(p).size;
        if (Buffer.byteLength(p) > CAPS.game_path_max_bytes) fail('path over 1000 bytes: ' + p);
      }
    }
  };
  walk(dir);
  if (files > CAPS.game_max_files) fail('game/ holds ' + files + ' files, over the 993 cap');
  if (bytes > CAPS.game_max_bytes) fail('game/ is ' + bytes + ' bytes, over the 48 MiB cap');
}

if (!existsSync(join(here, 'game', 'index.html'))) fail('game/index.html is missing');
checkGame(join(here, 'game'));
checkScreenshots(join(here, 'screenshots'));

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

writeFileSync(join(out, 'dossier.json'), buildDossier(out, CAPS));
