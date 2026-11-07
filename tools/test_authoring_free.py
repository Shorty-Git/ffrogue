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


if __name__ == '__main__':
    unittest.main()
