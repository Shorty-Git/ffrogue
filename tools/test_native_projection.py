import copy
import hashlib
from pathlib import Path
import unittest
from prepare_native_projection import select_comparison


class NativeProjectionPreparationTests(unittest.TestCase):
    def fixture(self):
        plan = {'approved': False, 'rendererReference': {'nativeSha256': 'fixture', 'globalScale': 1.775},
                'particleGeometry': True, 'nullLocator': True,
                'effects': [{'name': 'shared.bmb', 'nodes': [{'index': 7}]}],
                'members': [{'effect': 0, 'startFrame': 42, 'scalePercent': 100, 'rotation': [0, 0, 0]}]}
        audit = {'approved': False, 'nativeSha256': 'fixture', 'projectionType': 'orthographic',
                 'camera': {'viewport': [1080, 1920], 'viewMatrix': [1 if i % 5 == 0 else 0 for i in range(16)],
                            'projectionMatrix': [2/640, 0, 0, 0, 0, 2/1136, 0, 0, 0, 0, -.0001, 0, -1, -1, 0, 1]},
                 'rootWorld': [188, 636, 0], 'animationScale': [1.775] * 3}
        geometry = {'approved': False, 'effect': 'shared.bmb', 'node': 7,
                    'inputs': {'--plan': {'sha256': 'plan-fixture'}}, 'camera': copy.deepcopy(audit['camera']),
                    'root': [188, 636, 0], 'playerSha256': hashlib.sha256(Path('tools/original_effect_player.mjs').read_bytes()).hexdigest()}
        return plan, audit, geometry

    def test_explicit_selection_keeps_input_flags_and_source_clock_unchanged(self):
        plan, audit, geometry = self.fixture()
        before = copy.deepcopy(plan)
        selected, member = select_comparison(plan, audit, 'shared.bmb', 'plan-fixture', geometry)
        self.assertEqual(plan, before)
        self.assertEqual(member['startFrame'], 42)
        self.assertEqual(selected['members'][0]['startFrame'], 0)
        self.assertTrue(selected['particleGeometry'])
        self.assertTrue(selected['nullLocator'])

    def test_different_build_scale_and_ambiguous_effect_fail(self):
        for mutate in [lambda p, a: a.update(nativeSha256='other'),
                       lambda p, a: a.update(animationScale=[1, 1, 1]),
                       lambda p, a: p['members'].append(copy.deepcopy(p['members'][0]))]:
            plan, audit, _ = self.fixture()
            mutate(plan, audit)
            with self.assertRaises(ValueError):
                select_comparison(plan, audit, 'shared.bmb', 'plan-fixture')

    def test_geometry_requires_exact_plan_camera_root_and_current_player(self):
        plan, audit, _ = self.fixture()
        with self.assertRaises(ValueError):
            select_comparison(plan, audit, 'shared.bmb', 'plan-fixture', {})
        for mutate in [lambda g: g['inputs']['--plan'].update(sha256='stale'),
                       lambda g: g['root'].__setitem__(0, 186),
                       lambda g: g.update(playerSha256='old'),
                       lambda g: g.update(effect='other.bmb')]:
            plan, audit, geometry = self.fixture()
            mutate(geometry)
            with self.assertRaises(ValueError):
                select_comparison(plan, audit, 'shared.bmb', 'plan-fixture', geometry)

    def test_unsupported_camera_and_anchor_do_not_silently_enter_current_geometry_subset(self):
        for mutate in [lambda a: a['camera']['viewMatrix'].__setitem__(12, 1),
                       lambda a: a['rootWorld'].__setitem__(2, 10),
                       lambda a: a['camera']['projectionMatrix'].__setitem__(11, -1),
                       lambda a: a.update(animationScale=[float('nan')] * 3),
                       lambda a: a['camera'].update(viewport=[0, 1920])]:
            plan, audit, _ = self.fixture()
            mutate(audit)
            with self.assertRaises(ValueError):
                select_comparison(plan, audit, 'shared.bmb', 'plan-fixture')


if __name__ == '__main__':
    unittest.main()
