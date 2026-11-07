"""Annotate reviewed uniform-texture flash roles; never infer a native screen flag."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image


def annotate(plan):
    """The caller explicitly opts into treating uniform Particle planes as flashes."""
    count = 0
    for effect in plan['effects']:
        for node in effect['nodes']:
            binding = node.get('resourceBindings', {})
            first = binding.get('texture1')
            if node['typeId'] != 3 or not first or binding.get('texture2') or binding.get('model'):
                continue
            if node.get('materialControls', {}).get('textureCombination', {}).get('name') != 'Basic':
                continue
            source = plan['files'][effect['textures'][first['name']]]
            path = Path(source['path'])
            if hashlib.sha256(path.read_bytes()).hexdigest() != source['sha256']:
                raise ValueError('Flash texture identity changed')
            with Image.open(path) as image:
                extrema = image.convert('RGBA').getextrema()
            if any(low != high for low, high in extrema) or extrema[3] != (255, 255):
                continue
            node['presentationCoverage'] = dict(region='arena', textureSha256=source['sha256'],
                origin='Reviewed uniform Particle flash adaptation; not an original BMB screen-space flag')
            count += 1
    return count


def annotate_arena_surfaces(plan, roles):
    """Explicit reviewed dimming roles only, never all uniformly textured models."""
    for role in roles:
        matches=[effect for effect in plan['effects'] if effect['sha256']==role['sourceSha256']]
        if len(matches)!=1 or role.get('role') not in ['dimming','uniform-background'] or not role.get('reason'):
            raise ValueError('Unique source identity and reviewed dimming role required')
        effect=matches[0];node=effect['nodes'][role['node']];binding=node.get('resourceBindings',{})
        if node['typeId']!=6 or not binding.get('model') or not binding.get('texture1') or binding.get('texture2'):
            raise ValueError('Single-textured rectangular Model required')
        mesh=effect['meshes'][binding['model']['name']]
        positions=sorted(v['position'] for v in mesh['vertices'])
        expected=sorted([[x,y,0] for x in [-.5,.5] for y in [-.5,.5]])
        if positions!=expected or mesh['triangleCount']!=2 or len({tuple(v['colorBytes']) for v in mesh['vertices']})!=1:
            raise ValueError('Uniform unit XY rectangle geometry required')
        source=plan['files'][effect['textures'][binding['texture1']['name']]]
        path=Path(source['path'])
        if hashlib.sha256(path.read_bytes()).hexdigest()!=source['sha256']:raise ValueError('Dimming texture identity changed')
        with Image.open(path) as image:extrema=image.convert('RGBA').getextrema()
        if any(low!=high for low,high in extrema) or extrema[3]!=(255,255):
            raise ValueError('Uniform opaque texture required for arena dimming')
        node['presentationCoverage']=dict(region='arena',primitive='unit-xy-model',textureSha256=source['sha256'],
            modelSha256=mesh['sourceSha256'],origin=role['reason'])
    return len(roles)


FFBE_LOGICAL_WIDTH = 640


def _unit_xy_uniform(effect, node, plan):
    """Shared geometry/texture gate of reviewed arena surfaces; returns the coverage or None."""
    binding = node.get('resourceBindings', {})
    if node['typeId'] != 6 or not binding.get('model') or not binding.get('texture1') or binding.get('texture2'):
        return None
    mesh = effect['meshes'].get(binding['model']['name'])
    if not mesh:
        return None
    positions = sorted(v['position'] for v in mesh['vertices'])
    expected = sorted([[x, y, 0] for x in [-.5, .5] for y in [-.5, .5]])
    if positions != expected or mesh['triangleCount'] != 2 or len({tuple(v['colorBytes']) for v in mesh['vertices']}) != 1:
        return None
    source = plan['files'][effect['textures'][binding['texture1']['name']]]
    path = Path(source['path'])
    if hashlib.sha256(path.read_bytes()).hexdigest() != source['sha256']:
        raise ValueError('Backdrop texture identity changed')
    with Image.open(path) as image:
        extrema = image.convert('RGBA').getextrema()
    if any(low != high for low, high in extrema) or extrema[3] != (255, 255):
        return None
    return dict(region='arena', primitive='unit-xy-model', textureSha256=source['sha256'], modelSha256=mesh['sourceSha256'])


def _static_identity(node):
    """No animated or randomized transform: the node's frame is fixed relative to its parent."""
    if any(curve.get('keys') for curve in node.get('vectorCurves', {}).values()):
        return False
    transform = node.get('staticVectors', {}).get('transform', {})
    for channel in transform.values():
        for key, value in channel.items():
            if key != 'valueInitial' and any(value):
                return False
    return not any(transform.get(name, {}).get('valueInitial', [0, 0, 0]) != [0, 0, 0] for name in ['translation', 'rotation'])


def annotate_screen_backdrops(plan):
    """Generic rule: a static uniform unit-XY Model in a screen-anchored effect whose authored
    width covers the whole FFBE logical screen (640) is a full-screen backdrop (dimming/tint).
    The game's battlefield is larger than FFBE's, so these surfaces are fitted to the visible
    battlefield instead of keeping their source size. Colour and alpha curves stay source data."""
    count = 0
    for index, effect in enumerate(plan['effects']):
        members = [m for m in plan['members'] if m['effect'] == index]
        if not members or any(m.get('anchor') != 'screen' or m.get('placement', {}).get('rectangle', 'screen') != 'screen' for m in members):
            continue
        nodes = effect['nodes']
        for node in nodes:
            if node.get('presentationCoverage'):
                continue
            coverage = _unit_xy_uniform(effect, node, plan)
            # Static frame; only the (constant) authored scale may differ from identity.
            if not coverage or not _static_identity(node):
                continue
            width = node['staticVectors']['transform']['scale']['valueInitial'][0] * min(m.get('scalePercent', 100) for m in members) / 100
            parent, chain = node.get('parentIndex'), True
            while parent is not None:
                ancestor = nodes[parent]
                if ancestor['typeId'] != 0 or not _static_identity(ancestor) or ancestor['staticVectors']['transform']['scale']['valueInitial'] != [1, 1, 1]:
                    chain = False
                    break
                parent = ancestor.get('parentIndex')
            if not chain or width < FFBE_LOGICAL_WIDTH:
                continue
            node['presentationCoverage'] = dict(coverage, origin='Automatic screen backdrop: static uniform unit-XY Model, '
                f'screen-anchored, authored width {width:g} >= FFBE logical width {FFBE_LOGICAL_WIDTH}; fitted to the visible battlefield')
            count += 1
    return count


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan', type=Path, required=True)
    parser.add_argument('--arena-surfaces',type=json.loads,default=[])
    parser.add_argument('--skip-particles',action='store_true')
    parser.add_argument('--screen-backdrops',action='store_true',help='Apply the generic screen backdrop rule')
    args = parser.parse_args()
    plan = json.loads(args.plan.read_text(encoding='utf-8'))
    count = (0 if args.skip_particles else annotate(plan))+annotate_arena_surfaces(plan,args.arena_surfaces)
    if args.screen_backdrops:
        count += annotate_screen_backdrops(plan)
    print(json.dumps(dict(plan=plan, flashPlanes=count)))
