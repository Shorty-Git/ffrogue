"""Inspect the verified single-branch character/ability visual composition rule."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sqlite3

from memorial.prepare_diagnostic import EXPECTED_NATIVE


def parse_effects(raw):
    if not isinstance(raw, str) or not raw:
        raise ValueError('An explicit nonempty effect timeline is required')
    entries = raw.split('&')
    if any(not re.fullmatch(r'\d+:\d+(?::-?\d+){1,3}', entry) for entry in entries):
        raise ValueError('Only ordinary single-branch 3-5 field effect entries are supported')
    return [entry.split(':') for entry in entries]


def compose_effects(unit_frames, skill_frames, motion_type):
    skill = parse_effects(skill_frames)
    if motion_type != 1:
        return {'effectFrames': skill_frames, 'skillFrameOffset': 0,
                'rule': 'Source-only: native motion gate does not select attack composition'}
    unit = parse_effects(unit_frames)
    offset = max(int(entry[0]) for entry in unit)
    shifted = [[str(int(entry[0]) + offset), *entry[1:]] for entry in skill]
    return {'effectFrames': '&'.join(':'.join(entry) for entry in [*unit, *shifted]),
            'skillFrameOffset': offset,
            'rule': 'Motion 1: unit effects followed by skill effects shifted by latest unit effect start'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', type=Path, default=Path('rawdata/assets/static_data/ffbe-data.db'))
    parser.add_argument('--unit-id', type=int, required=True)
    parser.add_argument('--skill-id', type=int, required=True)
    parser.add_argument('--trace', type=Path, help='Optional revision-11 summary for this exact unit/ability')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must stay inside ignored tools/data')
    with sqlite3.connect(args.database.resolve().as_uri() + '?mode=ro', uri=True) as db:
        db.row_factory = sqlite3.Row
        unit = db.execute('SELECT unitId, unitName, effectFrames FROM unit WHERE unitId=?',
                          (args.unit_id,)).fetchone()
        skill = db.execute('SELECT abilityId, name, motionType, effectFrames FROM ability WHERE abilityId=?',
                           (args.skill_id,)).fetchone()
    if unit is None or skill is None:
        raise ValueError('Exact unit or ability record missing')
    result = {'schemaVersion': 1, 'unit': dict(unit), 'skill': dict(skill),
              **compose_effects(unit['effectFrames'], skill['effectFrames'], skill['motionType']),
              'approved': False, 'traceVerified': False,
              'source': {'path': args.database.as_posix(),
                         'sha256': hashlib.sha256(args.database.read_bytes()).hexdigest()},
              'limits': ['Research metadata only; no extraction or runtime publication',
                         'Ordinary single-branch abilities only; no equipment or skin overrides',
                         'Visual timing only; damage, camera and particle fidelity are separate']}
    if args.trace:
        trace = json.loads(args.trace.read_text(encoding='utf-8-sig'))
        matches = [row for row in trace.get('executionRecords', [])
                   if row['type'] == 'battle-effect-input'
                   and (row.get('command') or {}).get('skillId') == args.skill_id
                   and row.get('sourceUnit', {}).get('playerClassMatched') is True
                   and row.get('sourceUnit', {}).get('unitId') == args.unit_id]
        if (not trace.get('calibrationPassed') or not matches
                or trace.get('boot', {}).get('nativeSha256') != EXPECTED_NATIVE
                or trace.get('boot', {}).get('observerRevision', 0) < 11):
            raise ValueError('No calibrated execution input for the exact unit/ability pair')
        if any(row['effectFrames'] != result['effectFrames'] for row in matches):
            raise ValueError('Composed timeline differs from actual execution input')
        result['traceVerified'] = True
        result['trace'] = {'path': args.trace.as_posix(),
                           'sha256': hashlib.sha256(args.trace.read_bytes()).hexdigest(),
                           'effectInputIds': [row['effectInputId'] for row in matches]}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
