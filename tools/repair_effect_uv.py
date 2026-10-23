"""Apply a hash-pinned, authoring-derived fixed-UV conversion repair offline."""
import argparse
import hashlib
import json
import struct
from pathlib import Path
import xml.etree.ElementTree as ET
from inspect_effect_project import decode_project, encode_project

sha = lambda data: hashlib.sha256(data).hexdigest()
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--recipe', type=Path, required=True)
args = parser.parse_args()
recipe = json.loads(args.recipe.read_text())
if recipe['schemaVersion'] != 1 or not recipe.get('reason'):
    raise ValueError('Unsupported or unexplained repair recipe')
source_path, authoring_path = Path(recipe['source']), Path(recipe['authoring'])
source, authoring = source_path.read_bytes(), authoring_path.read_bytes()
if sha(source) != recipe['sourceSha256'] or sha(authoring) != recipe['authoringSha256']:
    raise ValueError('Repair source snapshot differs from the inspected version')
output = Path(recipe['output'])
if output.resolve() == source_path.resolve() or not output.resolve().is_relative_to(Path('assets').resolve()):
    raise ValueError('Repair must create a separate local source variant inside assets')
project = decode_project(source)
original_nodes = {n.findtext('Basic_Meta_Name'): n for n in ET.fromstring(authoring).iter('ResIdeNode')
                  if n.findtext('Texture_Layer1_PictureName') == recipe['texture']}
nodes = [n for n in project.iter('Node') if n.findtext('RendererCommonValues/ColorTexture', '').endswith('/' + recipe['texture'] + '.png')]
if [n.findtext('Name') for n in nodes] != recipe['nodes'] or set(original_nodes) != set(recipe['nodes']):
    raise ValueError('Unexpected texture-node identity or compiled traversal order')
repairs = []
for node in nodes:
    name = node.findtext('Name')
    original = original_nodes[name]
    for field in ['Texture1_Scale_Value_Curve', 'Texture1_Translate_Value_Curve', 'Texture1_Rotate_Value_Curve']:
        if len(original.find(field).findall('.//KeyFrameArray/*')):
            raise ValueError('Animated texture mapping requires a separate converter')
    if any(float(v) != 0 for v in original.find('Texture1_Rotate_Value_Initial').attrib.values()):
        raise ValueError('Rotated texture mapping is not supported by this repair')
    scale = original.find('Texture1_Scale_Value_Initial').attrib
    shift = original.find('Texture1_Translate_Value_Initial').attrib
    sx, sy = float(scale['X']), float(scale['Y'])
    if sx <= 0 or sy <= 0:
        raise ValueError('Invalid texture scale')
    uv = [-float(shift['X']) / sx, -float(shift['Y']) / sy, 1 / sx, 1 / sy]
    uv = [0.0 if value == 0 else value for value in uv]
    if any(v < 0 for v in uv) or uv[0] + uv[2] > 1 or uv[1] + uv[3] > 1:
        raise ValueError('UV rectangle extends outside the inspected atlas')
    fixed = node.find('RendererCommonValues/UVFixed')
    if node.findtext('RendererCommonValues/UV') != '1' or fixed is None:
        raise ValueError('Expected a fixed-UV converted node')
    before = [float(fixed.findtext('Start/X', '0')) / recipe['textureWidth'],
              float(fixed.findtext('Start/Y', '0')) / recipe['textureHeight'],
              float(fixed.findtext('Size/X')) / recipe['textureWidth'],
              float(fixed.findtext('Size/Y')) / recipe['textureHeight']]
    if before != recipe['compiledBefore'] or uv[2:] != before[2:]:
        raise ValueError('Repair only supports the inspected omitted-start-offset defect')
    start = fixed.find('Start')
    if start is None:
        start = ET.SubElement(fixed, 'Start')
    for axis, value, dimension in zip(['X', 'Y'], uv[:2], [recipe['textureWidth'], recipe['textureHeight']]):
        child = start.find(axis)
        if child is None:
            child = ET.SubElement(start, axis)
        child.text = str(value * dimension)
    repairs.append({'node': name, 'before': before, 'after': uv})

chunks, offset, changed = [], 8, 0
while offset + 8 <= len(source):
    tag, size = struct.unpack_from('<4sI', source, offset)
    data = source[offset + 8:offset + 8 + size]
    if tag == b'EDIT':
        data = encode_project(project)
    if tag == b'BIN_':
        if data[:8] != b'SKFE' + struct.pack('<I', 1810):
            raise ValueError('Unsupported compiled effect version')
        # Effekseer fixed UV serialization: int type=1, then normalized float4.
        # The exact snapshot and all fixed-UV nodes are pinned above. There must
        # be one uniquely matching record per texture node in traversal order.
        pattern = struct.pack('<Iffff', 1, *recipe['compiledBefore'])
        locations = [i for i in range(len(data)) if data.startswith(pattern, i)]
        if len(locations) != len(repairs):
            raise ValueError('Ambiguous compiled fixed-UV record mapping')
        patched = bytearray(data)
        for location, repair in zip(locations, repairs):
            struct.pack_into('<ffff', patched, location + 4, *repair['after'])
            repair['compiledChunkOffset'] = location + 4
        allowed = {location + 4 + i for location in locations for i in range(8)}
        if any(a != b and i not in allowed for i, (a, b) in enumerate(zip(data, patched))):
            raise ValueError('Unexpected compiled modification outside UV starts')
        data = bytes(patched)
        changed += 1
    chunks.append(tag + struct.pack('<I', len(data)) + data)
    offset += 8 + size
if changed != 1 or offset != len(source):
    raise ValueError('Unexpected compiled chunk layout')
variant = source[:8] + b''.join(chunks)
if ET.tostring(decode_project(variant)) != ET.tostring(project):
    raise ValueError('Repaired editor project did not round-trip')
output.parent.mkdir(parents=True, exist_ok=True)
output.write_bytes(variant)
receipt = {'recipe': str(args.recipe), 'recipeSha256': sha(args.recipe.read_bytes()),
           'source': str(source_path), 'sourceSha256': sha(source), 'authoringSha256': sha(authoring),
           'output': str(output), 'outputSha256': sha(variant), 'reason': recipe['reason'], 'repairs': repairs}
receipt_path = Path(recipe['receipt'])
receipt_path.parent.mkdir(parents=True, exist_ok=True)
receipt_path.write_text(json.dumps(receipt, indent=2) + '\n')
print(f'Restored {sum(r["before"] != r["after"] for r in repairs)} of {len(repairs)} fixed-UV nodes: {output}')
