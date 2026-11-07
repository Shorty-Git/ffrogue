"""Summarize bounded native Particle observations without approving rendering."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
from prepare_diagnostic import EXPECTED_NATIVE


def summarize(log, token):
    records = []
    for line in log.read_text(encoding='utf-8-sig').splitlines():
        offset = line.find('{')
        if offset >= 0:
            records.append(json.loads(line[offset:]))
    arms = [i for i, row in enumerate(records) if row.get('type') == 'armed' and row.get('token') == token]
    if len(arms) != 1:
        raise ValueError('Expected one matching capture token')
    index = arms[0]
    boot = next((i for i in range(index - 1, -1, -1) if records[i].get('type') == 'boot'), None)
    if boot is None or records[boot].get('nativeSha256') != EXPECTED_NATIVE:
        raise ValueError('Missing pinned native boot provenance')
    if not any(row.get('type') == 'calibration-pass' and row.get('object') == '0x1234'
               and row.get('values') == [1.25, -2.5, 3.75] for row in records[boot:index]):
        raise ValueError('Missing calibration evidence')
    arm = records[index]
    if arm.get('particleNode') is not True:
        raise ValueError('Particle observation was not armed')
    window = []
    for row in records[index + 1:]:
        if row['type'] in ('armed', 'boot'):
            break
        if arm['ms'] <= row['ms'] <= arm['ms'] + arm['windowMs']:
            window.append(row)
    groups = {}
    for row in window:
        if row['type'] != 'particle-node-state':
            continue
        key = (row['file'], row['node'], row['object'])
        group = groups.setdefault(key, dict(file=row['file'], node=row['node'], object=row['object'], samples=[]))
        sample = len(group['samples']) + 1
        calls = [call for call in window if call['type'] == 'particle-module-call'
                 and (call['file'], call['node'], call['object']) == key and call['sample'] == sample]
        selected = {module['offset'] for module in row['modules'] if module.get('fingerprintVerified')}
        if any(call['offset'] not in selected or call.get('fingerprintVerified') is not True for call in calls):
            raise ValueError('Executed module does not match selected fingerprinted callbacks')
        group['samples'].append(dict(state=row, calls=calls))
    for group in groups.values():
        states = [sample['state'] for sample in group['samples']]
        calls = [call for sample in group['samples'] for call in sample['calls']]
        group.update(selectedEntries=sorted({state['vertexEntry']['offset'] for state in states}),
                     selectedBufferWriters=sorted({state['bufferWriter']['offset'] for state in states}),
                     executedModules=dict(Counter(call['symbol'] for call in calls)),
                     samplesWithLiveCount=sum(state['rawLiveCount14c'] > 0 for state in states),
                     fullSourceHashMatches=all(state['fullSourceHashMatches'] for state in states),
                     alphaValuesCaptured=any('contextAlphaAfter' in call for call in calls),
                     shaderSelectionVerified=False)
    locator_nodes = [row for row in window if row['type'] == 'locator-node']
    locator_calls = [row for row in window if row['type'] == 'locator-call']
    for call in locator_calls:
        matches = [row for row in locator_nodes if all(row.get(key) == call.get(key)
                   for key in ('file', 'node', 'object', 'sample')) and row['ms'] <= call['ms']]
        if len(matches) != 1:
            raise ValueError('Locator call lacks one selected node sample')
        selected = [matches[0]['computed']] if call.get('computed') else matches[0]['modules']
        if call.get('fingerprintVerified') is not True or not any(
                module['offset'] == call['offset'] and module.get('fingerprintVerified') is True
                for module in selected):
            raise ValueError('Locator call does not match selected fingerprinted callback')
    return dict(approved=False, logSha256=hashlib.sha256(log.read_bytes()).hexdigest(),
                boot=records[boot], arm=arm, counts=dict(Counter(row['type'] for row in window)),
                commandSources=[row for row in window if row['type'] == 'command-frame-source'],
                sourceMemory=[row for row in window if row['type'] == 'particle-source-memory'],
                sourceChunks=[row for row in window if row['type'] == 'particle-source-chunk'],
                vertices=[row for row in window if row['type'] == 'particle-vertices'],
                vertexUnreadable=[row for row in window if row['type'] == 'particle-vertex-unreadable'],
                unreadable=[row for row in window if row['type'] == 'particle-node-unreadable'],
                particles=list(groups.values()),
                locatorNodes=locator_nodes, locatorCalls=locator_calls,
                locatorUnreadable=[row for row in window if row['type'] == 'locator-unreadable'],
                limitations=['Filename/offset/window matching is distinct from full in-memory BMB equality.',
                             'A selected callback is counted as executed only when a scoped call was recorded.',
                             'Callback names do not prove whether alpha/transform curves were evaluated earlier.',
                             'Draw-data bytes are uninterpreted; shader selection and native fidelity remain unverified.'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--log', type=Path, required=True)
    parser.add_argument('--token', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must stay inside ignored tools/data')
    result = summarize(args.log, args.token)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(dict(observerRevision=result['boot']['observerRevision'],
                         particleObjects=len(result['particles']),
                         nodeSamples=result['counts'].get('particle-node-state', 0),
                         moduleCalls=result['counts'].get('particle-module-call', 0),
                         unreadable=len(result['unreadable'])), indent=2))
