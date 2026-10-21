/**
 * Node runner to inspect Cloud animations and files in ffbe_asset_dump-main.
 */
import fs from 'fs';
import path from 'path';

const DUMP_DIR = 'ffbe_asset_dump-main';

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, callback);
    } else {
      callback(fullPath, entry.name);
    }
  }
}

function main() {
  if (!fs.existsSync(DUMP_DIR)) {
    console.error(`Error: Directory '${DUMP_DIR}' does not exist.`);
    return;
  }

  console.log('='.repeat(70));
  console.log('FFBE ASSET DUMP INSPECTION: CLOUD (207000105 / 207000107)');
  console.log('='.repeat(70));

  const unitIds = ['207000105', '207000107'];
  const foundFiles = {
    '207000105': [],
    '207000107': [],
  };

  const climMatches = [];

  walkDir(DUMP_DIR, (fullPath, name) => {
    const rel = path.relative(DUMP_DIR, fullPath);
    for (const uid of unitIds) {
      if (name.includes(uid)) {
        foundFiles[uid].push(rel);
      }
    }
    if (name.toLowerCase().includes('climhazzard') || name.toLowerCase().includes('braver')) {
      climMatches.push(rel);
    }
  });

  for (const uid of unitIds) {
    const files = foundFiles[uid];
    console.log(`\n[+] Total files found for UID '${uid}': ${files.length}`);
    const cgsFiles = files.filter((f) => f.includes('_cgs_'));
    const cggFiles = files.filter((f) => f.includes('_cgg_'));
    const pngFiles = files.filter((f) => f.endsWith('.png'));
    const otherFiles = files.filter(
      (f) => !cgsFiles.includes(f) && !cggFiles.includes(f) && !pngFiles.includes(f)
    );

    console.log(`    - PNG Atlases/Images: ${pngFiles.length}`);
    for (const p of pngFiles) {
      console.log(`        * ${p}`);
    }

    console.log(`    - CGG Coordinate Files: ${cggFiles.length}`);
    for (const c of cggFiles) {
      console.log(`        * ${c}`);
    }

    console.log(`    - CGS Animation Files: ${cgsFiles.length}`);
    for (const c of cgsFiles.sort()) {
      const base = path.basename(c);
      const animName = base.replace(`_${uid}.csv`, '').replace('unit_', '');
      console.log(`        * [${animName.padEnd(18)}] -> ${c}`);
    }

    if (otherFiles.length > 0) {
      console.log(`    - Other files: ${otherFiles.length}`);
      for (const o of otherFiles.slice(0, 10)) {
        console.log(`        * ${o}`);
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log("SEARCHING FOR 'climhazzard' or 'braver' in dump filenames...");
  console.log('='.repeat(70));
  console.log(`Matching files found: ${climMatches.length}`);
  for (const m of climMatches) {
    console.log(`    * ${m}`);
  }

  // Also search for any unit starting with 2070001 (all Cloud forms)
  console.log('\n' + '='.repeat(70));
  console.log("CHECKING ALL CLOUD FORMS (prefix '2070001*')...");
  console.log('='.repeat(70));
  const cloudVariants = new Set();
  walkDir(path.join(DUMP_DIR, 'unit_animated'), (fullPath, name) => {
    if (name.includes('2070001')) {
      cloudVariants.add(name);
    }
  });
  console.log(`Cloud variants in unit_animated: ${cloudVariants.size}`);
  for (const v of cloudVariants) {
    console.log(`    * ${v}`);
  }

  // Check CGS for all cloud variants
  const csvDir = path.join(DUMP_DIR, 'unit_animated_csv');
  const allCsvs = fs.readdirSync(csvDir);
  for (const id of ['207000105', '207000106', '207000107', '207000117', '207000127']) {
    const cgs = allCsvs.filter(f => f.includes(id) && f.includes('_cgs_'));
    console.log(`\nUID ${id} CGS count: ${cgs.length}`);
    for (const c of cgs) {
      console.log(`  - ${c}`);
    }
  }
}

main();
