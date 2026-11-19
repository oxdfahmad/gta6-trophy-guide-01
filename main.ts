// Sunset Platinum — a GTA VI trophy guide for make.fun (Node 22, stdlib only).
// The guide itself is app/: static files that open in a desktop browser with the
// network off. This program hands it in: it reads app/data/trophies.json, checks
// the list is the real official one (55 trophies, 1 platinum / 2 gold / 6 silver /
// 46 bronze, every trophy with a name, a description and a guide of its own),
// copies app/ and screenshots/ to the output directory, and writes
// /output/dossier.json with the vendored make.fun library. Leave
// vendor/makefun-frontend.ts alone: the scorer rebuilds the dossier with its own
// copy and compares the two byte for byte.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const trophyFile = join(here, 'app', 'data', 'trophies.json');

const EXPECTED_GRADES = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
const EXPECTED_TOTAL = 55;

function fail(message) {
  console.error('sunset-platinum: ' + message);
  process.exit(1);
}

function checkTrophyList() {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(trophyFile, 'utf8'));
  } catch (error) {
    fail('cannot read app/data/trophies.json: ' + error.message);
  }
  const trophies = parsed.trophies;
  if (!Array.isArray(trophies)) fail('app/data/trophies.json has no "trophies" array');
  if (trophies.length !== EXPECTED_TOTAL) {
    fail('trophy list has ' + trophies.length + ' trophies, expected ' + EXPECTED_TOTAL);
  }
  const seen = new Set();
  const gradeCounts = {};
  for (const trophy of trophies) {
    if (typeof trophy.name !== 'string' || trophy.name.trim() === '') fail('a trophy has no name');
    if (seen.has(trophy.name)) fail('duplicate trophy name: ' + trophy.name);
    seen.add(trophy.name);
    if (typeof trophy.description !== 'string' || trophy.description.trim() === '') {
      fail('trophy "' + trophy.name + '" has no description');
    }
    if (typeof trophy.guide !== 'string' || trophy.guide.trim().length < 100) {
      fail('trophy "' + trophy.name + '" has no real guide (under 100 characters)');
    }
    if (!Object.prototype.hasOwnProperty.call(EXPECTED_GRADES, trophy.grade)) {
      fail('trophy "' + trophy.name + '" has an unknown grade: ' + trophy.grade);
    }
    gradeCounts[trophy.grade] = (gradeCounts[trophy.grade] || 0) + 1;
  }
  for (const [grade, count] of Object.entries(EXPECTED_GRADES)) {
    if (gradeCounts[grade] !== count) {
      fail('grade ' + grade + ': ' + (gradeCounts[grade] || 0) + ' trophies, expected ' + count);
    }
  }
  const hidden = trophies.filter((t) => t.hidden).length;
  const missable = trophies.filter((t) => t.missable).map((t) => t.name);
  console.log('sunset-platinum: trophy list OK — 55 trophies (1 platinum, 2 gold, 6 silver, 46 bronze), ' + hidden + ' hidden, missable: ' + (missable.join(', ') || 'none'));
  return trophies;
}

function countAppFiles() {
  let files = 0;
  let bytes = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) {
        files += 1;
        bytes += statSync(path).size;
      }
    }
  };
  walk(join(here, 'app'));
  return { files, bytes };
}

function checkScreenshots() {
  const dir = join(here, 'screenshots');
  if (!existsSync(dir)) fail('screenshots/ is missing');
  const names = readdirSync(dir).filter((n) => !n.startsWith('.')).sort();
  if (names.length < 3 || names.length > 4) {
    fail('screenshots/ holds ' + names.length + ' images, expected 3 or 4');
  }
  for (const name of names) {
    if (!/\.(png|jpe?g)$/i.test(name)) fail('screenshot ' + name + ' is not a PNG or JPEG');
    const size = statSync(join(dir, name)).size;
    if (size > 262144) fail('screenshot ' + name + ' is ' + size + ' bytes, over the 256 KiB cap');
  }
  return names;
}

const trophies = checkTrophyList();
const shotNames = checkScreenshots();

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

const appStats = countAppFiles();
console.log('sunset-platinum: app/ has ' + appStats.files + ' files, ' + appStats.bytes + ' bytes; screenshots: ' + shotNames.join(', '));

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files and directories in app/
// or 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
console.log('sunset-platinum: wrote ' + join(out, 'dossier.json') + ' for ' + trophies.length + ' trophies');
