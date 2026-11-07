import json
from pathlib import Path
import tempfile
import unittest
import hashlib
from analyze_particle_memory import reconstruct
from summarize_particle_trace import summarize
from prepare_diagnostic import EXPECTED_NATIVE


class ParticleTraceTests(unittest.TestCase):
    def fixture(self):
        state = dict(type='particle-node-state', ms=20, file='fixture', node=34, object='node',
                     modules=[dict(offset='0x10', fingerprintVerified=True)],
                     vertexEntry=dict(offset='0x20'), bufferWriter=dict(offset='0x30'),
                     rawLiveCount14c=1, fullSourceHashMatches=False)
        call = dict(type='particle-module-call', ms=21, file='fixture', node=34, object='node',
                    sample=1, offset='0x10', fingerprintVerified=True, symbol='fixture-module')
        return [dict(type='boot', ms=0, nativeSha256=EXPECTED_NATIVE, observerRevision=13),
                dict(type='calibration-pass', ms=1, object='0x1234', values=[1.25, -2.5, 3.75]),
                dict(type='armed', ms=10, token='test', windowMs=50, particleNode=True), state, call]

    def report(self, rows):
        with tempfile.TemporaryDirectory() as directory:
            log = Path(directory) / 'trace.txt'
            log.write_text('\n'.join(json.dumps(row) for row in rows), encoding='utf-8')
            return summarize(log, 'test')

    def test_partial_source_identity_and_missing_alpha_stay_explicit(self):
        particle = self.report(self.fixture())['particles'][0]
        self.assertFalse(particle['fullSourceHashMatches'])
        self.assertFalse(particle['alphaValuesCaptured'])
        self.assertFalse(particle['shaderSelectionVerified'])
        self.assertEqual(particle['executedModules'], {'fixture-module': 1})

    def test_foreign_callback_cannot_become_source_node_evidence(self):
        rows = self.fixture()
        rows[-1]['offset'] = '0x99'
        with self.assertRaisesRegex(ValueError, 'does not match'):
            self.report(rows)

    def test_capture_requires_calibration_and_exactly_one_matching_arm(self):
        rows = self.fixture()
        del rows[1]
        with self.assertRaisesRegex(ValueError, 'calibration'):
            self.report(rows)
        rows = self.fixture()
        rows.append(dict(rows[2]))
        with self.assertRaisesRegex(ValueError, 'one matching'):
            self.report(rows)

    def test_later_windows_and_out_of_window_calls_are_excluded(self):
        rows = self.fixture()
        rows.append({**rows[-1], 'ms': 70})
        rows.append(dict(type='armed', ms=80, token='later', windowMs=50, particleNode=True))
        rows.append({**rows[3], 'ms': 81})
        report = self.report(rows)
        self.assertEqual(report['counts']['particle-node-state'], 1)
        self.assertEqual(report['counts']['particle-module-call'], 1)

    def test_memory_reconstruction_rejects_missing_duplicate_and_tampered_chunks(self):
        data = b'01234567'
        header = dict(source='0x1000', bytes=8, chunks=2, sha256=hashlib.sha256(data).hexdigest())
        chunks = [dict(source='0x1000', index=i, hex=data[i*4:i*4+4].hex()) for i in range(2)]
        self.assertEqual(reconstruct(header, list(reversed(chunks))), data)
        for invalid in [chunks[:1], [chunks[0], chunks[0]], [chunks[0], {**chunks[1], 'hex': '00000000'}]]:
            with self.assertRaises(ValueError):
                reconstruct(header, invalid)

    def test_locator_calls_require_selected_scoped_fingerprinted_callbacks(self):
        rows = self.fixture()
        node = dict(type='locator-node', ms=22, file='fixture', node=33, object='ancestor', sample=1,
                    modules=[dict(offset=16, fingerprintVerified=True)],
                    computed=dict(offset=32, fingerprintVerified=True))
        call = dict(type='locator-call', ms=23, file='fixture', node=33, object='ancestor', sample=1,
                    offset=16, fingerprintVerified=True, computed=False,
                    before={'rotationD0': None, 'unreadable': {'rotationD0': 'not initialized'}}, after={})
        rows.extend([node, call])
        report = self.report(rows)
        self.assertEqual(len(report['locatorCalls']), 1)
        self.assertIsNone(report['locatorCalls'][0]['before']['rotationD0'])
        call['offset'] = 32
        with self.assertRaisesRegex(ValueError, 'does not match'):
            self.report(rows)
        call['computed'] = True
        self.assertEqual(len(self.report(rows)['locatorCalls']), 1)
        call['sample'] = 2
        with self.assertRaisesRegex(ValueError, 'selected node sample'):
            self.report(rows)


if __name__ == '__main__':
    unittest.main()
