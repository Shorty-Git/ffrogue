"""Independent dataflow checks for constant Particle native module fixtures."""
import math
from pathlib import Path
import struct
import unittest

try:
    from emulate_particle_modules import ParticleModuleReference, fixture_cases
    from emulate_zscreen_locator import LocatorReference
except ModuleNotFoundError as error:
    if error.name != 'unicorn':
        raise
    ParticleModuleReference = None

APK = Path('tools/data/memorial-audit/installed-base-v208.apk')
SEED = [123456789, 362436069, 521288629, 88675123]


def random_values(state, count):
    state = state[:]
    values = []
    for _ in range(count):
        a, b, c, d = state
        t = (a ^ (a << 11)) & 0xffffffff
        word = (d ^ (d >> 19) ^ t ^ (t >> 8)) & 0xffffffff
        state = [b, c, d, word]
        values.append(struct.unpack('<f', struct.pack('<I', 0x3f800000 | (word >> 9)))[0] - 1)
    return state, values


@unittest.skipUnless(ParticleModuleReference is not None and APK.exists(), 'Optional Unicorn and pinned local APK required')
class ParticleModuleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.reference = ParticleModuleReference(APK)
        cls.cases = fixture_cases(cls.reference)

    def test_native_init_equations_and_rng(self):
        rng, random = random_values(SEED, 6)
        self.assertEqual(len(self.cases), 16)
        for case in self.cases:
            inputs, result = case['inputs'], case['result']
            with self.subTest(inputs=inputs):
                expected = [max(0, v - r + 2 * r * u) for v, r, u in zip(inputs['scale'], inputs['scale_range'], random[:3])]
                expected += [math.radians(v - r + 2 * r * u) for v, r, u in zip(inputs['rotation'], inputs['rotation_range'], random[3:])]
                for a, b in zip(result['initialized'], expected):
                    self.assertAlmostEqual(a, b, delta=.00005)
                self.assertEqual(result['rngAfter'], rng)
                self.assertEqual(result['initCursor'], 24)
                self.assertEqual(result['makeCursor'], 36)
                self.assertEqual(result['computed']['scale'], result['initialized'][:3])
                self.assertEqual(result['computed']['rotation'], result['initialized'][3:])

    def test_const_ranges_still_advance_rng(self):
        result = self.reference.run([1, 2, 3], [0, 0, 0], [1, 1, 1])
        self.assertEqual(result['rngAfter'], random_values(SEED, 6)[0])
        self.assertNotEqual(result['rngAfter'], SEED)

    def test_local_xy_does_not_tilt_this_writer(self):
        a = self.reference.run([3, 5, 1], [25, -19, 37], [1.2, 2, 3])
        b = self.reference.run([3, 5, 1], [70, 90, 37], [1.2, 2, 3])
        self.assertNotEqual(a['computed']['rotation'][:2], b['computed']['rotation'][:2])
        self.assertEqual(a['writer']['positions'], b['writer']['positions'])

    def test_group_xy_scales_geometry_without_readding_translation(self):
        result = self.reference.run([3, 5, 1], [0, 0, 0], [2, 4, 7], center=[10, 20, 30])
        self.assertEqual(result['writer']['positions'][:4], [[4, 40, 30], [4, 0, 30], [16, 0, 30], [16, 40, 30]])
        other = self.reference.run([3, 5, 1], [0, 0, 0], [2, 4, 100], center=[10, 20, 30])
        self.assertEqual(result['writer']['positions'], other['writer']['positions'])

    def test_scale_init_clamps_negative_values(self):
        result = self.reference.run([-3, -1, 2], [0, 0, 0], [1, 1, 1])
        self.assertEqual(result['computed']['scale'], [0, 0, 2])

    def test_native_zscreen_scale_can_feed_joint_vector_consumer(self):
        locator = LocatorReference(APK)
        parent = locator.run([.4, -.2, .65], [1.2, 2, .75], [1.775] * 3)
        child = self.reference.run([3, 5, 1], [0, 0, 0], parent['scale'])
        p = child['writer']['positions']
        self.assertAlmostEqual(p[2][0] - p[0][0], 2 * 3 * 1.2 * 1.775, delta=.00001)
        self.assertAlmostEqual(p[0][1] - p[1][1], 2 * 5 * 2 * 1.775, delta=.00001)
        changed_roll = locator.run([.4, -.2, -.9], [1.2, 2, .75], [1.775] * 3)
        self.assertEqual(parent['scale'], changed_roll['scale'])
        self.assertNotEqual(parent['basis'], changed_roll['basis'])
        self.assertEqual(child['writer']['positions'], self.reference.run([3, 5, 1], [0, 0, 0], changed_roll['scale'])['writer']['positions'])

    def test_invalid_fixture_rejected(self):
        for rng in ([0, 0, 0, 0], [-1, 1, 2, 3], [1, 2, 3]):
            with self.assertRaises(ValueError):
                self.reference.run([1, 1, 1], [0, 0, 0], [1, 1, 1], rng=rng)
        with self.assertRaises(ValueError):
            self.reference.run([float('nan'), 1, 1], [0, 0, 0], [1, 1, 1])


if __name__ == '__main__':
    unittest.main()
