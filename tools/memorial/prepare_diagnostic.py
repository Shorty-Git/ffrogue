"""Prepare an unsigned, exact-build diagnostic APK; never install or alter a device."""
import argparse
import hashlib
import json
import re
import struct
import zipfile
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from inspect_bmb import read_bmb

EXPECTED_APK = '9d21fc8b61c9900eaacb1c2ddef2cabcad1e97d2dc720be16ac09b06fc0086b4'
EXPECTED_NATIVE = '6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77'
HOOKS = [
    ('locator-parent', '_ZN2ml2bm8traverse8ArgparamILi3EE10TrampolineINS0_15NullEmitterNodeENS0_15PostUpdatePhaseEE7DoPhaseEPvRKNS0_3bmb10NodeHeaderERKNS0_13UpdateContextE', 'locator-parent', 0),
    ('particle-vertex', '_ZN2ml2bm19ParticleEmitterNodeINS0_14ParticleTraitsEE10MakeVertexERNS0_11DrawContextE', 'particle-vertex', 0),
    ('particle-vertex-ordered', '_ZN2ml2bm19ParticleEmitterNodeINS0_14ParticleTraitsEE17OrderedMakeVertexERNS0_11DrawContextE', 'particle-vertex', 0),
    ('skill-execution', '_ZN10BattleUnit9procSkillEb', 'execution-scope', 0),
    ('command-frames', '_ZN18BattleCommandSkill14getEffectFrameEv', 'command-frames', 0),
    ('battle-effect-input', '_ZN10BattleUnit16playBattleEffectEPS_S0_iNSt6__ndk112basic_stringIcNS1_11char_traitsIcEENS1_9allocatorIcEEEEiii', 'effect-input', 0),
    ('hit-profile-row', '_ZN18HitTypeMstResponse9readParamEiiPKcS1_b', 'master-row', 0),
    ('process-profile-row', '_ZN22ProcessTypeMstResponse9readParamEiiPKcS1_b', 'master-row', 0),
    ('renderer-update', '_ZN12BishamonData6updateEf', 'renderer-update', 0),
    ('renderer-draw', '_ZN12BishamonData6onDrawERKN7cocos2d4Mat4Ej', 'renderer-draw', 0),
    ('command-group', '_ZN9GameUtils24playCmdEffectWithGroupIDEiiN7cocos2d4RectEiibbbbPNS0_7__ArrayEP10BattleUnitbi', 'placement-context', 0),
    ('battle-group', '_ZN9GameUtils27playBattleEffectWithGroupIDEiiN7cocos2d4RectEiibP15AnimeMoveParamsb', 'placement-context', 0),
    ('effect-group', '_ZN9GameUtils21playEffectWithGroupIDEiiN7cocos2d4RectEiibP15AnimeMoveParamsbb', 'placement-context', 0),
    ('effect-factory', '_ZN16BishamonDataList8addAnimeENSt6__ndk112basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEEiffibb', 'factory-source', 0),
    ('command-init', '_ZN15BattleCmdEffect4initEiP10BattleUnitbiP12BishamonData', 'action', 0),
    ('group-id', '_ZN15BattleCmdEffect16setEffectGroupIDEi', 'integer', 0),
    ('effect-init', '_ZN12BishamonData4initERKN2ml4bmfw11CreateParamE', 'create', 0),
    ('wait-frame', '_ZN12BishamonData12setWaitFrameEi', 'integer', 0),
    ('layer-id', '_ZN12BishamonData10setLayerIdEi', 'integer', 0),
    ('position-xy', '_ZN12BishamonData11setPositionEff', 'float', 2),
    ('position-x', '_ZN12BishamonData12setPositionXEf', 'float', 1),
    ('position-local-x', '_ZN12BishamonData7setPosXEf', 'float', 1),
    ('position-local-y', '_ZN12BishamonData7setPosYEf', 'float', 1),
    ('scale-uniform', '_ZN12BishamonData8setScaleEf', 'float', 1),
    ('scale-xy', '_ZN12BishamonData8setScaleEff', 'float', 2),
    ('rotation', '_ZN12BishamonData9setRotateEf', 'float', 1),
    ('rotation-xyz', '_ZN12BishamonData9setRotateEfff', 'float', 3),
]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def reviewed_pipeline_hook(dispatch, target):
    """Resolve inspected native forwarding ABIs, never arbitrary branches."""
    address = int(target['address'], 16)
    reviewed = {
        0x1fc7a54: ('b089fce2b222509c7ac4bcc8544a72ea3f937e64b5fbb912b7805110eb235a33', 'a75ac417',
                    0x10de4f0, 'd0e700f0119246f91082349120021fd6', 0x2dd9d20,
                    '_ZN2ml2bm6module9scaling_x6update5ConstERNS1_13UpdateContextE', 0x1fc7a30, 36),
        0x1fc7a9c: ('4e3f25b75e582b74eacaf9542444b4e37afd1528dc05e5aea23b267552b79830', 'b131c517',
                    0x1114160, '10e7009011ae45f910622d9120021fd6', 0x2df4b58,
                    '_ZN2ml2bm6module9scaling_x6update8VelocityERNS1_13UpdateContextE', 0x1fc7a58, 68),
    }
    if address not in reviewed:
        return None
    sha, instruction, plt, plt_bytes, got, name, implementation, size = reviewed[address]
    if target['bytes'] != 4 or target['sha256'] != sha or dispatch.read(address, 4).hex() != instruction:
        raise ValueError('Reviewed X forwarding instruction changed')
    if dispatch.read(plt, 16).hex() != plt_bytes:
        raise ValueError('Reviewed X PLT forwarding sequence changed')
    matches = []
    for section in dispatch.sections:
        if section[1] != 4:
            continue
        symbols = dispatch.sections[section[6]]
        strings = dispatch.sections[symbols[6]]
        for at in range(section[4], section[4] + section[5], section[9]):
            slot, info, addend = struct.unpack_from('<QQq', dispatch.native, at)
            if slot != got:
                continue
            symbol = struct.unpack_from('<IBBHQQ', dispatch.native, symbols[4] + (info >> 32) * symbols[9])
            start = strings[4] + symbol[0]
            symbol_name = dispatch.native[start:dispatch.native.index(b'\0', start)].decode()
            matches.append((info & 0xffffffff, addend, symbol_name, symbol[4], symbol[5]))
    if matches != [(1026, 0, name, implementation, size)]:
        raise ValueError('Reviewed X JUMP_SLOT identity changed')
    body = dispatch.read(implementation, size)
    return dict(offset=implementation, name=name, head=body[:16].hex(), bytes=size, sha256=digest(body),
                via=dict(wrapper=address, plt=plt, got=got, relocationType=1026))


def native_symbols(data):
    if data[:6] != b'\x7fELF\x02\x01':
        raise ValueError('Expected little-endian ELF64')
    shoff = struct.unpack_from('<Q', data, 40)[0]
    stride, count = struct.unpack_from('<HH', data, 58)
    sections = [struct.unpack_from('<IIQQQQIIQQ', data, shoff + i * stride) for i in range(count)]
    symbols = {}
    function_sizes = {}
    for section in sections:
        if section[1] != 11:
            continue
        table = sections[section[6]]
        strings = data[table[4]:table[4] + table[5]]
        for offset in range(section[4], section[4] + section[5], section[9]):
            name, info, _, index, value, size = struct.unpack_from('<IBBHQQ', data, offset)
            if name and index and info >> 4 in (1, 2):
                symbols[strings[name:strings.index(0, name)].decode()] = value
                if info & 15 == 2:
                    function_sizes[value] = size
    phoff = struct.unpack_from('<Q', data, 32)[0]
    stride, count = struct.unpack_from('<HH', data, 54)
    segments = [struct.unpack_from('<IIQQQQQQ', data, phoff + i * stride) for i in range(count)]

    def head(name):
        address = symbols[name] if isinstance(name, str) else name
        for segment in segments:
            if segment[0] == 1 and segment[3] <= address and address + 16 <= segment[3] + segment[5]:
                offset = segment[2] + address - segment[3]
                return data[offset:offset + 16].hex()
        raise ValueError('Symbol outside file-backed load segments: ' + str(name))
    head.sizes = function_sizes
    return symbols, head


def prepare(apk, output, mode='observe'):
    if mode not in ('observe', 'native-export', 'live-export'):
        raise ValueError('Unknown diagnostic mode')
    if digest(apk.read_bytes()) != EXPECTED_APK:
        raise ValueError('Unexpected source APK; refusing to patch')
    output = output.resolve()
    if not output.is_relative_to(Path('tools/data').resolve()):
        raise ValueError('Output must stay in ignored tools/data')
    output.mkdir(parents=True, exist_ok=True)
    target = output / 'ffbe-trace-unsigned.apk'
    if target.exists():
        raise FileExistsError(target)
    with zipfile.ZipFile(apk) as source:
        native = source.read('lib/arm64-v8a/libgame.so')
        if digest(native) != EXPECTED_NATIVE:
            raise ValueError('Unexpected native library')
        symbols, head = native_symbols(native)
        hooks = list(HOOKS)
        file_symbol = '_ZN7cocos2d9FileUtils15getDataFromFileERKNSt6__ndk112basic_stringIcNS1_11char_traitsIcEENS1_9allocatorIcEEEE'
        if file_symbol in symbols:
            hooks.append(('cocos-resource', file_symbol, 'file', 0))
        spec = {'nativeSha256': EXPECTED_NATIVE, 'hooks': [
            {'code': i + 1, 'name': name, 'symbol': symbol, 'kind': kind, 'count': count, 'head': head(symbol)}
            for i, (name, symbol, kind, count) in enumerate(hooks)
        ]}
        filename_symbol = '_ZN12BishamonData11getFileNameEv'
        filename_head = head(filename_symbol)
        # Exact ARM64 getter: add x1, x0, #0x4a8; mov x0, x8; branch to copy.
        if not filename_head.startswith('01a01291e00308aa'):
            raise ValueError('Unexpected filename getter layout')
        spec['objectFilename'] = {'symbol': filename_symbol, 'head': filename_head,
                                  'offset': 0x4a8}
        spec['rendererReference'] = {
            'scaleSymbol': '_ZN12BishamonData12SCALE_FACTORE',
            'getters': [{'name': name, 'symbol': symbol, 'head': head(symbol)}
                        for name, symbol in (
                            ('screenWidth', '_ZN11CommonUtils14getScreenWidthEv'),
                            ('screenHeight', '_ZN11CommonUtils15getScreenHeightEv'))],
        }
        spec['skillSource'] = {'getters': [
            {'name': name, 'symbol': symbol, 'head': head(symbol)}
            for name, symbol in (
                ('abilityList', '_ZN14AbilityMstList6sharedEv'),
                ('dictionaryLookup', '_ZN7cocos2d12__Dictionary12objectForKeyEl'),
                ('skillId', '_ZN12SkillMstBase10getSkillIdEv'),
                ('skillEffects', '_ZNK12SkillMstBase14getEffectFrameEv'),
                ('skillHits', '_ZNK12SkillMstBase14getDamageFrameEv'))],
        }
        spec['combatIdentity'] = {
            'playerVtableSymbol': '_ZTV10PlayerUnit',
            'getters': [{'name': name, 'symbol': symbol, 'head': head(symbol)}
                        for name, symbol in (
                            ('commandSkillId', '_ZN18BattleCommandSkill10getSkillIDEv'),
                            ('playerMaster', '_ZN10PlayerUnit10getUnitMstEv'),
                            ('masterUnitId', '_ZNK7UnitMst9getUnitIDEv'))],
        }
        spec['bodyReference'] = {'functions': [
            {'name': name, 'symbol': symbol, 'head': head(symbol)} for name, symbol in (
                ('unit-edge', '_ZNK10BattleUnit8getAnimeEv'),
                ('active-cgs', '_ZN9EdgeAnime14getActiveCgsIDEv'),
                ('frame-index', '_ZNK9EdgeAnime13getAnimeIndexEv'),
                ('anime-counter', '_ZN9EdgeAnime15getAnimeCounterEv'),
                ('anime-ended', '_ZN9EdgeAnime5isEndEv'),
                ('anime-x', '_ZN9EdgeAnime9getAnimeXEv'),
                ('anime-y', '_ZN9EdgeAnime9getAnimeYEv'),
                ('reserve-special', '_ZN15BattleCharacter20reserveSpecialActionEi'),
                ('reserve-anime', '_ZN10BattleUnit12reserveAnimeEii'),
                ('change-anime', '_ZN10BattleUnit11changeAnimeEib'),
                ('active-unit', '_ZN10BattleUnit17setActiveAnimeCgsEib'),
                ('active-edge', '_ZN9EdgeAnime12setActiveCgsEibi'),
                ('update-unit', '_ZN10BattleUnit11updateAnimeEv'))]}
        scene_symbol = '_ZN2ml4bmfw5SceneEv'
        spec['cameraReference'] = {'getters': [
            {'name': 'bishamonScene', 'symbol': scene_symbol, 'head': head(scene_symbol)}],
        }
        particle_plan = json.loads(Path('tools/data/shared-skill-review/brave-slash-composed/plan-model-vertex-rgba.json').read_text(encoding='utf-8'))
        particle_effect = next(e for e in particle_plan['effects'] if e['name'] == 'atk_impact_001_pink.bmb')
        particle_node = particle_effect['nodes'][34]
        particle_bytes = Path('tools/data/shared-skill-review/brave-slash-composed/originals/atk_impact_001_pink.bmb').read_bytes()
        if digest(particle_bytes) != '89c3cb5e7c16df69bf8d1c538622afdd42e30942240141a8147dd55da4de690f':
            raise ValueError('Unexpected Particle reference BMB')
        if particle_node['offset'] != 42128 or particle_node['typeId'] != 3 or particle_node['bytes'] != 1840:
            raise ValueError('Unexpected Particle reference layout')
        spec['particleReference'] = {
            'file': 'atk_impact_001_pink', 'node': 34, 'nodeOffset': particle_node['offset'],
            'sourceBytes': len(particle_bytes), 'sourceSha256': digest(particle_bytes),
            'header': particle_bytes[:8].hex(),
            'bufferWriter': {'offset': 0x20016bc, 'head': head(0x20016bc)},
            'windows': [{'offset': offset, 'hex': particle_bytes[particle_node['offset'] + offset:particle_node['offset'] + offset + 16].hex()}
                        for offset in (0, 0xf8, 0x690)],
            'modules': [{'name': name, 'offset': address, 'head': head(name)}
                        for name, address in symbols.items()
                        if name.startswith('_ZN2ml2bm6module') and ('MakeVertex' in name or 'make_vertex' in name)],
        }
        spec['locatorReference'] = {
            'file': 'atk_impact_001_pink', 'sourceSha256': digest(particle_bytes),
            'header': particle_bytes[:8].hex(),
            'nodes': [{'node': index, 'offset': particle_effect['nodes'][index]['offset'],
                       'windows': [{'offset': at, 'hex': particle_bytes[particle_effect['nodes'][index]['offset'] + at:particle_effect['nodes'][index]['offset'] + at + 16].hex()}
                                   for at in (0, 0xf8, 0x200)]} for index in (1, 33)],
            'modules': [{'name': name, 'offset': address, 'head': head(name)}
                        for name, address in symbols.items()
                        if name.startswith('_ZN2ml2bm6module') and
                        any(domain in name for domain in ('transform_locator', 'translation', 'scaling', 'rotation')) and
                        ('6update' in name or '17delta_zero_update' in name)],
            'computedHelpers': [{'offset': at, 'head': head(at)}
                                for at in (0x1ff7830, 0x1ff7838, 0x1ff7864, 0x1ff789c)],
        }
        from native_particle_dispatch import ParticleDispatch
        dispatch = ParticleDispatch(apk)
        pipeline_nodes, pipeline_modules = [], {}
        stages = {'init': ('scaleInit', 'rotationInit'), 'update': ('scaleUpdate', 'rotationUpdate'), 'make': ('scale', 'rotation')}
        for folder, basename, indices in [
                ('brave-slash-composed', 'atk_impact_001_pink', (24, 34)),
                ('blade-beam', 'atk_slash5_blue', (8,)),
                ('climhazzard', 'atk_blow1_purple', (3,)),
                ('climhazzard', 'eff_strobe_white_a50_f30', (3,))]:
            file = Path('tools/data/shared-skill-review') / folder / 'originals' / (basename + '.bmb')
            raw = file.read_bytes()
            decoded = read_bmb(raw)
            for index in indices:
                node = decoded['nodes'][index]
                if node['typeId'] != 3:
                    raise ValueError('Pipeline reference must identify a Particle')
                pipeline_nodes.append({'file': basename, 'node': index, 'nodeOffset': node['offset'],
                    'sourceSha256': digest(raw), 'header': raw[:8].hex(),
                    'windows': [{'offset': at, 'hex': raw[node['offset'] + at:node['offset'] + at + 16].hex()} for at in (0, 0xf8, 0x690)]})
                for stage, kinds in stages.items():
                    for kind in kinds:
                        field = 0x12c if kind.startswith('scale') else 0x128
                        selection = dispatch.select(kind, struct.unpack_from('<I', raw, node['offset'] + field)[0])
                        if not selection['resolved']:
                            raise ValueError('Unresolved pipeline module index')
                        module_target = selection['target']
                        if module_target is None:
                            continue
                        name = module_target['symbol']
                        if 'VelocityX' in name:
                            record_bytes = 8
                        elif 'ConstX' in name:
                            record_bytes = 4
                        elif 'OneX' in name or 'update3One' in name:
                            record_bytes = 0
                        elif 'Const' in name:
                            record_bytes = 12
                        else:
                            raise ValueError('Pipeline module record span is not reviewed: ' + name)
                        address = int(module_target['address'], 16)
                        pipeline_modules[address] = {'name': name, 'offset': address, 'head': head(address), 'recordBytes': record_bytes}
                        delegate = reviewed_pipeline_hook(dispatch, module_target)
                        if delegate:
                            pipeline_modules[address]['hook'] = delegate
        emitter_hooks = []
        for stage, name, table_offset in [
                ('init', '_ZN2ml2bm19ParticleEmitterNodeINS0_14ParticleTraitsEE25CallbackActivatePrimitiveEPvS4_RNS0_13UpdateContextEj', 0x28),
                ('update', '_ZN2ml2bm19ParticleEmitterNodeINS0_14ParticleTraitsEE10PostUpdateERNS0_13UpdateContextE', 0x30),
                ('make', '_ZN2ml2bm19ParticleEmitterNodeINS0_14ParticleTraitsEE10MakeVertexERNS0_11DrawContextE', 0x38),
                ('make', '_ZN2ml2bm19ParticleEmitterNodeINS0_14ParticleTraitsEE17OrderedMakeVertexERNS0_11DrawContextE', 0x38)]:
            emitter_hooks.append({'stage': stage, 'name': name, 'offset': symbols[name], 'head': head(name), 'tableOffset': table_offset})
        spec['pipelineReference'] = {'nodes': pipeline_nodes, 'modules': list(pipeline_modules.values()), 'emitterHooks': emitter_hooks}
        # Reuse exact-source receipts; this constructs observation metadata, not a simulation.
        lifecycle_source = Path('tools/data/shared-skill-review/brave-slash-composed/originals/atk_slash1_white.bmb')
        lifecycle_raw = lifecycle_source.read_bytes()
        lifecycle_data = read_bmb(lifecycle_raw)
        lifecycle_nodes = []
        lifecycle_modules = {}
        receipts = [Path('tools/data/connected-effect') / name for name in
                    ('brave-slash-null-chains.json', 'brave-slash-null-auxiliary.json', 'brave-slash-quad-geometry.json')]
        receipts.append(Path('tools/data/native-locator-emulation/particle-module-chains.json'))
        for node in lifecycle_data['nodes']:
            selected = [c for file in receipts for c in json.loads(file.read_text())['cases']
                        if c['sourceSha256'] == lifecycle_data['sha256'] and c['node'] == node['index']]
            if not selected:
                raise ValueError('Lifecycle source lacks module reference')
            work = min(c['result']['workBytes'] for c in selected)
            lifecycle_nodes.append(dict(index=node['index'], typeId=node['typeId'], nodeOffset=node['offset'],
                bytes=node['bytes'], parent=node['parentIndex'], workBytes=work,
                life=node['lifeParameter'], lifeOffset={0:128,2:348,3:248}[node['typeId']]))
            for case in selected:
                phases = dict(case['result']['phases'], fourth=case['result'].get('auxiliaryModules', []))
                for stage, modules in phases.items():
                    for module in modules:
                        at = int(module['address'],16)
                        entry = lifecycle_modules.setdefault(at, dict(offset=at, head=head(at), name=module['symbols'][0], selections=[]))
                        selection = dict(node=node['index'],stage=stage)
                        if selection not in entry['selections']:
                            entry['selections'].append(selection)
                        if at in (0x1fc7a54, 0x1fc7a9c):
                            known = next(row['target'] for table in dispatch.tables.values() for row in table['rows']
                                         if row['target'] and int(row['target']['address'],16)==at)
                            entry['hook'] = reviewed_pipeline_hook(dispatch,known)
        # A single tail branch preserves the context ABI; resolve its exact ELF callee.
        from inspect_native_calls import inspect as inspect_calls
        forwarding = [m for m in lifecycle_modules.values() if not m.get('hook') and head.sizes.get(m['offset'])==4]
        if forwarding:
            bodies=inspect_calls(apk,[m['name'] for m in forwarding])['functions']
            for entry, body in zip(forwarding,bodies):
                instructions=body['instructions']
                if len(instructions)!=1 or not instructions[0]['instruction'].startswith('b '):
                    continue
                delegate_symbol=instructions[0].get('targetSymbol','').removesuffix(' [PLT]')
                if delegate_symbol in symbols:
                    entry['hook']=dict(offset=symbols[delegate_symbol],head=head(delegate_symbol),name=delegate_symbol,
                        via=dict(wrapper=entry['offset'],sha256=body.get('sha256'),instruction=instructions[0]['instruction'],
                            evidence='Single original unconditional tail branch; no ABI adjustment'))
        lifecycle_hooks = []
        for name, at, kind, trait in [
                ('tree-init',0x1fbd8dc,'tree-init',None),('tree-update',0x1fb8878,'tree-update',None),
                ('tree-post',0x1fb8db4,'tree-post',None),('root-life',0x1fb616c,'root-life',None),
                ('null-init',0x1fbc9e0,'init',0),('quad-init',0x1fec280,'init',2),('particle-init',0x1fee8c0,'init',3),
                ('null-activate',0x1fbbb24,'activate',0),('quad-activate',0x1febe34,'activate',2),('particle-activate',0x1fee474,'activate',3),
                ('null-birth',0x1fbbcb0,'birth',0),('quad-birth',0x1fed4e4,'birth',2),('particle-birth',0x1fefae4,'birth',3),
                ('null-update',0x1fbc068,'update',0),('null-post',0x1fbdfe8,'post',0),
                ('quad-update',0x1fed8a4,'update',2),('quad-post',0x1feccf8,'post',2),
                ('particle-update',0x1fefea4,'update',3),('particle-post',0x1fef2f8,'post',3)]:
            lifecycle_hooks.append(dict(name=name,offset=at,kind=kind,trait=trait,head=head(at)))
        spec['lifecycleReference'] = dict(file=lifecycle_source.name,sourceSha256=lifecycle_data['sha256'],
            header=lifecycle_raw[:8].hex(),sourceBytes=len(lifecycle_raw),rootLife=lifecycle_raw[80:84].hex(),nodes=lifecycle_nodes,
            strings=[dict(offset=r['stringOffset'],hex=lifecycle_raw[r['stringOffset']:r['stringOffset']+min(24,len(r['name']))].hex()) for r in lifecycle_data['resources']],
            hooks=lifecycle_hooks,modules=list(lifecycle_modules.values()))
        for name, symbol, kind in [
                ('tree-activate','_ZN2ml2bm8NodeTree18ActivateGenerationEv','tree-activate'),
                ('tree-reset','_ZN2ml2bm8NodeTree5ResetEv','tree-reset'),
                ('tree-expired','_ZNK2ml2bm8NodeTree9IsExpiredEv','tree-expired'),
                ('factory','_ZN16BishamonDataList8addAnimeENSt6__ndk112basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEEiffibb','factory'),
                ('wrapper-destroy','_ZN12BishamonDataD2Ev','wrapper-destroy')]:
            spec['lifecycleReference']['hooks'].append(dict(name=name,offset=symbols[symbol],kind=kind,trait=None,head=head(symbol)))
        spec['lifecycleReference']['writers'] = [dict(offset=at,typeId=kind,stride=stride,head=head(at))
            for at,kind,stride in ((0x2005180,2,40),(0x2005500,2,64),(0x2001a40,3,64))]
        (output / 'lifecycle-spec.json').write_text(json.dumps(spec['lifecycleReference'],indent=2)+'\n')
        # Inspected public wrappers are four-byte branches to these adjacent
        # implementations. Both still remain native submission, not GPU proof.
        submissions = []
        for kind, symbol, wrapper, implementation, span in [
                ('auto-index', '_ZN2ml4bmfw13RenderContext13DrawAutoIndexEPNS0_18DrawProfilerResultE', 0x15c6c30, 0x15c6c34, 92),
                ('indexed', '_ZN2ml4bmfw13RenderContext9DrawIndexEPNS0_18DrawProfilerResultE', 0x15c6c90, 0x15c6c94, 104)]:
            if symbols[symbol] != wrapper or dispatch.read(wrapper, 4).hex() != '01000014':
                raise ValueError('Reviewed native submission wrapper changed')
            body = dispatch.read(implementation, span)
            submissions.append(dict(kind=kind, offset=implementation, head=body[:16].hex(), bytes=span,
                                    sha256=digest(body), wrapperOffset=wrapper, wrapperSymbol=symbol))
        spec['pipelineReference']['submissions'] = submissions
        (output / 'pipeline-spec.json').write_text(json.dumps(spec['pipelineReference'], indent=2) + '\n', encoding='utf-8')
        observer = Path('tools/memorial/observer.js').read_text(encoding='utf-8')
        if observer.count('__TRACE_SPEC__') != 1:
            raise ValueError('Observer spec placeholder missing or duplicated')
        observer = observer.replace('__TRACE_SPEC__', json.dumps(spec, separators=(',', ':')))
        if observer.count('__PIPELINE_OBSERVER__') != 1:
            raise ValueError('Pipeline observer placeholder missing or duplicated')
        observer = observer.replace('__PIPELINE_OBSERVER__', Path('tools/memorial/pipeline_observer.js').read_text(encoding='utf-8'))
        observer = observer.replace('__LIFECYCLE_OBSERVER__', Path('tools/memorial/lifecycle_observer.js').read_text(encoding='utf-8'))
        if observer.count('__BODY_OBSERVER__') != 1:
            raise ValueError('Body observer placeholder missing or duplicated')
        observer = observer.replace('__BODY_OBSERVER__', Path('tools/memorial/body_observer.js').read_text(encoding='utf-8'))
        export_symbols = {
            'create': '_ZN12BishamonData6createERKN2ml4bmfw11CreateParamE',
            'unschedule': '_ZN7cocos2d4Node16unscheduleUpdateEv',
            'retain': '_ZN7cocos2d3Ref6retainEv', 'release': '_ZN7cocos2d3Ref7releaseEv',
            'reset': '_ZN2ml4bmfw9Animation5ResetEv', 'step': '_ZN2ml4bmfw9Animation6UpdateEv',
            'expired': '_ZNK2ml4bmfw9Animation9IsExpiredEv',
            'texture': '_ZN7cocos2d13RenderTexture6createEii',
            'begin': '_ZN7cocos2d13RenderTexture14beginWithClearEffff',
            'end': '_ZN7cocos2d13RenderTexture3endEv', 'visit': '_ZN7cocos2d4Node5visitEv',
            'director': '_ZN7cocos2d8Director11getInstanceEv', 'render': '_ZN7cocos2d8Renderer6renderEv',
            'image': '_ZN7cocos2d13RenderTexture8newImageEb',
            'save': '_ZN7cocos2d5Image10saveToFileERKNSt6__ndk112basic_stringIcNS1_11char_traitsIcEENS1_9allocatorIcEEEEb',
            'scene': '_ZN2ml4bmfw5SceneEv', 'pump': '_ZN7cocos2d8Director9drawSceneEv',
            'list': '_ZN16BishamonDataList6sharedEv',
            'stringCreate': '_ZNSt6__ndk112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEC2IDnEEPKc',
            'stringDestroy': '_ZNSt6__ndk112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED2Ev',
            'factory': '_ZN16BishamonDataList8addAnimeENSt6__ndk112basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEEiffibb',
            'arrayRemove': '_ZN7cocos2d7__Array12removeObjectEPNS_3RefEb',
            'detach': '_ZN7cocos2d4Node26removeFromParentAndCleanupEb',
            'drawNodeInit': '_ZN7cocos2d8DrawNode4initEv',
            'createAnimation': '_ZN2ml4bmfw15CreateAnimationERKNS0_11CreateParamE',
        }
        export_spec = {'nativeSha256': EXPECTED_NATIVE, 'functions': {
            name: {'symbol': symbol, 'head': head(symbol)} for name, symbol in export_symbols.items()}}
        export_probe = Path('tools/memorial/native_export_probe.js').read_text(encoding='utf-8')
        if export_probe.count('__NATIVE_EXPORT_SPEC__') != 1:
            raise ValueError('Native export spec placeholder missing or duplicated')
        export_probe = export_probe.replace('__NATIVE_EXPORT_SPEC__', json.dumps(export_spec, separators=(',', ':')))
        original = source.read('assets/frida_script.js')
        live_spec = dict(nativeSha256=EXPECTED_NATIVE, filenameOffset=spec['objectFilename']['offset'], functions={
            name: dict(symbol=symbol,head=head(symbol)) for name,symbol in (
                ('scene','_ZN2ml4bmfw5SceneEv'),
                ('draw','_ZN12BishamonData6onDrawERKN7cocos2d4Mat4Ej'),
                ('update','_ZN12BishamonData6updateEf'),
                  ('compress','compress2'),
                  ('compressBound','compressBound'),
                ('filename',filename_symbol))})
        live_probe = Path('tools/memorial/live_effect_export.js').read_text(encoding='utf-8')
        if live_probe.count('__LIVE_EXPORT_SPEC__') != 1:
            raise ValueError('Live-export spec placeholder missing or duplicated')
        live_probe = live_probe.replace('__LIVE_EXPORT_SPEC__',json.dumps(live_spec,separators=(',',':')))
        addition = {'native-export':export_probe,'live-export':live_probe,'observe':observer+'\n;\n'+export_probe+'\n;\n'+live_probe}[mode]
        combined = original + b'\n;\n' + addition.encode('utf-8')
        (output / 'observer-expanded.js').write_text(observer, encoding='utf-8')
        (output / 'native-export-expanded.js').write_text(export_probe, encoding='utf-8')
        (output / 'live-export-expanded.js').write_text(live_probe, encoding='utf-8')
        changed = []
        with zipfile.ZipFile(target, 'x') as dest:
            for entry in source.infolist():
                if re.match(r'^META-INF/(?:MANIFEST\.MF|[^/]+\.(?:SF|RSA|DSA|EC))$', entry.filename, re.I):
                    continue
                data = source.read(entry.filename)
                if entry.filename == 'assets/frida_script.js':
                    data = combined
                    changed.append(entry.filename)
                dest.writestr(entry, data)
    with zipfile.ZipFile(apk) as source, zipfile.ZipFile(target) as built:
        for name in built.namelist():
            if name != 'assets/frida_script.js' and source.read(name) != built.read(name):
                raise ValueError('Unexpected changed APK entry: ' + name)
        if not built.read('assets/frida_script.js').startswith(original + b'\n;\n'):
            raise ValueError('Original community script was not preserved')
    receipt = {'sourceApkSha256': EXPECTED_APK, 'nativeSha256': EXPECTED_NATIVE,
               'unsignedApkSha256': digest(target.read_bytes()), 'changedEntries': changed,
               'mode': mode, 'hookCount': {'native-export':3,'live-export':3,'observe':len(spec['hooks'])}[mode], 'signaturesRemoved': True,
               'signed': False, 'installed': False, 'runtimeVerified': False,
               'limits': ['Bootstrap overwrite policy not yet runtime-verified',
                          'Resources requested through other native APIs may be absent',
                          'Native coordinate semantics remain unverified']}
    (output / 'preparation.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--mode', choices=('observe', 'native-export', 'live-export'), default='observe')
    args = parser.parse_args()
    prepare(args.apk, args.output, args.mode)
