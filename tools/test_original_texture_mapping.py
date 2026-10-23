"""Single-texture UV source capabilities and unsupported-mode regression checks."""
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET
from inspect_bmb import read_bmb
from original_texture_mapping import attach_basic_texture_mapping

ROOT = Path(__file__).resolve().parents[1]


class BasicTextureMappingTests(unittest.TestCase):
    def source(self, folder='blade-beam', stem='atk_aerialslash_001_green'):
        raw = ROOT / 'tools/data/shared-skill-review' / folder / 'originals' / (stem + '.bmb')
        project = ROOT / 'assets/battle_effect' / (stem + '.bmsln')
        if not raw.exists():
            self.skipTest('Local original binary required')
        return read_bmb(raw.read_bytes()), project.read_bytes() if project.exists() else None

    def test_wave_uv_vectors_and_supported_modes_match_original_sources(self):
        data, project = self.source()
        report = attach_basic_texture_mapping(data, project)
        self.assertEqual(report['supportedNodes'], [5, 6, 7, 8, 12])
        self.assertEqual(report['unsupportedNodes'], [])
        for i in [5, 7, 8]:
            node = data['nodes'][i]
            self.assertEqual(node['staticVectors']['texture1']['rotation']['valueInitial'], [0, 0, -90])
            self.assertEqual(node['texturePivots']['texture1'], [.5, .5, .5])
            self.assertEqual(node['basicTextureMapping']['motionModes'], dict.fromkeys(['translation', 'rotation', 'scale'], 'NewtonDynamics'))

    def test_source_less_mapping_is_explicitly_unsupported(self):
        data, _ = self.source('climhazzard', 'atk_powergeyser_001_purple')
        report = attach_basic_texture_mapping(data)
        self.assertEqual(report['supportedNodes'], [])
        self.assertTrue(report['unsupportedNodes'])
        self.assertTrue(all(not n['basicTextureMapping']['supported'] for n in data['nodes'] if 'basicTextureMapping' in n))

    def test_unknown_mapping_and_missing_selected_curve_are_not_replaced(self):
        for tag, value, expected in [('Texture1_MappingType', 'Unknown', 'non-Basic'),
                                     ('Texture_Layer1_TextureAnimationType', 'Pattern', 'pattern animation'),
                                     ('Texture1_Rotate_MotionType', 'CurveValue', 'curve unavailable'),
                                     ('Texture1_Animation_ReverseX_SwitchStateType', 'On', 'reverse animation')]:
            with self.subTest(tag=tag):
                data, project = self.source()
                xml = ET.fromstring(project)
                xml.findall('.//ResIdeNode')[6].find(tag).text = value
                report = attach_basic_texture_mapping(data, ET.tostring(xml))
                self.assertFalse(data['nodes'][5]['basicTextureMapping']['supported'])
                self.assertTrue(any(expected in reason for row in report['unsupportedNodes'] for reason in row['reasons']))

    def test_mismatching_source_transform_fails_before_attachment(self):
        data, project = self.source()
        xml = ET.fromstring(project)
        xml.findall('.//ResIdeNode')[6].find('Texture1_Rotate_Value_Initial').set('Z', '45')
        with self.assertRaisesRegex(ValueError, 'fixed vector differs'):
            attach_basic_texture_mapping(data, ET.tostring(xml))
        self.assertFalse(any('basicTextureMapping' in n for n in data['nodes']))


if __name__ == '__main__':
    unittest.main()
