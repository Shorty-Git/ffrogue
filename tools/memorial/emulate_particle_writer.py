"""Offline geometry reference for the observed single-texture Particle writer.

Executes a bounded, pinned ARM64 range, not the game or an inferred whole
function. Computed writer inputs are fixtures: their simulation provenance is
outside this experiment. The optional dependency lives in ignored tools/data.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct

import unicorn
from unicorn import Uc, UC_ARCH_ARM64, UC_MODE_ARM, UC_HOOK_CODE, UC_PROT_READ, UC_PROT_EXEC
from unicorn.arm64_const import UC_ARM64_REG_X0, UC_ARM64_REG_X1, UC_ARM64_REG_X2, UC_ARM64_REG_LR, UC_ARM64_REG_SP, UC_ARM64_REG_PC, UC_ARM64_REG_S0, UC_ARM64_REG_CPACR_EL1
from emulate_zscreen_locator import LocatorReference, SIN, COS, HEAP, STACK, STOP
from prepare_diagnostic import EXPECTED_NATIVE

ENTRY, END, STRIDE = 0x20016bc, 0x2001a40, 40
IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]


class ParticleWriterReference:
    def __init__(self, apk):
        self.image = LocatorReference(apk)
        self.code_hash = hashlib.sha256(self.image.read(ENTRY, END - ENTRY)).hexdigest()

    def run(self, center, roll, scale, half_extent, basis=IDENTITY):
        for vector, length in ((center, 3), (scale, 2), (half_extent, 2), (basis, 16)):
            if len(vector) != length or not all(math.isfinite(x) for x in vector):
                raise ValueError('Expected finite writer input vectors')
        if not math.isfinite(roll):
            raise ValueError('Expected finite roll')
        cpu = Uc(UC_ARCH_ARM64, UC_MODE_ARM)
        page = ENTRY & ~4095
        cpu.mem_map(page, 4096)
        cpu.mem_write(page, self.image.read(page, 4096))
        cpu.mem_protect(page, 4096, UC_PROT_READ | UC_PROT_EXEC)
        for address in (SIN, COS):
            cpu.mem_map(address & ~4095, 4096)
            cpu.mem_write(address, bytes.fromhex('c0035fd6'))
        cpu.mem_map(HEAP, 65536)
        cpu.mem_map(STACK, 65536)
        cpu.mem_map(STOP, 4096)
        draw, view, output = HEAP + 4096, HEAP + 8192, HEAP + 12288
        cpu.mem_write(HEAP + 0x30, struct.pack('<Q', draw))
        cpu.mem_write(draw + 0x20, struct.pack('<Q', view))
        cpu.mem_write(view, struct.pack('<16f', *basis))
        cpu.mem_write(HEAP + 0x98, struct.pack('<3f', *center))
        cpu.mem_write(HEAP + 0xb8, struct.pack('<3f', roll, *scale))
        cpu.mem_write(HEAP + 0xc8, struct.pack('<2f', *half_extent))
        # Nongeometry attributes are neutral controlled fixtures. This tool
        # validates positions only, not their correspondence to live materials.
        cpu.mem_write(HEAP + 0x104, struct.pack('<3f', 1, 1, 1))
        cpu.mem_write(HEAP + 0x164, struct.pack('<f', 1))
        cpu.mem_write(output, bytes([0xcd]) * (STRIDE * 6 + 16))
        cpu.reg_write(UC_ARM64_REG_CPACR_EL1, 3 << 20)
        cpu.reg_write(UC_ARM64_REG_X0, HEAP)
        cpu.reg_write(UC_ARM64_REG_X1, output)
        cpu.reg_write(UC_ARM64_REG_X2, STRIDE)
        cpu.reg_write(UC_ARM64_REG_SP, STACK + 0xf000)
        cpu.reg_write(UC_ARM64_REG_LR, STOP)
        calls, instructions = [], []

        def execute(machine, address, size, _):
            instructions.append(address)
            if address in (SIN, COS):
                value = struct.unpack('<f', struct.pack('<I', machine.reg_read(UC_ARM64_REG_S0)))[0]
                value = math.sin(value) if address == SIN else math.cos(value)
                machine.reg_write(UC_ARM64_REG_S0, struct.unpack('<I', struct.pack('<f', value))[0])
                machine.reg_write(UC_ARM64_REG_PC, machine.reg_read(UC_ARM64_REG_LR))
                calls.append('sinf' if address == SIN else 'cosf')
            elif not ENTRY <= address < 0x2001a38:
                raise ValueError('Execution escaped the observed writer range')

        cpu.hook_add(UC_HOOK_CODE, execute)
        cpu.emu_start(ENTRY, STOP, count=2000)
        if cpu.reg_read(UC_ARM64_REG_PC) != STOP:
            raise ValueError('Incomplete writer execution')
        raw = bytes(cpu.mem_read(output, STRIDE * 6 + 16))
        if raw[-16:] != bytes([0xcd]) * 16:
            raise ValueError('Writer exceeded the six-vertex buffer')
        positions = [list(struct.unpack_from('<3f', raw, i * STRIDE)) for i in range(6)]
        if not all(math.isfinite(x) for p in positions for x in p):
            raise ValueError('Nonfinite writer output')
        return {'positions': positions, 'mathCalls': calls, 'instructions': len(instructions)}


def fixture_cases(reference):
    cases = []
    # Deliberately nonidentity and rolled bases distinguish a world Euler guess
    # from the supplied draw basis. They are synthetic, not captured camera data.
    bases = [IDENTITY, [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
             [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 7, 9, 11, 1]]
    for basis in bases:
        for degrees in (0, 37, 90, -45):
            for scale in ([1.775, 1.775], [1.2, 2], [-1, .75], [0, 1]):
                inputs = {'center': [188, 857.875, -3], 'roll': math.radians(degrees),
                          'scale': scale, 'half_extent': [360, 320], 'basis': basis}
                cases.append({'inputs': inputs, 'result': reference.run(**inputs)})
    return cases


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--existing-capture', type=Path)
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must stay in ignored tools/data')
    reference = ParticleWriterReference(args.apk)
    receipt = {'approved': False, 'nativeSha256': EXPECTED_NATIVE,
               'rangeStart': hex(ENTRY), 'rangeEnd': hex(END), 'rangeSha256': reference.code_hash,
               'boundary': 'Observed callback to next selector-returned entry, not a recovered symbol size',
               'unicornVersion': unicorn.__version__, 'stride': STRIDE,
               'externalMath': 'Python sin/cos rounded to float32; original libc not executed',
               'cases': fixture_cases(reference)}
    if args.existing_capture:
        raw = args.existing_capture.read_bytes()
        capture = json.loads(raw)
        if capture.get('boot', {}).get('nativeSha256') != EXPECTED_NATIVE:
            raise ValueError('Existing capture belongs to another native build')
        sample = next(v for v in capture['vertices'] if v['node'] == 34 and v['writer']['offset'] == hex(ENTRY))
        if sample['stride'] != STRIDE or sample['vertexCount'] != 6:
            raise ValueError('Unexpected captured writer layout')
        # Reconstructed from the documented zero-roll node34 source/control.
        # These input fields were not all recorded in the original capture.
        result = reference.run([188, 857.875, 0], 0, [1.775, 1.775], [360, 320], sample['drawBasisFloats'])
        residual = max(abs(x - y) for a, b in zip(result['positions'], sample['positions']) for x, y in zip(a, b))
        if residual > 1e-5:
            raise ValueError('Existing node34 output differs')
        receipt['existingOutputAgreement'] = {'captureSha256': hashlib.sha256(raw).hexdigest(),
            'sample': sample['sample'], 'maxResidual': residual,
            'assumptions': 'Reconstructed center, zero roll, scale 1.775 and half extents 360/320; recorded draw basis. Not a full context replay.'}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    print(json.dumps({'cases': len(receipt['cases']), 'rangeSha256': reference.code_hash,
                      'existingOutputAgreement': receipt.get('existingOutputAgreement')}, indent=2))


if __name__ == '__main__':
    main()
