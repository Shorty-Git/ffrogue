"""Corpus defaults for authoring-free visual approximation.

Scans every original BMSLN authoring project in the asset dump and records, per node
type and per XML field, the most frequent value (text + attributes) and its share.
Only used by prepare_original_preview.py --approximate-unverified when an effect has no
matched BMSLN: decoded binary fields still win, and every default taken is listed in
plan.approximations. A corpus mode is a visual approximation, never source evidence.

    <python> tools/build_authoring_defaults.py [--directory assets/battle_effect]
"""
import argparse
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
import xml.etree.ElementTree as ET

OUTPUT = Path('tools/effects/authoring-defaults.json')


def element_value(element):
    return {'text': (element.text or '').strip(), 'attrib': dict(sorted(element.attrib.items()))}


def build(directory):
    counts = defaultdict(Counter)
    nodes_per_type = Counter()
    files = sorted(directory.glob('*.bmsln'))
    digest = hashlib.sha256()
    parsed = 0
    for path in files:
        raw = path.read_bytes()
        digest.update(hashlib.sha256(raw).digest())
        try:
            nodes = ET.fromstring(raw).findall('.//ResIdeNode')[1:]
        except ET.ParseError:
            continue
        parsed += 1
        for node in nodes:
            kind = node.findtext('Basic_Meta_NodeType')
            if not kind:
                continue
            nodes_per_type[kind] += 1
            for child in node:
                if len(child):
                    continue
                counts[(kind, child.tag)][json.dumps(element_value(child), sort_keys=True)] += 1
    defaults = defaultdict(dict)
    for (kind, tag), counter in sorted(counts.items()):
        value, count = counter.most_common(1)[0]
        defaults[kind][tag] = {**json.loads(value), 'share': round(count / sum(counter.values()), 4)}
    return {'schemaVersion': 1, 'profile': 'bmsln-corpus-mode-v1',
            'origin': 'Most frequent value per node type and field over the local BMSLN corpus; '
                      'visual approximation for effects without matched authoring, not source evidence',
            'corpus': {'directory': directory.as_posix(), 'files': len(files), 'parsed': parsed,
                       'sha256OfFileHashes': digest.hexdigest(), 'nodesPerType': dict(sorted(nodes_per_type.items()))},
            'defaults': defaults}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, default=Path('assets/battle_effect'))
    args = parser.parse_args()
    result = build(args.directory)
    OUTPUT.write_text(json.dumps(result, indent=1, sort_keys=True) + '\n', encoding='utf-8')
    print(json.dumps(result['corpus']))
