// Drafts a reviewed-adaptation recipe entry from a staged skill-source.json and writes it into
// tools/characters/<character>.json (replacing an entry with the same id or ffbeId).
// Gameplay values are provisional defaults for later balancing; visuals/timing come from source.
//   node tools/draft_skill_entry.mjs --character aerith --source <skill-source.json> --id curaja
//        --key aerith_curaja [--heal 900] [--buff 1.3] [--mult 2.5] [--mp 30]
import fs from 'node:fs';
import crypto from 'node:crypto';
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const character = arg('--character'), file = arg('--source'), id = arg('--id'), key = arg('--key');
if (!character || !file || !id || !key) throw Error('--character, --source, --id and --key are required');
const src = JSON.parse(fs.readFileSync(file, 'utf8')).skill, raw = src.raw, off = src.composition?.skillFrameOffset ?? 0;
const groups = String(raw.attackFrames).split('@').length;
const hits = String(raw.attackFrames).split(/[-@]/).map(t => t.split(':').map(Number));
const target = String(raw.target ?? '1').split('@')[0], range = String(raw.targetRange ?? '1').split('@')[0];
const heal = arg('--heal') && Number(arg('--heal')), buff = arg('--buff') && Number(arg('--buff'));
const friendly = !!(heal || buff);
const scope = friendly ? 'party' : range === '2' ? 'all_enemies' : 'single_enemy';
const motion = raw.motionType ?? 2, move = raw.moveType ?? 4;
const dash = motion === 1 && move === 1;
const clip = motion === 2 || (src.kind === 'MAGIC') ? 'magic_atk' : 'atk';
const mult = Number(arg('--mult', scope === 'all_enemies' ? 1.6 : 2.5));
const mp = Number(arg('--mp', Math.max(8, Math.min(60, Number(raw.cost) || 20))));
const desc = heal ? `Restore ${heal} HP to all living allies (no revival).`
  : buff ? `Boost physical damage of all allies by ${Math.round((buff - 1) * 100)}% for 3 rounds. No HP damage.`
  : `${clip === 'magic_atk' && src.kind === 'MAGIC' ? 'Magic' : 'Physical'} damage (${mult}x) to ${scope === 'all_enemies' ? 'all enemies' : 'one enemy'}`;
const entry = {
  id, ffbeId: src.id, name: raw.name, rarity: 5, level: 1, type: src.kind, mpCost: mp, scope,
  damageMultiplier: friendly ? 1 : mult, hitCount: friendly ? 0 : hits.length, attackFrames: hits.map(h => h[0]),
  moveType: dash ? 'dash' : 'stationary', motion: clip, desc,
  execution: friendly ? 'prepared-friendly' : 'prepared-source',
  reviewNote: 'Drafted by tools/draft_skill_entry.mjs from the staged original: source timing and visuals; gameplay values are provisional reviewed defaults.',
  scenePresentation: key, importStatus: 'imported', requiresSourceScene: true,
  preparedSourceReceipt: {file, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')},
  actionChoreography: {schema: 'source-action-v1', movement: dash ? 'target' : 'stationary', travelTiming: 'prepared',
    readiness: clip === 'magic_atk' ? 'magic-standby' : 'none', body: {mode: 'clips', phases: [{frame: 0, clip}]},
    review: {basis: 'reviewed-adaptation', sourceMotionType: motion, sourceMoveType: move,
      note: `Drafted from motion ${motion} / move ${move}: ${dash ? 'dash with atk body' : `stationary ${clip} body`}.`}},
};
if (friendly) {
  entry.allyTargeting = 'living-allies';
  entry.allyEvents = [{frame: hits[0][0] + off, effects: [heal ? {kind: 'heal', amount: heal} : {kind: 'physical-boost', multiplier: buff, turns: 3}]}];
  entry.friendlyTargetReview = {sourceTarget: raw.target, sourceRange: raw.targetRange,
    note: `Original target ${raw.target} / range ${raw.targetRange} (process ${raw.processId}); adapted to ${heal ? `a fixed ${heal} HP heal` : `physical-boost x${buff} for 3 rounds`} on all living allies.`};
} else entry.damageEvents = hits.map(([frame, weight]) => ({frame: frame + off, weight: weight / (100 * groups)}));
const path = `tools/characters/${character}.json`, recipe = JSON.parse(fs.readFileSync(path, 'utf8'));
const at = recipe.skills.findIndex(s => s.id === id || s.ffbeId === src.id);
if (at >= 0) recipe.skills[at] = entry; else recipe.skills.push(entry);
fs.writeFileSync(path, JSON.stringify(recipe, null, 2) + '\n');
console.log(JSON.stringify({character, id, scope, execution: entry.execution, moveType: entry.moveType, motion: clip, hits: hits.length, mp}));
