"""Local-source integration checks for selected quad distortion fields."""
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET
from inspect_bmb import read_bmb
from bmb_distortion import attach_distortion_fields, compare_distortion_fields

ROOT=Path(__file__).resolve().parents[1]
STEMS=['chap_3_ep_4_pone_distortion_in','ability_eff_hieroglyphaquarium_back',
       'atk_slash7_side_purple','atk_blow1_purple','eff_12boss_12_front','sp_20157_kyogiri_front',
       'atk_slash10_hit','atk_slash11_blue_hit','atk_slash13_blue_hit',
       'eff_bg_flow_v_001_bluegreen_f120','ffbe49_arena_barrier',
       'lb_100034205_Conche_front_unit','monster_anime_2120410_tonberi_move_eff_enemy']


class DistortionFieldsTest(unittest.TestCase):
    def test_source_pairs_compare_fixed_fields_modes_and_color_curves(self):
        nodes=keys=0
        for stem in STEMS:
            raw=ROOT/'tools/data/bmb-format'/f'{stem}.bmb'
            project=ROOT/'assets/battle_effect'/f'{stem}.bmsln'
            if not raw.exists() or not project.exists():
                self.skipTest('Local original source pairs are required')
            data=raw.read_bytes();result=read_bmb(data);attach_distortion_fields(data,result)
            source=ET.parse(project).findall('.//ResIdeNode')[1:]
            self.assertEqual(len(result['nodes']),len(source))
            for node,xml in zip(result['nodes'],source):
                if node['typeId']==2:
                    keys+=compare_distortion_fields(node,xml);nodes+=1
        self.assertGreater(nodes,40)
        self.assertGreater(keys,10)

    def test_source_mutation_is_detected(self):
        stem=STEMS[0];raw=ROOT/'tools/data/bmb-format'/f'{stem}.bmb'
        if not raw.exists():self.skipTest('Local original source pair is required')
        data=raw.read_bytes();result=read_bmb(data);attach_distortion_fields(data,result)
        source=ET.parse(ROOT/'assets/battle_effect'/f'{stem}.bmsln').findall('.//ResIdeNode')[1:]
        node=next(n for n in result['nodes']if n['typeId']==2)
        node['distortionFields']['layers']['texture2']['rgbInitial'][0]+=1
        with self.assertRaises(ValueError):compare_distortion_fields(node,source[node['index']])


if __name__=='__main__':unittest.main()
