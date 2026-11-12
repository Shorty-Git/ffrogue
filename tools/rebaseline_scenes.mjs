// Re-baseline tool for published scenes. The player hash is pinned in every manifest
// (provenance.playerSha256), so a player change means: republish every scene, look at before/after
// frames, and move the frame baseline only where the new rendering is at least as good.
//
//   node tools/rebaseline_scenes.mjs capture --to baseline      frames of the current player/manifests (do this BEFORE a change)
//   node tools/rebaseline_scenes.mjs republish                  every recipe in tools/presentations through publish_scene_presentations
//   node tools/rebaseline_scenes.mjs capture --to candidate     frames after the change
//   node tools/rebaseline_scenes.mjs compare                    verdict per scene + before/after page (tools/data/scene-baseline/compare.html)
//   node tools/rebaseline_scenes.mjs accept [--force a,b]       candidate -> baseline for unchanged/ok scenes (and reviewed --force keys)
//   node tools/rebaseline_scenes.mjs run                        republish + capture candidate + compare + accept
// Options: --keys a,b | --match text (subset), --dir tools/data/scene-baseline, --frames 12, --python <exe>.
//
// Verdicts: unchanged (frames equal within noise), ok (changed, no more boxes, effect still there),
// review (playback errors, more rectangle corners, or the effect lost/gained a lot of picture).
// `review` scenes keep their old baseline frames until fixed or accepted with --force after a look.
// Frames live in tools/data (ignored, local only); the dev server on 3001 must be running.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {captureScenes, sceneKeys, verdict, writeFile, PRESENTATIONS} from './lib/scene-frames.mjs';

const [command] = process.argv.slice(2);
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const dir = arg('--dir') ?? 'tools/data/scene-baseline', count = Number(arg('--frames') ?? 12);
const python = arg('--python') ?? process.env.FFROGUE_PYTHON ?? 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const playerSha = () => sha('src/effects/originalEffectPlayer.mjs');
function selected() {
  let keys = sceneKeys();
  if (arg('--keys')) keys = arg('--keys').split(',');
  if (arg('--match')) keys = keys.filter(key => key.includes(arg('--match')));
  return keys;
}

async function capture(name, keys) {
  const started = Date.now();
  await captureScenes(keys, (result, index) => {
    if (result.sheet) writeFile(`${dir}/${name}/${result.key}.jpg`, result.sheet);
    if (result.markedSheet) writeFile(`${dir}/${name}/${result.key}.marked.jpg`, result.markedSheet);
    const {sheet, markedSheet, ...data} = result;
    writeFile(`${dir}/${name}/${result.key}.json`, JSON.stringify({...data, playerSha256: playerSha(),
      manifestSha256: sha(`${PRESENTATIONS}/${result.key}/manifest.json`), captured: new Date().toISOString()}));
    if ((index + 1) % 20 === 0 || index + 1 === keys.length) console.log(`${name} ${index + 1}/${keys.length} ${((Date.now() - started) / 1000).toFixed(0)} s`);
  }, {count, log: message => console.log(message)});
}

function republish(keys) {
  const wanted = new Set(keys), changed = [], repinned = [];
  const recipes = fs.readdirSync('tools/presentations').filter(file => file.endsWith('.json')).sort();
  let done = 0;
  for (const file of recipes) {
    const recipe = read('tools/presentations/' + file), own = (recipe.bindings ?? []).map(binding => binding.key).filter(key => wanted.has(key));
    if (!own.length) continue;
    const before = own.map(key => fs.existsSync(`${PRESENTATIONS}/${key}/manifest.json`) ? sha(`${PRESENTATIONS}/${key}/manifest.json`) : null);
    // Windows: a watcher (Vite, antivirus) can hold content.json for a moment; such open errors are retried.
    let error = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      const result = spawnSync('node', ['tools/publish_scene_presentations.mjs', '--recipe', 'tools/presentations/' + file, '--python', python], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
      error = result.status === 0 ? null : ((result.stderr || result.stdout).trim().split('\n').find(line => /Error/.test(line)) ?? 'failed').trim();
      if (!error || !/UNKNOWN: unknown error, open|EBUSY|EPERM/.test(error)) break;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    }
    if (error) {
      // A recipe that no longer publishes (hand-reviewed legacy audio, a staged plan overwritten by a
      // later import) keeps its manifest, which carries its whole plan: only the player identity is
      // pinned again. It misses publish-time rule updates and is listed under `repinned` with the reason.
      for (const key of own) {
        const target = PRESENTATIONS + '/' + key + '/manifest.json', m = read(target);
        if (m.provenance.playerSha256 !== playerSha()) { m.provenance.playerSha256 = playerSha(); fs.writeFileSync(target, JSON.stringify(m, null, 2) + '\n'); changed.push(key); }
      }
      repinned.push({recipe: file, keys: own, publishError: error});
    } else own.forEach((key, i) => { if (sha(`${PRESENTATIONS}/${key}/manifest.json`) !== before[i]) changed.push(key); });
    if (++done % 25 === 0) console.log(`republish ${done} recipes, ${repinned.length} only re-pinned`);
  }
  const published = new Set(recipes.flatMap(file => (read('tools/presentations/' + file).bindings ?? []).map(binding => binding.key)));
  const withoutRecipe = keys.filter(key => !published.has(key));
  const stale = keys.filter(key => read(`${PRESENTATIONS}/${key}/manifest.json`).provenance.playerSha256 !== playerSha());
  writeFile(`${dir}/republish.json`, JSON.stringify({playerSha256: playerSha(), changed, repinned, withoutRecipe, stale}, null, 1) + '\n');
  console.log(JSON.stringify({recipes: done, changedManifests: changed.length, repinned: repinned.map(r => [r.keys.join(','), r.publishError]), withoutRecipe, stalePlayerHash: stale}));
  return stale.length === 0;
}

function compare(keys) {
  const rows = [];
  for (const key of keys) {
    const candidateFile = `${dir}/candidate/${key}.json`, baselineFile = `${dir}/baseline/${key}.json`;
    if (!fs.existsSync(candidateFile)) { rows.push({key, verdict: 'missing', reasons: ['no candidate frames']}); continue; }
    rows.push({key, ...verdict(fs.existsSync(baselineFile) ? read(baselineFile) : null, read(candidateFile))});
  }
  const order = {review: 0, missing: 1, new: 2, ok: 3, unchanged: 4};
  rows.sort((x, y) => order[x.verdict] - order[y.verdict] || (y.difference?.mean ?? 0) - (x.difference?.mean ?? 0));
  const tally = Object.fromEntries(Object.keys(order).map(name => [name, rows.filter(row => row.verdict === name).length]));
  writeFile(`${dir}/compare.json`, JSON.stringify({playerSha256: playerSha(), tally, rows}, null, 1) + '\n');
  const shown = rows.filter(row => row.verdict !== 'unchanged');
  writeFile(`${dir}/compare.html`, `<!doctype html><meta charset="utf-8"><title>Scene re-baseline</title>
<style>body{background:#101724;color:#e7eef9;font:14px system-ui;margin:16px}img{max-width:100%;display:block}h2{font-size:15px;margin:26px 0 4px}.review{color:#ff9080}.ok{color:#9be29b}small{color:#9fb3c8}figure{margin:0 0 6px}figcaption{color:#9fb3c8;font-size:12px}</style>
<h1>Scene re-baseline: ${Object.entries(tally).map(([name, n]) => `${n} ${name}`).join(' · ')}</h1>
<p>Top image: baseline (before). Bottom image: candidate (after). Unchanged scenes are not listed.</p>
${shown.map(row => `<h2 class="${row.verdict}">${row.key} · ${row.verdict}${row.reasons.length ? ' · ' + row.reasons.join(' · ').replace(/</g, '&lt;') : ''}
 <small>${row.difference ? `difference ${row.difference.mean} / max ${row.difference.max} · box ${row.box.before} → ${row.box.after} · energy ${row.energy.before} → ${row.energy.after}` : ''}</small></h2>
<figure><figcaption>before</figcaption><img loading="lazy" src="baseline/${row.key}.jpg"></figure><figure><figcaption>after</figcaption><img loading="lazy" src="candidate/${row.key}.jpg"></figure>`).join('\n')}
`);
  console.log(JSON.stringify({tally, review: rows.filter(row => row.verdict === 'review').map(row => [row.key, row.reasons.join('; ')])}, null, 1));
  return rows;
}

function accept(keys) {
  const compared = fs.existsSync(`${dir}/compare.json`) ? read(`${dir}/compare.json`).rows : [];
  const force = new Set((arg('--force') ?? '').split(',').filter(Boolean)), wanted = new Set(keys);
  let moved = 0; const kept = [];
  for (const row of compared) {
    if (!wanted.has(row.key) && !force.has(row.key)) continue;
    if (!(['unchanged', 'ok', 'new'].includes(row.verdict) || force.has(row.key))) { kept.push(row.key); continue; }
    for (const ext of ['json', 'jpg', 'marked.jpg']) if (fs.existsSync(`${dir}/candidate/${row.key}.${ext}`)) { fs.mkdirSync(`${dir}/baseline`, {recursive: true}); fs.copyFileSync(`${dir}/candidate/${row.key}.${ext}`, `${dir}/baseline/${row.key}.${ext}`); }
    moved++;
  }
  console.log(JSON.stringify({baselineUpdated: moved, keptOldBaselineForReview: kept}));
}

const keys = selected();
if (command === 'capture') { const to = arg('--to'); if (!['baseline', 'candidate'].includes(to)) throw Error('Use --to baseline|candidate'); await capture(to, keys); }
else if (command === 'republish') process.exitCode = republish(keys) ? 0 : 1;
else if (command === 'compare') compare(keys);
else if (command === 'accept') accept(keys);
else if (command === 'run') { if (!republish(keys)) console.log('Republish incomplete: see republish.json; continuing with the scenes that published.'); await capture('candidate', keys); compare(keys); accept(keys); }
else throw Error('Use capture|republish|compare|accept|run');
