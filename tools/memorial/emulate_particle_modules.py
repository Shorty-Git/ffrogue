"""Pinned constant Particle init/make-vertex module dataflow reference.

Caller-provided group scale and RNG state are controlled fixtures, not recovered
whole-game inheritance or seed scheduling. No Android process runs.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct

import unicorn
from unicorn import Uc, UC_ARCH_ARM64, UC_MODE_ARM, UC_HOOK_CODE, UC_PROT_READ, UC_PROT_EXEC
from unicorn.arm64_const import UC_ARM64_REG_X0, UC_ARM64_REG_X1, UC_ARM64_REG_X2, UC_ARM64_REG_LR, UC_ARM64_REG_SP, UC_ARM64_REG_PC, UC_ARM64_REG_CPACR_EL1
from emulate_zscreen_locator import LocatorReference, HEAP, STACK, STOP
from emulate_particle_writer import ParticleWriterReference, IDENTITY
from prepare_diagnostic import EXPECTED_NATIVE

MODULES = {'initScale': (0x1fc5f68, 252), 'initRotation': (0x1fc5694, 252),
           'makeScale': (0x1fc2164, 84), 'makeRotation': (0x1fc2060, 56),
           'makeTranslation': (0x1fc2020, 16)}


class ParticleModuleReference:
    def __init__(self, apk):
        self.image = LocatorReference(apk)
        self.writer = ParticleWriterReference(apk)
        self.identities = {name: {'address': hex(address), 'size': size,
                                 'sha256': hashlib.sha256(self.image.read(address, size)).hexdigest()}
                           for name, (address, size) in MODULES.items()}

    def run(self, scale, rotation, group_scale, scale_range=(0, 0, 0), rotation_range=(0, 0, 0),
            rng=(123456789, 362436069, 521288629, 88675123), center=(0, 0, 0), basis=IDENTITY):
        for v in (scale, rotation, group_scale, scale_range, rotation_range, center):
            if len(v) != 3 or not all(math.isfinite(x) for x in v):
                raise ValueError('Expected finite three-component inputs')
        if len(rng) != 4 or not all(isinstance(x, int) and 0 <= x <= 0xffffffff for x in rng) or not any(rng):
            raise ValueError('Expected nonzero four-word RNG fixture')
        cpu = Uc(UC_ARCH_ARM64, UC_MODE_ARM)
        for page in sorted({address & ~4095 for address, size in MODULES.values()} |
                           {(address + size) & ~4095 for address, size in MODULES.values()}):
            cpu.mem_map(page, 4096)
            cpu.mem_write(page, self.image.read(page, 4096))
            cpu.mem_protect(page, 4096, UC_PROT_READ | UC_PROT_EXEC)
        cpu.mem_map(HEAP, 65536)
        cpu.mem_map(STACK, 65536)
        cpu.mem_map(STOP, 4096)
        record, random, value, spread, group = [HEAP + n * 4096 for n in range(1, 6)]
        cpu.mem_write(HEAP, struct.pack('<Q', record))
        cpu.mem_write(HEAP + 0x30, struct.pack('<Q', random))
        cpu.mem_write(random, struct.pack('<4I', *rng))
        cpu.reg_write(UC_ARM64_REG_CPACR_EL1, 3 << 20)
        active, executed = [], []

        def execute(machine, address, size, _):
            if not active[0] <= address < active[1]:
                raise ValueError('Execution escaped the pinned module')
            executed.append(address)

        cpu.hook_add(UC_HOOK_CODE, execute)

        def call(name):
            address, size = MODULES[name]
            active[:] = [address, address + size]
            cpu.reg_write(UC_ARM64_REG_X0, HEAP)
            cpu.reg_write(UC_ARM64_REG_X1, value)
            cpu.reg_write(UC_ARM64_REG_X2, spread)
            cpu.reg_write(UC_ARM64_REG_SP, STACK + 0xf000)
            cpu.reg_write(UC_ARM64_REG_LR, STOP)
            cpu.emu_start(address, STOP, count=2000)
            if cpu.reg_read(UC_ARM64_REG_PC) != STOP:
                raise ValueError('Incomplete module execution')

        for name, initial, interval in [('initScale', scale, scale_range), ('initRotation', rotation, rotation_range)]:
            cpu.mem_write(value, struct.pack('<3f', *initial))
            cpu.mem_write(spread, struct.pack('<3f', *interval))
            call(name)
        initialized = list(struct.unpack('<6f', cpu.mem_read(record, 24)))
        rng_after = list(struct.unpack('<4I', cpu.mem_read(random, 16)))
        init_cursor = struct.unpack('<I', cpu.mem_read(HEAP + 8, 4))[0]
        cpu.mem_write(HEAP + 8, struct.pack('<I', 0))
        cpu.mem_write(group, struct.pack('<3f', *group_scale))
        cpu.mem_write(HEAP + 0x58, struct.pack('<Q', group))
        # The traversal loads the already-simulated center separately. Const
        # translation only consumes its record span; it does not add it again.
        cpu.mem_write(HEAP + 0x98, struct.pack('<3f', *center))
        before = bytes(cpu.mem_read(HEAP + 0x98, 12))
        for name in ('makeScale', 'makeRotation', 'makeTranslation'):
            call(name)
        computed = {'rotation': list(struct.unpack('<3f', cpu.mem_read(HEAP + 0xb0, 12))),
                    'scale': list(struct.unpack('<3f', cpu.mem_read(HEAP + 0xbc, 12))),
                    'groupScale': list(struct.unpack('<3f', cpu.mem_read(HEAP + 0xc8, 12)))}
        if bytes(cpu.mem_read(HEAP + 0x98, 12)) != before:
            raise ValueError('Const translation unexpectedly moved the center')
        writer = self.writer.run(center, computed['rotation'][2], computed['scale'][:2], computed['groupScale'][:2], basis)
        return {'initialized': initialized, 'rngAfter': rng_after, 'initCursor': init_cursor,
                'makeCursor': struct.unpack('<I', cpu.mem_read(HEAP + 8, 4))[0],
                'computed': computed, 'writer': writer, 'moduleInstructions': len(executed)}


def fixture_cases(reference):
    cases = []
    for rotation in ([0, 0, 0], [25, -19, 37], [70, 90, 37], [0, 0, -45]):
        for scale, group in [([360, 320, 0], [1.775] * 3), ([1.2, 2, .5], [3, 5, 7])]:
            for scale_range, rotation_range in [([0, 0, 0], [0, 0, 0]), ([.2, .3, .1], [10, 20, 30])]:
                inputs = {'rotation': rotation, 'scale': scale, 'group_scale': group,
                          'scale_range': scale_range, 'rotation_range': rotation_range}
                cases.append({'inputs': inputs, 'result': reference.run(**inputs)})
    return cases


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must stay in ignored tools/data')
    reference = ParticleModuleReference(args.apk)
    cases = fixture_cases(reference)
    receipt = {'approved': False, 'nativeSha256': EXPECTED_NATIVE, 'modules': reference.identities,
               'unicornVersion': unicorn.__version__, 'cases': cases,
               'boundary': 'Controlled Const init/make modules plus observed writer; group-scale producer, dispatch and whole-game RNG scheduling are not simulated'}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    print(json.dumps({'cases': len(cases), 'modules': reference.identities, 'first': cases[0]}, indent=2))
