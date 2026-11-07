"""Check normal occlusion and additive output on dark and light destinations."""
import unittest

import numpy as np

from prepare_cgg_body_layers import compose, neutral


def part(blend, x):
    return (x, 0, 0, blend, 100, 0, 0, 0, 1, 1, 0)


class LayerTests(unittest.TestCase):
    def test_emission_does_not_add_coverage_and_respects_part_order(self):
        glow, cover = part(1, 0), part(0, 1)
        isolated = {
            neutral(glow): (0, 0, np.array([[[0, .6, 1, .5]]], dtype=np.float32)),
            cover: (0, 0, np.array([[[.4, 0, 0, .5]]], dtype=np.float32)),
        }
        for pose, expected in [([glow, cover], (.3, .5)), ([cover, glow], (.15, .25))]:
            body, light = (np.asarray(p, dtype=np.float32)[0, 0] / 255
                           for p in compose(pose, isolated, 0, 0, 1, 1))
            self.assertAlmostEqual(body[3], .5, delta=.003)
            np.testing.assert_allclose(light[1:3] * light[3], expected, atol=.005)
            for backdrop in (.02, .42):
                result = body[1:3] * body[3] + backdrop * (1 - body[3]) + light[1:3] * light[3]
                np.testing.assert_allclose(result, np.array(expected) + .5 * backdrop, atol=.005)


if __name__ == '__main__':
    unittest.main()
