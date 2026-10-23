"""Checks for fixed-vector layout and typed per-emitter resource bindings."""
import struct
import unittest
import xml.etree.ElementTree as ET
from bmb_parameters import compare_parameters, read_bindings, read_parameters


class BmbParameterTests(unittest.TestCase):
    def test_fixed_vector_component_order_and_modes(self):
        data = bytearray(704)
        struct.pack_into('<54f', data, 340, *range(1, 55))
        struct.pack_into('<I', data, 556, 1)
        struct.pack_into('<I', data, 656, 2)
        struct.pack_into('<I', data, 660, 3)
        before = bytes(data)
        node = {'offset': 0, 'typeId': 0}
        read_parameters(data, node)
        self.assertEqual(node['staticVectors']['transform']['translation']['valueInitial'], [1, 2, 3])
        self.assertEqual(node['staticVectors']['transform']['translation']['accelerationRange'], [16, 17, 18])
        self.assertEqual(node['staticVectors']['transform']['rotation']['valueInitial'], [19, 20, 21])
        self.assertEqual(node['staticVectors']['transform']['scale']['valueInitial'], [37, 38, 39])
        self.assertEqual([v['name'] for v in node['motionModes'].values()], ['NewtonDynamics', 'CurveValue', 'CurveSpeed'])
        self.assertEqual(bytes(data), before)
        struct.pack_into('<I', data, 556, 99)
        read_parameters(data, node)
        self.assertEqual(node['motionModes']['translation']['name'], 'Unknown')

    def test_texture_layers_and_pivots_stay_separate(self):
        data = bytearray(2128)
        for offset, values in [(972, [1, 2, 3]), (1200, [4, 5, 6]),
                               (960, [7, 8, 9]), (1188, [10, 11, 12])]:
            struct.pack_into('<3f', data, offset, *values)
        node = {'offset': 0, 'typeId': 2}
        read_parameters(data, node)
        self.assertEqual(node['staticVectors']['texture1']['translation']['valueInitial'], [1, 2, 3])
        self.assertEqual(node['staticVectors']['texture2']['translation']['valueInitial'], [4, 5, 6])
        self.assertEqual(node['texturePivots'], {'texture1': [7, 8, 9], 'texture2': [10, 11, 12]})

    def test_typed_bindings_and_explicit_missing_layer(self):
        data = bytearray(1904)
        struct.pack_into('<Q', data, 64, 4)
        struct.pack_into('<Q', data, 80, 20)
        struct.pack_into('<Q', data, 96, 0xffffffffffffffff)
        resources = [{'kind': 'model', 'name': 'mesh', 'stringOffset': 104, 'index': 0},
                     {'kind': 'texture', 'name': 'image', 'stringOffset': 120, 'index': 0}]
        node = {'offset': 0, 'typeId': 6}
        read_bindings(data, node, resources, 100)
        self.assertEqual(node['resourceBindings']['model']['name'], 'mesh')
        self.assertEqual(node['resourceBindings']['texture1']['name'], 'image')
        self.assertIsNone(node['resourceBindings']['texture2'])
        struct.pack_into('<Q', data, 80, 4)
        with self.assertRaises(ValueError):
            read_bindings(data, node, resources, 100)
        struct.pack_into('<Q', data, 80, 999)
        with self.assertRaises(ValueError):
            read_bindings(data, node, resources, 100)

    def test_source_binding_roles_cannot_be_swapped(self):
        node = {'staticVectors': {}, 'texturePivots': {}, 'motionModes': {},
                'resourceBindings': {'model': {'name': 'mesh'}, 'texture1': {'name': 'image'}, 'texture2': None}}
        source = ET.fromstring('<ResIdeNode><Model_Basic_ModelName>mesh</Model_Basic_ModelName><Texture_Layer1_PictureName>image</Texture_Layer1_PictureName></ResIdeNode>')
        self.assertEqual(compare_parameters(node, source)['nonemptyBindingsChecked'], 2)
        source.find('Texture_Layer1_PictureName').text = 'mesh'
        with self.assertRaises(ValueError):
            compare_parameters(node, source)

    def test_nonfinite_and_unverified_parameters_are_rejected(self):
        data = bytearray(704)
        struct.pack_into('<f', data, 340, float('inf'))
        with self.assertRaises(ValueError):
            read_parameters(data, {'offset': 0, 'typeId': 0})
        with self.assertRaises(ValueError):
            compare_parameters({}, ET.fromstring('<ResIdeNode />'))


if __name__ == '__main__':
    unittest.main()
