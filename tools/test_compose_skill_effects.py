"""Regression checks against observed native composition and unsupported inputs."""
import unittest

from compose_skill_effects import compose_effects


class CompositionTests(unittest.TestCase):
    def test_matches_recorded_brave_slash_command(self):
        result = compose_effects('2:1000520:1', '4:5008050:1:1:0', 1)
        self.assertEqual(result['effectFrames'], '2:1000520:1&6:5008050:1:1:0')

    def test_uses_latest_start_instead_of_fixed_two_frame_offset(self):
        result = compose_effects('8:100:1&3:200:1', '0:300:1:2:0&4:400:1:1:0', 1)
        self.assertEqual(result['effectFrames'],
                         '8:100:1&3:200:1&8:300:1:2:0&12:400:1:1:0')

    def test_other_motion_keeps_source(self):
        result = compose_effects('2:1000520:1', '4:5008050:1:1:0', 2)
        self.assertEqual(result['effectFrames'], '4:5008050:1:1:0')
        self.assertEqual(result['skillFrameOffset'], 0)

    def test_rejects_unimplemented_branch_and_missing_effects(self):
        for raw in ['', '0', '2:100:1@4:200:1', '2:100:1,4:200:1']:
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                compose_effects('2:1000520:1', raw, 1)

    def test_rejects_invalid_start_and_truncated_entry(self):
        for raw in ['-2:100:1', '2:100', 'x:100:1']:
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                compose_effects(raw, '4:5008050:1:1:0', 1)


if __name__ == '__main__':
    unittest.main()
