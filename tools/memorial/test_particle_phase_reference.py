"""Original callback/PostUpdate checks with explicitly neutral parent helpers."""
from pathlib import Path
import struct
import unittest

try:
    from emulate_particle_scheduler import ParticleSchedulerReference, SEED
except ModuleNotFoundError as error:
    if error.name != 'unicorn':
        raise
    ParticleSchedulerReference = None
from test_particle_scheduler_reference import next_rng

APK = Path('tools/data/memorial-audit/installed-base-v208.apk')


def advance(state, count):
    for _ in range(count):
        state = next_rng(state)
    return list(state)


@unittest.skipUnless(ParticleSchedulerReference and APK.exists(), 'Optional Unicorn and pinned APK required')
class ParticlePhaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.reference = ParticleSchedulerReference(APK)

    def run_phase(self, **kwargs):
        return self.reference.run(phase_mode='initialized', **kwargs)

    def test_postupdate_persists_delay_while_update_only_reads_it(self):
        result = self.run_phase(start=2, steps=[1, 1, 1])
        rows = result['updates']
        self.assertEqual([r['afterUpdate']['delayTicks'] for r in rows], [-20000, -10000, 0])
        self.assertEqual([r['delayTicks'] for r in rows], [-10000, 0, 0])
        self.assertEqual(result['requests'], [{'step': 2, 'offset': 0, 'count': 1}])
        self.assertEqual(rows[-1]['particles'][0]['ageTicks'], 10000)

    def test_initial_negative_age_and_same_step_catchup(self):
        result = self.run_phase(interval=.5, steps=[1])['updates'][0]
        self.assertEqual([p['ageTicks'] for p in result['afterUpdate']['particles']], [0, -5000])
        self.assertEqual([p['ageTicks'] for p in result['particles']], [10000, 5000])
        self.assertEqual(result['restoredDelta'], 1)

    def test_delay_crossing_uses_only_active_remainder(self):
        result = self.run_phase(start=2, steps=[2.5])['updates'][0]
        self.assertEqual(result['delayTicks'], 5000)
        self.assertEqual(result['particles'][0]['ageTicks'], 5000)
        self.assertEqual(result['restoredDelta'], 2.5)

    def test_callback_lifetime_jitter_uses_emitter_rng_and_clamps_nonpositive_to_one(self):
        for life, spread in [(0, 0), (1, 0), (2, 5), (8, 3)]:
            result = self.run_phase(duration=1, life=life, life_range=spread, count=3, steps=[1])
            # Activation then one per-callback draw; each particle consumes a
            # lifetime word even at zero range. Reaching the finite emission
            # limit exits before sampling a restart delay.
            expected = []
            for index in range(3):
                word = advance(SEED, 3 + index)[-1]
                value = life - spread + (word % (2 * spread) if spread else 0)
                expected.append(max(1, value) * 10000)
            self.assertEqual([p['lifeTicks'] for p in result['updates'][0]['particles']], expected)
            self.assertEqual(result['updates'][0]['rng'], advance(SEED, 5))

    def test_constx_initializer_receives_the_same_rng_then_update_preserves_record(self):
        result = self.run_phase(duration=1, count=2, steps=[1, 1],
                                scale_module='ConstX', scale_value=10, scale_range=4)
        calls = result['moduleCalls']; inits = [c for c in calls if c['stage'] == 'init']
        self.assertEqual([c['emitterRng'] for c in inits], [advance(SEED, 3), advance(SEED, 5)])
        expected = []
        for count in (4, 6):
            word = advance(SEED, count)[-1]
            uniform = struct.unpack('<f', struct.pack('<I', 0x3f800000 | (word >> 9)))[0] - 1
            expected.append(6 + 8 * uniform)
        for actual, value in zip(result['updates'][0]['particles'], expected):
            self.assertAlmostEqual(actual['moduleRecord'][0], value, delta=.00001)
        self.assertEqual([p['moduleRecord'] for p in result['updates'][0]['particles']],
                         [p['moduleRecord'] for p in result['updates'][1]['particles']])
        self.assertEqual(result['updates'][1]['rng'], advance(SEED, 6))
        self.assertTrue(all(c['delta'] == 1 for c in calls if c['stage'] == 'update'))

    def test_expiration_waits_until_after_lifetime_boundary(self):
        result = self.run_phase(duration=1, life=1, steps=[1, 1])
        self.assertEqual([r['expired'] for r in result['updates']], [False, True])

    def test_existing_source_delayed_nodes_now_execute_and_constx_modules_are_source_selected(self):
        root = Path('tools/data/shared-skill-review')
        files = [p for folder in ('brave-slash-composed', 'blade-beam', 'climhazzard')
                 for p in (root / folder / 'originals').glob('*.bmb')]
        if len(files) != 8:
            self.skipTest('Existing eight-effect corpus required')
        cases = [c for path in files for c in self.reference.source_cases(path, 'initialized')]
        self.assertEqual(len(cases), 13)
        delayed = [c for c in cases if c['inputs']['start'] == 2]
        self.assertEqual(len(delayed), 2)
        for case in delayed:
            self.assertEqual(case['result']['requests'][0]['step'], 2)
        self.assertTrue(any(c['result']['moduleCalls'] for c in cases))

    def test_unknown_modes_and_modules_are_rejected(self):
        for kwargs in [dict(phase_mode='automatic'), dict(scale_module='VelocityX'),
                       dict(scale_module='ConstX'), dict(phase_mode='initialized', capacity=129)]:
            with self.assertRaises(ValueError):
                self.reference.run(**kwargs)


if __name__ == '__main__':
    unittest.main()
