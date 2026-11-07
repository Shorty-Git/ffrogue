"""Use verified binary parent controls plus explicit authoring for unresolved fields.

The binary subset never supplies compatibility flags or unknown enum defaults.
"""
import math
import xml.etree.ElementTree as ET
from inspect_bmb import compare_project
from bmb_source_controls import compare_source_controls


def attach_inheritance(result, project):
    comparison = compare_project(result, project)
    sources = ET.fromstring(project).findall('.//ResIdeNode')[1:]
    prefix = 'Basic_ParentNodeInfluence_'

    def boolean(source, tag):
        value = source.findtext(tag)
        if value not in ['true', 'false']:
            raise ValueError('Invalid inheritance compatibility flag: ' + tag)
        return value == 'true'

    prepared = []
    binary_fields = []
    for node, source in zip(result['nodes'], sources):
        fields = {}
        for name, tag in [('translation', 'Translate'), ('rotation', 'Rotate'),
                          ('scale', 'Scale'), ('matrix', 'Matrix')]:
            value = source.findtext(prefix + tag + 'ParentNodeInfluenceType')
            if value not in ['On', 'Off', 'OnGenerateTime']:
                raise ValueError('Unknown parent influence mode: ' + str(value))
            fields[name] = value
        fields['alphaMode'] = source.findtext(prefix + 'AlphaParentNodeInfluenceType')
        if fields['alphaMode'] not in ['Multiply', 'Lerp']:
            raise ValueError('Unknown parent alpha mode')
        for name, tag in [('alphaRate', 'ParentAlphaRate'), ('colorRate', 'ParentColorRate')]:
            value = float(source.findtext(prefix + tag))
            if not math.isfinite(value) or not 0 <= value <= 1:
                raise ValueError('Invalid parent influence rate')
            fields[name] = value
        fields['compatibility'] = {
            'nodeV16': boolean(source, 'Basic_Basic_Version1_6'),
            'nodeV15': boolean(source, 'Basic_Basic_Version1_5'),
            'rootV16': boolean(sources[0], 'Basic_Basic_Version1_6'),
            'rootV15': boolean(sources[0], 'Basic_Basic_Version1_5'),
        }
        compare_source_controls(node, source)
        decoded = node.get('sourceControls', {}).get('fields', {})
        used = []
        for name in fields.keys() & decoded.keys():
            if decoded[name]['status'] == 'decoded':
                fields[name] = decoded[name]['value']
                used.append(name)
        binary_fields.append({'node': node['index'], 'fields': sorted(used),
                              'remainingAuthoringFields': sorted(fields.keys() - set(used))})
        prepared.append(fields)
    for node, fields in zip(result['nodes'], prepared):
        node['authoringInheritance'] = fields
    return {**comparison, 'supplementedInheritanceNodes': len(prepared),
            'binaryControls': binary_fields,
            'origin': 'Verified binary fields plus explicit matched authoring for unresolved controls; no compatibility defaults'}
