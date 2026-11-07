"""Acceptance checks for the admitted complete-effect export, not isolated math."""
import copy
import hashlib
import json
from pathlib import Path
import unittest

try:
    from export_connected_effect import export
except ModuleNotFoundError as error:
    if error.name not in ('unicorn', 'PIL'):
        raise
    export = None

APK = Path('tools/data/memorial-audit/installed-base-v208.apk')
REQUEST = Path('tools/data/connected-effect/strobe-request.json')


@unittest.skipUnless(export and APK.exists() and REQUEST.exists(), 'Pinned APK and generated connected request required')
class ConnectedEffectTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.request = json.loads(REQUEST.read_text(encoding='utf-8'))
        cls.result = export(APK, cls.request)

    def test_complete_source_traversal_to_packed_vertex_stream(self):
        result = self.result
        self.assertEqual(result['nodeCount'], 4)
        self.assertEqual(len(result['parents']), 3)
        self.assertEqual(len(result['frames']), 32)
        self.assertEqual(result['frames'][0]['vertices'], [])
        self.assertEqual(result['frames'][-1]['vertices'], [])
        for frame in result['frames'][1:-1]:
            self.assertEqual(len(frame['vertices']), 6)
            self.assertTrue(all(v['textureTint'] == [1, 1, 1, 1] for v in frame['vertices']))
        self.assertFalse(result['approved'])
        self.assertEqual(result['chain']['chain']['updates'][0]['vertices']['writer'], '0x20016bc')
        self.assertTrue(all(u['vertices']['stride'] == 40 for u in result['chain']['chain']['updates']))

    def test_init_update_make_share_record_consumption_and_lifetime_finishes(self):
        chain = self.result['chain']['chain']
        self.assertEqual(chain['consumedBytes'], 28)
        self.assertTrue(all(u['cursor'] == u['vertices']['makeCursor'] == 28 for u in chain['updates']))
        self.assertEqual(self.result['frames'][15]['vertices'][0]['rgba'], [255,255,255,124])
        self.assertEqual(self.result['frames'][30]['vertices'][0]['rgba'][3], 0)
        self.assertTrue(self.result['scheduler']['updates'][-1]['expired'])

    def test_same_inputs_reproduce_all_exported_frames(self):
        again = export(APK, self.request)
        self.assertEqual(self.result, again)

    def test_declared_host_translation_moves_all_positions_without_alpha_change(self):
        request = copy.deepcopy(self.request)
        request['root']['center'][0] += 17
        moved = export(APK, request)
        a, b = self.result['frames'][15]['vertices'], moved['frames'][15]['vertices']
        for old, new in zip(a, b):
            self.assertEqual(old['rgba'], new['rgba'])
            self.assertAlmostEqual(new['position'][0] - old['position'][0], 17, delta=.001)
            self.assertEqual(new['position'][1:], old['position'][1:])

    def test_complex_effect_is_rejected_instead_of_omitting_other_particles(self):
        request = copy.deepcopy(self.request)
        source = Path('tools/data/shared-skill-review/climhazzard/originals/atk_blow1_purple.bmb')
        request.update(source=str(source), sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest())
        with self.assertRaisesRegex(ValueError, 'Null parents and one Particle'):
            export(APK, request)

    def test_stale_source_and_changed_native_blend_are_rejected(self):
        for mutation in ('source', 'blend'):
            request = copy.deepcopy(self.request)
            if mutation == 'source':
                request['sourceSha256'] = 'stale'
            else:
                request['blend']['row'] = [1, 1, 1]
            with self.assertRaises(ValueError):
                export(APK, request)


CAPSULE = Path('tools/data/connected-effect/capsule-request.json')


@unittest.skipUnless(export and APK.exists() and CAPSULE.exists(), 'Second prepared connected fixture required')
class SecondConnectedEffectTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.request = json.loads(CAPSULE.read_text(encoding='utf-8'))
        cls.result = export(APK, cls.request)

    def test_second_complete_source_uses_same_export_and_original_nonuniform_texture(self):
        self.assertEqual(self.result['nodeCount'], 5)
        self.assertEqual(len(self.result['frames']), 123)
        self.assertEqual(self.result['frames'][0]['vertices'], [])
        self.assertEqual(self.result['frames'][-1]['vertices'], [])
        self.assertTrue(all(len(f['vertices']) == 6 for f in self.result['frames'][1:-1]))
        self.assertTrue(all(v['rgba'][3] == 255 for f in self.result['frames'][1:-1] for v in f['vertices']))
        self.assertEqual(self.result['blend']['row'], [1,770,771])
        self.assertEqual(self.result['chain']['chain']['consumedBytes'], 24)
        self.assertEqual(self.result['chain']['chain']['updates'][0]['vertices']['writer'], '0x20016bc')
        from PIL import Image
        with Image.open(next(iter(self.result['textures'].values()))['path']) as image:
            self.assertNotEqual(image.convert('RGBA').getextrema(), ((255,255),) * 4)

    def test_native_default_locator_carries_source_tilt_into_descendant_basis(self):
        tilted = self.result['parents'][2]
        self.assertEqual(tilted['locator'], 1)
        self.assertLess(tilted['basis'][5], 0)
        self.assertGreater(tilted['basis'][7], 0)
        self.assertAlmostEqual(tilted['scale'][0], self.request['root']['scale'][0], places=5)
        self.assertEqual(self.result['frames'][1]['vertices'][0]['uv'], [0,0])
        self.assertEqual(self.result['frames'][1]['vertices'][2]['uv'], [1,1])

    def test_second_export_repeats_exactly_and_native_expiration_is_empty(self):
        self.assertEqual(self.result, export(APK, self.request))
        self.assertTrue(self.result['scheduler']['updates'][-1]['expired'])

    def test_missing_source_texture_never_becomes_a_white_placeholder(self):
        request = copy.deepcopy(self.request)
        next(iter(request['textures'].values()))['path'] += '.missing'
        with self.assertRaises(FileNotFoundError):
            export(APK, request)

    def test_rotated_parent_requires_explicit_compatible_inheritance_evidence(self):
        request = copy.deepcopy(self.request)
        request.pop('parentEvidence')
        with self.assertRaisesRegex(ValueError, 'Default parent requires'):
            export(APK, request)


if __name__ == '__main__':
    unittest.main()
