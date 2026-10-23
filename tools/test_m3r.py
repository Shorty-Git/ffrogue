"""Geometry boundary checks and independent converted-counterpart fixtures."""
import struct
import tempfile
import unittest
from pathlib import Path
from inspect_m3r import compare_effekseer, read_m3r, write_obj


def fixture():
    data = bytearray(328)
    data[:4] = b'BR3M'
    struct.pack_into('<III7I', data, 4, 35, 1, 0, 64, 80, 168, 184, 296, 328, 328)
    data[64:68] = b'tex\0'
    struct.pack_into('<4I', data, 112, 36, 3, 0, 3)
    struct.pack_into('<3H', data, 168, 0, 1, 2)
    for index, (position, uv) in enumerate([((0, 0, 0), (0, 0)), ((1, 0, 0), (1, 0)), ((0, 1, 0), (0, 1))]):
        struct.pack_into('<3fI5f', data, 184 + index * 36, *position, 0xffffffff, 0, 0, 1, *uv)
    return data


def counterpart():
    data = bytearray(struct.pack('<5I', 6, 0x3f800000, 1, 1, 3))
    for position, uv in [((0, 0, 0), (0, 1)), ((1, 0, 0), (1, 1)), ((0, 1, 0), (0, 0))]:
        data.extend(struct.pack('<16f4B', *position, 0, 0, 1, 0, 0, 0, 0, 0, 0, *uv, 0, 0, 255, 255, 255, 255))
    data.extend(struct.pack('<4I', 1, 2, 1, 0))
    return data


class M3rTests(unittest.TestCase):
    def test_mesh_attributes_padding_and_input_preservation(self):
        data = fixture()
        before = bytes(data)
        mesh = read_m3r(data)
        self.assertEqual(mesh['vertices'][1]['position'], [1, 0, 0])
        self.assertEqual(mesh['vertices'][2]['uv'], [0, 1])
        self.assertEqual(mesh['vertices'][0]['colorBytes'], [255] * 4)
        self.assertEqual(mesh['triangles'], [[0, 1, 2]])
        self.assertFalse(mesh['rendered'])
        self.assertEqual(bytes(data), before)

    def test_truncation_version_and_out_of_range_index(self):
        for data in [fixture()[:-1], fixture()]:
            if len(data) == 328:
                struct.pack_into('<I', data, 4, 99)
            with self.assertRaises(ValueError):
                read_m3r(data)
        data = fixture()
        struct.pack_into('<H', data, 168, 3)
        with self.assertRaises(ValueError):
            read_m3r(data)

    def test_nonfinite_geometry_rejected_but_packed_colors_allowed(self):
        data = fixture()
        read_m3r(data)
        struct.pack_into('<f', data, 184, float('nan'))
        with self.assertRaises(ValueError):
            read_m3r(data)

    def test_counterpart_requires_observed_uv_and_winding_conversion(self):
        mesh = read_m3r(fixture())
        data = counterpart()
        self.assertEqual(compare_effekseer(mesh, data)['verticesChecked'], 3)
        wrong = bytearray(data)
        struct.pack_into('<3I', wrong, len(wrong) - 12, 0, 1, 2)
        with self.assertRaises(ValueError):
            compare_effekseer(mesh, wrong)
        wrong = bytearray(data)
        struct.pack_into('<f', wrong, 20 + 52, 0)
        with self.assertRaises(ValueError):
            compare_effekseer(mesh, wrong)

    def test_obj_export_preserves_source_uv_and_face_order(self):
        mesh = read_m3r(fixture())
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'mesh.obj'
            write_obj(mesh, target)
            text = target.read_text(encoding='utf-8')
            self.assertIn('vt 0 0\n', text)
            self.assertIn('f 1/1/1 2/2/2 3/3/3\n', text)


if __name__ == '__main__':
    unittest.main()
