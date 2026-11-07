"""Audit one bounded context capture; never grant effect playback support."""
import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import struct
from prepare_diagnostic import EXPECTED_NATIVE


def audit(log, token, spec, sources, reference=None):
    rows = [json.loads(line) for line in log.read_text(encoding='utf-8-sig').splitlines()
            if line.startswith('{')]
    arms = [i for i, row in enumerate(rows) if row.get('type') == 'armed' and row.get('token') == token]
    if len(arms) != 1:
        raise ValueError('Expected exactly one matching arm')
    at = arms[0]
    boot = next((i for i in range(at - 1, -1, -1) if rows[i]['type'] == 'boot'), None)
    if boot is None or rows[boot].get('nativeSha256') != EXPECTED_NATIVE or rows[boot].get('observerRevision', 0) < 20:
        raise ValueError('Missing pinned pipeline observer boot')
    startup = rows[boot:at]
    if (not any(r['type'] == 'calibration-pass' and r.get('object') == '0x1234'
                and r.get('values') == [1.25, -2.5, 3.75] for r in startup)
            or any(r['type'] in ('blocked', 'calibration-failed') for r in startup)):
        raise ValueError('Missing valid startup calibration')
    arm = rows[at]
    if arm.get('pipelineCapture') is not True:
        raise ValueError('Pipeline capture was not armed')
    window = []
    for row in rows[at + 1:]:
        if row['type'] in ('boot', 'armed'):
            break
        if arm['ms'] <= row['ms'] <= arm['ms'] + arm['windowMs']:
            window.append(row)
    source_bytes = {p.stem: p.read_bytes() for p in sources}
    modules = {m['offset']: m for m in spec['modules']}
    nodes = {(n['file'], n['node']): n for n in spec['nodes']}
    samples = {}
    for row in window:
        if row['type'] != 'pipeline-sample':
            continue
        key = row['sampleId']
        if key in samples:
            raise ValueError('Duplicate pipeline sample')
        node = nodes[(row['file'], row['node'])]
        raw = source_bytes[row['file']]
        if hashlib.sha256(raw).hexdigest() != node['sourceSha256'] or row['sourceSha256'] != node['sourceSha256']:
            raise ValueError('Source identity mismatch')
        ends = [r for r in window if r['type'] == 'pipeline-sample-end' and r['sampleId'] == key]
        if len(ends) != 1 or ends[0]['stage'] != row['stage']:
            raise ValueError('Incomplete sample scope')
        samples[key] = (row, ends[0])
    replays, initializers = [], []
    calls = [r for r in window if r['type'] == 'pipeline-module']
    for row in calls:
        sample, end = samples[row['sampleId']]
        if (any(row[k] != sample[k] for k in ('file', 'node', 'stage'))
                or not sample['seq'] < row['seq'] < end['seq']):
            raise ValueError('Callback escaped its sample identity/scope')
        selected = {c['offset'] for c in sample['callbacks'] if c.get('verified')}
        module = modules[row['offset']]
        if (row['offset'] not in selected or row.get('fingerprintVerified') is not True
                or row['symbol'] != module['name']):
            raise ValueError('Callback fingerprint/selection mismatch')
        if rows[boot]['observerRevision'] >= 21:
            hook = module.get('hook', module)
            if (row.get('hookOffset') != hook['offset'] or row.get('hookSymbol') != hook['name']
                    or row.get('hookFingerprintVerified') is not True):
                raise ValueError('Selected wrapper and observed implementation identity mismatch')
        before, after = row['before'], row['after']
        size = module['recordBytes']
        if (before['record'] != after['record'] or after['cursor'] - before['cursor'] != size
                or before['recordOffset'] != before['cursor'] or after['recordOffset'] != before['recordOffset']):
            raise ValueError('Record identity/cursor mismatch')
        for snap in (before, after):
            if size:
                raw_record = bytes.fromhex(snap['recordHex'])
                if len(raw_record) != size:
                    raise ValueError('Unexpected raw record span')
                decoded = [v if math.isfinite(v) else None for v in struct.unpack('<' + 'f' * (size // 4), raw_record)]
                if decoded != snap['recordFloats']:
                    raise ValueError('Raw record and decoded floats disagree')
        if row['stage'] in ('init', 'update'):
            owned = int(before['rngPointer'], 16) == int(sample['emitter'], 16) + 0x130
            if owned != row['rngMatchesEmitter']:
                raise ValueError('RNG ownership flag disagrees with captured pointers')
        # Execute the already-reviewed original ARM64 scalar initializer with the
        # captured RNG state, rather than fitting a random seed to the result.
        mode = next((m for m in ('ConstX', 'VelocityX') if 'Init' + m in row['symbol']), None)
        if reference is not None and row['stage'] == 'init' and mode:
            if row.get('rngMatchesEmitter') is not True:
                raise ValueError('Initializer RNG does not belong to selected emitter')
            node = nodes[(row['file'], row['node'])]
            raw = source_bytes[row['file']]
            values = [struct.unpack_from('<f', raw, node['nodeOffset'] + field)[0]
                      for field in (0x30c, 0x318, 0x324, 0x330)]
            result = reference.run(mode, initial=values[0], value_range=values[1],
                                   velocity=values[2], velocity_range=values[3], rng=before['rngWords'])
            record_match = struct.pack('<' + 'f' * len(result['initialRecord']), *result['initialRecord']).hex() == after['recordHex']
            rng_match = result['rngAfter'] == after['rngWords']
            replays.append(dict(sampleId=row['sampleId'], mode=mode, sourceValues=values,
                                recordMatches=record_match, rngMatches=rng_match))
            if not record_match or not rng_match:
                raise ValueError('Original scalar initializer disagrees with captured output')
            initializers.append((row, mode, values))
    trajectories = []
    for init, mode, values in initializers:
        if mode != 'VelocityX':
            continue
        owner = samples[init['sampleId']][0]['emitter']
        updates = [r for r in calls if r['stage'] == 'update' and 'update9VelocityX' in r['symbol']
                   and (r['file'], r['node']) == (init['file'], init['node']) and r['seq'] > init['seq']
                   and samples[r['sampleId']][0]['emitter'] == owner
                   and r['before']['record'] == init['after']['record']
                   and r['before']['recordOffset'] == init['after']['recordOffset']]
        updates.sort(key=lambda r: r['seq'])
        if not updates:
            continue
        # Stop at a captured reuse of the same particle record; never stitch
        # separate births into a synthetic trajectory.
        rebirths = [r['seq'] for r, _, _ in initializers if r['seq'] > init['seq']
                    and r['file'] == init['file'] and r['node'] == init['node']
                    and r['after']['record'] == init['after']['record']
                    and r['after']['recordOffset'] == init['after']['recordOffset']]
        if rebirths:
            updates = [r for r in updates if r['seq'] < min(rebirths)]
        contiguous = all(r['before']['recordHex'] == (init if i == 0 else updates[i - 1])['after']['recordHex']
                         for i, r in enumerate(updates))
        item = dict(initSampleId=init['sampleId'], updateSamples=[r['sampleId'] for r in updates], contiguous=contiguous)
        if contiguous and updates:
            predicted = reference.run(mode, initial=values[0], value_range=values[1], velocity=values[2],
                                      velocity_range=values[3], rng=init['before']['rngWords'],
                                      steps=[r['before']['delta40'] for r in updates])
            item['steps'] = [dict(sampleId=r['sampleId'], delta=r['before']['delta40'],
                                recordMatches=struct.pack('<2f', *p['record']).hex() == r['after']['recordHex'],
                                scaleMatches=p['scale'] == r['after']['scaleE8'],
                                rngUnchanged=r['before']['rngWords'] == r['after']['rngWords'])
                             for r, p in zip(updates, predicted['updates'])]
            if any(not all(step[k] for k in ('recordMatches', 'scaleMatches', 'rngUnchanged')) for step in item['steps']):
                raise ValueError('Original VelocityX trajectory disagrees with captured updates')
        trajectories.append(item)
    contexts = [r for r in window if r['type'] == 'pipeline-draw-context']
    gpu = [r for r in window if r['type'] == 'pipeline-gpu-draw']
    joins = [dict(draw=row, exactContextMatches=sum(all(c[k] == row[k] for k in ('file', 'wrapper', 'drawId'))
                                                     for c in contexts)) for row in gpu]
    submissions = []
    native_specs = {s['offset']: s for s in spec.get('submissions', [])}
    for end in (r for r in window if r['type'] == 'pipeline-native-submit'):
        if arm.get('pipelineNativeSubmit') is not True or rows[boot]['observerRevision'] < 23:
            raise ValueError('Native submissions were not armed')
        starts = [r for r in window if r['type'] == 'pipeline-native-submit-enter' and r['nativeSubmitId'] == end['nativeSubmitId']]
        if len(starts) != 1:
            raise ValueError('Native submission lacks one entry scope')
        start = starts[0]
        if (any(start[k] != end[k] for k in ('file', 'wrapper', 'drawId', 'kind', 'offset', 'inputs'))
                or start['seq'] >= end['seq'] or native_specs[end['offset']]['kind'] != end['kind']
                or start.get('fingerprintVerified') is not True or end.get('fingerprintVerified') is not True):
            raise ValueError('Native submission identity/scope mismatch')
        matched = [g for g in gpu if start['seq'] < g['seq'] < end['seq']
                   and all(g[k] == end[k] for k in ('file', 'wrapper', 'drawId'))]
        submissions.append(dict(enter=start, returned=end, observedGpuCalls=matched,
                                nativeReturnProvesGpuExecution=False))
    renderer_refs = [r for r in startup if r['type'] == 'renderer-reference']
    return dict(approved=False, logSha256=hashlib.sha256(log.read_bytes()).hexdigest(), boot=rows[boot], arm=arm,
                rendererReferences=renderer_refs,
                counts=dict(Counter(r['type'] for r in window)), samples=len(samples), modules=len(calls),
                moduleCounts=dict(Counter(f"{r['file']}:{r['node']}:{r['stage']}:{r['symbol']}" for r in calls)),
                initializerReplays=replays, velocityTrajectories=trajectories, gpu=joins, drawContexts=contexts,nativeSubmissions=submissions,
                deltas=sorted({r['before']['delta40'] for r in calls if r['stage'] == 'update'}),
                rngOwnerChecks=[r['rngMatchesEmitter'] for r in calls if r['stage'] in ('init', 'update')],
                placement=[r for r in window if r['type'] == 'placement-context'],
                errors=[r for r in window if 'unreadable' in r['type'] or 'unavailable' in r['type'] or 'ambiguous' in r['type']],
                limitations=['Source window identity is not a full in-memory file hash.',
                             'GPU wrapper membership does not identify an individual source primitive.',
                             'Missing exact draw/context joins remain missing, even for nearby timestamps.',
                             'Instrumented deltas do not prove native scheduling or uninstrumented timing.',
                             'No whole-skill fidelity or published runtime support is granted.'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--log', type=Path, required=True)
    parser.add_argument('--token', required=True)
    parser.add_argument('--spec', type=Path, required=True)
    parser.add_argument('--source', action='append', type=Path, required=True)
    parser.add_argument('--replay-x', type=Path, help='Pinned source APK; requires optional Unicorn dependencies')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must stay inside ignored tools/data')
    reference = None
    if args.replay_x:
        from emulate_particle_x import ParticleXReference
        reference = ParticleXReference(args.replay_x)
    result = audit(args.log, args.token, json.loads(args.spec.read_text()), args.source, reference)
    args.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: result[k] for k in ('samples', 'modules', 'initializerReplays', 'velocityTrajectories', 'deltas', 'errors')}))
