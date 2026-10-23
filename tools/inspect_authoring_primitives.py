"""Inventory local authoring emitters; this does not establish native rendering.

The optional archive-member inventory restricts the search to matching filenames,
not verified binary/authoring pairs. Output belongs in ignored tools/data storage.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET


def inspect(directory, members=None):
    names = None if members is None else {row['name'] for row in members}
    counts = Counter()
    untextured, disabled = [], []
    scanned = 0
    for path in sorted(directory.glob('*.bmsln')):
        if names is not None and path.stem + '.bmb' not in names:
            continue
        source = path.read_bytes()
        nodes = ET.fromstring(source).findall('.//ResIdeNode')
        # These projects begin with an editor template, outside the actual tree.
        if not nodes or nodes[0].findtext('Basic_Meta_Name'):
            raise ValueError('Unrecognized authoring template: ' + str(path))
        scanned += 1
        digest = None
        for index, node in enumerate(nodes[1:]):
            kind = node.findtext('Basic_Meta_NodeType')
            counts[kind] += 1
            if not kind or not kind.startswith('Emitter'):
                continue
            textures = [(node.findtext(f'Texture_Layer{i}_PictureName') or '').strip()
                        for i in (1, 2)]
            enabled = node.findtext('Basic_Meta_Enable')
            if any(textures) and enabled != 'false':
                continue
            if digest is None:
                digest = hashlib.sha256(source).hexdigest()
            row = {'file': path.as_posix(), 'sha256': digest,
                   'nodeIndex': index, 'type': kind,
                   'name': node.findtext('Basic_Meta_Name'),
                   'enable': enabled,
                   'display': node.findtext('Basic_Meta_Display')}
            if not any(textures):
                untextured.append(row)
            if row['enable'] == 'false':
                disabled.append(row)
    return {'scannedFiles': scanned, 'nodeTypeCounts': dict(counts),
            'untexturedEmitters': untextured, 'disabledEmitters': disabled,
            'limits': ['Filename overlap does not verify a binary/authoring pair.',
                       'Empty texture references do not establish native geometry or material behavior.',
                       'Editor enable/display fields are reported, not interpreted as runtime flags.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, default=Path('assets/battle_effect'))
    parser.add_argument('--members', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not args.directory.is_dir():
        parser.error('Authoring directory is missing')
    members = None if args.members is None else json.loads(args.members.read_text(encoding='utf-8'))
    result = inspect(args.directory, members)
    if not result['scannedFiles']:
        parser.error('No authoring files matched')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps({key: result[key] for key in ['scannedFiles', 'nodeTypeCounts']}))
    print(f"Untextured emitters: {len(result['untexturedEmitters'])}; "
          f"disabled emitters: {len(result['disabledEmitters'])}; report: {args.output}")


if __name__ == '__main__':
    main()
