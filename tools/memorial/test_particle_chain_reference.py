"""Whole selected init/update chains and relocated scalar alpha controls."""
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

APK = Path('tools/data/memorial-audit/installed-base-v208.apk')
ROOT = Path('tools/data/shared-skill-review')


@unittest.skipUnless(ParticleAssignmentReference and APK.exists(), 'Optional Unicorn and pinned APK required')
class ChainTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.reference = ParticleAssignmentReference(APK)
        cls.files = [p for folder in ('brave-slash-composed', 'blade-beam', 'climhazzard')
                     for p in (ROOT / folder / 'originals').glob('*.bmb')]
        cls.cases = [c for p in cls.files for c in cls.reference.source_cases(p, probe=True)]

    def strobe(self):
        path = next(p for p in self.files if p.name == 'eff_strobe_white_a50_f30.bmb')
        raw = path.read_bytes(); node = next(n for n in read_bmb(raw)['nodes'] if n['typeId'] == 3)
        return raw[node['offset']:node['offset'] + node['bytes']], node['alphaCurve']['keys']

    def alpha(self, chain):
        # This node's real init sequence is translation12, alpha4, color12.
        self.assertEqual(chain['initCursors'], [12, 16, 28])
        return [struct.unpack_from('<f', bytes.fromhex(u['recordHex']), 12)[0] for u in chain['updates']]

    def test_source_chain_coverage_and_cursor_bounds(self):
        self.assertEqual(len(self.cases), 13)
        chains = [c['result']['chain'] for c in self.cases]
        executed = [c for c in chains if c['status'] == 'executed']
        self.assertEqual(len(executed), 11)
        self.assertEqual(len([c for c in chains if c['status'] == 'blocked']), 2)
        for chain in executed:
            self.assertLessEqual(chain['consumedBytes'], chain['workBytes'])
            self.assertTrue(all(u['cursor'] == chain['consumedBytes'] for u in chain['updates']))

    def test_unreviewed_resource_and_translation_curve_inputs_stay_blocked(self):
        blocked = [c['result']['chain']['module'] for c in self.cases if c['result']['chain']['status'] == 'blocked']
        self.assertTrue(any('parent_coord' in n for n in blocked))
        self.assertTrue(any('InitAddValueCurve' in n for n in blocked))

    def test_work_reservation_is_not_relabelled_as_exact_record_consumption(self):
        gaps = [c['result']['chain']['unconsumedWorkBytes'] for c in self.cases if c['result']['chain']['status'] == 'executed']
        self.assertEqual(sorted(gaps), [20] + [32] * 10)

    def test_original_spline_alpha_matches_unscaled_key_tangents(self):
        parameter, keys = self.strobe()
        curve = b''.join(struct.pack('<I4f', k['typeId'], k['slopeLeft'], k['slopeRight'], k['value'], k['frame']) for k in keys)
        chain = self.reference.run(parameter, probe={'alphaCurve': curve})['chain']
        values = self.alpha(chain)
        self.assertAlmostEqual(values[0], keys[0]['value'])
        self.assertAlmostEqual(values[2], keys[1]['value'])
        self.assertAlmostEqual(values[4], keys[2]['value'])
        for value, a, b in [(values[1], keys[0], keys[1]), (values[3], keys[1], keys[2])]:
            unscaled = .5 * a['value'] + .5 * b['value'] + .125 * a['slopeRight'] - .125 * b['slopeLeft']
            scaled = .5 * a['value'] + .5 * b['value'] + .125 * (b['frame'] - a['frame']) * (a['slopeRight'] - b['slopeLeft'])
            self.assertAlmostEqual(value, unscaled, delta=.00001)
            self.assertGreater(abs(value - scaled), .001)

    def test_controlled_key_intervals_confirm_tangents_are_not_multiplied_by_interval(self):
        parameter, _ = self.strobe()
        for end in (.5, 1):
            # Native scalar evaluator uses first stored tangent on the earlier
            # key and second stored tangent on the later key in this branch.
            curve = struct.pack('<I4fI4f', 2, 2, 0, 0, 0, 2, 0, -1, 1, end)
            values = self.alpha(self.reference.run(parameter, probe={'alphaCurve': curve})['chain'])
            # Midpoint output is1/2 + (2 - -1)/8 for both key intervals.
            self.assertAlmostEqual(values[1 if end == .5 else 2], .875, delta=.00001)
            opposite = struct.pack('<I4fI4f', 2, 0, 2, 0, 0, 2, -1, 0, 1, end)
            controls = self.alpha(self.reference.run(parameter, probe={'alphaCurve': opposite})['chain'])
            self.assertAlmostEqual(controls[1 if end == .5 else 2], .5, delta=.00001)

    def test_missing_or_malformed_curve_payload_is_rejected(self):
        parameter, _ = self.strobe()
        for probe in ({}, {'alphaCurve': b'x'}, {'alphaCurve': bytes(4100)}):
            with self.assertRaises(ValueError):
                self.reference.run(parameter, probe=probe)


if __name__ == '__main__':
    unittest.main()
