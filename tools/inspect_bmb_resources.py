"""Inspect original IBMB resource tables and stage matching CPK members.

This is a dependency probe, not a BMB scene parser or converter. Names come from
the verified resource tables; emitter behavior and resource bindings are unknown.
Only effectResource archives are considered, avoiding unrelated UI/gacha names.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
from inspect_bmb import read_bmb


def inspect(source, index, output, reader_path):
    root = Path.cwd().resolve()
    source, index, output = source.resolve(), index.resolve(), output.resolve()
    stage_root = (root / 'tools/data').resolve()
    if not output.is_relative_to(stage_root):
        raise ValueError('Output must be inside tools/data')
    data = source.read_bytes()
    if len(data) < 128 or data[:4] != b'IBMB':
        raise ValueError('Expected an original IBMB binary')
    structure = read_bmb(data)
    names = {}
    kinds = {}
    for resource in structure['resources']:
        name = resource['name']
        names.setdefault(name, []).append(resource['stringOffset'])
        kinds.setdefault(name, set()).add(resource['kind'])
    members = {}
    with index.open(encoding='utf-8') as stream:
        for line in stream:
            row = json.loads(line)
            if '/effectresource/' not in row['archive'].replace('\\', '/').lower():
                continue
            stem = Path(row['name']).stem
            kind = {'.png': 'texture', '.m3r': 'model'}.get(Path(row['name']).suffix.lower())
            if stem in names and kind in kinds[stem]:
                members.setdefault(stem, []).append(row)
    spec = importlib.util.spec_from_file_location('cpk_reader', reader_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    report = {
        'source': source.relative_to(root).as_posix(),
        'sourceSha256': hashlib.sha256(data).hexdigest(),
        'sourceBytes': len(data), 'versionBytes': data[4:8].hex(),
        'interpretation': 'Verified texture/model tables; emitter bindings and other resource categories not decoded',
        'structure': structure,
        'resources': [], 'missingCandidates': [],
        'rendered': False,
    }
    output.mkdir(parents=True, exist_ok=True)
    for name, offsets in names.items():
        candidates = members.get(name, [])
        if not candidates:
            report['missingCandidates'].append(name)
        for row in candidates:
            archive = (root / row['archive']).resolve()
            backup = (root / 'com.square_enix.android_googleplay.FFBEWW/files').resolve()
            if not archive.is_relative_to(backup):
                raise ValueError('Archive must be inside the Android backup files directory')
            cpk = module.Cpk(archive)
            try:
                entries = [e for e in cpk.entries if e['name'] == row['name'] and e['dir'] == row['dir']]
                if len(entries) != 1 or entries[0] != {k: row[k] for k in entries[0]}:
                    raise ValueError('Stale or ambiguous member index: ' + row['name'])
                payload = cpk.read(entries[0])
            finally:
                cpk.f.close()
            if len(payload) != row['extract']:
                raise ValueError('Decompressed size mismatch: ' + row['name'])
            # Preserve archive identity rather than choosing between source versions.
            destination = output / 'resources' / archive.stem / row['name']
            if not destination.resolve().is_relative_to(output):
                raise ValueError('Unsafe resource path')
            destination.parent.mkdir(parents=True, exist_ok=True)
            digest = hashlib.sha256(payload).hexdigest()
            if destination.exists() and hashlib.sha256(destination.read_bytes()).hexdigest() != digest:
                raise ValueError('Refusing to replace changed resource: ' + str(destination))
            destination.write_bytes(payload)
            if hashlib.sha256(destination.read_bytes()).hexdigest() != digest:
                raise ValueError('Written resource hash mismatch')
            resource = {
                'candidate': name, 'stringOffsets': offsets, 'archive': row['archive'],
                'member': row['name'], 'bytes': len(payload), 'sha256': digest,
                'headerHex': payload[:16].hex(), 'output': destination.relative_to(root).as_posix(),
            }
            if destination.suffix.lower() == '.png':
                from PIL import Image
                with Image.open(destination) as image:
                    image.verify()
                with Image.open(destination) as image:
                    resource['image'] = {'width': image.width, 'height': image.height, 'mode': image.mode}
            report['resources'].append(resource)
    report_path = output / 'resources.json'
    report_path.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({
        'candidates': len(names), 'extracted': len(report['resources']),
        'missingCandidates': report['missingCandidates'], 'report': str(report_path),
        'rendered': False,
    }, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--index', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--cpk-reader', type=Path, default=Path('ffbe_asset_dump-main/tools/cpk.py'))
    args = parser.parse_args()
    inspect(args.source, args.index, args.output, args.cpk_reader)
