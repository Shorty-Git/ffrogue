"""Audit captured scene projection without changing preview or runtime scaling."""
import argparse
import json
import math
from pathlib import Path

from prepare_diagnostic import EXPECTED_NATIVE


def transform(matrix, point):
    if len(matrix) != 16 or len(point) != 4 or not all(math.isfinite(v) for v in [*matrix, *point]):
        raise ValueError('Expected finite column-major matrix and homogeneous point')
    return [sum(matrix[column * 4 + row] * point[column] for column in range(4))
            for row in range(4)]


def project(camera, point):
    width, height = camera['viewport']
    if not all(math.isfinite(v) and v > 0 for v in [width, height]):
        raise ValueError('Invalid viewport')
    clip = transform(camera['projectionMatrix'], transform(camera['viewMatrix'], [*point, 1]))
    if abs(clip[3]) < 1e-9:
        raise ValueError('Point projects to zero homogeneous W')
    ndc = [value / clip[3] for value in clip[:3]]
    return [(ndc[0] + 1) * width / 2, (1 - ndc[1]) * height / 2]


def audit(summary):
    boot = summary.get('boot', {})
    if (boot.get('nativeSha256') != EXPECTED_NATIVE or boot.get('observerRevision', 0) < 12
            or not summary.get('calibrationPassed')):
        raise ValueError('Expected calibrated exact-build camera capture')
    samples = [row for row in summary['rendererStates'] if row.get('phase') == 'before-draw'
               and row.get('camera') and row.get('file') == 'atk_impact_001_pink']
    if not samples or len({row['object'] for row in samples}) != 1:
        raise ValueError('Expected one sampled pink effect object')
    last = samples[-1]
    camera = last['camera']
    if any(row['camera'] != camera for row in samples):
        raise ValueError('Camera changed during effect; inspect individual samples')
    p = camera['projectionMatrix']
    orthographic = all(abs(p[i]) < 1e-8 for i in [3, 7, 11]) and abs(p[15] - 1) < 1e-8
    if not orthographic:
        raise ValueError('This audit requires a validated affine orthographic projection')
    if (any(abs(p[i]) > 1e-8 for i in [1, 2, 4, 6, 8, 9])
            or p[0] <= 0 or p[5] <= 0):
        raise ValueError('Logical extent requires an axis-aligned positive projection')
    root = last['animationPosition']
    pixel = project(camera, root)
    pixel_x = project(camera, [root[0] + 100, root[1], root[2]])
    pixel_y = project(camera, [root[0], root[1] + 100, root[2]])
    stable = [row for row in samples if row['animationScale'] == last['animationScale']]
    return {'schemaVersion': 1, 'nativeSha256': EXPECTED_NATIVE, 'approved': False,
            'camera': camera, 'projectionType': 'orthographic',
            'beforeDrawSamples': len(samples), 'steadyScaleSamples': len(stable),
            'logicalExtentFromProjection': [2 / p[0], 2 / p[5]],
            'rootWorld': root, 'rootViewportTopLeftPixels': pixel,
            'pixelsPerWorldUnitX': (pixel_x[0] - pixel[0]) / 100,
            'pixelsPerWorldUnitY': (pixel[1] - pixel_y[1]) / 100,
            'animationScale': last['animationScale'],
            'sameProjectionAtOtherZ': project(camera, [root[0], root[1], root[2] + 1000]) == pixel,
            'limits': ['Column-major projection requires independent video anchor validation',
                       'Projected anchor is not an effect alpha bounding box',
                       'No native body scale or complete particle fidelity is inferred']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--summary', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must stay inside ignored tools/data')
    result = audit(json.loads(args.summary.read_text(encoding='utf-8-sig')))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in result.items() if k != 'camera'}, indent=2))
