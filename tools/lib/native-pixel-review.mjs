// Test harness for the existing shared player, not an alternate effect renderer.
import {createEffectPlayer} from '../../src/effects/originalEffectPlayer.mjs';
import {evaluateNativeSourceBranches} from '../../src/effects/nativeSourceBranches.mjs';
import {connectedErrorRegions} from './pixel-error-regions.mjs';

export function comparePixelBuffers(original,actual,width,{backgroundRgb=[0,0,0],regions=false}={}){
 if(original.length!==actual.length||original.length%4)throw Error('Pixel buffer size mismatch');
 if(!Number.isInteger(width)||width<1||original.length/4%width
   ||!Array.isArray(backgroundRgb)||backgroundRgb.length!==3||backgroundRgb.some(v=>!Number.isInteger(v)||v<0||v>255))
   throw Error('Rectangular pixels and explicit RGB clear color required');
 let changedRgb=0,changedRgba=0,above2=0,maximumRgb=0,maximumAlpha=0,sum=0,unionPixels=0;
 const histogram=Array(256).fill(0),bounds={left:Infinity,right:-1,bottom:Infinity,top:-1};
 const maximumChannels=[0,0,0,0],signed=[0,0,0],rgbDelta=regions?new Uint8Array(original.length/4):null;
 for(let i=0;i<original.length;i+=4){
  let maximum=0,energy=false;
  for(let c=0;c<3;c++){const delta=Math.abs(original[i+c]-actual[i+c]);maximum=Math.max(maximum,delta);sum+=delta;
   maximumChannels[c]=Math.max(maximumChannels[c],delta);signed[c]+=actual[i+c]-original[i+c];
   energy||=original[i+c]!==backgroundRgb[c]||actual[i+c]!==backgroundRgb[c];}
  const alpha=Math.abs(original[i+3]-actual[i+3]);maximumAlpha=Math.max(maximumAlpha,alpha);maximumRgb=Math.max(maximumRgb,maximum);
  maximumChannels[3]=Math.max(maximumChannels[3],alpha);if(rgbDelta)rgbDelta[i/4]=maximum;
  if(maximum)changedRgb++;if(maximum||alpha)changedRgba++;if(maximum>2)above2++;
  if(energy){unionPixels++;histogram[maximum]++;const x=(i/4)%width,y=Math.floor(i/4/width);bounds.left=Math.min(bounds.left,x);bounds.right=Math.max(bounds.right,x);bounds.bottom=Math.min(bounds.bottom,y);bounds.top=Math.max(bounds.top,y);}
 }
 let cumulative=0,p95=0;for(let i=0;i<256;i++){cumulative+=histogram[i];if(cumulative>=unionPixels*.95){p95=i;break;}}
 return {pixels:original.length/4,changedRgb,changedRgba,above2,maximumRgb,maximumAlpha,unionPixels,
  meanAbsoluteRgbOnUnion:unionPixels?sum/(unionPixels*3):0,p95MaximumRgbOnUnion:p95,bounds:unionPixels?bounds:null,
  maximumChannels,signedBiasOnUnion:signed.map(v=>unionPixels?v/unionPixels:0),backgroundRgb,
  ...(regions?{errorRegions:Object.fromEntries([2,4,8,16].map(t=>[t,connectedErrorRegions(rgbDelta,width,t)])),
    regionCoordinates:'Lower-left framebuffer coordinates; 8-neighbor connected pixels; strict delta > threshold'}:{})};
}

function png(bytes,width,height){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const paint=canvas.getContext('2d'),data=paint.createImageData(width,height);
 for(let y=0;y<height;y++)data.data.set(bytes.subarray(y*width*4,(y+1)*width*4),(height-1-y)*width*4);
 // Present raw framebuffer RGB without Canvas alpha round-trip altering the PNG.
 for(let i=3;i<data.data.length;i+=4)data.data[i]=255;
 paint.putImageData(data,0,0);return canvas.toDataURL('image/png');
}
async function originalPixels(url){
 const response=await fetch(url);if(!response.ok)throw Error('Missing native pixels: '+url);
 const stream=response.body.pipeThrough(new DecompressionStream('deflate'));
 return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function reviewNativePixelSequence(THREE,fixture,onProgress=()=>{}){
 const {width,height}=fixture,renderer=new THREE.WebGLRenderer({alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:false});
 renderer.setSize(width,height,false);renderer.autoClear=false;
 const engine=fixture.testPremultipliedUpload?{...THREE,TextureLoader:class extends THREE.TextureLoader{
  load(...args){const map=super.load(...args);map.premultiplyAlpha=true;return map;}
 }}:THREE;
 const scene=new THREE.Scene(),camera=new THREE.Camera(),player=await createEffectPlayer(engine,scene,fixture.plan),results=[];
 try{
  const samplerAliasControls=[];
  if(fixture.testSourceSamplerAlias){
   const trace=player.traceSnapshot();
   scene.children.flatMap(root=>root.children).forEach((mesh,i)=>{
    const node=fixture.plan.effects[0].nodes.find(n=>n.index===trace[i].node),second=mesh.material.userData.layers?.secondMap?.value;
    if(second&&node.resourceBindings.texture1.name===node.resourceBindings.texture2.name){
     samplerAliasControls.push({node:node.index,instance:trace[i].instance,before:mesh.material.map.wrapS,after:second.wrapS});
     mesh.material.map.wrapS=second.wrapS;mesh.material.map.wrapT=second.wrapT;mesh.material.map.needsUpdate=true;
    }
   });
  }
  const gl=renderer.getContext(),graphicsState={version:gl.getParameter(gl.VERSION),
   ditherEnabled:gl.isEnabled(gl.DITHER),sampleAlphaToCoverage:gl.isEnabled(gl.SAMPLE_ALPHA_TO_COVERAGE),
   framebufferBits:Object.fromEntries(['RED_BITS','GREEN_BITS','BLUE_BITS','ALPHA_BITS','DEPTH_BITS','STENCIL_BITS','SUBPIXEL_BITS','SAMPLES']
    .map(key=>[key,gl.getParameter(gl[key])]))};
  for(const frame of fixture.frames){
   const host=frame.renderContext;camera.projectionMatrix.fromArray(host.projection);camera.matrixAutoUpdate=false;
   camera.matrixWorld.identity();camera.matrixWorldInverse.identity();
   player.update(frame.frame,()=>({x:host.position[0],y:host.position[1],rootScale:host.scale}));
   if(fixture.testNativeWorldPackets){
    const packets=evaluateNativeSourceBranches(fixture.plan.nativeQuadBranches,frame.frame,{scale:host.scale,origin:host.position});
    scene.children.forEach(root=>{
     root.position.set(0,0,0);root.scale.set(1,1,1);
     root.children.forEach((mesh,i)=>{if(packets[i]?.packet){
      mesh.geometry.attributes.position.array.set(packets[i].packet.vertices.flatMap(v=>v.position));
      mesh.geometry.attributes.position.needsUpdate=true;mesh.geometry.computeBoundingSphere();
     }});
    });
   }
   const source=frame.originalState,viewport=source.viewport,scissor=source.scissor;
   renderer.setViewport(0,0,width,height);renderer.setScissor(scissor[0]-viewport[0],scissor[1]-viewport[1],scissor[2],scissor[3]);
   const comparisons={},submission={};let blackPng;
   const trace=player.traceSnapshot(),submitted=[];
   scene.children.flatMap(root=>root.children).forEach((mesh,i)=>{
    mesh.onBeforeRender=()=>submitted.push({node:trace[i].node,instance:trace[i].instance,order:mesh.renderOrder,
     blendSrc:mesh.material.blendSrc,blendDst:mesh.material.blendDst,opacity:mesh.material.opacity});
   });
   for(const background of ['black','white','transparent']){
    renderer.setScissorTest(false);renderer.setClearColor(background==='white'?0xffffff:0,background==='transparent'?0:1);renderer.clear(true,true,true);
    submitted.length=0;renderer.setScissorTest(!!source.scissorEnabled);renderer.render(scene,camera);
    submission[background]=submitted.slice();
    const actual=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,actual);
    const expected=await originalPixels(frame.outputs[background]);comparisons[background]=comparePixelBuffers(expected,actual,width,
      {backgroundRgb:background==='white'?[255,255,255]:[0,0,0],regions:true});
    if(background==='black')blackPng=png(actual,width,height);
   }
   results.push({kind:'native-pixel-comparison',frame:frame.frame,drawIndex:frame.drawIndex,comparisons,submission,png:blackPng,
    scope:'Actual original GPU command mirror versus existing shared player; explicit measured host and initial RNG inputs',
    nativeComputedParentMatricesSupplied:false,nativeGeometrySupplied:false});
   onProgress(results.at(-1));
  }
  return {kind:'native-pixel-sequence',harnessRevision:8,graphicsState,pngEncoding:'opaque-rgb-from-readback; alpha metrics use original RGBA',results,samplerAliasControls,sourceSha256:fixture.sourceSha256,
   textureState:scene.children.flatMap(root=>root.children.map(mesh=>({minFilter:mesh.material.map.minFilter,
    magFilter:mesh.material.map.magFilter,premultiplyAlpha:mesh.material.map.premultiplyAlpha,generateMipmaps:mesh.material.map.generateMipmaps}))),
   inputBoundary:fixture.inputBoundary,fullOriginalSkill:false,originalPixelParity:results.every(r=>Object.values(r.comparisons).every(c=>c.changedRgba===0))};
 }finally{player.dispose();renderer.dispose();}
}
