"""Attach source-selected Particle alpha evidence to an isolated research plan."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
from emulate_particle_assignment import ParticleAssignmentReference
from inspect_bmb import read_bmb
from prepare_diagnostic import EXPECTED_NATIVE


def prepare(reference, plan, originals):
    result = copy.deepcopy(plan)
    if not result.get('sourceAppearance') or result.get('approved') is not False:
        raise ValueError('Unpublished source-appearance research plan required')
    selected = 0
    for effect in result['effects']:
        path = (originals / effect['name']).resolve()
        if not path.is_relative_to(originals.resolve()):
            raise ValueError('Source path escapes originals')
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != effect['sha256']:
            raise ValueError('Prepared effect source hash differs')
        nodes = read_bmb(raw)['nodes']
        if len(nodes) != len(effect['nodes']):
            raise ValueError('Prepared source node count differs')
        for node, source in zip(effect['nodes'], nodes):
            node.pop('nativeScalarAlpha', None)
            if node['typeId'] != source['typeId'] or node['index'] != source['index']:
                raise ValueError('Prepared node identity differs')
            if source['typeId'] != 3:
                continue
            if node['alphaCurve'] != source['alphaCurve']:
                raise ValueError('Prepared alpha differs from source')
            assignment = reference.run(raw[source['offset']:source['offset'] + source['bytes']])['phases']
            if (any(m['address'] == '0x20025ec' for m in assignment['init'])
                    and any(m['address'] == '0x2002af4' for m in assignment['update'])
                    and source['alphaCurve']['keys']):
                node['nativeScalarAlpha'] = dict(nativeSha256=EXPECTED_NATIVE,
                    sourceSha256=effect['sha256'], initAddress='0x20025ec', updateAddress='0x2002af4',
                    keys=copy.deepcopy(source['alphaCurve']['keys']))
                selected += 1
    result['nativeScalarAlpha'] = True
    return result, selected


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    for name in ('apk', 'plan', 'originals', 'output'):
        p.add_argument('--' + name, type=Path, required=True)
    a = p.parse_args()
    if not a.output.resolve().is_relative_to(Path('tools/data').resolve()):
        p.error('Output must remain under tools/data')
    if a.output.resolve() == a.plan.resolve():
        p.error('Use a separate candidate plan')
    plan, count = prepare(ParticleAssignmentReference(a.apk), json.loads(a.plan.read_text(encoding='utf-8')), a.originals)
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps(plan, indent=2), encoding='utf-8')
    print(json.dumps({'sourceSelectedParticleCurves': count, 'approved': False}))
