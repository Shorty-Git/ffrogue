"""Matched BMSLN authoring or, in explicit approximation mode, an authoring-free stand-in.

The stand-in answers each field from the decoded binary controls when the IBMB decoder
knows them, otherwise from the BMSLN corpus mode (tools/effects/authoring-defaults.json,
built by tools/build_authoring_defaults.py). Every corpus value taken is appended to
bmb_channels.APPROXIMATED_CURVES so it is listed in plan.approximations. Without
approximation mode the stand-in cannot be constructed.
"""
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import bmb_channels
from bmb_source_controls import TAGS
from bmb_texture_tint import read_texture_tint
from inspect_bmb import compare_project

DEFAULTS = Path(__file__).with_name('effects') / 'authoring-defaults.json'
_defaults = None


class _Value:
    def __init__(self, text, attrib):
        self.text, self.attrib = text, attrib


class ApproximateNode:
    def __init__(self, project, node):
        self.project, self.node = project, node
        self.kind = node['type']
        decoded = node.get('sourceControls', {}).get('fields', {})
        self.binary = {TAGS[name]: field['value'] for name, field in decoded.items()
                       if field.get('status') == 'decoded' and name in TAGS}
        self.vectors = {}
        tint = read_texture_tint(project.raw, node) if project.raw is not None else None
        if tint:
            for tag, values in zip(['Texture1_Color_Scale_Rgb_Value_Initial', 'Texture1_Color_Scale_Rgb_Value_Range'], tint):
                self.vectors[tag] = {axis: repr(v) for axis, v in zip('RGB', values)}

    def _default(self, tag):
        entry = self.project.defaults.get(self.kind, {}).get(tag)
        if entry is None:
            raise ValueError(f'No corpus default for {self.kind}.{tag}')
        key = (self.node['index'], tag)
        if key not in self.project.logged:
            self.project.logged.add(key)
            bmb_channels.APPROXIMATED_CURVES.append({'member': self.project.member, 'node': self.node['index'],
                'field': tag, 'value': entry['text'] or entry['attrib'], 'corpusShare': entry['share'],
                'treatment': 'authoring-free-corpus-default'})
        return entry

    def findtext(self, tag, default=None):
        if tag in self.binary:
            return str(self.binary[tag])
        return self._default(tag)['text']

    def find(self, tag):
        if tag in self.vectors:
            return _Value('', self.vectors[tag])
        if tag in self.binary:
            return _Value(str(self.binary[tag]), {})
        entry = self._default(tag)
        return _Value(entry['text'], entry['attrib'])


class ApproximateProject:
    """Authoring-free stand-in for one BMB member (approximation mode only)."""

    def __init__(self, member, raw=None):
        global _defaults
        if bmb_channels.APPROXIMATED_CURVES is None:
            raise ValueError('Missing authoring requires the explicit approximation mode')
        if _defaults is None:
            _defaults = json.loads(DEFAULTS.read_text(encoding='utf-8'))
        self.member, self.defaults, self.logged, self.raw = member, _defaults['defaults'], set(), raw
        self.corpus = _defaults['corpus']

    def sources(self, result):
        return [ApproximateNode(self, node) for node in result['nodes']]


def project_sources(result, project):
    """(comparison, per-node sources) for matched bytes or the approximate stand-in."""
    if isinstance(project, ApproximateProject):
        return ({'authoringFree': True, 'corpusSha256': project.corpus['sha256OfFileHashes']},
                project.sources(result))
    return compare_project(result, project), ET.fromstring(project).findall('.//ResIdeNode')[1:]


def project_identity(project):
    if isinstance(project, ApproximateProject):
        return 'authoring-free:' + project.corpus['sha256OfFileHashes']
    return hashlib.sha256(project).hexdigest()
