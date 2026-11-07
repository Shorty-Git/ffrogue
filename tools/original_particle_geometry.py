"""Preserve explicit geometry controls for a narrow, opt-in Particle experiment."""
import hashlib
import xml.etree.ElementTree as ET
from authoring_sources import project_sources, project_identity


def attach_particle_geometry(result, project):
    comparison, sources = project_sources(result, project)
    for node, source in zip(result['nodes'], sources):
        node['particleGeometrySource'] = {
            'rotationMode': source.findtext('Rotate_Basic_RotateType'),
            'scaleMode': source.findtext('Scale_Basic_ScaleType'),
            'origin': 'Explicit matching BMSLN; these selectors are not newly decoded binary fields',
            'projectSha256': project_identity(project),
        }
    return comparison
