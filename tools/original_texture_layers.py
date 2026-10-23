"""Authoring supplements for the isolated two-texture experiment.

These are BMSLN values, not newly decoded BMB fields. Require a full comparison
of the supported binary/project categories before attaching any supplement.
"""
import math
import xml.etree.ElementTree as ET
from inspect_bmb import compare_project


def attach_texture_layers(result, project):
    comparison = compare_project(result, project)
    sources = ET.fromstring(project).findall('.//ResIdeNode')[1:]
    count = 0
    for node, source in zip(result['nodes'], sources):
        node['authoringEmissionShape'] = source.findtext('GenerateShape_Basic_GenerateShapeType')
        if node.get('materialControls', {}).get('textureCombination', {}).get('name') != 'Add':
            continue
        if not node['resourceBindings'].get('texture2'):
            continue
        layers = {}
        for layer in [1, 2]:
            prefix = f'Texture{layer}_'
            def numbers(tag, axes):
                values = [float(source.find(prefix + tag).attrib[a]) for a in axes]
                if not all(math.isfinite(v) for v in values):
                    raise ValueError('Non-finite texture layer value')
                return values
            for channel in ['Rgb', 'Alpha']:
                if source.findtext(prefix + f'Color_Scale_{channel}_MotionType') != 'Constant':
                    raise ValueError('Animated texture color is not supported by this experiment')
            for group in ['Translate', 'Rotate', 'Scale']:
                if source.findtext(prefix + group + '_MotionType') not in ['Constant', 'NewtonDynamics']:
                    raise ValueError('Animated texture curves require a separate capability')
            if source.findtext(prefix + 'MappingType') != 'Basic' or source.findtext(f'Texture_Layer{layer}_TextureCropAnimationType') != '_1x1':
                raise ValueError('Only basic unanimated texture mapping is supported')
            alpha = [float(source.findtext(prefix + f'Color_Scale_Alpha_Value_{term}')) for term in ['Initial','Range']]
            if not all(math.isfinite(v) for v in alpha):
                raise ValueError('Non-finite texture alpha')
            layers[f'texture{layer}'] = {
                'rgbInitial': numbers('Color_Scale_Rgb_Value_Initial', 'RGB'),
                'rgbRange': numbers('Color_Scale_Rgb_Value_Range', 'RGB'),
                'alphaInitial': alpha[0], 'alphaRange': alpha[1],
                'motionModes': {g.lower().replace('translate','translation').replace('rotate','rotation'):
                                source.findtext(prefix + g + '_MotionType') for g in ['Translate','Rotate','Scale']},
            }
        node['authoringTextureLayers'] = layers
        count += 1
    return {**comparison, 'supplementedAddNodes': count,
            'origin': 'BMSLN authoring supplement; not decoded binary fields'}
