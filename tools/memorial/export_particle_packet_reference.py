"""Original two-texture Particle instruction replay at connected trace make windows.

Reference inputs are measured first-module RNG and make host vectors. These are
never simulator runtime intermediates. Full texture trims, neutral texture tints,
identity draw basis and global alpha one are explicit conditional fixtures.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from emulate_particle_assignment import ParticleTwoTextureReference
from inspect_bmb import read_bmb


def export(apk, source, trace):
    raw = source.read_bytes()
    rows = [json.loads(line) for line in trace.read_text().splitlines()]
    source_hash = hashlib.sha256(raw).hexdigest()
    if source_hash != rows[0]['sourceSha256']:
        raise ValueError('Foreign source trace')
    reference = ParticleTwoTextureReference(apk)
    cases = []
    for node in read_bmb(raw)['nodes']:
        if node['typeId'] != 3:
            continue
        initializers = [r for r in rows if r.get('node') == node['index'] and r['type'] == 'module-enter'
                        and r['candidates'][0]['stage'] == 'init'
                        and '13InitVelocityX' in r['candidates'][0]['name']]
        if not initializers or any(node['staticVectors']['transform']['rotation']['valueInitial']):
            raise ValueError('Measured VelocityX/absent rotation profile required')
        for instance, init in enumerate(initializers):
            makes = [r for r in rows if r.get('node') == node['index'] and r['type'] == 'module-leave'
                     and r['candidates'][0]['stage'] == 'make'
                     and 'scaling11make_vertex9VelocityX' in r['candidates'][0]['name']
                     and r['after']['record'] == init['before']['record']]
            if not makes:
                raise ValueError('Missing connected make windows')
            hosts = []
            for make in makes:
                data = bytes.fromhex(make['after']['make']['raw'])
                hosts.append(dict(center=list(struct.unpack_from('<3f', data, 0x98)),
                                  groupScale=list(struct.unpack_from('<3f', data, 0xc8)),
                                  textureTint=[1, 1, 1, 1], textureTint2=[1, 1, 1, 1],
                                  defaultAlpha=1,
                                  textureBindings={k: v['name'] if v else None for k, v in node['resourceBindings'].items()}))
            probe = dict(rng=init['before']['rng'], alphaCurve=b'',
                         ages=[(i + 1) / node['lifeParameter'] for i in range(len(makes))],
                         vertexHost=hosts[0], vertexHosts=hosts)
            result = reference.run(raw[node['offset']:node['offset'] + node['bytes']], probe)
            if result['chain']['status'] != 'executed':
                raise ValueError('Original chain blocked')
            cases.append(dict(node=node['index'], instance=instance, firstModuleSeed=probe['rng'],
                              windows=[dict(frame=r['frame'], seq=r['seq'], host=h)
                                       for r, h in zip(makes, hosts)], result=result))
    return dict(schema='particle-connected-writer-reference-v1', sourceSha256=source_hash,
                traceSha256=hashlib.sha256(trace.read_bytes()).hexdigest(), cases=cases,
                boundary='Original selected init/update/make and two-texture writer instructions; captured initial module seeds/centers/group vectors, identity draw basis, full trims, neutral tints and alpha1 fixtures; not live GPU output')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for key in ('apk', 'source', 'trace', 'output'):
        parser.add_argument('--' + key, type=Path, required=True)
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Keep generated references ignored')
    result = export(args.apk, args.source, args.trace)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(dict(output=str(args.output), instances=len(result['cases']),
                         packets=sum(len(c['windows']) for c in result['cases']))))
