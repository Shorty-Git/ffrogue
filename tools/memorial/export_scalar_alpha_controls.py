"""Export original scalar alpha outputs for cross-language differential checks."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import sys
from emulate_particle_assignment import ParticleAssignmentReference
from prepare_diagnostic import EXPECTED_NATIVE
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from inspect_bmb import read_bmb

TYPES = ['Constant', 'Linear', 'Spline', 'BreakSpline']


def controls(reference, parameter):
    cases = []
    for start_type in range(4):
        for end_type in range(4):
            for end in (.5, 1):
                for values in ((.1, .9, 2, -1), (1.5, -.5, -4, 3)):
                    a, b, tangent_a, tangent_b = values
                    payload = struct.pack('<I4fI4f', start_type, tangent_a, 7, a, 0,
                                          end_type, 9, tangent_b, b, end)
                    keys = []
                    for offset in (0, 20):
                        kind, left, right, value, frame = struct.unpack_from('<I4f', payload, offset)
                        keys.append(dict(type=TYPES[kind], slopeLeft=left, slopeRight=right, value=value, frame=frame))
                    ages = [-.25, 0, end / 4, end / 2, end * .75, end - 2e-6, end - 1e-7, end, 1.25]
                    result = reference.run(parameter, probe={'alphaCurve': payload, 'ages': ages})
                    if result['chain']['status'] != 'executed':
                        raise ValueError('Control parameter chain is outside the verified subset')
                    alpha_index = next(i for i, m in enumerate(result['phases']['init'])
                                       if any('5alpha' in n and 'InitCurve' in n for n in m['symbols']))
                    offset = result['chain']['initCursors'][alpha_index - 1] if alpha_index else 0
                    samples = [dict(time=u['normalizedAge'], native=struct.unpack_from('<f', bytes.fromhex(u['recordHex']), offset)[0])
                               for u in result['chain']['updates']]
                    cases.append(dict(keys=keys, samples=samples))
    return cases


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--apk', type=Path, required=True)
    p.add_argument('--source', type=Path, required=True)
    p.add_argument('--node', type=int, required=True)
    p.add_argument('--output', type=Path, required=True)
    a = p.parse_args()
    if not a.output.resolve().is_relative_to(Path('tools/data').resolve()):
        p.error('Output must remain under tools/data')
    raw = a.source.read_bytes(); nodes = read_bmb(raw)['nodes']
    node = next(n for n in nodes if n['index'] == a.node and n['typeId'] == 3)
    parameter = raw[node['offset']:node['offset'] + node['bytes']]
    reference = ParticleAssignmentReference(a.apk)
    cases = controls(reference, parameter)
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps({'approved': False, 'nativeSha256': EXPECTED_NATIVE,
        'scalarUpdate': {'address': '0x1fcd3b4', 'bytes': 568,
                         'sha256': hashlib.sha256(reference.image.read(0x1fcd3b4, 568)).hexdigest()},
        'sourceSha256': hashlib.sha256(raw).hexdigest(), 'node': a.node,
        'boundary': 'Controlled scalar alpha curves through original complete module chains; no runtime publication',
        'cases': cases}, indent=2), encoding='utf-8')
    print(json.dumps({'cases': len(cases), 'samples': sum(len(c['samples']) for c in cases)}))
