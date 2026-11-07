"""Preserve explicit geometry controls for a narrow, opt-in Particle experiment."""
import hashlib
import xml.etree.ElementTree as ET
from inspect_bmb import compare_project


def attach_particle_geometry(result, project):
    comparison = compare_project(result, project)
    sources = ET.fromstring(project).findall('.//ResIdeNode')[1:]
    for node, source in zip(result['nodes'], sources):
        node['particleGeometrySource'] = {
            'rotationMode': source.findtext('Rotate_Basic_RotateType'),
            'scaleMode': source.findtext('Scale_Basic_ScaleType'),
            'origin': 'Explicit matching BMSLN; these selectors are not newly decoded binary fields',
            'projectSha256': hashlib.sha256(project).hexdigest(),
        }
    return comparison
