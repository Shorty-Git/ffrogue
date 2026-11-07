"""Execute original Particle module selection without executing selected modules.

Uses a pinned ELF with defined relocations, an explicit empty field context and
preallocated module arrays. Selection order is evidence, not playback support.
"""
import argparse
from bisect import bisect_right
import hashlib
import json
import math
from pathlib import Path
import struct
import sys

from unicorn import Uc, UcError, UC_ARCH_ARM64, UC_MODE_ARM, UC_HOOK_CODE
from unicorn.arm64_const import UC_ARM64_REG_X0, UC_ARM64_REG_X1, UC_ARM64_REG_X2, UC_ARM64_REG_X3, UC_ARM64_REG_LR, UC_ARM64_REG_SP, UC_ARM64_REG_PC, UC_ARM64_REG_CPACR_EL1, UC_ARM64_REG_S0
from emulate_zscreen_locator import LocatorReference, HEAP, STACK, STOP
from prepare_diagnostic import EXPECTED_NATIVE
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from inspect_bmb import read_bmb

ENTRY, SIZE = 0x2003b10, 4548
PROFILE = {'count': (0x20031ac, 2096), 'work': (0x20039e0, 304)}
VERTEX_SELECTOR = (0x2004cd8, 136)
UNTEXTURED_WRITER = (0x2001438, 0x284)
TEXTURED_WRITER = (0x20016bc, 0x37c)


class ParticleAssignmentReference:
    parameter_type = 3
    parameter_bytes = 1840
    entry = (ENTRY, SIZE)
    profile = PROFILE
    alpha_offset = 0x220
    extra_init_suffixes = ()
    extra_update_suffixes = ()
    vertex_functions = (VERTEX_SELECTOR, UNTEXTURED_WRITER, TEXTURED_WRITER)
    external_math = {}
    selection_arguments = ()
    two_texture_velocity = False

    def prepare_update_context(self, cpu, context, probe):
        """Optional node-specific context fixtures, installed after init."""

    def inspect_update_context(self, cpu, context):
        return {}

    def __init__(self, apk):
        self.image = LocatorReference(apk)
        data, sections = self.image.native, self.image.sections
        dynsym = next(s for s in sections if s[1] == 11)
        strings = sections[dynsym[6]]
        strings = data[strings[4]:strings[4] + strings[5]]
        self.symbols = []
        for offset in range(dynsym[4], dynsym[4] + dynsym[5], dynsym[9]):
            name, info, _, index, address, size = struct.unpack_from('<IBBHQQ', data, offset)
            self.symbols.append({'name': strings[name:strings.index(0, name)].decode(),
                                 'address': address, 'size': size, 'defined': bool(index)})
        self.names = {}
        for symbol in self.symbols:
            if symbol['defined']:
                self.names.setdefault(symbol['address'], []).append(symbol['name'])
        self.relocations = []
        for section in sections:
            if section[1] != 4 or section[6] != sections.index(dynsym):
                continue
            for offset in range(section[4], section[4] + section[5], section[9]):
                slot, info, addend = struct.unpack_from('<QQq', data, offset)
                symbol, kind = self.symbols[info >> 32], info & 0xffffffff
                if kind == 1027:
                    self.relocations.append((slot, addend))
                elif kind in (257, 1025, 1026):
                    if symbol['defined']:
                        self.relocations.append((slot, symbol['address'] + addend))
                    elif symbol['name'] == '__stack_chk_guard':
                        self.relocations.append((slot, HEAP + 0xf000))
        # Selected callbacks are data only. Only assignment helpers and getter
        # functions may execute, alongside original PLT stubs.
        self.allowed = [(self.entry[0], self.entry[0] + self.entry[1])] + [(a, a + n) for a, n in self.profile.values()]
        for symbol in self.symbols:
            name = symbol['name']
            if symbol['defined'] and ('2ml2bm6module' in name) and (
                    'ModuleTable' in name or 'AssignField' in name or 'GetField' in name):
                self.allowed.append((symbol['address'], symbol['address'] + symbol['size']))
        names = sections[struct.unpack_from('<H', data, 62)[0]]
        names = data[names[4]:names[4] + names[5]]
        self.plt = next((s[3], s[3] + s[5]) for s in sections
                        if names[s[0]:names.index(0, s[0])] == b'.plt')
        self.code_hash = hashlib.sha256(self.image.read(*self.entry)).hexdigest()
        self.profile_identities = {name: {'address': hex(address), 'bytes': size,
            'sha256': hashlib.sha256(self.image.read(address, size)).hexdigest()}
            for name, (address, size) in self.profile.items()}
        self.module_ranges = []
        for start, end in sorted((s['address'], s['address'] + s['size']) for s in self.symbols
                                if s['defined'] and s['size'] and
                                ('2ml2bm6module' in s['name'] or '2ml2bm5Curve' in s['name'])):
            if self.module_ranges and start <= self.module_ranges[-1][1]:
                self.module_ranges[-1][1] = max(end, self.module_ranges[-1][1])
            else:
                self.module_ranges.append([start, end])
        self.module_starts = [r[0] for r in self.module_ranges]

    def run(self, parameter, probe=None):
        if len(parameter) != self.parameter_bytes or struct.unpack_from('<2I', parameter) != (self.parameter_type, self.parameter_bytes):
            raise ValueError(f'Expected one verified type-{self.parameter_type} parameter block')
        cpu = Uc(UC_ARCH_ARM64, UC_MODE_ARM)
        pages = {page for s in self.image.sections if s[2] & 2 and s[5]
                 for page in range(s[3] & ~4095, (s[3] + s[5] + 4095) & ~4095, 4096)}
        # Merge contiguous pages to avoid thousands of mappings.
        ordered = sorted(pages); begin = previous = ordered[0]
        for page in ordered[1:] + [ordered[-1] + 8192]:
            if page != previous + 4096:
                cpu.mem_map(begin, previous + 4096 - begin); begin = page
            previous = page
        for section in self.image.sections:
            if section[2] & 2 and section[1] != 8 and section[5]:
                cpu.mem_write(section[3], self.image.native[section[4]:section[4] + section[5]])
        for slot, target in self.relocations:
            cpu.mem_write(slot, struct.pack('<Q', target))
        cpu.mem_map(HEAP, 65536); cpu.mem_map(STACK, 65536); cpu.mem_map(STOP, 4096)
        arrays, context, param, empty = HEAP, HEAP + 0x1000, HEAP + 0x2000, HEAP + 0x3000
        cpu.mem_write(param, bytes(parameter))
        # No parent/child field list is reconstructed in this milestone.
        cpu.mem_write(context, struct.pack('<3Q', empty, 0, 0))
        cpu.mem_write(HEAP + 0xf000, struct.pack('<Q', 0x12345678))
        buffers = []
        for index in range(4):
            descriptor, buffer = HEAP + 0x4000 + index * 32, HEAP + 0x5000 + index * 1024
            cpu.mem_write(arrays + index * 8, struct.pack('<Q', descriptor))
            cpu.mem_write(descriptor, struct.pack('<QI', buffer, 64))
            buffers.append(buffer)
        cpu.reg_write(UC_ARM64_REG_CPACR_EL1, 3 << 20)
        for register, value in ((UC_ARM64_REG_X0, arrays), (UC_ARM64_REG_X1, context),
                                (UC_ARM64_REG_X2, param), (UC_ARM64_REG_SP, STACK + 0xf000),
                                (UC_ARM64_REG_LR, STOP)):
            cpu.reg_write(register, value)
        visited = set(); instructions = [0]; external_calls = []

        def execute(machine, address, size, _):
            instructions[0] += 1
            if probe is not None and (probe.get('vertexHost') is not None or probe.get('locatorHost')) and address in self.external_math:
                value = struct.unpack('<f', struct.pack('<I', machine.reg_read(UC_ARM64_REG_S0)))[0]
                value = self.external_math[address](value)
                machine.reg_write(UC_ARM64_REG_S0, struct.unpack('<I', struct.pack('<f', value))[0])
                machine.reg_write(UC_ARM64_REG_PC, machine.reg_read(UC_ARM64_REG_LR))
                external_calls.append(hex(address))
                return
            region = bisect_right(self.module_starts, address) - 1
            module_execution = probe is not None and region >= 0 and address < self.module_ranges[region][1]
            vertex_execution = probe is not None and probe.get('vertexHost') is not None and any(a <= address < a + n for a, n in self.vertex_functions)
            if not (vertex_execution or module_execution or self.plt[0] <= address < self.plt[1] or any(a <= address < b for a, b in self.allowed)):
                raise ValueError('Execution escaped assignment/getter functions at ' + hex(address))
            if address in self.names:
                visited.add(address)

        cpu.hook_add(UC_HOOK_CODE, execute)
        def call(address, arguments):
            for register, value in zip((UC_ARM64_REG_X0, UC_ARM64_REG_X1, UC_ARM64_REG_X2, UC_ARM64_REG_X3), arguments):
                cpu.reg_write(register, value)
            cpu.reg_write(UC_ARM64_REG_LR, STOP); cpu.reg_write(UC_ARM64_REG_SP, STACK + 0xf000)
            try:
                cpu.emu_start(address, STOP, count=100000)
            except UcError as error:
                raise ValueError(f'Native call {hex(address)} failed at {hex(cpu.reg_read(UC_ARM64_REG_PC))}: {error}') from error
            if cpu.reg_read(UC_ARM64_REG_PC) != STOP:
                raise ValueError('Incomplete module assignment/profile')

        call(self.entry[0], (arrays, context, param, *self.selection_arguments))
        call(self.profile['count'][0], (HEAP + 0x8000, context, param, *self.selection_arguments))
        counts = list(struct.unpack('<4I', cpu.mem_read(HEAP + 0x8000, 16)))
        call(self.profile['work'][0], (context, param))
        work_bytes = cpu.reg_read(UC_ARM64_REG_X0)
        result = {}
        for phase, buffer in zip(('init', 'update', 'make', 'auxiliary'), buffers):
            values = struct.unpack('<64Q', cpu.mem_read(buffer, 512))
            output = []
            for address in values:
                if not address:
                    break
                if address not in self.names:
                    raise ValueError('Assigned module has no defined native identity')
                output.append({'address': hex(address), 'symbols': self.names[address]})
            if any(values[len(output):]):
                raise ValueError('Noncontiguous module output')
            result[phase] = output
        if counts != [len(result[phase]) for phase in ('init', 'update', 'make', 'auxiliary')]:
            raise ValueError('Original module count disagrees with assignment output')
        auxiliary = result.pop('auxiliary')
        chain = ({'status':'blocked','reason':'Additional native module array requires its own execution context'}
                 if auxiliary else self.probe_chain(cpu, call, param, result, work_bytes, probe)) if probe is not None else None
        return {'phases': result, 'moduleCounts': counts, 'workBytes': work_bytes,
                'auxiliaryModules': auxiliary,
                **({'chain': chain} if chain is not None else {}),
                'instructions': instructions[0],
                **({'externalMathCalls': external_calls,
                    'externalMathBoundary': 'Python sin/cos rounded to float32; original libc not executed'} if external_calls else {}),
                'executedHelpers': [{'address': hex(a), 'symbols': self.names[a]} for a in sorted(visited)],
                'boundary': ('Original selected init/update/make/writer under explicit host fixtures; no emitter traversal'
                             if probe is not None and probe.get('vertexHost') is not None else
                             'Original ordered init/update chains under controlled inputs; no make/renderer/traversal execution'
                             if probe is not None else 'Original assignment with empty field context; selected modules not executed')}

    def probe_chain(self, cpu, call, param, phases, work_bytes, probe):
        # Only families with resource-free constant inputs or the separately
        # decoded scalar alpha curve may run. This is an explicit capability gate.
        init_suffixes = ('InitConst', 'InitConstX', 'InitVelocityX', 'InitVelocity', 'InitCurve') + self.extra_init_suffixes
        update_suffixes = ('UpdateCurve', 'Const', 'ConstX', 'Velocity', 'VelocityX', 'One') + self.extra_update_suffixes
        for stage in ('init', 'update'):
            for module in phases[stage]:
                names = module['symbols']; name = names[0]
                allowed = any(name.endswith(str(len(suffix)) + suffix +
                              ('ERNS1_11InitContextE' if stage == 'init' else 'ERNS1_13UpdateContextE'))
                              for suffix in (init_suffixes if stage == 'init' else update_suffixes))
                allowed |= stage == 'init' and '11translation4init4ZeroERNS1_11InitContextE' in name
                if ('InitCurve' in name or 'UpdateCurve' in name) and '5alpha' not in name:
                    allowed = False
                if not allowed:
                    return {'status': 'blocked', 'reason': 'Unreviewed module inputs', 'module': name}
        curve = probe.get('alphaCurve')
        if curve is None:
            raise ValueError('Explicit decoded alpha curve required')
        if len(curve) % 20 or len(curve) > 4096:
            raise ValueError('Expected bounded scalar alpha keys')
        if curve:
            cpu.mem_write(HEAP + 0xc000, curve)
        cpu.mem_write(param + self.alpha_offset, struct.pack('<2Q', len(curve) // 20, HEAP + 0xc000))
        context, record, random = HEAP + 0x9000, HEAP + 0xa000, HEAP + 0xb000
        cpu.mem_write(context, bytes(512))
        cpu.mem_write(context, struct.pack('<Q', record))
        cpu.mem_write(context + 0x10, struct.pack('<Q', param))
        cpu.mem_write(context + 0x30, struct.pack('<Q', random))
        # Translation modules dereference both pointers even when callers only
        # inspect the local record. Never let a null fixture read mapped ELF data.
        update_parent = probe.get('updateParent', dict(origin=[0,0,0], basis=[1,0,0,0,1,0,0,0,1]))
        for field, length in (('origin', 3), ('basis', 9)):
            if len(update_parent.get(field, [])) != length or not all(math.isfinite(v) for v in update_parent[field]):
                raise ValueError('Explicit finite update-parent ' + field + ' required')
        cpu.mem_write(HEAP + 0x9400, struct.pack('<3f', *update_parent['origin']))
        cpu.mem_write(HEAP + 0x9500, struct.pack('<9f', *update_parent['basis']))
        # InitContext and UpdateContext reuse offsets with different meanings.
        # Original Quad callback initializes the inline velocity multiplier to
        # one at InitContext +0x68; only after init is +0x68 an origin pointer.
        cpu.mem_write(context + 0x68, struct.pack('<3f', 1,1,1))
        seed = probe.get('rng', (123456789, 362436069, 521288629, 88675123))
        if len(seed) != 4 or any(type(v) is not int or not 0 <= v <= 0xffffffff for v in seed) or not any(seed):
            raise ValueError('Expected four-word controlled chain RNG')
        cpu.mem_write(random, struct.pack('<4I', *seed))
        guard = bytes.fromhex('deadbeef') * 8
        if not 0 < work_bytes < 1024:
            raise ValueError('Work profile outside chain probe boundary')
        cpu.mem_write(record + work_bytes, guard)
        cursors = []
        for module in phases['init']:
            call(int(module['address'], 16), (context,))
            cursors.append(struct.unpack('<I', cpu.mem_read(context + 8, 4))[0])
        consumed = cursors[-1]
        if consumed > work_bytes or cpu.mem_read(record + work_bytes, 32) != guard:
            raise ValueError(f'Initializer cursor/guard disagrees with native work profile: {cursors}, expected {work_bytes}')
        initial = bytes(cpu.mem_read(record, work_bytes)).hex()
        rng_after_init = list(struct.unpack('<4I', cpu.mem_read(random,16)))
        cpu.mem_write(context + 0x68, struct.pack('<Q', HEAP + 0x9400))
        cpu.mem_write(context + 0x80, struct.pack('<Q', HEAP + 0x9500))
        self.prepare_update_context(cpu, context, probe)
        updates = []
        ages = probe.get('ages', (0, .25, .5, .75, 1))
        if not ages or len(ages) > 256 or any(not math.isfinite(age) or abs(age) > 10 for age in ages):
            raise ValueError('Expected bounded finite normalized-age fixtures')
        hosts = probe.get('vertexHosts')
        if hosts is not None and len(hosts) != len(ages):
            raise ValueError('One explicit vertex host per age required')
        for step, age in enumerate(ages):
            cpu.mem_write(context + 8, struct.pack('<I', 0))
            cpu.mem_write(context + 0x40, struct.pack('<f', 1))
            cpu.mem_write(context + 0x50, struct.pack('<f', age))
            for module in phases['update']:
                call(int(module['address'], 16), (context,))
            cursor = struct.unpack('<I', cpu.mem_read(context + 8, 4))[0]
            if cursor != consumed or cpu.mem_read(record + work_bytes, 32) != guard:
                raise ValueError('Update cursor/guard disagrees with initializer consumption')
            row = {'normalizedAge': age, 'cursor': cursor,
                   'nativeTranslation': list(struct.unpack('<3f', cpu.mem_read(context + 0xf4, 12))),
                   **self.inspect_update_context(cpu, context),
                   'recordHex': bytes(cpu.mem_read(record, work_bytes)).hex()}
            if probe.get('vertexHost') is not None:
                row['vertices'] = self.write_vertices(cpu, call, param, record, phases, consumed, hosts[step] if hosts is not None else probe['vertexHost'])
                if bytes(cpu.mem_read(record, work_bytes)).hex() != row['recordHex'] or cpu.mem_read(record + work_bytes, 32) != guard:
                    raise ValueError('Make/writer changed the shared particle record or exceeded its work budget')
            updates.append(row)
        return {'status': 'executed', 'initCursors': cursors, 'workBytes': work_bytes,
                'initVelocityMultiplierFixture': [1,1,1],
                'rngAfterInit': rng_after_init,
                'rngAfterUpdates': list(struct.unpack('<4I', cpu.mem_read(random,16))),
                'updateParentFixture': update_parent,
                'consumedBytes': consumed, 'unconsumedWorkBytes': work_bytes - consumed,
                'workProfileStatus': 'Budget bound only; unconsumed work reservation is unresolved',
                'initialRecordHex': initial, 'updates': updates,
                'boundary': 'Standalone module chain, explicit alpha relocation, controlled age/delta/RNG; no emitter traversal'}

    def write_vertices(self, cpu, call, param, record, phases, consumed, host):
        # This first connected writer path admits no model dependency,
        # rotated roll, or unreviewed make module. No writer substitution.
        allowed = ('7scaling11make_vertex4OneX', '11translation11make_vertex5Const',
                   '12uv_transform11ModuleTableILi1EE22MakeVertexTransform___',
                   '12uv_transform11ModuleTableILi2EE22MakeVertexTransform___',
                   '5alpha11make_vertex5Const', '6color111make_vertex5Const')
        if self.two_texture_velocity:
            allowed = ('7scaling11make_vertex9VelocityX', '11translation11make_vertex5Const',
                       '10uv_scaling11ModuleTableILi2EE15MakeVertexConst',
                       '12uv_transform11ModuleTableILi1EE22MakeVertexTransform___',
                       '12uv_transform16ModuleParamTableILi2ENS0_3bmb5param8ParticleEE22MakeVertexTransformS__',
                       '6color111make_vertex5Const')
            if len(phases['make']) != len(allowed) or any(fragment not in m['symbols'][0] for fragment, m in zip(allowed, phases['make'])):
                raise ValueError('Complete ordered two-texture VelocityX make profile required')
        if any(not any(fragment in m['symbols'][0] for fragment in allowed) for m in phases['make']):
            raise ValueError('Connected writer requires reviewed complete make chain')
        if any(len(host[k]) != 3 or not all(math.isfinite(v) for v in host[k]) for k in ('center', 'groupScale')):
            raise ValueError('Explicit finite vertex host vectors required')
        make, draw, basis, joint, output = (HEAP + o for o in (0xd000, 0xd400, 0xd500, 0xd600, 0xe000))
        cpu.mem_write(make, bytes(0x300)); cpu.mem_write(make, struct.pack('<Q', record))
        for field, pointer in ((0x10, param), (0x30, draw), (0x58, joint)):
            cpu.mem_write(make + field, struct.pack('<Q', pointer))
        cpu.mem_write(draw + 0x20, struct.pack('<Q', basis))
        basis_values = host.get('drawBasis', [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])
        trims = host.get('textureTrims', [[0,0,1,1], [0,0,1,1]])
        if len(basis_values) != 16 or not all(math.isfinite(v) for v in basis_values) or len(trims) != 2 or any(len(t) != 4 or not all(math.isfinite(v) for v in t) for t in trims):
            raise ValueError('Explicit finite draw basis/trim fixtures required')
        cpu.mem_write(basis, struct.pack('<16f', *basis_values))
        cpu.mem_write(joint, struct.pack('<3f', *host['groupScale']))
        cpu.mem_write(make + 0x98, struct.pack('<3f', *host['center']))
        if not math.isfinite(host.get('defaultAlpha', 1)) or host.get('defaultAlpha', 1) != 1:
            raise ValueError('Connected default alpha requires verified constant one')
        cpu.mem_write(make + 0x164, struct.pack('<f', host.get('defaultAlpha', 1)))
        if host.get('textureTint') != [1, 1, 1, 1]:
            raise ValueError('Connected material requires explicitly verified neutral texture tint')
        cpu.mem_write(make + 0x144, struct.pack('<4f', *host['textureTint']))
        cpu.mem_write(make + 0x188, struct.pack('<4f', *trims[0]))
        cpu.mem_write(make + 0x204, struct.pack('<4f', 0, 0, 1, 1))
        if self.two_texture_velocity:
            if host.get('textureTint2') != [1,1,1,1]:
                raise ValueError('Explicit neutral layer2 tint fixture required')
            cpu.mem_write(make + 0x154, struct.pack('<4f', *host['textureTint2']))
            cpu.mem_write(make + 0x214, struct.pack('<4f', *trims[1]))
        for module in phases['make']:
            call(int(module['address'], 16), (make,))
        cursor = struct.unpack('<I', cpu.mem_read(make + 8, 4))[0]
        if cursor != consumed:
            raise ValueError('Make cursor differs from complete init/update chain')
        if 'textureBindings' not in host:
            raise ValueError('Source texture binding metadata is required')
        for index, field in enumerate((0x40, 0x50)):
            name = host['textureBindings'].get('texture' + str(index + 1))
            if name is not None:
                encoded = name.encode('utf-8') + b'\0'
                if len(encoded) > 128:
                    raise ValueError('Texture binding name exceeds connected subset')
                address = HEAP + 0xd700 + index * 128
                cpu.mem_write(address, encoded)
                cpu.mem_write(param + field, struct.pack('<Q', address))
            else:
                cpu.mem_write(param + field, struct.pack('<Q', 0))
        cpu.mem_write(draw + 0x80, struct.pack('<I', 1))
        call(VERTEX_SELECTOR[0], (0, param, draw))
        writer = cpu.reg_read(UC_ARM64_REG_X0)
        expected = TEXTURED_WRITER[0] if host['textureBindings'].get('texture1') else UNTEXTURED_WRITER[0]
        if self.two_texture_velocity:
            expected = 0x2001a40
            if not all(host['textureBindings'].get(k) for k in ('texture1', 'texture2')):
                raise ValueError('Both source textures required')
        if writer != expected:
            raise ValueError('Source selected a writer outside the connected subset')
        stride = 64 if self.two_texture_velocity else 40 if writer == TEXTURED_WRITER[0] else 16
        guard = bytes([0xcd]) * 16
        cpu.mem_write(output, bytes(stride * 6) + guard)
        call(writer, (make, output, stride))
        raw = bytes(cpu.mem_read(output, stride * 6 + 16))
        if raw[stride * 6:] != guard:
            raise ValueError('Writer exceeded six packed vertices')
        vertices = [{'position': list(struct.unpack_from('<3f', raw, i * stride)),
                     'rgba': list(raw[i * stride + 12:i * stride + 16]),
                     **({'uv': list(struct.unpack_from('<2f', raw, i * stride + 16)),
                         'textureTint': list(struct.unpack_from('<4f', raw, i * stride + 24))} if stride in (40,64) else {}),
                     **({'uv2': list(struct.unpack_from('<2f', raw, i * stride + 40)),
                         'textureTint2': list(struct.unpack_from('<4f', raw, i * stride + 48))} if stride == 64 else {})} for i in range(6)]
        if not all(math.isfinite(v) for vertex in vertices for v in vertex['position']):
            raise ValueError('Nonfinite vertex output')
        return {'writer': hex(writer), 'stride': stride, 'makeCursor': cursor, 'data': vertices}

    def source_cases(self, path, probe=False):
        raw = path.read_bytes()
        return [{'source': path.name, 'sourceSha256': hashlib.sha256(raw).hexdigest(),
                 'node': node['index'], 'result': self.run(raw[node['offset']:node['offset'] + node['bytes']],
                    {'alphaCurve': raw[node['alphaCurve']['dataOffset']:node['alphaCurve']['dataOffset'] + len(node['alphaCurve']['keys']) * 20]}
                    if probe and node['alphaCurve']['keys'] else ({'alphaCurve': b''} if probe else None))}
                for node in read_bmb(raw)['nodes'] if node['typeId'] == self.parameter_type]



class ParticleTwoTextureReference(ParticleAssignmentReference):
    """Zero-roll two-texture VelocityX make/writer, under explicit host fixtures."""
    two_texture_velocity = True
    vertex_functions = ParticleAssignmentReference.vertex_functions + ((0x2001a40, 0x47c),)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--probe-chains', action='store_true', help='Execute capability-gated init/update chains with explicit alpha relocation and controlled age/delta')
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must remain under tools/data')
    reference = ParticleAssignmentReference(args.apk)
    root = Path('tools/data/shared-skill-review')
    cases = [case for folder in ('brave-slash-composed', 'blade-beam', 'climhazzard')
             for path in (root / folder / 'originals').glob('*.bmb') for case in reference.source_cases(path, probe=args.probe_chains)]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({'approved': False, 'nativeSha256': EXPECTED_NATIVE,
        'entry': hex(ENTRY), 'bytes': SIZE, 'codeSha256': reference.code_hash,
        'probeChains': args.probe_chains, 'profileFunctions': reference.profile_identities, 'cases': cases}, indent=2), encoding='utf-8')
    print(json.dumps({'sourceNodes': len(cases), 'moduleCounts': {
        phase: sum(len(c['result']['phases'][phase]) for c in cases) for phase in ('init', 'update', 'make')}}))
