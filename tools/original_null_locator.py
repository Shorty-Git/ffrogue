"""Use binary Null type and matched authoring for unresolved locator selectors."""
import hashlib
import xml.etree.ElementTree as ET
from inspect_bmb import compare_project


def attach_null_locators(result, project):
    comparison = compare_project(result, project)
    for node, source in zip(result['nodes'], ET.fromstring(project).findall('.//ResIdeNode')[1:]):
        if node['typeId'] != 0:
            continue
        node['nullLocatorSource'] = {
            'type': node['sourceControls']['fields']['nullType']['value'],
            'rotationMode': source.findtext('Rotate_Basic_RotateType'),
            'scaleMode': source.findtext('Scale_Basic_ScaleType'),
            'projectSha256': hashlib.sha256(project).hexdigest(),
            'origin': 'IBMB Null type; rotation/scale still require explicit matching BMSLN',
        }
    return comparison
