// Headless driver for tools/test-source-frames.html: plays published scenes in the production
// BattleScene (training fight) and returns per-frame measurements plus a contact sheet.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

export const PLAYWRIGHT = process.env.FFROGUE_PLAYWRIGHT
  ?? 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
export const PRESENTATIONS = 'public/assets/presentations';
export const sceneKeys = () => fs.readdirSync(PRESENTATIONS).filter(key => fs.existsSync(`${PRESENTATIONS}/${key}/manifest.json`)).sort();

/**
 * Captures every key; `onResult(result)` receives the page's measurement (sheet and markedSheet as JPEG Buffers).
 * The page is reloaded every `reloadEvery` scenes so GPU memory of disposed scenes cannot pile up.
 * options.manifestFor(key) may return a manifest object that replaces the published one.
 */
export async function captureScenes(keys, onResult, options = {}) {
  const {origin = 'http://127.0.0.1:3001', count = 12, reloadEvery = 40, arena, manifestFor, log = () => {}} = options;
  const {chromium} = createRequire(import.meta.url)(PLAYWRIGHT);
  const browser = await chromium.launch({channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']});
  try {
    let page = null, used = 0;
    const open = async () => {
      await page?.close();
      page = await browser.newPage({viewport: {width: 1000, height: 1100}});
      page.on('pageerror', error => log('page error: ' + error.message));
      await page.goto(`${origin}/tools/test-source-frames.html${arena ? '?arena=' + arena : ''}`);
      await page.waitForFunction(() => window.sceneFrames, {}, {timeout: 120000});
      await page.evaluate(() => window.sceneFrames.ready);
      used = 0;
    };
    for (const [index, key] of keys.entries()) {
      if (!page || used >= reloadEvery) await open();
      used++;
      let result;
      try {
        result = await page.evaluate(([key, options]) => window.sceneFrames.capture(key, options), [key, {count, manifest: manifestFor?.(key) ?? null}]);
      } catch (error) {
        result = {key, frames: [], errors: ['capture failed: ' + String(error.message).split('\n')[0]]};
        page = null;
      }
      for (const name of ['sheet', 'markedSheet']) if (result[name]) result[name] = Buffer.from(result[name].split(',')[1], 'base64');
      await onResult(result, index);
    }
  } finally { await browser.close(); }
}

/** More straight runs than this in one frame is a texture pattern (stretched speed lines, ray bursts), not a box. */
export const PATTERN_RUNS = 120;

/**
 * Box score of one captured scene. Rectangle corners (a horizontal and a vertical hard edge meeting)
 * weigh most: streaks, beams and slashes have straight edges but no corners. Frames with very many
 * runs are patterns, where corners happen by chance; they count little. Then the longest straight
 * edge of the non-pattern frames, then flat rectangular planes.
 */
export function boxScore(result) {
  let cornerFrames = 0, patternFrames = 0, corners = 0, edge = 0, plane = 0, longest = 0;
  for (const frame of result.frames) {
    const e = frame.edges, pattern = e.horizontal + e.vertical > PATTERN_RUNS;
    if (pattern) patternFrames++;
    else {
      if (e.corners) cornerFrames++;
      corners = Math.max(corners, e.corners ?? 0);
      longest = Math.max(longest, e.longestHorizontal, e.longestVertical);
    }
    edge = Math.max(edge, e.total);
    if (frame.plane && !frame.plane.whole && frame.plane.fill > .8) plane = Math.max(plane, frame.plane.share);
  }
  return {cornerFrames, patternFrames, corners, edge, longest, plane,
    score: cornerFrames * 300 + Math.min(corners, 10) * 50 + Math.min(longest, 250) + patternFrames * 20 + Math.round(plane * 2000)};
}

/** Mean effect difference (0-255) per frame, from the page's greyscale signatures. */
export const signatureBytes = frame => Buffer.from(frame.signature, 'base64');
export function effectEnergy(result) {
  let sum = 0, n = 0;
  for (const frame of result.frames) for (const value of signatureBytes(frame)) { sum += value; n++; }
  return n ? sum / n : 0;
}

/** Signature difference between two captures of one scene: mean and largest cell difference (0-255). */
export function difference(before, after) {
  let sum = 0, n = 0, max = 0;
  const frames = Math.min(before.frames.length, after.frames.length);
  for (let i = 0; i < frames; i++) {
    const a = signatureBytes(before.frames[i]), b = signatureBytes(after.frames[i]);
    for (let k = 0; k < a.length; k++) { const d = Math.abs(a[k] - b[k]); sum += d; n++; if (d > max) max = d; }
  }
  return {mean: n ? sum / n : 0, max};
}

export function verdict(before, after) {
  const reasons = [];
  if (!before) return {verdict: 'new', reasons: ['no baseline frames']};
  const b = boxScore(before), a = boxScore(after), eb = effectEnergy(before), ea = effectEnergy(after), diff = difference(before, after);
  const newErrors = after.errors.filter(error => !before.errors.includes(error));
  if (newErrors.length) reasons.push('playback errors: ' + newErrors.join('; '));
  if (before.frames.length !== after.frames.length || before.durationFrames !== after.durationFrames) reasons.push(`duration ${before.durationFrames} -> ${after.durationFrames}`);
  if (a.cornerFrames > b.cornerFrames || a.corners > b.corners + 2) reasons.push(`more rectangle corners (${b.cornerFrames}/${b.corners} -> ${a.cornerFrames}/${a.corners})`);
  if (a.plane > b.plane + .01) reasons.push('larger flat plane');
  if (eb > .2 && ea < eb * .6) reasons.push(`effect lost picture (energy ${eb.toFixed(2)} -> ${ea.toFixed(2)})`);
  if (ea > .2 && ea > eb * 2.5 + .5) reasons.push(`effect gained much picture (energy ${eb.toFixed(2)} -> ${ea.toFixed(2)})`);
  const unchanged = diff.mean < .15 && diff.max < 10 && !reasons.length;
  return {verdict: reasons.length ? 'review' : unchanged ? 'unchanged' : 'ok', reasons, difference: {mean: Number(diff.mean.toFixed(3)), max: diff.max},
    box: {before: b.score, after: a.score}, energy: {before: Number(eb.toFixed(2)), after: Number(ea.toFixed(2))}};
}

/**
 * Causes of one issue text. Effect names, node indices and numbers are instance detail. Compound
 * eligibility messages ("X unsupported: reason; reason; ... retained") give one cause per reason,
 * so a reason shared by many combinations is ranked once.
 */
export function issueCauses(text) {
  const plain = text.replace(/^[^:]{1,80}: /, '')
    .replace(/\b(node|Null|Model|Particle|particle|Quad) \d+\b/g, '$1 N')
    .replace(/-?\d+(\.\d+)?(e-?\d+)?/g, 'N')
    .replace(/(N, )+N/g, 'N…');
  const compound = plain.match(/^(.*? unsupported|.*? retains legacy Basic material): (.*)$/);
  if (!compound) return [plain];
  const reasons = compound[2].split('; ').map(reason => reason.replace(/ on node N$/, ''))
    .filter(reason => !/retained( only for comparison)?$/.test(reason));
  return [...new Set(reasons)].map(reason => compound[1].replace(/ N\b/, '') + ': ' + reason);
}

export const writeFile = (file, data) => { fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, data); };
