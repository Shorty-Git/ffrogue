"""Offline original OneX/ConstX/VelocityX scale chains with explicit inputs.

Delta time, group scale and RNG seed are supplied fixtures. These calls do not
simulate native traversal scheduling or make arbitrary nodes playback-supported.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys

import unicorn
from unicorn import Uc, UC_ARCH_ARM64, UC_MODE_ARM, UC_HOOK_CODE, UC_PROT_READ, UC_PROT_EXEC
from unicorn.arm64_const import UC_ARM64_REG_X0, UC_ARM64_REG_LR, UC_ARM64_REG_SP, UC_ARM64_REG_PC, UC_ARM64_REG_CPACR_EL1, UC_ARM64_REG_S0, UC_ARM64_REG_S1, UC_ARM64_REG_S2, UC_ARM64_REG_S3
from emulate_zscreen_locator import LocatorReference, HEAP, STACK, STOP
from emulate_particle_writer import ParticleWriterReference
from prepare_diagnostic import EXPECTED_NATIVE
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from native_particle_dispatch import ParticleDispatch
from inspect_bmb import read_bmb

MODULES = {'OneX': (0x1fc213c, 40), 'ConstX': (0x1fc21b8, 56), 'VelocityX': (0x1fc2248, 60),
           'initConstX': (0x1fc75ec, 116), 'initVelocityX': (0x1fc766c, 168),
           'updateConstX': (0x1fc7a30, 36), 'updateVelocityX': (0x1fc7a58, 68)}


class ParticleXReference:
    def __init__(self, apk):
        self.image = LocatorReference(apk)
        self.writer = ParticleWriterReference(apk)
        self.dispatch = ParticleDispatch(apk)
        self.identities = {name: {'address': hex(address), 'bytes': size,
            'sha256': hashlib.sha256(self.image.read(address, size)).hexdigest()}
            for name, (address, size) in MODULES.items()}

    def run(self, mode, initial=1, value_range=0, velocity=0, velocity_range=0,
            steps=(), group=(1, 1, 1), roll=0, rng=(123456789, 362436069, 521288629, 88675123)):
        if mode not in ('OneX', 'ConstX', 'VelocityX'):
            raise ValueError('Unverified X consumer')
        if len(group) != 3 or not all(math.isfinite(x) for x in (*group, initial, value_range, velocity, velocity_range, roll, *steps)):
            raise ValueError('Expected finite X fixtures')
        if len(rng) != 4 or not all(isinstance(x, int) and 0 <= x <= 0xffffffff for x in rng) or not any(rng):
            raise ValueError('Expected nonzero four-word RNG fixture')
        if steps and mode == 'OneX':
            raise ValueError('OneX updates are not exercised here')
        cpu = Uc(UC_ARCH_ARM64, UC_MODE_ARM)
        for page in (0x1fc2000, 0x1fc7000):
            cpu.mem_map(page, 4096)
            cpu.mem_write(page, self.image.read(page, 4096))
            cpu.mem_protect(page, 4096, UC_PROT_READ | UC_PROT_EXEC)
        cpu.mem_map(HEAP, 65536)
        cpu.mem_map(STACK, 65536)
        cpu.mem_map(STOP, 4096)
        record, random, joint = HEAP + 4096, HEAP + 8192, HEAP + 12288
        cpu.mem_write(HEAP, struct.pack('<Q', record))
        cpu.mem_write(HEAP + 0x30, struct.pack('<Q', random))
        cpu.mem_write(random, struct.pack('<4I', *rng))
        cpu.mem_write(HEAP + 0x58, struct.pack('<Q', joint))
        cpu.mem_write(joint, struct.pack('<3f', *group))
        cpu.reg_write(UC_ARM64_REG_CPACR_EL1, 3 << 20)
        active, executed = [], []

        def execute(machine, address, size, _):
            if not active[0] <= address < active[1]:
                raise ValueError('Execution escaped the pinned X module')
            executed.append(address)

        cpu.hook_add(UC_HOOK_CODE, execute)

        def call(name, arguments=()):
            address, size = MODULES[name]
            active[:] = [address, address + size]
            cpu.mem_write(HEAP + 8, struct.pack('<I', 0))
            cpu.reg_write(UC_ARM64_REG_X0, HEAP)
            for register, value in zip((UC_ARM64_REG_S0, UC_ARM64_REG_S1, UC_ARM64_REG_S2, UC_ARM64_REG_S3), arguments):
                cpu.reg_write(register, struct.unpack('<I', struct.pack('<f', value))[0])
            cpu.reg_write(UC_ARM64_REG_SP, STACK + 0xf000)
            cpu.reg_write(UC_ARM64_REG_LR, STOP)
            cpu.emu_start(address, STOP, count=2000)
            if cpu.reg_read(UC_ARM64_REG_PC) != STOP:
                raise ValueError('Incomplete X module execution')
            return struct.unpack('<I', cpu.mem_read(HEAP + 8, 4))[0]

        size = {'OneX': 0, 'ConstX': 4, 'VelocityX': 8}[mode]
        init_cursor = 0
        if mode != 'OneX':
            init_cursor = call('init' + mode, (initial, value_range, velocity, velocity_range))
        initial_record = list(struct.unpack('<' + 'f' * (size // 4), cpu.mem_read(record, size))) if size else []
        update_records = []
        for delta in steps:
            cpu.mem_write(HEAP + 0x40, struct.pack('<f', delta))
            cursor = call('update' + mode)
            update_records.append({'cursor': cursor,
                'record': list(struct.unpack('<' + 'f' * (size // 4), cpu.mem_read(record, size))),
                'scale': list(struct.unpack('<3f', cpu.mem_read(HEAP + 0xe8, 12)))})
        make_cursor = call(mode)
        scale = list(struct.unpack('<3f', cpu.mem_read(HEAP + 0xbc, 12)))
        inherited = list(struct.unpack('<3f', cpu.mem_read(HEAP + 0xc8, 12)))
        if not all(math.isfinite(v) for v in (*scale, *inherited)):
            raise ValueError('Nonfinite X module output')
        return {'initialRecord': initial_record, 'initCursor': init_cursor, 'updates': update_records,
                'makeCursor': make_cursor, 'scale': scale, 'groupScale': inherited,
                'rngAfter': list(struct.unpack('<4I', cpu.mem_read(random, 16))),
                'writer': self.writer.run([0, 0, 0], roll, scale[:2], inherited[:2]),
                'instructions': len(executed)}

    def source_cases(self, path):
        raw = path.read_bytes()
        nodes = read_bmb(raw)['nodes']
        selected = self.dispatch.inspect_effect(path)
        cases = []
        for node in selected['particles']:
            mode = {15: 'OneX', 16: 'ConstX', 17: 'VelocityX'}.get(node['scale']['index'])
            if mode is None:
                continue
            if node['scale']['target']['address'] != self.identities[mode]['address']:
                raise ValueError('Source-selected X consumer differs')
            offset = nodes[node['node']]['offset']
            # Pinned Particle parameter wrappers load X from these vectors.
            values = [struct.unpack_from('<f', raw, offset + field)[0] for field in (0x30c, 0x318, 0x324, 0x330)]
            inputs = dict(zip(('initial', 'value_range', 'velocity', 'velocity_range'), values))
            inputs.update(mode=mode, group=[1.775] * 3, steps=[.25, .5] if mode == 'VelocityX' else [])
            cases.append({'source': path.name, 'sourceSha256': selected['sourceSha256'], 'node': node['node'],
                          'inputs': inputs, 'result': self.run(**inputs),
                          'boundary': 'Source scale parameters with controlled group/RNG/delta; rotation and other modules are not replayed'})
        return cases


def fixture_cases(reference):
    cases = []
    for group in ([1.775] * 3, [1.2, 2, 3]):
        for roll in (0, .65):
            for mode in ('OneX', 'ConstX', 'VelocityX'):
                profiles = [{}] if mode == 'OneX' else [{'initial': 3, 'value_range': .2}, {'initial': -1}]
                for profile in profiles:
                    sequences = [()] if mode != 'VelocityX' else [(), (.25,), (.25, .5)]
                    for steps in sequences:
                        inputs = {'mode': mode, 'group': group, 'roll': roll, **profile}
                        if mode == 'VelocityX':
                            inputs.update(velocity=-2, velocity_range=.1, steps=steps)
                        cases.append({'inputs': inputs, 'result': reference.run(**inputs)})
    return cases


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--effect', action='append', default=[], type=Path)
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must stay in ignored tools/data')
    reference = ParticleXReference(args.apk)
    cases = fixture_cases(reference)
    source_cases = [case for path in args.effect for case in reference.source_cases(path)]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({'approved': False, 'nativeSha256': EXPECTED_NATIVE,
        'unicornVersion': unicorn.__version__, 'modules': reference.identities, 'cases': cases, 'sourceCases': source_cases,
        'boundary': 'Explicit RNG/group/delta fixtures; no native scheduling, full dispatch or arbitrary-node playback claim'}, indent=2), encoding='utf-8')
    print(json.dumps({'cases': len(cases), 'sourceCases': len(source_cases), 'modules': reference.identities}, indent=2))
