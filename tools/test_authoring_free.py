"""Authoring-free approximation: binary controls win, corpus defaults are recorded, strict mode refuses."""
import unittest
import bmb_channels
from authoring_sources import ApproximateProject, project_sources, project_identity


class AuthoringFreeTests(unittest.TestCase):
    def tearDown(self):
        bmb_channels.APPROXIMATED_CURVES = None

    def test_strict_mode_cannot_construct_a_stand_in(self):
        bmb_channels.APPROXIMATED_CURVES = None
        with self.assertRaisesRegex(ValueError, 'approximation mode'):
            ApproximateProject('x.bmb')

    def test_decoded_binary_fields_win_and_defaults_are_listed_once(self):
        bmb_channels.APPROXIMATED_CURVES = []
        node = {'index': 4, 'type': 'EmitterModel', 'sourceControls': {'fields': {
            'alphaMode': {'status': 'decoded', 'value': 'Lerp'},
            'colorRate': {'status': 'unknown-enum', 'value': None}}}}
        project = ApproximateProject('fx.bmb')
        comparison, sources = project_sources({'nodes': [node]}, project)
        self.assertTrue(comparison['authoringFree'])
        source = sources[0]
        self.assertEqual(source.findtext('Basic_ParentNodeInfluence_AlphaParentNodeInfluenceType'), 'Lerp')
        self.assertEqual(bmb_channels.APPROXIMATED_CURVES, [])
        self.assertEqual(source.findtext('Basic_ParentNodeInfluence_MatrixParentNodeInfluenceType'), 'On')
        source.findtext('Basic_ParentNodeInfluence_MatrixParentNodeInfluenceType')
        self.assertEqual(len(bmb_channels.APPROXIMATED_CURVES), 1)
        entry = bmb_channels.APPROXIMATED_CURVES[0]
        self.assertEqual((entry['member'], entry['node'], entry['treatment']), ('fx.bmb', 4, 'authoring-free-corpus-default'))
        self.assertTrue(project_identity(project).startswith('authoring-free:'))
        with self.assertRaisesRegex(ValueError, 'No corpus default'):
            source.findtext('Not_A_Real_Field')


    def test_binary_texture_tint_feeds_the_stand_in(self):
        import struct
        from bmb_texture_tint import read_texture_tint
        raw = bytearray(400)
        struct.pack_into('<3f', raw, 100 + 168, 1.0, 0.5, 0.25)
        struct.pack_into('<3f', raw, 100 + 184, 0.1, 0.0, 0.0)
        node = {'index': 0, 'type': 'EmitterModel', 'typeId': 6, 'offset': 100}
        self.assertEqual(read_texture_tint(bytes(raw), node), ([1.0, 0.5, 0.25], [0.10000000149011612, 0.0, 0.0]))
        self.assertIsNone(read_texture_tint(bytes(raw), {**node, 'typeId': 0}))
        bmb_channels.APPROXIMATED_CURVES = []
        source = ApproximateProject('fx.bmb', bytes(raw)).sources({'nodes': [node]})[0]
        self.assertEqual(source.find('Texture1_Color_Scale_Rgb_Value_Initial').attrib, {'R': '1.0', 'G': '0.5', 'B': '0.25'})
        self.assertEqual(bmb_channels.APPROXIMATED_CURVES, [])

if __name__ == '__main__':
    unittest.main()
