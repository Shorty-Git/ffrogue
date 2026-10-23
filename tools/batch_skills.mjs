import http from 'node:http';
import { spawn } from 'node:child_process';
import { planSkillBatch, isEffectBakeCurrent } from './lib/skill-batch.mjs';
import { writeJson } from './lib/character-pipeline.mjs';

const args = process.argv.slice(2);
const value = flag => args[args.indexOf(flag) + 1];
const allowed = new Set(['--all', '--skills', '--bake', '--force', '--port', '--help']);
for (let i = 0; i < args.length; i++) {
  if (!allowed.has(args[i])) throw Error(`Unknown argument: ${args[i]}`);
  if (['--skills', '--port'].includes(args[i]) && (!args[++i] || args[i].startsWith('--'))) throw Error('Missing argument value');
}
if (args.includes('--help')) {
  console.log('Usage: node tools/batch_skills.mjs [--all | --skills cloud/brave_slash,cloud/blade_beam] [--bake] [--force] [--port 3110]');
  console.log('Default: inspect remaining legacy skills. --bake exports only ready effects through one browser queue; it does not publish characters. --force rebakes cached effects.');
  process.exit(0);
}
if (args.includes('--all') && args.includes('--skills')) throw Error('Choose --all or --skills');
if (args.includes('--force') && !args.includes('--bake')) throw Error('--force requires --bake');
const port = Number(args.includes('--port') ? value('--port') : 3110);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid loopback port');
const plan = planSkillBatch({ all: args.includes('--all'), selection: args.includes('--skills') ? value('--skills').split(',') : undefined });
const reportFile = 'tools/data/skill-batch/report.json';
const save = () => writeJson(reportFile, plan);
save();
for (const skill of plan.skills) console.log(`${skill.status.toUpperCase()} ${skill.id}${skill.blockers.length ? ': ' + skill.blockers.join(', ') : ''}`);
console.log(`${plan.skills.filter(s => s.status === 'ready').length} ready; ${plan.skills.filter(s => s.status === 'blocked').length} blocked; ${plan.missingFiles.length} missing effect files; ${plan.effects.length} unique reviewed effects.`);
console.log(`Report: ${reportFile}`);
if (!args.includes('--bake')) process.exit(0);
if (args.includes('--force')) for (const effect of plan.effects) effect.status = 'pending';
if (!plan.effects.some(e => e.status === 'pending')) {
  console.log(plan.effects.length ? 'All reviewed sheets have current input/output hashes.' : 'No reviewed effects can be exported.');
  process.exit(plan.effects.length ? 0 : 2);
}

let child, timer, currentUrl = null, failed = false;
const fail = message => {
  failed = true;
  clearTimeout(timer);
  const active = plan.effects.find(e => e.status === 'rendering');
  if (active) { active.status = 'failed'; active.error = message; }
  for (const effect of plan.effects) if (effect.status === 'pending') effect.status = 'stopped';
  currentUrl = null;
  child?.kill();
  save();
  console.error(message);
};
function next() {
  const effect = plan.effects.find(e => e.status === 'pending');
  if (!effect) { currentUrl = null; save(); console.log('Batch complete. No character publication was performed.'); return; }
  effect.status = 'rendering'; save();
  let completed = false, output = '';
  child = spawn(process.execPath, ['tools/export_effect.mjs', '--recipe', effect.recipeFile, '--port', '0'], { cwd: process.cwd(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  timer = setTimeout(() => fail(`Export timed out: ${effect.key}`), 120000);
  child.on('error', error => fail(error.message));
  child.stderr.on('data', chunk => { output += chunk; });
  child.stdout.on('data', chunk => {
    output += chunk;
    const url = output.match(/Open (http:\/\/127\.0\.0\.1:\d+\/)/);
    if (url) currentUrl = url[1];
    if (!completed && output.includes(`Exported public/assets/effects/${effect.key}`)) {
      completed = true; clearTimeout(timer); currentUrl = null;
      if (!isEffectBakeCurrent(effect.recipeFile)) { fail(`Export validation failed: ${effect.key}`); return; }
      effect.status = 'exported'; save(); console.log(`EXPORTED ${effect.key}`);
      child.kill();
    }
  });
  child.on('close', () => {
    clearTimeout(timer);
    if (failed) return;
    if (!completed) { fail(`Exporter stopped before completion: ${effect.key}\n${output.slice(-2000)}`); return; }
    next();
  });
}
const html = `<!doctype html><meta charset="utf-8"><title>Reviewed skill batch</title>
<style>body{background:#171d28;color:#eee;font:16px system-ui;margin:24px}pre{white-space:pre-wrap}iframe{width:100%;height:430px;background:white;border:0}</style>
<h1>Reviewed skill batch</h1><p>One renderer at a time. Blocked skills are skipped. Character publication is a separate reviewed step.</p><pre id="status">Connecting...</pre><div id="render"></div>
<script>let shown=null;async function refresh(){try{const s=await(await fetch('/status')).json();document.querySelector('#status').textContent=s.plan.skills.map(x=>x.status.toUpperCase()+' '+x.id+(x.blockers.length?' — '+x.blockers.join(', '):'')).join('\\n')+'\\n\\n'+s.plan.effects.map(x=>x.status.toUpperCase()+' '+x.key+(x.error?' — '+x.error:'')).join('\\n');if(shown!==s.url){shown=s.url;const host=document.querySelector('#render');host.replaceChildren();if(shown){const frame=document.createElement('iframe');frame.src=shown;host.append(frame);}}}catch(e){document.querySelector('#status').textContent=e.message;}setTimeout(refresh,500);}refresh();</script>`;
const server = http.createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.writeHead(405).end(); return; }
  if (req.url === '/status') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ plan, url: currentUrl })); return; }
  if (req.url !== '/') { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html);
});
server.on('error', error => { fail(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => { console.log(`Open http://127.0.0.1:${port}/ to run the reviewed export queue.`); next(); });
const stop = () => { clearTimeout(timer); child?.kill(); server.close(); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
