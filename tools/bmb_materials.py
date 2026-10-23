"""Selected source-verified material controls; no shader/blend equation emulation."""
import math
import struct


CONTROLS = {
    'colorMode': ('Color_Basic_ColorType', {0: 'Constant', 1: 'Curve'}),
    'blend': ('Blend_Basic_BlendType', {1: 'Semitrans', 2: 'SemiAdd'}),
    'alphaMode': ('Blend_Basic_BlendAlphaType', {0: 'Constant', 1: 'Curve'}),
    'alphaTest': ('Blend_Basic_AlphaTestType', {0: 'Less', 2: 'Greater'}),
    'textureCombination': ('Texture_Basic_TextureDrawType', {0: 'Basic', 2: 'Add'}),
    'texture1Address': ('Texture_Layer1_TextureAddressType', {0: 'Clamp', 1: 'Repeat', 2: 'Mirror'}),
    'texture2Address': ('Texture_Layer2_TextureAddressType', {0: 'Clamp', 1: 'Repeat', 2: 'Mirror'}),
}
OFFSETS = {
    0: {'colorMode': 664, 'alphaMode': 688},
    2: {'colorMode': 1720, 'blend': 1824, 'alphaMode': 1828, 'textureCombination': 1840, 'texture1Address': 1844, 'texture2Address': 1848},
    3: {'blend': 1680, 'alphaMode': 1684, 'textureCombination': 1696, 'texture1Address': 1700, 'texture2Address': 1704},
    6: {'colorMode': 1688, 'blend': 1744, 'alphaMode': 1748, 'alphaTest': 1752, 'texture1Address': 1764},
}
ALPHA_OFFSETS = {0: 244, 2: 544, 3: 444, 6: 496}
NODE_ENUM_EXTENSIONS = {(2, 'textureCombination'): {6: 'Distortion'}}


def read_materials(data, node):
    if node['typeId'] not in OFFSETS:
        return
    values = {}
    for name, relative in OFFSETS[node['typeId']].items():
        field = node['offset'] + relative
        code = struct.unpack_from('<I', data, field)[0]
        names = {**CONTROLS[name][1], **NODE_ENUM_EXTENSIONS.get((node['typeId'], name), {})}
        values[name] = {'id': code, 'name': names.get(code, 'Unknown'), 'fieldOffset': field}
    node['materialControls'] = values
    if node['typeId'] in ALPHA_OFFSETS:
        field = node['offset'] + ALPHA_OFFSETS[node['typeId']]
        value = struct.unpack_from('<f', data, field)[0]
        if not math.isfinite(value):
            raise ValueError('Non-finite IBMB material alpha')
        node['materialAlpha'] = {'value': value, 'fieldOffset': field}


def compare_materials(node, source):
    if 'materialControls' not in node:
        raise ValueError('Unverified IBMB material control layout')
    for name, value in node['materialControls'].items():
        if value['name'] == 'Unknown' or value['name'] != source.findtext(CONTROLS[name][0]):
            raise ValueError('BMB/BMSLN material control differs: ' + name)
    if 'materialAlpha' in node:
        if struct.pack('<f', node['materialAlpha']['value']) != struct.pack('<f', float(source.findtext('Blend_Basic_Alpha'))):
            raise ValueError('BMB/BMSLN material alpha differs')
    return {'materialEnumsChecked': len(node['materialControls']),
            'materialAlphaValuesChecked': int('materialAlpha' in node)}
