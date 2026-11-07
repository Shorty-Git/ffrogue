"""Summarize one manually armed Memorial trace; never publish runtime assets."""
import argparse
from collections import Counter
import json
from pathlib import Path


def summarize(log, token, source):
    records = []
    for line in log.read_text(encoding='utf-8-sig').splitlines():
        offset = line.find('{')
        if offset < 0:
            continue
        record = json.loads(line[offset:])
        if 'type' in record and 'ms' in record:
            records.append(record)
    matches = [i for i, row in enumerate(records)
               if row['type'] == 'armed' and row.get('token') == token]
    if len(matches) != 1:
        raise ValueError('Expected exactly one matching arm record')
    index = matches[0]
    arm = records[index]
    boot_index = next((i for i in range(index - 1, -1, -1)
                       if records[i]['type'] == 'boot'), None)
    if boot_index is None:
        raise ValueError('Capture lacks observer boot provenance')
    startup = records[boot_index:index]
    window = []
    for row in records[index + 1:]:
        if row['type'] in ('boot', 'armed'):
            break
        if arm['ms'] <= row['ms'] <= arm['ms'] + arm['windowMs']:
            window.append(row)
    objects = {}
    for row in window:
        if row['type'] not in ('transform', 'integer', 'effect-file'):
            continue
        obj = objects.setdefault(row['object'], {
            'object': row['object'], 'filenames': [], 'firstMs': row['ms'],
            'lastMs': row['ms'], 'finalInputs': {}, 'records': [],
        })
        obj['lastMs'] = row['ms']
        obj['records'].append(row)
        if row['type'] == 'effect-file':
            if row['file'] not in obj['filenames']:
                obj['filenames'].append(row['file'])
        else:
            obj['finalInputs'][row['name']] = row.get('values', row.get('value'))
    expected = []
    skill = source['skill']
    for branch in skill['effects']:
        for group in branch['groups']:
            for member in group.get('members', []):
                original = member.get('originalFile')
                if not original:
                    continue
                expected.append({
                    'groupId': group['groupId'], 'originalFile': original,
                    'sourceScalePercent': member.get('scalePercent'),
                    'groupStartFrame': group['startFrame'],
                    'rawMember': member['raw'],
                    'matchingObjects': [obj['object'] for obj in objects.values()
                                        if Path(original).stem in obj['filenames']],
                })
    calibrated = any(row['type'] == 'calibration-pass'
                     and row.get('object') == '0x1234'
                     and row.get('values') == [1.25, -2.5, 3.75]
                     for row in startup)
    return {
        'schemaVersion': 1, 'boot': records[boot_index], 'arm': arm,
        'calibrationPassed': calibrated,
        'eventCounts': dict(Counter(row['type'] for row in window)),
        'placementContexts': [row for row in window
                              if row['type'] in ('placement-context', 'placement-context-end',
                                                 'unreadable-placement-context')],
        'factoryResults': [row for row in window if row['type'] == 'factory-result'],
        'rendererStates': [row for row in window
                           if row['type'] in ('renderer-state', 'renderer-state-unreadable')],
        'cameraReferences': [row for row in window
                             if row['type'] in ('camera-reference', 'camera-reference-unreadable')],
        'locatorRecords': [row for row in window
                           if row['type'] in ('locator-node', 'locator-call', 'locator-unreadable')],
        'executionRecords': [row for row in window if row['type'] in (
            'skill-execution-start', 'skill-execution-end', 'command-frame-source',
            'command-frame-unreadable', 'battle-effect-input', 'battle-effect-input-end',
            'battle-effect-input-unreadable')],
        'capturedCommandSkillIds': sorted({row['skillId'] for row in window
                                          if row['type'] == 'command-frame-source'}),
        'objects': list(objects.values()),
        'comparisonSource': {'unitId': source['unitId'], 'kind': skill['kind'],
                             'id': skill['id'], 'name': skill['name']},
        'expectedComponents': expected,
        'identityVerifiedByTrace': False,
        'limits': [
            'Source selection is supplied by the caller, not a captured skill ID',
            'Names match exactly after removing the source file extension only',
            'Other actions or battle feedback may share the recording window',
            'Object pointers are capture-local and may be reused',
            'Setter inputs and wall-clock times do not decode native rendering',
        ],
    }


def compare_plan(report, plan):
    if plan['sourceId'] != report['comparisonSource']['id']:
        raise ValueError('Preview plan and selected source skill IDs differ')
    members = []
    for member in plan['members']:
        effect = plan['effects'][member['effect']]
        name = Path(effect['name']).stem
        observed = []
        for obj in report['objects']:
            if name not in obj['filenames']:
                continue
            values = obj['finalInputs']
            wait = values.get('wait-frame')
            observed.append({
                'object': obj['object'], 'inputs': values,
                'scaleMatches': values.get('scale-xy') == [member['scalePercent'] / 100] * 2,
                'zeroRotationMatches': (values.get('rotation-xyz') == [0, 0, 0]
                                        and member['rotation'] == [0, 0, 0]),
                'waitMinusPlanStart': wait - member['startFrame'] if isinstance(wait, int) else None,
            })
        members.append({'effect': effect['name'], 'effectSha256': effect['sha256'],
                        'planMember': member, 'observedObjects': observed})
    return {'sourceId': plan['sourceId'], 'approved': plan['approved'],
            'planSourceSha256': plan['sourceSha256'], 'members': members,
            'sourceHitMarkers': plan['sourceHits'],
            'limits': ['Scale comparison covers wrapper inputs, not final particle size',
                       'Only zero rotation equivalence is assessed; angular units remain unknown',
                       'Wait values and plan start ticks have unverified scheduling semantics',
                       'Native screen positions are not comparable to preview world coordinates',
                       'Raw member placement fields remain unevaluated by the current player']}


def verify_placement(report, source):
    """Check ordinary, unflipped native group inputs without guessing anchors."""
    if not report['calibrationPassed']:
        return [{'status': 'uncalibrated-capture'}]
    contexts = {row['contextId']: row for row in report['placementContexts']
                if row['type'] == 'placement-context' and row['name'] == 'effect-group'}
    results = []
    for branch in source['skill']['effects']:
        for group in branch['groups']:
            for member in group.get('members', []):
                name = Path(member.get('originalFile') or '').stem
                for obj in report['objects']:
                    if name not in obj['filenames']:
                        continue
                    item = {'object': obj['object'], 'file': name, 'groupId': group['groupId']}
                    context_ids = {row.get('contextId') for row in obj['records']}
                    if len(context_ids) != 1 or next(iter(context_ids)) not in contexts:
                        results.append({**item, 'status': 'unresolved-context'})
                        continue
                    context = contexts[next(iter(context_ids))]
                    fields = member['raw'].split(':')
                    if context['groupId'] != group['groupId'] or context['flagsInput'] != 0 or len(fields) != 8:
                        results.append({**item, 'status': 'unsupported-context-or-member'})
                        continue
                    modes = [int(fields[4]), int(fields[5])]
                    if any(mode not in range(1, 7) for mode in modes):
                        results.append({**item, 'status': 'unknown-axis-mode'})
                        continue
                    rectangle = context['rectangle']
                    base = [rectangle[i] + rectangle[i + 2] * ((modes[i] - 1) % 3) / 2
                            + int(fields[i + 6]) for i in range(2)]
                    position = obj['finalInputs'].get('position-xy')
                    if position is None:
                        results.append({**item, 'status': 'missing-position'})
                        continue
                    residual = [position[i] - base[i] for i in range(2)]
                    compatible = all(abs(delta - round(delta)) < 0.001 and abs(delta) <= 8.001
                                     if mode <= 3 else abs(delta) < 0.001
                                     for mode, delta in zip(modes, residual))
                    expected_wait = context['baseWaitInput'] + int(fields[0])
                    results.append({**item, 'status': 'measured', 'contextId': context['contextId'],
                                    'rectangle': rectangle, 'axisModes': modes,
                                    'offset': [int(fields[6]), int(fields[7])],
                                    'positionBeforeScatter': base, 'observedPosition': position,
                                    'scatterResidual': residual, 'scatterCompatible': compatible,
                                    'expectedWaitInput': expected_wait,
                                    'waitMatches': obj['finalInputs'].get('wait-frame') == expected_wait})
    return results


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--log', type=Path, required=True)
    parser.add_argument('--token', required=True)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--plan', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must stay inside ignored tools/data')
    source = json.loads(args.source.read_text(encoding='utf-8-sig'))
    report = summarize(args.log, args.token, source)
    report['placementVerification'] = verify_placement(report, source)
    if args.plan:
        report['previewComparison'] = compare_plan(
            report, json.loads(args.plan.read_text(encoding='utf-8-sig')))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({
        'calibrationPassed': report['calibrationPassed'],
        'eventCounts': report['eventCounts'], 'objectCount': len(report['objects']),
        'components': report['expectedComponents'],
        'observedFiles': sorted({name for obj in report['objects']
                                 for name in obj['filenames']}),
    }, indent=2))
