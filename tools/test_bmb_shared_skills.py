"""Integration checks against the locally staged shared-skill source cases."""
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET
from inspect_bmb import read_bmb, compare_project
from bmb_playback_fields import attach_playback_fields

ROOT = Path(__file__).resolve().parents[1]
CASES = [('brave-slash', 'atk_impact_001_pink'),
         ('blade-beam', 'atk_aerialslash_001_green'), ('blade-beam', 'atk_slash5_blue')]


class SharedSkillSources(unittest.TestCase):
    def test_full_known_source_comparison_preserves_dormant_curves(self):
        dormant_translation = 0
        dormant_uv = 0
        for folder, stem in CASES:
            path = ROOT / 'tools/data/shared-skill-review' / folder / 'originals' / (stem + '.bmb')
            project = ROOT / 'assets/battle_effect' / (stem + '.bmsln')
            if not path.exists() or not project.exists():
                self.skipTest('Stage local shared-skill source cases first')
            result = read_bmb(path.read_bytes())
            attach_playback_fields(path.read_bytes(), result['nodes'])
            compare_project(result, project.read_bytes())
            source = ET.parse(project).findall('.//ResIdeNode')[1:]
            for node, xml in zip(result['nodes'], source):
                self.assertAlmostEqual(node['generation']['interval'], float(xml.findtext('Generate_Constant_GenerateInterval')), places=6)
                if node['typeId'] == 2:
                    mode = node['motionModes']['translation']['name']
                    self.assertEqual(mode, xml.findtext('Translate_Basic_TranslateType'))
                    if any(node['vectorCurves'][channel]['keys'] for channel in ['translationValue', 'translationSpeed']):
                        self.assertEqual(mode, 'NewtonDynamics')
                        dormant_translation += 1
                if node['typeId'] == 3 and node['vectorCurves']['texture1TranslationSpeed']['keys']:
                    self.assertEqual(node['motionModes']['texture1Translation']['name'], 'Constant')
                    dormant_uv += 1
        self.assertEqual(dormant_translation, 3)
        self.assertGreater(dormant_uv, 0)


if __name__ == '__main__':
    unittest.main()
