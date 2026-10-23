"""Audit appearance-field offsets against already staged BMB/BMSLN pairs.

No extraction, renderer changes, or fidelity assertion. Candidate intersections
are independent of the production decoder's material offset table. Known-field
comparisons identify mismatched pairs; unsupported source channels remain listed.
"""
import argparse
import collections
import copy
import hashlib
import json
import struct
import xml.etree.ElementTree as ET
from pathlib import Path

from bmb_channels import CHANNELS, compare_vector_curves
from bmb_materials import compare_materials
from bmb_parameters import compare_parameter_project
from inspect_bmb import compare_project, read_bmb


INITIAL_COLOR_OFFSETS = {0: 328, 2: 720, 3: 104, 6: 120}
ENUM_FIELDS = {
    'colorMode': 'Color_Basic_ColorType',
    'alphaMode': 'Blend_Basic_BlendAlphaType',
}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def compare_known_curves(node, source):
    """Compare supported curves, explicitly inventorying excluded channels."""
    supported = {CHANNELS[c][0] for c in node['vectorCurves']} | {'Blend_Basic_Curve'}
    partial = copy.deepcopy(source)
    excluded = []
    for element in list(partial):
        array = element.find('KeyFrameArray')
        if array is not None and len(array) and element.tag not in supported:
            excluded.append(element.tag)
            partial.remove(element)
    return compare_vector_curves(node, partial), excluded


def audit(root):
    paths = sorted((root / 'tools/data/bmb-format').glob('*.bmb'))
    paths += sorted((root / 'tools/data/shared-skill-review').glob('*/originals/*.bmb'))
    grouped = collections.defaultdict(list)
    for path in paths:
        grouped[path.name].append(path)
    result = {
        'schemaVersion': 1,
        'scope': 'Existing staged BMB files and matching local authoring projects only',
        'interpretation': 'Unique candidate offsets are cross-file data evidence, not native-renderer fidelity.',
        'pairs': [], 'rejectedPairs': [], 'missingAuthoring': [],
        'offsetEvidence': {}, 'initialColorMismatches': [],
        'particleColorHypothesisContradictions': [],
        'currentSkillNonzeroColorRanges': [], 'currentSkillDormantCurves': [],
        'currentSkillModelParticleColorChecks': {'initialRgb': 0, 'rangeRgbAtInitialPlus16': 0},
    }
    intersections = {}
    counts = collections.defaultdict(collections.Counter)
    for name, candidates in sorted(grouped.items()):
        path = candidates[0]
        data = path.read_bytes()
        project = root / 'assets/battle_effect' / Path(name).with_suffix('.bmsln')
        record = {'binary': path.relative_to(root).as_posix(), 'binarySha256': sha256(data),
                  'aliases': [p.relative_to(root).as_posix() for p in candidates[1:]]}
        if any(p.read_bytes() != data for p in candidates[1:]):
            result['rejectedPairs'].append({**record, 'reason': 'Different staged bytes share one basename'})
            continue
        if not project.exists():
            result['missingAuthoring'].append(record)
            continue
        xml = project.read_bytes()
        record.update(project=project.relative_to(root).as_posix(), projectSha256=sha256(xml))
        try:
            decoded = read_bmb(data)
            nodes = ET.fromstring(xml).findall('.//ResIdeNode')[1:]
            if len(nodes) != len(decoded['nodes']):
                raise ValueError('BMB/BMSLN node count differs')
            record['parameters'] = compare_parameter_project(decoded, xml)
            excluded = []
            material_count = 0
            for node, source in zip(decoded['nodes'], nodes):
                if node['type'] != source.findtext('Basic_Meta_NodeType'):
                    raise ValueError('BMB/BMSLN node type differs')
                material_count += compare_materials(node, source)['materialEnumsChecked']
                _, unknown = compare_known_curves(node, source)
                excluded.extend({'nodeIndex': node['index'], 'channel': tag} for tag in unknown)
            record.update(nodes=len(nodes), materialEnumsChecked=material_count,
                          excludedUnmappedCurves=excluded)
        except (ValueError, AssertionError) as error:
            result['rejectedPairs'].append({**record, 'reason': str(error)})
            continue
        try:
            record['fullKnownSubsetComparison'] = compare_project(decoded, xml)
        except ValueError as error:
            record['fullKnownSubsetComparison'] = {'match': False, 'reason': str(error)}
        result['pairs'].append(record)
        is_current = any('shared-skill-review' in p.parts for p in candidates)
        for node, source in zip(decoded['nodes'], nodes):
            start, size, kind = node['offset'], node['bytes'], node['typeId']
            identifier = {'effect': name, 'nodeIndex': node['index'], 'type': node['type']}
            fields = {key: source.findtext(tag) for key, tag in ENUM_FIELDS.items()}
            fields['alphaConstant'] = float(source.findtext('Blend_Basic_Alpha'))
            for field, value in fields.items():
                if field == 'alphaConstant':
                    expected = struct.pack('<f', value)
                elif value in ('Constant', 'Curve'):
                    expected = struct.pack('<I', {'Constant': 0, 'Curve': 1}[value])
                else:
                    raise ValueError('Unverified appearance enum: ' + str(value))
                matches = {offset for offset in range(0, size, 4)
                           if data[start + offset:start + offset + 4] == expected}
                key = node['type'] + '.' + field
                intersections[key] = matches if key not in intersections else intersections[key] & matches
                counts[key][str(value)] += 1
            color_offset = INITIAL_COLOR_OFFSETS[kind]
            initial = struct.unpack_from('<3f', data, start + color_offset)
            source_initial = [float(source.find('Color_Center_Value').attrib[k]) for k in 'RGB']
            initial_matches = struct.pack('<3f', *initial) == struct.pack('<3f', *source_initial)
            if not initial_matches:
                result['initialColorMismatches'].append({**identifier, 'relativeOffset': color_offset,
                                                        'binary': initial, 'authoring': source_initial})
            if kind == 3:
                candidate = struct.unpack_from('<I', data, start + 1624)[0]
                if candidate != {'Constant': 0, 'Curve': 1}[fields['colorMode']]:
                    result['particleColorHypothesisContradictions'].append({
                        **identifier, 'hypothesisRelativeOffset': 1624, 'binary': candidate,
                        'authoringMode': fields['colorMode'], 'initialRgbMatches': initial_matches,
                        'randomChannelSync': source.findtext('Color_Center_RandomChannelSync'),
                        'centerColorKeys': len(node['vectorCurves']['centerColor']['keys']),
                    })
            if not is_current:
                continue
            color_range = {k: float(source.find('Color_Center_Range').attrib[k]) for k in 'ARGB'}
            if any(color_range[k] for k in 'RGB'):
                result['currentSkillNonzeroColorRanges'].append({
                    **identifier, 'colorMode': fields['colorMode'], 'range': color_range,
                    'randomChannelSync': source.findtext('Color_Center_RandomChannelSync'),
                })
            if kind in (3, 6):
                expected_range = struct.pack('<3f', *[color_range[k] for k in 'RGB'])
                actual_range = data[start + color_offset + 16:start + color_offset + 28]
                if not initial_matches or actual_range != expected_range:
                    raise ValueError('Current Model/Particle RGB initial/range mismatch: ' + str(identifier))
                result['currentSkillModelParticleColorChecks']['initialRgb'] += 1
                result['currentSkillModelParticleColorChecks']['rangeRgbAtInitialPlus16'] += 1
            for field, curve in [('alphaMode', node['alphaCurve']),
                                 ('colorMode', node['vectorCurves'].get('centerColor', {'keys': []}))]:
                if fields[field] == 'Constant' and curve['keys']:
                    result['currentSkillDormantCurves'].append({
                        **identifier, 'selector': field, 'keys': len(curve['keys']),
                        'alphaConstant': fields['alphaConstant'],
                    })
    for key, offsets in sorted(intersections.items()):
        result['offsetEvidence'][key] = {
            'candidateRelativeOffsets': sorted(offsets), 'authoringValueCounts': dict(counts[key]),
            'nodesCompared': sum(counts[key].values()), 'uniqueCandidate': len(offsets) == 1,
        }
    result['summary'] = {'eligiblePairs': len(result['pairs']), 'rejectedPairs': len(result['rejectedPairs']),
                         'missingAuthoring': len(result['missingAuthoring']),
                         'initialColorMismatches': len(result['initialColorMismatches']),
                         'particleColorHypothesisContradictions': len(result['particleColorHypothesisContradictions'])}
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path,
                        default=Path('tools/data/shared-skill-review/appearance-offset-audit.json'))
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    destination = (root / args.output).resolve()
    if not destination.is_relative_to(root / 'tools/data'):
        raise ValueError('Receipt must stay inside tools/data')
    result = audit(root)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'output': destination.relative_to(root).as_posix(), **result['summary']}, indent=2))
