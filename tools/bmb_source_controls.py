"""Bounded binary control fields verified against independent matching projects.

This is not a complete inheritance decoder. Missing fields and unknown enum
values remain explicit; in particular, authoring compatibility is not inferred.
Offsets apply only to the existing verified 01010301 node layouts.
"""
import math
import struct


PROFILE = 'ibmb-parent-controls-v1'
PREFIX = 'Basic_ParentNodeInfluence_'
# Null and drawable rotation selectors have different encodings.
FIELDS = {
    0: {'rotation': (136, {0: 'On', 2: 'Off'}), 'alphaRate': (212, None),
        'nullType': (692, {0: 'Billboard', 1: 'Standard'})},
    2: {'translation': (600, {0: 'On', 1: 'OnGenerateTime'}),
        'rotation': (604, {1: 'On', 2: 'OnGenerateTime'}),
        'scale': (608, {1: 'On', 2: 'OnGenerateTime'}),
        'alphaMode': (612, {0: 'Lerp', 1: 'Multiply'}), 'alphaRate': (512, None)},
    3: {'alphaMode': (516, {0: 'Lerp', 1: 'Multiply'}), 'alphaRate': (412, None)},
    6: {'alphaMode': (580, {0: 'Lerp', 1: 'Multiply'}),
        'alphaRate': (464, None), 'colorRate': (468, None)},
}
TAGS = {
    'translation': PREFIX + 'TranslateParentNodeInfluenceType',
    'rotation': PREFIX + 'RotateParentNodeInfluenceType',
    'scale': PREFIX + 'ScaleParentNodeInfluenceType',
    'matrix': PREFIX + 'MatrixParentNodeInfluenceType',
    'alphaMode': PREFIX + 'AlphaParentNodeInfluenceType',
    'alphaRate': PREFIX + 'ParentAlphaRate',
    'colorRate': PREFIX + 'ParentColorRate',
    'nullType': 'Detail_Basic_NullType',
}
INHERITANCE = ('translation', 'rotation', 'scale', 'matrix', 'alphaMode', 'alphaRate', 'colorRate')

# Additional intake inputs do not rewrite the stable Prepared-plan metadata.
# Confirmed against the extended matched-source corpus, including both selectors.
INTAKE_FIELDS = {
    2: {'colorRate': (516, None)},
    3: {'translation': (504, {0: 'On', 1: 'OnGenerateTime'}),
        'rotation': (508, {1: 'On', 2: 'OnGenerateTime'})},
    6: {'translation': (568, {0: 'On', 1: 'OnGenerateTime'}),
        'scale': (576, {0: 'Off', 1: 'On'})},
}


def read_intake_controls(data, node):
    fields = {}
    for name, (relative, names) in INTAKE_FIELDS.get(node['typeId'], {}).items():
        at = node['offset'] + relative
        raw = struct.unpack_from('<I' if names else '<f', data, at)[0]
        if names is None and (not math.isfinite(raw) or not 0 <= raw <= 1):
            raise ValueError('Invalid intake parent influence rate: ' + name)
        value = names.get(raw) if names else raw
        fields[name] = dict(raw=raw, value=value, fieldOffset=at,
                            status='decoded' if value is not None else 'unknown-enum')
    return fields


def read_source_controls(data, node):
    fields = {}
    for name, (relative, names) in FIELDS.get(node['typeId'], {}).items():
        at = node['offset'] + relative
        raw = struct.unpack_from('<I' if names else '<f', data, at)[0]
        if names is None and (not math.isfinite(raw) or not 0 <= raw <= 1):
            raise ValueError('Invalid binary parent control: ' + name)
        value = names.get(raw) if names else raw
        fields[name] = dict(raw=raw, value=value, fieldOffset=at,
                            status='decoded' if value is not None else 'unknown-enum')
    node['sourceControls'] = dict(profile=PROFILE, fields=fields,
        missingInheritance=[name for name in INHERITANCE if name not in fields or fields[name]['value'] is None],
        compatibility='unresolved-authoring-to-runtime-mapping',
        boundary='Binary parameters only; no inheritance equation or complete profile admission')
    if node['typeId'] == 0:
        # Original successful-child Initialize references already establish these
        # input locations. They are NOT authoring Version1_5/Version1_6 booleans.
        offsets = {'locator_index': 0x2b4, 'field_c8': 0xc8, 'field_cc': 0xcc}
        parameters = {key: struct.unpack_from('<I', data, node['offset'] + at)[0]
                      for key, at in offsets.items()}
        supported = (parameters['locator_index'] <= 15
                     and parameters['field_c8'] in (0, 1) and parameters['field_cc'] in (0, 1))
        node['nativeInitialization'] = dict(profile='native-null-init-inputs-v1',
            status='supported-inputs' if supported else 'unsupported-inputs', parameters=parameters,
            fieldOffsets={key: node['offset']+at for key,at in offsets.items()},
            requiredContext=['parent_flags', 'child_flags'],
            boundary='Input extraction only; child execution supplies flags, never default zero')


def compare_source_controls(node, source, *, require_all=True, data=None):
    """Compare every decoded field; no source value can select a binary offset."""
    count = 0
    fields = dict(node.get('sourceControls', {}).get('fields', {}))
    if data is not None:
        fields.update(read_intake_controls(data, node))
    for name, field in fields.items():
        expected = source.findtext(TAGS[name])
        if expected is None:
            if require_all:
                raise ValueError('Missing source control: ' + name)
            continue
        if field['status'] != 'decoded':
            import bmb_channels
            if bmb_channels.APPROXIMATED_CURVES is None:
                raise ValueError('Unresolved binary parent control enum: ' + name)
            # Explicit approximation mode: take the matching authoring project's named value for
            # this node only; the stable enum tables stay unchanged.
            bmb_channels.APPROXIMATED_CURVES.append({'control': name, 'raw': field['raw'],
                                                     'authoring': expected, 'treatment': 'authoring-value'})
            field.update(value=expected, status='authoring-approximated')
            continue
        definition = {**FIELDS.get(node['typeId'], {}), **INTAKE_FIELDS.get(node['typeId'], {})}[name]
        if definition[1] is None and (not math.isfinite(float(expected)) or not 0 <= float(expected) <= 1):
            raise ValueError('Invalid parent influence rate')
        equal = (struct.pack('<f', float(expected)) == struct.pack('<f', field['value'])
                 if definition[1] is None else expected == field['value'])
        if not equal:
            raise ValueError('BMB/BMSLN source control differs: ' + name)
        count += 1
    return count


def control_coverage(nodes, data=None):
    """Machine-readable input provenance, never an automatic playback approval."""
    rows = []
    for n in nodes:
        fields = dict(n.get('sourceControls', {}).get('fields', {}))
        if data is not None:
            fields.update(read_intake_controls(data, n))
        rows.append(dict(node=n['index'], typeId=n['typeId'], fields=fields,
             missing=[name for name in INHERITANCE if fields.get(name, {}).get('value') is None],
             compatibility='unresolved', otherRequiredInputs=[
                 'emission-shape', 'appearance-selection', 'texture-tint/mapping', 'geometry-selectors'],
             initialization=n.get('nativeInitialization')))
    return dict(profile=PROFILE, authoringFreeInheritanceComplete=False,
                intakeExtension=data is not None, nodes=rows)
