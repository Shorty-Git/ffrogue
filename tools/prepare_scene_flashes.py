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
    # Only transform curves move a plane; colour/alpha curves stay source data on the coverage.
    if any(curve.get('keys') for name, curve in node.get('vectorCurves', {}).items()
           if name.startswith(('translation', 'rotation', 'scale'))):
        return False
    transform = node.get('staticVectors', {}).get('transform', {})
    for channel in transform.values():
        for key, value in channel.items():
            if key != 'valueInitial' and any(value):
                return False
    return not any(transform.get(name, {}).get('valueInitial', [0, 0, 0]) != [0, 0, 0] for name in ['translation', 'rotation'])


def _opaque_backdrop_quad(effect, node, plan, nodes, longest):
    """An opaque, constant-colour, uniformly textured Quad held at the screen centre for most
    of the effect replaces the background (e.g. Cloud AC's dark Omnislash backdrop)."""
    binding = node.get('resourceBindings', {})
    if node['typeId'] != 2 or not binding.get('texture1') or binding.get('texture2') or binding.get('model'):
        return None
    alpha = node.get('appearance', {}).get('alpha', {})
    if alpha.get('mode') != 'Constant' or alpha.get('value') != 1 or node.get('materialAlpha', {}).get('value') != 1:
        return None
    if not node.get('flatQuadColor') or not _static_identity(node) or node.get('lifeParameter', 0) < 0.8 * longest:
        return None
    width = node['staticVectors']['transform']['scale']['valueInitial'][0]
    if width < 200:
        return None
    parent = node.get('parentIndex')
    while parent is not None:
        ancestor = nodes[parent]
        # Ancestor translation curves (shake/drift) are replaced by the coverage placement.
        if ancestor['typeId'] != 0 or ancestor['staticVectors']['transform']['scale']['valueInitial'] != [1, 1, 1]:
            return None
        parent = ancestor.get('parentIndex')
    source = plan['files'][effect['textures'][binding['texture1']['name']]]
    path = Path(source['path'])
    if hashlib.sha256(path.read_bytes()).hexdigest() != source['sha256']:
        raise ValueError('Backdrop texture identity changed')
    with Image.open(path) as image:
        extrema = image.convert('RGBA').getextrema()
    if any(low != high for low, high in extrema) or extrema[3] != (255, 255):
        return None
    return dict(region='arena', primitive='unit-quad', textureSha256=source['sha256'],
                origin=f'Automatic screen backdrop: opaque constant-colour uniform Quad (width {width:g}), screen-anchored, '
                       f'life {node.get("lifeParameter")} of {longest} frames; fitted to the visible battlefield')


def _backdrop_particle(effect, node, plan, longest):
    """A uniform Basic Particle held on a screen-anchored effect for most of its life is a
    full-screen dim/tint plane (e.g. Holy's black fade); its colour/alpha stay source data."""
    binding = node.get('resourceBindings', {})
    if node['typeId'] != 3 or not binding.get('texture1') or binding.get('texture2') or binding.get('model'):
        return None
    if node.get('materialControls', {}).get('textureCombination', {}).get('name') != 'Basic':
        return None
    if not _static_identity(node) or node.get('lifeParameter', 0) < 0.8 * longest:
        return None
    source = plan['files'][effect['textures'][binding['texture1']['name']]]
    path = Path(source['path'])
    if hashlib.sha256(path.read_bytes()).hexdigest() != source['sha256']:
        raise ValueError('Backdrop texture identity changed')
    with Image.open(path) as image:
        extrema = image.convert('RGBA').getextrema()
    if any(low != high for low, high in extrema) or extrema[3] != (255, 255):
        return None
    return dict(region='arena', primitive='screen-particle', textureSha256=source['sha256'],
                origin=f'Automatic screen backdrop: uniform Basic Particle on a screen-anchored effect, '
                       f'life {node.get("lifeParameter")} of {longest} frames; fitted to the visible battlefield')


SCREEN_PARTICLE_MIN = 200
FLASH_MAX_LIFE = 60


def _effective_size(node, nodes, members=None):
    """Authored width/height including ControlNull ancestor scales and member scale percent."""
    scale = node['staticVectors']['transform']['scale']['valueInitial']
    width, height = scale[0], scale[0] if node.get('uniformScale') else scale[1]
    parent = node.get('parentIndex')
    while parent is not None:
        ancestor = next((n for n in nodes if n.get('index') == parent), nodes[parent])
        factor = ancestor['staticVectors']['transform']['scale']['valueInitial']
        width, height = width * factor[0], height * factor[1]
        parent = ancestor.get('parentIndex')
    percent = min((m.get('scalePercent', 100) for m in members), default=100) / 100 if members else 1
    return width * percent, height * percent


def _texture_extrema(effect, node, plan):
    source = plan['files'][effect['textures'][node['resourceBindings']['texture1']['name']]]
    path = Path(source['path'])
    if hashlib.sha256(path.read_bytes()).hexdigest() != source['sha256']:
        raise ValueError('Screen surface texture identity changed')
    with Image.open(path) as image:
        return source['sha256'], image.convert('RGBA').getextrema()


def _rows_uniform(effect, node, plan):
    source = plan['files'][effect['textures'][node['resourceBindings']['texture1']['name']]]
    with Image.open(source['path']) as image:
        rgba = image.convert('RGBA')
        width, height = rgba.size
        pixels = rgba.load()
        # Premultiplied: colour under fully transparent texels is invisible; small compression noise is allowed.
        visible = lambda p: (p[0] * p[3] // 255, p[1] * p[3] // 255, p[2] * p[3] // 255, p[3])
        return all(max(abs(a - b) for x in range(width) for a, b in zip(visible(pixels[x, y]), visible(pixels[0, y]))) <= 8
                   for y in range(height))


SCREEN_QUAD_MIN = 300


def _screen_sized_quad(effect, node, plan, nodes, members):
    """A static Quad authored at screen size (>= SCREEN_QUAD_MIN on both axes) on a screen-anchored
    effect is a full-screen layer even with a patterned texture (Delita's Hallowed Bolt: aura and
    speed lines, 360 x 320): at source size it shows as a box. Stretched, the pattern keeps reading
    as the same layer. Colour/alpha curves and blend stay source data."""
    binding = node.get('resourceBindings') or {}
    if node['typeId'] != 2 or not binding.get('texture1') or binding.get('texture2') or binding.get('model'):
        return None
    if not _static_identity(node):
        return None
    parent = node.get('parentIndex')
    while parent is not None:
        ancestor = next((n for n in nodes if n.get('index') == parent), nodes[parent])
        # Ancestor drift/shake curves are replaced by the coverage placement (as for backdrop Quads).
        if ancestor['typeId'] != 0 or ancestor['staticVectors']['transform']['scale']['valueInitial'] != [1, 1, 1]:
            return None
        parent = ancestor.get('parentIndex')
    width, height = _effective_size(node, nodes, members)
    if min(width, height) < SCREEN_QUAD_MIN:
        return None
    sha, _ = _texture_extrema(effect, node, plan)
    return dict(region='arena', primitive='unit-quad', textureSha256=sha,
                origin=f'Automatic screen layer: static Quad authored at screen size ({width:g} x {height:g} >= {SCREEN_QUAD_MIN}) '
                       'on a screen-anchored effect; fitted to the visible battlefield')


SCREEN_MODEL_MIN = 500


def _screen_sized_model(effect, node, plan, nodes, members):
    """A static unit-XY rectangle Model authored at screen size (>= SCREEN_QUAD_MIN on both axes) on a
    screen-anchored effect is a full-screen layer whatever its texture (2026-11-11: enemy skills such as
    Edea's Maelstrom, Chaos's Earthquake and Ultimate Chaos use cloud/aura "board wall" models of
    500-700 x 800 units). At source size they show as a box with a hard edge across the arena; stretched,
    the pattern reads as the same layer. Colour/alpha curves, UV scroll and blend stay source data."""
    binding = node.get('resourceBindings') or {}
    if node['typeId'] != 6 or not binding.get('model') or not binding.get('texture1') or binding.get('texture2'):
        return None
    mesh = effect['meshes'].get(binding['model']['name'])
    if not mesh or mesh['triangleCount'] != 2:
        return None
    if sorted(v['position'] for v in mesh['vertices']) != sorted([[x, y, 0] for x in [-.5, .5] for y in [-.5, .5]]):
        return None
    # Fixed frame: no transform curves or randomness and no rotation; a constant offset is fine (the
    # coverage replaces the placement).
    transform = node.get('staticVectors', {}).get('transform', {})
    if any(curve.get('keys') for name, curve in node.get('vectorCurves', {}).items() if name.startswith(('translation', 'rotation', 'scale'))):
        return None
    if any(any(value) for channel in transform.values() for key, value in channel.items() if key != 'valueInitial'):
        return None
    if transform.get('rotation', {}).get('valueInitial', [0, 0, 0]) != [0, 0, 0]:
        return None
    parent = node.get('parentIndex')
    while parent is not None:
        ancestor = next((n for n in nodes if n.get('index') == parent), nodes[parent])
        if ancestor['typeId'] != 0 or ancestor['staticVectors']['transform']['scale']['valueInitial'] != [1, 1, 1]:
            return None
        parent = ancestor.get('parentIndex')
    width, height = _effective_size(node, nodes, members)
    if min(width, height) < SCREEN_MODEL_MIN:
        return None
    sha, _ = _texture_extrema(effect, node, plan)
    return dict(region='arena', primitive='unit-xy-model', textureSha256=sha, modelSha256=mesh['sourceSha256'],
                origin=f'Automatic screen layer: static unit-XY Model authored at screen size ({width:g} x {height:g} >= {SCREEN_MODEL_MIN}) '
                       'on a screen-anchored effect; fitted to the visible battlefield')


def _screen_sized_particle(effect, node, plan, nodes, members):
    """A static, opaque Basic Particle authored at screen size on a screen-anchored effect is a
    backdrop (Squall's Lion Heart: a black plane and a dark vertical-gradient plane, 360 units).
    Its life may be short against helper ControlNull nodes, so size decides instead of life.
    The texture may vary in colour (gradients); colour/alpha curves stay source data."""
    binding = node.get('resourceBindings', {})
    if node['typeId'] != 3 or not binding.get('texture1') or binding.get('texture2') or binding.get('model'):
        return None
    if node.get('materialControls', {}).get('textureCombination', {}).get('name') != 'Basic' or not _static_identity(node):
        return None
    parent = node.get('parentIndex')
    while parent is not None:
        ancestor = next((n for n in nodes if n.get('index') == parent), nodes[parent])
        if ancestor['typeId'] != 0 or not _static_identity(ancestor):
            return None
        parent = ancestor.get('parentIndex')
    width, height = _effective_size(node, nodes, members)
    if min(width, height) < SCREEN_PARTICLE_MIN:
        return None
    sha, extrema = _texture_extrema(effect, node, plan)
    # Opaque planes, or one-axis gradients (every row uniform, e.g. Great Gospel's top-down darkening):
    # both read the same when stretched across the canvas. Patterned textures stay at source size.
    if extrema[3] != (255, 255) and not _rows_uniform(effect, node, plan):
        return None
    return dict(region='arena', primitive='screen-particle', textureSha256=sha,
                origin=f'Automatic screen backdrop: static Basic Particle (opaque or one-axis gradient) authored at screen size '
                       f'({width:g} x {height:g} >= {SCREEN_PARTICLE_MIN}) on a screen-anchored effect; fitted to the visible battlefield')


def _white_flash_particle(effect, node, plan, nodes):
    """Particle form of the impact flash: plain white texture and colour, alpha curve rising from 0
    to >= 0.8 and back, at most FLASH_MAX_LIFE frames, >= 200 units on both axes. Kept at source size
    it shows as a hard-edged white box (Squall's Lion Heart front node 3, 360 x 320, 40 frames)."""
    binding = node.get('resourceBindings', {})
    if node['typeId'] != 3 or not binding.get('texture1') or binding.get('texture2') or binding.get('model'):
        return None
    if node.get('lifeParameter', 0) > FLASH_MAX_LIFE:
        return None
    color = node.get('appearance', {}).get('color', {})
    if color.get('mode') != 'Constant' or any(channel < 0.95 for channel in color.get('value', [0])):
        return None
    keys = [key['value'] for key in (node.get('alphaCurve') or {}).get('keys', [])]
    if len(keys) < 3 or keys[0] > 0.05 or keys[-1] > 0.05 or max(keys) < 0.8:
        return None
    width, height = _effective_size(node, nodes)
    if min(width, height) < 200:
        return None
    sha, extrema = _texture_extrema(effect, node, plan)
    if any(extreme != (255, 255) for extreme in extrema):
        return None
    return dict(region='arena', primitive='screen-particle', textureSha256=sha,
                origin=f'Automatic impact flash: plain white Particle ({width:g} x {height:g}), life {node.get("lifeParameter")} frames, '
                       'alpha rises and falls; fitted to the visible battlefield instead of a hard-edged box')


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
        longest = max((n.get('lifeParameter', 0) for n in nodes), default=0)
        for node in nodes:
            if node.get('presentationCoverage'):
                continue
            quad = (_opaque_backdrop_quad(effect, node, plan, nodes, longest) or _backdrop_particle(effect, node, plan, longest)
                    or _screen_sized_particle(effect, node, plan, nodes, members)
                    or _screen_sized_quad(effect, node, plan, nodes, members)
                    or _screen_sized_model(effect, node, plan, nodes, members))
            if quad:
                node['presentationCoverage'] = quad
                count += 1
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


def _white_flash_quad(effect, node, plan, nodes):
    """A short, large Quad of plain opaque white (FFBE texture 'white') with a rising-and-falling alpha
    curve is an impact flash. Kept at source size it shows as a hard-edged white box on our wider
    battlefield (Cloud AC's Omnislash V5 node 62, 280 x 280 units), so it covers the visible
    battlefield instead; its alpha curve, blend and timing stay source data."""
    binding = node.get('resourceBindings', {})
    if node['typeId'] != 2 or not binding.get('texture1') or binding.get('texture2') or binding.get('model'):
        return None
    if not node.get('uniformScale') or node.get('lifeParameter', 0) > 30:
        return None
    flat = node.get('flatQuadColor') or {}
    if flat.get('mode') != 'Constant' or any(channel < 0.95 for channel in flat.get('value', [0])):
        return None
    keys = [key['value'] for key in (node.get('alphaCurve') or {}).get('keys', [])]
    if len(keys) < 3 or keys[0] > 0.05 or keys[-1] > 0.05 or max(keys) < 0.8:
        return None
    width = node['staticVectors']['transform']['scale']['valueInitial'][0]
    parent = node.get('parentIndex')
    while parent is not None:
        ancestor = next((n for n in nodes if n.get('index') == parent), nodes[parent])
        width *= ancestor['staticVectors']['transform']['scale']['valueInitial'][0]
        parent = ancestor.get('parentIndex')
    if width < 200:
        return None
    source = plan['files'][effect['textures'][binding['texture1']['name']]]
    path = Path(source['path'])
    if hashlib.sha256(path.read_bytes()).hexdigest() != source['sha256']:
        raise ValueError('Flash texture identity changed')
    with Image.open(path) as image:
        extrema = image.convert('RGBA').getextrema()
    if any(extreme != (255, 255) for extreme in extrema):
        return None
    return dict(region='arena', primitive='unit-quad', textureSha256=source['sha256'],
                origin=f'Automatic impact flash: plain white Quad (effective width {width:g}), life {node.get("lifeParameter")} frames, '
                       'alpha rises and falls; fitted to the visible battlefield instead of a hard-edged box')


def annotate_screen_models(plan):
    """_screen_sized_model for every effect, whatever its anchor: a screen-sized wall anchored on the
    target side (Chaos's Ultimate Chaos) otherwise covers only that side and cuts the arena in two."""
    count = 0
    for index, effect in enumerate(plan['effects']):
        members = [m for m in plan['members'] if m['effect'] == index]
        for node in effect['nodes']:
            if node.get('presentationCoverage'):
                continue
            model = _screen_sized_model(effect, node, plan, effect['nodes'], members)
            if model:
                node['presentationCoverage'] = model
                count += 1
    return count


def annotate_white_flashes(plan):
    """Generic rule for every effect, whatever its anchor (see _white_flash_quad)."""
    count = 0
    for effect in plan['effects']:
        for node in effect['nodes']:
            if node.get('presentationCoverage'):
                continue
            flash = _white_flash_quad(effect, node, plan, effect['nodes']) or _white_flash_particle(effect, node, plan, effect['nodes'])
            if flash:
                node['presentationCoverage'] = flash
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
        count += annotate_screen_backdrops(plan) + annotate_screen_models(plan) + annotate_white_flashes(plan)
    print(json.dumps(dict(plan=plan, flashPlanes=count)))
