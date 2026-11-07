"""Original Null module selection with an explicit inherited auxiliary-array flag.

The flag is an input fixture until full Null Initialize inheritance executes.
Do not silently select an auxiliary-array mode from a similar asset or filename.
"""
import argparse
import json
import math
from pathlib import Path
import struct

from emulate_particle_assignment import ParticleAssignmentReference
from prepare_diagnostic import EXPECTED_NATIVE
from emulate_zscreen_locator import HEAP, SIN, COS


class NullAssignmentReference(ParticleAssignmentReference):
    parameter_type = 0
    parameter_bytes = 704
    entry = (0x1fc0e4c, 1920)
    profile = {'count': (0x1fc0a88, 820), 'work': (0x1fc0dbc, 144)}
    alpha_offset = 280
    extra_update_suffixes = ('Default',)
    external_math = {SIN:math.sin, COS:math.cos}

    def __init__(self, apk, *, auxiliary_flag):
        if type(auxiliary_flag) is not int or auxiliary_flag not in (0,1):
            raise ValueError('Explicit Null auxiliary-array flag 0 or 1 required')
        self.selection_arguments = (auxiliary_flag,)
        super().__init__(apk)
        for function, (address,size) in dict(assign=self.entry, **self.profile).items():
            token = {'assign':'12AssignModule', 'count':'14GetModuleCount', 'work':'17GetModuleWorkSize'}[function]
            if not any(s['defined'] and s['address']==address and s['size']==size
                       and '12NullSetupper' in s['name'] and token in s['name'] for s in self.symbols):
                raise ValueError('Pinned Null function identity differs')

    def write_vertices(self, *args):
        raise ValueError('Null nodes have no Quad/Particle writer in this reference')

    def run(self, parameter, probe=None):
        return super().run(parameter, dict(probe,locatorHost=True) if probe is not None else None)

    def prepare_update_context(self, cpu, context, probe):
        scale = probe.get('inheritedScale',[1,1,1])
        if len(scale)!=3 or not all(math.isfinite(v) and v>0 for v in scale):
            raise ValueError('Positive finite inherited scale fixture required')
        for offset, pointer in ((0x58,HEAP+0x9600),(0x78,HEAP+0x9700),(0xd0,HEAP+0x9800)):
            cpu.mem_write(context+offset,struct.pack('<Q',pointer))
        cpu.mem_write(HEAP+0x9600,struct.pack('<16f',1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1))
        cpu.mem_write(HEAP+0x9700,struct.pack('<3f',*scale))
        cpu.mem_write(HEAP+0x9800,struct.pack('<3f',0,0,0))

    def inspect_update_context(self, cpu, context):
        return dict(nativeLocator=dict(basis=list(struct.unpack('<9f',cpu.mem_read(context+0x88,36))),
                    quaternion=list(struct.unpack('<4f',cpu.mem_read(context+0xd8,16))),
                    scale=list(struct.unpack('<3f',cpu.mem_read(context+0xe8,12)))))


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk',type=Path,required=True)
    parser.add_argument('--source',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--auxiliary-flag',type=int,choices=(0,1),required=True)
    parser.add_argument('--probe-chains',action='store_true')
    args=parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must remain under tools/data')
    ref=NullAssignmentReference(args.apk,auxiliary_flag=args.auxiliary_flag)
    cases=ref.source_cases(args.source,probe=args.probe_chains)
    result=dict(approved=False,wholeEffectExported=False,nativeSha256=EXPECTED_NATIVE,
                auxiliaryFlagFixture=args.auxiliary_flag,entry=hex(ref.entry[0]),
                codeSha256=ref.code_hash,profileFunctions=ref.profile_identities,cases=cases,
                boundary='Original Null modules with explicit auxiliary-array/parent/RNG fixtures; not source hierarchy, generation or inheritance')
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps(dict(sourceNullNodes=len(cases),wholeEffectExported=False)))

