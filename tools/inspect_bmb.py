"""Read the verified structural subset of legacy FFBE IBMB files.

Block structure, hierarchy, resource tables, lifetime parameters and scalar
alpha keyframes are decoded for four verified node types. Selected transform,
color and UV vector-key channels, fixed transform/UV vectors, selected motion
modes and resource slots are decoded. Curve evaluation, other channels, material
behavior, models and rendering are not decoded.
The layout and keyframe data were checked against seven original
BMB/BMSLN pairs. Other format versions fail rather than guessing their layout.
"""
import argparse
import hashlib
import json
import math
import struct
import xml.etree.ElementTree as ET
from pathlib import Path
from bmb_channels import CHANNELS, CHANNEL_OFFSETS, KEY_TYPES, compare_vector_curves, read_vector_curve
from bmb_parameters import compare_parameters, compare_parameter_project, read_bindings, read_parameters
from bmb_materials import compare_materials, read_materials


VERSION = bytes.fromhex('01010301')
NODE_TYPES = {0: 'ControlNull', 2: 'EmitterQuad', 3: 'EmitterParticle', 6: 'EmitterModel'}
NODE_SIZES = {0: 704, 2: 2128, 3: 1840, 6: 1904}
LIFE_OFFSETS = {0: 128, 2: 348, 3: 248, 6: 300}
ALPHA_CURVE_OFFSETS = {0: 280, 2: 640, 3: 544, 6: 608}
SCALAR_KEY_TYPES = KEY_TYPES


def read_scalar_curve(data, parameters, field):
    count, relative = struct.unpack_from('<QQ', data, field)
    if count == 0:
        return {'fieldOffset': field, 'keys': []}
    if count > 65536 or relative == 0xffffffffffffffff:
        raise ValueError('Invalid IBMB scalar curve reference')
    start = parameters + relative
    if start + count * 20 > len(data):
        raise ValueError('Truncated IBMB scalar curve')
    keys = []
    for index in range(count):
        offset = start + index * 20
        kind, left, right, value, frame = struct.unpack_from('<I4f', data, offset)
        if not all(math.isfinite(v) for v in [left, right, value, frame]):
            raise ValueError('Non-finite IBMB scalar keyframe')
        if keys and frame < keys[-1]['frame']:
            raise ValueError('Unordered IBMB scalar keyframes')
        keys.append({'offset': offset, 'typeId': kind,
                     'type': SCALAR_KEY_TYPES.get(kind, 'Unknown'),
                     'slopeLeft': left, 'slopeRight': right, 'value': value, 'frame': frame})
    return {'fieldOffset': field, 'dataOffset': start, 'keys': keys}


def read_hierarchy(data, nodes, parameters):
    if any(n['typeId'] not in NODE_TYPES for n in nodes):
        return {'decoded': False, 'reason': 'Unknown node type'}
    stack = []
    for index, node in enumerate(nodes):
        first, count, relative = struct.unpack_from('<QQQ', data, node['offset'] + 8)
        if first != count or count >= len(nodes):
            raise ValueError('Invalid IBMB child count')
        if count and (relative == 0xffffffffffffffff or parameters + relative + count * 8 > len(data)):
            raise ValueError('Truncated IBMB child-pointer storage')
        while stack and stack[-1][1] == 0:
            stack.pop()
        if index and not stack:
            raise ValueError('Unexpected second IBMB root')
        parent = stack[-1][0] if stack else None
        node.update(parentIndex=parent, children=[], childCount=count)
        if parent is not None:
            nodes[parent]['children'].append(index)
            stack[-1][1] -= 1
        if count:
            stack.append([index, count])
    if any(remaining for _, remaining in stack):
        raise ValueError('Incomplete IBMB hierarchy')
    return {'decoded': True, 'rootIndex': 0 if nodes else None,
            'method': 'Preorder blocks and verified child counts; pointer-storage values not interpreted'}


def read_bmb(data):
    if len(data) < 96 or data[:4] != b'IBMB':
        raise ValueError('Expected an original IBMB binary with a complete header')
    if data[4:8] != VERSION:
        raise ValueError('Unsupported IBMB version: ' + data[4:8].hex())
    strings, parameters = struct.unpack_from('<II', data, 88)
    if not 96 <= strings <= parameters <= len(data):
        raise ValueError('Invalid IBMB section boundaries')
    nodes, cursor = [], 96
    while cursor < strings:
        if cursor + 8 > strings:
            raise ValueError('Truncated IBMB node header')
        kind, size = struct.unpack_from('<II', data, cursor)
        if size < 8 or size % 4 or cursor + size > strings:
            raise ValueError('Invalid IBMB node size at ' + str(cursor))
        if kind in NODE_SIZES and size != NODE_SIZES[kind]:
            raise ValueError('Unverified IBMB node layout at ' + str(cursor))
        node = {'index': len(nodes), 'offset': cursor, 'bytes': size,
                'typeId': kind, 'type': NODE_TYPES.get(kind, 'Unknown')}
        if kind in LIFE_OFFSETS:
            life, life_range = struct.unpack_from('<II', data, cursor + LIFE_OFFSETS[kind])
            # These are source parameters, not a computed effect duration.
            node.update(lifeParameter=life, lifeRangeParameter=life_range)
            node['alphaCurve'] = read_scalar_curve(data, parameters, cursor + ALPHA_CURVE_OFFSETS[kind])
            node['vectorCurves'] = {
                name: read_vector_curve(data, parameters, cursor + offset, CHANNELS[name][1])
                for name, offset in CHANNEL_OFFSETS[kind].items()
            }
            read_parameters(data, node)
            read_materials(data, node)
        nodes.append(node)
        cursor += size
    hierarchy = read_hierarchy(data, nodes, parameters)
    resources = []
    for kind, count_at, table_at in [('texture', 16, 32), ('model', 20, 36)]:
        count = struct.unpack_from('<I', data, count_at)[0]
        relative = struct.unpack_from('<I', data, table_at)[0]
        if not count:
            continue
        if count > 65536 or relative == 0xffffffff:
            raise ValueError('Invalid IBMB resource table')
        table = parameters + relative
        if table + count * 8 > len(data):
            raise ValueError('Truncated IBMB resource table')
        for index in range(count):
            offset = struct.unpack_from('<Q', data, table + index * 8)[0]
            position = strings + offset
            if position >= parameters or (offset and data[position - 1] != 0):
                raise ValueError('Invalid IBMB resource string offset')
            end = data.find(b'\0', position, parameters)
            if end == -1:
                raise ValueError('Unterminated IBMB resource name')
            name = data[position:end].decode('utf-8')
            if not name or any(c in name for c in '/\\\0') or name in ('.', '..'):
                raise ValueError('Invalid IBMB resource basename')
            resources.append({'kind': kind, 'index': index, 'name': name,
                              'stringOffset': position, 'tableOffset': table + index * 8})
    for node in nodes:
        read_bindings(data, node, resources, strings)
    return {
        'schemaVersion': 1, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
        'magic': 'IBMB', 'versionBytes': data[4:8].hex(),
        'flagsRaw': struct.unpack_from('<I', data, 8)[0],
        'sections': {'nodes': 96, 'strings': strings, 'parameters': parameters},
        'uninterpretedHeaderCounts': list(struct.unpack_from('<II', data, 24)),
        'nodes': nodes, 'hierarchy': hierarchy, 'resources': resources,
        'decoded': ['node block boundaries', 'four verified node type IDs',
                    'life and life-range parameters for verified node types',
                    'preorder hierarchy when all node types are verified',
                    'scalar alpha keyframe data for verified node types',
                    'selected transform, color and UV vector keyframe channels',
                    'fixed transform and two texture-layer vectors and pivots',
                    'selected motion modes and per-emitter texture/model slots',
                    'selected material enum controls and null/quad/model/particle alpha constants',
                    'texture and model name tables'],
        'notDecoded': ['generation timing', 'unmapped curve channels and motion modes',
                       'curve evaluation and time-domain semantics', 'other static/material parameters',
                       'unmapped material controls and blend equations', 'other resource categories'],
        'externalModelGeometry': 'Separate inspect_m3r.py subset; not loaded or rendered by this BMB reader',
        'rendered': False,
    }


def compare_project(result, project):
    """Verify this subset against a matching source project; never infer fields."""
    xml = ET.fromstring(project)
    source_nodes = xml.findall('.//ResIdeNode')
    if not source_nodes or source_nodes[0].findtext('Basic_Meta_Name'):
        raise ValueError('Expected the verified leading BMSLN default-node template')
    source_nodes = source_nodes[1:]
    if len(source_nodes) != len(result['nodes']):
        raise ValueError('BMB/BMSLN node count differs')
    wrappers = [e for e in xml.iter() if e is not xml and e.find('ResIdeNode') is not None]
    if len(wrappers) != len(source_nodes):
        raise ValueError('Unexpected BMSLN hierarchy wrappers')
    wrapper_indexes = {id(e): i for i, e in enumerate(wrappers)}
    expected_parents = {}
    for index, wrapper in enumerate(wrappers):
        for child in wrapper.findall('ChildList/*'):
            if id(child) not in wrapper_indexes:
                raise ValueError('Unknown BMSLN child wrapper')
            expected_parents[wrapper_indexes[id(child)]] = index
    keys_checked = 0
    curves_checked = 0
    vector_channel_checks = {}
    parameter_checks = {'staticVectorsChecked': 0, 'motionModesChecked': 0,
                        'bindingSlotsChecked': 0, 'nonemptyBindingsChecked': 0}
    material_checks = {'materialEnumsChecked': 0, 'materialAlphaValuesChecked': 0}
    for node, source in zip(result['nodes'], source_nodes):
        for field, count in compare_materials(node, source).items():
            material_checks[field] += count
        for field, count in compare_parameters(node, source).items():
            parameter_checks[field] += count
        expected_type = source.findtext('Basic_Meta_NodeType')
        if node['type'] != expected_type:
            raise ValueError('BMB/BMSLN node order or type differs at ' + str(node['index']))
        for key, tag in [('lifeParameter', 'Basic_Basic_Life'),
                         ('lifeRangeParameter', 'Basic_Basic_LifeRange')]:
            if node.get(key) != int(source.findtext(tag)):
                raise ValueError('BMB/BMSLN lifetime parameter differs at ' + str(node['index']))
        if not result['hierarchy']['decoded'] or node['parentIndex'] != expected_parents.get(node['index']):
            raise ValueError('BMB/BMSLN parent differs at ' + str(node['index']))
        source_keys = source.findall('Blend_Basic_Curve/KeyFrameArray/KeyframeFloat')
        keys = node['alphaCurve']['keys']
        if len(keys) != len(source_keys):
            raise ValueError('BMB/BMSLN alpha key count differs at ' + str(node['index']))
        if keys:
            curves_checked += 1
        for key, source_key in zip(keys, source_keys):
            if key['type'] != source_key.attrib['ElementKeyframeType']:
                raise ValueError('BMB/BMSLN alpha interpolation type differs')
            expected = {
                'slopeLeft': source_key.attrib['ElementSlopeL'],
                'slopeRight': source_key.attrib['ElementSlopeR'],
                'frame': source_key.attrib['Frame'], 'value': source_key.findtext('Value'),
            }
            for field, value in expected.items():
                # Compare exact float32 representations of the authoring values.
                if struct.pack('<f', key[field]) != struct.pack('<f', float(value)):
                    raise ValueError('BMB/BMSLN alpha key value differs: ' + field)
            keys_checked += 1
        for channel, count in compare_vector_curves(node, source).items():
            stats = vector_channel_checks.setdefault(channel, {'curves': 0, 'keys': 0})
            stats['curves'] += 1
            stats['keys'] += count
    project_resources = set()
    for node in source_nodes:
        for tag, kind in [('Texture_Layer1_PictureName', 'texture'),
                          ('Texture_Layer2_PictureName', 'texture'),
                          ('Model_Basic_ModelName', 'model')]:
            name = node.findtext(tag)
            if name:
                project_resources.add((kind, name))
    if project_resources != {(r['kind'], r['name']) for r in result['resources']}:
        raise ValueError('BMB/BMSLN texture or model resource sets differ')
    return {'projectSha256': hashlib.sha256(project).hexdigest(),
            'nodesChecked': len(source_nodes), 'nodeOrderAndTypesMatch': True,
            'lifeParametersMatch': True, 'typedResourceSetsMatch': True,
            'hierarchyMatches': True, 'alphaCurvesChecked': curves_checked,
            'alphaKeysChecked': keys_checked, 'alphaKeyDataMatches': True,
            'vectorCurvesChecked': sum(v['curves'] for v in vector_channel_checks.values()),
            'vectorKeysChecked': sum(v['keys'] for v in vector_channel_checks.values()),
            'vectorKeyDataMatches': True, 'vectorChannelChecks': vector_channel_checks,
            'parameterChecks': parameter_checks, 'materialChecks': material_checks}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path)
    projects = parser.add_mutually_exclusive_group()
    projects.add_argument('--project', type=Path, help='Matching BMSLN comparison of every supported category; mismatch fails')
    projects.add_argument('--parameters-project', type=Path, help='Explicit partial BMSLN comparison of fixed values/modes/slots only')
    args = parser.parse_args()
    result = read_bmb(args.source.read_bytes())
    result['source'] = str(args.source)
    if args.project:
        result['projectComparison'] = compare_project(result, args.project.read_bytes())
    if args.parameters_project:
        result['parameterComparison'] = compare_parameter_project(result, args.parameters_project.read_bytes())
    if args.output:
        stage = (Path.cwd() / 'tools/data').resolve()
        if not args.output.resolve().is_relative_to(stage):
            raise ValueError('Output must be inside tools/data')
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    else:
        print(json.dumps(result, indent=2))
