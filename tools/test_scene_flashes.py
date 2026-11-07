"""A reviewed flash policy never fits patterned, translucent or untextured effects."""
import hashlib
from pathlib import Path
import tempfile
import unittest
from PIL import Image
from prepare_scene_flashes import annotate, annotate_arena_surfaces
import copy


class FlashRoleTests(unittest.TestCase):
    def test_explicit_model_role_preserves_only_a_uniform_unit_rectangle(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'white.png';Image.new('RGBA',(2,2),'white').save(path)
            mesh={'sourceSha256':'model','triangleCount':2,'vertices':[{'position':[x,y,0],'colorBytes':[255]*4} for x in [-.5,.5] for y in [-.5,.5]]}
            data={'files':{'image':{'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}},
              'effects':[{'sha256':'source','textures':{'white':'image'},'meshes':{'plane':mesh},
               'nodes':[{'typeId':6,'resourceBindings':{'model':{'name':'plane'},'texture1':{'name':'white'}}}]}]}
            role={'sourceSha256':'source','node':0,'role':'dimming','reason':'Reviewed uniform backdrop'}
            self.assertEqual(annotate_arena_surfaces(data,[role]),1)
            self.assertEqual(data['effects'][0]['nodes'][0]['presentationCoverage']['primitive'],'unit-xy-model')
            bad=copy.deepcopy(data);bad['effects'][0]['meshes']['plane']['vertices'][0]['position'][2]=1
            with self.assertRaisesRegex(ValueError,'rectangle'):annotate_arena_surfaces(bad,[role])
            with self.assertRaisesRegex(ValueError,'identity'):annotate_arena_surfaces(data,[{**role,'sourceSha256':'unknown'}])
            im=Image.new('RGBA',(2,2),'white');im.putpixel((0,0),(0,0,0,255));im.save(path)
            data['files']['image']['sha256']=hashlib.sha256(path.read_bytes()).hexdigest()
            with self.assertRaisesRegex(ValueError,'Uniform opaque'):annotate_arena_surfaces(data,[role])

    def test_uniform_resource_is_required_and_source_identity_is_preserved(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'white.png';Image.new('RGBA',(2,2),'white').save(path)
            def plan():
                return {'files':{'image':{'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}},
                    'effects':[{'textures':{'white':'image'},'nodes':[{'index':0,'typeId':3,
                    'materialControls':{'textureCombination':{'name':'Basic'}},'resourceBindings':{'texture1':{'name':'white'}}}]}]}
            data=plan();self.assertEqual(annotate(data),1)
            self.assertEqual(data['effects'][0]['nodes'][0]['presentationCoverage']['region'],'arena')
            im=Image.new('RGBA',(2,2),'white');im.putpixel((0,0),(0,0,0,255));im.save(path)
            self.assertEqual(annotate(plan()),0)
            Image.new('RGBA',(2,2),(255,255,255,128)).save(path);self.assertEqual(annotate(plan()),0)
            data=plan();data['effects'][0]['nodes'][0]['resourceBindings']={};self.assertEqual(annotate(data),0)
            data=plan();path.write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError,'identity'):annotate(data)


if __name__=='__main__':unittest.main()
