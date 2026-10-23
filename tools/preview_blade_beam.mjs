import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import ts from 'typescript';
import { inspectCharacter, readJson, sha256, writeJson } from './lib/character-pipeline.mjs';

const output = 'tools/data/blade-beam-preview';
const port = 3103;
const report = inspectCharacter(readJson('tools/characters/cloud.json'), { assets: 'assets', dump: 'ffbe_asset_dump-main' });
const skill = report.catalog.find(s => s.kind === 'ABILITY' && s.id === 214810);
const members = skill.effects.flatMap(b => b.groups.flatMap(g => g.members.map(m => ({ ...m, group: g }))));
if (members.length !== 2 || members.some(m => m.status !== 'available-unreviewed')) throw Error('Expected both complete Blade Beam source members');
const allowed = new Map();
const rawUrl = file => '/raw/' + path.relative('assets', file).replaceAll('\\', '/');
for (const member of members) for (const asset of [member.asset, ...member.asset.resources]) allowed.set(rawUrl(asset.file), asset.file);
const sdk = 'tools/bin/effekseer-webgl-1.80.7';
for (const file of ['effekseer.js', 'effekseer.wasm', 'Sample/three.min.js']) {
  if (!fs.existsSync(`${sdk}/${file}`)) throw Error(`Missing local SDK ${file}`);
  allowed.set('/sdk/' + file, `${sdk}/${file}`);
}
const modules = new Map();
function loadTs(file) {
  if (modules.has(file)) return modules.get(file);
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, require: name => loadTs(`src/${name.replace('../', '')}.ts`) }, { filename: file });
  modules.set(file, exports);
  return exports;
}
const { BATTLE_ARENAS } = loadTs('src/data/battleArenas.ts');
const { getBattleLayout } = loadTs('src/ui/battleLayout.ts');
for (const file of ['units/cloud/atk.png', 'units/cloud/idle.png', 'monsters/training_dummy/idle.png',
  ...Object.values(BATTLE_ARENAS).map(a => `backgrounds/${a.file}`)]) allowed.set('/prepared/' + file, 'public/assets/' + file);
const cloud = readJson('public/assets/units/cloud/manifest.json');
const rat = readJson('public/assets/monsters/training_dummy/manifest.json');
const config = {
  approved: false, sourceSkillId: skill.id, hits: [{ frame: 4, percent: 50 }, { frame: 8, percent: 50 }],
  endFrame: 180, seed: 1,
  effects: members.map(m => ({ id: m.effectId, file: m.asset.file, url: rawUrl(m.asset.file), sha256: m.asset.sha256,
    startFrame: m.group.startFrame + m.frame, sourceScale: m.scalePercent / 100, anchor: m.group.anchor,
    sourceGroup: m.group.groupId, memberRaw: m.raw, groupRaw: m.group.raw, rawFields: m.groupFields,
    resources: m.asset.resources })),
  cloud: { scale: readJson('public/assets/units/cloud/character.json').scale * 0.8,
    atk: cloud.animations.atk, idle: cloud.animations.idle },
  rat: { scale: 2, idle: rat.animations.idle },
  arenas: Object.fromEntries(Object.entries(BATTLE_ARENAS).map(([key, arena]) => [key,
    { ...arena, layout: getBattleLayout(1000, 1100, arena), url: '/prepared/backgrounds/' + arena.file }])),
  interpretation: {
    groupAnchor: 'Candidate: arithmetic mean of the three enemy anchors, feet minus 50 game pixels, matching the existing game effect anchor convention.',
    rawOffset: 'The green member has raw field -1100. It remains unverified and unapplied in the accepted unrotated presentation.',
    scale: 'scalePercent is applied as a candidate uniform effect scale (green 300%, blue 100%). No original-game placement approval.',
    sampling: 'An emitter scheduled at F is stepped once before that tick is drawn, matching the existing exporter sampling convention.',
  },
};
fs.mkdirSync(output, { recursive: true });
writeJson(`${output}/plan.json`, { ...config, databaseSha256: report.source.sha256,
  previewScriptSha256: sha256('tools/preview_blade_beam.mjs'), pageSha256: sha256('tools/preview_blade_beam.html') });
const mime = { '.js': 'text/javascript', '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg', '.html': 'text/html' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (req.method === 'POST' && /^\/output\/(?:green-unit|green-source-scale|blue-unit|composite-reactor|composite-forest|adapted-reactor|adapted-forest|orientations|results)\.(?:png|json)$/.test(url.pathname)) {
    const chunks = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 32 * 1024 * 1024) { res.writeHead(413).end(); return; } chunks.push(chunk); }
    const data = Buffer.concat(chunks);
    const name = path.basename(url.pathname);
    if (name.endsWith('.png') && (data.length < 24 || data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')) { res.writeHead(400).end('Invalid PNG'); return; }
    if (name.endsWith('.json')) { try { JSON.parse(data.toString()); } catch { res.writeHead(400).end('Invalid JSON'); return; } }
    fs.writeFileSync(path.join(output, name), data);
    console.log(`Saved ${output}/${name}`);
    res.end('OK'); return;
  }
  if (req.method !== 'GET') { res.writeHead(405).end(); return; }
  if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end(fs.readFileSync('tools/preview_blade_beam.html')); return; }
  if (url.pathname === '/config.json') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(config)); return; }
  const file = allowed.get(decodeURIComponent(url.pathname));
  if (!file) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`Blade Beam offline review: http://127.0.0.1:${port}/`));
