"""Check explicit authoring inheritance against the local source pairs."""
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET
from inspect_bmb import read_bmb
from original_inheritance import attach_inheritance

ROOT = Path(__file__).resolve().parents[1]
STAGE = ROOT / 'tools/data/shared-skill-review'


class OriginalInheritanceTest(unittest.TestCase):
    def source(self, folder, stem):
        raw = STAGE / folder / 'originals' / (stem + '.bmb')
        xml = ROOT / 'assets/battle_effect' / (stem + '.bmsln')
        if not raw.exists() or not xml.exists():
            self.skipTest('Local original pair is required')
        return read_bmb(raw.read_bytes()), xml.read_bytes()

    def test_source_controls_and_root_compatibility_are_preserved(self):
        data, xml = self.source('brave-slash', 'atk_impact_001_pink')
        receipt = attach_inheritance(data, xml)
        self.assertEqual(receipt['supplementedInheritanceNodes'], 35)
        source = data['nodes'][12]['authoringInheritance']
        self.assertEqual(source['alphaRate'], 0)
        self.assertEqual(source['alphaMode'], 'Lerp')
        self.assertTrue(source['compatibility']['nodeV16'])
        self.assertFalse(source['compatibility']['rootV16'])
        self.assertEqual(data['nodes'][15]['authoringInheritance']['alphaRate'], 1)
        self.assertEqual(data['nodes'][14]['authoringInheritance']['rotation'], 'Off')
        data, xml = self.source('climhazzard', 'atk_slash7_side_purple')
        attach_inheritance(data, xml)
        self.assertEqual(data['nodes'][10]['authoringInheritance']['translation'], 'OnGenerateTime')

    def test_malformed_rates_fail_without_partially_attaching(self):
        for value in ['nan', '-1', '1.5']:
            data, xml = self.source('brave-slash', 'atk_impact_001_pink')
            root = ET.fromstring(xml)
            root.findall('.//ResIdeNode')[13].find('Basic_ParentNodeInfluence_ParentAlphaRate').text = value
            with self.assertRaisesRegex(ValueError, 'Invalid parent influence rate'):
                attach_inheritance(data, ET.tostring(root))
            self.assertFalse(any('authoringInheritance' in n for n in data['nodes']))

    def test_mismatched_authoring_is_rejected_before_supplement(self):
        data, xml = self.source('climhazzard', 'atk_slash7_side_purple')
        root = ET.fromstring(xml)
        root.findall('.//ResIdeNode')[5].find('Texture_Layer2_PictureName').text = 'wrong_resource'
        with self.assertRaises(ValueError):
            attach_inheritance(data, ET.tostring(root))
        self.assertFalse(any('authoringInheritance' in n for n in data['nodes']))


if __name__ == '__main__':
    unittest.main()
