"""Provenance and exact-join guards for captured native context evidence."""
import hashlib
import json
import struct
from pathlib import Path
import tempfile
import unittest
from audit_pipeline_context import audit
from prepare_diagnostic import EXPECTED_NATIVE
from prepare_diagnostic import reviewed_pipeline_hook


class PipelineContextTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / 'fx.bmb'
        self.source.write_bytes(b'local-source-fixture')
        sha = hashlib.sha256(self.source.read_bytes()).hexdigest()
        self.spec = dict(nodes=[dict(file='fx', node=3, sourceSha256=sha)],
                         modules=[dict(offset=100, name='ConstX', recordBytes=4)])
        before = dict(record='0x200', recordOffset=0, cursor=0, recordHex='0000803f', recordFloats=[1])
        after = dict(before, cursor=4)
        self.rows = [dict(type='boot', nativeSha256=EXPECTED_NATIVE, observerRevision=20, seq=0, ms=0),
                     dict(type='calibration-pass', object='0x1234', values=[1.25, -2.5, 3.75], seq=1, ms=1),
                     dict(type='armed', token='test', pipelineCapture=True, windowMs=100, seq=2, ms=2),
                     dict(type='pipeline-sample', sampleId=1, file='fx', node=3, stage='make', sourceSha256=sha,
                          callbacks=[dict(offset=100, verified=True)], seq=3, ms=3),
                     dict(type='pipeline-module', sampleId=1, file='fx', node=3, stage='make', offset=100,
                          symbol='ConstX', fingerprintVerified=True, before=before, after=after, seq=4, ms=4),
                     dict(type='pipeline-sample-end', sampleId=1, stage='make', seq=5, ms=5),
                     dict(type='pipeline-draw-context', file='fx', wrapper='w', drawId=7, seq=6, ms=6),
                     dict(type='pipeline-gpu-draw', file='fx', wrapper='w', drawId=8, seq=7, ms=7)]

    def run_audit(self):
        log = self.root / 'log.txt'
        log.write_text('\n'.join(json.dumps(r) for r in self.rows))
        return audit(log, 'test', self.spec, [self.source], getattr(self, 'reference', None))

    def velocity_fixture(self):
        raw = bytearray(1840)
        for at, value in zip((0x30c, 0x318, 0x324, 0x330), (30, 0, -2, 0)):
            struct.pack_into('<f', raw, at, value)
        self.source.write_bytes(raw)
        sha = hashlib.sha256(raw).hexdigest()
        self.spec = dict(nodes=[dict(file='fx', node=3, nodeOffset=0, sourceSha256=sha)],
                         modules=[dict(offset=100, name='InitVelocityX', recordBytes=8),
                                  dict(offset=200, name='update9VelocityX', recordBytes=8)])
        def snap(values, cursor, rng):
            return dict(record='0x200', recordOffset=0, cursor=cursor,
                        recordHex=struct.pack('<2f', *values).hex(), recordFloats=values,
                        rngPointer='0x230', rngWords=rng)
        init_before = snap([0, 0], 0, [1, 2, 3, 4])
        init_after = snap([30, -2], 8, [2, 3, 4, 5])
        update_before = dict(snap([30, -2], 0, [2, 3, 4, 5]), delta40=.5)
        update_after = dict(snap([29, -2], 8, [2, 3, 4, 5]), scaleE8=[29, 29, 29])
        self.rows = self.rows[:3]
        for sid, stage, offset, name, before, after in (
                (1, 'init', 100, 'InitVelocityX', init_before, init_after),
                (2, 'update', 200, 'update9VelocityX', update_before, update_after)):
            seq = len(self.rows)
            self.rows.extend([
                dict(type='pipeline-sample', sampleId=sid, file='fx', node=3, stage=stage,
                     emitter='0x100', sourceSha256=sha, callbacks=[dict(offset=offset, verified=True)], seq=seq, ms=seq),
                dict(type='pipeline-module', sampleId=sid, file='fx', node=3, stage=stage,
                     offset=offset, symbol=name, fingerprintVerified=True, before=before, after=after,
                     rngMatchesEmitter=True, seq=seq + 1, ms=seq + 1),
                dict(type='pipeline-sample-end', sampleId=sid, stage=stage, seq=seq + 2, ms=seq + 2)])
        class GuardReference:
            def run(self, *args, **kwargs):
                # Test the evidence join/validation guards, not native arithmetic.
                return dict(initialRecord=[30, -2], rngAfter=[2, 3, 4, 5],
                            updates=[dict(record=[29, -2], scale=[29, 29, 29])])
        self.reference = GuardReference()

    def test_disjoint_update_prefix_is_reported_without_claiming_a_replay(self):
        self.velocity_fixture()
        self.assertTrue(self.run_audit()['velocityTrajectories'][0]['steps'][0]['recordMatches'])
        changed = self.rows[7]['before']
        changed.update(recordHex=struct.pack('<2f', 28, -2).hex(), recordFloats=[28, -2])
        trajectory = self.run_audit()['velocityTrajectories'][0]
        self.assertFalse(trajectory['contiguous'])
        self.assertNotIn('steps', trajectory)

    def test_a_contiguous_prefix_with_wrong_native_output_is_rejected(self):
        self.velocity_fixture()
        self.rows[7]['after']['scaleE8'] = [999, 999, 999]
        with self.assertRaisesRegex(ValueError, 'trajectory disagrees'):
            self.run_audit()

    def test_nearby_gpu_timestamp_never_substitutes_for_exact_draw_identity(self):
        self.assertEqual(self.run_audit()['gpu'][0]['exactContextMatches'], 0)
        self.rows[-1]['drawId'] = 7
        result = self.run_audit()
        self.assertEqual(result['gpu'][0]['exactContextMatches'], 1)
        self.assertFalse(result['approved'])

    def test_descendant_or_reused_sample_cannot_change_node_identity(self):
        self.rows[4]['node'] = 34
        with self.assertRaisesRegex(ValueError, 'identity/scope'):
            self.run_audit()

    def test_failed_or_foreign_boot_cannot_supply_calibration(self):
        self.rows[1]['type'] = 'calibration-failed'
        with self.assertRaisesRegex(ValueError, 'calibration'):
            self.run_audit()

    def test_changed_source_or_record_span_is_rejected(self):
        self.rows[4]['after'] = dict(self.rows[4]['after'], cursor=8)
        with self.assertRaisesRegex(ValueError, 'cursor'):
            self.run_audit()
        self.rows[4]['after']['cursor'] = 4
        self.source.write_bytes(b'changed-source')
        with self.assertRaisesRegex(ValueError, 'Source identity'):
            self.run_audit()

    def test_revision21_requires_the_observed_implementation_identity(self):
        self.rows[0]['observerRevision'] = 21
        with self.assertRaisesRegex(ValueError, 'implementation identity'):
            self.run_audit()
        self.rows[4].update(hookOffset=100, hookSymbol='ConstX', hookFingerprintVerified=True)
        self.assertEqual(self.run_audit()['modules'], 1)
        self.rows[4]['hookOffset'] = 999
        with self.assertRaisesRegex(ValueError, 'implementation identity'):
            self.run_audit()

    def test_native_submit_cannot_claim_a_gpu_call_outside_its_exact_scope(self):
        self.rows[0]['observerRevision'] = 23
        self.rows[2]['pipelineNativeSubmit'] = True
        self.rows[4].update(hookOffset=100, hookSymbol='ConstX', hookFingerprintVerified=True)
        self.spec['submissions'] = [dict(offset=300, kind='auto-index')]
        start = dict(type='pipeline-native-submit-enter', nativeSubmitId=1, file='fx', wrapper='w', drawId=8,
                     kind='auto-index', offset=300, fingerprintVerified=True, inputs=dict(vertexCount7C=6), seq=8, ms=8)
        end = dict(start, type='pipeline-native-submit', seq=10, ms=10)
        self.rows.extend([start, end])
        result = self.run_audit()['nativeSubmissions'][0]
        self.assertEqual(result['observedGpuCalls'], [])
        self.assertFalse(result['nativeReturnProvesGpuExecution'])
        gpu = self.rows.pop(7)
        gpu.update(seq=9, ms=9)
        self.rows.insert(-1, gpu)
        self.assertEqual(len(self.run_audit()['nativeSubmissions'][0]['observedGpuCalls']), 1)
        end['wrapper'] = 'unrelated'
        with self.assertRaisesRegex(ValueError, 'submission identity'):
            self.run_audit()


@unittest.skipUnless(Path('tools/data/memorial-audit/installed-base-v208.apk').exists(), 'Pinned APK required')
class DelegateReferenceTests(unittest.TestCase):
    def test_pinned_branch_plt_and_relocation_resolve_only_the_reviewed_delegate(self):
        from native_particle_dispatch import ParticleDispatch
        dispatch = ParticleDispatch(Path('tools/data/memorial-audit/installed-base-v208.apk'))
        selected = dispatch.select('scaleUpdate', 16)['target']
        hook = reviewed_pipeline_hook(dispatch, selected)
        self.assertEqual(hook['offset'], 0x1fc7a30)
        self.assertEqual(hook['via']['got'], 0x2dd9d20)
        self.assertEqual(hook['bytes'], 36)
        self.assertEqual(len(hook['sha256']), 64)
        velocity = reviewed_pipeline_hook(dispatch, dispatch.select('scaleUpdate', 17)['target'])
        self.assertEqual(velocity['offset'], 0x1fc7a58)
        self.assertEqual(velocity['via']['got'], 0x2df4b58)
        self.assertEqual(velocity['bytes'], 68)
        self.assertIsNone(reviewed_pipeline_hook(dispatch, dispatch.select('scale', 16)['target']))
        with self.assertRaisesRegex(ValueError, 'instruction changed'):
            reviewed_pipeline_hook(dispatch, dict(selected, sha256='unreviewed'))


if __name__ == '__main__':
    unittest.main()
