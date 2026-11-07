// Successful-child Null Initialize flag blocks; callers must supply actual context words.
export function nullInitializationFlags({locator_index,field_c8,field_cc,parent_flags,child_flags}={}) {
  if(!Number.isInteger(locator_index)||locator_index<0||locator_index>15||![0,1].includes(field_c8)||![0,1].includes(field_cc)
    ||![parent_flags,child_flags].every(v=>Number.isInteger(v)&&v>=0&&v<=0xffff))
    throw Error('Explicit bounded Null initialization flags required');
  const local=(1<<locator_index)&0xffff;
  const beforeChildren=local|((field_cc!==0||field_c8===0)?parent_flags:0);
  const summary=beforeChildren|(child_flags&0x8000);
  const restoredParent=parent_flags|(summary&0x8005?0x8000:0);
  return {beforeChildren,afterChildren:child_flags,restoredParent,auxiliaryFlag:+!!(restoredParent&0x8000)};
}

// Bind checked source inputs to actual caller/child state. No inferred contexts.
export function nullFlagsFromSource(initialization, context = {}) {
  if (initialization?.profile !== 'native-null-init-inputs-v1' || initialization.status !== 'supported-inputs')
    throw Error('Supported original Null initialization inputs required');
  return nullInitializationFlags({...initialization.parameters,
    parent_flags:context.parent_flags,child_flags:context.child_flags});
}
