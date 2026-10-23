"""Selected material controls remain source labels, not blend simulation."""
import struct
import unittest
import xml.etree.ElementTree as ET
from bmb_materials import compare_materials, read_materials


class MaterialTests(unittest.TestCase):
    def test_model_controls_and_alpha_match_source(self):
        data = bytearray(1904)
        for offset, value in [(1744, 1), (1748, 1), (1752, 2), (1764, 1)]:
            struct.pack_into('<I', data, offset, value)
        struct.pack_into('<f', data, 496, 0.8)
        node = {'offset': 0, 'typeId': 6}
        read_materials(data, node)
        source = ET.fromstring('<ResIdeNode><Color_Basic_ColorType>Constant</Color_Basic_ColorType><Blend_Basic_BlendType>Semitrans</Blend_Basic_BlendType><Blend_Basic_BlendAlphaType>Curve</Blend_Basic_BlendAlphaType><Blend_Basic_AlphaTestType>Greater</Blend_Basic_AlphaTestType><Texture_Layer1_TextureAddressType>Repeat</Texture_Layer1_TextureAddressType><Blend_Basic_Alpha>0.8</Blend_Basic_Alpha></ResIdeNode>')
        self.assertEqual(compare_materials(node, source)['materialEnumsChecked'], 5)
        source.find('Blend_Basic_BlendType').text = 'SemiAdd'
        with self.assertRaises(ValueError):
            compare_materials(node, source)

    def test_unknown_controls_are_not_replaced(self):
        data = bytearray(1840)
        struct.pack_into('<I', data, 1680, 99)
        node = {'offset': 0, 'typeId': 3}
        read_materials(data, node)
        self.assertEqual(node['materialControls']['blend']['name'], 'Unknown')
        with self.assertRaises(ValueError):
            compare_materials(node, ET.fromstring('<ResIdeNode />'))

    def test_nonfinite_alpha_rejected(self):
        data = bytearray(1904)
        struct.pack_into('<f', data, 496, float('nan'))
        with self.assertRaises(ValueError):
            read_materials(data, {'offset': 0, 'typeId': 6})

    def test_distortion_is_only_enabled_on_verified_quad_layout(self):
        quad = bytearray(2128)
        struct.pack_into('<I', quad, 1840, 6)
        node = {'offset': 0, 'typeId': 2}
        read_materials(quad, node)
        self.assertEqual(node['materialControls']['textureCombination']['name'], 'Distortion')
        particle = bytearray(1840)
        struct.pack_into('<I', particle, 1696, 6)
        node = {'offset': 0, 'typeId': 3}
        read_materials(particle, node)
        self.assertEqual(node['materialControls']['textureCombination']['name'], 'Unknown')


if __name__ == '__main__':
    unittest.main()
