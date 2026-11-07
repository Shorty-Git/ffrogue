"""Export loaded static master evidence from one exact-build diagnostic session."""
import argparse
import hashlib
import json
from pathlib import Path

from prepare_diagnostic import EXPECTED_NATIVE


def export_reference(records, token, sources):
    matches = [i for i, row in enumerate(records)
               if row.get('type') == 'armed' and row.get('token') == token]
    if len(matches) != 1:
        raise ValueError('Expected exactly one matching arm record')
    arm_index = matches[0]
    boot_index = next((i for i in range(arm_index - 1, -1, -1)
                       if records[i].get('type') == 'boot'), None)
    if boot_index is None:
        raise ValueError('Missing observer boot')
    boot = records[boot_index]
    if boot.get('nativeSha256') != EXPECTED_NATIVE or boot.get('observerRevision', 0) < 10:
        raise ValueError('Unexpected native build or observer revision')
    end = next((i for i in range(arm_index + 1, len(records))
                if records[i].get('type') in ('boot', 'armed')), len(records))
    session = records[boot_index:end]
    if not any(row.get('type') == 'calibration-pass' and row.get('object') == '0x1234'
               and row.get('values') == [1.25, -2.5, 3.75] for row in records[boot_index:arm_index]):
        raise ValueError('Missing startup calibration')
    if any(row.get('type') in ('blocked', 'master-row-unreadable') for row in session):
        raise ValueError('Session contains failed master observation')
    tables = {'hit-profile-row': {}, 'process-profile-row': {}}
    for row in session:
        if row.get('type') not in tables:
            continue
        table = tables[row['type']]
        fields = ('effectGroupId', 'effectDelayFrame') if row['type'] == 'hit-profile-row' else ('hitType',)
        value = {field: row[field] for field in fields}
        if row['id'] in table and table[row['id']] != value:
            raise ValueError('Conflicting master rows')
        table[row['id']] = value
    native_skills = {}
    arm = records[arm_index]
    for row in records[arm_index + 1:end]:
        if not arm['ms'] <= row['ms'] <= arm['ms'] + arm['windowMs']:
            continue
        if row['type'] == 'skill-source-row':
            if row['id'] in native_skills:
                raise ValueError('Duplicate skill snapshot')
            native_skills[row['id']] = row
    comparisons = []
    for source in sources:
        skill = source['skill']
        native = native_skills.get(skill['id'])
        if native is None:
            raise ValueError('Missing loaded ability: ' + str(skill['id']))
        comparisons.append({'id': skill['id'], 'name': skill['name'],
                            'fields': {field: {'local': skill['raw'][field], 'native': native[field],
                                               'matches': skill['raw'][field] == native[field]}
                                       for field in ('effectFrames', 'attackFrames')}})
    return {'schemaVersion': 1, 'boot': boot, 'token': token,
            'hitProfiles': tables['hit-profile-row'], 'processProfiles': tables['process-profile-row'],
            'skillComparisons': comparisons, 'approved': False,
            'limits': ['Static master snapshots are not execution traces',
                       'Do not infer missing profiles or publish runtime assets from this receipt']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--log', type=Path, required=True)
    parser.add_argument('--token', required=True)
    parser.add_argument('--source', type=Path, action='append', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must stay inside ignored tools/data')
    records = []
    for line in args.log.read_text(encoding='utf-8-sig').splitlines():
        offset = line.find('{')
        if offset >= 0:
            row = json.loads(line[offset:])
            if 'type' in row and 'ms' in row:
                records.append(row)
    result = export_reference(records, args.token,
                              [json.loads(p.read_text(encoding='utf-8-sig')) for p in args.source])
    result['inputs'] = [{'path': p.as_posix(), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
                        for p in [args.log, *args.source]]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'hitProfiles': len(result['hitProfiles']),
                      'processProfiles': len(result['processProfiles']),
                      'skillComparisons': result['skillComparisons']}, indent=2))


if __name__ == '__main__':
    main()
