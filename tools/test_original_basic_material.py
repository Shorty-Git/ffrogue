"""Real-source checks for the narrow constant Basic layer-tint supplement."""
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET
from inspect_bmb import read_bmb
from original_basic_material import attach_basic_material


class BasicMaterialSourceTests(unittest.TestCase):
    def source(self):
        raw = Path('tools/data/shared-skill-review/blade-beam/originals/atk_aerialslash_001_green.bmb')
        project = Path('assets/battle_effect/atk_aerialslash_001_green.bmsln')
        if not raw.exists() or not project.exists():
            self.skipTest('Local original and authoring required')
        data = read_bmb(raw.read_bytes())
        for node in data['nodes']:
            node['nativeMaterialSelection'] = {'basicCandidateCompatible': True}
        return data, project.read_bytes()

    def test_constant_source_tint_and_missing_source_boundary(self):
        data, project = self.source()
        attach_basic_material(data, project)
        self.assertTrue(data['nodes'][5]['nativeBasicTint']['supported'])
        self.assertEqual(data['nodes'][5]['nativeBasicTint']['rgba'], [1, 1, 1, 1])
        data, _ = self.source()
        attach_basic_material(data)
        self.assertFalse(data['nodes'][5]['nativeBasicTint']['supported'])

    def test_random_and_animated_tints_are_not_defaulted(self):
        for tag, text in [('Texture1_Color_Scale_Alpha_Value_Range', '.5'),
                          ('Texture1_Color_Scale_Alpha_MotionType', 'CurveValue')]:
            data, project = self.source()
            xml = ET.fromstring(project)
            xml.findall('.//ResIdeNode')[6].find(tag).text = text
            attach_basic_material(data, ET.tostring(xml))
            self.assertFalse(data['nodes'][5]['nativeBasicTint']['supported'])

    def test_nonfinite_tint_and_mismatched_transform_rejected(self):
        for tag, attribute in [('Texture1_Color_Scale_Rgb_Value_Initial', 'R'),
                               ('Texture1_Rotate_Value_Initial', 'Z')]:
            data, project = self.source()
            xml = ET.fromstring(project)
            xml.findall('.//ResIdeNode')[6].find(tag).set(attribute, 'NaN' if attribute == 'R' else '45')
            with self.assertRaises(ValueError):
                attach_basic_material(data, ET.tostring(xml))


if __name__ == '__main__':
    unittest.main()
