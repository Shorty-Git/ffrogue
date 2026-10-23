import path from 'node:path';
import { inspectCharacter, inspectEffect, readJson, sha256 } from './character-pipeline.mjs';

// Availability and reviewed execution are separate gates. Legacy commands never
// become ready merely because the character importer permits preserving them.
export function planSkillBatch({ characters = ['cloud', 'aerith', 'barret'], selection, all = false,
  recipesRoot = 'tools/characters', assets = 'assets', dump = 'ffbe_asset_dump-main' } = {}) {
  const skills = [], effects = new Map(), found = new Set();
  for (const character of characters) {
    const recipeFile = path.join(recipesRoot, `${character}.json`);
    const recipe = readJson(recipeFile);
    const inspected = inspectCharacter(recipe, { assets, dump });
    for (const skill of recipe.skills) {
      const id = `${character}/${skill.id}`;
      if (selection ? !selection.includes(id) : !all && skill.execution !== 'legacy') continue;
      found.add(id);
      const selected = inspected.selected.find(s => s.id === skill.id);
      const source = inspected.catalog.find(s => s.id === skill.ffbeId && s.kind === (skill.type ?? 'ABILITY'));
      const members = source?.effects.flatMap(branch => branch.groups.flatMap(group => group.members)) ?? [];
      const missingFiles = [...new Set(members.filter(m => !m.asset?.exists).map(m => m.asset?.file).filter(Boolean))];
      const missingResources = [...new Set(members.flatMap(m => m.asset?.resources ?? []).filter(r => !r.exists).map(r => r.file))];
      const blockers = [...(selected?.issues ?? ['missing-inspection'])];
      if (inspected.missingStates.length) blockers.push('missing-character-states');
      if (skill.execution === 'legacy') blockers.push('execution-and-composition-review-required');
      if (missingFiles.length) blockers.push('missing-source-effects');
      if (missingResources.length) blockers.push('missing-effect-resources');
      const keys = [...new Set([...(skill.visualEffect ? [skill.visualEffect.key] : []), ...(skill.presentation?.effects.map(e => e.key) ?? [])])];
      if (!keys.length) blockers.push('no-reviewed-effect-mapping');
      const ready = !blockers.length;
      skills.push({ id, name: skill.name, execution: skill.execution, status: ready ? 'ready' : 'blocked', blockers: [...new Set(blockers)], missingFiles, missingResources, effects: keys });
      if (ready) for (const key of keys) {
        if (!effects.has(key)) effects.set(key, { key, recipeFile: `tools/effects/${key}.json`, skills: [] });
        effects.get(key).skills.push(id);
      }
    }
  }
  if (selection?.some(id => !found.has(id))) throw Error(`Unknown skill selection: ${selection.filter(id => !found.has(id)).join(', ')}`);
  for (const effect of effects.values()) effect.status = isEffectBakeCurrent(effect.recipeFile) ? 'cached' : 'pending';
  return { schemaVersion: 1, skills, effects: [...effects.values()],
    missingFiles: [...new Set(skills.flatMap(s => s.missingFiles))],
    limits: ['Ready means an existing reviewed recipe, not original-game fidelity.', 'Baking does not publish character skills or change gameplay.', 'Blocked skills are never replaced with partial effects.'] };
}

export function isEffectBakeCurrent(recipeFile, { assets = 'assets', effectsRoot = 'public/assets/effects' } = {}) {
  try {
    const recipe = readJson(recipeFile), folder = path.join(effectsRoot, recipe.key);
    const manifest = readJson(`${folder}/manifest.json`);
    const source = inspectEffect(path.join(assets, recipe.source), assets);
    return !!recipe.review?.approved && !!source.exists
      && manifest.recipeSha256 === sha256(recipeFile)
      && manifest.sourceSha256 === source.sha256
      && manifest.sheetSha256 === sha256(`${folder}/impact.png`)
      && JSON.stringify(manifest.resources) === JSON.stringify(source.resources.map(r => ({ file: r.file, sha256: r.sha256 })))
      && source.resources.every(r => r.exists);
  } catch { return false; }
}
