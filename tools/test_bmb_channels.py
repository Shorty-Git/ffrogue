"""Checks for vector key layout, source mismatches and unsupported coverage."""
import struct
import unittest
import xml.etree.ElementTree as ET
from bmb_channels import compare_vector_curves, read_vector_curve


def fixture():
    return bytearray(struct.pack('<QQ3I10f', 1, 0, 2, 1, 3,
                                 1, 2, 3, 4, 5, 6, 7, 8, 9, 0.125))


def source():
    return ET.fromstring('''<ResIdeNode><Translate_Value_Curve><KeyFrameArray>
    <KeyframeVector3d Frame="0.125" ElementKeyframeType="Spline Linear BreakSpline"
      ElementSlopeL="1 2 3" ElementSlopeR="4 5 6"><Value X="7" Y="8" Z="9" />
    </KeyframeVector3d></KeyFrameArray></Translate_Value_Curve></ResIdeNode>''')


class BmbChannelTests(unittest.TestCase):
    def test_axis_order_tangents_and_input_preservation(self):
        data = fixture()
        before = bytes(data)
        curve = read_vector_curve(data, 16, 0, 'XYZ')
        self.assertEqual(curve['axes'], ['X', 'Y', 'Z'])
        self.assertEqual(curve['keys'][0]['types'], ['Spline', 'Linear', 'BreakSpline'])
        self.assertEqual(curve['keys'][0]['slopeLeft'], [1, 2, 3])
        self.assertEqual(curve['keys'][0]['slopeRight'], [4, 5, 6])
        self.assertEqual(curve['keys'][0]['value'], [7, 8, 9])
        self.assertEqual(curve['keys'][0]['frame'], 0.125)
        self.assertEqual(bytes(data), before)

    def test_truncation_nonfinite_and_bad_references(self):
        with self.assertRaises(ValueError):
            read_vector_curve(fixture()[:-1], 16, 0, 'XYZ')
        for offset, value in [(0, 65537), (8, 1000)]:
            data = fixture()
            struct.pack_into('<Q', data, offset, value)
            with self.assertRaises(ValueError):
                read_vector_curve(data, 16, 0, 'XYZ')
        data = fixture()
        struct.pack_into('<f', data, 16 + 12, float('nan'))
        with self.assertRaises(ValueError):
            read_vector_curve(data, 16, 0, 'XYZ')

    def test_empty_and_unknown_channels_have_no_fallback(self):
        curve = read_vector_curve(struct.pack('<QQ', 0, 0xffffffffffffffff), 16, 0, 'RGB')
        self.assertEqual(curve['keys'], [])
        data = fixture()
        struct.pack_into('<I', data, 16, 99)
        self.assertEqual(read_vector_curve(data, 16, 0, 'XYZ')['keys'][0]['types'][0], 'Unknown')

    def test_source_comparison_rejects_swapped_axes_and_unsupported_curves(self):
        node = {'vectorCurves': {'translationValue': read_vector_curve(fixture(), 16, 0, 'XYZ')}}
        self.assertEqual(compare_vector_curves(node, source()), {'translationValue': 1})
        changed = source()
        value = changed.find('.//Value')
        value.set('X', '8')
        value.set('Y', '7')
        with self.assertRaises(ValueError):
            compare_vector_curves(node, changed)
        changed = source()
        changed.append(ET.fromstring('<Texture2_Rotate_Value_Curve><KeyFrameArray><KeyframeFloat /></KeyFrameArray></Texture2_Rotate_Value_Curve>'))
        with self.assertRaises(ValueError):
            compare_vector_curves(node, changed)

    def test_unordered_key_positions_are_rejected(self):
        data = fixture()
        struct.pack_into('<Q', data, 0, 2)
        data.extend(data[16:])
        struct.pack_into('<f', data, len(data) - 4, 0)
        with self.assertRaises(ValueError):
            read_vector_curve(data, 16, 0, 'XYZ')


if __name__ == '__main__':
    unittest.main()
