// Plays chosen pattern steps of a boss/elite in a production training fight (headless, dev server on
// 3001) and saves one screenshot per step at its first reviewed hit, plus damage and errors.
//   node tools/review_boss_moves.mjs --enemy chaos --skills firaga,flare [--out tools/data/boss-moves] [--arena chaos_shrine]
// A step is found by its skill id in the enemy's reviewed pattern; the enemy's cursor is set to it and
// the production enemy turn runs (no shortcut through the scene player).
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {PLAYWRIGHT} from './lib/scene-frames.mjs';

const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const enemy = arg('--enemy'), skills = arg('--skills').split(','), out = arg('--out') ?? 'tools/data/boss-moves', arena = arg('--arena');
const {chromium} = createRequire(import.meta.url)(PLAYWRIGHT);
const browser = await chromium.launch({channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']});
let failed = false;
try {
  const page = await browser.newPage({viewport: {width: 1000, height: 1100}});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:3001/tools/test-source-limit-burst.html');
  await page.waitForFunction(() => /Limit Bursts in this party|No hero/.test(document.getElementById('status').textContent), {}, {timeout: 120000});
  for (const skill of skills) {
    await page.evaluate(async ([enemy, arena]) => {
      const game = window.__ffrogueGame, {createTrainingRun} = await import('/src/run/trainingRun.ts');
      const run = createTrainingRun(game.cache, {opponent: enemy, ...(arena ? {arena} : {})});
      window.__before = game.scene.getScene('BattleScene').sys.settings.data.runContext;
      game.scene.start('BattleScene', {manifests: game.registry.get('reviewManifests'), runContext: run.context});
    }, [enemy, arena]);
    await page.waitForFunction(() => { const s = window.__ffrogueGame.scene.getScene('BattleScene'); return s?.sys.isActive() && s.sys.settings.data.runContext !== window.__before && s.combatState === 'PLAYER_TURN'; }, {}, {timeout: 60000});
    await page.evaluate(() => window.__ffrogueGame.scene.getScene('BattleScene').preparedScenes?.ready);
    const step = await page.evaluate(async ([enemy, skill]) => {
      const {ENEMY_CONTENT} = await import('/src/run/stageContent.mjs'), {ENEMY_SKILLS} = await import('/src/run/enemySkills.mjs');
      const s = window.__ffrogueGame.scene.getScene('BattleScene'), boss = s.enemies[0], definition = ENEMY_CONTENT[enemy];
      const index = definition.behavior.pattern.findIndex(step => step.skill === skill);
      if (index < 0) return {error: 'skill not in the reviewed pattern'};
      const entry = ENEMY_SKILLS[enemy][skill];
      window.__hits = []; window.__sceneErrors = [];
      s.events.on('prepared-scene-error', message => window.__sceneErrors.push(message));
      for (const hero of s.turnOrder) { const apply = hero.applyDamage?.bind(hero) ?? hero.takeDamage?.bind(hero); const name = hero.applyDamage ? 'applyDamage' : 'takeDamage';
        hero[name] = (amount, ...rest) => { window.__hits.push({hero: hero.heroName, amount, frame: s.preparedScenes.snapshot().frame}); return apply(amount, ...rest); }; }
      boss.actionCursor = index; s.combatState = 'ENEMY_TURN'; s.executeEnemyTurn();
      return {index, name: definition.behavior.pattern[index].name, scope: entry.scope, presentation: entry.presentation, firstHit: entry.damageEvents[0].frame, duration: s.preparedScenes.duration(entry.presentation)};
    }, [enemy, skill]);
    if (step.error) { console.log(skill, step.error); failed = true; continue; }
    await page.waitForFunction(first => { const snap = window.__ffrogueGame.scene.getScene('BattleScene').preparedScenes.snapshot(); return snap.active && snap.frame >= first + 4; }, step.firstHit, {timeout: 30000}).catch(() => {});
    fs.mkdirSync(out, {recursive: true});
    await page.screenshot({path: `${out}/${enemy}-${skill}.png`});
    await page.waitForFunction(() => !window.__ffrogueGame.scene.getScene('BattleScene').preparedScenes.snapshot().active, {}, {timeout: 60000});
    const result = await page.evaluate(() => ({hits: window.__hits, sceneErrors: window.__sceneErrors, bridgeErrors: window.__ffrogueGame.scene.getScene('BattleScene').preparedScenes.snapshot().errors}));
    const heroes = [...new Set(result.hits.map(hit => hit.hero))];
    const ok = result.hits.length > 0 && !result.sceneErrors.length && !result.bridgeErrors.length && !errors.length;
    if (!ok) failed = true;
    console.log(JSON.stringify({enemy, skill, step: step.name, scope: step.scope, presentation: step.presentation, hits: result.hits.length, heroesHit: heroes.length,
      totalDamage: result.hits.reduce((sum, hit) => sum + hit.amount, 0), errors: [...result.sceneErrors, ...result.bridgeErrors, ...errors], ok}));
  }
} finally { await browser.close(); }
process.exitCode = failed ? 1 : 0;
