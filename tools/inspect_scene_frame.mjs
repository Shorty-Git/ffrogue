// Lists what a published scene draws at one frame in the production training fight: per visible instance
// the effect, node, texture, blend, opacity and its screen bounding box (largest first).
//   node tools/inspect_scene_frame.mjs --key terra_fire --frame 120 [--min 200]
import {createRequire} from 'node:module';
import {PLAYWRIGHT} from './lib/scene-frames.mjs';
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const key = arg('--key'), frame = Number(arg('--frame')), min = Number(arg('--min') ?? 150);
const {chromium} = createRequire(import.meta.url)(PLAYWRIGHT);
const browser = await chromium.launch({channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']});
try {
  const page = await browser.newPage({viewport: {width: 1000, height: 1100}});
  await page.goto('http://127.0.0.1:3001/tools/test-source-frames.html');
  await page.waitForFunction(() => window.sceneFrames, {}, {timeout: 120000});
  await page.evaluate(() => window.sceneFrames.ready);
  const rows = await page.evaluate(([key, frame]) => window.sceneFrames.inspect(key, frame), [key, frame]);
  for (const row of rows.filter(r => Math.max(r.width, r.height) >= min).sort((a, b) => b.width * b.height - a.width * a.height).slice(0, 40))
    console.log(`${row.layer} ${row.effect} node ${row.node} ${row.type} ${Math.round(row.width)}x${Math.round(row.height)} at ${Math.round(row.x)},${Math.round(row.y)} opacity ${row.opacity.toFixed(2)} ${row.texture} ${row.blend}${row.coverage ? ' COVERAGE' : ''}`);
  console.log(rows.length, 'visible instances');
} finally { await browser.close(); }
