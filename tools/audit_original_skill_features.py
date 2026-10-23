"""Audit source features omitted by the research player, without changing plans.

This is a targeted audit, not a complete BMB capability detector. Source values
from BMSLN are labeled separately from decoded BMB and original M3R evidence.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET

from inspect_bmb import read_bmb, compare_project
from inspect_m3r import read_m3r

ROOT = Path(__file__).resolve().parents[1]
STAGE = ROOT / 'tools/data'
PARENT = 'Basic_ParentNodeInfluence_'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def source_fields(xml):
    tags = [PARENT + name for name in [
        'TranslateParentNodeInfluenceType', 'RotateParentNodeInfluenceType',
        'ScaleParentNodeInfluenceType', 'MatrixParentNodeInfluenceType',
        'AlphaParentNodeInfluenceType', 'ParentAlphaRate', 'ParentColorRate']]
    tags += ['Basic_Basic_Version1_6', 'Basic_Basic_Version1_5',
             'Basic_Basic_SortPriority', 'Basic_Basic_PrioritySort',
             'Basic_Basic_ZSort', 'Basic_Basic_WholeZSort',
             'Detail_Basic_ModelType', 'Detail_Basic_QuadType',
             'Detail_Basic_NullType', 'Detail_Basic_FacingType',
             'GenerateShape_Basic_GenerateShapeType',
             'GenerateShape_Basic_ModelName', 'GenerateShape_Basic_PickedPointType']
    return {tag: xml.findtext(tag) for tag in tags}


def audit(plan_path, authoring):
    plan_bytes = plan_path.read_bytes()
    plan = json.loads(plan_bytes)
    rows = []
    for effect in plan['effects']:
        binary_path = plan_path.parent / 'originals' / effect['name']
        raw = binary_path.read_bytes()
        if digest(raw) != effect['sha256']:
            raise ValueError('Stale binary: ' + str(binary_path))
        decoded = read_bmb(raw)
        if [(n['index'], n['parentIndex'], n['typeId'], n['resourceBindings']) for n in decoded['nodes']] != [
                (n['index'], n['parentIndex'], n['typeId'], n['resourceBindings']) for n in effect['nodes']]:
            raise ValueError('Plan hierarchy or resource bindings differ from original')
        project = authoring / (Path(effect['name']).stem + '.bmsln')
        row = {'name': effect['name'], 'binarySha256': digest(raw),
               'nodeCount': len(decoded['nodes']), 'authoring': None,
               'meshes': [], 'nodes': [], 'findings': []}

        def finding(category, indices, detail):
            if indices:
                row['findings'].append({'category': category, 'nodes': indices, 'detail': detail})

        if project.is_file():
            xml_bytes = project.read_bytes()
            # A passing comparison covers known categories only. It cannot
            # validate the new source fields listed below against binary offsets.
            comparison = compare_project(decoded, xml_bytes)
            tree = ET.fromstring(xml_bytes)
            nodes = tree.findall('.//ResIdeNode')[1:]
            row['authoring'] = {'path': project.relative_to(ROOT).as_posix(),
                                'sha256': digest(xml_bytes), 'solution': tree.attrib,
                                'knownCategoryComparison': comparison}
            row['nodes'] = [{'index': n['index'], 'parentIndex': n['parentIndex'],
                             'type': n['type'], 'fields': source_fields(xml)}
                            for n, xml in zip(decoded['nodes'], nodes)]
            for field in ['Translate', 'Rotate', 'Scale']:
                finding('parent' + field,
                        [r['index'] for r in row['nodes'] if r['parentIndex'] is not None and
                         r['fields'][PARENT + field + 'ParentNodeInfluenceType'] != 'On'],
                        'Player always composes the complete live parent transform.')
            finding('modelBillboard', [r['index'] for r in row['nodes']
                                      if decoded['nodes'][r['index']]['typeId'] == 6 and
                                      r['fields']['Detail_Basic_ModelType'] == 'Billboard'],
                    'Player does not evaluate model billboard mode.')
            finding('alphaInheritanceSettings', [r['index'] for r in row['nodes']
                                                 if r['parentIndex'] is not None],
                    'Player always multiplies parent alpha; source rate, mode and compatibility flags are ignored. Presence alone does not prove a visible difference.')
            finding('modelSurfaceEmission', [r['index'] for r in row['nodes']
                                             if r['fields']['GenerateShape_Basic_GenerateShapeType'] == 'Model'],
                    'Known unsupported shape: preview withholds node and descendants.')
            finding('sortPriority', [r['index'] for r in row['nodes']
                                    if r['fields']['Basic_Basic_SortPriority'] != '0.5'],
                    'Source priority is not applied; transparent objects use Three.js ordering.')

        receipt = json.loads((plan_path.parent / 'effects' / Path(effect['name']).stem / 'resources.json').read_text())
        originals = {}
        for resource in receipt['resources']:
            path = ROOT / resource['output']
            if path.suffix != '.m3r':
                continue
            data = path.read_bytes()
            if digest(data) != resource['sha256']:
                raise ValueError('Stale model resource: ' + str(path))
            originals[path.stem] = read_m3r(data)
        if set(originals) != set(effect['meshes']):
            raise ValueError('Plan mesh set differs from resource receipt')
        for name, mesh in originals.items():
            if mesh != effect['meshes'][name]:
                raise ValueError('Prepared model differs from original: ' + name)
            colors = Counter(tuple(v['colorBytes']) for v in mesh['vertices'])
            used_by = [n['index'] for n in decoded['nodes']
                       if (n['resourceBindings'].get('model') or {}).get('name') == name]
            nonwhite = sum(count for rgba, count in colors.items() if rgba != (255, 255, 255, 255))
            row['meshes'].append({'name': name, 'sha256': mesh['sourceSha256'],
                                  'nodes': used_by, 'vertexCount': mesh['vertexCount'],
                                  'nonwhiteVertices': nonwhite,
                                  'alphaByteRange': [min(c[3] for c in colors), max(c[3] for c in colors)],
                                  'colors': [{'bytes': list(c), 'count': count} for c, count in sorted(colors.items())]})
            if nonwhite:
                finding('modelVertexColors', used_by,
                        f'{name}: {nonwhite}/{mesh["vertexCount"]} vertices are not opaque white. Original bytes survive preparation but no color attribute is submitted to the GPU.')
        rows.append(row)
    return {'name': plan['name'], 'sourceId': plan['sourceId'],
            'plan': plan_path.relative_to(ROOT).as_posix(), 'planSha256': digest(plan_bytes),
            'effects': rows}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan', type=Path, action='append', required=True)
    parser.add_argument('--authoring', type=Path, default=ROOT / 'assets/battle_effect')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(STAGE.resolve()):
        parser.error('Audit output must stay inside tools/data')
    plans = [p.resolve() for p in args.plan]
    if any(not p.is_relative_to(STAGE.resolve()) for p in plans):
        parser.error('Prepared plans must stay inside tools/data')
    skills = [audit(p, args.authoring.resolve()) for p in plans]
    result = {'schemaVersion': 1, 'playerSha256': digest((ROOT / 'tools/original_effect_player.mjs').read_bytes()),
              'skills': skills, 'limits': [
                  'Targeted source audit, not exhaustive format support or visual fidelity validation.',
                  'New BMSLN fields are source evidence, not decoded or compared binary offsets.',
                  'Model byte values are verified directly against the staged original M3R.',
                  'Native vertex-color shader math and compatibility-specific inheritance remain unverified.',
                  'Inactive fields for other emitter types are not treated as enabled behavior.']}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    for skill in skills:
        print(skill['name'], json.dumps(dict(Counter(f['category'] for e in skill['effects'] for f in e['findings']))))
    print('Saved', args.output)


if __name__ == '__main__':
    main()
