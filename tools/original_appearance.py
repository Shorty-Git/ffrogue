"""Select active appearance channels without treating stored keys as activation.

This is a research preparation step. Unknown controls and incomplete color
capabilities remain explicit; they do not become approved import recipes.
"""
import hashlib
import math
import struct
import xml.etree.ElementTree as ET
from inspect_bmb import compare_project


def attach_appearance(result, project=None):
    sources = None
    comparison = None
    if project is not None:
        comparison = compare_project(result, project)
        sources = ET.fromstring(project).findall('.//ResIdeNode')[1:]
    report = {'nodes': len(result['nodes']), 'dormantAlphaCurves': [],
              'dormantColorCurves': [], 'limitations': [], 'authoringComparison': comparison,
              'particleColorModeOrigin': 'Explicit matching BMSLN; binary selector unresolved'}
    for i, node in enumerate(result['nodes']):
        source = sources[i] if sources is not None else None
        controls = node['materialControls']
        alpha_mode = controls.get('alphaMode', {}).get('name')
        if alpha_mode not in ['Constant', 'Curve']:
            raise ValueError('Unknown alpha mode at node ' + str(i))
        if alpha_mode == 'Curve' and not node['alphaCurve']['keys']:
            raise ValueError('Selected alpha curve is empty at node ' + str(i))
        alpha = {'mode': alpha_mode, 'origin': 'IBMB', 'value': node['materialAlpha']['value']}
        if alpha_mode == 'Constant' and node['alphaCurve']['keys']:
            report['dormantAlphaCurves'].append(i)
        color_mode = controls.get('colorMode', {}).get('name')
        color = {'mode': color_mode or 'Unresolved', 'origin': 'IBMB' if color_mode else 'Unresolved'}
        issues = []
        if node['typeId'] == 3 and source is not None:
            color['mode'] = source.findtext('Color_Basic_ColorType')
            color['origin'] = 'BMSLN'
            color['projectSha256'] = hashlib.sha256(project).hexdigest()
        if color['mode'] not in ['Constant', 'Curve', 'Unresolved']:
            raise ValueError('Unknown color mode at node ' + str(i))
        if node['typeId'] == 2:
            color['domain'] = 'corners'
            color['supported'] = bool(node.get('quadColors'))
            if not color['supported']:
                issues.append('quad corner color evaluation unavailable; legacy preview tint retained')
        else:
            color['domain'] = 'center'
            color['supported'] = color['mode'] != 'Unresolved'
            color['value'] = node['initialColor']
            if not all(math.isfinite(v) for v in color['value']):
                raise ValueError('Non-finite initial color')
            curve = node['vectorCurves'].get('centerColor', {}).get('keys', [])
            if color['mode'] == 'Curve' and not curve:
                raise ValueError('Selected center color curve is empty at node ' + str(i))
            if color['mode'] == 'Constant' and curve:
                report['dormantColorCurves'].append(i)
            if source is not None:
                value = source.find('Color_Center_Value')
                expected = [float(value.attrib[axis]) for axis in 'RGB']
                if struct.pack('<3f', *expected) != struct.pack('<3f', *color['value']):
                    color['supported'] = False
                    issues.append('initial RGB differs from authoring; legacy preview tint retained')
                ranges = source.find('Color_Center_Range')
                if ranges is not None and any(float(ranges.attrib[a]) for a in 'RGB'):
                    issues.append('RGB random range is not sampled; base color only in this preview')
            else:
                issues.append('RGB random-range support is unverified without authoring')
        if color['mode'] == 'Unresolved':
            issues.append('color selector unresolved; legacy preview tint retained')
        node['appearance'] = {'alpha': alpha, 'color': color, 'limitations': issues}
        report['limitations'].extend({'node': i, 'reason': issue} for issue in issues)
    return report
