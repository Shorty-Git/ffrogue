"""Verified legacy IBMB vector-key layouts; no curve evaluation or unit conversion."""
import math
import struct


KEY_TYPES = {0: 'Constant', 1: 'Linear', 2: 'Spline', 3: 'BreakSpline'}
CHANNELS = {
    'translationValue': ('Translate_Value_Curve', 'XYZ', 'KeyframeVector3d'),
    'translationSpeed': ('Translate_Speed_Curve', 'XYZ', 'KeyframeVector3d'),
    'rotationValue': ('Rotate_Value_Curve', 'XYZ', 'KeyframeVector3d'),
    'rotationSpeed': ('Rotate_Speed_Curve', 'XYZ', 'KeyframeVector3d'),
    'scaleValue': ('Scale_Value_Curve', 'XYZ', 'KeyframeVector3d'),
    'scaleSpeed': ('Scale_Speed_Curve', 'XYZ', 'KeyframeVector3d'),
    'texture1TranslationSpeed': ('Texture1_Translate_Speed_Curve', 'XYZ', 'KeyframeVector3d'),
    'texture1ScaleValue': ('Texture1_Scale_Value_Curve', 'XYZ', 'KeyframeVector3d'),
    'centerColor': ('Color_Center_Curve', 'RGB', 'KeyframeColorRgb'),
    'vertexTopLeftColor': ('Color_VertexLeftTop_Curve', 'RGB', 'KeyframeColorRgb'),
}
# Only offsets located through nonempty source curves are included. Missing
# entries are unverified channels, not implicit zero/constant channels.
CHANNEL_OFFSETS = {
    0: {'translationValue': 560, 'translationSpeed': 576, 'rotationValue': 592,
        'rotationSpeed': 608, 'scaleValue': 624, 'scaleSpeed': 640, 'centerColor': 672},
    2: {'translationValue': 1424, 'translationSpeed': 1440, 'scaleValue': 1488, 'vertexTopLeftColor': 1728},
    3: {'translationSpeed': 1344, 'texture1TranslationSpeed': 1440, 'centerColor': 1632},
    6: {'translationValue': 1392, 'translationSpeed': 1408, 'scaleValue': 1456,
        'texture1TranslationSpeed': 1504, 'texture1ScaleValue': 1552, 'centerColor': 1696},
}


def read_vector_curve(data, parameters, field, axes):
    count, relative = struct.unpack_from('<QQ', data, field)
    result = {'fieldOffset': field, 'axes': list(axes), 'keys': []}
    if not count:
        return result
    if count > 65536 or relative == 0xffffffffffffffff:
        raise ValueError('Invalid IBMB vector curve reference')
    start = parameters + relative
    if start + count * 52 > len(data):
        raise ValueError('Truncated IBMB vector curve')
    result['dataOffset'] = start
    for index in range(count):
        offset = start + index * 52
        values = struct.unpack_from('<3I10f', data, offset)
        ids, floats = values[:3], values[3:]
        if not all(math.isfinite(v) for v in floats):
            raise ValueError('Non-finite IBMB vector keyframe')
        frame = floats[9]
        if result['keys'] and frame < result['keys'][-1]['frame']:
            raise ValueError('Unordered IBMB vector keyframes')
        result['keys'].append({
            'offset': offset, 'typeIds': list(ids),
            'types': [KEY_TYPES.get(kind, 'Unknown') for kind in ids],
            'slopeLeft': list(floats[:3]), 'slopeRight': list(floats[3:6]),
            'value': list(floats[6:9]), 'frame': frame,
        })
    return result


def compare_vector_curves(node, source):
    """Compare raw axis key data exactly after float32 authoring conversion."""
    checked = {}
    for channel, curve in node['vectorCurves'].items():
        tag, axes, key_tag = CHANNELS[channel]
        array = source.find(tag + '/KeyFrameArray')
        source_keys = list(array) if array is not None else []
        if len(source_keys) != len(curve['keys']):
            raise ValueError('BMB/BMSLN vector key count differs: ' + channel)
        for key, source_key in zip(curve['keys'], source_keys):
            if source_key.tag != key_tag:
                raise ValueError('Unverified source key layout: ' + source_key.tag)
            if key['types'] != source_key.attrib['ElementKeyframeType'].split():
                raise ValueError('BMB/BMSLN vector interpolation types differ: ' + channel)
            expected = {
                'slopeLeft': [float(v) for v in source_key.attrib['ElementSlopeL'].split()],
                'slopeRight': [float(v) for v in source_key.attrib['ElementSlopeR'].split()],
                'value': [float(source_key.find('Value').attrib[axis]) for axis in axes],
            }
            for field, values in expected.items():
                if len(values) != 3 or struct.pack('<3f', *key[field]) != struct.pack('<3f', *values):
                    raise ValueError('BMB/BMSLN vector key data differs: ' + channel + '/' + field)
            if struct.pack('<f', key['frame']) != struct.pack('<f', float(source_key.attrib['Frame'])):
                raise ValueError('BMB/BMSLN vector key position differs: ' + channel)
        if source_keys:
            checked[channel] = len(source_keys)
    # A successful comparison must not overlook an active source curve simply
    # because this node type has no verified offset for that channel yet.
    supported_tags = {CHANNELS[c][0] for c in node['vectorCurves']} | {'Blend_Basic_Curve'}
    for element in source:
        array = element.find('KeyFrameArray')
        if array is not None and len(array) and element.tag not in supported_tags:
            raise ValueError('Unverified active source curve channel: ' + element.tag)
    return checked
