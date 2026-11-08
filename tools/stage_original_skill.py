"""Stage one inspected skill's original effect dependencies for offline review.

Uses the existing character/enemy intake report and local CPK member index. Does not publish
runtime assets, choose substitutes, or infer gameplay mechanics.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
from inspect_bmb_resources import inspect


def select_identical_original(rows, read):
    """Aliases are safe only after every original payload has been read and hashed."""
    if not rows:raise ValueError('Missing original member')
    ordered=sorted(rows,key=lambda r:(r['archive'],r['dir'],r['name']))
    variants=[(row,read(row)) for row in ordered]
    identities=[dict(archive=row['archive'],member=row['name'],sha256=hashlib.sha256(data).hexdigest()) for row,data in variants]
    if len({r['sha256'] for r in identities})!=1:
        raise ValueError('Ambiguous original versions: '+json.dumps(identities))
    return variants[0][0],variants[0][1],identities


def stage(report_path, skill_id, kind, index, output, reader_path):
    root = Path.cwd().resolve()
    output = output.resolve()
    if not output.is_relative_to(root / 'tools/data'):
        raise ValueError('Output must stay inside tools/data')
    report = json.loads(report_path.read_text(encoding='utf-8'))
    matches = [s for s in report['catalog'] if s['kind'] == kind and s['id'] == skill_id]
    if len(matches) != 1:
        raise ValueError('Expected one inspected skill identity')
    skill = matches[0]
    names = {m['originalFile'] for branch in skill['effects']
             for group in branch['groups'] for m in group['members']}
    if not names:
        raise ValueError('No original visual members resolved')
    rows = [json.loads(line) for line in index.read_text(encoding='utf-8').splitlines()]
    spec = importlib.util.spec_from_file_location('cpk_reader', reader_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    originals = []
    def read_indexed(row):
        archive=(root/row['archive']).resolve()
        if not archive.is_relative_to(root/'rawdata/android-global/files'):
            raise ValueError('Archive must stay inside backup files directory')
        cpk=module.Cpk(archive)
        try:
            entries=[e for e in cpk.entries if e['name']==row['name'] and e['dir']==row['dir']]
            if len(entries)!=1 or entries[0]!={k:row[k] for k in entries[0]}:raise ValueError('Stale archive index')
            data=cpk.read(entries[0])
        finally:cpk.f.close()
        if len(data)!=row['extract']:raise ValueError('Original decompressed size mismatch')
        return data
    for name in sorted(names):
        matches = [r for r in rows if r['name'] == name and
                   '/battleEffect/' in r['archive'].replace('\\', '/')]
        if not matches:raise ValueError('Missing original member: '+name)
        row,data,aliases=select_identical_original(matches,read_indexed)
        destination = output / 'originals' / name
        if not destination.resolve().is_relative_to(output):
            raise ValueError('Unsafe original member name')
        digest = hashlib.sha256(data).hexdigest()
        if destination.exists() and hashlib.sha256(destination.read_bytes()).hexdigest() != digest:
            raise ValueError('Refusing to replace changed original: ' + name)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
        resource_output = output / 'effects' / Path(name).stem
        inspect(destination, index, resource_output, reader_path)
        resources = json.loads((resource_output / 'resources.json').read_text(encoding='utf-8'))
        if resources['missingCandidates']:
            raise ValueError('Unresolved original dependencies: ' + str(resources['missingCandidates']))
        originals.append({'archive': row['archive'], 'member': name, 'sha256': digest, 'bytes': len(data),
                          'verifiedIdenticalAliases':aliases})
    receipt = {'unitId': report['unit']['spriteUnitId'], 'skill': skill, 'originals': originals,
               'inspectionSha256': hashlib.sha256(report_path.read_bytes()).hexdigest(), 'rendered': False}
    (output / 'skill-source.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    print(f"Staged {skill['name']}: {len(originals)} original effects; no runtime publication")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--skill-id', type=int, required=True)
    parser.add_argument('--kind', choices=['ABILITY', 'MAGIC', 'MONSTER_SKILL'], default='ABILITY')
    parser.add_argument('--index', type=Path, default=Path('tools/data/android-cpk-audit/members.jsonl'))
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--cpk-reader', type=Path, default=Path('rawdata/ffbe_asset_dump/tools/cpk.py'))
    args = parser.parse_args()
    stage(args.report, args.skill_id, args.kind, args.index, args.output, args.cpk_reader)
