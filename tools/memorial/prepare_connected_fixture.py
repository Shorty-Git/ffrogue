"""Prepare a source-verified standalone effect fixture using an explicit host."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
from emulate_particle_assignment import ParticleAssignmentReference
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from inspect_bmb import read_bmb
from native_material_selection import native_catalog, select_initial
from original_basic_material import attach_basic_material
from original_inheritance import attach_inheritance


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    for name in ('apk', 'source', 'authoring', 'texture-root', 'host-request', 'output'):
        p.add_argument('--' + name, type=Path, required=True)
    a = p.parse_args()
    if not a.output.resolve().is_relative_to(Path('tools/data').resolve()):
        p.error('Output must remain under tools/data')
    raw = a.source.read_bytes(); data = read_bmb(raw)
    leaves = [n for n in data['nodes'] if n['typeId'] != 0]
    if len(leaves) != 1 or leaves[0]['typeId'] != 3:
        raise ValueError('One complete Particle leaf required for this connected fixture')
    leaf = leaves[0]
    catalog = native_catalog(a.apk, [Path('tools/data/particle-native-audit') / name for name in ('bmshaderpack.bin', 'bmshaderpack_gl2.bin')])
    leaf['nativeMaterialSelection'] = select_initial(raw, leaf, catalog)
    attach_basic_material(data, a.authoring.read_bytes())
    attach_inheritance(data, a.authoring.read_bytes())
    tint = leaf['nativeBasicTint']
    if not tint['supported'] or tint['rgba'] != [1,1,1,1]:
        raise ValueError('Matching authoring must verify neutral Basic tint')
    textures = {}
    for binding in leaf['resourceBindings'].values():
        if binding:
            file = (a.texture_root / (binding['name'] + '.png')).resolve()
            if not file.is_relative_to(a.texture_root.resolve()):
                raise ValueError('Resource path escapes texture root')
            textures[binding['name']] = dict(path=str(file), sha256=hashlib.sha256(file.read_bytes()).hexdigest())
    host = json.loads(a.host_request.read_text(encoding='utf-8'))
    native = ParticleAssignmentReference(a.apk)
    blend_id = leaf['materialControls']['blend']['id']
    import struct
    row = list(struct.unpack('<3I', native.image.read(0x255ab8c + blend_id * 12, 12)))
    request = dict(source=str(a.source.resolve()), sourceSha256=hashlib.sha256(raw).hexdigest(),
        textures=textures, textureTint=tint, host=host['host'], root=host['root'],
        blend=dict(id=blend_id, row=row), standaloneFixture=True,
        authoringSha256=hashlib.sha256(a.authoring.read_bytes()).hexdigest())
    request['shaderSelection'] = leaf['nativeMaterialSelection']
    request['parentEvidence'] = [dict(node=n['index'], inheritance=n['authoringInheritance']) for n in data['nodes'] if n['typeId'] == 0]
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps(request, indent=2), encoding='utf-8')
    print(json.dumps({'source': a.source.name, 'nodes': len(data['nodes']), 'material': 'source-verified neutral Basic'}))
