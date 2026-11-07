"""Validate captured Particle memory/vertices against a staged source, without corrections."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys


def reconstruct(header, chunks):
    selected = [chunk for chunk in chunks if chunk['source'] == header['source']]
    if not 0 < header['bytes'] <= 4 * 1024 * 1024 or not 0 < header['chunks'] <= 1200:
        raise ValueError('Memory capture exceeds bounds')
    if len(selected) != header['chunks'] or sorted(chunk['index'] for chunk in selected) != list(range(header['chunks'])):
        raise ValueError('Missing or duplicate memory chunks')
    data = bytes.fromhex(''.join(chunk['hex'] for chunk in sorted(selected, key=lambda item: item['index'])))
    if len(data) != header['bytes'] or hashlib.sha256(data).hexdigest() != header['sha256']:
        raise ValueError('Reconstructed memory length/hash mismatch')
    return data


def analyze(report, original, output, plan=None):
    if report.get('approved') is not False or not report.get('particles'):
        raise ValueError('Expected a provenance-checked Particle summary')
    original_hash = hashlib.sha256(original).hexdigest()
    identities = {(p['file'], p['node'], p['object']) for p in report['particles']}
    memory = []
    for header in report.get('sourceMemory', []):
        samples = [sample['state'] for p in report['particles'] for sample in p['samples']
                   if p['file'] == header['file'] and p['node'] == header['node']]
        if not samples or any(sample['originalSha256'] != original_hash for sample in samples):
            raise ValueError('Memory/source attribution does not match the staged reference')
        captured = reconstruct(header, report['sourceChunks'])
        if len(captured) != len(original):
            raise ValueError('Source/memory size mismatch')
        changed = [i for i, (a, b) in enumerate(zip(original, captured)) if a != b]
        spans = []
        for offset in changed:
            if spans and spans[-1]['end'] == offset:
                spans[-1]['end'] += 1
            else:
                spans.append(dict(start=offset, end=offset + 1))
        word_candidates = []
        base = int(header['source'], 16)
        for offset in sorted({i // 8 * 8 for i in changed}):
            if offset + 8 > len(captured):
                continue
            raw, value = struct.unpack_from('<Q', original, offset)[0], struct.unpack_from('<Q', captured, offset)[0]
            if base <= value < base + len(captured):
                word_candidates.append(dict(offset=offset, originalU64=raw, memoryRelative=value - base,
                                            rootRelativeValueMatches=raw == value - base))
        file = output / (header['sha256'] + '.memory.bmb')
        output.mkdir(parents=True, exist_ok=True)
        file.write_bytes(captured)
        numeric = []
        if plan is not None:
            sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
            from bmb_parameters import read_parameters
            effect = next((e for e in plan['effects'] if e.get('sha256') == original_hash), None)
            if effect is None:
                raise ValueError('Plan does not identify the original source hash')
            for node in effect['nodes']:
                raw_node = {key: node[key] for key in ('typeId', 'offset')}
                memory_node = dict(raw_node)
                read_parameters(original, raw_node)
                read_parameters(captured, memory_node)
                numeric.append(dict(node=node['index'],
                                    staticVectors=raw_node['staticVectors'] == memory_node['staticVectors'],
                                    pivots=raw_node['texturePivots'] == memory_node['texturePivots'],
                                    modes=raw_node['motionModes'] == memory_node['motionModes'],
                                    alphaKeys=all(original[key['offset']:key['offset'] + 20] == captured[key['offset']:key['offset'] + 20]
                                                  for key in node['alphaCurve']['keys'])))
        memory.append(dict(file=str(file), source=header['source'], originalSha256=original_hash,
                           memorySha256=header['sha256'], byteIdentical=not changed,
                           changedBytes=len(changed), changedSpans=spans,
                           alignedPointerCandidates=word_candidates,
                           decodedNumericComparisons=numeric,
                           relocationSemanticsVerified=False))
    vertices = []
    for row in report.get('vertices', []):
        if (row['file'], row['node'], row['object']) not in identities:
            raise ValueError('Vertex capture has no matching source-node observation')
        raw = bytes.fromhex(row['rawHex'])
        if row['vertexCount'] != 6 or not 16 <= row['stride'] <= 128 or len(raw) != row['stride'] * 6:
            raise ValueError('Invalid vertex buffer bounds')
        positions = [list(struct.unpack_from('<3f', raw, i * row['stride'])) for i in range(6)]
        if len(row['positions']) != 6 or any(len(p) != 3 for p in row['positions']):
            raise ValueError('Incomplete captured position fields')
        if not all(math.isfinite(v) for p in positions for v in p) or not math.isfinite(row['contextAlpha']):
            raise ValueError('Nonfinite native output')
        if any(abs(a - b) > 0.00001 for p, q in zip(positions, row['positions']) for a, b in zip(p, q)):
            raise ValueError('Vertex fields differ from captured raw bytes')
        vertices.append(dict(object=row['object'], sample=row['sample'], stride=row['stride'],
                             contextAlpha=row['contextAlpha'], positions=positions,
                             bounds=[dict(min=min(p[axis] for p in positions), max=max(p[axis] for p in positions)) for axis in range(3)]))
    return dict(approved=False, memory=memory, vertices=vertices,
                alphaValues=[call for p in report['particles'] for sample in p['samples'] for call in sample['calls']
                             if 'contextAlphaAfter' in call],
                limitations=['Pointer-like values alone do not prove relocation semantics or source equality.',
                             'CPU vertex positions precede shader/world/view/projection processing.',
                             'This analysis does not identify a GPU shader, blend state or native animation age.'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--summary', type=Path, required=True)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--plan', type=Path, help='Optional staged plan for decoded numeric-field comparisons')
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must stay inside ignored tools/data')
    result = analyze(json.loads(args.summary.read_text(encoding='utf-8')), args.source.read_bytes(), args.output.parent,
                     json.loads(args.plan.read_text(encoding='utf-8')) if args.plan else None)
    args.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(dict(memoryCaptures=len(result['memory']), vertexSamples=len(result['vertices']),
                         alphaSamples=len(result['alphaValues'])), indent=2))
