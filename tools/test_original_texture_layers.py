"""Local-source integration checks; skipped when the ignored archive is absent."""
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET
from inspect_bmb import read_bmb
from original_texture_layers import attach_texture_layers

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'tools/data/climhazzard-source/originals/atk_slash7_side_purple.bmb'
PROJECT = ROOT / 'assets/battle_effect/atk_slash7_side_purple.bmsln'


@unittest.skipUnless(RAW.exists() and PROJECT.exists(), 'Local original source pair is required')
class TextureLayersTest(unittest.TestCase):
    def test_source_pair_supplies_independent_scale_and_address(self):
        result = read_bmb(RAW.read_bytes())
        receipt = attach_texture_layers(result, PROJECT.read_bytes())
        self.assertEqual(receipt['supplementedAddNodes'], 5)
        node = result['nodes'][4]
        self.assertEqual(node['staticVectors']['texture2']['scale']['valueInitial'][:2], [.5,.5])
        self.assertEqual(node['materialControls']['texture2Address']['name'], 'Clamp')
        self.assertEqual(node['authoringTextureLayers']['texture2']['rgbInitial'], [1,1,1])

    def test_mismatched_source_binding_is_rejected(self):
        root = ET.fromstring(PROJECT.read_bytes())
        root.findall('.//ResIdeNode')[5].find('Texture_Layer2_PictureName').text = 'wrong_resource'
        with self.assertRaises(ValueError):
            attach_texture_layers(read_bmb(RAW.read_bytes()), ET.tostring(root))

    def test_unsupported_color_animation_is_rejected(self):
        root = ET.fromstring(PROJECT.read_bytes())
        root.findall('.//ResIdeNode')[5].find('Texture2_Color_Scale_Rgb_MotionType').text = 'CurveValue'
        with self.assertRaisesRegex(ValueError, 'Animated texture color'):
            attach_texture_layers(read_bmb(RAW.read_bytes()), ET.tostring(root))


if __name__ == '__main__':
    unittest.main()
