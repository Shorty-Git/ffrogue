"""Verified raw initial/range vectors, selected motion modes and resource slots.

Values retain authoring units. No simulation, random sampling, inheritance or
material behavior is evaluated. Missing mode entries remain unverified.
"""
import math
import struct
import hashlib
import xml.etree.ElementTree as ET


GROUPS = (('translation', 'Translate'), ('rotation', 'Rotate'), ('scale', 'Scale'))
FIELDS = (('valueInitial', 'Value_Initial'), ('valueRange', 'Value_Range'),
          ('speedInitial', 'Speed_Initial'), ('speedRange', 'Speed_Range'),
          ('accelerationInitial', 'Acceleration_Initial'), ('accelerationRange', 'Acceleration_Range'))
BASES = {
    0: {'transform': 340},
    2: {'transform': 732, 'texture1': 972, 'texture2': 1200},
    3: {'transform': 636, 'texture1': 876, 'texture2': 1104},
    6: {'transform': 700, 'texture1': 940, 'texture2': 1168},
}
MODE_NAMES = {0: 'Constant', 1: 'NewtonDynamics', 2: 'CurveValue', 3: 'CurveSpeed'}
MODE_TAGS = {
    'translation': 'Translate_Basic_TranslateType', 'rotation': 'Rotate_Basic_RotateType',
    'scale': 'Scale_Basic_ScaleType', 'texture1Translation': 'Texture1_Translate_MotionType',
    'texture1Scale': 'Texture1_Scale_MotionType',
}
# Each enabled slot was identified using varying source modes, not just defaults.
MODE_OFFSETS = {
    0: {'translation': 556, 'rotation': 656, 'scale': 660},
    2: {'translation': 1416, 'scale': 1716},
    3: {'translation': 1320, 'texture1Translation': 1800},
    6: {'translation': 1384, 'scale': 1684, 'texture1Translation': 1864, 'texture1Scale': 1872},
}
BINDINGS = {
    'model': ('model', 'Model_Basic_ModelName'),
    'texture1': ('texture', 'Texture_Layer1_PictureName'),
    'texture2': ('texture', 'Texture_Layer2_PictureName'),
}
BINDING_OFFSETS = {
    0: {}, 2: {'texture1': 64, 'texture2': 80}, 3: {'texture1': 64, 'texture2': 80},
    6: {'model': 64, 'texture1': 80, 'texture2': 96},
}


def vector(data, offset):
    values = list(struct.unpack_from('<3f', data, offset))
    if not all(math.isfinite(v) for v in values):
        raise ValueError('Non-finite IBMB fixed vector')
    return values


def read_parameters(data, node):
    kind, start = node['typeId'], node['offset']
    if kind not in BASES:
        return
    domains = {}
    pivots = {}
    for domain, base in BASES[kind].items():
        groups = {}
        for group_index, (group, _) in enumerate(GROUPS):
            groups[group] = {
                name: vector(data, start + base + group_index * 72 + index * 12)
                for index, (name, _) in enumerate(FIELDS)
            }
        domains[domain] = groups
        if domain != 'transform':
            pivots[domain] = vector(data, start + base - 12)
    modes = {}
    for name, offset in MODE_OFFSETS[kind].items():
        value = struct.unpack_from('<I', data, start + offset)[0]
        modes[name] = {'id': value, 'name': MODE_NAMES.get(value, 'Unknown'), 'fieldOffset': start + offset}
    node.update(staticVectors=domains, texturePivots=pivots, motionModes=modes)


def read_bindings(data, node, resources, strings):
    if node['typeId'] not in BINDING_OFFSETS:
        return
    result = {}
    for slot, offset in BINDING_OFFSETS[node['typeId']].items():
        field = node['offset'] + offset
        reference = struct.unpack_from('<Q', data, field)[0]
        if reference == 0xffffffffffffffff:
            result[slot] = None
            continue
        kind = BINDINGS[slot][0]
        matches = [r for r in resources if r['kind'] == kind and r['stringOffset'] == strings + reference]
        if len(matches) != 1:
            raise ValueError('Dangling or ambiguous IBMB resource binding: ' + slot)
        resource = matches[0]
        result[slot] = {'kind': kind, 'name': resource['name'], 'resourceIndex': resource['index'],
                        'fieldOffset': field, 'stringOffset': resource['stringOffset']}
    node['resourceBindings'] = result


def compare_parameters(node, source):
    if any(key not in node for key in ['staticVectors', 'texturePivots', 'motionModes', 'resourceBindings']):
        raise ValueError('Unverified IBMB node parameter layout')
    vector_count = 0
    for domain, groups in node['staticVectors'].items():
        prefix = '' if domain == 'transform' else domain.capitalize() + '_'
        for group, source_group in GROUPS:
            for field, source_field in FIELDS:
                tag = prefix + source_group + '_' + source_field
                element = source.find(tag)
                if element is None:
                    raise ValueError('Missing BMSLN fixed-vector property: ' + tag)
                expected = [float(element.attrib[axis]) for axis in 'XYZ']
                if struct.pack('<3f', *groups[group][field]) != struct.pack('<3f', *expected):
                    raise ValueError('BMB/BMSLN fixed vector differs: ' + tag)
                vector_count += 1
    for domain, value in node['texturePivots'].items():
        tag = domain.capitalize() + '_PivotPoint_Value_Initial'
        element = source.find(tag)
        if element is None or struct.pack('<3f', *value) != struct.pack('<3f', *[float(element.attrib[a]) for a in 'XYZ']):
            raise ValueError('BMB/BMSLN texture pivot differs: ' + tag)
        vector_count += 1
    for name, mode in node['motionModes'].items():
        if mode['name'] == 'Unknown' or mode['name'] != source.findtext(MODE_TAGS[name]):
            raise ValueError('BMB/BMSLN motion mode differs: ' + name)
    for slot, (_, tag) in BINDINGS.items():
        expected = source.findtext(tag) or None
        binding = node['resourceBindings'].get(slot)
        actual = binding['name'] if binding else None
        if expected != actual:
            raise ValueError('BMB/BMSLN resource slot differs: ' + slot)
    return {'staticVectorsChecked': vector_count, 'motionModesChecked': len(node['motionModes']),
            'bindingSlotsChecked': len(node['resourceBindings']),
            'nonemptyBindingsChecked': sum(v is not None for v in node['resourceBindings'].values())}


def compare_parameter_project(result, project):
    """Explicit partial comparison: fixed values/modes/slots, not curves or hierarchy."""
    xml = ET.fromstring(project)
    nodes = xml.findall('.//ResIdeNode')
    if not nodes or nodes[0].findtext('Basic_Meta_Name'):
        raise ValueError('Expected the verified leading BMSLN default-node template')
    nodes = nodes[1:]
    if len(nodes) != len(result['nodes']):
        raise ValueError('BMB/BMSLN node count differs')
    totals = {'staticVectorsChecked': 0, 'motionModesChecked': 0,
              'bindingSlotsChecked': 0, 'nonemptyBindingsChecked': 0}
    for node, source in zip(result['nodes'], nodes):
        if node['type'] != source.findtext('Basic_Meta_NodeType'):
            raise ValueError('BMB/BMSLN node order or type differs')
        for name, count in compare_parameters(node, source).items():
            totals[name] += count
    return {'scope': 'fixed vectors, selected modes and resource slots only',
            'projectSha256': hashlib.sha256(project).hexdigest(),
            'nodesChecked': len(nodes), 'checks': totals, 'match': True}
