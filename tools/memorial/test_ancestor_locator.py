import unittest
from audit_ancestor_locator import direct_prefix


class AncestorPrefixTests(unittest.TestCase):
    def fixture(self):
        node = {'computed': {'offset': 1, 'fingerprintVerified': True},
                'modules': [{'offset': 2, 'fingerprintVerified': True}, {'offset': 3, 'fingerprintVerified': True}]}
        calls = [{'offset': i, 'computed': i == 1, 'fingerprintVerified': True,
                  'symbol': 'transform_locator' if i == 3 else 'other'} for i in (1, 2, 3)]
        return node, calls

    def test_descendant_tail_is_excluded_without_relabeling(self):
        node, calls = self.fixture()
        calls.append({'offset': 999, 'computed': False})
        result = direct_prefix(node, calls)
        self.assertTrue(result['complete'])
        self.assertEqual(len(result['calls']), 3)
        self.assertEqual(result['excludedTailCalls'], 1)

    def test_foreign_or_reordered_prefix_fails(self):
        node, calls = self.fixture()
        calls[1]['offset'] = 999
        with self.assertRaisesRegex(ValueError, 'Unexpected callback'):
            direct_prefix(node, calls)

    def test_empty_and_partial_samples_never_become_complete(self):
        node, calls = self.fixture()
        self.assertFalse(direct_prefix(node, [])['complete'])
        self.assertFalse(direct_prefix(node, calls[:2])['complete'])


if __name__ == '__main__':
    unittest.main()
