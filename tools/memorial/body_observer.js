// Read-only, armed body transitions on the fingerprinted Memorial build.
function createBodyObserver({spec,game,emit,active,unitIdentity,roots}) {
  if(!spec)return {begin(){},command(){}};
  const addresses=new Map(),units=new Map(),edges=new Map(),last=new Map(),requests=new Map(),commands=new Set();
  let enabled=false,allowed=new Set(),samples=0;
  for(const f of spec.functions){
    const address=game.getExportByName(f.symbol);
    const actual=Array.from(new Uint8Array(address.readByteArray(16)),v=>v.toString(16).padStart(2,'0')).join('');
    if(actual!==f.head)throw Error('Body fingerprint mismatch: '+f.name);
    addresses.set(f.name,address);
  }
  const get=(name,type)=>new NativeFunction(addresses.get(name),type,['pointer']);
  const api={edge:get('unit-edge','pointer'),cgs:get('active-cgs','int'),frame:get('frame-index','int'),
    counter:get('anime-counter','float'),ended:get('anime-ended','bool'),x:get('anime-x','float'),y:get('anime-y','float')};
  function watch(unit){
    if(!enabled||!active()||samples>=600)return null;
    const identity=unitIdentity(unit);
    if(!identity.playerClassMatched||!allowed.has(identity.unitId))return null;
    const key=unit.toString(),edge=api.edge(unit);
    if(edge.isNull())return null;
    const row={...identity,edge:edge.toString()};units.set(key,row);edges.set(edge.toString(),row);
    return row;
  }
  function snapshot(unit,phase){
    const row=watch(unit);if(!row)return;
    try{
      const edge=api.edge(unit),state={...row,phase,cgsId:api.cgs(edge),frameIndex:api.frame(edge),
        animeCounter:api.counter(edge),ended:api.ended(edge),position:[api.x(edge),api.y(edge)]};
      const signature=JSON.stringify([state.cgsId,state.frameIndex,state.ended,...state.position]);
      if(last.get(row.object)!==signature){last.set(row.object,signature);samples++;emit('body-state',state);}
    }catch(error){emit('body-unreadable',{...row,phase,reason:String(error)});}
  }
  for(const [name,argNames]of [['reserve-special',['skillId']],['reserve-anime',['cgsId','waitFrame']],
    ['change-anime',['cgsId','restart']],['active-unit',['cgsId','restart']]]){
    roots.listeners.push(Interceptor.attach(addresses.get(name),{onEnter(args){
      const row=watch(args[0]);if(!row)return;
      const values=Object.fromEntries(argNames.map((n,i)=>[n,args[i+1].toInt32()]));
      const key=row.object+name,signature=JSON.stringify(values);
      if(requests.get(key)===signature)return;requests.set(key,signature);samples++;
      emit('body-request',{...row,name,...values,callerOffset:this.returnAddress.sub(game.base).toString()});
    }}));
  }
  roots.listeners.push(Interceptor.attach(addresses.get('active-edge'),{onEnter(args){
    if(!enabled||!active()||samples>=600)return;const row=edges.get(args[0].toString());
    if(row){const values={cgsId:args[1].toInt32(),restart:args[2].toInt32(),extra:args[3].toInt32()},key=row.object+'edge',signature=JSON.stringify(values);
      if(requests.get(key)===signature)return;requests.set(key,signature);samples++;
      emit('body-cgs-request',{...row,...values,callerOffset:this.returnAddress.sub(game.base).toString()});}
  }}));
  roots.listeners.push(Interceptor.attach(addresses.get('update-unit'),{
    onEnter(args){this.unit=args[0];},onLeave(){snapshot(this.unit,'after-body-update');}
  }));
  emit('body-observer-ready',{functions:spec.functions.length,limit:600,boundary:'Requests and observed active states are separate; no body/skill fallback'});
  return {
    begin(config){
      enabled=config.bodyCapture===true;allowed=new Set(config.bodyUnitIds??[]);
      if(enabled&&(!Array.isArray(config.bodyUnitIds)||!allowed.size||allowed.size>8
        ||[...allowed].some(id=>!Number.isSafeInteger(id)||id<=0)))throw Error('Explicit bounded body unit IDs required');
      units.clear();edges.clear();last.clear();requests.clear();commands.clear();samples=0;
      if(enabled)emit('body-armed',{unitIds:[...allowed],token:config.token});
    },
    command(unit,command,executionId){const row=watch(unit);if(row){const key=row.object+JSON.stringify(command);
      if(commands.has(key))return;commands.add(key);samples++;emit('body-command',{...row,command,executionId});}}
  };
}
