import {createEffectPlayer, presentationMembers, presentationAnchor, sourceRectanglePoint} from './originalEffectPlayer.mjs';
import {validateSceneManifest} from './sceneProfile.mjs';

const unitRectangle=(point,unit)=>({x:point.x-unit.pivotX*unit.frameWidth*unit.scale,y:point.y-unit.pivotY*unit.frameHeight*unit.scale,
  width:unit.frameWidth*unit.scale,height:unit.frameHeight*unit.scale});

/**
 * Source strike point relative to the caster's position for plans whose members are placed in
 * the caster's unit rectangle (FFBE anchor mode 3), or null. The most frequent placement wins
 * (the hit members). Hosts move the caster so this point lands on the target instead of using
 * a fixed approach offset: the original layout's distances are translated, not hard-coded.
 */
export function casterStrikeOffset(plan, casterUnit) {
  if(plan.rectanglePlacement?.coordinateSystem!=='ffbe-screen-api'||!casterUnit)return null;
  const counts=new Map();
  for(const member of plan.members)if(member.placement?.rectangle==='caster-unit'){
    const key=JSON.stringify([member.placement.axisModes,member.placement.offset]);
    counts.set(key,{placement:member.placement,count:(counts.get(key)?.count??0)+1});
  }
  if(!counts.size)return null;
  const {placement}=[...counts.values()].sort((a,b)=>b.count-a.count)[0];
  const u=plan.rectanglePlacement.unitsPerPixel,rect=unitRectangle({x:0,y:0},casterUnit);
  const point=sourceRectanglePoint(placement,{x:rect.x*u,y:rect.y*u,width:rect.width*u,height:rect.height*u},plan.rectanglePlacement.scatter);
  return {x:point.x/u,y:point.y/u};
}

export function scenePresentationAnchor(member, host, plan) {
  const selected = member.targetKey ?? Object.keys(host.targets)[0];
  const unit = host.units[selected];
  if(member.placement && plan.rectanglePlacement.coordinateSystem==='ffbe-screen-api') {
    const placement=member.placement, u=plan.rectanglePlacement.unitsPerPixel;
    if(!(Number.isFinite(u)&&u>0))throw Error('Explicit source coordinate scale required');
    let rect;
    if(placement.rectangle==='screen')rect={x:0,y:0,width:host.width,height:host.height};
    else if(placement.rectangle==='target-side')rect={...host.arena,
      x:host.arena.x+(plan.presentation.scope==='party'?host.arena.width/2:0),width:host.arena.width/2};
    else if(placement.rectangle==='target-unit') {
      const point=host.targets[selected];
      if(!point||!unit)throw Error('Explicit target footprint required');
      rect=unitRectangle(point,unit);
    } else if(placement.rectangle==='caster-unit') {
      if(!host.casterUnit)throw Error('Explicit caster footprint required');
      rect=unitRectangle(host.caster,host.casterUnit);
    } else throw Error('Unsupported source API rectangle');
    // Original rectangle axes and offsets are API screen coordinates (Y down).
    // Only the final placement result crosses into the player's Y-up world.
    const point=sourceRectanglePoint(placement,{x:rect.x*u,y:rect.y*u,width:rect.width*u,height:rect.height*u},plan.rectanglePlacement.scatter);
    return {x:point.x/u-host.width/2,y:host.height/2-point.y/u,unitsToPixels:1/u};
  }
  // Rectangle allegiance belongs to the host, not to the geometry player.
  // Its target-side convention uses the left half; friendly parties occupy the right half.
  const arena = plan.presentation.scope==='party' && member.placement?.rectangle==='target-side'
    ? {...host.arena,x:host.arena.x+host.arena.width/2} : host.arena;
  return presentationAnchor(member, host.caster, host.targets, selected, {
    ...plan.rectanglePlacement, arena, screen: {x:0,y:0,width:host.width,height:host.height},
    unit, unitScale: unit.scale,
  }, {width:host.width,height:host.height});
}

export function scenePresentationMembers(plan, keys) {
  if(plan.presentation.scope==='self'&&keys.length!==1)throw Error('Self presentation requires one actor');
  // The geometry player consumes cardinality, while the host owns allegiance.
  return presentationMembers(plan.members,keys,plan.presentation.scope==='self'?'single_enemy':plan.presentation.scope==='party'?'all_enemies':plan.presentation.scope);
}

/** Same prepared player as the research view, drawn directly into Phaser's framebuffer. */
export function createPreparedSceneBridge(scene, manifests) {
  const THREE = globalThis.THREE, phaser = scene.game.renderer;
  if (!THREE || !phaser.gl) throw Error('Prepared scene playback requires the bundled Three runtime and Phaser WebGL');
  const renderer = new THREE.WebGLRenderer({canvas:scene.game.canvas, context:phaser.gl,
    alpha:true, premultipliedAlpha:false});
  renderer.autoClear = false;
  const camera = new THREE.OrthographicCamera(-scene.scale.width/2,scene.scale.width/2,
    scene.scale.height/2,-scene.scale.height/2,.1,5000);
  camera.position.z = 1000;
  const variants = new Map(), errors = [], externs = [];
  let active = null, disposed = false, paused = false;
  const update = (_time, delta) => {
    if (!active || paused) return;
    active.elapsed += delta * scene.time.timeScale;
    active.frame = Math.floor(active.elapsed * 60 / 1000);
    active.onFrame?.(Math.min(active.frame,active.manifest.durationFrames-1));
    if (active.frame >= active.manifest.durationFrames) { finish(); return; }
    evaluate();
  };
  function finish() {
    const complete = active?.onComplete;
    active = null;
    complete?.();
  }
  function evaluate() {
    if (!active) return;
    const {host, frame, layers, manifest} = active;
    for (const layer of Object.values(layers)) layer.player.update(frame,
      member => scenePresentationAnchor(member, host, manifest.plan),
      {x:host.arena.x-host.width/2,y:host.height/2-host.arena.y-host.arena.height,
        width:host.arena.width,height:host.arena.height});
  }
  for (const [name, depth] of [['back',-50],['front',1100]]) {
    const external = scene.add.extern().setDepth(depth);
    external.render = (_renderer, phaserCamera, matrix) => {
      if (!active || disposed) return;
      const gl = phaser.gl, previous = {framebuffer:gl.getParameter(gl.FRAMEBUFFER_BINDING),
        viewport:gl.getParameter(gl.VIEWPORT),scissor:gl.getParameter(gl.SCISSOR_BOX),
        scissorTest:gl.isEnabled(gl.SCISSOR_TEST)};
      try {
        if (phaserCamera.zoom !== 1 || phaserCamera.rotation !== 0) throw Error('Prepared scene profile requires an unrotated unit-zoom camera');
        renderer.resetState();
        renderer.setRenderTarget(null);
        gl.bindFramebuffer(gl.FRAMEBUFFER,previous.framebuffer);
        const {host} = active, arena = host.arena;
        renderer.setViewport(0,0,phaser.width,phaser.height);
        renderer.setScissor(arena.x,host.height-arena.y-arena.height,arena.width,arena.height);
        renderer.setScissorTest(true);
        // Extern's calculation carries Phaser camera shake/scroll into the same screen-space basis.
        camera.position.x = -matrix.tx; camera.position.y = matrix.ty;
        camera.updateMatrixWorld(true);
        active.layers[name].player.setScreenRectangle?.({x:arena.x-host.width/2,
          y:host.height/2-arena.y-arena.height,width:arena.width,height:arena.height,
          cameraOffset:{x:camera.position.x,y:camera.position.y}});
        renderer.render(active.layers[name].scene,camera);
      } catch (error) {
        errors.push(String(error.message));
        scene.events.emit('prepared-scene-error', String(error.message));
        finish();
      } finally {
        renderer.resetState();
        gl.bindFramebuffer(gl.FRAMEBUFFER,previous.framebuffer);
        gl.viewport(...previous.viewport);gl.scissor(...previous.scissor);
        if(previous.scissorTest)gl.enable(gl.SCISSOR_TEST);else gl.disable(gl.SCISSOR_TEST);
      }
    };
    externs.push(external);
  }
  function disposeVariant(variant) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    for (const layer of Object.values(variant.layers)) {
      layer.scene.traverse(object => {
        if(object.geometry)geometries.add(object.geometry);
        if(object.material)materials.add(object.material);
      });
      layer.player.dispose();
    }
    for(const material of materials) {
      if(material.map)textures.add(material.map);
      for(const uniform of Object.values(material.userData.layers??{}))if(uniform?.value?.isTexture)textures.add(uniform.value);
      material.dispose();
    }
    for(const geometry of geometries)geometry.dispose();
    for(const texture of textures)texture.dispose();
  }
  const ready = (async () => {
    for (const value of manifests) {
      const manifest = validateSceneManifest(value);
      const counts = ['all_enemies','party'].includes(manifest.plan.presentation.scope) ? [1,2,3] : [1];
      for (const count of counts) {
        if(disposed)return;
        const members = scenePresentationMembers(manifest.plan,Array.from({length:count},(_,i)=>'target'+i));
        const variant = {manifest,layers:{}};
        for (const name of ['back','front']) {
          const layerScene = new THREE.Scene();
          const player = await createEffectPlayer(THREE,layerScene,{...manifest.plan,members:members.filter(m=>m.layer===name)});
          variant.layers[name] = {scene:layerScene,player};
        }
        if(disposed){disposeVariant(variant);return;}
        variants.set(manifest.key+'/'+count,variant);
      }
    }
  })().catch(error=>{errors.push(String(error.message));scene.events.emit('prepared-scene-error',String(error.message));});
  const destroy = () => {
    if(disposed)return;
    disposed=true;active=null;
    scene.events.off('update',update);scene.events.off('shutdown',destroy);
    for(const external of externs)external.destroy();
    for(const variant of variants.values())disposeVariant(variant);
    variants.clear();renderer.dispose();
  };
  scene.events.on('update',update);scene.events.once('shutdown',destroy);
  return {ready,destroy,
    canPlay:(key,count=1)=>variants.has(key+'/'+count),
    duration:key=>[...variants.values()].find(v=>v.manifest.key===key)?.manifest.durationFrames??0,
    choreography(key) {
      const variant = [...variants.values()].find(v=>v.manifest.key===key);
      if(!variant)throw Error('Prepared scene not ready: '+key);
      return {...variant.manifest.plan.presentation};
    },
    play(key,host,onComplete,onFrame) {
      const variant=variants.get(key+'/'+Object.keys(host.targets).length);
      if(!variant)throw Error('Prepared scene variant not ready: '+key);
      paused=false;active={...variant,host:structuredClone(host),frame:0,elapsed:0,onComplete,onFrame};evaluate();onFrame?.(0);
    },
    stop(){active=null;},
    seek(frame){if(!active||!Number.isFinite(frame)||frame<0||frame>=active.manifest.durationFrames)throw Error('Active bounded frame required');paused=true;active.frame=frame;active.elapsed=frame*1000/60;evaluate();},
    snapshot(){return {active:!!active,key:active?.manifest.key??null,frame:active?.frame??null,quality:'experimental-preview',
      errors:[...errors],variants:variants.size,host:active?.host??null,
      limitations:[...new Set([...variants.values()].flatMap(variant=>Object.values(variant.layers).flatMap(layer=>layer.player.issues)))],
      layers:active?Object.fromEntries(Object.entries(active.layers).map(([name,layer])=>[name,layer.player.traceSnapshot()])):null};},
  };
}
