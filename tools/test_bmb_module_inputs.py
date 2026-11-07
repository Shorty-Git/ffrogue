import struct
import unittest
from bmb_playback_fields import attach_playback_fields

class ModuleInputsTest(unittest.TestCase):
    def test_quad_flat_color_keeps_native_inline_vec4_stride(self):
        raw = bytearray(2128)
        struct.pack_into('<4f', raw, 0x68, .25, .5, .75, .9)
        struct.pack_into('<4f', raw, 0x78, .125, .25, .5, .8)
        nodes = [dict(index=0, typeId=2, offset=0, childCount=0)]
        attach_playback_fields(raw, nodes)
        result = nodes[0]['nativeModuleInputs']['flatColor']
        self.assertEqual(result['value'], [.25, .5, .75])
        self.assertEqual(result['range'], [.125, .25, .5])
        self.assertNotIn('kind', result)

    def test_particle_color_range_uses_vec4_stride_and_uv_uses_vec3_stride(self):
        raw = bytearray(1840)
        struct.pack_into('<4f', raw, 104, .25, .5, .75, .9)
        struct.pack_into('<4f', raw, 120, .125, .25, .5, .8)
        struct.pack_into('<6f', raw, 0x4e0, .5, .5, 1, .25, 0, 0)
        nodes = [dict(index=0, typeId=3, offset=0, childCount=0)]
        attach_playback_fields(raw, nodes)
        result = nodes[0]['nativeModuleInputs']
        self.assertEqual(result['color1']['range'], [.125, .25, .5])
        self.assertEqual(result['color1']['rangeOffset'], 120)
        self.assertEqual(result['texture2Scale']['range'], [.25, 0, 0])
        self.assertEqual(result['texture2Scale']['valueOffset'], 0x4e0)
        self.assertNotIn('kind', result['color1'], 'Raw fields must not select a module')

if __name__ == '__main__':
    unittest.main()
