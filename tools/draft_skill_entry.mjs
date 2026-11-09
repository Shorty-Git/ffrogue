// Drafts a reviewed-adaptation recipe entry from a staged skill-source.json and writes it into
// tools/characters/<character>.json (replacing an entry with the same id or ffbeId).
// Gameplay values are provisional defaults for later balancing; visuals/timing come from source.
//   node tools/draft_skill_entry.mjs --character aerith --source <skill-source.json> --id curaja
//        --key aerith_curaja [--heal 900] [--buff 1.3 | --source-buff] [--revive 0.8] [--raise 0.5] [--mult 2.5] [--mp 30]
// --source-buff derives boost/Protect/Shell statuses from the original stat-buff processes (lib/source-buffs.mjs).
import fs from 'node:fs';
import crypto from 'node:crypto';
import {sourceFriendlyBuffs, buffDescription} from './lib/source-buffs.mjs';
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const character = arg('--character'), file = arg('--source'), id = arg('--id'), key = arg('--key');
if (!character || !file || !id || !key) throw Error('--character, --source, --id and --key are required');
const src = JSON.parse(fs.readFileSync(file, 'utf8')).skill, raw = src.raw, off = src.composition?.skillFrameOffset ?? 0;
const groups = String(raw.attackFrames).split('@').length;
const hits = String(raw.attackFrames).split(/[-@]/).map(t => t.split(':').map(Number));
const target = String(raw.target ?? '1').split('@')[0], range = String(raw.targetRange ?? '1').split('@')[0];
const heal = arg('--heal') && Number(arg('--heal')), buff = arg('--buff') && Number(arg('--buff')), revive = arg('--revive') && Number(arg('--revive'));
const raise = arg('--raise') && Number(arg('--raise'));
const sourceBuffs = process.argv.includes('--source-buff') ? sourceFriendlyBuffs(raw) : null;
const cleanse = process.argv.includes('--cleanse');
if (cleanse && String(raw.processId) !== '5') throw Error(`process ${raw.processId} is not an Esuna-type cleanse`);
if (process.argv.includes('--source-buff') && !sourceBuffs) throw Error(`process ${raw.processId} is not a pure stat buff`);
const friendly = !!(heal || buff || revive || raise || sourceBuffs || cleanse);
// Raise (process 4): range 2 revives every fallen ally, otherwise the first fallen ally in party order.
const raiseTargets = range === '2' ? 'fallen-allies' : 'fallen-ally';
const scope = friendly ? 'party' : range === '2' ? 'all_enemies' : 'single_enemy';
// Limit Burst rows carry no motionType: single-target LBs dash in with the limit_atk body (reviewed
// adaptation, as Omnislash), area LBs play limit_atk where the caster stands. They cost no MP.
const limit = src.kind === 'LIMIT';
const motion = raw.motionType ?? (limit ? 1 : 2), move = raw.moveType ?? (limit ? (scope === 'single_enemy' ? 1 : 4) : 4);
// Motion 5 strikes leap or lunge to the target (move 1 or 6); 3 and 6 act in place.
const dash = (motion === 1 && move === 1) || (motion === 5 && [1, 6].includes(move));
const clip = !limit && (motion === 2 || src.kind === 'MAGIC') ? 'magic_atk' : 'atk';
const bodyClip = limit ? 'limit_atk' : clip;
const mult = Number(arg('--mult', limit ? (scope === 'all_enemies' ? 3.5 : 6) : scope === 'all_enemies' ? 1.6 : 2.5));
const mp = limit ? 0 : Number(arg('--mp', Math.max(8, Math.min(60, Number(raw.cost) || 20))));
const desc = raise ? `Revive ${raiseTargets === 'fallen-allies' ? 'all fallen allies' : 'one fallen ally'} with ${Math.round(raise * 100)}% HP.`
  : cleanse ? 'Remove stat breaks and blind from all living allies.'
  : sourceBuffs ? buffDescription(sourceBuffs)
  : heal ? `Restore ${heal} HP to all living allies (no revival).`
  : revive ? `All living allies revive once with ${Math.round(revive * 100)}% HP if K.O. within 3 rounds.`
  : buff ? `Boost physical damage of all allies by ${Math.round((buff - 1) * 100)}% for 3 rounds. No HP damage.`
  : `${limit ? 'Limit Burst: ' : ''}${clip === 'magic_atk' && src.kind === 'MAGIC' ? 'Magic' : 'Physical'} damage (${mult}x) to ${scope === 'all_enemies' ? 'all enemies' : 'one enemy'}`;
const entry = {
  id, ffbeId: src.id, name: raw.name, rarity: 5, level: 1, type: src.kind, mpCost: mp, scope,
  damageMultiplier: friendly ? 1 : mult, hitCount: friendly ? 0 : hits.length, attackFrames: hits.map(h => h[0]),
  moveType: dash ? 'dash' : 'stationary', motion: clip, desc,
  execution: friendly ? 'prepared-friendly' : 'prepared-source',
  reviewNote: 'Drafted by tools/draft_skill_entry.mjs from the staged original: source timing and visuals; gameplay values are provisional reviewed defaults.',
  scenePresentation: key, importStatus: 'imported', requiresSourceScene: true,
  preparedSourceReceipt: {file, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')},
  actionChoreography: {schema: 'source-action-v1', movement: dash ? 'target' : 'stationary', travelTiming: 'prepared',
    readiness: clip === 'magic_atk' ? 'magic-standby' : 'none', body: {mode: 'clips', phases: [{frame: 0, clip: bodyClip}]},
    review: {basis: 'reviewed-adaptation', sourceMotionType: motion, sourceMoveType: move,
      note: `Drafted from motion ${motion} / move ${move}: ${dash ? `dash with ${bodyClip} body` : `stationary ${bodyClip} body`}${limit ? ' (LB rows carry no motionType; reviewed adaptation)' : ''}.`}},
};
if (friendly) {
  entry.allyTargeting = raise ? raiseTargets : 'living-allies';
  entry.allyEvents = [{frame: hits[0][0] + off, effects: cleanse ? [{kind: 'cleanse'}] : sourceBuffs ?? [raise ? {kind: 'raise', hpFraction: raise} : heal ? {kind: 'heal', amount: heal} : revive ? {kind: 'auto-revive', hpFraction: revive, turns: 3} : {kind: 'physical-boost', multiplier: buff, turns: 3}]}];
  entry.friendlyTargetReview = {sourceTarget: raw.target, sourceRange: raw.targetRange,
    note: `Original target ${raw.target} / range ${raw.targetRange} (process ${raw.processId}); adapted to ${cleanse ? 'a cleanse of enemy debuffs (stat breaks, blind; FFRogue adaptation: original Esuna clears ailments only)' : sourceBuffs ? `${sourceBuffs.map(e => e.kind === 'guard' ? `${e.damageType} guard -${e.reduction}` : `physical-boost x${e.multiplier}`).join(' + ')} for ${sourceBuffs[0].turns} rounds (statuses from the original stat-buff processes ${raw.processId} / ${raw.processParam})` : raise ? `raise at ${raise} HP on ${raiseTargets}` : heal ? `a fixed ${heal} HP heal` : revive ? `auto-revive at ${revive} HP for 3 rounds` : `physical-boost x${buff} for 3 rounds`}${raise ? '' : ' on all living allies'}.`};
} else entry.damageEvents = hits.map(([frame, weight]) => ({frame: frame + off, weight: weight / (100 * groups)}))
  .sort((a, b) => a.frame - b.frame); // parallel '@' processes interleave; same order as source-damage-events.mjs
const path = `tools/characters/${character}.json`, recipe = JSON.parse(fs.readFileSync(path, 'utf8'));
const at = recipe.skills.findIndex(s => s.id === id || s.ffbeId === src.id);
if (at >= 0) recipe.skills[at] = entry; else recipe.skills.push(entry);
fs.writeFileSync(path, JSON.stringify(recipe, null, 2) + '\n');
console.log(JSON.stringify({character, id, scope, execution: entry.execution, moveType: entry.moveType, motion: clip, hits: hits.length, mp}));
