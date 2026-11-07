// Inventory current shared-renderer coverage; never change plans or publish assets.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {instances, createTransformEvaluator, inheritanceLimitations, isUntexturedParticle, particleGeometryEligibility, nativeParticleXEligibility, nullLocatorEligibility, shaderAddEligible, shaderDistortionEligible, shaderBasicEligible, nativeBlendSelection, zScreenLocatorEligibility} from './original_effect_player.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const stage = path.resolve('tools/data') + path.sep;
export function classifyEffect(plan, effect, source) {
  const emissionBlocked = new Map(), nodes = [];
  for (const node of effect.nodes) {
    const shape = node.authoringEmissionShape;
    const inherited = node.parentIndex !== null && emissionBlocked.get(node.parentIndex);
    const blocked = !!inherited || !!(shape && shape !== 'Point');
    emissionBlocked.set(node.index, blocked);
    const distortionBlocked = node.materialControls?.textureCombination?.name === 'Distortion' && !node.distortionFields;
    const untexturedBlocked = plan.withholdUntexturedParticles && isUntexturedParticle(node);
    const ownDrawCandidate = node.typeId !== 0 && !blocked && !distortionBlocked && !untexturedBlocked;
    const findings = [];
    const add = (capability, status, detail, evidence) => findings.push({capability, status, detail, evidence});
    if (blocked) add('emission', 'withheld', inherited ? 'Ancestor emission shape blocks this node' : shape, 'Prepared matched-authoring emission shape');
    if (untexturedBlocked) add('untextured-primitive', 'withheld', 'Primitive geometry is not verified', 'Current runtime predicate');
    if (distortionBlocked && node.typeId !== 0) add('distortion', 'withheld', 'Selected distortion has no supported prepared fields', 'Prepared material mode');
    if (node.parentIndex !== null) {
      if (!plan.sourceInheritance) add('inheritance', 'disabled', 'Source inheritance experiment disabled', 'Plan flag');
      else for (const message of inheritanceLimitations(node.authoringInheritance)) {
        const capability = !node.authoringInheritance ? 'inheritance' : message.includes('transform') ? 'parent-transform' : message.includes('color') ? 'parent-color' : message.includes('alpha') ? 'parent-alpha' : 'inheritance';
        add(capability, node.authoringInheritance ? 'native-equation-unverified' : 'source-controls-unknown', message, 'Current exported runtime limitation predicate');
      }
    }
    const xml = source.nodes.find(row => row.index === node.index)?.fields;
    if (!source.authoring) add('authoring-dependency', 'source-controls-unknown', 'No matched authoring; absent controls do not prove feature absence', 'Source audit');
    if (node.typeId === 0 && xml?.Detail_Basic_NullType && xml.Detail_Basic_NullType !== 'Standard') {
      const members=(plan.members??[]).filter(m=>plan.effects?.[m.effect]===effect);
      const support=plan.nativeNullLocator?zScreenLocatorEligibility(effect,node):nullLocatorEligibility(effect,node);
      const enabled=plan.nullLocator&&plan.sourceInheritance&&support.supported&&members.length&&members.every(m=>m.rotation.every(v=>v===0)&&m.scalePercent>0);
      add('null-locator', enabled?'rendered-experimental':'missing', 'Selected ancestor '+xml.Detail_Basic_NullType+': '+
        (enabled?(plan.nativeNullLocator?'source-dispatched constant-scale ZScreen locator enabled; time/random sampling remain unverified':'bounded zero-roll unit-scale locator enabled; native variants remain unverified'):support.reasons.join('; ')||'experiment disabled'),
        'Matched authoring selector and shared eligibility predicate; ancestor can transform visible descendants');
    }
    if (node.typeId === 6 && xml?.Detail_Basic_ModelType === 'Billboard') add('model-billboard', 'missing', 'Selected billboard mode is not implemented', 'Matched authoring selector');
    if (node.typeId === 3 && ownDrawCandidate) {
      const members=(plan.members??[]).filter(member=>plan.effects?.[member.effect]===effect);
      const nativeX=plan.nativeParticleX&&plan.sourceInheritance&&plan.nullLocator&&plan.nativeNullLocator;
      const support=plan.particleGeometry?members.map(member=>{
        const original=particleGeometryEligibility(effect,node,member),candidate=nativeX?nativeParticleXEligibility(effect,node,member):null;
        return candidate?.supported?candidate:original;
      }):[];
      const enabled=support.length>0&&support.every(item=>item.supported);
      add('particle-facing', enabled?'rendered-experimental':'native-equation-unverified',
        enabled?'Explicit bounded Particle display subset (legacy zero-roll or deterministic native X); other variants unverified':
          'Legacy transformed unit plane retained for comparison; '+support.flatMap(item=>item.reasons).join('; '),
        'Current shared capability predicate and opt-in plan flag');
    }
    if (node.typeId === 6 && node.resourceBindings.model) {
      const mesh = source.meshes.find(mesh => mesh.name === node.resourceBindings.model.name);
      if (!mesh) throw Error('Missing verified original model inventory');
      if (mesh.nonwhiteVertices > 0) add('model-vertex-rgba', plan.modelVertexRgba ? 'rendered-experimental' : 'missing', `${mesh.name}: ${mesh.nonwhiteVertices}/${mesh.vertexCount} nonwhite vertices; alpha ${mesh.alphaByteRange.join('..')}`, plan.modelVertexRgba ? 'Original M3R bytes; experimental shared RGBA shader enabled' : 'Original M3R bytes; plan has no enabled vertex-color path');
    }
    if (xml && node.parentIndex !== null && Number(xml.Basic_ParentNodeInfluence_ParentAlphaRate) === 0 && plan.sourceInheritance)
      add('parent-alpha-zero', 'implemented-subset', 'Rate-zero alpha uses local alpha', 'Current evaluator + prepared authoring');
    if (node.authoringInheritance?.translation === 'OnGenerateTime' && plan.sourceInheritance
        && !inheritanceLimitations(node.authoringInheritance).some(message => message.includes('transform')))
      add('parent-birth-translation', 'implemented-subset', 'Supported transform combination uses birth-time parent translation', 'Current evaluator predicate');
    for (const message of node.appearance?.limitations ?? []) {
      add(message.includes('quad corner') ? 'quad-corner-colors' : 'appearance', 'native-equation-unverified', message, 'Prepared appearance report');
    }
    if(node.flatQuadColor&&plan.flatQuadColors)
      add('quad-flat-rgb','implemented-subset','Constant flat source RGB/range; native RGB clamp with independent alpha; per-instance deterministic host color streams',
        'Matched binary/project values and retained native InitConstFlat records; effect RNG ownership remains unmeasured');
    for (const message of node.basicTextureMapping?.limitations ?? []) add('uv-mapping', 'native-equation-unverified', message, 'Prepared UV report');
      if (ownDrawCandidate && plan.nativeMaterialSelection)
        add('native-material-selection', node.nativeMaterialSelection?.supported?'implemented-subset':'source-controls-unknown',
          node.nativeMaterialSelection?.supported?'Initial native descriptor '+node.nativeMaterialSelection.descriptorIndex+', fragment slot '+node.nativeMaterialSelection.fragmentSlot+'; live overrides unverified':node.nativeMaterialSelection?.reason??'No native selection metadata',
          'Pinned native selector and complete package slot table');
      if(ownDrawCandidate&&plan.nativeBasicMaterial&&node.nativeMaterialSelection?.basicCandidateCompatible)
        add('basic-texture-tint',shaderBasicEligible(plan,node)?'rendered-experimental':'source-controls-unknown',
          shaderBasicEligible(plan,node)?'Matched constant layer tint; pinned native Basic shader candidate':(node.nativeBasicTint?.limitations??['No tint controls']).join('; '),
          'Matched authoring and initial native fragment hash; global uniforms remain unverified');
      if (ownDrawCandidate && node.materialControls?.textureCombination?.name === 'Distortion')
        add('distortion', 'native-equation-unverified', shaderDistortionEligible(plan,node)?'Selected native alpha/displacement equation; global uniforms, source layer alpha and UV playback still unverified':'Experimental displacement/material equation', 'Selected mode and prepared distortion fields');
    if (ownDrawCandidate && node.resourceBindings.texture2)
      add('two-texture-material', 'native-equation-unverified',
        shaderAddEligible(plan,node)&&node.materialControls?.textureCombination?.name==='Add'&&node.authoringTextureLayers?
            (plan.nativeMaterialSelection?'Exact initial native Add fragment selected; runtime overrides/global colorScale unverified':'Pinned native-family Add equation candidate enabled; per-node binding/global colorScale unverified'):'Prepared multi-texture path is experimental', 'Active texture binding');
    if (ownDrawCandidate) {
      const blend=plan.nativeBlend?nativeBlendSelection(plan,node):null;
      add('blend-equation',blend?'implemented-subset':'native-equation-unverified',
        blend?'Pinned FUNC_ADD and native RGB/alpha factors, state '+blend.id:(node.materialControls?.blend?.name??'Unknown'),
        blend?'Native constructor/state transfer, Begin and GL factor table; not a live GPU capture':'Legacy preset; native path not enabled');
      if(plan.nativeBlend)add('global-color-scale','native-equation-unverified',
        'Constructor default RGBA 1 verified; wrapper setAlpha writes A; invocation values/timing unobserved',
        'Pinned Animation constructor, Draw pixel buffer and BishamonData::setAlpha');
    }
    if (xml && xml.Basic_Basic_SortPriority !== '0.5' && node.typeId !== 0)
      add('source-ordering', 'missing', `Priority ${xml.Basic_Basic_SortPriority} is not applied`, 'Matched authoring; geometric overlap/visibility not established');
    nodes.push({index:node.index, type:node.type, parentIndex:node.parentIndex, ownDrawCandidate, findings});
  }
  // Include non-rendered parents as relevant only if they feed a candidate descendant.
  const relevant = new Set(nodes.filter(row => row.ownDrawCandidate).map(row => row.index));
  for (const index of [...relevant]) {
    let parent = nodes[index].parentIndex;
    while (parent !== null) { relevant.add(parent); parent = nodes[parent].parentIndex; }
  }
  return nodes.map(row => ({...row, feedsDrawCandidate: relevant.has(row.index)}));
}

export function buildCoverage(sourceAudit, readPlan, THREE) {
  return sourceAudit.skills.map(skill => {
    const plan = readPlan(skill);
    const effects = plan.effects.map(effect => {
      const source = skill.effects.find(row => row.name === effect.name);
      if (!source || source.binarySha256 !== effect.sha256) throw Error('Source/plan effect mismatch');
      const nodes = classifyEffect(plan, effect, source);
      const built = instances(effect, plan.seed, plan.effectHorizon);
      const evaluate = createTransformEvaluator(THREE, effect, built);
      const wrappers=plan.members.filter(member=>plan.effects[member.effect]===effect);
      const locatorEnabled=!!plan.nullLocator&&wrappers.length>0&&wrappers.every(member=>member.rotation.every(v=>v===0)&&member.scalePercent>0);
      const active = new Set();
      for (let frame=0; frame<=plan.effectHorizon; frame++) {
        const states = evaluate(frame, !!plan.sourceInheritance, !!plan.sourceAppearance, locatorEnabled, locatorEnabled&&!!plan.nativeNullLocator);
        for (let i=0;i<built.length;i++) {
          const item=built[i];
          if (nodes[item.node].ownDrawCandidate && frame>=item.birth && frame<item.birth+item.life && states[i].alpha>1e-6)
            active.add(item.node);
        }
      }
      return {name:effect.name, binarySha256:effect.sha256, authoring:source.authoring,
        memberReferences:plan.members.filter(member=>plan.effects[member.effect].name===effect.name).length,
        nodes:nodes.map(row=>({...row, sampledPositiveAlpha:active.has(row.index)}))};
    });
    const matrix = {}, counted = new Map();
    for (const effect of effects) for (const node of effect.nodes) for (const finding of node.findings) {
      const key=finding.capability+' / '+finding.status;
      const row=matrix[key]??={capability:finding.capability,status:finding.status,nodes:0,drawCandidates:0,feedsDrawCandidates:0,sampledPositiveAlpha:0,examples:[]};
      const identities=counted.get(key)??new Set(), identity=effect.name+':'+node.index;
      if(!identities.has(identity)) {
        row.nodes++;row.drawCandidates+=Number(node.ownDrawCandidate);row.feedsDrawCandidates+=Number(node.feedsDrawCandidate);row.sampledPositiveAlpha+=Number(node.sampledPositiveAlpha);
        identities.add(identity);counted.set(key,identities);
      }
      row.examples.push({effect:effect.name,node:node.index,detail:finding.detail});
    }
    return {name:skill.name,sourceId:skill.sourceId,plan:skill.plan,planSha256:skill.planSha256,
      effects,matrix:Object.values(matrix)};
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [input,output]=process.argv.slice(2);
  if (!input||!output||![input,output].every(file=>path.resolve(file).startsWith(stage))) throw Error('Usage: node tools/audit_renderer_coverage.mjs tools/data/.../source-features.json tools/data/.../coverage.json');
  const sourceBytes=fs.readFileSync(input),sourceAudit=JSON.parse(sourceBytes),playerHash=hash(fs.readFileSync('tools/original_effect_player.mjs'));
  if (sourceAudit.playerSha256!==playerHash) throw Error('Source audit player hash is stale');
  const THREE={};vm.runInNewContext(fs.readFileSync('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js','utf8'),{exports:THREE,module:{exports:THREE},console});
  const skills=buildCoverage(sourceAudit,skill=>{
    if(!path.resolve(skill.plan).startsWith(stage))throw Error('Plan outside research stage');
    const bytes=fs.readFileSync(skill.plan);if(hash(bytes)!==skill.planSha256)throw Error('Stale plan');return JSON.parse(bytes);
  },THREE);
  const result={schemaVersion:1,playerSha256:playerHash,sourceAuditSha256:hash(sourceBytes),
    auditToolSha256:hash(fs.readFileSync('tools/audit_renderer_coverage.mjs')),skills,approved:false,
    limits:['Targeted three-skill corpus, not an arbitrary-FFBE support claim.',
      'Node counts are not missing-image counts; one node may need several capabilities.',
      'Positive alpha is sampled on the current evaluator over each plan horizon; it does not prove native pixel visibility.',
      'Source audit legacy finding descriptions are not reused as current capability statuses.',
      'Authoring controls are separate from verified binary/M3R fields; missing controls remain unknown.']};
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  for(const skill of skills)console.log(skill.name,JSON.stringify(skill.matrix.map(row=>({capability:row.capability,status:row.status,nodes:row.nodes,drawCandidates:row.drawCandidates,feedsDrawCandidates:row.feedsDrawCandidates,sampledPositiveAlpha:row.sampledPositiveAlpha}))));
}
