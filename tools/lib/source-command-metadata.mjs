// Original evidence is immutable metadata; game balance remains in the reviewed recipe.
export function sourceCommandMetadata(skill, source, origin) {
  if (!skill.scenePresentation && skill.importStatus!=='not-imported' && skill.execution!=='basic-attack-repeat') return {};
  const databasePath = origin?.file ?? origin?.path;
  if (!source || source.id !== skill.ffbeId || !source.raw || typeof databasePath !== 'string'
    || !/^[a-f0-9]{64}$/.test(origin?.sha256 ?? ''))
    throw Error('Exact original command identity and database hash required');
  return {
    originalCommand: {
      schema: 'ffbe-command-source-v1', kind: source.kind, id: source.id,
      database: {path:databasePath,sha256:origin.sha256}, raw: structuredClone(source.raw),
      ...(source.commandReferences ? {references:structuredClone(source.commandReferences)} : {}),
    },
    gameplayReview: {
      policy: 'reviewed-roguelike', note: skill.reviewNote ?? '',
      ownedFields: ['mpCost', 'damageMultiplier','damageType', 'hitCount', 'scope', 'damageEvents', 'supportEvents','allyEvents','actionChoreography',
        ...(skill.hpCost!==undefined?['hpCost']:[]),...(skill.allyTargeting?['allyTargeting']:[]),...(skill.basicRepeat?['basicRepeat']:[])],
      boundary: 'Original process parameters and source markers do not execute as game balance rules',
    },
  };
}
