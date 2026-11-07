"""Cached import discovery must never certify missing or changed local payloads."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from stage_source_imports import verify_staged_identity, audit_report_name, audit
from unittest.mock import patch
import contextlib
import io
from stage_original_skill import select_identical_original


class CacheIdentityTest(unittest.TestCase):
    def test_failed_composition_cannot_stage_only_the_skill_and_omit_the_unit_prefix(self):
        with tempfile.TemporaryDirectory(dir='tools/data') as folder:
            root=Path(folder);report=root/'report.json';selection=root/'selection.json'
            report.write_text(json.dumps(dict(catalog=[dict(id=1,kind='ABILITY',raw={})])))
            selection.write_text(json.dumps(dict(selection=[dict(character='fixture',sourceId=1,kind='ABILITY',name='Blocked',
                report=str(report),intakeBlockers=['Unknown unit prefix branch'])])))
            with patch('stage_source_imports.stage') as stage,contextlib.redirect_stdout(io.StringIO()):
                audit(selection)
            stage.assert_not_called()
            result=json.loads((root/'candidate-audit.json').read_text())['candidates'][0]
            self.assertEqual(result['status'],'blocked')
            self.assertIn('Unresolved complete composition',result['blockers'][0])
            self.assertFalse(result['playable'])

    def test_named_batches_preserve_separate_evidence(self):
        self.assertEqual(audit_report_name(Path('selection.json')), 'candidate-audit.json')
        names=[audit_report_name(Path(name+'-selection.json')) for name in ['tifa','sephiroth','cod']]
        self.assertEqual(len(set(names)),3)
        self.assertEqual(names[0],'tifa-selection-audit.json')

    def test_original_aliases_require_identical_payloads_not_matching_names(self):
        rows=[dict(archive='b',dir='',name='same.bmb'),dict(archive='a',dir='',name='same.bmb')]
        row,data,aliases=select_identical_original(rows,lambda row:b'exact')
        self.assertEqual(row['archive'],'a');self.assertEqual(data,b'exact');self.assertEqual(len(aliases),2)
        with self.assertRaisesRegex(ValueError,'Ambiguous original versions'):
            select_identical_original(rows,lambda row:row['archive'].encode())

    def test_cached_source_and_each_resource_are_rechecked(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            effect=root/'effects'/'sample'
            effect.mkdir(parents=True)
            source=root/'sample.bmb';source.write_bytes(b'original')
            texture=effect/'sample.png';texture.write_bytes(b'resource')
            digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
            report={'source':str(source),'resources':[{'output':str(texture),'sha256':digest(texture)}]}
            (effect/'resources.json').write_text(json.dumps(report))
            receipt={'originals':[{'member':'sample.bmb','sha256':digest(source)}]}
            verify_staged_identity(root,receipt)
            texture.write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError,'identity mismatch'):verify_staged_identity(root,receipt)
            texture.unlink()
            with self.assertRaises(FileNotFoundError):verify_staged_identity(root,receipt)


if __name__=='__main__':unittest.main()
