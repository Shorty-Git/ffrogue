"""Source Null initialization, dynamic locator output and Quad handoff checks."""
import math
from pathlib import Path
import unittest

try:
    from emulate_null_assignment import NullAssignmentReference
    from emulate_quad_assignment import QuadAssignmentReference
except ModuleNotFoundError as error:
    if error.name != 'unicorn':
        raise
    NullAssignmentReference = None

from inspect_bmb import read_bmb

APK=Path('tools/data/memorial-audit/installed-base-v208.apk')
SOURCE=Path('tools/data/shared-skill-review/brave-slash-composed/originals/atk_slash1_white.bmb')


@unittest.skipUnless(NullAssignmentReference and APK.exists() and SOURCE.exists(), 'Pinned APK, source and optional Unicorn required')
class NullAssignmentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ref=NullAssignmentReference(APK,auxiliary_flag=0)
        cls.raw=SOURCE.read_bytes()
        cls.nodes={n['index']:n for n in read_bmb(cls.raw)['nodes']}
        cls.cases=cls.ref.source_cases(SOURCE,probe=True)

    def run_node(self,index,**extra):
        n=self.nodes[index]
        return self.ref.run(self.raw[n['offset']:n['offset']+n['bytes']],dict(alphaCurve=b'',**extra))

    def test_all_four_complete_init_update_arrays_and_locator_outputs_execute(self):
        self.assertEqual([c['node'] for c in self.cases],[0,1,5,7])
        for c,work in zip(self.cases,[24,40,24,36]):
            result=c['result'];chain=result['chain']
            self.assertEqual(chain['status'],'executed')
            self.assertEqual(chain['consumedBytes'],work)
            self.assertEqual(chain['unconsumedWorkBytes'],0)
            self.assertEqual(result['auxiliaryModules'],[])
            executed={h['address'] for h in result['executedHelpers']}
            self.assertTrue(all(m['address'] in executed for p in ('init','update') for m in result['phases'][p]))
            self.assertTrue(all(u['cursor']==work for u in chain['updates']))

    def test_source_random_rotation_and_uniform_scale_are_native_not_fit_values(self):
        a=self.run_node(1)['chain'];b=self.run_node(1,rng=[1,2,3,4])['chain']
        self.assertNotEqual(a['updates'][0]['nativeLocator']['basis'],b['updates'][0]['nativeLocator']['basis'])
        self.assertNotEqual(a['rngAfterInit'],b['rngAfterInit'])
        for chain in (a,b):
            first=chain['updates'][0]['nativeLocator']
            self.assertTrue(all(u['nativeLocator']==first for u in chain['updates']))
            for column in range(3):
                norm=math.sqrt(sum(v*v for v in first['basis'][column*3:column*3+3]))
                self.assertAlmostEqual(norm,1.5,places=5)

    def test_source_moving_parent_advances_with_its_initialized_random_velocity(self):
        a=self.run_node(7)['chain'];b=self.run_node(7,rng=[1,2,3,4])['chain']
        points=[u['nativeTranslation'] for u in a['updates']]
        self.assertNotEqual(points[0],points[-1])
        self.assertNotEqual(points[0],b['updates'][0]['nativeTranslation'])
        delta=[y-x for x,y in zip(points[0],points[1])]
        for before,after in zip(points[1:],points[2:]):
            for change,x,y in zip(delta,before,after):
                self.assertAlmostEqual(y-x,change,places=5)

    def test_source_parent_chain_supplies_quad_basis_and_motion(self):
        parent=self.run_node(1,updateParent=dict(origin=[17,-9,3],basis=[1,0,0,0,1,0,0,0,1]))['chain']['updates'][0]
        locator=parent['nativeLocator']
        child=self.run_node(5,updateParent=dict(origin=parent['nativeTranslation'],basis=locator['basis']),
                            inheritedScale=locator['scale'])['chain']['updates'][0]
        for actual,expected in zip(child['nativeLocator']['basis'],locator['basis']):
            self.assertAlmostEqual(actual,expected,places=5)
        quad=QuadAssignmentReference(APK)
        host=dict(center=child['nativeTranslation'],parentBasis=child['nativeLocator']['basis'],
                  groupScale=child['nativeLocator']['scale'],textureTint=[1]*4,textureTint2=[1]*4,placementFromUpdate=True)
        cases=quad.source_geometry_cases(SOURCE,host)
        # Quad6 is source child of Null5; no hand-fitted screen transform.
        rows=next(c for c in cases if c['node']==6)['result']['chain']['updates']
        for index,row in enumerate(rows):
            local_x=-40+10*(index+1)
            expected=[parent['nativeTranslation'][axis]+locator['basis'][axis]*local_x for axis in range(3)]
            for actual,wanted in zip(row['vertices']['center'],expected):
                self.assertAlmostEqual(actual,wanted,places=4)

    def test_fourth_array_is_preserved_and_blocks_incomplete_chain_execution(self):
        ref=NullAssignmentReference(APK,auxiliary_flag=1)
        cases=ref.source_cases(SOURCE,probe=True)
        self.assertEqual([c['result']['moduleCounts'][3] for c in cases],[3,4,3,3])
        for c in cases:
            result=c['result']
            self.assertEqual(len(result['auxiliaryModules']),result['moduleCounts'][3])
            self.assertEqual(result['chain']['status'],'blocked')

    def test_same_source_and_rng_reproduce_native_parent_records(self):
        self.assertEqual(self.cases,self.ref.source_cases(SOURCE,probe=True))

    def test_unknown_auxiliary_flag_and_wrong_node_layout_are_rejected(self):
        for flag in (None,True,-1,2):
            with self.assertRaisesRegex(ValueError,'flag 0 or 1'):
                NullAssignmentReference(APK,auxiliary_flag=flag)
        with self.assertRaisesRegex(ValueError,'type-0'):
            self.ref.run(bytes(704))


if __name__=='__main__':
    unittest.main()
