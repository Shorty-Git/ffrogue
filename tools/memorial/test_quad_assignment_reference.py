"""Check complete native Quad init/update lists for the mapped combat source."""
from pathlib import Path
import copy
import struct
import unittest

try:
    from emulate_quad_assignment import QuadAssignmentReference
except ModuleNotFoundError as error:
    if error.name != 'unicorn':
        raise
    QuadAssignmentReference = None

from inspect_bmb import read_bmb

APK = Path('tools/data/memorial-audit/installed-base-v208.apk')
SOURCE = Path('tools/data/shared-skill-review/brave-slash-composed/originals/atk_slash1_white.bmb')


@unittest.skipUnless(QuadAssignmentReference and APK.exists() and SOURCE.exists(),
                     'Optional Unicorn, pinned APK and mapped source required')
class QuadAssignmentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.reference = QuadAssignmentReference(APK)
        cls.raw = SOURCE.read_bytes()
        cls.nodes = {n['index']: n for n in read_bmb(cls.raw)['nodes']}
        cls.cases = cls.reference.source_cases(SOURCE, probe=True)
        cls.host = dict(center=[0, 0, 0], groupScale=[1, 1, 1],
                        parentBasis=[1,0,0,0,1,0,0,0,1],
                        textureTint=[1,1,1,1], textureTint2=[1,1,1,1])
        cls.geometry = cls.reference.source_geometry_cases(SOURCE, cls.host)

    def block(self, index):
        node = self.nodes[index]
        return bytearray(self.raw[node['offset']:node['offset'] + node['bytes']])

    def probe(self, index):
        curve = self.nodes[index]['alphaCurve']
        return {'alphaCurve': self.raw[curve['dataOffset']:curve['dataOffset'] + len(curve['keys']) * 20]}

    def test_all_four_quads_use_quad_wrappers_and_matching_native_profile(self):
        self.assertEqual([c['node'] for c in self.cases], [2, 3, 4, 6])
        self.assertEqual([c['result']['workBytes'] for c in self.cases], [84, 84, 96, 108])
        for case in self.cases:
            result = case['result']
            self.assertEqual(result['moduleCounts'][:3],
                             [len(result['phases'][p]) for p in ('init', 'update', 'make')])
            self.assertTrue(any('param4Quad' in m['symbols'][0] for m in result['phases']['init']))
            self.assertFalse(any('param8Particle' in m['symbols'][0]
                                 for p in result['phases'].values() for m in p))

    def test_full_init_update_lists_execute_without_record_overrun(self):
        for case, consumed in zip(self.cases, [52, 52, 64, 76]):
            chain = case['result']['chain']
            self.assertEqual(chain['status'], 'executed')
            self.assertEqual(chain['consumedBytes'], consumed)
            self.assertEqual(chain['unconsumedWorkBytes'], 32)
            self.assertEqual(chain['initCursors'][-1], consumed)
            self.assertTrue(all(u['cursor'] == consumed for u in chain['updates']))

    def test_source_scale_mutation_reaches_original_record_not_a_fixed_fixture(self):
        block = self.block(4)
        baseline = self.reference.run(block, self.probe(4))['chain']
        # The original Quad InitVelocity wrapper selects +0x36c as scale value.
        old = struct.unpack_from('<f', block, 0x36c)[0]
        struct.pack_into('<f', block, 0x36c, old + 3)
        changed = self.reference.run(block, self.probe(4))['chain']
        a, b = (bytes.fromhex(c['initialRecordHex']) for c in (baseline, changed))
        self.assertAlmostEqual(struct.unpack_from('<f', b)[0] - struct.unpack_from('<f', a)[0], 3)
        self.assertNotEqual(baseline['updates'][0]['recordHex'], changed['updates'][0]['recordHex'])

    def test_repeated_native_source_execution_is_deterministic(self):
        self.assertEqual(self.cases, self.reference.source_cases(SOURCE, probe=True))

    def test_particle_blocks_are_rejected_instead_of_reinterpreted(self):
        block = self.block(2)
        struct.pack_into('<I', block, 0, 3)
        with self.assertRaisesRegex(ValueError, 'type-2'):
            self.reference.run(block)

    def test_incomplete_vertex_host_fails_instead_of_using_implicit_parent(self):
        probe = self.probe(2)
        probe['vertexHost'] = {'center': [0, 0, 0], 'groupScale': [1, 1, 1]}
        with self.assertRaisesRegex(ValueError, 'explicit finite parentBasis'):
            self.reference.run(self.block(2), probe)

    def test_all_make_lists_execute_and_original_quad_writers_pack_six_vertices(self):
        self.assertEqual([c['node'] for c in self.geometry], [2,3,4,6])
        for case, writer, stride in zip(self.geometry, ['0x2005180'] * 3 + ['0x2005500'], [40,40,40,64]):
            result = case['result']; chain = result['chain']
            executed = {m['address'] for m in result['executedHelpers']}
            self.assertTrue(all(m['address'] in executed for m in result['phases']['make']))
            self.assertEqual(result['externalMathCalls'], ['0x111b040', '0x11338f0'] * 15)
            for update in chain['updates']:
                output = update['vertices']
                self.assertEqual(output['writer'], writer)
                self.assertEqual(output['stride'], stride)
                self.assertEqual(output['makeCursor'], chain['consumedBytes'])
                self.assertEqual(len(output['data']), 6)
            self.assertEqual(chain['updates'][-1]['vertices']['data'][0]['rgba'][3], 0)

    def test_source_second_layer_uv_scale_survives_packing(self):
        data = self.geometry[-1]['result']['chain']['updates'][0]['vertices']['data']
        self.assertEqual(data[0]['uv'], [0,0])
        self.assertEqual(data[2]['uv'], [1,1])
        self.assertAlmostEqual(data[0]['uv2'][0], -3/14, places=6)
        self.assertAlmostEqual(data[2]['uv2'][0], 17/14, places=6)
        self.assertTrue(all(v['textureTint2'] == [1,1,1,1] for v in data))

    def test_explicit_center_and_parent_basis_control_output_without_color_changes(self):
        host = copy.deepcopy(self.host)
        host['center'] = [17, -9, 3]
        host['parentBasis'] = [0,1,0,-1,0,0,0,0,1]
        changed = self.reference.source_geometry_cases(SOURCE, host)
        for before, after in zip(self.geometry, changed):
            a = before['result']['chain']['updates'][0]['vertices']['data']
            b = after['result']['chain']['updates'][0]['vertices']['data']
            for old, new in zip(a,b):
                x,y,z = old['position']
                self.assertAlmostEqual(new['position'][0], 17-y, places=5)
                self.assertAlmostEqual(new['position'][1], -9+x, places=5)
                self.assertAlmostEqual(new['position'][2], 3+z, places=5)
                self.assertEqual(old['rgba'],new['rgba'])
                self.assertEqual(old['uv'],new['uv'])

    def test_source_color_mutation_reaches_packed_rgba(self):
        block = self.block(3); probe = self.probe(3)
        probe['vertexHost'] = dict(self.host, textureBindings={'texture1': 'controlled-source-name', 'texture2': None})
        original = self.reference.run(block, probe)['chain']['updates'][0]['vertices']['data'][0]
        struct.pack_into('<f', block, 0x68, 0)
        changed = self.reference.run(block, probe)['chain']['updates'][0]['vertices']['data'][0]
        self.assertEqual(changed['rgba'][0], 0)
        self.assertEqual(changed['rgba'][1:], original['rgba'][1:])
        self.assertEqual(changed['position'], original['position'])

    def test_original_material_selector_switches_writer_when_source_operation_changes(self):
        node = self.nodes[6]; block = self.block(6); probe = self.probe(6)
        probe['vertexHost'] = dict(self.host, textureBindings={k:v['name'] if v else None
                                                            for k,v in node['resourceBindings'].items()})
        struct.pack_into('<I', block, 0x730, 0)
        result = self.reference.run(block, probe)['chain']['updates'][0]['vertices']
        self.assertEqual(result['writer'], '0x2005180')
        self.assertEqual(result['stride'], 40)
        self.assertTrue(all('uv2' not in v for v in result['data']))

    def test_native_update_position_is_transferred_through_original_blocks(self):
        host = dict(self.host, center=[17,-9,3], placementFromUpdate=True)
        cases = self.reference.source_geometry_cases(SOURCE, host)
        for case in cases:
            for index,row in enumerate(case['result']['chain']['updates']):
                local_x = -40+10*(index+1) if case['node'] in (4,6) else 0
                expected = [17+local_x,-9,3]
                self.assertEqual(row['nativeTranslation'], expected)
                self.assertEqual(row['vertices']['center'], expected)
                self.assertTrue(row['vertices']['placementFromUpdate'])

    def test_native_velocity_reaches_packed_output_with_rotated_parent(self):
        block = self.block(4); probe = self.probe(4)
        node = self.nodes[4]
        # Actual Quad InitVelocity wrapper reads inline velocity at +0x2f4.
        struct.pack_into('<3f', block, 0x2f4, 3,0,0)
        probe['vertexHost'] = dict(self.host, center=[17,-9,3],
            parentBasis=[0,1,0,-1,0,0,0,0,1], placementFromUpdate=True,
            textureBindings={k:v['name'] if v else None for k,v in node['resourceBindings'].items()})
        rows = self.reference.run(block, probe)['chain']['updates']
        for index,row in enumerate(rows):
            self.assertEqual(row['nativeTranslation'], [17,-49+3*(index+1),3])
            self.assertEqual(row['vertices']['center'], row['nativeTranslation'])
            # Native geometry is centered; its six packed vertices retain the
            # changing center after rotation, including duplicated corners.
            vertices = row['vertices']['data']
            center = [(vertices[0]['position'][axis]+vertices[2]['position'][axis])/2 for axis in range(3)]
            for actual,expected in zip(center,row['nativeTranslation']):
                self.assertAlmostEqual(actual,expected,places=5)

    def test_nonfinite_update_parent_is_rejected_before_module_execution(self):
        probe = self.probe(4)
        probe['updateParent'] = dict(origin=[float('nan'),0,0],basis=[1,0,0,0,1,0,0,0,1])
        with self.assertRaisesRegex(ValueError,'update-parent origin'):
            self.reference.run(self.block(4),probe)


if __name__ == '__main__':
    unittest.main()
