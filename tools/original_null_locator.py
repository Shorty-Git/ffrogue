"""Use binary Null type and matched authoring for unresolved locator selectors."""
import hashlib
import xml.etree.ElementTree as ET
from authoring_sources import project_sources, project_identity


def attach_null_locators(result, project):
    comparison, sources = project_sources(result, project)
    for node, source in zip(result['nodes'], sources):
        if node['typeId'] != 0:
            continue
        node['nullLocatorSource'] = {
            'type': node['sourceControls']['fields']['nullType']['value'],
            'rotationMode': source.findtext('Rotate_Basic_RotateType'),
            'scaleMode': source.findtext('Scale_Basic_ScaleType'),
            'projectSha256': project_identity(project),
            'origin': 'IBMB Null type; rotation/scale still require explicit matching BMSLN',
        }
    return comparison
