"""Audit aerial-slash placement evidence without choosing a coordinate policy.

This deliberately includes the dormant node-4 translation curve as a negative
control. It does not export assets or change any renderer or gameplay recipe.
"""
import argparse
import hashlib
import json
import sqlite3
import xml.etree.ElementTree as ET
from pathlib import Path

from inspect_bmb import compare_project, read_bmb


ROOT = Path(__file__).resolve().parent.parent
VARIANTS = {
    'green': {'effects': (5006510, 5006511), 'groups': (5003900, 5003901, 5032510)},
    'blue': {'effects': (5006490, 5006493), 'groups': (5003880, 5041069)},
    'white': {'effects': (5006560, 5006562), 'groups': (5003950, 5003951)},
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def initial_translation(node):
    mode = node.findtext('Translate_Basic_TranslateType')
    keys = node.findall('Translate_Value_Curve/KeyFrameArray/KeyframeVector3d')
    stored = [float(keys[0].find('Value').attrib[axis]) for axis in 'XYZ'] if keys else None
    initial = node.find('Translate_Value_Initial')
    active = [float(initial.attrib[axis]) for axis in 'XYZ']
    if mode == 'CurveValue':
        if not keys or float(keys[0].attrib['Frame']) != 0:
            raise ValueError('Audit requires an explicit value-curve key at frame zero')
        active = stored
    elif mode not in ('Constant', 'NewtonDynamics'):
        raise ValueError('Unsupported initial translation mode for this narrow audit: ' + str(mode))
    for tag in ('Translate_Value_Range', 'Translate_Speed_Range', 'Translate_Acceleration_Range'):
        if any(float(value) != 0 for value in node.find(tag).attrib.values()):
            raise ValueError('Randomized translation requires a separate audit')
    return {
        'mode': mode,
        'storedCurveKeyCount': len(keys),
        'storedCurveStart': stored,
        'curveActive': mode == 'CurveValue',
        'activeTranslationAtBirth': active,
        'translationParentInfluence': node.findtext(
            'Basic_ParentNodeInfluence_TranslateParentNodeInfluenceType'),
    }


def audit(root):
    database = root / 'assets/static_data/ffbe-data.db'
    result = {
        'schemaVersion': 1,
        'databaseSha256': digest(database),
        'variants': [],
        'correctionImplemented': False,
        'conclusions': [
            'Scale-300 aerial-slash variants repeatedly carry the same raw member value -1100.',
            'Stored curve presence is not activation: node 4 uses NewtonDynamics despite retaining a duplicate curve.',
            'The proposed 550-start compensation argument is rejected; only node 3 has an active translation curve.',
            'Raw member offset units, sign, transform order, and original anchor semantics remain unresolved.',
            'This audit supplies no validated coordinate policy and authorizes no automatic placement correction.',
        ],
    }
    connection = sqlite3.connect(database.as_uri() + '?mode=ro', uri=True)
    connection.row_factory = sqlite3.Row
    try:
        for color, ids in VARIANTS.items():
            project_path = root / f'assets/battle_effect/atk_aerialslash_001_{color}.bmsln'
            project = project_path.read_bytes()
            nodes = ET.fromstring(project).findall('.//ResIdeNode')[1:]
            controls = [{'nodeIndex': index, **initial_translation(nodes[index])} for index in (3, 4)]
            if controls[0]['mode'] != 'CurveValue' or controls[1]['mode'] != 'NewtonDynamics':
                raise ValueError('The expected active/dormant control pair has changed: ' + color)
            if controls[0]['storedCurveStart'] != controls[1]['storedCurveStart']:
                raise ValueError('The duplicate-curve negative control has changed: ' + color)
            if controls[1]['activeTranslationAtBirth'] != [0, 0, 0]:
                raise ValueError('The dormant-curve node now has a nonzero initial translation: ' + color)
            effects = [dict(connection.execute('SELECT * FROM effect WHERE effectId = ?', (identifier,)).fetchone())
                       for identifier in ids['effects']]
            groups = []
            for identifier in ids['groups']:
                group = dict(connection.execute('SELECT * FROM effect_group WHERE effectGroupId = ?',
                                                (identifier,)).fetchone())
                relevant = []
                for raw in group['effectData'].split(','):
                    fields = raw.split(':')
                    if len(fields) != 8:
                        raise ValueError('Unexpected effect-group tuple length')
                    if int(fields[1]) in ids['effects']:
                        relevant.append({'raw': raw, 'rawFields': fields})
                groups.append({'groupId': identifier, 'name': group['name'], 'members': relevant})
            item = {
                'color': color,
                'project': project_path.relative_to(root).as_posix(),
                'projectSha256': hashlib.sha256(project).hexdigest(),
                'effects': effects,
                'groups': groups,
                'translationControls': controls,
                'storedStartXSum': sum(control['storedCurveStart'][0] for control in controls),
                'activeStartXSum': sum(control['activeTranslationAtBirth'][0] for control in controls),
                'sumScope': 'Only these two local translation channels at birth; not a world-coordinate conversion.',
                'binaryCrossCheck': {'available': False},
            }
            original = root / f'tools/data/shared-skill-review/blade-beam/originals/atk_aerialslash_001_{color}.bmb'
            if original.exists():
                binary = read_bmb(original.read_bytes())
                comparison = compare_project(binary, project)
                for control in controls:
                    node = binary['nodes'][control['nodeIndex']]
                    if node['motionModes']['translation']['name'] != control['mode']:
                        raise ValueError('Binary/authoring motion mode differs')
                item['binaryCrossCheck'] = {
                    'available': True,
                    'file': original.relative_to(root).as_posix(),
                    'sha256': digest(original),
                    'comparison': comparison,
                    'node4ParentIndex': binary['nodes'][4]['parentIndex'],
                    'translationModes': [binary['nodes'][index]['motionModes']['translation'] for index in (3, 4)],
                }
            result['variants'].append(item)
    finally:
        connection.close()
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    result = audit(args.root.resolve())
    text = json.dumps(result, indent=2, ensure_ascii=False) + '\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding='utf-8')
    else:
        print(text, end='')


if __name__ == '__main__':
    main()
