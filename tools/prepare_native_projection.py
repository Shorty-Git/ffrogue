"""Prepare an effect-only native-viewport comparison, separate from gameplay plans."""
import argparse
import copy
import hashlib
import json
import math
from pathlib import Path


def select_comparison(plan, audit, effect_name, plan_sha256, geometry=None):
    """Select one explicit source member without modifying the input plan."""
    if plan.get('approved') is not False or audit.get('approved') is not False or audit.get('projectionType') != 'orthographic':
        raise ValueError('Expected unapproved plan and orthographic audit')
    if audit['nativeSha256'] != plan['rendererReference']['nativeSha256']:
        raise ValueError('Camera and geometry references come from different builds')
    camera = audit['camera']
    if any(len(camera[k]) != 16 or not all(math.isfinite(v) for v in camera[k])
           for k in ('viewMatrix', 'projectionMatrix')) or len(camera['viewport']) != 2 or any(
               not isinstance(v, int) or not 0 < v <= 4096 for v in camera['viewport']):
        raise ValueError('Invalid captured camera')
    projection = camera['projectionMatrix']
    if (any(abs(projection[i]) > 1e-8 for i in (1, 2, 3, 4, 6, 7, 8, 9, 11))
            or abs(projection[15] - 1) > 1e-8 or projection[0] <= 0 or projection[5] <= 0):
        raise ValueError('Expected positive axis-aligned orthographic projection')
    if len(audit['rootWorld']) != 3 or not all(math.isfinite(v) for v in audit['rootWorld']) or audit['rootWorld'][2] != 0:
        raise ValueError('Preview anchor requires finite XY and zero Z')
    if plan.get('nullLocator') or plan.get('particleGeometry'):
        identity = [1 if i % 5 == 0 else 0 for i in range(16)]
        if any(abs(v - expected) > 1e-8 for v, expected in zip(camera['viewMatrix'], identity)):
            raise ValueError('Current geometry subsets require identity view')
    selected = [i for i, effect in enumerate(plan['effects']) if effect['name'] == effect_name]
    if len(selected) != 1:
        raise ValueError('Expected one explicitly selected source effect')
    members = [m for m in plan['members'] if m['effect'] == selected[0]]
    if len(members) != 1:
        raise ValueError('Expected one unambiguous source member')
    original = copy.deepcopy(members[0])
    expected_scale = plan['rendererReference']['globalScale'] * original['scalePercent'] / 100
    if len(audit['animationScale']) != 3 or any(not math.isfinite(v) or abs(v - expected_scale) > 1e-5 for v in audit['animationScale']):
        raise ValueError('Captured animation scale and selected member differ')
    if geometry is not None:
        if (geometry.get('approved') is not False or geometry.get('effect') != effect_name
                or geometry['inputs']['--plan']['sha256'] != plan_sha256
                or geometry['camera'] != camera or geometry['root'] != audit['rootWorld']):
            raise ValueError('Geometry receipt does not match this plan/camera/root')
        if geometry['playerSha256'] != hashlib.sha256(Path('tools/original_effect_player.mjs').read_bytes()).hexdigest():
            raise ValueError('Geometry receipt player hash is stale; rerun its audit')
        if not any(n['index'] == geometry['node'] for n in plan['effects'][selected[0]]['nodes']):
            raise ValueError('Measured source node is absent')
    result = copy.deepcopy(plan)
    result['effects'] = [result['effects'][selected[0]]]
    result['members'] = [{**original, 'effect': 0, 'startFrame': 0}]
    return result, original


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan', type=Path, required=True)
    parser.add_argument('--audit', type=Path, required=True)
    parser.add_argument('--effect', default='atk_impact_001_pink.bmb', help='Explicit source effect; legacy default retained for earlier commands')
    parser.add_argument('--geometry-audit', type=Path, help='Matching measured geometry receipt; permits comparison without video frames')
    parser.add_argument('--reference-frame', type=Path, action='append', default=[])
    parser.add_argument('--background-frame', type=Path, help='Explicit pre-effect original frame; body poses remain unmatched')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not args.reference_frame and not args.geometry_audit:
        parser.error('Supply reference frames or a matching geometry audit')
    root = Path.cwd().resolve()
    stage = root / 'tools/data'
    for file in [args.plan, args.audit, args.output, *args.reference_frame,
                 *([args.geometry_audit] if args.geometry_audit else []),
                 *([args.background_frame] if args.background_frame else [])]:
        if not file.resolve().is_relative_to(stage):
            raise ValueError('Comparison inputs/output must stay inside tools/data')
    plan = json.loads(args.plan.read_text(encoding='utf-8-sig'))
    audit = json.loads(args.audit.read_text(encoding='utf-8-sig'))
    geometry = json.loads(args.geometry_audit.read_text(encoding='utf-8-sig')) if args.geometry_audit else None
    plan_hash = hashlib.sha256(args.plan.read_bytes()).hexdigest()
    plan, original = select_comparison(plan, audit, args.effect, plan_hash, geometry)
    references = []
    for frame in args.reference_frame:
        digest = hashlib.sha256(frame.read_bytes()).hexdigest()
        url = '/image/' + digest + frame.suffix.lower()
        plan['files'][url] = {'path': frame.relative_to(root).as_posix() if frame.is_absolute()
                              else frame.as_posix(), 'sha256': digest}
        references.append({'name': frame.name, 'url': url})
    plan['nativeComparison'] = {'audit': audit, 'references': references,
                                'originalMember': original,
                                'auditSha256': hashlib.sha256(args.audit.read_bytes()).hexdigest(),
                                'planSha256': hashlib.sha256(args.plan.read_bytes()).hexdigest(),
                                'timingAligned': False,
                                'note': 'Effect age is selected manually; original video timestamps are not effect ages. No actors or native shading are reconstructed.'}
    if geometry is not None and not references:
        plan['nativeComparison']['note'] = 'Reconstruction age is manual; native sample age is unknown. CPU geometry is a pinned reference, not original rendered pixels. Neutral background is diagnostic.'
    if geometry is not None:
        plan['nativeComparison']['geometry'] = geometry
        plan['nativeComparison']['geometryAuditSha256'] = hashlib.sha256(args.geometry_audit.read_bytes()).hexdigest()
    if args.background_frame:
        file = args.background_frame
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        url = '/image/' + digest + file.suffix.lower()
        plan['files'][url] = {'path': file.relative_to(root).as_posix() if file.is_absolute()
                              else file.as_posix(), 'sha256': digest}
        plan['nativeComparison']['background'] = {'url': url, 'name': file.name}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(plan, indent=2) + '\n', encoding='utf-8')
    print('Prepared native-viewport comparison:', args.output)
