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
    def test_dormant_texture_alpha_does_not_activate_unknown_curve(self):
        xml = ET.fromstring('''<ResIdeNode>
        <Texture1_Color_Scale_Alpha_MotionType>Constant</Texture1_Color_Scale_Alpha_MotionType>
        <Texture1_Color_Scale_Alpha_Value_Curve><KeyFrameArray><KeyframeFloat />
        </KeyFrameArray></Texture1_Color_Scale_Alpha_Value_Curve></ResIdeNode>''')
        self.assertEqual(compare_vector_curves({'vectorCurves': {}}, xml), {})
        xml.find('Texture1_Color_Scale_Alpha_MotionType').text = 'CurveValue'
        with self.assertRaises(ValueError):
            compare_vector_curves({'vectorCurves': {}}, xml)
        xml.remove(xml.find('Texture1_Color_Scale_Alpha_MotionType'))
        with self.assertRaises(ValueError):
            compare_vector_curves({'vectorCurves': {}}, xml)

    def test_dormant_rgb_is_not_an_active_curve_and_unknown_selectors_stay_blocked(self):
        for layer in (1, 2):
            for channel in ('Rgb', 'Alpha'):
                prefix = f'Texture{layer}_Color_Scale_{channel}'
                xml = ET.fromstring(f'<ResIdeNode><{prefix}_MotionType>Constant</{prefix}_MotionType>'
                    f'<{prefix}_Value_Curve><KeyFrameArray><KeyframeColorRgb /></KeyFrameArray>'
                    f'</{prefix}_Value_Curve></ResIdeNode>')
                self.assertEqual(compare_vector_curves({'vectorCurves': {}}, xml), {})
                for selector in ['CurveValue', 'CurveSpeed', 'NewtonDynamics', 'Unknown', '']:
                    xml.find(prefix + '_MotionType').text = selector
                    with self.assertRaisesRegex(ValueError, 'Unverified active source curve'):
                        compare_vector_curves({'vectorCurves': {}}, xml)

    def test_selected_main_party_pairs_and_all_new_key_data_are_compared(self):
        import hashlib
        import json
        from pathlib import Path
        from inspect_bmb import read_bmb, compare_project
        cases = [
            ('tools/data/skill-expansion-20261028/candidates/barret-227875/originals/eff_explosion_normal.bmb',
             'cbc743c243892eea420668bfa1173db3b0c2d0f9793a1491068fb9152f1fb6f9'),
            ('tools/data/import-decision-20261028/candidates/barret-227871/originals/atk_blow4_blue.bmb',
             '2e451e7f9facd21303e17dd72a970c271476d0936395425c02d423e85dbb8016'),
            ('tools/data/skill-expansion-20261028/support-candidates/aerith-229752/originals/eff_shockwave1_blue_S.bmb',
             '7f1618488805446abb586a48bd8a692b737b2dc744275aa04fd60a4e84a8b2ea'),
            ('tools/data/skill-expansion-20261028/support-candidates/aerith-229752/originals/wm_1012_regen_front.bmb',
             '12f79b1bcb0c1d7fb947c38f2a6b4990c3f47b141ac01ca7d0956be78e5218fe'),
            ('tools/data/import-decision-20261028/candidates/aerith-229758/originals/wm_1023_reraise.bmb',
             '4251251b4c64f0a9b1f46ee9e065e1f66932cd5e7cb2bb626f14e7c26ef50e89')]
        if not all(Path(p).exists() for p, _ in cases):
            self.skipTest('Optional archived main-party originals missing; restore the preservation archives')
        curves = keys = 0
        for file, sha in cases:
            raw = Path(file).read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(), sha)
            project = Path('rawdata/assets/battle_effect', Path(file).stem + '.bmsln').read_bytes()
            data = read_bmb(raw)
            compare_project(data, project)
            xml = ET.fromstring(project)
            sources = xml.findall('.//ResIdeNode')[1:]
            for node, source_node in zip(data['nodes'], sources):
                for channel in ('scaleValue', 'scaleSpeed'):
                    if (node['typeId'], channel) not in [(3, 'scaleValue'), (6, 'scaleSpeed')]:
                        continue
                    curve = node.get('vectorCurves', {}).get(channel)
                    if not curve:
                        continue
                    curves += 1; keys += len(curve['keys'])
                    # Mutating a tangent must fail, even for dormant transform keys.
                    tag = 'Scale_Value_Curve' if channel == 'scaleValue' else 'Scale_Speed_Curve'
                    key = source_node.find(tag + '/KeyFrameArray')[0]
                    original = key.attrib['ElementSlopeR']
                    values = original.split(); values[0] = str(float(values[0]) + 1)
                    key.attrib['ElementSlopeR'] = ' '.join(values)
                    with self.assertRaisesRegex(ValueError, 'vector key data differs'):
                        compare_project(data, ET.tostring(xml))
                    key.attrib['ElementSlopeR'] = original
        self.assertEqual((curves, keys), (7, 26))

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
