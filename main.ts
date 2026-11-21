// Solmar City 3D — entry program.
//
// Builds the submission package for the make.fun GTA 6 bounty:
//   1. sanity-checks the screenshots bundled with the repo,
//   2. copies the game and screenshots into the output directory,
//   3. generates the dossier (canonical JSON) via the kit builder.
//
// Usage: MAKEFUN_OUTPUT_DIR=<dir> node main.ts   (defaults to /output)

import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const MAX_SCREENSHOT_BYTES = 262_144;
const MIN_SCREENSHOTS = 3;
const MAX_SCREENSHOTS = 4;

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47];
const JPEG_HEADER = [0xff, 0xd8, 0xff];

const DOSSIER_LIMITS = {
  text_max_bytes: 163_840,
  screenshots: { max: 4, max_bytes: MAX_SCREENSHOT_BYTES },
  game_max_files: 993,
  game_max_bytes: 50_331_648,
  game_path_max_bytes: 1000,
};

function startsWithBytes(buf: Buffer, prefix: number[]): boolean {
  return prefix.every((byte, i) => buf[i] === byte);
}

async function checkScreenshots(folder: string): Promise<number> {
  let names: string[];
  try {
    names = await readdir(folder);
  } catch {
    throw new Error(`screenshots directory is missing: ${folder}`);
  }
  if (names.length < MIN_SCREENSHOTS || names.length > MAX_SCREENSHOTS) {
    throw new Error(
      `expected ${MIN_SCREENSHOTS}-${MAX_SCREENSHOTS} screenshots, found ${names.length}`,
    );
  }
  for (const name of names) {
    const lower = extname(name).toLowerCase();
    if (lower !== ".png" && lower !== ".jpg" && lower !== ".jpeg") {
      throw new Error(`screenshot ${name} is not a PNG or JPEG file`);
    }
    const data = await readFile(join(folder, name));
    if (data.length > MAX_SCREENSHOT_BYTES) {
      throw new Error(
        `screenshot ${name} is ${data.length} bytes, over the ${MAX_SCREENSHOT_BYTES} byte limit`,
      );
    }
    const isPng = startsWithBytes(data, PNG_HEADER);
    const isJpeg = startsWithBytes(data, JPEG_HEADER);
    if (!isPng && !isJpeg) {
      throw new Error(`screenshot ${name} has neither PNG nor JPEG magic bytes`);
    }
    if ((lower === ".png" && !isPng) || (lower !== ".png" && !isJpeg)) {
      throw new Error(`screenshot ${name}: extension ${lower} does not match its file contents`);
    }
  }
  return names.length;
}

async function main(): Promise<void> {
  const repoRoot = dirname(fileURLToPath(import.meta.url));
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  const shotDir = join(repoRoot, "screenshots");

  const shotCount = await checkScreenshots(shotDir);

  await mkdir(outDir, { recursive: true });
  await cp(join(repoRoot, "game"), join(outDir, "game"), { recursive: true });
  await cp(shotDir, join(outDir, "screenshots"), { recursive: true });

  const dossier = buildDossier(repoRoot, DOSSIER_LIMITS);
  await writeFile(join(outDir, "dossier.json"), dossier);

  console.log(`Wrote submission to ${outDir}`);
  console.log(`  screenshots: ${shotCount}`);
  console.log(`  dossier.json: ${dossier.length} bytes`);
}

await main();
