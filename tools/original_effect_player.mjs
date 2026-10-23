// Offline research playback. Policies below are explicit hypotheses, not FFBE fidelity claims.
export const POLICIES = [
  'Constant generation interpreted as duration/interval batches; endless/repeated generator modes not reconstructed.',
  'Curve Frame interpreted as normalized particle lifetime; standard Hermite interpolation is experimental.',
  'Optional authoring inheritance evaluates rate-zero alpha and birth-time parent translation. Nonzero alpha rates, rotation/scale exclusions, fields and expiration rules retain explicit legacy assumptions; source-less effects are unchanged.',
  'Seeded centered ranges and discrete Newton integration are preview policies.',
  'SemiAdd uses WebGL additive blending; Semitrans uses normal alpha blending. Original equations are unverified.',
  'Distortion is enabled only for plans carrying decoded experimental fields. Midpoint subtraction, color strength and UV order are shader hypotheses; native fidelity remains unverified.',
  'Model vertex colors are retained in data but not applied; native vertex-color control is unresolved.',
  'Textured Quad/Particle geometry currently uses unit planes with inherited XYZ transforms. Particle billboarding is missing; native facing/roll/deformation controls remain unresolved. Untextured particle geometry is unverified and may be explicitly withheld.',
  'Optional source appearance selects Constant or Curve explicitly. Dormant keys stay inactive. Unresolved color selectors retain the labeled legacy preview; RGB random ranges and parent tint remain unsupported.',
  'Optional Basic single-texture UV playback uses the same inverse texture TRS/pivot matrix as layered materials. Source values/modes are checked; the native matrix convention remains experimental. Unsupported mapping retains the labeled legacy path.',
  'Body approach/return is an explicit preview adaptation; damage is a source-tick marker, not game execution.',
  'Supplemented Add nodes sample two independent UV transforms and constant layer colors. Clamped RGBA addition and inverse pivot transforms are experimental shader policies.',
  'Distortion uses RGB layer controls; separate per-layer alpha controls are unresolved. The quad texture-2 speed curve slot is a candidate layout without a nonempty matching authoring example.',
  'Optional screen fitting is an explicit arena-composition adaptation for static screen-anchored effects, not a decoded original-game coordinate mapping.',
  'Supported distortion quads can evaluate constant source RGBA per corner. Animated/randomized corner colors remain unsupported by this experiment.',
  'Emission shapes are checked when matching authoring metadata is supplied. Known non-point shapes are withheld; unsupplemented source shapes remain unverified.',
];
export function quadCornerColors(source) {
  if(source.mode!=='Constant')throw Error('Unsupported quad color mode');
  const names=['leftTop','rightTop','leftBottom','rightBottom'];
  if(names.some(n=>source.corners[n].range.some(v=>v!==0)))throw Error('Random quad colors are unsupported');
  return names.map(n=>[...source.corners[source.flat?'leftTop':n].value]);
}
export function isUntexturedParticle(node) {
  return node.typeId===3&&!node.resourceBindings.texture1&&!node.resourceBindings.texture2;
}

// Reviewed game presentation, independent of original damage/chaining metadata.
export function presentationPose(frame, home, target, bodyFrames, presentation) {
  const {movement,approachFrames,returnFrames,targetOffsetX}=presentation;
  if(!['dash','stationary'].includes(movement))throw Error('Unsupported presentation movement');
  if(!(bodyFrames>0&&returnFrames>0&&approachFrames>=0))throw Error('Invalid presentation duration');
  if(movement==='dash'&&approachFrames===0)throw Error('Dash requires approach frames');
  const start=movement==='stationary'?0:approachFrames,skillFrame=frame-start;
  const attack=movement==='stationary'?home:{x:target.x+targetOffsetX,y:target.y};
  const interpolate=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  if(frame<start)return {actor:interpolate(home,attack,Math.max(0,frame/start)),motion:'move',motionTime:frame,skillFrame};
  if(skillFrame<bodyFrames)return {actor:{...attack},motion:'body',motionTime:skillFrame,skillFrame};
  if(movement==='dash'&&skillFrame<bodyFrames+returnFrames)return {actor:interpolate(attack,home,(skillFrame-bodyFrames)/returnFrames),motion:'move',motionTime:skillFrame-bodyFrames,skillFrame};
  return {actor:{...home},motion:'idle',motionTime:frame,skillFrame};
}

export function presentationMembers(members, targetKeys, scope) {
  if(!['single_enemy','all_enemies'].includes(scope)||!targetKeys.length)throw Error('Unsupported presentation scope');
  return members.flatMap(member=>scope==='all_enemies'&&member.anchor==='target'
    ?targetKeys.map(targetKey=>({...member,targetKey})): [{...member}]);
}

export function presentationAnchor(member, actor, enemies, selected) {
  if(member.anchor==='screen')return {x:0,y:0};
  let point;
  if(member.anchor==='caster')point=actor;
  else if(member.anchor==='target-group') {
    const points=Object.values(enemies);
    if(!points.length)throw Error('Empty target group');
    point={x:points.reduce((s,p)=>s+p.x,0)/points.length,y:points.reduce((s,p)=>s+p.y,0)/points.length};
  } else if(member.anchor==='target')point=enemies[member.targetKey??selected];
  else throw Error('Unsupported presentation anchor: '+member.anchor);
  if(!point)throw Error('Unknown presentation target');
  return {x:point.x-500,y:400-point.y+50};
}

export function attachConstantQuadColors(THREE,geometry,material,source) {
  if(geometry.attributes.position.count!==4)throw Error('Quad colors require four vertices');
  geometry.setAttribute('sourceCornerColor',new THREE.Float32BufferAttribute(quadCornerColors(source).flat(),4));
  const enabled={value:true},previous=material.onBeforeCompile.bind(material);
  material.userData.quadColorsEnabled=enabled;
  material.defines={...material.defines,ORIGINAL_QUAD_COLORS:1};
  material.onBeforeCompile=shader=>{
    previous(shader);shader.uniforms.useQuadColors=enabled;
    shader.vertexShader='attribute vec4 sourceCornerColor;\nvarying vec4 sourceCornerRgba;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\nsourceCornerRgba=sourceCornerColor;');
    shader.fragmentShader='varying vec4 sourceCornerRgba;\nuniform bool useQuadColors;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor*=useQuadColors?sourceCornerRgba:vec4(1.0);');
  };
  material.needsUpdate=true;
}
export function coverScreenBounds(bounds, rectangle) {
  if (!(bounds.width>0&&bounds.height>0&&rectangle.width>0&&rectangle.height>0)) throw Error('Invalid screen effect bounds');
  const scale=Math.max(rectangle.width/bounds.width,rectangle.height/bounds.height);
  return {scale,x:rectangle.x+rectangle.width/2-bounds.centerX*scale,
    y:rectangle.y+rectangle.height/2-bounds.centerY*scale};
}
export function displacementUv(uv, rg, midpoint, strength) {
  return uv.map((v,i)=>v+(rg[i]-midpoint[i]/255)*strength[i]);
}
// Column-major inverse 2D texture TRS; used identically by the shader and tests.
export function textureMatrix(scale, translation, degrees, pivot) {
  if (Math.abs(scale[0]) < 1e-8 || Math.abs(scale[1]) < 1e-8) throw Error('Singular texture scale');
  if (degrees[0] || degrees[1]) throw Error('Only Z texture rotation is supported');
  const angle=-degrees[2]*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const a=c/scale[0],b=s/scale[1],d=-s/scale[0],e=c/scale[1];
  const x=translation[0]+pivot[0],y=translation[1]+pivot[1];
  return [a,b,0,d,e,0,pivot[0]-a*x-d*y,pivot[1]-b*x-e*y,1];
}

function layeredMaterial(THREE, material, secondMap, colors, distortion=null) {
  material.defines={...material.defines,ORIGINAL_TEXTURE_COMBINATION:distortion?6:2};
  const uniforms={secondMap:{value:secondMap},layer1Uv:{value:new THREE.Matrix3()},layer2Uv:{value:new THREE.Matrix3()},
    layer1Tint:{value:new THREE.Vector4(...colors[0])},layer2Tint:{value:new THREE.Vector4(...colors[1])},useSecondLayer:{value:true},
    distortionMidpoint:{value:new THREE.Vector2(...(distortion?.midpoint.slice(0,2).map(v=>v/255)??[0,0]))}};
  material.userData.layers=uniforms;
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='varying vec2 sourceUv;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nsourceUv=uv;');
    shader.fragmentShader='varying vec2 sourceUv;\nuniform sampler2D secondMap;\nuniform mat3 layer1Uv,layer2Uv;\nuniform vec4 layer1Tint,layer2Tint;\nuniform bool useSecondLayer;\nuniform vec2 distortionMidpoint;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',distortion?`
      vec2 maskUv=(layer2Uv*vec3(sourceUv,1.0)).xy;
      vec2 displacement=(texture2D(secondMap,maskUv).rg-distortionMidpoint)*layer2Tint.rg;
      vec2 firstUv=(layer1Uv*vec3(sourceUv,1.0)).xy;
      diffuseColor*=texture2D(map,firstUv+displacement)*layer1Tint;
    `:`
      vec4 firstLayer=texture2D(map,(layer1Uv*vec3(sourceUv,1.0)).xy)*layer1Tint;
      vec4 secondLayer=texture2D(secondMap,(layer2Uv*vec3(sourceUv,1.0)).xy)*layer2Tint;
      diffuseColor*=useSecondLayer?clamp(firstLayer+secondLayer,0.0,1.0):firstLayer;
    `);
  };
  // Different fragment programs must not share THREE's callback-based cache key.
  material.customProgramCacheKey=()=>distortion?'original-distortion-v1':'original-two-layer-add-v1';
}
export function scalar(keys, time) {
  if (!keys.length) throw Error('Cannot evaluate an empty curve');
  if (time <= keys[0].frame) return keys[0].value;
  const last = keys.at(-1); if (time >= last.frame) return last.value;
  const i = keys.findIndex(k => k.frame > time), a = keys[i - 1], b = keys[i], dt = b.frame - a.frame;
  const u = (time - a.frame) / dt;
  if (a.type === 'Constant') return a.value;
  if (a.type === 'Linear') return a.value + (b.value - a.value) * u;
  if (!['Spline', 'BreakSpline'].includes(a.type)) throw Error('Unknown curve interpolation');
  return (2*u**3-3*u*u+1)*a.value + (u**3-2*u*u+u)*dt*a.slopeRight
    + (-2*u**3+3*u*u)*b.value + (u**3-u*u)*dt*b.slopeLeft;
}
export function vectorCurve(curve, time) {
  return [0,1,2].map(axis => scalar(curve.keys.map(k => ({frame:k.frame,type:k.types[axis],
    value:k.value[axis],slopeLeft:k.slopeLeft[axis],slopeRight:k.slopeRight[axis]})),time));
}
export function localAlpha(node, time, useSource=false) {
  if(!useSource)return (node.alphaCurve.keys.length?scalar(node.alphaCurve.keys,time):1)*(node.materialAlpha?.value??1);
  const channel=node.appearance?.alpha;
  if(channel?.mode==='Constant')return channel.value;
  if(channel?.mode==='Curve')return scalar(node.alphaCurve.keys,time);
  throw Error('Missing or unknown prepared alpha mode');
}
export function localColor(node, time, useSource=false) {
  const channel=useSource?node.appearance?.color:null;
  if(useSource&&!channel)throw Error('Missing prepared color mode');
  if(channel?.supported&&channel.domain==='center') {
    if(channel.mode==='Constant')return [...channel.value];
    if(channel.mode==='Curve')return vectorCurve(node.vectorCurves.centerColor,time);
    throw Error('Unknown prepared color mode');
  }
  return node.vectorCurves.centerColor?.keys.length?vectorCurve(node.vectorCurves.centerColor,time):node.initialColor;
}
export function instances(effect, seed = 1, horizon = 180) {
  let state = seed >>> 0; const random = () => ((state = (Math.imul(1664525,state)+1013904223)>>>0)/4294967296);
  const output = [];
  function spawn(index, parent, parentBirth, parentLife) {
    const node = effect.nodes[index], g = node.generation;
    if (g.repeatCount !== 1) throw Error('Repeated generation is not supported in this experiment');
    if (g.duration > 1 && !(g.interval > 0)) throw Error('Generation interval has not been decoded for node '+index);
    const interval = g.duration <= 1 ? 1 : g.interval;
    const duration = Math.min(g.duration, parentLife || horizon);
    for(let offset=0;offset<duration;offset+=interval) for(let batch=0;batch<g.count;batch++) {
      const birth=parentBirth+g.start+offset+Math.floor(random()*(g.startRange+1));
      if(birth>horizon) continue;
      if(output.length>=4096) throw Error('Research instance limit exceeded');
      const sampled={};
      for(const [domain,groups] of Object.entries(node.staticVectors)) {
        sampled[domain]={};for(const [group,p] of Object.entries(groups)) {
          sampled[domain][group]={};for(const term of ['value','speed','acceleration'])
            sampled[domain][group][term]=p[term+'Initial'].map((v,i)=>v+(random()*2-1)*p[term+'Range'][i]);
        }
      }
      const life=node.lifeParameter+Math.floor(random()*(node.lifeRangeParameter+1));
      const instance={id:output.length,node:index,parent,birth,life:life||horizon,sampled};output.push(instance);
      for(const child of node.children) spawn(child,instance.id,birth,instance.life);
    }
  }
  spawn(0,null,0,horizon);return output;
}
export function parameters(node, instance, domain, group, age, explicitMode) {
  const p=instance.sampled[domain][group];
  const channel=domain==='transform'?group+'Value':domain+group[0].toUpperCase()+group.slice(1)+'Value';
  const curve=node.vectorCurves[channel];
  const speedCurve=node.vectorCurves[channel.replace(/Value$/,'Speed')];
  const modeName=domain==='transform'?group:domain+group[0].toUpperCase()+group.slice(1);
  const mode=explicitMode??node.authoringTextureLayers?.[domain]?.motionModes[group]??node.motionModes[modeName]?.name;
  let value=p.value.map((v,i)=>v+p.speed[i]*age+p.acceleration[i]*age*(age+1)/2);
  if(mode==='CurveValue' && curve?.keys.length) value=vectorCurve(curve,age/instance.life);
  else if(mode==='CurveSpeed' && speedCurve?.keys.length) {
    value=[...p.value];for(let f=0;f<Math.floor(age);f++) {
      const velocity=vectorCurve(speedCurve,f/instance.life);value=value.map((v,i)=>v+velocity[i]);
    }
  } else if(mode==='Constant') value=[...p.value];
  if(group==='scale'&&domain==='transform'&&node.uniformScale) value=[value[0],value[0],value[0]];
  return value;
}
export function updateBasicTextureMap(map,node,item,age,useSource=false) {
  if(!map||!item.sampled.texture1)throw Error('Missing single-texture input');
  const supported=useSource&&node.basicTextureMapping?.supported;
  if(supported){
    const modes=node.basicTextureMapping.motionModes;
    const sample=group=>parameters(node,item,'texture1',group,age,modes[group]);
    map.matrixAutoUpdate=false;
    map.matrix.fromArray(textureMatrix(sample('scale'),sample('translation'),sample('rotation'),node.texturePivots.texture1));
  }else{
    map.matrixAutoUpdate=true;
    const scale=parameters(node,item,'texture1','scale',age),translation=parameters(node,item,'texture1','translation',age);
    map.repeat.set(1/(scale[0]||1),1/(scale[1]||1));map.offset.set(-translation[0]/(scale[0]||1),-translation[1]/(scale[1]||1));
    map.updateMatrix();
  }
}
export function inheritanceLimitations(source) {
  if(!source)return ['inheritance metadata unavailable; legacy live TRS and multiplied alpha retained'];
  const issues=[];
  if(source.matrix!=='On'||!['On','OnGenerateTime'].includes(source.translation)||source.rotation!=='On'||source.scale!=='On')
    issues.push('unsupported parent transform combination; legacy live TRS retained');
  if(source.alphaRate!==0)issues.push('nonzero parent alpha influence remains unverified; legacy multiplication retained');
  if(source.colorRate!==0)issues.push('parent color influence remains unsupported');
  return issues;
}

// Pure frame evaluation: snapshots are computed at actual instance birth, never
// captured on the first rendered frame. Fractional births and reverse seeking
// therefore use the same parent state as sequential playback.
export function createTransformEvaluator(THREE,effect,built) {
  for(let i=0;i<built.length;i++)if(built[i].parent!==null&&(!Number.isInteger(built[i].parent)||built[i].parent<0||built[i].parent>=i))throw Error('Invalid instance hierarchy');
  return (frame,useSource=false,useAppearance=false)=>{
    if(!Number.isFinite(frame))throw Error('Invalid effect frame');
    const cache=new Map();
    function resolve(index,time){
      const key=index+':'+time;
      if(cache.has(key))return cache.get(key);
      const item=built[index],node=effect.nodes[item.node],age=Math.max(0,Math.min(item.life,time-item.birth));
      const position=new THREE.Vector3(...parameters(node,item,'transform','translation',age));
      const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(...parameters(node,item,'transform','rotation',age).map(v=>v*Math.PI/180)));
      const scale=new THREE.Vector3(...parameters(node,item,'transform','scale',age));
      const matrix=new THREE.Matrix4().compose(position,rotation,scale);
      const source=useSource?node.authoringInheritance:null;
      const parent=item.parent===null?null:resolve(item.parent,time);
      if(parent){
        let inherited=parent.matrix;
        if(source?.matrix==='On'&&source.translation==='OnGenerateTime'&&source.rotation==='On'&&source.scale==='On'){
          const born=resolve(item.parent,item.birth).matrix;
          inherited=parent.matrix.clone();
          inherited.elements[12]=born.elements[12];inherited.elements[13]=born.elements[13];inherited.elements[14]=born.elements[14];
        }
        matrix.premultiply(inherited);
      }
      let alpha=localAlpha(node,age/item.life,useAppearance);
      if(parent&&source?.alphaRate!==0)alpha*=parent.alpha;
      const result={matrix,alpha,age};cache.set(key,result);return result;
    }
    return built.map((_,i)=>resolve(i,frame));
  };
}
export async function createEffectPlayer(THREE, scene, plan) {
  const loader=new THREE.TextureLoader(), textureCache=new Map(), geometries=new Map(), issues=new Set();
  async function texture(url) {
    if(!textureCache.has(url)) textureCache.set(url,new Promise((resolve,reject)=>loader.load(url,resolve,undefined,reject)));
    return (await textureCache.get(url)).clone();
  }
  for(const effect of plan.effects) for(const name of Object.keys(effect.textures)) await texture(effect.textures[name]);
  const active=[];
  for(const member of plan.members) {
    const effect=plan.effects[member.effect], built=instances(effect,plan.seed,plan.effectHorizon);
    if(plan.sourceAppearance)for(const node of effect.nodes){
      if(!node.appearance)throw Error('Missing prepared source appearance');
      for(const limitation of node.appearance.limitations)issues.add(effect.name+': node '+node.index+' '+limitation);
    }
    if(plan.basicTextureUv)for(const node of effect.nodes){
      const binding=node.resourceBindings;
      if(binding.texture1&&!binding.texture2&&!node.basicTextureMapping)throw Error('Missing prepared Basic texture mapping');
      for(const limitation of node.basicTextureMapping?.limitations??[])issues.add(effect.name+': node '+node.index+' '+limitation+'; legacy UV preview retained');
    }
    if(plan.sourceInheritance)for(const node of effect.nodes)if(node.parentIndex!==null)
      for(const limitation of inheritanceLimitations(node.authoringInheritance))issues.add(effect.name+': '+limitation);
    if(member.rawGroupFields?.slice(-2).some(v=>Number(v)!==0))issues.add(effect.name+': nonzero source member fields '+member.rawGroupFields.slice(-2).join(', ')+' retained but not evaluated; placement remains an adaptation');
    const root=new THREE.Group();scene.add(root);
    const runtime=[];
    for(const item of built) {
      const node=effect.nodes[item.node], group=new THREE.Group();root.add(group);
      const unsupportedEmission=!!(node.authoringEmissionShape&&node.authoringEmissionShape!=='Point')
        ||(item.parent!==null&&runtime[item.parent].unsupportedEmission);
      if(node.authoringEmissionShape&&node.authoringEmissionShape!=='Point')issues.add(effect.name+': node '+node.index+' emission shape '+node.authoringEmissionShape+' unsupported; source node withheld, not replaced with point emission');
      if(isUntexturedParticle(node))issues.add(effect.name+': untextured particle '+node.index+' has unverified primitive rendering; '+(plan.withholdUntexturedParticles?'withheld by default':'legacy white-plane assumption enabled'));
      let mesh=null;
      if(node.typeId!==0) {
        const combination=node.materialControls?.textureCombination?.name;
        if(combination==='Distortion'&&!node.distortionFields) issues.add(effect.name+': distortion node '+node.index+' withheld');
        else {
          const model=node.resourceBindings.model;
          let geometry;
          if(model) {
            const key=effect.name+'/'+model.name;
            if(!geometries.has(key)) {
              const data=effect.meshes[model.name];if(!data) throw Error('Missing prepared model '+model.name);
              const g=new THREE.BufferGeometry();
              g.setAttribute('position',new THREE.Float32BufferAttribute(data.vertices.flatMap(v=>v.position),3));
              g.setAttribute('normal',new THREE.Float32BufferAttribute(data.vertices.flatMap(v=>v.normal),3));
              g.setAttribute('uv',new THREE.Float32BufferAttribute(data.vertices.flatMap(v=>v.uv),2));
              g.setIndex(data.triangles.flat());geometries.set(key,g);
            } geometry=geometries.get(key);
          } else geometry=new THREE.PlaneBufferGeometry(1,1);
          const binding=node.resourceBindings.texture1;
          const map=binding?await texture(effect.textures[binding.name]):null;
          if(map) {
            map.flipY=false;const address=node.materialControls?.texture1Address?.name;
            map.wrapS=map.wrapT=address==='Mirror'?THREE.MirroredRepeatWrapping:address==='Clamp'?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;
            map.needsUpdate=true;
          }
          const material=new THREE.MeshBasicMaterial({map,color:0xffffff,transparent:true,depthWrite:false,depthTest:false,
            side:THREE.DoubleSide,blending:node.materialControls?.blend?.name==='Semitrans'?THREE.NormalBlending:THREE.AdditiveBlending});
          mesh=new THREE.Mesh(geometry,material);group.add(mesh);
          if(node.resourceBindings.texture2) {
            if((combination==='Add'&&node.authoringTextureLayers)||(combination==='Distortion'&&node.distortionFields)) {
              const second=await texture(effect.textures[node.resourceBindings.texture2.name]);second.flipY=false;
              const address=node.materialControls.texture2Address.name;
              second.wrapS=second.wrapT=address==='Mirror'?THREE.MirroredRepeatWrapping:address==='Clamp'?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;second.needsUpdate=true;
              let state=(plan.seed+item.id*2654435761)>>>0;
              const random=()=>((state=(Math.imul(1664525,state)+1013904223)>>>0)/4294967296)*2-1;
              const settings=node.authoringTextureLayers??node.distortionFields.layers;
              const colors=['texture1','texture2'].map(key=>{const p=settings[key];
                return [...p.rgbInitial.map((v,i)=>v+random()*p.rgbRange[i]),(p.alphaInitial??1)+random()*(p.alphaRange??0)];});
              layeredMaterial(THREE,material,second,colors,node.distortionFields);
              if(node.distortionFields)issues.add(effect.name+': node '+node.index+' uses experimental distortion; quad UV speed layout and layer alpha remain unverified');
            } else issues.add(effect.name+': texture 2 not evaluated on node '+node.index);
          }
          if(node.quadColors)attachConstantQuadColors(THREE,geometry,material,node.quadColors);
        }
      }
      runtime.push({...item,group,mesh,unsupportedEmission});
    }
    active.push({member,effect,built:runtime,root,evaluate:createTransformEvaluator(THREE,effect,built)});
  }
  let distortionEnabled=true;
  let hiddenSourceNode=null;
  let legacyWhitePlanesEnabled=!plan.withholdUntexturedParticles;
  let screenFitEnabled=!!plan.fitScreenToArena;
  let inheritanceEnabled=!!plan.sourceInheritance;
  let appearanceEnabled=!!plan.sourceAppearance;
  let basicUvEnabled=!!plan.basicTextureUv;
  return {issues:[...issues], instanceCount:active.reduce((s,e)=>s+e.built.length,0),
    setDistortion(enabled) {distortionEnabled=enabled;},
    setDiagnosticHiddenNode(key) {hiddenSourceNode=key;},
    setLegacyWhitePlanes(enabled) {legacyWhitePlanesEnabled=enabled;},
    setScreenFit(enabled) {screenFitEnabled=enabled;},
    setSourceInheritance(enabled) {inheritanceEnabled=!!plan.sourceInheritance&&enabled;},
    setSourceAppearance(enabled) {appearanceEnabled=!!plan.sourceAppearance&&enabled;},
    setBasicTextureUv(enabled) {basicUvEnabled=!!plan.basicTextureUv&&enabled;},
    setQuadColors(enabled) {for(const entry of active)for(const item of entry.built)if(item.mesh?.material.userData.quadColorsEnabled)item.mesh.material.userData.quadColorsEnabled.value=enabled;},
    setTextureLayers(enabled) {for(const entry of active)for(const item of entry.built)if(item.mesh?.material.userData.layers)item.mesh.material.userData.layers.useSecondLayer.value=enabled;},
    update(frame,anchor,screenRectangle) {
      for(const entry of active) {
        const time=frame-entry.member.startFrame;entry.root.visible=time>=0;
        const point=anchor(entry.member);entry.root.position.set(point.x,point.y,0);
        const scale=entry.member.scalePercent/100;entry.root.scale.set(scale,scale,scale);
        entry.root.rotation.set(...entry.member.rotation.map(v=>v*Math.PI/180));
        const transforms=entry.evaluate(time,inheritanceEnabled,appearanceEnabled);
        for(const [index,item] of entry.built.entries()) {
          const node=entry.effect.nodes[item.node],{age,matrix,alpha}=transforms[index];
          const color=localColor(node,age/item.life,appearanceEnabled);
          item.group.matrixAutoUpdate=false;item.group.matrix.copy(matrix);item.group.matrixWorldNeedsUpdate=true;
          item.group.visible=time>=item.birth&&time<item.birth+item.life&&(!node.distortionFields||distortionEnabled)&&hiddenSourceNode!==entry.effect.name+':'+node.index&&(!isUntexturedParticle(node)||legacyWhitePlanesEnabled)&&!item.unsupportedEmission;
          if(item.mesh) {
            item.mesh.material.opacity=Math.max(0,Math.min(1,alpha));item.mesh.material.color.setRGB(...(node.quadColors?[1,1,1]:color));
            const map=item.mesh.material.map;
            const layers=item.mesh.material.userData.layers;
            if(layers&&node.distortionFields)for(const key of ['texture1','texture2']) {
              const settings=node.distortionFields.layers[key];
              if(settings.colorMode==='CurveValue'&&settings.colorCurve.keys.length) {
                const rgb=vectorCurve(settings.colorCurve,age/item.life),uniform=layers[key==='texture1'?'layer1Tint':'layer2Tint'];
                uniform.value.set(...rgb,1);
              }
            }
            if(layers)for(const key of ['texture1','texture2']) {
              const matrix=textureMatrix(parameters(node,item,key,'scale',age),parameters(node,item,key,'translation',age),parameters(node,item,key,'rotation',age),node.texturePivots[key]);
              layers[key==='texture1'?'layer1Uv':'layer2Uv'].value.fromArray(matrix);
            }
            if(map&&item.sampled.texture1&&!layers)updateBasicTextureMap(map,node,item,age,basicUvEnabled);
          }
        }
        if(screenFitEnabled&&entry.member.anchor==='screen') {
          if(!screenRectangle)throw Error('Screen fitting requires arena coordinates');
          if(!entry.screenBounds) {
            entry.root.updateMatrixWorld(true);
            const box=new THREE.Box3().setFromObject(entry.root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
            entry.screenBounds={width:size.x,height:size.y,centerX:center.x,centerY:center.y};
          }
          const fit=coverScreenBounds(entry.screenBounds,screenRectangle);
          entry.root.scale.multiplyScalar(fit.scale);entry.root.position.set(fit.x,fit.y,0);
        }
      }
    }};
}
// Isolated preview compositor. All source formats remain outside the game.
export function createSceneSnapshot(THREE, scene, canvas) {
  const snapshot=new THREE.CanvasTexture(canvas);
  const background=new THREE.Mesh(new THREE.PlaneBufferGeometry(canvas.width,canvas.height),
    new THREE.MeshBasicMaterial({map:snapshot,depthWrite:false,depthTest:false}));
  background.position.z=-3000;background.renderOrder=-10000;scene.add(background);
  return {snapshot,background};
}

export function composeSceneLayer(layer, paint, enabled) {
  layer.background.visible=enabled;
  if(enabled)layer.snapshot.needsUpdate=true;
  layer.renderer.render(layer.scene,layer.camera);
  paint.drawImage(layer.gpu,0,0);
}

export function verifySceneBlending(THREE) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=16;
  const paint=canvas.getContext('2d',{willReadFrequently:true});
  const gpu=document.createElement('canvas');gpu.width=gpu.height=16;
  const renderer=new THREE.WebGLRenderer({canvas:gpu,alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
  renderer.setClearColor(0,0);const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-8,8,8,-8,.1,5000);
  camera.position.z=1000;camera.lookAt(new THREE.Vector3());
  const snapshot=createSceneSnapshot(THREE,scene,canvas);
  const material=new THREE.MeshBasicMaterial({color:new THREE.Color(64/255,32/255,16/255),opacity:.5,
    transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending});
  const effect=new THREE.Mesh(new THREE.PlaneBufferGeometry(16,16),material);scene.add(effect);
  const layer={gpu,renderer,scene,camera,...snapshot},checks=[];
  for(const [name,visible,blend,expected]of [
    ['background identity',false,THREE.AdditiveBlending,[32,64,96,255]],
    ['additive over scene',true,THREE.AdditiveBlending,[64,80,104,255]],
    ['alpha over scene',true,THREE.NormalBlending,[48,48,56,255]],
  ]) {
    paint.fillStyle='rgb(32,64,96)';paint.fillRect(0,0,16,16);
    effect.visible=visible;material.blending=blend;material.needsUpdate=true;
    composeSceneLayer(layer,paint,true);
    const actual=[...paint.getImageData(8,8,1,1).data];
    checks.push({name,expected,actual,passed:actual.every((v,i)=>Math.abs(v-expected[i])<=2)});
  }
  effect.visible=true;material.blending=THREE.AdditiveBlending;material.opacity=1;material.color.setRGB(1,1,1);
  const corners=Object.fromEntries(['leftTop','rightTop','leftBottom','rightBottom'].map((name,i)=>[name,
    {value:i<2?[0,0,0,1]:[1,1,1,1],range:[0,0,0,0]}]));
  attachConstantQuadColors(THREE,effect.geometry,material,{mode:'Constant',flat:false,corners});
  for(const channel of ['RGB','alpha']) {
    if(channel==='alpha') {
      effect.geometry.setAttribute('sourceCornerColor',new THREE.Float32BufferAttribute([
        1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1],4));
    }
    paint.fillStyle='black';paint.fillRect(0,0,16,16);composeSceneLayer(layer,paint,true);
    for(const [name,y,value]of [['top',1,24],['bottom',14,231]]) {
      const actual=[...paint.getImageData(8,y,1,1).data],expected=[value,value,value,255];
      checks.push({name:'quad '+channel+' '+name,expected,actual,passed:actual.every((v,i)=>Math.abs(v-expected[i])<=2)});
    }
  }
  material.userData.quadColorsEnabled.value=false;paint.fillStyle='black';paint.fillRect(0,0,16,16);
  composeSceneLayer(layer,paint,true);
  const bypassActual=[...paint.getImageData(8,1,1,1).data];
  checks.push({name:'quad color bypass',expected:[255,255,255,255],actual:bypassActual,passed:bypassActual.every(v=>v===255)});
  for(const mesh of [effect,snapshot.background]){mesh.geometry.dispose();mesh.material.dispose();}
  snapshot.snapshot.dispose();renderer.dispose();
  if(checks.some(c=>!c.passed))throw Error('GPU scene blending check failed: '+JSON.stringify(checks));
  return checks;
}

