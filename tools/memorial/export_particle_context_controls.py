"""Original two-texture writer controls for camera axes and atlas rectangles.

Synthetic inputs, not live scene measurements. Reuses the existing instruction
reference and original source-selected module chain; no alternative renderer.
"""
import argparse
import hashlib
import json
from pathlib import Path
from emulate_particle_assignment import ParticleTwoTextureReference
from inspect_bmb import read_bmb
from prepare_diagnostic import EXPECTED_NATIVE


def export(apk, source):
    raw = source.read_bytes()
    node = next(n for n in read_bmb(raw)['nodes'] if n['typeId'] == 3)
    reference = ParticleTwoTextureReference(apk)
    bases = [[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
             [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 7, 9, 11, 1],
             [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
             [.6, .8, 0, 0, -.8, .6, 0, 0, 0, 0, 1, 0, 7, 9, 11, 1]]
    rectangles = [[[0, 0, 1, 1], [0, 0, 1, 1]],
                  [[.125, .25, .5, .75], [.25, .125, .75, .5]],
                  [[.2, .1, .4, .3], [.1, .2, .3, .4]]]
    cases = []
    for basis in bases:
        for trims in rectangles:
            host = dict(center=[17.25, -31.5, 4.125], groupScale=[1.5, 1.5, 1.5],
                        textureTint=[1, 1, 1, 1], textureTint2=[1, 1, 1, 1],
                        textureBindings={k: v['name'] for k, v in node['resourceBindings'].items()},
                        drawBasis=basis, textureTrims=trims)
            result = reference.run(raw[node['offset']:node['offset'] + node['bytes']],
                                   dict(alphaCurve=b'', ages=[.1], vertexHost=host))
            cases.append(dict(inputs=host, result=result))
    return dict(cases=cases, sourceSha256=hashlib.sha256(raw).hexdigest(), nativeSha256=EXPECTED_NATIVE,
                boundary='Synthetic context controls executing original selected two-texture writer; not measured live camera/UV states')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for key in ('apk', 'source', 'output'):
        parser.add_argument('--' + key, type=Path, required=True)
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Keep generated references ignored')
    result = export(args.apk, args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(dict(cases=len(result['cases']), output=str(args.output))))
