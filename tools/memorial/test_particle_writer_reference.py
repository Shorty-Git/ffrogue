"""Differential geometry checks against the optional pinned ARM64 reference."""
import math
from pathlib import Path
import unittest

try:
    from emulate_particle_writer import ParticleWriterReference, fixture_cases, IDENTITY
except ModuleNotFoundError as error:
    if error.name != 'unicorn':
        raise
    ParticleWriterReference = None

APK = Path('tools/data/memorial-audit/installed-base-v208.apk')


def expected_positions(inputs):
    """Recovered draw-basis equation; consumes computed inputs, not Euler state."""
    basis, roll = inputs['basis'], inputs['roll']
    horizontal = inputs['half_extent'][0] * inputs['scale'][0]
    vertical = inputs['half_extent'][1] * inputs['scale'][1]
    c, s = math.cos(roll), math.sin(roll)
    right = [horizontal * (c * basis[i] + s * basis[i + 4]) for i in range(3)]
    up = [vertical * (-s * basis[i] + c * basis[i + 4]) for i in range(3)]
    return [[inputs['center'][i] + a * right[i] + b * up[i] for i in range(3)]
            for a, b in [(-1, 1), (-1, -1), (1, -1), (1, 1), (-1, 1), (1, -1)]]


@unittest.skipUnless(ParticleWriterReference is not None and APK.exists(), 'Optional Unicorn and pinned local APK required')
class ParticleWriterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.reference = ParticleWriterReference(APK)
        cls.cases = fixture_cases(cls.reference)

    def test_reference_identity(self):
        self.assertEqual(self.reference.code_hash, '0db11d5239975567796c65731013070d19cc32cc19082145ed71f4dee3c38601')

    def test_48_differential_geometry_cases(self):
        self.assertEqual(len(self.cases), 48)
        for case in self.cases:
            with self.subTest(inputs=case['inputs']):
                expected = expected_positions(case['inputs'])
                residual = max(abs(a - b) for x, y in zip(case['result']['positions'], expected) for a, b in zip(x, y))
                self.assertLess(residual, .0003)
                self.assertEqual(case['result']['mathCalls'], [] if case['inputs']['roll'] == 0 else ['sinf', 'cosf'])

    def test_six_vertex_topology_and_center(self):
        for case in self.cases:
            p = case['result']['positions']
            self.assertEqual(p[0], p[4])
            self.assertEqual(p[2], p[5])
            for i in range(3):
                self.assertAlmostEqual((p[0][i] + p[2][i]) / 2, case['inputs']['center'][i], delta=.0002)

    def test_basis_translation_is_not_applied_again(self):
        shifted = IDENTITY[:]
        shifted[12:15] = [100, -50, 77]
        args = ([7, 9, 11], .4, [1.2, 2], [3, 5])
        self.assertEqual(self.reference.run(*args)['positions'], self.reference.run(*args, shifted)['positions'])

    def test_native_small_roll_branch(self):
        args = ([0, 0, 0], [1, 1], [360, 320])
        for roll, calls in [(0, []), (1e-8, []), (-1e-8, []), (1e-5, ['sinf', 'cosf'])]:
            self.assertEqual(self.reference.run(args[0], roll, args[1], args[2])['mathCalls'], calls)

    def test_invalid_inputs_rejected(self):
        for args in [([], 0, [1, 1], [1, 1]), ([0, 0, 0], float('nan'), [1, 1], [1, 1]),
                     ([0, 0, 0], 0, [1, float('inf')], [1, 1])]:
            with self.assertRaises(ValueError):
                self.reference.run(*args)


if __name__ == '__main__':
    unittest.main()
