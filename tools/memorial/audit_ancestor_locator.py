"""Recover only direct-module prefixes from the known revision-18 scope defect."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from inspect_bmb import read_bmb, compare_project
from prepare_diagnostic import EXPECTED_NATIVE


def direct_prefix(node, calls):
    """PostUpdate calls its computed helper and own modules before traversing children."""
    if not calls:
        return {'complete': False, 'calls': [], 'excludedTailCalls': 0}
    expected = [node['computed'], *[m for m in node['modules'] if m.get('fingerprintVerified')]]
    prefix = []
    for index, call in enumerate(calls):
        if index >= len(expected):
            raise ValueError('Direct prefix lacks its closing locator module')
        selected = expected[index]
        if (call['offset'] != selected['offset'] or not call.get('fingerprintVerified')
                or bool(call.get('computed')) != (index == 0)):
            raise ValueError('Unexpected callback inside direct-module prefix')
        prefix.append(call)
        if 'transform_locator' in (call.get('symbol') or ''):
            return {'complete': True, 'calls': prefix, 'excludedTailCalls': len(calls) - len(prefix)}
    return {'complete': False, 'calls': prefix, 'excludedTailCalls': 0}


def audit(log, token, source, authoring):
    records = [json.loads(line[line.index('{'):]) for line in log.read_text(encoding='utf-8-sig').splitlines() if '{' in line]
    matches = [i for i, r in enumerate(records) if r.get('type') == 'armed' and r.get('token') == token]
    if len(matches) != 1:
        raise ValueError('Expected one matching arm')
    index = matches[0]
    boot_index = next(i for i in range(index - 1, -1, -1) if records[i].get('type') == 'boot')
    boot, arm = records[boot_index], records[index]
    if (boot.get('observerRevision') != 18 or boot.get('nativeSha256') != EXPECTED_NATIVE
            or arm.get('locatorNodes') is not True):
        raise ValueError('Recovery applies only to the known exact-build revision-18 capture')
    if not any(r.get('type') == 'calibration-pass' and r.get('values') == [1.25, -2.5, 3.75]
               and r.get('object') == '0x1234' for r in records[boot_index:index]):
        raise ValueError('Missing calibration')
    window = []
    for r in records[index + 1:]:
        if r.get('type') in ('armed', 'boot'):
            break
        if arm['ms'] <= r['ms'] <= arm['ms'] + arm['windowMs']:
            window.append(r)
    decoded = read_bmb(source.read_bytes())
    comparison = compare_project(decoded, authoring.read_bytes())
    xml = ET.fromstring(authoring.read_bytes()).findall('.//ResIdeNode')[1:]
    groups = []
    for node in [r for r in window if r['type'] == 'locator-node']:
        if node['originalSha256'] != decoded['sha256'] or node['sourceOffset'] != decoded['nodes'][node['node']]['offset']:
            raise ValueError('Ancestor/source identity mismatch')
        calls = [r for r in window if r['type'] == 'locator-call' and
                 all(r[k] == node[k] for k in ('file', 'node', 'object', 'sample'))]
        prefix = direct_prefix(node, calls)
        groups.append({'node': node, 'sourceNullType': xml[node['node']].findtext('Detail_Basic_NullType'), **prefix})
    return {'approved': False, 'recoveredDirectPrefixesOnly': True, 'boot': boot, 'arm': arm,
            'logSha256': hashlib.sha256(log.read_bytes()).hexdigest(),
            'sourceSha256': decoded['sha256'], 'authoringSha256': hashlib.sha256(authoring.read_bytes()).hexdigest(),
            'sourceComparison': comparison, 'counts': dict(Counter(r['type'] for r in window)), 'samples': groups,
            'excludedTailCalls': sum(g['excludedTailCalls'] for g in groups),
            'limits': ['Strict full-scope summary rejects this raw capture and remains unchanged.',
                       'Only the initial ordered computed/module prefix through the first locator is retained.',
                       'Later descendant calls under an ancestor scope are explicitly excluded, never relabeled.',
                       'Recovery relies on the pinned PostUpdate order inspected in null-locator-update-static.json.',
                       'Empty/incomplete prefixes do not establish executed ancestor transforms.',
                       'No whole-animation fidelity or general variant selection is approved.']}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    for flag in ('log', 'token', 'source', 'authoring', 'output'):
        p.add_argument('--' + flag, required=True, type=str if flag == 'token' else Path)
    a = p.parse_args()
    if not a.output.resolve().is_relative_to(Path('tools/data').resolve()):
        p.error('Output must stay inside tools/data')
    result = audit(a.log, a.token, a.source, a.authoring)
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'counts': result['counts'], 'excludedTailCalls': result['excludedTailCalls'],
                      'complete': dict(Counter(g['node']['node'] for g in result['samples'] if g['complete']))}, indent=2))
