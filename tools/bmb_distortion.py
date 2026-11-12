"""Selected source-checked Quad and Particle fields of the distortion material.

Particle layout (2026-11-12): the Quad offsets shifted by -96 (tints, midpoint) and -144 (colour
curves, mode enums), checked against matched authoring of bm_2035_flare_bg and bm_2044_artema_bg
(tools/test_bmb_distortion.py). The Quad UV-speed curve has no checked Particle counterpart.
"""
import struct
from bmb_channels import read_vector_curve
from bmb_parameters import MODE_NAMES, vector

QUAD_MODES = {'texture1Translation':1944,'texture1Rotation':1948,'texture1Scale':1952,
              'texture2Translation':1964,'texture2Rotation':1968,'texture2Scale':1972}
COLOR_MODES = {'texture1':1936,'texture2':1956}
LAYOUTS = {
    2: {'tints': {'texture1': 248, 'texture2': 280}, 'curves': {'texture1': 1792, 'texture2': 1808}, 'midpoint': 948,
        'colorModes': COLOR_MODES, 'motionModes': QUAD_MODES, 'uvSpeed': 1632},
    3: {'tints': {'texture1': 152, 'texture2': 184}, 'curves': {'texture1': 1648, 'texture2': 1664}, 'midpoint': 852,
        'colorModes': {name: offset - 144 for name, offset in COLOR_MODES.items()},
        'motionModes': {name: offset - 144 for name, offset in QUAD_MODES.items()}, 'uvSpeed': None},
}


def attach_distortion_fields(raw, result):
    parameters = struct.unpack_from('<I', raw, 92)[0]
    for node in result['nodes']:
        layout = LAYOUTS.get(node['typeId'])
        if not layout:
            continue
        start = node['offset']
        layers = {}
        for layer, color_offset in layout['tints'].items():
            mode_id = struct.unpack_from('<I',raw,start+layout['colorModes'][layer])[0]
            curve = read_vector_curve(raw,parameters,start+layout['curves'][layer],'RGB')
            layers[layer] = {'rgbInitial':vector(raw,start+color_offset),
                             'rgbRange':vector(raw,start+color_offset+16),
                             'colorMode':MODE_NAMES.get(mode_id,'Unknown'), 'colorCurve':curve}
        modes = {}
        for name,offset in layout['motionModes'].items():
            code = struct.unpack_from('<I',raw,start+offset)[0]
            modes[name] = {'id':code,'name':MODE_NAMES.get(code,'Unknown'),'fieldOffset':start+offset}
        node['distortionFields'] = {'midpoint':vector(raw,start+layout['midpoint']),'layers':layers,'motionModes':modes}
        if layout['uvSpeed'] is not None:
            node['distortionFields'].update({'texture2TranslationSpeed':read_vector_curve(raw,parameters,start+layout['uvSpeed'],'XYZ'),
                'uvSpeedLayoutStatus':'Candidate quad channel: valid vector-key layout, no nonempty authoring counterpart found'})


def compare_distortion_fields(node, source):
    """Check decoded raw values against one corresponding authoring node."""
    fields = node['distortionFields']
    checked = 0
    def same(values, expected):
        if struct.pack('<3f',*values) != struct.pack('<3f',*expected):
            raise ValueError('BMB/BMSLN distortion vector differs')
    same(fields['midpoint'],[float(source.find('Texture_Material_Distortion_DisplacementMap_MidValue_Value_Initial').attrib[a])for a in 'XYZ'])
    for layer,values in fields['layers'].items():
        prefix=layer.capitalize()+'_'
        for field,term in [('rgbInitial','Initial'),('rgbRange','Range')]:
            same(values[field],[float(source.find(prefix+'Color_Scale_Rgb_Value_'+term).attrib[a])for a in 'RGB'])
        if values['colorMode']!=source.findtext(prefix+'Color_Scale_Rgb_MotionType'):
            raise ValueError('BMB/BMSLN texture color mode differs')
        # Compare exact float32 keys without expanding the general reader's support.
        tag=prefix+'Color_Scale_Rgb_Value_Curve'
        expected=source.findall(tag+'/KeyFrameArray/*');actual=values['colorCurve']['keys']
        if len(expected)!=len(actual):raise ValueError('Texture color curve count differs')
        for key,xml in zip(actual,expected):
            if key['types']!=xml.attrib['ElementKeyframeType'].split():raise ValueError('Texture color interpolation differs')
            for field,attribute in [('slopeLeft','ElementSlopeL'),('slopeRight','ElementSlopeR')]:
                same(key[field],[float(v)for v in xml.attrib[attribute].split()])
            same(key['value'],[float(xml.find('Value').attrib[a])for a in 'RGB'])
            if struct.pack('<f',key['frame'])!=struct.pack('<f',float(xml.attrib['Frame'])):raise ValueError('Texture color time differs')
        checked+=len(actual)
    for name,value in fields['motionModes'].items():
        layer=name[:8].capitalize();group=name[8:].replace('Translation','Translate').replace('Rotation','Rotate')
        if value['name']!=source.findtext(layer+'_'+group+'_MotionType'):raise ValueError('Texture motion mode differs: '+name)
    return checked
