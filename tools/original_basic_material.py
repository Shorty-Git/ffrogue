"""Matched-authoring constant Basic texture tints for the native shader candidate."""
import math
import bmb_channels
from authoring_sources import ApproximateProject, project_sources, project_identity


def attach_basic_material(result, project=None):
    comparison, sources = project_sources(result, project) if project is not None else (None, None)
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
                    rgba = None if bmb_channels.APPROXIMATED_CURVES is not None else rgba
        approximate_tint = False
        if (rgba is None and bmb_channels.APPROXIMATED_CURVES is not None and source is not None
                and node.get('resourceBindings', {}).get('texture1')
                and source.findtext('Texture_Basic_TextureDrawType') == 'Basic'):  # a bound but unused second texture is fine
            # Approximation mode (2026-11-13): the first-texture colour scale multiplies the texture in every
            # native fragment variant, so its initial value is applied also where the fragment is not the pinned
            # Basic family (most SemiAdd Particles and every Model) or the tint is random/animated. Without it
            # such nodes drew untinted (white): eff_3029_weak_red_front node 29 has tint 0.82/0.34/0.22.
            rgb = source.find('Texture1_Color_Scale_Rgb_Value_Initial')
            alpha = source.findtext('Texture1_Color_Scale_Alpha_Value_Initial')
            if rgb is not None and alpha is not None:
                rgba = [float(rgb.attrib[axis]) for axis in 'RGB'] + [float(alpha)]
                if not all(math.isfinite(v) for v in rgba):
                    raise ValueError('Non-finite Basic texture tint')
                approximate_tint = True
                if rgba != [1, 1, 1, 1]:
                    bmb_channels.APPROXIMATED_CURVES.append({'node': node['index'], 'textureTint': [round(v, 4) for v in rgba],
                        'notEvaluated': issues, 'treatment': 'texture-tint-initial-value'})
        node['nativeBasicTint'] = {'supported': not issues, 'rgba': rgba, 'limitations': issues,
                                   **({'approximate': True} if approximate_tint else {}),
                                   'origin': 'Binary IBMB texture tint (bmb_texture_tint.py); authoring-free approximation'
                                             if isinstance(project, ApproximateProject)
                                             else 'Explicit matching BMSLN constant texture color; not decoded BMB tint',
                                   'projectSha256': project_identity(project) if project is not None else None}
    return comparison
