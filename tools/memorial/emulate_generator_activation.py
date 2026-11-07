"""Bounded original Null/Quad/Particle activation oracle; no callback/tree replay."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import sys

from unicorn import Uc, UC_ARCH_ARM64, UC_MODE_ARM, UC_HOOK_CODE, UC_PROT_READ, UC_PROT_EXEC
from unicorn.arm64_const import UC_ARM64_REG_X0, UC_ARM64_REG_X1, UC_ARM64_REG_LR, UC_ARM64_REG_SP, UC_ARM64_REG_PC, UC_ARM64_REG_CPACR_EL1
from emulate_zscreen_locator import LocatorReference, HEAP, STACK, STOP
from prepare_diagnostic import EXPECTED_NATIVE
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from inspect_bmb import read_bmb
from bmb_playback_fields import attach_playback_fields

FUNCTIONS = {0: (0x1fbbb24, 392), 2: (0x1febe34, 488), 3: (0x1fee474, 488)}
SEEDS = [[123456789, 362436069, 521288629, 88675123], [1, 2, 3, 4], [5, 20, 300, 4000]]


class GeneratorActivationReference:
    def __init__(self, apk):
        self.image = LocatorReference(apk)

    def run(self, parameter, kind, seed):
        if kind not in FUNCTIONS or len(seed)!=4 or any(type(v) is not int or not 0<=v<=0xffffffff for v in seed) or not any(seed):
            raise ValueError('Known trait and explicit nonzero four-word state required')
        address, size = FUNCTIONS[kind]
        cpu = Uc(UC_ARCH_ARM64, UC_MODE_ARM)
        for page in range(address & ~4095, (address + size + 4095) & ~4095, 4096):
            cpu.mem_map(page, 4096); cpu.mem_write(page, self.image.read(page, 4096))
            cpu.mem_protect(page, 4096, UC_PROT_READ | UC_PROT_EXEC)
        cpu.mem_map(HEAP, 65536); cpu.mem_map(STACK, 65536); cpu.mem_map(STOP, 4096)
        emitter, param, record, joint = [HEAP + i * 4096 for i in range(4)]
        def write(at, fmt, *values):
            cpu.mem_write(at, struct.pack('<' + fmt, *values))
        def read(at, fmt):
            return struct.unpack('<' + fmt, cpu.mem_read(at, struct.calcsize('<' + fmt)))
        cpu.mem_write(param, parameter)
        null = kind == 0
        rng = emitter + (0x40 if null else 0x130)
        write(emitter + (0x10 if null else 0xf0), 'Q', param)
        write(emitter + (0x80 if null else 0x108), 'Q', record)
        write(emitter + (0x98 if null else 0x148), 'I', 1)
        if null:
            write(emitter + 0x18, 'Q', HEAP + 0x5000)  # Explicit valid module-table fixture.
        else:
            write(emitter + 0x140, 'I', 1)
        write(rng, '4I', *seed)
        write(joint + 0x60, '2I', 1, 1)
        def guard(machine, pc, count, user):
            if not address <= pc < address + size:
                raise ValueError('Activation escaped its pinned original function')
        cpu.hook_add(UC_HOOK_CODE, guard)
        cpu.reg_write(UC_ARM64_REG_CPACR_EL1, 3 << 20)
        for register, value in [(UC_ARM64_REG_X0, emitter), (UC_ARM64_REG_X1, joint),
                                (UC_ARM64_REG_LR, STOP), (UC_ARM64_REG_SP, STACK + 0xf000)]:
            cpu.reg_write(register, value)
        cpu.emu_start(address, STOP, count=5000)
        if cpu.reg_read(UC_ARM64_REG_PC) != STOP:
            raise ValueError('Incomplete original activation')
        words = read(record, '8i')
        return dict(zip(('mode', 'durationTicks', 'intervalTicks', 'remainingTicks', 'emitted', 'cycleEmitted', 'limit'), words[:7]),
                    delayTicks=read(record + 0x28, 'i')[0], rng=list(read(rng, '4I')))


def build_receipt(apk, sources):
    ref = GeneratorActivationReference(apk)
    cases = []
    for source in sources:
        raw = source.read_bytes(); data = read_bmb(raw); attach_playback_fields(raw, data['nodes'])
        for node in data['nodes']:
            if node['typeId'] not in FUNCTIONS:
                continue
            if node['nativeGeneration']['mode']!=0 or node['typeId']!=0 and node['childCount']:
                raise ValueError('Source outside the constant activation contract')
            for seed in SEEDS:
                parameter = raw[node['offset']:node['offset'] + node['bytes']]
                cases.append(dict(source=str(source).replace('\\', '/'), sourceSha256=hashlib.sha256(raw).hexdigest(),
                    node=node['index'], inputs=node['nativeGeneration'], seed=seed,
                    result=ref.run(parameter, node['typeId'], seed)))
    return dict(approved=False, wholeEffectReconstructed=False, nativeSha256=EXPECTED_NATIVE,
        functions={str(k):dict(address=hex(a), bytes=n, sha256=hashlib.sha256(ref.image.read(a,n)).hexdigest()) for k,(a,n) in FUNCTIONS.items()},
        boundary='One activation per source node with explicit independent RNG and parent/module-table fixtures; no NodeTree order, callbacks or geometry', cases=cases)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--apk', type=Path, required=True); p.add_argument('--source', type=Path, action='append', required=True)
    p.add_argument('--output', type=Path, required=True); args=p.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        p.error('Output must stay under tools/data')
    receipt=build_receipt(args.apk, args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True); args.output.write_text(json.dumps(receipt,indent=2),encoding='utf-8')
    print(json.dumps(dict(cases=len(receipt['cases']), wholeEffectReconstructed=False)))
