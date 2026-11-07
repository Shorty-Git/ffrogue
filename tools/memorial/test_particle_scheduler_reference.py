"""Controlled request scheduling against the pinned original ARM64 functions."""
from pathlib import Path
import math
import unittest

try:
    from emulate_particle_scheduler import ParticleSchedulerReference, SEED
except ModuleNotFoundError as error:
    if error.name != 'unicorn':
        raise
    ParticleSchedulerReference = None

APK = Path('tools/data/memorial-audit/installed-base-v208.apk')


def next_rng(state):
    a, b, c, d = state
    t = (a ^ (a << 11)) & 0xffffffff
    return [b, c, d, (d ^ (d >> 19) ^ t ^ (t >> 8)) & 0xffffffff]


@unittest.skipUnless(ParticleSchedulerReference and APK.exists(), 'Optional Unicorn and pinned APK required')
class SchedulerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.reference = ParticleSchedulerReference(APK)

    def test_activation_uses_symmetric_exclusive_modulo_and_consumes_zero_range_rng(self):
        for seed in [SEED, (1, 2, 3, 4), (5, 20, 300, 4000)]:
            for start, spread in [(0, 0), (2, 0), (2, 5), (10, 3)]:
                out = self.reference.run(start=start, start_range=spread, steps=[], rng=seed)['initial']
                after = next_rng(seed)
                jitter = after[-1] % (2 * spread) if spread else 0
                expected = max(0, start - spread + jitter)
                self.assertEqual(out['delayTicks'], -expected * 10000)
                self.assertEqual(out['rng'], after)

    def test_fractional_interval_and_ceil_limit(self):
        for interval in [.5, 1, 1.5, 2, 3]:
            result = self.reference.run(count=3, duration=4, interval=interval, steps=[5])
            self.assertEqual(result['initial']['intervalTicks'], int(interval * 10000))
            self.assertEqual(result['initial']['limit'], math.ceil(4 / interval) * 3)
            expected = [i * interval for i in range(math.ceil(4 / interval))]
            self.assertEqual([r['offset'] for r in result['requests']], expected)
            self.assertTrue(all(r['count'] == 3 for r in result['requests']))

    def test_update_partition_preserves_absolute_requests_and_restores_context_delta(self):
        sequences = [[5], [1] * 5, [.5] * 10, [.25] * 20]
        for steps in sequences:
            result = self.reference.run(interval=.5, steps=steps)
            absolute = [sum(steps[:r['step']]) + r['offset'] for r in result['requests']]
            self.assertEqual(absolute, [i * .5 for i in range(8)])
            for update in result['updates']:
                self.assertEqual(update['delta'], update['restoredDelta'])

    def test_birth_at_end_boundary_waits_for_next_positive_update(self):
        result = self.reference.run(steps=[1, 0, 1])
        self.assertEqual(result['requests'], [{'step': 0, 'offset': 0, 'count': 1},
                                               {'step': 2, 'offset': 0, 'count': 1}])

    def test_zero_delta_does_not_emit(self):
        self.assertEqual(self.reference.run(steps=[0, 0])['requests'], [])

    def test_subtick_deltas_are_truncated_per_update_not_accumulated_as_float_time(self):
        split = self.reference.run(steps=[.00005] * 200)
        joined = self.reference.run(steps=[.01])
        self.assertEqual(split['requests'], [])
        self.assertEqual(len(joined['requests']), 1)

    def test_disabled_and_suspended_generators(self):
        disabled = self.reference.run(enabled=False)
        self.assertEqual(disabled['initial']['rng'], list(SEED))
        self.assertEqual(disabled['requests'], [])
        suspended = self.reference.run(suspended=True)
        self.assertEqual(suspended['requests'], [])
        self.assertEqual(suspended['initial']['rng'], next_rng(SEED))

    def test_duration_restart_is_not_treated_as_particle_lifetime(self):
        result = self.reference.run(duration=2, repeats=2, restart=1, steps=[8])
        self.assertEqual(result['initial']['limit'], 4)
        self.assertEqual([r['offset'] for r in result['requests']], [0, 1, 3, 4])

    def test_raw_particle_sources_do_not_require_authoring(self):
        root = Path('tools/data/shared-skill-review')
        files = [path for folder in ('brave-slash-composed', 'blade-beam', 'climhazzard')
                 for path in (root / folder / 'originals').glob('*.bmb')]
        if len(files) != 8:
            self.skipTest('Existing eight-effect corpus required')
        cases = [c for path in files for c in self.reference.source_cases(path)]
        self.assertEqual(len(cases), 13)
        self.assertEqual(sum(c['inputs']['start'] > 0 for c in cases), 2)
        aerial = next(c for c in cases if c['source'] == 'atk_aerialslash_001_green.bmb')
        self.assertEqual(len(aerial['result']['requests']), 50)
        self.assertEqual(aerial['result']['requests'][-1], {'step': 24, 'offset': .5, 'count': 1})
        self.assertTrue(any(c['source'] == 'atk_powergeyser_001_purple.bmb' for c in cases))

    def test_unsupported_phases_and_invalid_fixtures_fail(self):
        for kwargs in [dict(start=2), dict(count=0), dict(duration=0), dict(repeats=0),
                       dict(interval=0), dict(interval=float('nan')), dict(steps=[-1]),
                       dict(rng=[0] * 4), dict(steps=[1] * 257)]:
            with self.assertRaises(ValueError):
                self.reference.run(**kwargs)


if __name__ == '__main__':
    unittest.main()
