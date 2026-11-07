// Ordered, reusable comparison of explicitly selected lifecycle observations.
import {isDeepStrictEqual} from 'node:util';

const key=e=>JSON.stringify([e.frame,e.type,e.node,e.instance??null,e.module??null]);
const comparable=e=>Object.fromEntries(Object.entries(e).filter(([k])=>!['seq','pointer','context'].includes(k)));
function fields(a,b,prefix='') {
  if(isDeepStrictEqual(a,b))return [];
  if(a&&b&&typeof a==='object'&&typeof b==='object')return [...new Set([...Object.keys(a),...Object.keys(b)])]
    .flatMap(k=>fields(a[k],b[k],prefix?`${prefix}.${k}`:k));
  const numeric=typeof a==='number'&&typeof b==='number'&&Number.isFinite(a)&&Number.isFinite(b);
  const ordered=v=>{const x=new DataView(new ArrayBuffer(4));x.setFloat32(0,v);const w=x.getUint32(0);return w&0x80000000?0x80000000-(w&0x7fffffff):0x80000000+w;};
  return [{field:prefix,original:a??null,simulator:b??null,...(numeric?{numericPrecision:{absoluteDifference:Math.abs(a-b),
    inputsExactlyFloat32:Math.fround(a)===a&&Math.fround(b)===b,float32UlpDistance:Math.abs(ordered(a)-ordered(b))}}:{})}];
}

export function compareLifecycleEvents(original,simulated) {
  const differences=[],matches=[];
  const mismatch=(a,b,cause)=>differences.push({originalEvent:a??null,simulatorEvent:b??null,
    originalPosition:{index:i,previousSeq:original[i-1]?.seq??null,nextSeq:original[i]?.seq??null},
    frame:a?.frame??b?.frame,instance:a?.instance??b?.instance??null,
    parentState:{original:a?.parent??a?.context?.parentState??null,simulator:b?.parent??b?.context?.parentState??null},
    rngState:{original:a?.rng??a?.context?.rng??null,simulator:b?.rng??b?.context?.rng??null},
    adjacentOriginalContext:a?null:{seq:original[i]?.seq??null,parentState:original[i]?.context?.parentState??null,rng:original[i]?.rng??null},
    fields:a&&b?fields(comparable(a),comparable(b)):[],probableCause:cause});
  let i=0,j=0;
  while(i<original.length||j<simulated.length){
    const a=original[i],b=simulated[j];
    if(a&&b&&key(a)===key(b)){
      if(isDeepStrictEqual(comparable(a),comparable(b)))matches.push({seq:a.seq,frame:a.frame,type:a.type,instance:a.instance??null});
      else {
        const changed=fields(comparable(a),comparable(b)).map(f=>f.field);
        mismatch(a,b,changed.some(k=>k.startsWith('rng'))?'Shared RNG consumption/order differs':
          changed.some(k=>['worldTranslation','origin','basis','quaternion','scale'].some(p=>k.startsWith(p+'.')))?'Transform/projection arithmetic or context differs; inspect recorded inputs and float32 ULP distance':
          changed.some(k=>k.includes('ageTicks')||k.startsWith('parent'))?'Parent gate, phase order or lifetime differs':'Generator, callback or module state differs');
      }
      i++;j++;continue;
    }
    const nextA=b?original.findIndex((e,n)=>n>i&&key(e)===key(b)):-1;
    const nextB=a?simulated.findIndex((e,n)=>n>j&&key(e)===key(a)):-1;
    if(a&&(nextB<0||nextA>=0&&nextA-i<=nextB-j)){mismatch(a,null,'Missing or reordered simulator event');i++;}
    else {mismatch(null,b,'Unexpected or reordered simulator event');j++;}
  }
  return {schema:'ffrogue-lifecycle-diff-v1',originalEvents:original.length,simulatorEvents:simulated.length,
    matchedEvents:matches.length,firstDivergence:differences[0]??null,differences,matches};
}
