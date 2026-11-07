"""Check original ordered module assignment against independent dispatch evidence."""
from pathlib import Path
import struct
import sys
import unittest

try:
    from emulate_particle_assignment import ParticleAssignmentReference
except ModuleNotFoundError as error:
    if error.name != 'unicorn':
        raise
    ParticleAssignmentReference = None
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from inspect_bmb import read_bmb
from native_particle_dispatch import ParticleDispatch

APK = Path('tools/data/memorial-audit/installed-base-v208.apk')
ROOT = Path('tools/data/shared-skill-review')


@unittest.skipUnless(ParticleAssignmentReference and APK.exists(), 'Optional Unicorn and pinned APK required')
class AssignmentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.reference = ParticleAssignmentReference(APK)
        cls.dispatch = ParticleDispatch(APK)
        cls.files = [p for folder in ('brave-slash-composed', 'blade-beam', 'climhazzard')
                     for p in (ROOT / folder / 'originals').glob('*.bmb')]
        cls.cases = [c for p in cls.files for c in cls.reference.source_cases(p)]

    def case(self, source, node):
        return next(c['result']['phases'] for c in self.cases if c['source'] == source and c['node'] == node)

    def names(self, modules):
        return [m['symbols'][0] for m in modules]

    def test_all_existing_sources_resolve_to_defined_ordered_modules(self):
        self.assertEqual(len(self.files), 8, 'Existing eight-effect corpus required')
        self.assertEqual(len(self.cases), 13)
        self.assertEqual({phase: sum(len(c['result']['phases'][phase]) for c in self.cases)
                          for phase in ('init', 'update', 'make')}, {'init': 67, 'update': 67, 'make': 95})
        self.assertTrue(all(m['symbols'] for c in self.cases for phase in c['result']['phases'].values() for m in phase))

    def test_scale_and_rotation_agree_with_previously_verified_relocation_tables(self):
        for path in self.files:
            source = self.dispatch.inspect_effect(path)
            for node in source['particles']:
                case = self.case(path.name, node['node'])
                for stage, kind in [('init', 'scaleInit'), ('update', 'scaleUpdate'), ('make', 'scale'),
                                    ('init', 'rotationInit'), ('update', 'rotationUpdate'), ('make', 'rotation')]:
                    selected = node[kind]['target']
                    if selected:
                        self.assertIn(selected['address'], [m['address'] for m in case[stage]],
                                      (path.name, node['node'], kind))

    def test_strobe_has_one_scale_update_but_no_scale_initialization(self):
        phases = self.case('eff_strobe_white_a50_f30.bmb', 3)
        self.assertFalse(any('scaling' in n for n in self.names(phases['init'])))
        self.assertIn('7scaling6update3One', self.names(phases['update'])[0])
        self.assertIn('7scaling11make_vertex4OneX', self.names(phases['make'])[0])

    def test_native_profile_counts_match_arrays_and_scale_work_delta_is_four_bytes(self):
        for case in self.cases:
            result = case['result']
            self.assertEqual(result['moduleCounts'][:3],
                             [len(result['phases'][p]) for p in ('init', 'update', 'make')])
            self.assertEqual(result['moduleCounts'][3], 0)
        path = next(p for p in self.files if p.name == 'eff_strobe_white_a50_f30.bmb')
        raw = path.read_bytes(); node = next(n for n in read_bmb(raw)['nodes'] if n['typeId'] == 3)
        block = bytearray(raw[node['offset']:node['offset'] + node['bytes']])
        original = self.reference.run(block)
        struct.pack_into('<I', block, 0x12c, 16)
        constant = self.reference.run(block)
        self.assertEqual(original['workBytes'], 60)
        self.assertEqual(constant['workBytes'] - original['workBytes'], 4)
        self.assertEqual(constant['moduleCounts'][0] - original['moduleCounts'][0], 1)

    def test_parent_shape_and_scale_order_is_preserved_for_surface_emitter(self):
        phases = self.case('atk_aerialslash_001_green.bmb', 10)
        names = self.names(phases['init'])
        self.assertIn('parent_coord', names[0])
        self.assertIn('InitModelOnSurface', names[1])
        self.assertIn('InitConstX', names[2])
        self.assertIn('InitVelocity', names[3])

    def test_binary_only_power_geyser_selects_alpha_blend_in_make_chain(self):
        for node in (20, 29):
            phases = self.case('atk_powergeyser_001_purple.bmb', node)
            make = self.names(phases['make'])
            self.assertTrue(any('alpha_blend11make_vertex3Mod' in n for n in make))
            self.assertFalse(any('alpha_blend' in n for n in self.names(phases['init'])))
            self.assertFalse(any('alpha_blend' in n for n in self.names(phases['update'])))

    def test_assignment_does_not_execute_selected_module_callbacks(self):
        for case in self.cases:
            executed = {h['address'] for h in case['result']['executedHelpers']}
            selected = {m['address'] for phase in case['result']['phases'].values() for m in phase}
            self.assertTrue(executed.isdisjoint(selected))

    def test_repeated_assignment_is_deterministic(self):
        path = next(p for p in self.files if p.name == 'eff_strobe_white_a50_f30.bmb')
        first = self.reference.source_cases(path)
        self.assertEqual(first, self.reference.source_cases(path))

    def test_invalid_parameter_blocks_fail_before_execution(self):
        for raw in (b'', bytes(1840), struct.pack('<2I', 2, 1840) + bytes(1832)):
            with self.assertRaises(ValueError):
                self.reference.run(raw)


if __name__ == '__main__':
    unittest.main()
