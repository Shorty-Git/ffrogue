"""Facing type decode: synthetic records and, where present, staged originals with matched authoring."""
import glob
import struct
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from bmb_facing import attach_facing, compare_facing
from inspect_bmb import read_bmb

ROOT = Path(__file__).resolve().parents[1]


class FacingTest(unittest.TestCase):
    def test_enums_and_unknown_values(self):
        quad, model = bytearray(2128), bytearray(1904)
        struct.pack_into('<I', quad, 2120, 0)
        struct.pack_into('<I', model, 1896, 1)
        nodes = [{'typeId': 2, 'offset': 0, 'bytes': 2128}]
        attach_facing(quad, {'nodes': nodes})
        self.assertEqual(nodes[0]['facing']['name'], 'Billboard')
        nodes = [{'typeId': 6, 'offset': 0, 'bytes': 1904}]
        attach_facing(model, {'nodes': nodes})
        self.assertEqual(nodes[0]['facing']['name'], 'Standard')
        struct.pack_into('<I', quad, 2120, 3)
        nodes = [{'typeId': 2, 'offset': 0, 'bytes': 2128}, {'typeId': 3, 'offset': 0, 'bytes': 1840}, {'typeId': 2, 'offset': 0, 'bytes': 100}]
        self.assertEqual(attach_facing(quad, {'nodes': nodes}), 1)
        self.assertEqual(nodes[0]['facing']['name'], 'Unknown')   # never a silent Polygon/Billboard
        self.assertNotIn('facing', nodes[1])
        self.assertNotIn('facing', nodes[2])

    def test_staged_originals_match_authoring(self):
        seen, checked, names = set(), 0, set()
        for path in glob.glob(str(ROOT / 'tools/data/enemy-skills/*/source/originals/*.bmb')):
            raw = Path(path).read_bytes()
            project = ROOT / 'rawdata/assets/battle_effect' / (Path(path).stem + '.bmsln')
            if (Path(path).name, len(raw)) in seen or not project.exists():
                continue
            seen.add((Path(path).name, len(raw)))
            result = read_bmb(raw)
            source = ET.fromstring(project.read_bytes()).findall('.//ResIdeNode')[1:]
            if len(source) != len(result['nodes']):
                continue
            attach_facing(raw, result)
            for node, xml in zip(result['nodes'], source):
                checked += compare_facing(node, xml)
                names.add(node.get('facing', {}).get('name'))
        if not checked:
            self.skipTest('Local staged originals with matched authoring are required')
        self.assertGreater(checked, 100)
        self.assertIn('Billboard', names)


if __name__ == '__main__':
    unittest.main()
