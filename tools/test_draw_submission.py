"""Eight existing sources; seven available Cloud authoring pairs, one explicit gap."""
import json
from pathlib import Path
import struct
import unittest
import xml.etree.ElementTree as ET
from inspect_bmb import read_bmb
from prepare_draw_submission import read_draw_submission

ROOT=Path('tools/data/shared-skill-review')
PLANS=['brave-slash-composed/plan-native-null.json','blade-beam/plan-native-null.json',
       'climhazzard/plan-native-alpha.json']

class SubmissionDataTests(unittest.TestCase):
    def test_source_fields_match_available_cloud_authoring_pairs(self):
        sources=fields=verified_sources=verified_fields=0;missing=[]
        for file in PLANS:
            plan=ROOT/file
            for effect in json.loads(plan.read_text(encoding='utf-8'))['effects']:
                raw=(plan.parent/'originals'/effect['name']).read_bytes()
                nodes=[n for n in read_bmb(raw)['nodes'] if n['typeId'] in (2,3)]
                decoded=read_draw_submission(raw,[n['index'] for n in nodes])
                sources+=1;fields+=len(nodes)
                authoring=Path('rawdata/assets/battle_effect')/Path(effect['name']).with_suffix('.bmsln')
                if not authoring.is_file():
                    self.assertIsNone(effect.get('authoringSupplement'));missing.append(effect['name']);continue
                xml=ET.parse(authoring).findall('.//ResIdeNode')
                self.assertEqual(decoded['prioritySort'],xml[0].findtext('Basic_Basic_PrioritySort')=='true')
                self.assertFalse(decoded['fullZSort'])
                for n in nodes:
                    expected=float(xml[n['index']+1].findtext('Basic_Basic_SortPriority'))
                    self.assertEqual(decoded['priorities'][str(n['index'])],struct.unpack('<f',struct.pack('<f',expected))[0])
                    verified_fields+=1
                verified_sources+=1
        self.assertEqual(sources,8);self.assertEqual(fields,30)
        self.assertEqual(verified_sources,7);self.assertEqual(verified_fields,25)
        self.assertEqual(len(missing),1,'Missing authoring remains an explicit reference gap')

    def test_unknown_modes_types_and_nonfinite_priorities_reject(self):
        raw=bytearray((ROOT/'brave-slash-composed/originals/atk_slash1_white.bmb').read_bytes())
        for offset,value in [(0x4c,1),(0x4d,2)]:
            changed=raw[:];changed[offset]=value
            with self.assertRaises(ValueError):read_draw_submission(changed,[2])
        with self.assertRaises(ValueError):read_draw_submission(raw,[1])
        at=read_bmb(raw)['nodes'][2]['offset']+508
        struct.pack_into('<f',raw,at,float('nan'))
        with self.assertRaises(ValueError):read_draw_submission(raw,[2])

if __name__=='__main__':unittest.main()
