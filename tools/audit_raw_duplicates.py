"""Inventory the local FFBE raw-data extractions and find byte-identical duplicates.

Read-only: it never moves or deletes anything. Files are grouped by size first and only
same-size candidates are hashed (SHA-256), so a full run over ~30 GB stays practical.
Besides exact duplicates it reports "same logical name" pairs across sources (version
prefixes such as ``Ver2_`` stripped, extension ignored), which catches the same resource
stored in a different form (raw .acb vs decoded .wav, CGG vs PNG).

Usage:
  python -I tools/audit_raw_duplicates.py --out tools/data/raw-dedup
"""
import argparse
import hashlib
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

SOURCES = {
    'android-global': 'com.square_enix.android_googleplay.FFBEWW',
    'jp-assetpacks': 'tools/data/memorial-audit/trace-clone-backup/assetpacks',
    'github-asset-dump': 'ffbe_asset_dump-main',
    'github-data': 'ffbe_data-master',
    'godot-assets': 'assets',
}
VERSION_PREFIX = re.compile(r'^Ver\d+_', re.I)


def logical_name(path: Path) -> str:
    name = path.name
    if name.endswith('.import'):
        name = name[:-7]
    name = VERSION_PREFIX.sub('', name)
    return name.split('.', 1)[0].lower()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b''):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='.')
    parser.add_argument('--out', default='tools/data/raw-dedup')
    args = parser.parse_args()
    root = Path(args.root).resolve()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    files = []
    per_source = {}
    for source, rel in SOURCES.items():
        base = root / rel
        count = size = 0
        if base.is_dir():
            for dirpath, _, names in os.walk(base):
                for name in names:
                    path = Path(dirpath) / name
                    try:
                        length = path.stat().st_size
                    except OSError:
                        continue
                    files.append((source, path, length))
                    count += 1
                    size += length
        per_source[source] = {'path': rel, 'present': base.is_dir(), 'files': count, 'bytes': size}
        print(f'{source}: {count} files, {size / 2**30:.2f} GiB', flush=True)

    by_size = defaultdict(list)
    for item in files:
        if item[2] > 0:
            by_size[item[2]].append(item)
    by_hash = defaultdict(list)
    candidates = [group for group in by_size.values() if len(group) > 1]
    total = sum(len(group) for group in candidates)
    done = 0
    for group in candidates:
        for source, path, length in group:
            by_hash[(length, sha256(path))].append((source, path))
            done += 1
            if done % 5000 == 0:
                print(f'hashed {done}/{total}', flush=True)

    groups = []
    pair_bytes = defaultdict(int)
    pair_files = defaultdict(int)
    wasted = 0
    for (length, digest), members in by_hash.items():
        if len(members) < 2:
            continue
        wasted += length * (len(members) - 1)
        sources = sorted({source for source, _ in members})
        key = '+'.join(sources)
        pair_bytes[key] += length * (len(members) - 1)
        pair_files[key] += 1
        groups.append({'sha256': digest, 'bytes': length, 'sources': sources,
                       'paths': [str(path.relative_to(root)).replace('\\', '/') for _, path in members]})

    names = defaultdict(lambda: defaultdict(list))
    for source, path, _ in files:
        names[logical_name(path)][source].append(str(path.relative_to(root)).replace('\\', '/'))
    cross_names = defaultdict(int)
    for per in names.values():
        if len(per) > 1:
            cross_names['+'.join(sorted(per))] += 1

    summary = {
        'sources': per_source,
        'duplicateGroups': len(groups),
        'redundantBytes': wasted,
        'duplicatesBySourceSet': {key: {'groups': pair_files[key], 'redundantBytes': pair_bytes[key]}
                                  for key in sorted(pair_bytes, key=pair_bytes.get, reverse=True)},
        'sameLogicalNameBySourceSet': dict(sorted(cross_names.items(), key=lambda kv: -kv[1])),
    }
    (out / 'summary.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    groups.sort(key=lambda group: -group['bytes'] * (len(group['paths']) - 1))
    (out / 'duplicate-groups.json').write_text(json.dumps(groups, indent=1), encoding='utf-8')
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())
