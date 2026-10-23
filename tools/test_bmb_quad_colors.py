"""Local-source verification of static quad corner RGBA and mode/flat controls."""
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET
from inspect_bmb import read_bmb
from bmb_quad_colors import attach_quad_colors, compare_quad_colors

ROOT=Path(__file__).resolve().parents[1]
STEMS=['atk_slash7_side_purple','eff_12boss_12_front','sp_20157_kyogiri_front','1st_Fina_lb4',
       '1st_Sakura_lb5_front','A2_NVSbg_addon','eff_bg_fire_red','ChizuruNV_Vortex']


class QuadColorsTest(unittest.TestCase):
    def test_source_pairs_cover_flat_and_independent_corner_values(self):
        nodes=0;flags=set();modes=set();corners=[set()for _ in range(4)]
        for stem in STEMS:
            file=ROOT/'tools/data/bmb-format'/f'{stem}.bmb';project=ROOT/'assets/battle_effect'/f'{stem}.bmsln'
            if not file.exists()or not project.exists():self.skipTest('Local source pairs are required')
            raw=file.read_bytes();result=read_bmb(raw);attach_quad_colors(raw,result)
            source=ET.parse(project).findall('.//ResIdeNode')[1:]
            self.assertEqual(len(source),len(result['nodes']))
            for node,xml in zip(result['nodes'],source):
                if node['typeId']!=2:continue
                compare_quad_colors(node,xml);nodes+=1;values=node['quadColors']
                flags.add(values['flat']);modes.add(values['mode'])
                for seen,corner in zip(corners,values['corners'].values()):seen.add(tuple(corner['value']))
        self.assertGreater(nodes,20);self.assertEqual(flags,{True,False});self.assertEqual(modes,{'Constant','Curve'})
        self.assertTrue(all(len(seen)>1 for seen in corners))

    def test_source_mutation_is_rejected(self):
        file=ROOT/'tools/data/bmb-format/eff_bg_fire_red.bmb'
        if not file.exists():self.skipTest('Local source pair is required')
        raw=file.read_bytes();result=read_bmb(raw);attach_quad_colors(raw,result)
        source=ET.parse(ROOT/'assets/battle_effect/eff_bg_fire_red.bmsln').findall('.//ResIdeNode')[1:]
        node=next(n for n in result['nodes']if n['typeId']==2)
        node['quadColors']['corners']['rightTop']['value'][3]+=.5
        with self.assertRaises(ValueError):compare_quad_colors(node,source[node['index']])


if __name__=='__main__':unittest.main()
