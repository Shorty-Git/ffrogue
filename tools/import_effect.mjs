/**
 * FFBE EFFECT IMPORT PIPELINE (Node.js runner)
 * Imports visual effect sprite sheets from DaddyRaegen/ffbe_asset_dump into public/assets/effects/<name>/
 * using ffbetool.exe.
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const BASE_RAW_URL = 'https://raw.githubusercontent.com/DaddyRaegen/ffbe_asset_dump/main';

const EFFECT_PRESETS = {
  slash_heavy: {
    name: 'Heavy Slash',
    atlas: 'unit_animated/unit_anime_100039317.png',
    cgg: 'unit_animated_csv/unit_cgg_100039317.csv',
    cgs: 'unit_animated_csv/unit_limit_atkeff_cgs_100039317.csv',
    animName: 'limit_atkeff',
  },
  curaga_light: {
    name: 'Curaga Light',
    atlas: 'unit_animated/unit_anime_210002507.png',
    cgg: 'unit_animated_csv/unit_cgg_210002507.csv',
    cgs: 'unit_animated_csv/unit_limit_atkeff_cgs_210002507.csv',
    animName: 'limit_atkeff',
  },
  grenade_blast: {
    name: 'Grenade Blast',
    atlas: 'unit_animated/unit_anime_254000403.png',
    cgg: 'unit_animated_csv/unit_cgg_254000403ef.csv',
    cgs: 'unit_animated_csv/unit_limit_atk_cgs_254000403ef.csv',
    animName: 'limit_atk',
  },
};

async function downloadFile(url, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'FFRoguePipeline/1.0' },
  });
  if (!resp.ok) {
    throw new Error(`Failed to download ${url}: ${resp.status} ${resp.statusText}`);
  }
  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  return buffer.length;
}

export async function importEffect(effectKey, config, tempUid = 999001) {
  const displayName = config.name || effectKey;
  console.log('='.repeat(65));
  console.log(`IMPORTING EFFECT: ${effectKey} (${displayName})`);
  console.log('='.repeat(65));

  const stagingDir = path.join('tools', 'test_input', 'effects');
  const outputTempDir = path.join('tools', 'test_output', 'effects');
  fs.mkdirSync(stagingDir, { recursive: true });
  fs.mkdirSync(outputTempDir, { recursive: true });

  const animName = config.animName || 'limit_atkeff';
  const stagedPng = path.join(stagingDir, `unit_anime_${tempUid}.png`);
  const stagedCgg = path.join(stagingDir, `unit_cgg_${tempUid}.csv`);
  const stagedCgs = path.join(stagingDir, `unit_${animName}_cgs_${tempUid}.csv`);

  for (const p of [stagedPng, stagedCgg, stagedCgs]) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  console.log(`Downloading raw asset files for '${effectKey}'...`);
  await downloadFile(`${BASE_RAW_URL}/${config.atlas}`, stagedPng);
  await downloadFile(`${BASE_RAW_URL}/${config.cgg}`, stagedCgg);
  await downloadFile(`${BASE_RAW_URL}/${config.cgs}`, stagedCgs);
  console.log(`  [+] Staged as temporary unit ID ${tempUid}`);

  const ffbetoolBin = path.join('tools', 'bin', 'ffbetool.exe');
  if (!fs.existsSync(ffbetoolBin)) {
    console.error(`Error: ffbetool not found at '${ffbetoolBin}'`);
    process.exit(1);
  }

  const args = [
    String(tempUid),
    '--anim', animName,
    '-i', stagingDir,
    '-o', outputTempDir,
    '--json',
    '-v'
  ];
  console.log(`Running ffbetool: ${ffbetoolBin} ${args.join(' ')}`);
  const res = spawnSync(ffbetoolBin, args, { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`Error: ffbetool assembly failed with exit code ${res.status}`);
    process.exit(res.status);
  }

  const genJsonPath = path.join(outputTempDir, `${tempUid}-${animName}.json`);
  const genPngPath = path.join(outputTempDir, `${tempUid}-${animName}.png`);

  if (!fs.existsSync(genJsonPath) || !fs.existsSync(genPngPath)) {
    console.error(`Error: ffbetool did not generate expected files for ${tempUid}`);
    process.exit(1);
  }

  const rawJson = fs.readFileSync(genJsonPath, 'utf-8');
  const meta = JSON.parse(rawJson);

  const destDir = path.join('public', 'assets', 'effects', effectKey);
  fs.mkdirSync(destDir, { recursive: true });

  const destPngName = `${effectKey}.png`;
  const destPngPath = path.join(destDir, destPngName);
  fs.copyFileSync(genPngPath, destPngPath);

  const frameRect = meta.frameRect;
  const delays = meta.frameDelays;
  const fw = frameRect.width;
  const fh = frameRect.height;

  const pivotX = Math.round(((1000.0 - frameRect.x) / fw) * 1000000) / 1000000;
  const pivotY = Math.round(((1000.0 - frameRect.y) / fh) * 1000000) / 1000000;

  let totalDurationMs = 0;
  const framesMeta = [];
  for (let idx = 0; idx < delays.length; idx++) {
    const delay = delays[idx];
    const dMs = Math.round((delay * (1000.0 / 60.0)) * 100) / 100;
    totalDurationMs += dMs;
    framesMeta.push({
      index: idx,
      delayTicks: delay,
      durationMs: dMs,
    });
  }

  const manifest = {
    effectId: effectKey,
    name: displayName,
    type: 'effect',
    file: destPngName,
    frameWidth: fw,
    frameHeight: fh,
    frameCount: delays.length,
    totalDurationMs: Math.round(totalDurationMs * 100) / 100,
    pivotX,
    pivotY,
    frames: framesMeta,
  };

  const manifestPath = path.join(destDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`Exported to '${destDir}':`);
  console.log(`  Spritesheet : ${destPngName} (${fw}x${fh}, ${delays.length} frames)`);
  console.log(`  Duration    : ${manifest.totalDurationMs}ms`);
  console.log(`  Pivot       : (${pivotX.toFixed(4)}, ${pivotY.toFixed(4)})`);

  // Cleanup temporary staged files
  for (const p of [stagedPng, stagedCgg, stagedCgs, genJsonPath, genPngPath]) {
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
    }
  }

  console.log(`Successfully imported effect '${effectKey}'!\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const presetIdx = args.indexOf('--preset');
  const pVal = presetIdx !== -1 ? args[presetIdx + 1] : (args.includes('all') ? 'all' : null);

  if (pVal === 'all') {
    for (const [k, p] of Object.entries(EFFECT_PRESETS)) {
      await importEffect(k, p);
    }
  } else if (pVal && EFFECT_PRESETS[pVal]) {
    await importEffect(pVal, EFFECT_PRESETS[pVal]);
  } else {
    console.log('Usage: node tools/import_effect.mjs --preset <slash_heavy | curaga_light | grenade_blast | all>');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
