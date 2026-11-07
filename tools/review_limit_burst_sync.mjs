// Fires every published Limit Burst of the training party on /tools/test-source-limit-burst.html and
// checks, per damage event, that the caster's body frame matches the published clip timing (body and
// Source clock in step) and that the target area lights up within a few frames of the event.
// Needs Vite on 3001 and Playwright (headless Chrome). Exit code 1 on drift.
//   node tools/review_limit_burst_sync.mjs [--reserve key] [--origin http://127.0.0.1:3001]
import {createRequire} from 'node:module';
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const origin = arg('--origin') ?? 'http://127.0.0.1:3001', reserve = arg('--reserve');
const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ??
  'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
let failed = false;
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${origin}/tools/test-source-limit-burst.html${reserve ? '?reserve=' + reserve : ''}`);
  await page.waitForFunction(() => /Limit Bursts in this party|No hero/.test(document.getElementById('status').textContent), {}, {timeout: 120000});
  const casters = await page.evaluate(() => { const s = window.__ffrogueGame.scene.getScene('BattleScene'); return s.turnOrder.map((h, i) => s.limitBursts[h.unitKey] ? i : -1).filter(i => i >= 0); });
  for (const index of casters) {
    // Restart and wait for the new scene instance, not the previous one.
    await page.evaluate(() => { window.__previousScene = window.__ffrogueGame.scene.getScene('BattleScene').sys.settings.data.runContext; document.getElementById('restart').click(); });
    await page.waitForFunction(() => { const s = window.__ffrogueGame.scene.getScene('BattleScene'); return s?.sys.isActive() && s.sys.settings.data.runContext !== window.__previousScene && s.combatState === 'PLAYER_TURN'; }, {}, {timeout: 60000});
    await page.waitForTimeout(600);
    const name = await page.evaluate(i => {
      const game = window.__ffrogueGame, s = game.scene.getScene('BattleScene'), hero = s.turnOrder[i], rat = s.enemies[0];
      s.selectHero(hero);
      const clip = hero.manifest.animations[s.limitBursts[hero.unitKey].actionChoreography.body.phases.at(-1).clip];
      const starts = []; let t = 0; for (const f of clip.frames) { starts.push(t); t += f.durationMs * 60 / 1000; }
      const gl = game.renderer.gl, box = 90, px = new Uint8Array(box * box * 4), log = window.__sync = {expected: starts, frames: new Map(), damage: []};
      const apply = rat.applyDamage.bind(rat);
      rat.applyDamage = (...a) => { log.damage.push(s.preparedScenes.snapshot().frame); return apply(...a); };
      game.events.on('postrender', () => {
        const snap = s.preparedScenes.snapshot(); if (!snap.active) return;
        const b = rat.sprite.getBounds();
        gl.readPixels(Math.round(b.centerX - box / 2), Math.round(game.canvas.height - b.centerY - box / 2), box, box, gl.RGBA, gl.UNSIGNED_BYTE, px);
        let sum = 0; for (let k = 0; k < px.length; k += 4) sum += 0.2126 * px[k] + 0.7152 * px[k + 1] + 0.0722 * px[k + 2];
        log.frames.set(snap.frame, {lum: sum / (box * box), body: hero.anims.currentFrame?.index});
      });
      return hero.heroName + ' ' + s.limitBursts[hero.unitKey].name;
    }, index);
    await page.keyboard.press('Digit5');
    await page.waitForFunction(() => window.__ffrogueGame.scene.getScene('BattleScene').combatState === 'PLAYER_TURN', {}, {timeout: 60000});
    const result = await page.evaluate(() => {
      const {expected, frames, damage} = window.__sync;
      const index = f => { let i = 0; while (i + 1 < expected.length && expected[i + 1] <= f) i++; return i + 1; };
      const near = f => [...frames.entries()].filter(([k]) => k >= f - 2 && k <= f + 1);
      return damage.map(f => {
        const shown = frames.get(f)?.body, before = Math.max(...[...frames.entries()].filter(([k]) => k >= f - 12 && k <= f - 6).map(([, v]) => v.lum), 0);
        const flash = Math.max(...near(f).map(([, v]) => v.lum), 0);
        return {frame: f, bodyDrift: shown === undefined ? null : shown - index(f), flashRise: Math.round(flash - before)};
      });
    });
    const drift = Math.max(...result.map(r => Math.abs(r.bodyDrift ?? 99)));
    console.log(name, 'hits', result.length, 'max body drift', drift, 'frames; target flash rise per hit', result.map(r => r.flashRise).join(' '));
    if (!result.length || drift > 1) failed = true;
  }
  if (!casters.length) console.log('No published Limit Burst in this party');
  if (errors.length) { console.log('page errors', errors); failed = true; }
} finally { await browser.close(); }
process.exit(failed ? 1 : 0);
