"""Connected single-burst effect export through original Particle module/writer code.

Admits a complete constant Null parent chain and one neutral Basic Particle leaf.
Host placement and constant parent traversal are explicit adapters, not a claim
that the complete original NodeTree implementation executes offline.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys
from PIL import Image
from emulate_particle_assignment import ParticleAssignmentReference, TEXTURED_WRITER
from emulate_particle_scheduler import ParticleSchedulerReference
from emulate_zscreen_locator import LocatorReference
from prepare_diagnostic import EXPECTED_NATIVE
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from inspect_bmb import read_bmb
from bmb_playback_fields import attach_playback_fields


def f32(value):
    return struct.unpack('<f', struct.pack('<f', value))[0]


def export(apk, request):
    source = Path(request['source']); raw = source.read_bytes()
    if hashlib.sha256(raw).hexdigest() != request['sourceSha256']:
        raise ValueError('Source hash differs from prepared plan')
    data = read_bmb(raw); nodes = data['nodes']; attach_playback_fields(raw, nodes)
    if not nodes or nodes[-1]['typeId'] != 3 or any(n['typeId'] != 0 for n in nodes[:-1]):
        raise ValueError('Connected subset requires only Null parents and one Particle leaf')
    leaf = nodes[-1]; life = leaf['lifeParameter']
    if not 1 <= life <= 240 or leaf['lifeRangeParameter']:
        raise ValueError('Connected subset requires finite deterministic lifetime <=240')
    for index, node in enumerate(nodes):
        if node['parentIndex'] != (index - 1 if index else None) or node['children'] != ([index + 1] if index + 1 < len(nodes) else []):
            raise ValueError('Branched traversal is outside the connected subset')
        if node['generation'] != dict(start=0, startRange=0, count=1, duration=1, repeatCount=1, interval=1.0):
            raise ValueError('Only zero-delay single-burst generation is connected')
        if node['lifeRangeParameter'] or node['lifeParameter'] not in (0, life):
            raise ValueError('Independent parent expiration requires original traversal')
        for domain in node['staticVectors'].values():
            for group in domain.values():
                if any(v for k, vector in group.items() if k != 'valueInitial' for v in vector):
                    raise ValueError('Random/dynamic parameters require a broader connected simulation')
    center = request['root']['center'][:]; scale = request['root']['scale'][:]
    if len(center) != 3 or len(scale) != 3 or not all(math.isfinite(v) for v in center + scale) or min(scale) <= 0:
        raise ValueError('Explicit finite positive host transform required')
    locator = LocatorReference(apk); parents = []
    basis = [scale[0],0,0,0,scale[1],0,0,0,scale[2]]
    for node in nodes[:-1]:
        if any(node['motionModes'].get(k, {}).get('id') != 1 for k in ('translation', 'rotation', 'scale')):
            raise ValueError('Parent adapter requires source Newton/static transform modes')
        if node['materialAlpha']['value'] != 1 or any(k['value'] != 1 for k in node['alphaCurve']['keys']):
            raise ValueError('Animated parent alpha requires complete inheritance traversal')
        transform = node['staticVectors']['transform']
        translation, rotation, local_scale = [transform[k]['valueInitial'] for k in ('translation', 'rotation', 'scale')]
        kind = struct.unpack_from('<I', raw, node['offset'] + 0x2b4)[0]
        if rotation[2] or min(local_scale) <= 0:
            raise ValueError('Connected parent adapter requires zero roll and positive scale')
        center = [f32(center[row] + sum(f32(basis[col * 3 + row] * translation[col]) for col in range(3))) for row in range(3)]
        if kind == 0:
            native = locator.run(rotation, local_scale, scale)
            scale = native['scale']
            basis = native['basis']
        elif kind == 1:
            if any(rotation):
                evidence = next((e['inheritance'] for e in request.get('parentEvidence', []) if e['node'] == node['index']), None)
                if (evidence is None or evidence['compatibility']['nodeV15'] or evidence['compatibility']['rootV15']
                        or any(evidence[k] != 'On' for k in ('translation','rotation','scale','matrix'))
                        or evidence['alphaRate'] or evidence['colorRate']):
                    raise ValueError('Rotated Default parent requires reviewed full-inheritance/non-V15 evidence')
            native = locator.run([math.radians(v) for v in rotation], local_scale, scale,
                                 locator='default', parent_basis=basis)
            scale, basis = native['scale'], native['basis']
        else:
            raise ValueError('Unsupported source Null locator/rotation')
        parents.append(dict(node=node['index'], locator=kind, center=center[:], scale=scale[:], basis=basis[:]))
    textures = {k: v['name'] if v else None for k, v in leaf['resourceBindings'].items()}
    if textures.get('texture2'):
        raise ValueError('Two-texture materials are outside the connected subset')
    if leaf['materialControls']['textureCombination']['id'] != 0:
        raise ValueError('Connected texture sampling requires source Basic operation')
    if textures.get('texture1'):
        asset = request['textures'][textures['texture1']]
        image_raw = Path(asset['path']).read_bytes()
        if hashlib.sha256(image_raw).hexdigest() != asset['sha256']:
            raise ValueError('Texture hash mismatch')
        with Image.open(asset['path']) as image:
            if image.width > 4096 or image.height > 4096:
                raise ValueError('Texture dimensions exceed connected preview limit')
    scheduler = ParticleSchedulerReference(apk).run(phase_mode='initialized', duration=1,
        life=life, steps=[1] * (life + 1))
    if scheduler['requests'] != [{'step': 0, 'offset': 0.0, 'count': 1}]:
        raise ValueError('Unexpected native emission sequence')
    rows = [r for r in scheduler['updates'] if not r['expired']]
    ages = [r['particles'][0]['ageTicks'] / r['particles'][0]['lifeTicks'] for r in rows]
    curve = leaf['alphaCurve']
    keys = raw[curve['dataOffset']:curve['dataOffset'] + len(curve['keys']) * 20] if curve['keys'] else b''
    if not keys and (leaf['materialControls']['alphaMode']['id'] != 0 or leaf['materialAlpha']['value'] != 1):
        raise ValueError('Missing alpha curve is supported only for source constant-one mode')
    assignment = ParticleAssignmentReference(apk)
    if request['textureTint'].get('rgba') != [1, 1, 1, 1] or not request['textureTint'].get('supported'):
        raise ValueError('Verified neutral texture tint required')
    blend_rows = list(struct.iter_unpack('<3I', assignment.image.read(0x255ab8c, 84)))
    blend_id = leaf['materialControls']['blend']['id']
    if request['blend'] != dict(id=blend_id, row=list(blend_rows[blend_id])):
        raise ValueError('Blend metadata differs from original native table/source selector')
    result = assignment.run(raw[leaf['offset']:leaf['offset'] + leaf['bytes']], probe={
        'alphaCurve': keys, 'ages': ages,
        'rng': scheduler['updates'][0]['afterUpdate']['rng'],
        'vertexHost': dict(center=center, groupScale=scale, textureBindings=textures,
                           textureTint=request['textureTint']['rgba'])})
    if result['chain']['status'] != 'executed':
        raise ValueError('A complete selected module chain is blocked: ' + str(result['chain']))
    frames = [dict(frame=0, vertices=[])] + [dict(frame=i + 1, normalizedAge=u['normalizedAge'], vertices=u['vertices']['data'])
              for i, u in enumerate(result['chain']['updates'])] + [dict(frame=life + 1, vertices=[])]
    return dict(schemaVersion=1, approved=False, nativeSha256=EXPECTED_NATIVE,
        sourceSha256=request['sourceSha256'], sourceName=source.name, nodeCount=len(nodes),
        parentAdapter='Validated constant single-burst Null chain; native ZScreen/Default locators, explicit host/translation adapter',
        host=request['host'], root=request['root'], parents=parents, textures=request['textures'],
        parentLocatorReferences={
            'default': dict(address='0x1fbef00', bytes=1144,
                sha256=hashlib.sha256(locator.read(0x1fbef00, 1144)).hexdigest()),
            'zscreen': dict(address='0x1fc04b0', bytes=1412,
                sha256=hashlib.sha256(locator.read(0x1fc04b0, 1412)).hexdigest())},
        textureTintEvidence=request['textureTint'],
        shaderSelection=request.get('shaderSelection'),
        blend=request['blend'], material=leaf['materialControls'], scheduler=scheduler,
        writerReference=dict(address=hex(TEXTURED_WRITER[0]), codeBytes=TEXTURED_WRITER[1],
            sha256=hashlib.sha256(assignment.image.read(*TEXTURED_WRITER)).hexdigest()),
        chain=result, frames=frames,
        boundary='Complete admitted effect data path with explicit host/constant-parent adapter; original module/writer code, not arbitrary NodeTree or skill support')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    for name in ('apk', 'request', 'output'):
        p.add_argument('--' + name, type=Path, required=True)
    a = p.parse_args()
    if not a.output.resolve().is_relative_to(Path('tools/data').resolve()):
        p.error('Output must remain under tools/data')
    result = export(a.apk, json.loads(a.request.read_text(encoding='utf-8')))
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps({'source': result['sourceName'], 'nodes': result['nodeCount'], 'frames': len(result['frames']),
        'writer': result['chain']['chain']['updates'][0]['vertices']['writer'], 'approved': False}))
