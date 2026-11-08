"""Prepare an isolated research plan from extracted original skill sources.

This never writes game assets or claims original renderer fidelity.
"""
import argparse
import hashlib
import json
import math
import re
import struct
from pathlib import Path
from inspect_bmb import read_bmb
import bmb_channels
from authoring_sources import ApproximateProject
from inspect_m3r import read_m3r
from bmb_playback_fields import attach_playback_fields
from original_texture_layers import attach_texture_layers
from bmb_distortion import attach_distortion_fields
from bmb_quad_colors import attach_quad_colors
from original_inheritance import attach_inheritance
from original_appearance import attach_appearance
from original_texture_mapping import attach_basic_texture_mapping


def source_hit_markers(raw):
    """Preserve every serialized hit marker for the research overlay."""
    return [{'frame': int(fields[0]), 'weight': int(fields[1])}
            for entry in re.split(r'[&@-]', raw) if entry
            for fields in [entry.split(':')]]


def rectangle_for_group(anchor_mode, scope):
    """Mode3 is proven only for self commands whose target is the caster."""
    if anchor_mode == 3 and scope == 'self':
        return 'target-unit'
    if anchor_mode == 3 and bmb_channels.APPROXIMATED_CURVES is not None:
        # Approximation mode: mode 3 is the caster's unit rectangle. Self commands cannot tell
        # caster and target apart; Omnislash's members (-280 px toward the enemies from the
        # caster) show the caster reading. The host aligns the caster so the strike lands.
        bmb_channels.APPROXIMATED_CURVES.append({'placement': 'anchor-mode-3', 'scope': scope, 'treatment': 'caster-unit'})
        return 'caster-unit'
    if anchor_mode not in (1, 2, 4):
        raise ValueError('Unsupported source effect rectangle mode: ' + str(anchor_mode))
    return {1: 'target-unit', 2: 'target-side', 4: 'screen'}[anchor_mode]


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source', type=Path, required=True)
    p.add_argument('--unit', required=True)
    p.add_argument('--unit-assets', type=Path, help='Validated offline body staging directory for a new character; defaults to published assets')
    p.add_argument('--motion', default='atk')
    p.add_argument('--recipe', type=Path, help='Reviewed character recipe for movement and targeting; no source damage mechanics are imported')
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--profile', choices=['source-preview-v1'], help='Reuse the accepted shared preview switches; still experimental, not automatic publication approval')
    p.add_argument('--authoring-directory', type=Path, help='For source-preview-v1: resolve every exact member project here, then run the existing source comparison')
    p.add_argument('--authoring', type=Path, action='append', default=[], help='Explicit matching BMSLN supplement for a source member')
    p.add_argument('--distortion', action='store_true', help='Enable source-field distortion research candidate')
    p.add_argument('--fit-screen', action='store_true', help='Explicit preview adaptation: fit static screen-anchored effects to the arena')
    p.add_argument('--scene-composite', action='store_true', help='Blend effects directly against a snapshot of the existing scene')
    p.add_argument('--quad-colors', action='store_true', help='Evaluate constant, non-random corner RGBA for distortion quads')
    p.add_argument('--withhold-untextured', action='store_true', help='Withhold unverified untextured particle primitives instead of assuming white planes')
    p.add_argument('--inheritance', action='store_true', help='Enable source rate-zero alpha and birth-time translation experiment from explicit authoring supplements')
    p.add_argument('--source-appearance', action='store_true', help='Select active color/alpha channels from verified modes; unresolved color capabilities stay explicit')
    p.add_argument('--basic-uv', action='store_true', help='Evaluate supported single-texture UV rotation/pivot with the shared experimental matrix policy')
    p.add_argument('--model-vertex-rgba', action='store_true', help='Experimental multiplication of original model vertex RGBA into material color/alpha')
    p.add_argument('--flat-quad-rgb', action='store_true', help='Opt-in verified Constant/flat Quad RGB with independent alpha; host color replay streams are not native seeds')
    p.add_argument('--particle-geometry', action='store_true', help='Experimental view-aligned radius-one Particle subset; unsupported nodes retain explicitly labeled legacy comparison geometry')
    p.add_argument('--null-locator', action='store_true', help='Experimental zero-roll unit-scale Null/Billboard locator subset from matched authoring')
    p.add_argument('--shader-add-reference', type=Path, help='Opt-in native-source Add material candidate; requires pinned fragment source and source appearance')
    p.add_argument('--native-shaders-apk', type=Path, help='Pinned native selector evidence for initial Quad/Particle materials; requires shader package')
    p.add_argument('--native-shader-package', type=Path, action='append', default=[], help='Pinned original shader package; requires native APK')
    p.add_argument('--native-basic-material', action='store_true', help='Opt-in constant Basic texture tint candidate; requires native selection and source appearance')
    p.add_argument('--native-blend', action='store_true', help='Opt-in pinned native framebuffer blend factors; requires native selection and scene composition')
    p.add_argument('--native-null-locator', action='store_true', help='Opt-in source-dispatched ZScreen constant-scale/roll subset; requires native selection and Null locator metadata')
    p.add_argument('--native-particle-x', action='store_true', help='Opt-in deterministic OneX/ConstX display subset; requires native selection, Particle geometry and native Null locators')
    p.add_argument('--rectangle-placement', action='store_true', help='Explicit preview bridge: source axis/offset rules, arena half-field and prepared unit frame boxes, zero scatter')
    p.add_argument('--renderer-reference', type=Path, help='Verified native global geometry-scale receipt; requires rectangle placement')
    p.add_argument('--approximate-unverified', action='store_true', help='Explicit visual approximation: hold active source curves on channels without a verified binary offset constant and record each one in plan.approximations')
    a = p.parse_args()
    if a.approximate_unverified:
        bmb_channels.APPROXIMATED_CURVES = []
    if a.profile:
        if not a.authoring_directory or a.authoring or a.fit_screen or a.distortion or a.quad_colors or a.shader_add_reference:
            p.error('The shared profile requires an explicit authoring directory and no manual authoring/fit/distortion overrides')
        if not a.native_shaders_apk or not a.native_shader_package or not a.renderer_reference or not a.recipe:
            p.error('The shared profile requires reviewed recipe, shader evidence and renderer reference')
        for flag in ['scene_composite', 'withhold_untextured', 'inheritance', 'source_appearance',
                     'basic_uv', 'model_vertex_rgba', 'particle_geometry', 'null_locator',
                     'native_basic_material', 'native_blend', 'native_null_locator',
                     'native_particle_x', 'rectangle_placement']:
            setattr(a, flag, True)
        if a.approximate_unverified:
            # Binary ConstFlat Quad RGB (e.g. dark backdrop quads) instead of the white legacy tint.
            a.flat_quad_rgb = True
    elif a.authoring_directory:
        p.error('Authoring directory resolution requires an explicit shared profile')
    if a.native_particle_x and not (a.native_shaders_apk and a.particle_geometry and a.native_null_locator):
        p.error('Native Particle X requires native selection, Particle geometry and native Null locators')
    particle_dispatch = None
    if a.native_particle_x:
        from native_particle_dispatch import ParticleDispatch
        particle_dispatch = ParticleDispatch(a.native_shaders_apk)
    native_material_catalog = None
    if bool(a.native_shaders_apk) != bool(a.native_shader_package):
        p.error('Native material selection requires both APK and shader package')
    if a.native_shaders_apk:
        from native_material_selection import native_catalog
        native_material_catalog = native_catalog(a.native_shaders_apk, a.native_shader_package)
    if a.native_basic_material and (not native_material_catalog or not a.source_appearance):
        p.error('Native Basic material requires native selection and source appearance')
    if a.native_blend and (not native_material_catalog or not a.scene_composite):
        p.error('Native blending requires native selection and scene composition')
    if a.native_null_locator and (not native_material_catalog or not a.null_locator):
        p.error('Native Null locator requires native selection and Null locator metadata')
    if a.particle_geometry and not a.inheritance:
        p.error('Particle geometry experiment requires explicit inheritance metadata')
    if a.particle_geometry and a.fit_screen:
        p.error('Particle geometry experiment does not support screen-fitting transforms')
    if a.null_locator and (not a.inheritance or a.fit_screen):
        p.error('Null locator experiment requires inheritance and rejects screen fitting')
    shader_add_reference = None
    if a.shader_add_reference:
        if not a.source_appearance:
            p.error('Shader Add candidate requires source appearance')
        shader_bytes = a.shader_add_reference.read_bytes()
        shader_hash = hashlib.sha256(shader_bytes).hexdigest()
        if shader_hash != 'b54945426716fdc4ae4678cc85de7acd658d5259f23d5b2b187eb782a748a687':
            p.error('Unexpected native Add fragment reference')
        shader_add_reference = {'sha256': shader_hash, 'source': shader_bytes.decode('utf-8'),
                                'origin': 'Pinned native shader family; per-node shader binding remains unverified'}
    if a.rectangle_placement and a.fit_screen:
        raise ValueError('Screen fitting replaces source placement; use a separate explicit comparison plan')
    renderer_reference = None
    if a.renderer_reference:
        if not a.rectangle_placement:
            raise ValueError('Renderer reference requires the explicit rectangle-placement bridge')
        renderer_reference = json.loads(a.renderer_reference.read_text(encoding='utf-8-sig'))
        width, height = renderer_reference['screenWidth'], renderer_reference['screenHeight']
        if (not all(isinstance(v, (int, float)) and math.isfinite(v) and v > 0
                    for v in (width, height, renderer_reference['globalScale']))
                or not renderer_reference.get('formulaMatches') or min(width, height) <= 0
                or abs(renderer_reference['globalScale'] - 1136 / min(width, height)) > 0.00001
                or not re.fullmatch(r'[a-f0-9]{64}', renderer_reference.get('nativeSha256', ''))
                or not re.fullmatch(r'[a-f0-9]{64}', renderer_reference.get('sourceLogSha256', ''))):
            raise ValueError('Invalid native renderer reference')
    root = Path.cwd().resolve()
    stage = (root / 'tools/data').resolve()
    if not a.source.resolve().is_relative_to(stage) or not a.output.resolve().is_relative_to(stage):
        raise ValueError('Research source and output must stay inside tools/data')
    receipt = json.loads(a.source.read_text(encoding='utf-8'))
    approximate_members = set()
    if a.profile:
        directory = a.authoring_directory.resolve()
        if not directory.is_relative_to(root):
            raise ValueError('Authoring directory must stay inside the project')
        for original in receipt['originals']:
            project = directory / Path(original['member']).with_suffix('.bmsln').name
            if not project.is_file():
                if not a.approximate_unverified:
                    raise ValueError('Missing exact member authoring: ' + str(project))
                # Authoring-free visual approximation: binary controls + BMSLN corpus defaults.
                approximate_members.add(original['member'])
                continue
            a.authoring.append(project)
    source = receipt['skill']
    presentation = None
    if a.recipe:
        recipe = json.loads(a.recipe.read_text(encoding='utf-8'))
        selections = [s for s in recipe['skills'] if s.get('ffbeId') == source['id'] and s.get('type', 'ABILITY') == source['kind']]
        if recipe['key'] != a.unit or len(selections) != 1:
            raise ValueError('Recipe does not identify this unit and skill')
        selected = selections[0]
        if selected['moveType'] not in ['dash', 'stationary'] or selected['scope'] not in ['single_enemy', 'all_enemies', 'self', 'party']:
            raise ValueError('Unsupported preview movement or target scope')
        if selected['scope'] in ['self', 'party'] and selected['moveType']!='stationary':
            raise ValueError('Self preview requires stationary movement')
        presentation = {'movement': selected['moveType'], 'scope': selected['scope'],
                        'approachFrames': 18 if selected['moveType'] == 'dash' else 0,
                        'returnFrames': 12, 'targetOffsetX': recipe['battle']['targetOffsetX'],
                        'recipeSha256': hashlib.sha256(a.recipe.read_bytes()).hexdigest(),
                        'origin': 'Reviewed game recipe; preview timing and offsets are adaptations'}
    assets, effects, members = {}, [], []

    def image(path):
        path = path.resolve()
        if not path.is_relative_to(root):
            raise ValueError('Asset outside project')
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        url = '/image/' + digest + path.suffix.lower()
        assets[url] = {'path': path.relative_to(root).as_posix(), 'sha256': digest}
        return url

    by_name = {}
    authoring = {path.stem + '.bmb': path for path in a.authoring}
    if len(authoring) != len(a.authoring):
        raise ValueError('Duplicate authoring supplement')
    if a.inheritance and not authoring and not approximate_members:
        raise ValueError('Inheritance experiment requires explicit authoring sources')
    if set(authoring) - {item['member'] for item in receipt['originals']}:
        raise ValueError('Authoring supplement does not match a skill source member')
    for original in receipt['originals']:
        path = a.source.parent / 'originals' / original['member']
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != original['sha256']:
            raise ValueError('Original hash changed')
        data = read_bmb(raw)
        if a.approximate_unverified:
            from bmb_prune import prune_unknown_subtrees
            prune_unknown_subtrees(raw, data, bmb_channels.APPROXIMATED_CURVES)
        attach_playback_fields(raw, data['nodes'])
        if a.approximate_unverified:
            from bmb_draw_priority import attach_draw_priorities
            attach_draw_priorities(raw, data)
        if a.quad_colors:
            if not a.distortion:raise ValueError('Quad-color experiment requires the supported distortion plan')
            attach_quad_colors(raw,data)
            for node in data['nodes']:
                if node.get('materialControls',{}).get('textureCombination',{}).get('name')!='Distortion':
                    node.pop('quadColors',None)
                    continue
                colors=node['quadColors']
                if colors['mode']!='Constant' or any(any(c['range'])for c in colors['corners'].values()):
                    raise ValueError('Animated or randomized quad colors require an additional evaluator capability')
        if a.distortion:
            attach_distortion_fields(raw, data)
            for node in data['nodes']:
                if node.get('materialControls',{}).get('textureCombination',{}).get('name') != 'Distortion':
                    node.pop('distortionFields',None)
                    continue
                fields=node['distortionFields']
                if fields['midpoint'] != [128,128,128]:
                    raise ValueError('Only the source-checked 128 distortion midpoint is supported in this experiment')
                if any(v['name'] not in (['Constant','NewtonDynamics','CurveSpeed'] if k=='texture2Translation' else ['Constant','NewtonDynamics']) for k,v in fields['motionModes'].items()):
                    raise ValueError('Distortion UV curves require an additional capability')
                if any(v['colorMode'] not in ['Constant','CurveValue'] for v in fields['layers'].values()):
                    raise ValueError('Unsupported distortion texture color mode')
                node['motionModes'].update(fields['motionModes'])
                node['vectorCurves']['texture2TranslationSpeed']=fields['texture2TranslationSpeed']
        supplement = None
        if a.flat_quad_rgb:
            if not a.source_appearance or a.quad_colors:
                raise ValueError('Flat Quad RGB requires source appearance and rejects the older corner RGBA path')
            from original_flat_quad_color import attach_flat_quad_color
            project = authoring.get(original['member'])
            attach_flat_quad_color(raw, data, project.read_bytes() if project else None)
        inheritance_supplement = None
        project = (authoring[original['member']].read_bytes() if original['member'] in authoring
                   else ApproximateProject(original['member'], raw) if original['member'] in approximate_members else None)
        if project is not None:
            supplement = attach_texture_layers(data, project)
            if a.inheritance:
                inheritance_supplement = attach_inheritance(data, project)
            if a.particle_geometry:
                from original_particle_geometry import attach_particle_geometry
                attach_particle_geometry(data, project)
            if a.null_locator:
                from original_null_locator import attach_null_locators
                attach_null_locators(data, project)
        appearance_report = attach_appearance(data, authoring[original['member']].read_bytes() if original['member'] in authoring else None) if a.source_appearance else None
        basic_uv_report = attach_basic_texture_mapping(data, authoring[original['member']].read_bytes() if original['member'] in authoring else None) if a.basic_uv else None
        resource_receipt = json.loads((a.source.parent / 'effects' / path.stem / 'resources.json').read_text())
        resources = resource_receipt['resources']
        textures, meshes = {}, {}
        for resource in resources:
            file = root / resource['output']
            if hashlib.sha256(file.read_bytes()).hexdigest() != resource['sha256']:
                raise ValueError('Resource hash changed')
            if file.suffix == '.png':
                textures[file.stem] = image(file)
            elif file.suffix == '.m3r':
                meshes[file.stem] = read_m3r(file.read_bytes())
        if native_material_catalog:
            from native_material_selection import select_initial
            for node in data['nodes']:
                if node['typeId'] != 0:
                    node['nativeMaterialSelection'] = select_initial(raw, node, native_material_catalog, meshes)
                elif a.native_null_locator:
                    reference = native_material_catalog['nullLocatorReference']
                    kind = struct.unpack_from('<I', raw, node['offset'] + reference['parameterOffset'])[0]
                    node['nativeNullLocator'] = {'typeId': kind, 'fieldOffset': node['offset'] + reference['parameterOffset'],
                                                 'moduleAddress': reference['moduleAddress'] if kind == 0 else None,
                                                 'nativeSha256': reference['nativeSha256'],
                                                 'functionSha256': reference['functionSha256'] if kind == 0 else None}
        if particle_dispatch:
            from native_material_selection import NATIVE_SHA
            for node in data['nodes']:
                if node['typeId'] == 3:
                    node['nativeParticleX'] = {'nativeSha256': NATIVE_SHA,
                        **{kind: particle_dispatch.select(kind, struct.unpack_from('<I', raw, node['offset'] + field)[0])
                           for kind, field in [('scale', 0x12c), ('scaleInit', 0x12c), ('rotation', 0x128), ('parentCoord', 0x100)]}}
        if a.native_basic_material:
            from original_basic_material import attach_basic_material
            attach_basic_material(data, project)
        by_name[original['member']] = len(effects)
        effects.append({'name': original['member'], 'sha256': data['sha256'],
                        'rootLifecycle': data['rootLifecycle'],
                        **({'drawOrder': data['drawOrder']} if 'drawOrder' in data else {}),
                        'nodes': data['nodes'], 'textures': textures, 'meshes': meshes,
                        'authoringSupplement': supplement,
                        'inheritanceSupplement': inheritance_supplement,
                        'appearanceReport': appearance_report,
                        'basicUvReport': basic_uv_report})
    audio_groups = []
    for branch in source['effects']:
        if branch.get('conditional'):
            raise ValueError('Conditional branches not supported by this experiment')
        for group in branch['groups']:
            if not group['members'] and (group.get('status')!='sound-only-unreviewed' or not group.get('soundsRaw') or group.get('extraRaw')):
                raise ValueError('Unresolved non-file group requires explicit original semantics: '+str(group['groupId']))
            if group.get('soundsRaw'):
                audio_groups.append({'group': group['groupId'], 'frame': group['startFrame'], 'soundsRaw': group.get('soundsRaw')})
            for member in group['members']:
                rotation = [float(v) for v in member['transform']] if member['transform'] else [0, 0, 0]
                if len(rotation) != 3:
                    raise ValueError('Unknown member transform')
                members.append({'effect': by_name[member['originalFile']],
                                'startFrame': group['startFrame'] + member['frame'],
                                'anchor': group['anchor'], 'layer': group['layer'],
                                'scalePercent': member['scalePercent'], 'rotation': rotation,
                                'rawGroupFields': member['groupFields']})
                if group.get('compositionOrigin'):
                    members[-1]['compositionOrigin'] = group['compositionOrigin']
                if a.rectangle_placement:
                    group_fields = group['raw'].split(':')
                    # Native playBattleEffect defaults an omitted fourth field to target-unit.
                    anchor_mode = int(group_fields[3]) if len(group_fields) >= 4 else 1
                    fields = member['raw'].split(':')
                    if len(fields) != 8:
                        raise ValueError('Rectangle placement supports ordinary target-unit/side/screen members only')
                    axes = [int(fields[4]), int(fields[5])]
                    if any(mode not in range(1, 7) for mode in axes):
                        raise ValueError('Unknown source axis mode')
                    members[-1]['placement'] = {
                        # Measured self commands pass the identical caster/target
                        # unit rectangle. Mode3 on non-self skills remains gated.
                        'rectangle': rectangle_for_group(anchor_mode, presentation['scope']),
                        'axisModes': axes, 'offset': [int(fields[6]), int(fields[7])],
                    }
    unit_assets = (a.unit_assets or root / 'public/assets/units' / a.unit).resolve()
    if not any(unit_assets.is_relative_to(root / path) for path in ['tools/data', 'public/assets/units']):
        raise ValueError('Prepared body must stay in offline staging or published unit assets')
    manifest = json.loads((unit_assets / 'manifest.json').read_text())
    if manifest['name'] != a.unit or str(manifest['unitId']) != str(receipt['unitId']):
        raise ValueError('Prepared body identity differs from the inspected original unit')
    if a.fit_screen:
        screen_members=[m for m in members if m['anchor']=='screen']
        if not screen_members:
            raise ValueError('Screen fitting requires an explicit screen-anchored source member')
        for member in screen_members:
            for node in effects[member['effect']]['nodes']:
                for name,terms in node['staticVectors']['transform'].items():
                    if node['motionModes'].get(name,{}).get('name','NewtonDynamics') not in ['Constant','NewtonDynamics']:
                        raise ValueError('Screen fitting only supports static source geometry')
                    if any(any(terms[field]) for field in ['valueRange','speedInitial','speedRange','accelerationInitial','accelerationRange']):
                        raise ValueError('Animated or randomized screen geometry requires a separate fit policy')
    rat = json.loads((root / 'public/assets/monsters/training_dummy/manifest.json').read_text())
    plan = {'approved': False, 'name': source['name'], 'sourceId': source['id'], 'unit': a.unit,
            'sourceSha256': hashlib.sha256(a.source.read_bytes()).hexdigest(),
            **({'composition': source['composition']} if source.get('composition') else {}),
            'seed': 1, 'effectHorizon': 180, 'endFrame': 210, 'approachFrames': 18,
            'presentation': presentation,
            'fitScreenToArena': a.fit_screen,
            'sceneComposite': a.scene_composite,
            'withholdUntexturedParticles': a.withhold_untextured,
            'sourceInheritance': a.inheritance,
            'sourceAppearance': a.source_appearance,
            'basicTextureUv': a.basic_uv,
            'modelVertexRgba': a.model_vertex_rgba,
            'particleGeometry': a.particle_geometry,
            'nativeParticleX': a.native_particle_x,
            'nullLocator': a.null_locator,
            **({'shaderAddReference': shader_add_reference} if shader_add_reference else {}),
            **({'nativeMaterialSelection': {
                'schemaVersion': 1, 'nativeSha256': native_material_catalog['nativeSha256'],
                'packages': {name: package['sha256'] for name, package in native_material_catalog['packages'].items()},
                'scope': native_material_catalog['boundary'],
                'distortionReference': native_material_catalog['packages']['bmshaderpack.bin']['fragment'][184],
                **({'basicReference': {
                    **native_material_catalog['packages']['bmshaderpack.bin']['fragment'][224],
                    'vertexSource': native_material_catalog['packages']['bmshaderpack.bin']['vertex'][44]['source'],
                    'vertexSha256': native_material_catalog['packages']['bmshaderpack.bin']['vertex'][44]['sha256'],
                }} if a.native_basic_material else {}),
            }} if native_material_catalog else {}),
            'nativeBasicMaterial': a.native_basic_material,
            **({'nativeBlend': native_material_catalog['renderState']} if a.native_blend else {}),
            **({'nativeNullLocator': native_material_catalog['nullLocatorReference']} if a.native_null_locator else {}),
            **({'rendererReference': renderer_reference} if renderer_reference else {}),
            **({'rectanglePlacement': {'unitsPerPixel': 1, 'scatter': [0, 0],
                'policy': 'Preview adaptation: left half of arena for target-side; prepared frame box for target-unit; full arena for screen; one source unit per preview pixel; zero scatter. Not native rectangle geometry.'}}
               if a.rectangle_placement else {}),
            'sourceHits': source_hit_markers(source['raw']['attackFrames']),
            'effects': effects, 'members': members, 'audioGroupsNotPlayed': audio_groups,
            'audioGroupCoverage': 'all-resolved-effect-groups-only',
            'actor': {'body': manifest['animations'][a.motion], 'idle': manifest['animations']['idle'],
                      'move': manifest['animations']['move'], 'scale': 2,
                      'bodyUrl': image(unit_assets / (a.motion + '.png')),
                      'idleUrl': image(unit_assets / 'idle.png'),
                      'moveUrl': image(unit_assets / 'move.png')},
            'rat': {'body': rat['animations']['idle'], 'scale': 2,
                    'url': image(root / 'public/assets/monsters/training_dummy/idle.png')},
            'backgrounds': {'reactor': image(root / 'public/assets/backgrounds/reactor_01.jpg'),
                            'forest': image(root / 'public/assets/backgrounds/forest_clearing.jpg')},
            'files': assets}
    a.output.parent.mkdir(parents=True, exist_ok=True)
    if a.flat_quad_rgb:
        plan['flatQuadColors'] = dict(profile='native-flat-quad-rgb-v1',
            randomness='reviewed-color-streams-v1',
            boundary='Original ConstFlat RGB semantics; deterministic per-instance host seeds, not measured FFBE RNG ownership')
    if a.approximate_unverified:
        # Original emitter order (priority sort / node index) instead of three.js depth sorting.
        plan['drawOrder'] = dict(profile='native-priority-order-v1',
            boundary='Per member: emitter packets ordered by source SortPriority (if enabled) then node index; members in plan order. Full-Z sorting is not evaluated.')
        plan['approximations'] = dict(profile='held-constant-unverified-curves-v1', curves=bmb_channels.APPROXIMATED_CURVES,
            boundary='Visual approximation: these source curves are not evaluated; the effect is not a native-fidelity reconstruction.')
    if a.approximate_unverified and plan['sourceHits'] and members:
        # Emitters must keep spawning until the last original hit (Holy hits at frame 450); the
        # fixed 180-frame horizon cut late elements. Accepted strict plans keep 180.
        last_hit = max(h['frame'] for h in plan['sourceHits']) + plan.get('composition', {}).get('skillFrameOffset', 0)
        horizon = max(180, last_hit - min(m['startFrame'] for m in members) + 60)
        if horizon != plan['effectHorizon']:
            bmb_channels.APPROXIMATED_CURVES.append({'effectHorizon': horizon, 'treatment': 'spawn-horizon-to-last-hit'})
            plan['effectHorizon'] = horizon
    a.output.write_text(json.dumps(plan, indent=2), encoding='utf-8')
    print('Prepared original-data experiment:', a.output)
