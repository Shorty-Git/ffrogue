"""Execute the pinned ZScreen ARM64 locator offline on controlled memory.

No Android process or APK entry point runs. Only this small function can execute;
its two libc math calls are explicit float32-rounded Python math stubs. Synthetic
inputs are differential fixtures, not new observations of the original game.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import zipfile

import unicorn
from unicorn import Uc, UC_ARCH_ARM64, UC_MODE_ARM, UC_HOOK_CODE, UC_PROT_READ, UC_PROT_EXEC
from unicorn.arm64_const import UC_ARM64_REG_X0, UC_ARM64_REG_LR, UC_ARM64_REG_SP, UC_ARM64_REG_PC, UC_ARM64_REG_S0, UC_ARM64_REG_CPACR_EL1
from prepare_diagnostic import EXPECTED_APK, EXPECTED_NATIVE

ENTRY, SIZE = 0x1fc04b0, 1412
SIN, COS = 0x111b040, 0x11338f0
HEAP, STACK, STOP = 0x400000000, 0x410000000, 0x420000000


class LocatorReference:
    def __init__(self, apk):
        if hashlib.sha256(apk.read_bytes()).hexdigest() != EXPECTED_APK:
            raise ValueError('Unexpected source APK')
        with zipfile.ZipFile(apk) as archive:
            self.native = archive.read('lib/arm64-v8a/libgame.so')
        if hashlib.sha256(self.native).hexdigest() != EXPECTED_NATIVE:
            raise ValueError('Unexpected native library')
        offset = struct.unpack_from('<Q', self.native, 40)[0]
        stride, count = struct.unpack_from('<HH', self.native, 58)
        self.sections = [struct.unpack_from('<IIQQQQIIQQ', self.native, offset + i * stride)
                         for i in range(count)]
        self.code_hash = hashlib.sha256(self.read(ENTRY, SIZE)).hexdigest()

    def read(self, address, size):
        section = next(s for s in self.sections if s[1] != 8 and s[3] <= address
                       and address + size <= s[3] + s[5])
        start = section[4] + address - section[3]
        return self.native[start:start + size]

    def run(self, rotation, scale, inherited_scale, translation=(0, 0, 0), *, locator='zscreen', parent_basis=None):
        if locator not in ('zscreen', 'default'):
            raise ValueError('Unverified Null locator')
        entry, code_size = (ENTRY, SIZE) if locator == 'zscreen' else (0x1fbef00, 1144)
        vectors = [rotation, scale, inherited_scale, translation]
        if any(len(v) != 3 or not all(math.isfinite(x) for x in v) for v in vectors):
            raise ValueError('Expected four finite three-component vectors')
        cpu = Uc(UC_ARCH_ARM64, UC_MODE_ARM)
        for page in range(entry & ~4095, (entry + code_size + 4095) & ~4095, 4096):
            cpu.mem_map(page, 4096);cpu.mem_write(page, self.read(page, 4096))
            cpu.mem_protect(page, 4096, UC_PROT_READ | UC_PROT_EXEC)
        for address in (SIN, COS):
            cpu.mem_map(address & ~4095, 4096)
            cpu.mem_write(address, bytes.fromhex('c0035fd6'))
        # Initial BSS value of ml::predication::constant_zero; this single GOT
        # relocation was resolved from the pinned native image, not by its name.
        cpu.mem_map(0x2e0b000, 4096);cpu.mem_map(0x2e42000, 4096)
        cpu.mem_write(0x2e0b440, struct.pack('<Q', 0x2e42ff4))
        cpu.mem_write(0x2e42ff4, struct.pack('<f', 0))
        cpu.mem_protect(0x2e0b000, 4096, UC_PROT_READ)
        cpu.mem_protect(0x2e42000, 4096, UC_PROT_READ)
        cpu.mem_map(HEAP, 65536);cpu.mem_map(STACK, 65536);cpu.mem_map(STOP, 4096)
        view, angles, parent = HEAP + 4096, HEAP + 8192, HEAP + 12288
        cpu.mem_write(view, struct.pack('<16f', 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1))
        cpu.mem_write(angles, struct.pack('<3f', *rotation))
        cpu.mem_write(parent, struct.pack('<3f', *inherited_scale))
        if locator == 'default':
            if parent_basis is None:
                parent_basis = [inherited_scale[0],0,0,0,inherited_scale[1],0,0,0,inherited_scale[2]]
            if len(parent_basis) != 9 or not all(math.isfinite(v) for v in parent_basis):
                raise ValueError('Explicit finite parent basis required')
            cpu.mem_write(parent + 64, struct.pack('<9f', *parent_basis))
            cpu.mem_write(HEAP + 0x80, struct.pack('<Q', parent + 64))
        for offset, pointer in ((0x58, view), (0x78, parent), (0xd0, angles)):
            cpu.mem_write(HEAP + offset, struct.pack('<Q', pointer))
        cpu.mem_write(HEAP + 0xe8, struct.pack('<3f', *scale))
        cpu.mem_write(HEAP + 0xf4, struct.pack('<3f', *translation))
        cpu.reg_write(UC_ARM64_REG_CPACR_EL1, 3 << 20)
        cpu.reg_write(UC_ARM64_REG_X0, HEAP);cpu.reg_write(UC_ARM64_REG_SP, STACK + 0xf000)
        cpu.reg_write(UC_ARM64_REG_LR, STOP)
        calls, instructions = [], []

        def execute(machine, address, size, _):
            instructions.append(address)
            if address in (SIN, COS):
                value = struct.unpack('<f', struct.pack('<I', machine.reg_read(UC_ARM64_REG_S0)))[0]
                result = math.sin(value) if address == SIN else math.cos(value)
                machine.reg_write(UC_ARM64_REG_S0, struct.unpack('<I', struct.pack('<f', result))[0])
                machine.reg_write(UC_ARM64_REG_PC, machine.reg_read(UC_ARM64_REG_LR))
                calls.append('sinf' if address == SIN else 'cosf')
            elif not entry <= address < entry + code_size:
                raise ValueError('Execution escaped the pinned locator')

        cpu.hook_add(UC_HOOK_CODE, execute)
        cpu.emu_start(entry, STOP, count=20000)
        if cpu.reg_read(UC_ARM64_REG_PC) != STOP or calls != ['sinf', 'cosf'] * (1 if locator == 'zscreen' else 3):
            raise ValueError('Incomplete locator execution')
        result = {'basis': list(struct.unpack('<9f', cpu.mem_read(HEAP + 0x88, 36))),
                  'quaternion': list(struct.unpack('<4f', cpu.mem_read(HEAP + 0xd8, 16))),
                  'scale': list(struct.unpack('<3f', cpu.mem_read(HEAP + 0xe8, 12))),
                  'translation': list(struct.unpack('<3f', cpu.mem_read(HEAP + 0xf4, 12))),
                  'instructions': len(instructions), 'mathCalls': calls}
        if not all(math.isfinite(x) for name in ('basis', 'quaternion', 'scale', 'translation') for x in result[name]):
            raise ValueError('Nonfinite native locator output')
        return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--locator', choices=('zscreen', 'default'), default='zscreen')
    parser.add_argument('--live-prefix-audit', type=Path, help='Optional existing direct-prefix audit; identity view and diagonal inherited basis only')
    args = parser.parse_args()
    if args.locator != 'zscreen' and args.live_prefix_audit:
        parser.error('Existing live-prefix audit selects ZScreen only')
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must stay in ignored tools/data')
    reference = LocatorReference(args.apk)
    cases = []
    for angle in (0, 37, 90, 137, 180, -45, -179, 360):
        for scale, parent in [([1, 1, 1], [1.775] * 3), ([1.5, 1, .75], [1.2, 2, 3])]:
            rotation = [math.radians(25), math.radians(-19), math.radians(angle)]
            cases.append({'rotation': rotation, 'localScale': scale, 'inheritedScale': parent,
                          'result': reference.run(rotation, scale, parent, [194, 643, 0], locator=args.locator)})
    entry, size = (ENTRY, SIZE) if args.locator == 'zscreen' else (0x1fbef00, 1144)
    receipt = {'approved': False, 'nativeSha256': EXPECTED_NATIVE, 'functionAddress': hex(entry),
               'functionSha256': hashlib.sha256(reference.read(entry, size)).hexdigest(), 'unicornVersion': unicorn.__version__,
               'view': 'Identity', 'externalMath': 'Python sin/cos rounded to float32; native libc not executed',
               'globalFixture': 'Initial BSS constant_zero 0', 'cases': cases,
               'boundary': 'Controlled offline instruction execution, not new live game evidence'}
    if args.live_prefix_audit:
        raw = args.live_prefix_audit.read_bytes()
        audit = json.loads(raw)
        if audit.get('boot', {}).get('nativeSha256') != EXPECTED_NATIVE or not audit.get('recoveredDirectPrefixesOnly'):
            raise ValueError('Unverified existing locator audit')
        comparisons = []
        for sample in audit['samples']:
            if not sample['complete']:
                continue
            for call in sample['calls']:
                if call.get('offset') != ENTRY or call.get('computed') or not call.get('fingerprintVerified'):
                    continue
                before, after = call['before'], call['after']
                inherited = before['inheritedBasis80']
                if any(abs(inherited[i]) > 1e-7 for i in (1, 2, 3, 5, 6, 7)):
                    raise ValueError('Existing agreement fixture requires diagonal inherited basis')
                result = reference.run(before['rotationD0'], before['scaleE8'],
                                       [inherited[i] for i in (0, 4, 8)], before['translationF4'])
                pairs = [('basis', 'basis88'), ('scale', 'scaleE8'), ('quaternion', 'quaternionD8'), ('translation', 'translationF4')]
                residual = max(abs(x - y) for actual, expected in pairs
                               for x, y in zip(result[actual], after[expected]))
                if residual > 1e-5:
                    raise ValueError('Existing native locator sample differs')
                comparisons.append({'sample': call['sample'], 'node': call['node'], 'maxResidual': residual})
        if not comparisons:
            raise ValueError('No verified existing ZScreen samples')
        receipt['existingSampleAgreement'] = {'auditSha256': hashlib.sha256(raw).hexdigest(),
            'assumptions': 'Identity view; inherited scale reconstructed from recorded positive diagonal basis, not a complete context-memory replay',
            'samples': comparisons}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    print(json.dumps({'cases': len(cases), 'functionSha256': reference.code_hash,
                      'first': cases[0], 'last': cases[-1]}, indent=2))
