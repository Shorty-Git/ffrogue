"""Projection checks with independent analytical pixel expectations."""
import unittest

from audit_camera_projection import project


class CameraProjectionTests(unittest.TestCase):
    def setUp(self):
        self.camera = {'viewport': [1080, 1920],
                       'viewMatrix': [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
                       'projectionMatrix': [2/640, 0, 0, 0, 0, 2/1136, 0, 0,
                                            0, 0, -1/10000, 0, -1, -1, 0, 1]}

    def test_orthographic_corners_and_center(self):
        self.assertEqual(project(self.camera, [0, 0, 0]), [0, 1920])
        self.assertEqual(project(self.camera, [640, 1136, 0]), [1080, 0])
        self.assertEqual(project(self.camera, [320, 568, 0]), [540, 960])

    def test_z_does_not_resize_orthographic_points(self):
        self.assertEqual(project(self.camera, [186, 638, 0]),
                         project(self.camera, [186, 638, 1000]))

    def test_view_translation_uses_column_major_order(self):
        self.camera['viewMatrix'][12:15] = [10, -20, 0]
        self.assertEqual(project(self.camera, [310, 588, 0]), [540, 960])

    def test_invalid_projection_rejects(self):
        self.camera['projectionMatrix'][15] = 0
        with self.assertRaises(ValueError):
            project(self.camera, [0, 0, 0])


if __name__ == '__main__':
    unittest.main()
