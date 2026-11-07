export const SCENE_PROFILE = 'bmb-preview-scene-v1';
/** Plausibility cap: 15 s at 60 fps. Limit Bursts run longer than abilities (Omnislash: 729 frames). */
export const MAX_SCENE_FRAMES = 900;
import {reviewedSkillEvents} from './skillDamageTimeline.mjs';
import {validateActionChoreography} from './actionChoreography.mjs';
import {FLAT_QUAD_RGB_PROFILE,COLOR_STREAM_POLICY,validateFlatQuadColor} from './sourceQuadColor.mjs';

/** Reviewed action semantics must agree with the prepared movement/target contract. */
export function validateSceneAction(manifest, action) {
  validateSceneManifest(manifest);
  reviewedSkillEvents(action, manifest.durationFrames);
  if(action.requiresSourceScene)validateActionChoreography(action,manifest.durationFrames);
  if (action.scope !== manifest.plan.presentation.scope || action.moveType !== manifest.plan.presentation.movement)
    throw Error('Prepared-scene action scope/movement mismatch');
  if(['self','party'].includes(action.scope)&&!action.allyEvents?.length)throw Error('Friendly Source action requires reviewed friendly events');
  return manifest;
}

/** An explicit experimental profile; no unsupported input becomes a native claim. */
export function validateSceneManifest(manifest) {
  if (manifest?.schemaVersion !== 1 || manifest.profile !== SCENE_PROFILE
    || manifest.quality !== 'experimental-preview' || manifest.originalFidelityVerified !== false
    || !/^[a-z][a-z0-9_]*$/.test(manifest.key) || !Number.isInteger(manifest.sourceId)
    || !Number.isInteger(manifest.durationFrames) || manifest.durationFrames < 1 || manifest.durationFrames > MAX_SCENE_FRAMES
    || !manifest.provenance?.planSha256 || !manifest.provenance?.playerSha256)
    throw Error('Explicit experimental prepared-scene manifest required');
  const plan = manifest.plan;
  if (!plan || plan.sourceId !== manifest.sourceId || plan.approved !== false
    || !Array.isArray(plan.effects) || !plan.effects.length || !Array.isArray(plan.members) || !plan.members.length
    || !['single_enemy','all_enemies','self','party'].includes(plan.presentation?.scope)
    || !['dash','stationary'].includes(plan.presentation?.movement)
    || !Number.isInteger(plan.seed) || plan.rectanglePlacement?.unitsPerPixel !== 1
    || JSON.stringify(plan.rectanglePlacement?.scatter) !== '[0,0]')
    throw Error('Unsupported prepared-scene placement or simulation profile');
  if(['self','party'].includes(plan.presentation.scope)&&plan.presentation.movement!=='stationary')throw Error('Friendly Source movement must be stationary');
  const motion = plan.presentation;
  if(plan.flatQuadColors&&(plan.flatQuadColors.profile!==FLAT_QUAD_RGB_PROFILE
    ||plan.flatQuadColors.randomness!==COLOR_STREAM_POLICY))throw Error('Unreviewed Flat Quad RGB policy');
  if(plan.rectanglePlacement.coordinateSystem!==undefined && (plan.rectanglePlacement.coordinateSystem!=='ffbe-screen-api'
    ||typeof plan.rectanglePlacement.coordinateReview!=='string'||!plan.rectanglePlacement.coordinateReview.trim()))
    throw Error('Unsupported explicit placement coordinate system');
  if(plan.memberRandomness!==undefined && (plan.memberRandomness!=='reviewed-member-streams-v1'||plan.nativeQuadBranches
    ||typeof plan.randomnessReview!=='string'||!plan.randomnessReview.trim()
    ||plan.members.some(m=>typeof m.randomStreamKey!=='string'||!m.randomStreamKey.length)))
    throw Error('Unsupported member randomness policy');
  if (!Number.isFinite(motion.approachFrames) || motion.approachFrames < 0
    || (motion.movement === 'dash' && motion.approachFrames === 0)
    || !Number.isFinite(motion.returnFrames) || motion.returnFrames <= 0
    || !Number.isFinite(motion.targetOffsetX))
    throw Error('Invalid prepared-scene choreography');
  for (const member of plan.members) {
    if (!plan.effects[member.effect] || !Number.isFinite(member.startFrame) || member.startFrame < 0
      || !['front', 'back'].includes(member.layer) || !['target', 'target-group', 'screen', 'caster'].includes(member.anchor)
      || !(member.scalePercent > 0) || member.rotation?.length !== 3 || !member.rotation.every(Number.isFinite))
      throw Error('Unsupported prepared-scene member');
  }
  for (const effect of plan.effects) {
    for(const node of effect.nodes??[])if(node.flatQuadColor){
      if(!plan.flatQuadColors||node.typeId!==2||node.quadColors)throw Error('Unadmitted or conflicting Flat Quad RGB');
      validateFlatQuadColor(node.flatQuadColor);
    }
    if (!Array.isArray(effect.nodes) || !effect.meshes || !effect.textures) throw Error('Prepared scene geometry missing');
    for (const url of Object.values(effect.textures))
      if (!/^\/assets\/presentations\/resources\/[a-f0-9]{64}\.png$/.test(url)) throw Error('Unpublished scene texture');
    if (effect.nodes.some(node=>![0,2,3,6].includes(node.typeId))) throw Error('Unsupported prepared scene node family');
    for (const node of effect.nodes) if (node.typeId===6 && !effect.meshes[node.resourceBindings?.model?.name])
      throw Error('Prepared model geometry required; no plane substitution');
    for(const node of effect.nodes)if(node.presentationCoverage){
      const coverage=node.presentationCoverage,binding=node.resourceBindings;
      if(coverage.primitive==='unit-xy-model'){
        const mesh=effect.meshes[binding?.model?.name];
        const positions=mesh?.vertices.map(v=>v.position).sort();
        const expected=[[-.5,-.5,0],[-.5,.5,0],[.5,-.5,0],[.5,.5,0]].sort();
        if(coverage.region!=='arena'||!coverage.origin||node.typeId!==6||binding.texture2
          ||!mesh||mesh.sourceSha256!==coverage.modelSha256||mesh.triangleCount!==2
          ||JSON.stringify(positions)!==JSON.stringify(expected)
          ||new Set(mesh.vertices.map(v=>JSON.stringify(v.colorBytes))).size!==1
          ||effect.textures[binding.texture1?.name]!==`/assets/presentations/resources/${coverage.textureSha256}.png`)
          throw Error('Reviewed uniform unit XY Model coverage required');
        continue;
      }
      if(coverage.region!=='arena'||!coverage.origin||node.typeId!==3||!binding.texture1||binding.texture2||binding.model
        ||node.materialControls?.textureCombination?.name!=='Basic'
        ||effect.textures[binding.texture1.name]!==`/assets/presentations/resources/${coverage.textureSha256}.png`)
        throw Error('Reviewed uniform Particle screen coverage required');
    }
  }
  return manifest;
}
