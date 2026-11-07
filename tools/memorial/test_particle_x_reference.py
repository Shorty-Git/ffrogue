"""Differential X-scale chain checks against bounded original ARM64 execution."""
from pathlib import Path
import unittest

try:
    from emulate_particle_x import ParticleXReference, fixture_cases
except ModuleNotFoundError as error:
    if error.name != 'unicorn':
        raise
    ParticleXReference = None
from test_particle_modules_reference import random_values, SEED

APK = Path('tools/data/memorial-audit/installed-base-v208.apk')


@unittest.skipUnless(ParticleXReference is not None and APK.exists(), 'Optional Unicorn and pinned local APK required')
class ParticleXTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.reference = ParticleXReference(APK)
        cls.cases = fixture_cases(cls.reference)

    def test_36_native_chains_match_scalar_equations(self):
        self.assertEqual(len(self.cases), 36)
        for case in self.cases:
            a, result = case['inputs'], case['result']
            mode = a['mode']
            count = {'OneX': 0, 'ConstX': 1, 'VelocityX': 2}[mode]
            rng, values = random_values(SEED, count)
            value, velocity = 1, 0
            if count:
                value = max(0, a['initial'] - a.get('value_range', 0) + 2 * a.get('value_range', 0) * values[0])
                self.assertAlmostEqual(value, result['initialRecord'][0], delta=.00001)
            if mode == 'VelocityX':
                velocity = a['velocity'] - a.get('velocity_range', 0) + 2 * a.get('velocity_range', 0) * values[1]
                self.assertAlmostEqual(velocity, result['initialRecord'][1], delta=.00001)
                for delta, update in zip(a.get('steps', []), result['updates']):
                    value = max(0, value + velocity * delta)
                    self.assertAlmostEqual(value, update['record'][0], delta=.00001)
                    self.assertAlmostEqual(velocity, update['record'][1], delta=.00001)
                    self.assertEqual(update['cursor'], 8)
            self.assertEqual(result['rngAfter'], rng)
            self.assertEqual(result['initCursor'], count * 4)
            self.assertEqual(result['makeCursor'], count * 4)
            for actual in result['scale']:
                self.assertAlmostEqual(value, actual, delta=.00001)
            for actual in result['groupScale']:
                self.assertAlmostEqual(a['group'][0], actual, delta=.00001)

    def test_group_yz_are_ignored_even_when_nonuniform(self):
        for mode in ('OneX', 'ConstX', 'VelocityX'):
            a = self.reference.run(mode, initial=3, group=[2, 4, 7])
            b = self.reference.run(mode, initial=3, group=[2, 100, .01])
            self.assertEqual(a['writer']['positions'], b['writer']['positions'])

    def test_velocity_clamps_after_each_step(self):
        result = self.reference.run('VelocityX', initial=1, velocity=-2, steps=[1, 1])
        self.assertEqual([u['record'][0] for u in result['updates']], [0, 0])
        self.assertEqual(result['scale'], [0, 0, 0])

    def test_make_uses_current_value_without_integrating_again(self):
        a = self.reference.run('VelocityX', initial=3, velocity=-2, steps=[.5])
        b = self.reference.run('ConstX', initial=2)
        self.assertEqual(a['writer']['positions'], b['writer']['positions'])

    def test_reviewed_constx_delegate_copies_record_to_update_scale_without_rng_or_integration(self):
        for initial in (-3, 0, 1.25, 40):
            baseline = self.reference.run('ConstX', initial=initial, value_range=10)
            result = self.reference.run('ConstX', initial=initial, value_range=10, steps=[.01, 1, 42])
            for update in result['updates']:
                self.assertEqual(update['cursor'], 4)
                self.assertEqual(update['record'], result['initialRecord'])
                self.assertEqual(update['scale'], result['initialRecord'] * 3)
            self.assertEqual(result['rngAfter'], baseline['rngAfter'])
            self.assertEqual(result['writer']['positions'], baseline['writer']['positions'])

    def test_zero_range_consumes_native_rng_and_one_consumes_none(self):
        for mode, count in [('OneX', 0), ('ConstX', 1), ('VelocityX', 2)]:
            self.assertEqual(self.reference.run(mode)['rngAfter'], random_values(SEED, count)[0])

    def test_existing_raw_x_parameters_execute_without_authoring(self):
        root = Path('tools/data/shared-skill-review')
        files = [path for folder in ('brave-slash-composed', 'blade-beam', 'climhazzard')
                 for path in (root / folder / 'originals').glob('*.bmb')]
        if len(files) != 8:
            self.skipTest('Existing eight-effect source corpus required')
        cases = [case for path in files for case in self.reference.source_cases(path)]
        self.assertEqual(len(cases), 11)
        self.assertEqual(len([case for case in cases if case['source'] == 'atk_powergeyser_001_purple.bmb']), 2)
        for case in cases:
            result = case['result']
            self.assertEqual(result['scale'][0], result['scale'][1])
            self.assertTrue(all(abs(v - 1.775) < 1e-6 for v in result['groupScale']))

    def test_bad_mode_and_nonfinite_inputs_rejected(self):
        with self.assertRaises(ValueError):
            self.reference.run('unknown')
        with self.assertRaises(ValueError):
            self.reference.run('VelocityX', steps=[float('nan')])
        with self.assertRaises(ValueError):
            self.reference.run('OneX', steps=[1])


if __name__ == '__main__':
    unittest.main()
