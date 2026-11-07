"""Replay original Quad chains/writers under captured inputs, separate from JS simulation.

This is instruction-emulated differential output, not a live GPU-buffer capture.
Captured parent matrices and first-module seeds are reference-harness inputs only.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from emulate_quad_assignment import QuadAssignmentReference
from inspect_bmb import read_bmb

def export(apk, source, trace):
    raw=source.read_bytes(); rows=[json.loads(line) for line in trace.read_text().splitlines()]
    if hashlib.sha256(raw).hexdigest()!=rows[0]['sourceSha256']: raise ValueError('Wrong original source')
    original=QuadAssignmentReference(apk); cases=[]
    for node in read_bmb(raw)['nodes']:
        if node['typeId']!=2: continue
        index=node['index']; init=next(r for r in rows if r.get('node')==index and r['type']=='module-enter' and r['candidates'][0]['stage']=='init')
        parent=node['parentIndex']
        joint=next(r for r in rows if r.get('node')==parent and r['type']=='post-leave')['state']['jointStorage']['slots'][0]['raw']
        data=bytes.fromhex(joint); curve=node['alphaCurve']
        host=dict(center=list(struct.unpack_from('<3f',data,28)),parentBasis=list(struct.unpack_from('<9f',data,40)),
            groupScale=list(struct.unpack_from('<3f',data,0)),textureTint=[1,1,1,1],textureTint2=[1,1,1,1],placementFromUpdate=True,
            textureBindings={k:v['name'] if v else None for k,v in node['resourceBindings'].items()})
        probe=dict(rng=init['before']['rng'],ages=[i/node['lifeParameter'] for i in range(1,node['lifeParameter']+1)],
            alphaCurve=raw[curve['dataOffset']:curve['dataOffset']+20*len(curve['keys'])],vertexHost=host)
        result=original.run(raw[node['offset']:node['offset']+node['bytes']],probe)
        cases.append(dict(node=index,host=host,firstModuleSeed=probe['rng'],result=result))
    return dict(schema='quad-trace-writer-reference-v1',sourceSha256=hashlib.sha256(raw).hexdigest(),
        traceSha256=hashlib.sha256(trace.read_bytes()).hexdigest(),cases=cases,
        boundary='Original module/writer instructions with captured parent/seed and neutral tint fixture; six Python float32 sin/cos stubs per frame; no live GPU submission/order/pixel reference')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    for key in ('apk','source','trace','output'): p.add_argument('--'+key,type=Path,required=True)
    a=p.parse_args()
    if not a.output.resolve().is_relative_to(Path('tools/data').resolve()):p.error('Output must stay ignored')
    result=export(a.apk,a.source,a.trace);a.output.write_text(json.dumps(result,indent=2))
    print(json.dumps(dict(output=str(a.output),branches=len(result['cases']),frames=sum(len(c['result']['chain']['updates']) for c in result['cases']))))
