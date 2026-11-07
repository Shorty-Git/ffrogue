"""Source evidence gates for separate native-alpha research candidates."""
import copy
import json
from pathlib import Path
import unittest

try:
    from prepare_scalar_alpha_plan import prepare, ParticleAssignmentReference
except ModuleNotFoundError as error:
    if error.name != 'unicorn':
        raise
    ParticleAssignmentReference = None

APK = Path('tools/data/memorial-audit/installed-base-v208.apk')
PLAN = Path('tools/data/shared-skill-review/climhazzard/plan-native-x.json')
ORIGINALS = PLAN.parent / 'originals'


@unittest.skipUnless(ParticleAssignmentReference and APK.exists() and PLAN.exists(), 'Pinned local APK and research plan required')
class AlphaPlanTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.reference = ParticleAssignmentReference(APK)
        cls.plan = json.loads(PLAN.read_text(encoding='utf-8'))

    def test_separate_candidate_keeps_original_and_nonparticle_nodes_unchanged(self):
        before = copy.deepcopy(self.plan)
        candidate, count = prepare(self.reference, self.plan, ORIGINALS)
        self.assertEqual(self.plan, before)
        self.assertEqual(count, 5)
        self.assertTrue(candidate['nativeScalarAlpha'])
        self.assertFalse(candidate['approved'])
        for effect in candidate['effects']:
            self.assertTrue(all('nativeScalarAlpha' not in n for n in effect['nodes'] if n['typeId'] != 3))

    def test_modified_source_keys_or_effect_hash_reject(self):
        for mutation in ('keys', 'hash'):
            plan = copy.deepcopy(self.plan)
            if mutation == 'hash':
                plan['effects'][0]['sha256'] = 'changed'
            else:
                node = next(n for e in plan['effects'] for n in e['nodes'] if n['typeId'] == 3)
                node['alphaCurve']['keys'][0]['value'] += .1
            with self.assertRaises(ValueError):
                prepare(self.reference, plan, ORIGINALS)

    def test_published_or_non_source_appearance_plans_reject(self):
        for field, value in [('approved', True), ('sourceAppearance', False)]:
            plan = copy.deepcopy(self.plan); plan[field] = value
            with self.assertRaises(ValueError):
                prepare(self.reference, plan, ORIGINALS)


if __name__ == '__main__':
    unittest.main()
