// Captures a Limit Burst in real time via the CDP screencast (no ffmpeg needed); writes JPEG frames,
// timestamps and the canvas rectangle. Turn them into a GIF with tools/screencast_to_gif.py.
//   node tools/capture_battle_screencast.mjs tools/data/<run>/frames [--reserve cloud_ac] [--hero 2] [--skill meteor_rain]
import fs from 'node:fs';
import {createRequire} from 'node:module';
const [dir] = process.argv.slice(2);
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const reserve = arg('--reserve'), hero = Number(arg('--hero') ?? 0), skill = arg('--skill');
const {chromium} = createRequire(import.meta.url)('C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const page = await browser.newPage({viewport: {width: 820, height: 940}});
  await page.goto('http://127.0.0.1:3001/tools/test-source-limit-burst.html' + (reserve ? '?reserve=' + reserve : ''));
  await page.waitForFunction(() => /Limit Bursts in this party/.test(document.getElementById('status').textContent), {}, {timeout: 120000});
  await page.evaluate(() => { document.querySelector('aside').remove(); const c = document.getElementById('game-container'); c.style.width = '100vw'; c.style.height = '100vh'; window.dispatchEvent(new Event('resize')); });
  // Every prepared scene variant must exist before a command can fire (parties with many skills take seconds).
  await page.evaluate(() => window.__ffrogueGame.scene.getScene('BattleScene').preparedScenes?.ready);
  await page.waitForTimeout(1500);
  const cdp = await page.context().newCDPSession(page), frames = [];
  cdp.on('Page.screencastFrame', async ({data, metadata, sessionId}) => {
    frames.push({t: metadata.timestamp, data}); await cdp.send('Page.screencastFrameAck', {sessionId}).catch(() => {});
  });
  await cdp.send('Page.startScreencast', {format: 'jpeg', quality: 70, everyNthFrame: 1});
  // --skill moves that skill to the first ability slot (key 2); otherwise key 5 fires the Limit Burst.
  await page.evaluate(([i, id]) => { const s = window.__ffrogueGame.scene.getScene('BattleScene'), h = s.turnOrder[i]; s.selectHero(h);
    if (id) { const list = s.unitSkills[h.unitKey], at = list.findIndex(x => x.id === id); if (at < 0) throw Error('Skill not in party: ' + id); list.unshift(...list.splice(at, 1)); } }, [hero, skill]);
  await page.waitForTimeout(500);
  await page.keyboard.press(skill ? 'Digit2' : 'Digit5');
  // A Limit Burst may end the battle (VICTORY) instead of returning to the next turn.
  await page.waitForFunction(() => ['PLAYER_TURN', 'VICTORY'].includes(window.__ffrogueGame.scene.getScene('BattleScene').combatState) && !window.__ffrogueGame.scene.getScene('BattleScene').preparedScenes.snapshot().active, {}, {timeout: 60000});
  await page.waitForTimeout(1000);
  await cdp.send('Page.stopScreencast');
  fs.mkdirSync(dir, {recursive: true});
  const t0 = frames[0].t;
  frames.forEach((f, i) => fs.writeFileSync(`${dir}/f${String(i).padStart(4, '0')}.jpg`, Buffer.from(f.data, 'base64')));
  fs.writeFileSync(`${dir}/times.json`, JSON.stringify(frames.map(f => f.t - t0)));
  fs.writeFileSync(`${dir}/rect.json`, JSON.stringify(await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); })));
  console.log('frames', frames.length, 'seconds', (frames.at(-1).t - t0).toFixed(1));
} finally { await browser.close(); }
