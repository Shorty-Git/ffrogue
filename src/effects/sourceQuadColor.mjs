import {NativeRandom, initializeNativeVector} from './nativeLifecycle.mjs';

export const FLAT_QUAD_RGB_PROFILE = 'native-flat-quad-rgb-v1';
export const COLOR_STREAM_POLICY = 'reviewed-color-streams-v1';

export function validateFlatQuadColor(source) {
  if(source?.profile!==FLAT_QUAD_RGB_PROFILE || source.mode!=='Constant' || source.flat!==true
    || ['value','range'].some(key=>!Array.isArray(source[key])||source[key].length!==3
      ||source[key].some(v=>!Number.isFinite(v)||v<0||v>1)))
    throw Error('Explicit bounded Constant/flat Quad RGB required');
}

export function initializeFlatQuadColor(source,rng) {
  validateFlatQuadColor(source);
  // Native InitConstFlat samples three RGB floats. Serialized corner A is not
  // the alpha module: keep the existing independent alpha timeline unchanged.
  return initializeNativeVector({kind:'ColorConst',arithmetic:'captured-separate-f32',
    value:source.value,range:source.range},rng);
}

export function sampleFlatQuadColor(source,memberSeed,instance) {
  validateFlatQuadColor(source);
  if(!Number.isInteger(memberSeed)||!Number.isSafeInteger(instance)||instance<0)
    throw Error('Explicit member seed and instance identity required');
  // Domain-separated host replay stream. FFBE's emitter seed/ownership for this
  // effect is unknown; do not consume or perturb the existing transform stream.
  let state=memberSeed>>>0;
  for(const c of `quad-rgb:${instance}`)state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
  const words=Array.from({length:4},()=>state=(Math.imul(state,1664525)+1013904223)>>>0);
  return initializeFlatQuadColor(source,new NativeRandom(words));
}
