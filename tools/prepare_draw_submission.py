"""Prepare original non-full-Z submission metadata for the existing source player."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import xml.etree.ElementTree as ET
from inspect_bmb import read_bmb

# Source parameter fields read by the original per-trait VertexMaker callbacks.
PRIORITY_OFFSETS={2:508,3:408}


def read_draw_submission(raw,node_indices):
    source=read_bmb(raw)
    if raw[0x4c] not in (0,1) or raw[0x4d] not in (0,1) or raw[0x4c]:
        raise ValueError('Full-Z or unknown original sorting flags are not supported')
    nodes={n['index']:n for n in source['nodes']};priorities={}
    for index in node_indices:
        node=nodes[index];relative=PRIORITY_OFFSETS.get(node['typeId'])
        if relative is None:raise ValueError('Unverified node priority layout')
        value=struct.unpack_from('<f',raw,node['offset']+relative)[0]
        if not math.isfinite(value):raise ValueError('Nonfinite source priority')
        priorities[str(index)]=value
    return dict(profile='native-priority-nonfullz-v1',sourceSha256=hashlib.sha256(raw).hexdigest(),
                fullZSort=False,prioritySort=raw[0x4d]==1,priorities=priorities)


def prepare(source,program_file,output,authoring=None):
    if not output.resolve().is_relative_to(Path('tools/data').resolve()):raise ValueError('Keep prepared research output ignored')
    program=json.loads(program_file.read_text(encoding='utf-8'));raw=source.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=program['sourceSha256']:raise ValueError('Program/source mismatch')
    nodes=[b['node'] for b in [*program['branches'],*program.get('particleBranches',[])]]
    profile=read_draw_submission(raw,[n['index'] for n in nodes])
    if any(n['typeId'] not in PRIORITY_OFFSETS for n in nodes):raise ValueError('Unverified program node family')
    if authoring:
        xml=ET.parse(authoring).findall('.//ResIdeNode')
        if len(xml)!=len(read_bmb(raw)['nodes'])+1:raise ValueError('Authoring/source node mismatch')
        for n in nodes:
            expected=float(xml[n['index']+1].findtext('Basic_Basic_SortPriority'))
            expected=struct.unpack('<f',struct.pack('<f',expected))[0]
            if expected!=profile['priorities'][str(n['index'])]:raise ValueError('Authoring/source priority mismatch')
        if (xml[0].findtext('Basic_Basic_PrioritySort')=='true')!=profile['prioritySort']:
            raise ValueError('Authoring/source enablement mismatch')
    program['drawSubmission']=profile
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(program,indent=2),encoding='utf-8')
    return profile


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',type=Path,required=True);p.add_argument('--program',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True);p.add_argument('--authoring',type=Path)
    a=p.parse_args();print(json.dumps(prepare(a.source,a.program,a.output,a.authoring)))
