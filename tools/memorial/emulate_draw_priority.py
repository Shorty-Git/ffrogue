"""Execute original non-full-Z NodeTree submission sorting on synthetic metadata.

The original sort executes; geometry callbacks and the final command builder are
explicit observation boundaries. This is not a new live capture or tree simulation.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import random
import struct

from unicorn import Uc, UC_ARCH_ARM64, UC_MODE_ARM, UC_HOOK_CODE
from unicorn.arm64_const import (UC_ARM64_REG_X0, UC_ARM64_REG_X1, UC_ARM64_REG_X2,
    UC_ARM64_REG_X3, UC_ARM64_REG_X4, UC_ARM64_REG_PC, UC_ARM64_REG_LR,
    UC_ARM64_REG_SP, UC_ARM64_REG_CPACR_EL1)
from emulate_zscreen_locator import LocatorReference, HEAP, STACK, STOP

ENTRY, SIZE = 0x1fb8ef0, 2108
FULL_Z, PRIORITY = 0x10ceda0, 0x10d9e30
INDEXED, DIRECT, CALLBACK = 0x1132720, 0x10f1eb0, 0x430000000


class DrawPriorityReference:
    def __init__(self, apk):
        self.image = LocatorReference(apk)
        self.identity = dict(entry=hex(ENTRY), bytes=SIZE,
            sha256=hashlib.sha256(self.image.read(ENTRY,SIZE)).hexdigest(),
            epsilon=struct.unpack('<f',self.image.read(0x1fb9760,4))[0])

    def run(self, priorities, enabled=True):
        if len(priorities)>128 or any(not math.isfinite(v) for v in priorities):
            raise ValueError('Finite bounded metadata required')
        cpu=Uc(UC_ARCH_ARM64,UC_MODE_ARM)
        for page in range(ENTRY & ~4095,(ENTRY+SIZE+4095)&~4095,4096):
            cpu.mem_map(page,4096);cpu.mem_write(page,self.image.read(page,4096))
        for page in {a&~4095 for a in [FULL_Z,PRIORITY,INDEXED,DIRECT,CALLBACK]}:
            cpu.mem_map(page,4096)
        cpu.mem_map(HEAP,131072);cpu.mem_map(STACK,65536);cpu.mem_map(STOP,4096)
        cpu.mem_map(0x2e0b000,4096);cpu.mem_map(0x2e42000,4096)
        cpu.mem_write(0x2e0b440,struct.pack('<Q',0x2e42ff4))
        def write(at,fmt,*v):cpu.mem_write(at,struct.pack('<'+fmt,*v))
        def read(at,fmt):return struct.unpack('<'+fmt,cpu.mem_read(at,struct.calcsize('<'+fmt)))
        tree,draw,storage,table,entries,meta,indices,callbacks,nodes=[HEAP+i*4096 for i in [0,1,2,3,4,6,8,9,10]]
        write(tree,'2Q',storage,table)
        write(storage+0x70,'Q',meta);write(storage+0x80,'Q',indices)
        write(table,'QI',entries,len(priorities));write(callbacks+0x18,'Q',CALLBACK)
        for i,value in enumerate(priorities):
            write(entries+i*24,'3Q',0,nodes+i*16,callbacks)
            write(nodes+i*16,'fI',value,i)
        cpu.reg_write(UC_ARM64_REG_CPACR_EL1,3<<20)
        for reg,value in [(UC_ARM64_REG_X0,tree),(UC_ARM64_REG_X1,draw),
                          (UC_ARM64_REG_SP,STACK+0xf000),(UC_ARM64_REG_LR,STOP)]:cpu.reg_write(reg,value)
        results=[];callbacks_seen=[]
        def hook(machine,address,size,_):
            if address==FULL_Z or address==PRIORITY:
                machine.reg_write(UC_ARM64_REG_X0,int(address==PRIORITY and enabled))
                machine.reg_write(UC_ARM64_REG_PC,machine.reg_read(UC_ARM64_REG_LR))
            elif address==CALLBACK:
                node=machine.reg_read(UC_ARM64_REG_X0);ctx=machine.reg_read(UC_ARM64_REG_X2)
                value,identity=read(node,'fI');at=read(ctx+8,'Q')[0]
                write(at,'I',0);write(at+8,'Q',node);write(at+0x18,'f',value)
                write(ctx+8,'Q',at+40);callbacks_seen.append(identity)
                machine.reg_write(UC_ARM64_REG_PC,machine.reg_read(UC_ARM64_REG_LR))
            elif address in [INDEXED,DIRECT]:
                if address==INDEXED:
                    start=machine.reg_read(UC_ARM64_REG_X3);count=machine.reg_read(UC_ARM64_REG_X4)
                    results.extend(read(start,f'{count}I'))
                else:results.extend(range(machine.reg_read(UC_ARM64_REG_X3)))
                machine.reg_write(UC_ARM64_REG_PC,STOP)
            elif not ENTRY<=address<ENTRY+SIZE:
                raise ValueError('Execution escaped original sorting boundary')
        cpu.hook_add(UC_HOOK_CODE,hook)
        cpu.emu_start(ENTRY,STOP,count=2000000)
        if cpu.reg_read(UC_ARM64_REG_PC)!=STOP or len(results)!=len(priorities) or callbacks_seen!=list(range(len(priorities))):
            raise ValueError('Incomplete original sort/metadata traversal')
        return dict(priorities=list(struct.unpack(f'<{len(priorities)}f',struct.pack(f'<{len(priorities)}f',*priorities))),
                    enabled=enabled,order=results,callbackOrder=callbacks_seen)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk',type=Path,required=True);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):raise ValueError('Keep native controls ignored')
    ref=DrawPriorityReference(args.apk);rng=random.Random(20261028)
    inputs=[[],[.5],[.4,.5,.4,.5,.5],[.9,.1,.8,.2],[-1,0,-2,1],
            [0,1e-7,-1e-7,1e-6,-1e-6,1.000001e-6], [.5]*19]
    for count in [2,5,9,10,11,15,19,32,64,128]:
        for _ in range(6):inputs.append([rng.choice([.4,.5,.8,-.3])+rng.choice([0,0,1e-7,9e-7,1.1e-6]) for _ in range(count)])
    cases=[ref.run(values,enabled) for values in inputs for enabled in [True,False]]
    result=dict(schema='native-priority-reference-v1',identity=ref.identity,cases=cases,
        boundary='Original NodeTree::MakeVertex sorting with synthetic metadata callbacks, no full-Z path or geometry execution')
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps(dict(cases=len(cases),identity=ref.identity,whiteOrder=cases[4]['order'])))
