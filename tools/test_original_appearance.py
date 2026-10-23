"""Source-backed regression checks for appearance activation and unresolved fields."""
import copy
import unittest
from pathlib import Path
from inspect_bmb import read_bmb
from bmb_playback_fields import attach_playback_fields
from original_appearance import attach_appearance

ROOT = Path(__file__).resolve().parents[1]
STAGE = ROOT / 'tools/data/shared-skill-review'


class AppearanceTests(unittest.TestCase):
    def source(self, folder, stem, authoring=True):
        raw = STAGE / folder / 'originals' / (stem + '.bmb')
        project = ROOT / 'assets/battle_effect' / (stem + '.bmsln')
        if not raw.exists() or (authoring and not project.exists()):
            self.skipTest('Local original data is required')
        data = read_bmb(raw.read_bytes())
        attach_playback_fields(raw.read_bytes(), data['nodes'])
        return data, project.read_bytes() if authoring else None

    def test_brave_dormant_keys_are_preserved_without_activating(self):
        data, project = self.source('brave-slash', 'atk_impact_001_pink')
        before = copy.deepcopy(data['nodes'])
        report = attach_appearance(data, project)
        self.assertEqual(report['dormantAlphaCurves'], [11, 15, 16, 31, 32])
        self.assertEqual(report['dormantColorCurves'], [8, 10, 12, 16, 18, 20, 22, 24, 26, 31, 32])
        self.assertEqual(data['nodes'][15]['appearance']['alpha'], {'mode': 'Constant', 'origin': 'IBMB', 'value': .5})
        for old, node in zip(before, data['nodes']):
            self.assertEqual(old['alphaCurve'], node['alphaCurve'])
            self.assertEqual(old['vectorCurves'], node['vectorCurves'])

    def test_strobe_white_uses_explicit_authoring_selector(self):
        data, project = self.source('climhazzard', 'eff_strobe_white_a50_f30')
        report = attach_appearance(data, project)
        color = data['nodes'][3]['appearance']['color']
        self.assertEqual(color['mode'], 'Constant')
        self.assertEqual(color['value'], [1, 1, 1])
        self.assertEqual(color['origin'], 'BMSLN')
        self.assertTrue(color['supported'])
        self.assertEqual(report['dormantColorCurves'], [3])

    def test_source_less_particle_color_remains_unresolved(self):
        data, _ = self.source('climhazzard', 'atk_powergeyser_001_purple', False)
        report = attach_appearance(data)
        self.assertEqual(report['dormantAlphaCurves'], [12, 23, 24])
        for index in [15, 20, 29]:
            color = data['nodes'][index]['appearance']['color']
            self.assertEqual(color['mode'], 'Unresolved')
            self.assertFalse(color['supported'])
        self.assertEqual(data['nodes'][12]['appearance']['alpha']['value'], 1)

    def test_unknown_alpha_mode_and_empty_selected_curve_fail(self):
        data, _ = self.source('brave-slash', 'atk_impact_001_pink')
        data['nodes'][0]['materialControls']['alphaMode']['name'] = 'Unknown'
        with self.assertRaisesRegex(ValueError, 'Unknown alpha mode'):
            attach_appearance(data)
        data['nodes'][0]['materialControls']['alphaMode']['name'] = 'Curve'
        data['nodes'][0]['alphaCurve']['keys'] = []
        with self.assertRaisesRegex(ValueError, 'Selected alpha curve is empty'):
            attach_appearance(data)

    def test_rgb_source_discrepancy_and_random_ranges_stay_visible(self):
        data, project = self.source('blade-beam', 'atk_aerialslash_001_green')
        report = attach_appearance(data, project)
        self.assertFalse(data['nodes'][9]['appearance']['color']['supported'])
        self.assertTrue(any(row['node'] == 9 and 'differs' in row['reason'] for row in report['limitations']))
        data, project = self.source('climhazzard', 'atk_blow1_purple')
        report = attach_appearance(data, project)
        self.assertEqual([r['node'] for r in report['limitations'] if 'random range' in r['reason']], [2, 3, 4, 7])


if __name__ == '__main__':
    unittest.main()
