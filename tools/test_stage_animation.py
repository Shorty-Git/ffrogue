import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from ssbp_v1 import Project
from prepare_stage_animation import prepare, instance_frame, multiply, render_frame
from prepare_stage_sampling import prepare as prepare_sampling


class StageAnimationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.project = Project('ffbe_asset_dump-main/battle_bg/battle_bg_2013_02.ssbp')

    def test_both_independent_original_projects_have_complete_bounded_streams(self):
        for name, cells, packs in [('2013_02',14,5),('0003_01',28,3)]:
            p = Project('ffbe_asset_dump-main/battle_bg/battle_bg_'+name+'.ssbp')
            self.assertEqual(len(p.cells),cells)
            self.assertEqual(len(p.animations),packs)
            for a in p.animations.values():
                self.assertEqual(len(a['frames']),a['count'])
                for f in a['frames']:
                    self.assertEqual(sorted(s['index'] for s in f),list(range(len(a['parts']))))

    def test_instance_clock_covers_prebirth_loops_hold_reverse_and_pingpong(self):
        base=dict(key=2,start=10,end=12,speed=1,loops=1,flags=0)
        self.assertIsNone(instance_frame(1,base))
        self.assertEqual([instance_frame(f,base) for f in range(2,8)],[10,11,12,12,12,12])
        self.assertEqual([instance_frame(f,{**base,'flags':1}) for f in range(2,8)],[10,11,12,10,11,12])
        self.assertEqual([instance_frame(f,{**base,'flags':4}) for f in range(2,8)],[10,11,12,12,11,10])
        self.assertEqual(instance_frame(2,{**base,'flags':2}),12)
        with self.assertRaises(ValueError): instance_frame(3,{**base,'flags':8})

    def test_original_cell_and_matrix_geometry_match_independent_static_art_placement(self):
        p=self.project
        self.assertEqual(p.animations['back/anime']['fps'],30)
        self.assertEqual(p.animations['back/anime']['count'],240)
        packets=render_frame(p,'back/anime',0)
        floor=next(r for r in packets if r[0]==4)
        # Cell312x192, source position(0,-245), centered anchor, master origin(480,728).
        self.assertEqual(floor[5:],[-156,-341,-156,-149,156,-341,156,-149])
        self.assertEqual(multiply([2,0,0,3,10,20],[1,0,0,1,5,7]),[2,0,0,3,20,41])
        self.assertTrue(all(r[1] in (0,2) and 0 < r[2] <= 255 for r in packets))

    def test_export_is_reproducible_and_all_original_textures_remain_byte_identical(self):
        with tempfile.TemporaryDirectory() as d:
            prepare(self.project.path,'back/anime',Path(d),[0,216],[960,1024])
            recipe=json.loads(Path('tools/stages/reactor-sampling.json').read_text())
            prepare_sampling(Path(d),recipe['cells'])
            published=Path('public/assets/stages/reactor')
            self.assertEqual((Path(d)/'animation.json').read_bytes(),(published/'animation.json').read_bytes())
            result=json.loads((published/'animation.json').read_text())
            self.assertEqual(sum(map(len,result['frames'])),7451)
            self.assertNotEqual(result['frames'][0],result['frames'][60])
            for texture in result['textures']:
                self.assertEqual(hashlib.sha256((published/texture['file']).read_bytes()).hexdigest(),texture['sha256'])
                if not texture.get('filter'):
                    self.assertEqual((published/texture['file']).read_bytes(),(self.project.path.parent/texture['file']).read_bytes())
            from PIL import Image
            for cell in result['sampling']['cells']:
                x,y,w,h=cell['originalRect']
                with Image.open(self.project.path.parent/cell['originalImage'])as im:
                    original=im.convert('RGBA').crop((x,y,x+w,y+h))
                with Image.open(published/result['textures'][cell['texture']]['file'])as im:
                    self.assertEqual(im.crop((2,2,w+2,h+2)).tobytes(),original.tobytes())
                    self.assertEqual(im.getpixel((0,0)),original.getpixel((0,0)))

    def test_unsupported_forest_deformation_is_blocked_not_silently_omitted(self):
        forest=Project('ffbe_asset_dump-main/battle_bg/battle_bg_0003_01.ssbp')
        with self.assertRaisesRegex(ValueError,'deformed'):
            render_frame(forest,'back/anime',0)


if __name__=='__main__': unittest.main()
