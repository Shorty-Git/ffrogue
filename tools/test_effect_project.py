import hashlib
import json
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

from inspect_effect_project import decode_project, encode_project


def effect(project, binary=b''):
    chunks = [(b'EDIT', encode_project(project)), (b'BIN_', b'SKFE' + struct.pack('<I', 1810) + binary)]
    return b'EFKE' + struct.pack('<I', 0) + b''.join(tag + struct.pack('<I', len(data)) + data for tag, data in chunks)


class EffectProjectTests(unittest.TestCase):
    def test_editor_round_trip_preserves_unicode_values_and_nested_nodes(self):
        project = ET.fromstring('<EffekseerProject><Root><Name>Cross 凶</Name><Children><Node><Name>stroke</Name><Empty /></Node></Children></Root></EffekseerProject>')
        self.assertEqual(ET.tostring(project), ET.tostring(decode_project(effect(project))))

    def test_truncated_effect_is_rejected(self):
        project = ET.fromstring('<EffekseerProject><Root /></EffekseerProject>')
        with self.assertRaisesRegex(ValueError, 'Truncated'):
            decode_project(effect(project)[:-1])

    def test_repair_restores_distinct_uvs_without_changing_source_or_other_binary_fields(self):
        base = Path('tools/data').resolve()
        base.mkdir(parents=True, exist_ok=True)
        root = Path(tempfile.mkdtemp(prefix='uv-repair-test-', dir=base))
        try:
            assets = root / 'assets'
            assets.mkdir()
            project = ET.Element('EffekseerProject')
            authoring = ET.Element('Solution')
            for name, x in [('left', '0'), ('right', '-1')]:
                node = ET.SubElement(project, 'Node')
                ET.SubElement(node, 'Name').text = name
                common = ET.SubElement(node, 'RendererCommonValues')
                ET.SubElement(common, 'ColorTexture').text = '../effect_resource/atlas.png'
                ET.SubElement(common, 'UV').text = '1'
                fixed = ET.SubElement(common, 'UVFixed')
                size = ET.SubElement(fixed, 'Size')
                for axis in ['X', 'Y']:
                    ET.SubElement(size, axis).text = '64'
                original = ET.SubElement(authoring, 'ResIdeNode')
                ET.SubElement(original, 'Basic_Meta_Name').text = name
                ET.SubElement(original, 'Texture_Layer1_PictureName').text = 'atlas'
                for field in ['Scale', 'Translate', 'Rotate']:
                    ET.SubElement(original, f'Texture1_{field}_Value_Curve')
                ET.SubElement(original, 'Texture1_Scale_Value_Initial', X='2', Y='2', Z='2')
                ET.SubElement(original, 'Texture1_Translate_Value_Initial', X=x, Y='0', Z='0')
                ET.SubElement(original, 'Texture1_Rotate_Value_Initial', X='0', Y='0', Z='0')
            pattern = struct.pack('<Iffff', 1, 0, 0, .5, .5)
            original_binary = b'untouched-prefix' + pattern + b'node-boundary' + pattern + b'untouched-tail'
            source = assets / 'source.efkefc'
            source.write_bytes(effect(project, original_binary))
            authoring_file = assets / 'source.bmsln'
            ET.ElementTree(authoring).write(authoring_file)
            sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
            recipe = {'schemaVersion': 1, 'source': str(source), 'sourceSha256': sha(source),
                      'authoring': str(authoring_file), 'authoringSha256': sha(authoring_file),
                      'texture': 'atlas', 'textureWidth': 128, 'textureHeight': 128,
                      'nodes': ['left', 'right'], 'compiledBefore': [0, 0, .5, .5],
                      'output': str(assets / 'repaired.efkefc'), 'receipt': str(root / 'receipt.json'), 'reason': 'Synthetic omitted-offset fixture'}
            recipe_file = root / 'recipe.json'
            recipe_file.write_text(json.dumps(recipe))
            tool = Path('tools/repair_effect_uv.py').resolve()
            command = [sys.executable, str(tool), '--recipe', str(recipe_file)]
            run = subprocess.run(command, cwd=root, capture_output=True, text=True)
            self.assertEqual(run.returncode, 0, run.stderr)
            repaired = Path(recipe['output']).read_bytes()
            self.assertEqual(sha(source), recipe['sourceSha256'])
            self.assertIn(b'untouched-prefix' + pattern + b'node-boundary' + struct.pack('<Iffff', 1, .5, 0, .5, .5) + b'untouched-tail', repaired)
            decoded = decode_project(repaired)
            self.assertEqual(decoded.findall('Node')[1].findtext('RendererCommonValues/UVFixed/Start/X'), '64.0')
            self.assertEqual(subprocess.run(command, cwd=root, capture_output=True).returncode, 0)
            self.assertEqual(Path(recipe['output']).read_bytes(), repaired)
            source.write_bytes(source.read_bytes() + b'changed')
            rejected = subprocess.run(command, cwd=root, capture_output=True, text=True)
            self.assertNotEqual(rejected.returncode, 0)
            self.assertIn('snapshot differs', rejected.stderr)
            self.assertEqual(Path(recipe['output']).read_bytes(), repaired)
        finally:
            self.assertTrue(root.resolve().is_relative_to(base))
            shutil.rmtree(root)


if __name__ == '__main__':
    unittest.main()
