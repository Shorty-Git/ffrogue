"""Pinned source-dispatch checks; resolved pointers do not grant playback support."""
from pathlib import Path
import unittest
from native_particle_dispatch import ParticleDispatch

APK = Path('tools/data/memorial-audit/installed-base-v208.apk')
ROOT = Path('tools/data/shared-skill-review')
PINK = ROOT / 'brave-slash-composed/originals/atk_impact_001_pink.bmb'


@unittest.skipUnless(APK.exists(), 'Pinned local APK required')
class ParticleDispatchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = ParticleDispatch(APK)

    def test_absent_module_is_distinct_from_uninspected_index(self):
        self.assertEqual(self.catalog.select('rotation', 0)['target'], None)
        self.assertTrue(self.catalog.select('rotation', 0)['resolved'])
        self.assertFalse(self.catalog.select('rotation', 14)['resolved'])
        self.assertFalse(self.catalog.select('scale', 29)['resolved'])
        with self.assertRaises(ValueError):
            self.catalog.select('rotation', -1)

    def test_native_const_targets_match_executed_modules(self):
        scale = self.catalog.select('scale', 2)['target']
        rotation = self.catalog.select('rotation', 1)['target']
        self.assertEqual(scale['address'], '0x1fc2164')
        self.assertEqual(scale['sha256'], 'd74dd972964de8d2ec1ad894ab232e058c564eb6accad2b742f42e695ff6a2ac')
        self.assertEqual(rotation['address'], '0x1fc2060')
        self.assertEqual(rotation['sha256'], '484853a98927c994a0fadf78af6c079f25145bf26ba41b692cba26c9949339cb')

    def test_nonnull_entries_have_native_identity(self):
        for table in self.catalog.tables.values():
            for row in table['rows']:
                target = row['target']
                if target:
                    self.assertGreater(target['bytes'], 0)
                    self.assertEqual(len(target['sha256']), 64)
                    self.assertTrue(any(part in target['symbol'] for part in ('make_vertex', 'Init', 'update', 'Update')))

    def test_x_init_update_stages_resolve_separately(self):
        self.assertIsNone(self.catalog.select('scaleInit', 15)['target'])
        self.assertIn('InitConstX', self.catalog.select('scaleInit', 16)['target']['symbol'])
        self.assertIn('InitVelocityX', self.catalog.select('scaleInit', 17)['target']['symbol'])
        self.assertIn('update9VelocityX', self.catalog.select('scaleUpdate', 17)['target']['symbol'])

    @unittest.skipUnless(PINK.exists(), 'Existing pink BMB fixture required')
    def test_raw_node34_selection_agrees_with_existing_observed_callback(self):
        effect = self.catalog.inspect_effect(PINK)
        self.assertEqual(effect['sourceSha256'], '89c3cb5e7c16df69bf8d1c538622afdd42e30942240141a8147dd55da4de690f')
        node = next(n for n in effect['particles'] if n['node'] == 34)
        self.assertEqual(node['scale']['index'], 2)
        self.assertEqual(node['scale']['target']['address'], '0x1fc2164')
        self.assertEqual(node['rotation']['index'], 0)
        self.assertIsNone(node['rotation']['target'])

    @unittest.skipUnless((ROOT / 'climhazzard/originals/atk_powergeyser_001_purple.bmb').exists(), 'Existing source-less BMB fixture required')
    def test_source_less_authoring_does_not_block_binary_pointer_selection(self):
        effect = self.catalog.inspect_effect(ROOT / 'climhazzard/originals/atk_powergeyser_001_purple.bmb')
        self.assertEqual([n['scale']['index'] for n in effect['particles']], [2, 16, 16])
        self.assertTrue(all(n['scale']['resolved'] and n['rotation']['resolved'] for n in effect['particles']))


if __name__ == '__main__':
    unittest.main()
