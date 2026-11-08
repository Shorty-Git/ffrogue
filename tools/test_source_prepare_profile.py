"""The shared import preset must reproduce preserved plans, not alter their visuals."""
import json
import hashlib
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


class SourcePrepareProfileTests(unittest.TestCase):
    def test_caster_rectangle_is_limited_to_self_commands(self):
        from prepare_original_preview import rectangle_for_group
        self.assertEqual(rectangle_for_group(3, 'self'), 'target-unit')
        for scope in ['party', 'single_enemy', 'all_enemies']:
            with self.assertRaisesRegex(ValueError, 'Unsupported source effect rectangle'):
                rectangle_for_group(3, scope)
            for mode, expected in [(1,'target-unit'),(2,'target-side'),(4,'screen')]:
                self.assertEqual(rectangle_for_group(mode, scope), expected)
        with self.assertRaises(ValueError):
            rectangle_for_group(99, 'self')

    def test_preserved_plans_and_missing_authoring_gate(self):
        cases = [
            ('braver', 'cloud_ac', 'tools/characters/cloud_ac.json',
             'tools/data/braver-20261101/source/plan.json'),
            ('armor', 'cloud_of_darkness', 'tools/data/skill-seven-eight-20261028/cod-preview-recipe.json',
             'tools/data/skill-seven-eight-20261028/armor-source/plan.json'),
            ('aura', 'cloud_of_darkness', 'tools/data/skill-seven-eight-20261028/cod-preview-recipe.json',
             'tools/data/skill-seven-eight-20261028/aura-source/plan.json'),
        ]
        base = Path('tools/data/braver-20261101/profile-tests')
        base.mkdir(parents=True, exist_ok=True)
        for name, unit, recipe, reference in cases:
            with self.subTest(name=name):
                expected = json.loads(Path(reference).read_text())
                body = Path(expected['files'][expected['actor']['bodyUrl']]['path']).parent
                args = [sys.executable, 'tools/prepare_original_preview.py', '--source',
                        str(Path(reference).parent / 'skill-source.json'), '--unit', unit,
                        '--unit-assets', str(body), '--recipe', recipe,
                        '--motion', 'magic_atk' if name == 'aura' else 'atk',
                        '--profile', 'source-preview-v1', '--authoring-directory', 'rawdata/assets/battle_effect',
                        '--native-shaders-apk', 'tools/data/memorial-audit/installed-base-v208.apk',
                        '--native-shader-package', 'tools/data/particle-native-audit/bmshaderpack.bin',
                        '--renderer-reference', 'tools/data/memorial-audit/diagnostic-v7/renderer-reference.json',
                        '--output', str(base / (name + '.json'))]
                result = subprocess.run(args, capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)
                actual = json.loads((base / (name + '.json')).read_text())
                self.assertEqual(actual['presentation']['recipeSha256'], hashlib.sha256(Path(recipe).read_bytes()).hexdigest())
                # Body choreography is independently reviewed in current recipes.
                # Changing that review must not require rewriting preserved VFX plans.
                expected['presentation']['recipeSha256'] = actual['presentation']['recipeSha256']
                self.assertEqual(actual, expected)
                if name == 'braver':
                    with tempfile.TemporaryDirectory(dir=base) as missing:
                        blocked = args.copy()
                        blocked[blocked.index('--authoring-directory') + 1] = missing
                        output = Path(missing) / 'must-not-exist.json'
                        blocked[-1] = str(output)
                        failure = subprocess.run(blocked, capture_output=True, text=True)
                        self.assertNotEqual(failure.returncode, 0)
                        self.assertIn('Missing exact member authoring', failure.stderr)
                        self.assertFalse(output.exists())


if __name__ == '__main__':
    unittest.main()
