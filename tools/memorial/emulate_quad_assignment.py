"""Original Quad module selection/profile for the mapped Brave Slash component.

Shares the pinned ELF loader and assignment ABI with the Particle reference.
Quad callbacks execute only in explicit probe modes, never as Particle substitutes.
The connected whole-effect exporter still rejects this branched source.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct

from unicorn.arm64_const import UC_ARM64_REG_X0, UC_ARM64_REG_X20, UC_ARM64_REG_X27, UC_ARM64_REG_X28, UC_ARM64_REG_PC

from emulate_particle_assignment import ParticleAssignmentReference
from prepare_diagnostic import EXPECTED_NATIVE
from inspect_bmb import read_bmb
from bmb_playback_fields import attach_playback_fields
from emulate_zscreen_locator import HEAP, SIN, COS

QUAD_SELECTOR = (0x2014d80, 136)
QUAD_TEXTURED = (0x2005180, 892)
QUAD_TWO_TEXTURES = (0x2005500, 1156)
# Straight-line original transfer blocks, not complete phase execution.
POST_POSITION_COPY = (0x1fed0e8, 28)
MAKE_POSITION_COPY = (0x2020c70, 36)


class QuadAssignmentReference(ParticleAssignmentReference):
    parameter_type = 2
    parameter_bytes = 2128
    entry = (0x20136b4, 5832)
    profile = {'count': (0x2012570, 3208), 'work': (0x20131fc, 1204)}
    alpha_offset = 640
    # InitConstFlat reads the two inline source color vectors at +0x68/+0x78;
    # ConstFlat only advances the shared record cursor by twelve bytes.
    extra_init_suffixes = ('InitConstFlat',)
    extra_update_suffixes = ('ConstFlat',)
    vertex_functions = (QUAD_SELECTOR, QUAD_TEXTURED, QUAD_TWO_TEXTURES, POST_POSITION_COPY, MAKE_POSITION_COPY)
    # Same explicit float32 libc adapters as the independent native locator.
    external_math = {SIN: math.sin, COS: math.cos}

    def __init__(self, apk):
        super().__init__(apk)
        for function, (address, size) in dict(assign=self.entry, **self.profile).items():
            token = {'assign': '12AssignModule', 'count': '14GetModuleCount',
                     'work': '17GetModuleWorkSize'}[function]
            if not any(s['address'] == address and s['size'] == size
                       and '12QuadSetupper' in s['name'] and token in s['name']
                       for s in self.symbols):
                raise ValueError('Pinned Quad function identity differs')

    def probe_chain(self, cpu, call, param, phases, work_bytes, probe):
        host = probe.get('vertexHost')
        if host is not None and type(host.get('placementFromUpdate', False)) is not bool:
            raise ValueError('placementFromUpdate must be an explicit boolean')
        if host is not None and host.get('placementFromUpdate'):
            probe = dict(probe, updateParent=dict(origin=host.get('center', []), basis=host.get('parentBasis', [])))
        return super().probe_chain(cpu, call, param, phases, work_bytes, probe)

    def write_vertices(self, cpu, call, param, record, phases, consumed, host):
        allowed = ('7scaling11make_vertex8Velocity',
                   '11translation11make_vertex5Const', '11translation11make_vertex8Velocity',
                   '13geometry_quad11make_vertex12SimpleSquare',
                   '14transform_quad16ModuleParamTableINS0_3bmb5param4QuadEE17MakeVertexDefault',
                   '10uv_scaling11ModuleTableILi2EE15MakeVertexConst',
                   '12uv_transform11ModuleTableILi1EE22MakeVertexTransform___',
                   '12uv_transform11ModuleTableILi2EE22MakeVertexTransform___',
                   '12uv_transform16ModuleParamTableILi2ENS0_3bmb5param4QuadEE22MakeVertexTransformS__',
                   '5alpha11make_vertex5Const', '6color411make_vertex9ConstFlat')
        if any(not any(fragment in m['symbols'][0] for fragment in allowed) for m in phases['make']):
            raise ValueError('Unreviewed Quad make chain')
        for field, length in (('center', 3), ('groupScale', 3), ('parentBasis', 9)):
            if len(host.get(field, [])) != length or not all(math.isfinite(v) for v in host[field]):
                raise ValueError('Quad geometry requires explicit finite ' + field)
        if host.get('textureTint') != [1, 1, 1, 1] or host.get('textureTint2') != [1, 1, 1, 1]:
            raise ValueError('Quad geometry probe requires explicit neutral tint fixtures for both layers')
        if not host.get('textureBindings', {}).get('texture1'):
            raise ValueError('Quad geometry probe requires explicit source texture bindings')
        make, draw, basis, joint, output = (HEAP + o for o in (0xd000, 0xd400, 0xd500, 0xd600, 0xe000))
        cpu.mem_write(make, bytes(0x300))
        for offset, pointer in ((0, record), (0x10, param), (0x30, draw), (0x58, joint), (0x60, basis)):
            cpu.mem_write(make + offset, struct.pack('<Q', pointer))
        cpu.mem_write(basis, struct.pack('<9f', *host['parentBasis']))
        cpu.mem_write(joint, struct.pack('<3f', *host['groupScale']))
        cpu.mem_write(make + 0x98, struct.pack('<3f', *host['center']))
        if host.get('placementFromUpdate'):
            primitive = HEAP + 0xd900
            cpu.mem_write(primitive, bytes(32))
            cpu.mem_write(primitive + 0x18, struct.pack('<Q', record))
            # Original PostUpdate stores UpdateContext.f4/f8/fc in the live
            # primitive; original VertexMaker loads that primitive into .98.
            cpu.reg_write(UC_ARM64_REG_X28, HEAP + 0x9000)
            cpu.reg_write(UC_ARM64_REG_X20, primitive)
            for (address, size), setup in ((POST_POSITION_COPY, None), (MAKE_POSITION_COPY, primitive)):
                if setup is not None:
                    cpu.reg_write(UC_ARM64_REG_X0, setup)
                    cpu.reg_write(UC_ARM64_REG_X27, make)
                cpu.emu_start(address, address + size, count=32)
                if cpu.reg_read(UC_ARM64_REG_PC) != address + size:
                    raise ValueError('Incomplete original Quad position handoff')
            center = list(struct.unpack('<3f', cpu.mem_read(make + 0x98, 12)))
        else:
            center = host['center']
        cpu.mem_write(make + 0x164, struct.pack('<f', 1))
        cpu.mem_write(make + 0x144, struct.pack('<4f', *host['textureTint']))
        cpu.mem_write(make + 0x154, struct.pack('<4f', *host['textureTint2']))
        # Native UV modules index layers with a 35-float (0x8c-byte) stride.
        for offset in (0x188, 0x214):
            cpu.mem_write(make + offset, struct.pack('<4f', 0, 0, 1, 1))
        for module in phases['make']:
            call(int(module['address'], 16), (make,))
        cursor = struct.unpack('<I', cpu.mem_read(make + 8, 4))[0]
        if cursor != consumed:
            raise ValueError('Quad make cursor differs from full init/update consumption')
        for index, offset in enumerate((0x40, 0x50)):
            name = host['textureBindings'].get('texture' + str(index + 1))
            pointer = 0
            if name is not None:
                encoded = name.encode('utf-8') + b'\0'
                if len(encoded) > 128:
                    raise ValueError('Quad texture binding name exceeds probe limit')
                pointer = HEAP + 0xd700 + 128 * index
                cpu.mem_write(pointer, encoded)
            cpu.mem_write(param + offset, struct.pack('<Q', pointer))
        cpu.mem_write(draw + 0x80, struct.pack('<I', 1))
        call(QUAD_SELECTOR[0], (0, param, draw))
        writer = cpu.reg_read(UC_ARM64_REG_X0)
        if writer not in (QUAD_TEXTURED[0], QUAD_TWO_TEXTURES[0]):
            raise ValueError('Original Quad selector requested an unsupported writer')
        stride = 40 if writer == QUAD_TEXTURED[0] else 64
        guard = b'\xcd' * 32
        cpu.mem_write(output, bytes(6 * stride) + guard)
        call(writer, (make, output, stride))
        raw = bytes(cpu.mem_read(output, 6 * stride + 32))
        if raw[6 * stride:] != guard:
            raise ValueError('Quad writer exceeded six packed vertices')
        vertices = []
        for index in range(6):
            start = index * stride
            vertex = dict(position=list(struct.unpack_from('<3f', raw, start)),
                          rgba=list(raw[start + 12:start + 16]),
                          uv=list(struct.unpack_from('<2f', raw, start + 16)),
                          textureTint=list(struct.unpack_from('<4f', raw, start + 24)))
            if stride == 64:
                vertex.update(uv2=list(struct.unpack_from('<2f', raw, start + 40)),
                              textureTint2=list(struct.unpack_from('<4f', raw, start + 48)))
            if not all(math.isfinite(v) for values in vertex.values() for v in values):
                raise ValueError('Nonfinite Quad vertex output')
            vertices.append(vertex)
        return dict(writer=hex(writer), stride=stride, makeCursor=cursor, data=vertices,
                    center=center, placementFromUpdate=bool(host.get('placementFromUpdate')),
                    boundary='Native Quad make/writer; optional native update/primitive position handoff, explicit parent/basis and neutral tint fixtures; not full source parent traversal')

    def source_geometry_cases(self, path, host):
        raw = path.read_bytes()
        cases = []
        for node in read_bmb(raw)['nodes']:
            if node['typeId'] != self.parameter_type:
                continue
            curve = node['alphaCurve']
            probe = dict(alphaCurve=raw[curve['dataOffset']:curve['dataOffset'] + len(curve['keys']) * 20] if curve['keys'] else b'',
                         vertexHost=dict(host, textureBindings={k: v['name'] if v else None
                             for k, v in node['resourceBindings'].items()}))
            cases.append(dict(source=path.name, sourceSha256=hashlib.sha256(raw).hexdigest(),
                              node=node['index'], result=self.run(raw[node['offset']:node['offset'] + node['bytes']], probe)))
        return cases


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', type=Path, required=True)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--probe-chains', action='store_true',
                        help='Execute complete admitted init/update lists; no Quad writer or traversal')
    parser.add_argument('--geometry-host', type=Path,
                        help='Explicit controlled geometry host JSON; executes original make/writer, not whole-source traversal')
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must remain under tools/data')
    reference = QuadAssignmentReference(args.apk)
    host = json.loads(args.geometry_host.read_text(encoding='utf-8')) if args.geometry_host else None
    cases = reference.source_geometry_cases(args.source, host) if host is not None else reference.source_cases(args.source, probe=args.probe_chains)
    raw = args.source.read_bytes()
    nodes = read_bmb(raw)['nodes']
    attach_playback_fields(raw, nodes)
    result = dict(approved=False, nativeSha256=EXPECTED_NATIVE,
                  entry=hex(reference.entry[0]), codeSha256=reference.code_hash,
                  probeChains=args.probe_chains or host is not None, geometryHost=host, wholeEffectExported=False,
                  vertexFunctions={hex(a): dict(bytes=n, sha256=hashlib.sha256(reference.image.read(a,n)).hexdigest())
                      for a,n in reference.vertex_functions} if host is not None else {},
                  profileFunctions=reference.profile_identities, cases=cases,
                  sourceInventory=[dict(node=n['index'], type=n['typeId'],
                      parent=n['parentIndex'], children=n['children'],
                      generation=n['generation'], life=n['lifeParameter'],
                      resources=n.get('resourceBindings', {})) for n in nodes],
                  boundary='Quad module evidence with optional controlled-host make/writer; all source nodes inventoried, no whole-tree playback or publication')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps({'sourceNodes': len(nodes), 'selectedQuadNodes': len(cases), 'wholeEffectExported': False, 'moduleCounts': {
        phase: sum(len(c['result']['phases'][phase]) for c in cases)
        for phase in ('init', 'update', 'make')}}))
