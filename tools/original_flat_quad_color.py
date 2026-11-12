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
    import bmb_channels
    approximate = bmb_channels.APPROXIMATED_CURVES is not None
    if project is None and not approximate:
        raise ValueError('Flat Quad RGB requires exact matching authoring')
    # Authoring-free approximation: the binary ConstFlat RGB is used without the BMSLN cross-check.
    sources = [None] * len(result['nodes']) if approximate else ET.fromstring(project).findall('.//ResIdeNode')[1:]
    if len(sources) != len(result['nodes']):
        raise ValueError('Flat Quad RGB source hierarchy differs')
    # Do not add the older RGBA shader metadata: it multiplies corner alpha,
    # unlike the proven native RGB-only InitConstFlat/make_vertex path.
    decoded = {'nodes': [dict(n) for n in result['nodes']]}
    attach_quad_colors(raw, decoded)
    for node, colors, xml in zip(result['nodes'], decoded['nodes'], sources):
        if node['typeId'] != 2:
            continue
        if xml is not None:
            compare_quad_colors(colors, xml)
        q = colors['quadColors']
        corners = list(q['corners'].values())
        gradient = len({tuple(c['value']) for c in corners}) > 1
        if approximate and q['mode'] == 'Constant' and not q['flat'] and gradient and not any(any(c['range']) for c in corners):
            # Constant corner gradient (2026-11-12): the four source corner RGBA values are interpolated across
            # the Quad (the player's corner-colour attribute). Before, opaque gradients were flattened to their
            # mean and gradients with corner alpha kept a white tint: the glowing border of the Limit Burst
            # frames (opaque colour fading to transparent black) showed as solid bars.
            bmb_channels.APPROXIMATED_CURVES.append({'node': node['index'], 'quadColors': 'Constant-corners',
                'treatment': 'corner-gradient-rgba'})
            node['quadColors'] = q
            continue
        if (approximate and q['mode'] == 'Constant' and not q['flat']
                and not any(any(c['range']) for c in corners) and all(c['value'][3] == 1 for c in corners)):
            # Constant opaque corner gradient: approximate with the mean corner RGB and record it.
            mean = [sum(c['value'][k] for c in corners) / 4 for k in range(3)]
            bmb_channels.APPROXIMATED_CURVES.append({'node': node['index'], 'quadColors': 'Constant-corners',
                'rgb': [round(v, 4) for v in mean], 'treatment': 'corner-mean-rgb'})
            node['flatQuadColor'] = dict(profile='native-flat-quad-rgb-v1', mode='Constant', flat=True,
                value=mean, range=[0, 0, 0], valueOffset=corners[0]['fieldOffset'], rangeOffset=corners[0]['fieldOffset'] + 16,
                projectSha256=None, boundary='Approximation: mean of constant opaque corner RGB; native corner gradient not evaluated')
            continue
        if q['mode'] != 'Constant' or not q['flat']:
            if approximate:
                bmb_channels.APPROXIMATED_CURVES.append({'node': node['index'], 'quadColors': q['mode'],
                    'flat': q['flat'], 'treatment': 'legacy-preview-tint'})
                continue
            raise ValueError('Flat Quad RGB profile rejects curves/non-flat colors')
        left = q['corners']['leftTop']
        if any(not 0 <= v <= 1 for k in ['value', 'range'] for v in left[k][:3]):
            raise ValueError('Flat Quad RGB outside measured bounds')
        node['flatQuadColor'] = dict(profile='native-flat-quad-rgb-v1',
            mode='Constant', flat=True, value=left['value'][:3], range=left['range'][:3],
            valueOffset=left['fieldOffset'], rangeOffset=left['fieldOffset']+16,
            projectSha256=hashlib.sha256(project).hexdigest() if project is not None else None,
            boundary='Source RGB inputs; independent alpha; seed ownership remains host policy')
