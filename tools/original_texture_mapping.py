"""Prepare explicit Basic single-texture UV capabilities for research playback.

Vectors/pivots come from verified IBMB fields. Mapping and missing motion modes
are supplemented only by an explicitly matching authoring project.
"""
import xml.etree.ElementTree as ET
from inspect_bmb import compare_project


def attach_basic_texture_mapping(result, project=None):
    comparison = compare_project(result, project) if project is not None else None
    sources = ET.fromstring(project).findall('.//ResIdeNode')[1:] if project is not None else None
    report = {'authoringComparison': comparison, 'supportedNodes': [], 'unsupportedNodes': []}
    for i, node in enumerate(result['nodes']):
        bindings = node.get('resourceBindings', {})
        if not bindings.get('texture1') or bindings.get('texture2'):
            continue
        issues, modes = [], {}
        source = sources[i] if sources is not None else None
        if source is None:
            issues.append('single-texture mapping/motion modes lack an authoring supplement')
        else:
            if source.findtext('Texture_Basic_TextureDrawType') != 'Basic':
                issues.append('single-texture combination is not verified Basic')
            if source.findtext('Texture1_MappingType') != 'Basic':
                issues.append('non-Basic texture mapping unsupported')
            if source.findtext('Texture_Layer1_TextureAnimationType') != 'Crop':
                issues.append('texture pattern animation unsupported')
            if source.findtext('Texture_Layer1_TextureCropAnimationType') != '_1x1':
                issues.append('texture crop animation unsupported')
            for axis in 'XY':
                if source.findtext('Texture1_Animation_Reverse' + axis + '_SwitchStateType') != 'Off':
                    issues.append('texture reverse animation unsupported')
            for group, tag in [('translation', 'Translate'), ('rotation', 'Rotate'), ('scale', 'Scale')]:
                mode = source.findtext('Texture1_' + tag + '_MotionType')
                modes[group] = mode
                channel = 'texture1' + group.title() + ('Speed' if mode == 'CurveSpeed' else 'Value')
                if mode not in ['Constant', 'NewtonDynamics', 'CurveValue', 'CurveSpeed']:
                    issues.append('unknown texture ' + group + ' mode')
                elif mode.startswith('Curve') and not node['vectorCurves'].get(channel, {}).get('keys'):
                    issues.append('selected texture ' + group + ' curve unavailable')
            rotation = node['staticVectors']['texture1']['rotation']
            if any(any(values[:2]) for values in rotation.values()):
                issues.append('only 2D texture Z rotation is supported')
            if modes['rotation'] in ['CurveValue', 'CurveSpeed']:
                issues.append('texture rotation curves require separate capability')
        node['basicTextureMapping'] = {'supported': not issues, 'motionModes': modes,
                                       'origin': 'Explicit BMSLN after known-field comparison',
                                       'limitations': issues}
        if issues:
            report['unsupportedNodes'].append({'node': i, 'reasons': issues})
        else:
            report['supportedNodes'].append(i)
    return report
