import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import ts from 'typescript';
import { assertKey, inspectCharacter, inspectEffect, readJson, sha256, writeJson, parseTimeline } from './lib/character-pipeline.mjs';

// Research only: never publishes raw effects or inferred choreography to the game.
const args = process.argv.slice(2), value = name => args[args.indexOf(name) + 1];
if (!args.includes('--recipe') || !args.includes('--skill')) throw Error('Usage: node tools/preview_skill.mjs --recipe tools/characters/barret.json --skill satellite_beam [--source-id 214790 --kind ABILITY --scope single_enemy --motion atk] [--port 3106]');
const recipe = readJson(value('--recipe')), skillKey = value('--skill');
assertKey(skillKey);
let selected = recipe.skills.find(s => s.id === skillKey);
const report = inspectCharacter(recipe);
if (args.includes('--source-id')) {
  if (selected) throw Error('Use the selected recipe command without a source override');
  const id = Number(value('--source-id')), kind = args.includes('--kind') ? value('--kind') : 'ABILITY';
  const scope = value('--scope');
  if (!Number.isSafeInteger(id) || id <= 0 || !['ABILITY', 'MAGIC'].includes(kind)
    || !args.includes('--scope') || !['single_enemy', 'all_enemies'].includes(scope)
    || !args.includes('--motion')) throw Error('Unselected research requires an exact source ID, kind, explicit scope and prepared motion');
  const entry = report.catalog.find(s => s.id === id && s.kind === kind);
  if (!entry?.raw || entry.passive) throw Error('Research source is not an active command in this learning series');
  selected = { id: skillKey, ffbeId: id, type: kind, name: entry.name, scope, motion: value('--motion') };
}
if (!selected) throw Error('Skill is not selected; use an explicit --source-id research selection');
if (!['single_enemy', 'all_enemies'].includes(selected.scope)) throw Error('Party previews require a reviewed ally formation; enemy targets cannot stand in for allies');
const source = report.catalog.find(s => s.id === selected.ffbeId && s.kind === selected.type);
if (!source?.raw || source.effects.some(b => b.conditional)) throw Error('Missing source or unsupported conditional composition');
const repair = args.includes('--repair-receipt') ? readJson(value('--repair-receipt')) : null;
let repairedMembers = 0;
if (repair) {
  const relative = path.relative(path.resolve('assets'), path.resolve(repair.output));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !repair.reason
    || sha256(repair.output) !== repair.outputSha256 || sha256(repair.source) !== repair.sourceSha256
    || sha256(repair.recipe) !== repair.recipeSha256) throw Error('Invalid or stale research repair receipt');
}
const effects = source.effects.flatMap(b => b.groups.flatMap(g => {
  if (!g.members.length || !['front', 'back'].includes(g.layer) || !['target', 'target-group', 'caster', 'screen'].includes(g.anchor)) throw Error('Unresolved source group');
  return g.members.map(m => {
    if (m.status !== 'available-unreviewed') throw Error(`Unavailable source effect: ${m.originalFile}`);
    const rotation = m.transform.length ? m.transform.map(Number) : [0, 0, 0];
    if (rotation.length !== 3 || rotation.some(v => !Number.isFinite(v))) throw Error('Unsupported source rotation tuple');
    let asset = m.asset, repairReason = null;
    if (repair && path.resolve(m.asset.file) === path.resolve(repair.source)) {
      if (m.asset.sha256 !== repair.sourceSha256) throw Error('Repair does not match this source member');
      asset = inspectEffect(repair.output, 'assets');
      if (!asset.exists || asset.resources.some(r => !r.exists)) throw Error('Repaired effect or dependency missing');
      repairReason = repair.reason; repairedMembers++;
    }
    return { ...m, asset, ...(repairReason ? { originalAsset: m.asset, repairReason } : {}), startFrame: g.startFrame + m.frame, anchor: g.anchor, layer: g.layer, groupId: g.groupId, rotationDegrees: rotation };
  });
}));
if (repair && !repairedMembers) throw Error('Repair receipt does not belong to this skill composition');
const motion = args.includes('--motion') ? value('--motion') : selected.motion;
assertKey(motion);
const manifest = readJson(`public/assets/units/${recipe.key}/manifest.json`);
if (!manifest.animations[motion]) throw Error('Prepared body motion missing');
const modules = new Map();
function loadTs(file) {
  if (modules.has(file)) return modules.get(file);
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, require: name => loadTs(`src/${name.replace('../', '')}.ts`) }, { filename: file });
  modules.set(file, exports); return exports;
}
const { BATTLE_ARENAS } = loadTs('src/data/battleArenas.ts'), { getBattleLayout } = loadTs('src/ui/battleLayout.ts');
const allowed = new Map(), allow = (url, file) => { if (!fs.existsSync(file)) throw Error(`Missing ${file}`); allowed.set(url, file); return url; };
const rawUrl = file => '/raw/' + path.relative('assets', file).replaceAll('\\', '/');
for (const member of effects) for (const asset of [member.asset, ...member.asset.resources]) allow(rawUrl(asset.file), asset.file);
for (const file of ['effekseer.js', 'effekseer.wasm', 'Sample/three.min.js']) allow('/sdk/' + file, 'tools/bin/effekseer-webgl-1.80.7/' + file);
const prepared = file => allow('/prepared/' + file, 'public/assets/' + file);
const hits = parseTimeline(source.raw.attackFrames, /[-&,]/).map(h => ({ frame: Number(h.fields[0]), weight: Number(h.fields[1]) }));
const lastHit = Math.max(0, ...hits.map(h => h.frame));
const endFrame = Math.max(420, lastHit + 180);
const config = {
  approved: false, character: recipe.key, skill: skillKey, name: selected.name, sourceId: source.id, scope: selected.scope,
  databaseSha256: report.source.sha256, recipeSha256: sha256(value('--recipe')),
  sourceMotionType: source.raw.motionType ?? null, motion, motionNote: 'Prepared body motion is an explicit preview choice; source motion mapping is not inferred. Movement choreography is not reconstructed.',
  hits, endFrame, seed: 1,
  effects: effects.map(m => ({ ...m, url: rawUrl(m.asset.file) })),
  actor: { scale: recipe.scale * .8, body: manifest.animations[motion], idle: manifest.animations.idle,
    bodyUrl: prepared(`units/${recipe.key}/${motion}.png`), idleUrl: prepared(`units/${recipe.key}/idle.png`) },
  rat: { scale: 2, body: readJson('public/assets/monsters/training_dummy/manifest.json').animations.idle,
    url: prepared('monsters/training_dummy/idle.png') },
  arenas: Object.fromEntries(Object.entries(BATTLE_ARENAS).map(([key, arena]) => [key,
    { ...arena, layout: getBattleLayout(1000, 1100, arena), url: prepared('backgrounds/' + arena.file) }])),
  interpretation: 'Candidate: original start ticks, per-target/group/caster/screen anchors, uniform source scale and XYZ degree tuple. Raw group offset fields stay unapplied. Black screen effects use alpha composition; foreground effects use additive composition. No game damage or runtime publication.',
};
const output = args.includes('--output') ? value('--output') : `tools/data/skill-previews/${recipe.key}/${skillKey}`;
const outputRelative = path.relative(path.resolve('tools/data'), path.resolve(output));
if (!outputRelative || outputRelative.startsWith('..') || path.isAbsolute(outputRelative)) throw Error('Research output must stay inside tools/data');
fs.mkdirSync(output, { recursive: true });
writeJson(`${output}/plan.json`, { ...config, toolSha256: sha256('tools/preview_skill.mjs'), pageSha256: sha256('tools/preview_skill.html') });
const outputNames = new Set(['results.json', 'reactor.png', 'forest.png',
  ...['reactor', 'forest'].flatMap(arena => ['upper', 'middle', 'lower'].map(row => `${arena}-${row}.png`)),
  ...effects.map(m => `effect-${m.effectId}.png`)]);
const port = args.includes('--port') ? Number(value('--port')) : 3106;
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid local port');
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (req.method === 'POST' && url.pathname.startsWith('/output/') && outputNames.has(url.pathname.slice(8))) {
    const chunks = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 32e6) { res.writeHead(413).end(); return; } chunks.push(chunk); }
    const data = Buffer.concat(chunks), name = url.pathname.slice(8);
    if (name.endsWith('.png') && (data.length < 24 || data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')) { res.writeHead(400).end(); return; }
    if (name.endsWith('.json')) { try { JSON.parse(data.toString()); } catch { res.writeHead(400).end(); return; } }
    fs.writeFileSync(path.join(output, name), data); console.log(`Saved ${output}/${name}`); res.end('OK'); return;
  }
  if (req.method !== 'GET') { res.writeHead(405).end(); return; }
  if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end(fs.readFileSync('tools/preview_skill.html')); return; }
  if (url.pathname === '/config.json') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(config)); return; }
  const file = allowed.get(decodeURIComponent(url.pathname));
  if (!file) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg' })[path.extname(file)] ?? 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`${selected.name} research preview: http://127.0.0.1:${port}/`));
