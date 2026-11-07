"""Check shader table bounds and selection branches independently of local dumps."""
import struct
import unittest
from native_material_selection import parse_package, select_initial, ADD_SHA, OP_OFFSETS


def block(source=b'void main(){}\0'):
    return struct.pack('<4I', 1, 12, len(source), 0) + struct.pack('<3I', 0, 0, len(source)) + source


class NativeMaterialTests(unittest.TestCase):
    def setUp(self):
        self.raw = bytearray(1840)
        self.node = {'typeId': 3, 'offset': 0, 'bytes': 1840,
                     'resourceBindings': {'texture1': {'name': 'base'}, 'texture2': {'name': 'sub'}}}
        self.catalog = {'descriptors': [[0, 0, 0, 0] for _ in range(2280)],
                        'packages': {'bmshaderpack.bin': {
                            'vertex': [{'sha256': 'vertex'}],
                            'fragment': [{'sha256': ADD_SHA, 'offset': 12}]}}}

    def test_package_reads_declared_sources_not_regex_matches(self):
        result = parse_package(block() + block(b'// prefix\nvoid main(){}\0'))
        self.assertEqual(result['fragment'][0]['source'], '// prefix\nvoid main(){}')
        self.assertEqual(result['vertex'][0]['bytesWithNul'], 14)

    def test_bad_ranges_terminators_and_tail_rejected(self):
        for data in (block()[:-1], block(b'void main(){}!') + block(),
                     block() + block() + b'x', block(b'void\0main(){}\0') + block()):
            with self.assertRaises(ValueError):
                parse_package(data)
        malformed = bytearray(block() + block())
        struct.pack_into('<I', malformed, 20, 99999)
        with self.assertRaises(ValueError):
            parse_package(malformed)

    def test_all_texture_operations_follow_native_dispatch(self):
        for op, offset in OP_OFFSETS.items():
            struct.pack_into('<I', self.raw, 0x6a0, op)
            result = select_initial(self.raw, self.node, self.catalog)
            self.assertEqual(result['descriptorIndex'], 224 + offset)
            self.assertTrue(result['addCandidateCompatible'])

    def test_every_selector_bit_and_missing_second_texture(self):
        self.raw[0xe1] = 1
        self.raw[0xe6] = 2
        struct.pack_into('<f', self.raw, 0x1c8, .5)
        struct.pack_into('<I', self.raw, 0x6b8, 1)
        struct.pack_into('<I', self.raw, 0x6b4, 1)
        struct.pack_into('<I', self.raw, 0x6a0, 2)
        self.assertEqual(select_initial(self.raw, self.node, self.catalog)['descriptorIndex'], 287)
        del self.node['resourceBindings']['texture2']
        self.assertEqual(select_initial(self.raw, self.node, self.catalog)['descriptorIndex'], 31)

    def test_unknown_operation_and_model_do_not_guess(self):
        struct.pack_into('<I', self.raw, 0x6a0, 7)
        self.assertFalse(select_initial(self.raw, self.node, self.catalog)['supported'])
        self.node['typeId'] = 6
        self.assertFalse(select_initial(self.raw, self.node, self.catalog)['supported'])

    def test_quad_uses_its_own_layout(self):
        raw = bytearray(2128)
        struct.pack_into('<I', raw, 0x730, 2)
        node = {**self.node, 'typeId': 2, 'bytes': 2128}
        result = select_initial(raw, node, self.catalog)
        self.assertEqual((result['resourceType'], result['descriptorIndex']), (0, 256))

    def test_model_texture_operations_and_verified_uv_requirement(self):
        raw = bytearray(1904)
        node = {**self.node, 'typeId': 6, 'bytes': 1904,
                'resourceBindings': {**self.node['resourceBindings'], 'model': {'name': 'mesh'}}}
        mesh = {'sourceSha256': 'mesh-source', 'nativeMaterial': {
            'supported': True, 'hasUv': True, 'submeshIndex': 0,
            'textures': [{'pointerPresent': False}]}}
        for op, expected in enumerate([1344, 1728, 1472, 1600, 1856, 1984, 2112]):
            struct.pack_into('<I', raw, 0x6e0, op)
            result = select_initial(raw, node, self.catalog, {'mesh': mesh})
            self.assertEqual((result['resourceType'], result['descriptorIndex']), (4, expected))
        mesh['nativeMaterial']['hasUv'] = False
        self.assertFalse(select_initial(raw, node, self.catalog, {'mesh': mesh})['supported'])

    def test_model_flags_embedded_pointer_and_no_texture_branch(self):
        raw = bytearray(1904)
        for offset in (0x111, 0x118, 0x114, 0x117):
            raw[offset] = 1
        struct.pack_into('<f', raw, 0x1fc, .25)
        struct.pack_into('<I', raw, 0x6f4, 1)
        node = {'typeId': 6, 'bytes': 1904, 'offset': 0, 'resourceBindings': {'model': {'name': 'mesh'}}}
        mesh = {'sourceSha256': 'mesh-source', 'nativeMaterial': {
            'supported': True, 'hasUv': True, 'submeshIndex': 0,
            'textures': [{'pointerPresent': True, 'name': ''}]}}
        result = select_initial(raw, node, self.catalog, {'mesh': mesh})
        self.assertEqual(result['descriptorIndex'], 1439)
        self.assertEqual(result['modelSha256'], 'mesh-source')
        mesh['nativeMaterial']['textures'][0]['pointerPresent'] = False
        self.assertEqual(select_initial(raw, node, self.catalog, {'mesh': mesh})['descriptorIndex'], 543)


if __name__ == '__main__':
    unittest.main()
