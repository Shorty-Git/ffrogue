"""Control-field parsing, fail-closed admission and matching-source comparisons."""
import json
import struct
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET
from raw_paths import resolve_raw_path
from bmb_source_controls import read_source_controls, compare_source_controls, control_coverage, read_intake_controls


class SourceControlTests(unittest.TestCase):
    def test_extended_independent_intake_corpus_and_changed_selector(self):
        from audit_bmb_controls import compare_intake_pair
        corpus = Path('tools/data/control-groups-20261101/expanded-corpus.json')
        if not corpus.exists():
            self.skipTest('Optional preserved extended control corpus missing')
        pairs = json.loads(corpus.read_text())['pairs']
        count = 0
        mutable = None
        for pair in pairs:
            binary = Path(resolve_raw_path(pair['binary'])).read_bytes()
            xml = Path(resolve_raw_path(pair['authoring'])).read_bytes()
            result = compare_intake_pair(binary, xml)
            count += result['intakeFieldsChecked']
            self.assertFalse(result['wholeProjectCompared'])
            if result['intakeFieldsChecked']:
                mutable = (binary, xml)
        self.assertEqual(len(pairs), 48)
        self.assertEqual(count, 812)
        binary, xml = mutable
        from inspect_bmb import read_bmb
        from bmb_source_controls import TAGS
        root = ET.fromstring(xml)
        for node, source in zip(read_bmb(binary)['nodes'], root.findall('.//ResIdeNode')[1:]):
            fields = read_intake_controls(binary, node)
            if fields:
                name, field = next(iter(fields.items()))
                source.find(TAGS[name]).text = '0.125' if isinstance(field['value'], float) else 'Unverified'
                break
        with self.assertRaisesRegex(ValueError, 'Intake source control differs'):
            compare_intake_pair(binary, ET.tostring(root))

    def test_intake_parent_groups_reject_unknown_enums_and_invalid_rates(self):
        for kind,offset,field,values in [
            (3,508,'rotation',[(1,'On'),(2,'OnGenerateTime')]),
            (6,568,'translation',[(0,'On'),(1,'OnGenerateTime')]),
            (6,576,'scale',[(0,'Off'),(1,'On')]),
        ]:
            with self.subTest(kind=kind,field=field):
                raw=bytearray(2128);node=dict(offset=0,typeId=kind,index=0)
                for code,name in values:
                    struct.pack_into('<I',raw,offset,code)
                    self.assertEqual(read_intake_controls(raw,node)[field]['value'],name)
                struct.pack_into('<I',raw,offset,99)
                self.assertEqual(read_intake_controls(raw,node)[field]['status'],'unknown-enum')
        raw=bytearray(2128);node=dict(offset=0,typeId=2,index=0)
        for value in [0,.25,1]:
            struct.pack_into('<f',raw,516,value)
            self.assertEqual(read_intake_controls(raw,node)['colorRate']['value'],value)
        for value in [-1,1.1,float('nan'),float('inf')]:
            struct.pack_into('<f',raw,516,value)
            with self.assertRaisesRegex(ValueError,'influence rate'):
                read_intake_controls(raw,node)

    def test_particle_translation_intake_uses_raw_selector_without_plan_rewrite(self):
        raw=bytearray(1840)
        node={'offset':0,'typeId':3,'index':0}
        read_source_controls(raw,node)
        before=json.dumps(node,sort_keys=True)
        for code,value in [(0,'On'),(1,'OnGenerateTime')]:
            struct.pack_into('<I',raw,504,code)
            field=read_intake_controls(raw,node)['translation']
            self.assertEqual((field['raw'],field['value'],field['fieldOffset']),(code,value,504))
            self.assertNotIn('translation',control_coverage([node],raw)['nodes'][0]['missing'])
        self.assertEqual(json.dumps(node,sort_keys=True),before)
        struct.pack_into('<I',raw,504,99)
        self.assertIsNone(read_intake_controls(raw,node)['translation']['value'])
        self.assertIn('translation',control_coverage([node],raw)['nodes'][0]['missing'])
        source=ET.Element('ResIdeNode')
        ET.SubElement(source,'Basic_ParentNodeInfluence_TranslateParentNodeInfluenceType').text='On'
        with self.assertRaisesRegex(ValueError,'Unresolved binary'):
            compare_source_controls(node,source,require_all=False,data=raw)

    def test_binary_offsets_are_not_selected_by_authoring_and_unknowns_stay_unknown(self):
        raw=bytearray(2128);struct.pack_into('<5I',raw,600,1,2,1,1,999)
        struct.pack_into('<f',raw,512,.25)
        node={'offset':0,'typeId':2,'index':0};read_source_controls(raw,node)
        fields=node['sourceControls']['fields']
        self.assertEqual(fields['translation']['value'],'OnGenerateTime')
        self.assertEqual(fields['rotation']['value'],'OnGenerateTime')
        self.assertEqual(fields['scale']['value'],'On')
        self.assertEqual(fields['alphaMode']['value'],'Multiply')
        self.assertEqual(fields['alphaRate']['value'],.25)
        struct.pack_into('<I',raw,604,99);read_source_controls(raw,node)
        self.assertIsNone(node['sourceControls']['fields']['rotation']['value'])
        self.assertIn('rotation',control_coverage([node])['nodes'][0]['missing'])
        self.assertFalse(control_coverage([node])['authoringFreeInheritanceComplete'])
        # One held-out asset suggests scale0=Off, but this session does not
        # broaden the stable profile from that sparse evidence.
        struct.pack_into('<I',raw,608,0);read_source_controls(raw,node)
        self.assertIsNone(node['sourceControls']['fields']['scale']['value'])
        self.assertRaises(ValueError,compare_source_controls,node,ET.Element('ResIdeNode'))
        struct.pack_into('<f',raw,512,float('nan'))
        self.assertRaisesRegex(ValueError,'Invalid binary',read_source_controls,raw,node)

    def test_distinct_null_encoding_and_root_compatibility_are_not_guessed(self):
        raw=bytearray(704);struct.pack_into('<I',raw,136,2);struct.pack_into('<I',raw,692,1)
        node={'offset':0,'typeId':0,'index':0};read_source_controls(raw,node)
        self.assertEqual(node['sourceControls']['fields']['rotation']['value'],'Off')
        self.assertEqual(node['sourceControls']['fields']['nullType']['value'],'Standard')
        self.assertEqual(node['sourceControls']['compatibility'],'unresolved-authoring-to-runtime-mapping')
        self.assertIn('matrix',node['sourceControls']['missingInheritance'])
        initialization=node['nativeInitialization']
        self.assertEqual(initialization['parameters'],{'locator_index':1,'field_c8':0,'field_cc':0})
        self.assertEqual(initialization['requiredContext'],['parent_flags','child_flags'])
        struct.pack_into('<I',raw,0xc8,99);read_source_controls(raw,node)
        self.assertEqual(node['nativeInitialization']['status'],'unsupported-inputs')

    def test_matching_control_corpus_and_mutated_project(self):
        from inspect_bmb import read_bmb,compare_project
        corpus=Path('tools/data/bmb-controls-20261028/discovery.json')
        if not corpus.exists():self.skipTest('Optional preserved matched control corpus missing')
        pairs=json.loads(corpus.read_text())['pairs'];count=0
        for pair in pairs:
            data=read_bmb(Path(resolve_raw_path(pair['binary'])).read_bytes());xml=Path(resolve_raw_path(pair['authoring'])).read_bytes()
            compare_project(data,xml)
            source=ET.fromstring(xml).findall('.//ResIdeNode')[1:]
            for node,s in zip(data['nodes'],source):count+=compare_source_controls(node,s)
        self.assertGreater(count,500)
        # A changed authoring value must not overwrite the decoded original.
        source[0].find('Basic_ParentNodeInfluence_ParentAlphaRate').text='0.123'
        self.assertRaisesRegex(ValueError,'source control differs',compare_source_controls,data['nodes'][0],source[0])


if __name__=='__main__':unittest.main()
