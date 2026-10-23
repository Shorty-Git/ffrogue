"""Prepare an isolated research plan from extracted original skill sources.

This never writes game assets or claims original renderer fidelity.
"""
import argparse
import hashlib
import json
from pathlib import Path
from inspect_bmb import read_bmb
from inspect_m3r import read_m3r
from bmb_playback_fields import attach_playback_fields
from original_texture_layers import attach_texture_layers
from bmb_distortion import attach_distortion_fields
from bmb_quad_colors import attach_quad_colors
from original_inheritance import attach_inheritance
from original_appearance import attach_appearance
from original_texture_mapping import attach_basic_texture_mapping


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source', type=Path, required=True)
    p.add_argument('--unit', required=True)
    p.add_argument('--motion', default='atk')
    p.add_argument('--recipe', type=Path, help='Reviewed character recipe for movement and targeting; no source damage mechanics are imported')
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--authoring', type=Path, action='append', default=[], help='Explicit matching BMSLN supplement for a source member')
    p.add_argument('--distortion', action='store_true', help='Enable source-field distortion research candidate')
    p.add_argument('--fit-screen', action='store_true', help='Explicit preview adaptation: fit static screen-anchored effects to the arena')
    p.add_argument('--scene-composite', action='store_true', help='Blend effects directly against a snapshot of the existing scene')
    p.add_argument('--quad-colors', action='store_true', help='Evaluate constant, non-random corner RGBA for distortion quads')
    p.add_argument('--withhold-untextured', action='store_true', help='Withhold unverified untextured particle primitives instead of assuming white planes')
    p.add_argument('--inheritance', action='store_true', help='Enable source rate-zero alpha and birth-time translation experiment from explicit authoring supplements')
    p.add_argument('--source-appearance', action='store_true', help='Select active color/alpha channels from verified modes; unresolved color capabilities stay explicit')
    p.add_argument('--basic-uv', action='store_true', help='Evaluate supported single-texture UV rotation/pivot with the shared experimental matrix policy')
    a = p.parse_args()
    root = Path.cwd().resolve()
    stage = (root / 'tools/data').resolve()
    if not a.source.resolve().is_relative_to(stage) or not a.output.resolve().is_relative_to(stage):
        raise ValueError('Research source and output must stay inside tools/data')
    receipt = json.loads(a.source.read_text(encoding='utf-8'))
    source = receipt['skill']
    presentation = None
    if a.recipe:
        recipe = json.loads(a.recipe.read_text(encoding='utf-8'))
        selections = [s for s in recipe['skills'] if s.get('ffbeId') == source['id'] and s.get('type', 'ABILITY') == source['kind']]
        if recipe['key'] != a.unit or len(selections) != 1:
            raise ValueError('Recipe does not identify this unit and skill')
        selected = selections[0]
        if selected['moveType'] not in ['dash', 'stationary'] or selected['scope'] not in ['single_enemy', 'all_enemies']:
            raise ValueError('Unsupported preview movement or target scope')
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
    if a.inheritance and not authoring:
        raise ValueError('Inheritance experiment requires explicit authoring sources')
    if set(authoring) - {item['member'] for item in receipt['originals']}:
        raise ValueError('Authoring supplement does not match a skill source member')
    for original in receipt['originals']:
        path = a.source.parent / 'originals' / original['member']
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != original['sha256']:
            raise ValueError('Original hash changed')
        data = read_bmb(raw)
        attach_playback_fields(raw, data['nodes'])
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
        inheritance_supplement = None
        if original['member'] in authoring:
            supplement = attach_texture_layers(data, authoring[original['member']].read_bytes())
            if a.inheritance:
                inheritance_supplement = attach_inheritance(data, authoring[original['member']].read_bytes())
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
        by_name[original['member']] = len(effects)
        effects.append({'name': original['member'], 'sha256': data['sha256'],
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
            if not group['members']:
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
    manifest = json.loads((root / 'public/assets/units' / a.unit / 'manifest.json').read_text())
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
            'seed': 1, 'effectHorizon': 180, 'endFrame': 210, 'approachFrames': 18,
            'presentation': presentation,
            'fitScreenToArena': a.fit_screen,
            'sceneComposite': a.scene_composite,
            'withholdUntexturedParticles': a.withhold_untextured,
            'sourceInheritance': a.inheritance,
            'sourceAppearance': a.source_appearance,
            'basicTextureUv': a.basic_uv,
            'sourceHits': [{'frame': int(h.split(':')[0]), 'weight': int(h.split(':')[1])}
                           for h in source['raw']['attackFrames'].split('&')],
            'effects': effects, 'members': members, 'audioGroupsNotPlayed': audio_groups,
            'actor': {'body': manifest['animations'][a.motion], 'idle': manifest['animations']['idle'],
                      'move': manifest['animations']['move'], 'scale': 2,
                      'bodyUrl': image(root / 'public/assets/units' / a.unit / (a.motion + '.png')),
                      'idleUrl': image(root / 'public/assets/units' / a.unit / 'idle.png'),
                      'moveUrl': image(root / 'public/assets/units' / a.unit / 'move.png')},
            'rat': {'body': rat['animations']['idle'], 'scale': 2,
                    'url': image(root / 'public/assets/monsters/training_dummy/idle.png')},
            'backgrounds': {'reactor': image(root / 'public/assets/backgrounds/reactor_01.jpg'),
                            'forest': image(root / 'public/assets/backgrounds/forest_clearing.jpg')},
            'files': assets}
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps(plan, indent=2), encoding='utf-8')
    print('Prepared original-data experiment:', a.output)
