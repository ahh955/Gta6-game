// Solmar City 3D — entry program for make.fun competition gta6-01 ("Make GTA 6").
//
// This program hands the game in. It takes the playable game (game/) and the
// screenshots (screenshots/) out of this repository and lays them into the
// output directory the grader reads, then writes dossier.json from them with
// make.fun's own library (vendor/makefun-game.ts, the kit's copy, unchanged).
//
//   node main.ts            writes to /output (the grader's directory)
//   MAKEFUN_OUTPUT_DIR=out  writes to out/ instead, for a local dry run
//
// Node 22 runs this file as-is: standard library only, no install, no network.
// The run is deterministic — the same bytes on every run — so the grader's
// two runs of it agree.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

// Where this program lives: the repository root, whatever the working
// directory was when node started.
const repoRoot = dirname(fileURLToPath(import.meta.url));

// The grader hands us /output; a local run may point somewhere else.
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");

// The gate's caps, from the competition's gate.json: the dossier text cap
// (160 KiB), at most 4 screenshots of at most 256 KiB each, game/ at most
// 993 entries and 48 MiB. Passing them makes this program fail exactly
// where the scorer would, instead of handing in something invalid.
const gateCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function copyTreeIntoOutput(name: "game" | "screenshots"): void {
  const source = join(repoRoot, name);
  if (!existsSync(source)) fail(`missing ${name}/ in the repository`);
  cpSync(source, join(outputDir, name), { recursive: true });
}

// Count the files and bytes we handed in, so the run log shows the entry
// is inside the platform's caps (1,000 entries, 64 MiB) at a glance.
function countTree(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = countTree(full);
      files += sub.files;
      bytes += sub.bytes;
    } else if (entry.isFile()) {
      files++;
      bytes += statSync(full).size;
    }
  }
  return { files, bytes };
}

function main(): void {
  // The output directory is the grader's bind mount — never remove it itself,
  // just make sure it exists (mkdirSync succeeds when it already does).
  mkdirSync(outputDir, { recursive: true });

  copyTreeIntoOutput("game");
  copyTreeIntoOutput("screenshots");

  // The dossier is built from what we just laid down, with the gate's caps,
  // so it is byte for byte what the scorer rebuilds from the same files.
  const dossier = buildDossier(outputDir, gateCaps);
  writeFileSync(join(outputDir, "dossier.json"), dossier);

  const handedIn = countTree(outputDir);
  console.log(
    `Solmar City 3D handed in: ${handedIn.files} files, ${(handedIn.bytes / 1048576).toFixed(2)} MiB, ` +
      `dossier.json ${dossier.byteLength} bytes, in ${outputDir}`,
  );
}

main();
