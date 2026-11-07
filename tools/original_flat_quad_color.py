"""Opt-in source-checked ConstFlat RGB; alpha is a separate native module."""
import hashlib
import xml.etree.ElementTree as ET
from bmb_quad_colors import attach_quad_colors, compare_quad_colors


def quad_color_preparation_hints(raw, result):
    """Intake guidance only; unknown/curved/non-flat data never grants admission."""
    decoded = {'nodes': [dict(n) for n in result['nodes']]}
    attach_quad_colors(raw, decoded)
    required, unsupported = [], []
    for node in decoded['nodes']:
        if node['typeId'] != 2:
            continue
        q = node['quadColors']
        if q['mode'] != 'Constant' or not q['flat']:
            unsupported.append(dict(node=node['index'], mode=q['mode'], flat=q['flat']))
        elif q['corners']['leftTop']['value'][:3] != [1, 1, 1] or any(q['corners']['leftTop']['range'][:3]):
            required.append(node['index'])
    return dict(flatRgbNodes=required, preparationArguments=['--flat-quad-rgb'] if required else [],
                outsideFlatRgbProfile=unsupported, wholeEffectAdmitted=False)


def attach_flat_quad_color(raw, result, project):
    if project is None:
        raise ValueError('Flat Quad RGB requires exact matching authoring')
    sources = ET.fromstring(project).findall('.//ResIdeNode')[1:]
    if len(sources) != len(result['nodes']):
        raise ValueError('Flat Quad RGB source hierarchy differs')
    # Do not add the older RGBA shader metadata: it multiplies corner alpha,
    # unlike the proven native RGB-only InitConstFlat/make_vertex path.
    decoded = {'nodes': [dict(n) for n in result['nodes']]}
    attach_quad_colors(raw, decoded)
    for node, colors, xml in zip(result['nodes'], decoded['nodes'], sources):
        if node['typeId'] != 2:
            continue
        compare_quad_colors(colors, xml)
        q = colors['quadColors']
        if q['mode'] != 'Constant' or not q['flat']:
            raise ValueError('Flat Quad RGB profile rejects curves/non-flat colors')
        left = q['corners']['leftTop']
        if any(not 0 <= v <= 1 for k in ['value', 'range'] for v in left[k][:3]):
            raise ValueError('Flat Quad RGB outside measured bounds')
        node['flatQuadColor'] = dict(profile='native-flat-quad-rgb-v1',
            mode='Constant', flat=True, value=left['value'][:3], range=left['range'][:3],
            valueOffset=left['fieldOffset'], rangeOffset=left['fieldOffset']+16,
            projectSha256=hashlib.sha256(project).hexdigest(),
            boundary='Source RGB inputs; independent alpha; seed ownership remains host policy')
