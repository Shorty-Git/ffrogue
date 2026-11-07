"""Matched-authoring constant Basic texture tints for the native shader candidate."""
import hashlib
import math
import xml.etree.ElementTree as ET
from inspect_bmb import compare_project


def attach_basic_material(result, project=None):
    comparison = compare_project(result, project) if project is not None else None
    sources = ET.fromstring(project).findall('.//ResIdeNode')[1:] if project is not None else None
    for index, node in enumerate(result['nodes']):
        if node['typeId'] == 0:
            continue
        source = sources[index] if sources is not None else None
        issues, rgba = [], None
        if not node.get('nativeMaterialSelection', {}).get('basicCandidateCompatible'):
            issues.append('initial native fragment is not the pinned Basic family')
        elif not node.get('resourceBindings', {}).get('texture1'):
            issues.append('explicit first texture required; embedded-texture rendering not enabled')
        elif source is None:
            issues.append('texture tint requires matching authoring')
        else:
            if source.findtext('Texture_Basic_TextureDrawType') != 'Basic':
                issues.append('authoring material is not Basic')
            if any(source.findtext('Texture1_Color_Scale_' + channel + '_MotionType') != 'Constant'
                   for channel in ('Rgb', 'Alpha')):
                issues.append('animated texture tint is outside the constant subset')
            else:
                rgb = source.find('Texture1_Color_Scale_Rgb_Value_Initial')
                rgb_range = source.find('Texture1_Color_Scale_Rgb_Value_Range')
                if rgb is None or rgb_range is None:
                    raise ValueError('Missing Basic texture tint source')
                rgba = [float(rgb.attrib[axis]) for axis in 'RGB'] + [float(source.findtext('Texture1_Color_Scale_Alpha_Value_Initial'))]
                ranges = [float(rgb_range.attrib[axis]) for axis in 'RGB'] + [float(source.findtext('Texture1_Color_Scale_Alpha_Value_Range'))]
                if not all(math.isfinite(v) for v in rgba + ranges):
                    raise ValueError('Non-finite Basic texture tint')
                if any(ranges):
                    issues.append('random texture tint is outside the constant subset')
        node['nativeBasicTint'] = {'supported': not issues, 'rgba': rgba, 'limitations': issues,
                                   'origin': 'Explicit matching BMSLN constant texture color; not decoded BMB tint',
                                   'projectSha256': hashlib.sha256(project).hexdigest() if project is not None else None}
    return comparison
