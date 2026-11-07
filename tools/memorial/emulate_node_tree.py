"""Original NodeTree phase dispatch with opaque, ordered callback fixtures.

Only the clock/dispatch routines execute. Callback bodies are observed no-ops;
this does not construct a source tree or claim native birth/RNG reconstruction.
"""
import argparse, hashlib, json, math, struct
from pathlib import Path
from unicorn import Uc, UC_ARCH_ARM64, UC_MODE_ARM, UC_HOOK_CODE, UC_PROT_READ, UC_PROT_EXEC
from unicorn.arm64_const import UC_ARM64_REG_X0, UC_ARM64_REG_X1, UC_ARM64_REG_X2, UC_ARM64_REG_LR, UC_ARM64_REG_SP, UC_ARM64_REG_PC, UC_ARM64_REG_CPACR_EL1
from unicorn.arm64_const import UC_ARM64_REG_X23, UC_ARM64_REG_X26, UC_ARM64_REG_X27, UC_ARM64_REG_X28, UC_ARM64_REG_W0, UC_ARM64_REG_W1
from emulate_zscreen_locator import LocatorReference, HEAP, STACK, STOP
from prepare_diagnostic import EXPECTED_NATIVE

FUNCTIONS={'update':(0x1fb8878,1332),'post':(0x1fb8db4,304)}
SORT_PLT=0x10ceda0


class NullInitializationFlagReference:
    """Two original flag blocks only; child initialization is an explicit input."""
    blocks = ((0x1fbcb3c, 0x1fbcb8c), (0x1fbcfc8, 0x1fbd004))

    def __init__(self, apk):
        self.image = LocatorReference(apk)
        self.identities = [dict(address=hex(a), bytes=b-a,
            sha256=hashlib.sha256(self.image.read(a,b-a)).hexdigest()) for a,b in self.blocks]

    def run(self, locator_index, field_c8, field_cc, parent_flags, child_flags):
        if not all(type(v) is int and 0 <= v <= 0xffff for v in [parent_flags,child_flags]) or not 0 <= locator_index <= 15 or field_c8 not in (0,1) or field_cc not in (0,1):
            raise ValueError('Bounded raw selector/flag fixtures required')
        cpu = Uc(UC_ARCH_ARM64,UC_MODE_ARM)
        for page in {p for a,b in self.blocks for p in range(a & ~4095,(b+4095)&~4095,4096)}:
            cpu.mem_map(page,4096);cpu.mem_write(page,self.image.read(page,4096));cpu.mem_protect(page,4096,UC_PROT_READ|UC_PROT_EXEC)
        cpu.mem_map(HEAP,16384)
        emitter,param,context,allocator = [HEAP + i*4096 for i in range(4)]
        def write(at,fmt,*v):cpu.mem_write(at,struct.pack('<'+fmt,*v))
        def flags():return struct.unpack('<H',cpu.mem_read(context+0x5c,2))[0]
        for offset,value in [(0x2b4,locator_index),(0xc8,field_c8),(0xcc,field_cc)]:write(param+offset,'I',value)
        write(context+0x5c,'H',parent_flags)
        for register,value in [(UC_ARM64_REG_X23,context),(UC_ARM64_REG_X26,allocator),
            (UC_ARM64_REG_X27,emitter),(UC_ARM64_REG_X28,param),(UC_ARM64_REG_W0,1),(UC_ARM64_REG_W1,1)]:cpu.reg_write(register,value)
        cpu.reg_write(UC_ARM64_REG_CPACR_EL1,3<<20)
        def guard(machine,pc,size,user):
            if not any(a<=pc<b for a,b in self.blocks):raise ValueError('Flag execution escaped its declared blocks')
        cpu.hook_add(UC_HOOK_CODE,guard)
        cpu.emu_start(*self.blocks[0],count=100)
        if cpu.reg_read(UC_ARM64_REG_PC)!=self.blocks[0][1]:raise ValueError('Incomplete flag prefix')
        before_children=flags()
        # Native child constructors are not called here; this word must be measured separately.
        write(context+0x5c,'H',child_flags)
        cpu.emu_start(*self.blocks[1],count=100)
        if cpu.reg_read(UC_ARM64_REG_PC)!=self.blocks[1][1]:raise ValueError('Incomplete flag suffix')
        return dict(beforeChildren=before_children,afterChildren=child_flags,restoredParent=flags(),auxiliaryFlag=int(bool(flags()&0x8000)))


def null_flag_receipt(apk,sources):
    ref=NullInitializationFlagReference(apk)
    from emulate_particle_assignment import ParticleAssignmentReference
    symbols=ParticleAssignmentReference(apk)
    child_targets={address for slot,address in symbols.relocations if slot==0x2defb98}
    flow_blocks=[(0x1fbdcd0,0x1fbdd0c)]
    static_flow=dict(method='Static instruction/ELF relocation evidence, not whole Initialize execution',
        blocks=[dict(address=hex(a),bytes=b-a,sha256=hashlib.sha256(ref.image.read(a,b-a)).hexdigest()) for a,b in flow_blocks],
        initContext5cBit15='NodeTree+0x15',initContext60Byte='NodeTree+0x16',
        boundary='Distinct inputs: Null fourth-module selection must not be substituted for the NodeTree auxiliary-clock flag',
        quadChildBranch=dict(callSite='0x1fbcfa8',plt='0x110a1e0',gotSlot='0x2defb98',
            targets=[s for s in symbols.symbols if s['defined'] and s['address'] in child_targets]))
    controls=[dict(locator_index=locator,field_c8=c8,field_cc=cc,parent_flags=parent,child_flags=child)
        for locator in [0,1,2,3] for c8 in [0,1] for cc in [0,1]
        for parent in [0,1,2,4,0x8000] for child in [0,0x8000]]
    import sys
    sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
    from inspect_bmb import read_bmb
    source_fields=[]
    for source in sources:
        raw=source.read_bytes()
        for node in read_bmb(raw)['nodes']:
            if node['typeId']==0:
                fields=dict(zip(['locator_index','field_c8','field_cc'],[struct.unpack_from('<I',raw,node['offset']+o)[0] for o in [0x2b4,0xc8,0xcc]]))
                source_fields.append(dict(source=str(source).replace('\\','/'),sourceSha256=hashlib.sha256(raw).hexdigest(),node=node['index'],fields=fields,
                    actualParentFlags=None,actualChildFlags=None))
    return dict(approved=False,wholeEffectReconstructed=False,nativeSha256=EXPECTED_NATIVE,blocks=ref.identities,staticDataflow=static_flow,
        boundary='Original flag arithmetic around successful child initialization; no child constructors/allocator/whole Initialize are executed',
        cases=[dict(inputs=c,result=ref.run(**c)) for c in controls],sourceFields=source_fields)


class NodeTreeReference:
    def __init__(self,apk):
        self.image=LocatorReference(apk)
        self.identities={k:dict(address=hex(a),bytes=n,sha256=hashlib.sha256(self.image.read(a,n)).hexdigest()) for k,(a,n) in FUNCTIONS.items()}

    def run(self,steps,*,nodes=9,life_ticks=0,age_ticks=0,continue_flag=False,loop=False,root_disabled=False,
            paused=False,auxiliary=False,context_auxiliary=False,full_sort=False,count_a=0,count_b=0,
            initial_age=0,split_initial=False):
        if type(nodes) is not int or not 0<=nodes<=128 or len(steps)>256:
            raise ValueError('Bounded callback table required')
        if not all(type(v) is int and 0<=v<=10000000 for v in (life_ticks,age_ticks,initial_age,count_a,count_b)):
            raise ValueError('Bounded explicit root state required')
        if any(not math.isfinite(s['delta']) or not 0<=s['delta']<=100 for s in steps):
            raise ValueError('Bounded nonnegative delta required')
        cpu=Uc(UC_ARCH_ARM64,UC_MODE_ARM)
        pages={p for a,n in FUNCTIONS.values() for p in range(a&~4095,(a+n+4095)&~4095,4096)}
        for p in pages:
            cpu.mem_map(p,4096);cpu.mem_write(p,self.image.read(p,4096));cpu.mem_protect(p,4096,UC_PROT_READ|UC_PROT_EXEC)
        cpu.mem_map(SORT_PLT&~4095,4096)
        cpu.mem_map(HEAP,131072);cpu.mem_map(STACK,65536);cpu.mem_map(STOP,8192)
        tree,joint,context,table,entries,info=[HEAP+i*4096 for i in range(6)]
        def write(at,fmt,*v):cpu.mem_write(at,struct.pack('<'+fmt,*v))
        def read(at,fmt):return struct.unpack('<'+fmt,cpu.mem_read(at,struct.calcsize('<'+fmt)))
        write(tree,'QQ',joint,table);write(tree+0x14,'B',int(paused));write(tree+0x16,'B',int(auxiliary))
        write(joint+0x60,'2I',life_ticks,age_ticks)
        write(joint+0x68,'3B',int(continue_flag),int(loop),int(root_disabled))
        write(joint+0x88,'Q',info);write(joint+0x90,'2I',count_a,count_b)
        write(info+0x44,'i',initial_age);write(info+0x4e,'B',int(split_initial))
        write(context+0x9e,'B',int(context_auxiliary));write(table,'QI',entries,nodes)
        callbacks={}
        for node in range(nodes):
            param,emitter,vtable=HEAP+0x6000+node*64,HEAP+0x9000+node*64,HEAP+0xc000+node*32
            write(entries+node*24,'3Q',param,emitter,vtable)
            update,post=STOP+0x100+node*16,STOP+0x1000+node*16
            write(vtable,'2Q',update,post)
            callbacks[update]=(node,'update',param,emitter);callbacks[post]=(node,'post',param,emitter)
        events=[];sort_calls=[]
        def hook(machine,pc,size,user):
            if pc==SORT_PLT:
                sort_calls.append(dict(contextAuxiliary=read(context+0x9e,'B')[0],returned=int(full_sort)))
                machine.reg_write(UC_ARM64_REG_X0,int(full_sort));machine.reg_write(UC_ARM64_REG_PC,machine.reg_read(UC_ARM64_REG_LR));return
            if pc in callbacks:
                node,phase,param,emitter=callbacks[pc]
                if [machine.reg_read(r) for r in (UC_ARM64_REG_X0,UC_ARM64_REG_X1,UC_ARM64_REG_X2)]!=[emitter,param,context]:
                    raise ValueError('Unexpected callback ABI/ownership')
                events.append(dict(node=node,phase=phase,delta=read(context+8,'f')[0],
                    suspended=read(context+0x9c,'B')[0],zero=read(context+0x9d,'B')[0],phaseFlag=read(context+0x9f,'B')[0]))
                machine.reg_write(UC_ARM64_REG_PC,machine.reg_read(UC_ARM64_REG_LR));return
            if not any(a<=pc<a+n for a,n in FUNCTIONS.values()):raise ValueError('NodeTree escaped pinned routines')
        cpu.hook_add(UC_HOOK_CODE,hook);cpu.reg_write(UC_ARM64_REG_CPACR_EL1,3<<20)
        def call(name,post=True):
            cpu.reg_write(UC_ARM64_REG_X0,tree);cpu.reg_write(UC_ARM64_REG_X1,context);cpu.reg_write(UC_ARM64_REG_X2,int(post))
            cpu.reg_write(UC_ARM64_REG_LR,STOP);cpu.reg_write(UC_ARM64_REG_SP,STACK+0xf000)
            cpu.emu_start(FUNCTIONS[name][0],STOP,count=200000)
            if cpu.reg_read(UC_ARM64_REG_PC)!=STOP:raise ValueError('Incomplete NodeTree execution')
            return machine_value(cpu)
        rows=[]
        for step in steps:
            write(context+8,'f',step['delta']);events.clear()
            result=call('post' if step.get('call')=='post' else 'update',step.get('post',True))
            rows.append(dict(events=list(events),returned=result if step.get('call')!='post' else None,
                ageTicks=read(joint+0x64,'i')[0],remainingDelta=read(context+8,'f')[0],
                treeState=list(read(tree+0x14,'5B')),contextFlags=list(read(context+0x9c,'4B'))))
        return dict(rows=rows,sortCalls=sort_calls,boundary='Opaque callback bodies, explicit root/context/sort/callback-order fixtures; not source initialization or lifecycle')


def machine_value(cpu):return cpu.reg_read(UC_ARM64_REG_X0)&0xffffffff


def fixtures():
    return [dict(steps=[dict(delta=d)]) for d in (0,.25,1,2.5,3)] + [
      dict(steps=[dict(delta=1),dict(delta=0),dict(delta=.5),dict(delta=1)]),
      dict(steps=[dict(delta=2.5)],split_initial=True),
      dict(steps=[dict(delta=.5)],initial_age=2),
      dict(steps=[dict(delta=1),dict(delta=1,post=False)]),
      dict(steps=[dict(delta=1),dict(delta=0)],auxiliary=True,context_auxiliary=True),
      dict(steps=[dict(delta=1),dict(delta=0)],count_a=1),
      dict(steps=[dict(delta=1),dict(delta=0)],context_auxiliary=True,full_sort=True),
      dict(steps=[dict(delta=1),dict(delta=1),dict(delta=1)],life_ticks=10000),
      dict(steps=[dict(delta=1),dict(delta=1),dict(delta=1)],life_ticks=10000,continue_flag=True),
      dict(steps=[dict(delta=2.5),dict(delta=1)],life_ticks=10000,loop=True),
      dict(steps=[dict(delta=1)],root_disabled=True,life_ticks=10000),
      dict(steps=[dict(delta=1)],paused=True),
      dict(steps=[dict(delta=0,call='post')]),
      dict(steps=[dict(delta=1),dict(delta=0,call='post'),dict(delta=1,call='post')]),
      dict(steps=[dict(delta=1),dict(delta=0,call='post')],context_auxiliary=True,full_sort=True),
      dict(steps=[dict(delta=0)],age_ticks=10000),
      dict(steps=[dict(delta=1)],nodes=0),
      dict(steps=[dict(delta=1),dict(delta=1)],auxiliary=True,context_auxiliary=True),
      dict(steps=[dict(delta=1),dict(delta=1,post=False)],auxiliary=True,context_auxiliary=True),
      dict(steps=[dict(delta=.0000005),dict(delta=.000001),dict(delta=.0001)]),
      dict(steps=[dict(delta=0),dict(delta=.5),dict(delta=2.5)],nodes=3),
      dict(steps=[dict(delta=1)],root_disabled=True),
      dict(steps=[dict(delta=1),dict(delta=1,call='post')],life_ticks=1),
      dict(steps=[dict(delta=1)],initial_age=3,split_initial=True)]


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--apk',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    p.add_argument('--null-flags',action='store_true');p.add_argument('--source',type=Path,action='append',default=[]);a=p.parse_args()
    if not a.output.resolve().is_relative_to(Path('tools/data').resolve()):p.error('Output must stay under tools/data')
    if a.null_flags:
        result=null_flag_receipt(a.apk,a.source);a.output.parent.mkdir(parents=True,exist_ok=True)
        a.output.write_text(json.dumps(result,indent=2),encoding='utf-8')
        print(json.dumps(dict(cases=len(result['cases']),sourceNodes=len(result['sourceFields']),wholeInitializeExecuted=False)))
        raise SystemExit(0)
    ref=NodeTreeReference(a.apk)
    result=dict(approved=False,wholeEffectReconstructed=False,nativeSha256=EXPECTED_NATIVE,functions=ref.identities,
        cases=[dict(inputs=f,result=ref.run(**f)) for f in fixtures()])
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps(dict(cases=len(result['cases']),events=sum(len(r['events']) for c in result['cases'] for r in c['result']['rows']))))
