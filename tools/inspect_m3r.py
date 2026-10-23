"""Inspect the verified single-material BR3M subset; preserve original mesh data.

Effekseer comparison is restricted to the observed version-6 single-frame files.
It verifies a converted counterpart, not original-game rendering fidelity.
"""
import argparse
import hashlib
import json
import math
import struct
from pathlib import Path


def read_m3r(data):
    if len(data) < 64 or data[:4] != b'BR3M':
        raise ValueError('Expected a complete BR3M header')
    version, materials, reserved = struct.unpack_from('<III', data, 4)
    if version not in (34, 35) or materials != 1 or reserved != 0:
        raise ValueError('Unverified BR3M version or material layout')
    names, material, indices, vertices, tail, end, end_copy = struct.unpack_from('<7I', data, 16)
    if not 64 <= names < material < indices <= vertices <= tail <= end == end_copy == len(data):
        raise ValueError('Invalid BR3M section boundaries')
    if indices - material != 88:
        raise ValueError('Unverified BR3M material record size')
    name_end = data.find(b'\0', names, material)
    if name_end < 0:
        raise ValueError('Unterminated BR3M embedded texture name')
    texture_name = data[names:name_end].decode('utf-8')
    stride, vertex_count, base, index_count = struct.unpack_from('<4I', data, material + 32)
    if stride != 36 or base != 0 or not 0 < vertex_count <= 65536 or index_count % 3:
        raise ValueError('Unverified BR3M vertex/index layout')
    # Both payload sections are padded to a multiple of 16 bytes in these files;
    # padding is relative to section length, not absolute file alignment.
    padded_indices = (index_count * 2 + 15) // 16 * 16
    padded_vertices = (vertex_count * stride + 15) // 16 * 16
    if indices + padded_indices != vertices or vertices + padded_vertices != tail:
        raise ValueError('Truncated or inconsistent BR3M geometry')
    points = []
    for index in range(vertex_count):
        offset = vertices + index * stride
        values = struct.unpack_from('<3fI5f', data, offset)
        if not all(math.isfinite(v) for v in values[:3] + values[4:]):
            raise ValueError('Non-finite BR3M vertex attribute')
        points.append({'position': list(values[:3]), 'colorBytes': list(data[offset + 12:offset + 16]),
                       'normal': list(values[4:7]), 'uv': list(values[7:9])})
    raw_indices = struct.unpack_from('<' + 'H' * index_count, data, indices)
    if any(index >= vertex_count for index in raw_indices):
        raise ValueError('Out-of-range BR3M vertex index')
    triangles = [list(raw_indices[i:i + 3]) for i in range(0, index_count, 3)]
    return {'schemaVersion': 1, 'sourceSha256': hashlib.sha256(data).hexdigest(),
            'version': version, 'embeddedTextureName': texture_name,
            'vertexCount': vertex_count, 'triangleCount': len(triangles),
            'vertices': points, 'triangles': triangles,
            'bounds': {axis: [min(v['position'][i] for v in points), max(v['position'][i] for v in points)]
                       for i, axis in enumerate('XYZ')},
            'notDecoded': ['material record behavior', 'trailing metadata', 'other BR3M layouts'],
            'rendered': False}


def compare_effekseer(mesh, data):
    if len(data) < 24 or struct.unpack_from('<4I', data) != (6, 0x3f800000, 1, 1):
        raise ValueError('Unverified Effekseer model header')
    count = struct.unpack_from('<I', data, 16)[0]
    faces_at = 20 + count * 68
    if count != mesh['vertexCount'] or faces_at + 4 > len(data):
        raise ValueError('Effekseer vertex count or size differs')
    face_count = struct.unpack_from('<I', data, faces_at)[0]
    if face_count != mesh['triangleCount'] or faces_at + 4 + face_count * 12 != len(data):
        raise ValueError('Effekseer triangle count or size differs')
    for index, vertex in enumerate(mesh['vertices']):
        offset = 20 + index * 68
        for key, location, components in [('position', offset, 3), ('normal', offset + 12, 3)]:
            if struct.pack('<' + 'f' * components, *vertex[key]) != data[location:location + components * 4]:
                raise ValueError('Effekseer vertex attribute differs: ' + key)
        expected_uv = struct.pack('<2f', vertex['uv'][0], 1.0 - vertex['uv'][1])
        if expected_uv != data[offset + 48:offset + 56]:
            raise ValueError('Effekseer UVs differ from the observed V reversal')
        if bytes(vertex['colorBytes']) != data[offset + 64:offset + 68]:
            raise ValueError('Effekseer packed vertex colors differ')
    for index, triangle in enumerate(mesh['triangles']):
        counterpart = struct.unpack_from('<3I', data, faces_at + 4 + index * 12)
        if tuple(reversed(triangle)) != counterpart:
            raise ValueError('Effekseer triangles differ from the observed winding reversal')
    return {'sha256': hashlib.sha256(data).hexdigest(), 'verticesChecked': count,
            'trianglesChecked': face_count, 'positionsNormalsColorsMatch': True,
            'counterpartReversesV': True, 'counterpartReversesWinding': True,
            'notCompared': ['generated tangents/binormals', 'second UV coordinates', 'rendering']}


def write_obj(mesh, destination):
    lines = ['# Original BR3M coordinates, UV values and triangle winding; no material simulation.']
    for vertex in mesh['vertices']:
        lines.append('v ' + ' '.join(format(v, '.9g') for v in vertex['position']))
    for vertex in mesh['vertices']:
        lines.append('vt ' + ' '.join(format(v, '.9g') for v in vertex['uv']))
    for vertex in mesh['vertices']:
        lines.append('vn ' + ' '.join(format(v, '.9g') for v in vertex['normal']))
    for triangle in mesh['triangles']:
        lines.append('f ' + ' '.join(f'{v + 1}/{v + 1}/{v + 1}' for v in triangle))
    destination.write_text('\n'.join(lines) + '\n', encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--compare-effekseer', type=Path)
    parser.add_argument('--obj', action='store_true')
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to((Path.cwd() / 'tools/data').resolve()):
        raise ValueError('Output must be inside tools/data')
    inputs = {args.source.resolve()}
    if args.compare_effekseer:
        inputs.add(args.compare_effekseer.resolve())
    outputs = {args.output.resolve()}
    if args.obj:
        outputs.add(args.output.with_suffix('.obj').resolve())
    if inputs & outputs:
        raise ValueError('Output must not overwrite an original input')
    mesh = read_m3r(args.source.read_bytes())
    mesh['source'] = str(args.source)
    if args.compare_effekseer:
        mesh['counterpartComparison'] = compare_effekseer(mesh, args.compare_effekseer.read_bytes())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(mesh, indent=2), encoding='utf-8')
    if args.obj:
        write_obj(mesh, args.output.with_suffix('.obj'))
    print(json.dumps({key: mesh[key] for key in ['vertexCount', 'triangleCount', 'embeddedTextureName']}))
