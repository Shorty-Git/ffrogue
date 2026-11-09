"""A reviewed flash policy never fits patterned, translucent or untextured effects."""
import hashlib
from pathlib import Path
import tempfile
import unittest
from PIL import Image
from prepare_scene_flashes import annotate, annotate_arena_surfaces, annotate_screen_backdrops, annotate_white_flashes
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

    def test_generic_screen_backdrop_rule_needs_static_screen_wide_uniform_rectangle(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'white.png';Image.new('RGBA',(2,2),'white').save(path)
            def channel(value):return {'valueInitial':value,'valueRange':[0,0,0],'speedInitial':[0,0,0],'speedRange':[0,0,0],'accelerationInitial':[0,0,0],'accelerationRange':[0,0,0]}
            def node(index,type_id,parent,scale,**extra):
                return {'index':index,'typeId':type_id,'parentIndex':parent,'vectorCurves':{},
                    'staticVectors':{'transform':{'translation':channel([0,0,0]),'rotation':channel([0,0,0]),'scale':channel(scale)}},**extra}
            def plan(width=700,anchor='screen'):
                mesh={'sourceSha256':'model','triangleCount':2,'vertices':[{'position':[x,y,0],'colorBytes':[255]*4} for x in [-.5,.5] for y in [-.5,.5]]}
                return {'files':{'image':{'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}},
                    'members':[{'effect':0,'anchor':anchor,'scalePercent':100,'placement':{'rectangle':anchor}}],
                    'effects':[{'textures':{'white':'image'},'meshes':{'plane':mesh},'nodes':[node(0,0,None,[1,1,1]),
                        node(1,6,0,[width,1,1],resourceBindings={'model':{'name':'plane'},'texture1':{'name':'white'}})]}]}
            data=plan();self.assertEqual(annotate_screen_backdrops(data),1)
            self.assertIn('Automatic screen backdrop',data['effects'][0]['nodes'][1]['presentationCoverage']['origin'])
            self.assertEqual(annotate_screen_backdrops(plan(width=300)),0)
            self.assertEqual(annotate_screen_backdrops(plan(anchor='caster-unit')),0)
            moving=plan();moving['effects'][0]['nodes'][1]['vectorCurves']={'translationValue':{'keys':[[0,1]]}}
            self.assertEqual(annotate_screen_backdrops(moving),0)
            offset=plan();offset['effects'][0]['nodes'][0]['staticVectors']['transform']['translation']['valueInitial']=[50,0,0]
            self.assertEqual(annotate_screen_backdrops(offset),0)
            Image.new('RGBA',(2,2),(0,0,0,128)).save(path);self.assertEqual(annotate_screen_backdrops(plan()),0)

    def _particle_plan(self,path,size=360,anchor='screen',life=40,alpha_keys=(0,1,0),color=(1,1,1),combination='Basic'):
        def channel(value):return {'valueInitial':value,'valueRange':[0,0,0],'speedInitial':[0,0,0],'speedRange':[0,0,0],'accelerationInitial':[0,0,0],'accelerationRange':[0,0,0]}
        def node(index,type_id,parent,scale,**extra):
            return {'index':index,'typeId':type_id,'parentIndex':parent,'vectorCurves':{},'lifeParameter':720 if type_id==0 else life,
                'staticVectors':{'transform':{'translation':channel([0,0,0]),'rotation':channel([0,0,0]),'scale':channel(scale)}},**extra}
        particle=node(1,3,0,[size,1,1],uniformScale=True,resourceBindings={'texture1':{'name':'tex'}},
            materialControls={'textureCombination':{'name':combination}},appearance={'color':{'mode':'Constant','value':list(color)}},
            alphaCurve={'keys':[{'value':v} for v in alpha_keys]})
        return {'files':{'image':{'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}},
            'members':[{'effect':0,'anchor':anchor,'scalePercent':100,'placement':{'rectangle':anchor}}],
            'effects':[{'textures':{'tex':'image'},'meshes':{},'nodes':[node(0,0,None,[1,1,1]),particle]}]}

    def test_screen_sized_opaque_particle_is_a_backdrop_even_when_a_helper_node_lives_longer(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'grad.png';im=Image.new('RGBA',(2,2),(0,0,0,255));im.putpixel((0,1),(200,200,200,255));im.save(path)
            data=self._particle_plan(path,life=120,alpha_keys=());self.assertEqual(annotate_screen_backdrops(data),1)
            self.assertEqual(data['effects'][0]['nodes'][1]['presentationCoverage']['primitive'],'screen-particle')
            self.assertEqual(annotate_screen_backdrops(self._particle_plan(path,size=120,alpha_keys=())),0)
            self.assertEqual(annotate_screen_backdrops(self._particle_plan(path,anchor='caster-unit',alpha_keys=())),0)
            self.assertEqual(annotate_screen_backdrops(self._particle_plan(path,combination='Add',alpha_keys=())),0)
            # A uniform translucent plane is a one-axis gradient too (accepted); a pattern across a row is not.
            Image.new('RGBA',(2,2),(0,0,0,128)).save(path)
            self.assertEqual(annotate_screen_backdrops(self._particle_plan(path,alpha_keys=())),1)
            im=Image.new('RGBA',(2,2),(0,0,0,0));im.putpixel((1,0),(255,255,255,255));im.save(path)
            self.assertEqual(annotate_screen_backdrops(self._particle_plan(path,alpha_keys=())),0)

    def test_white_flash_particle_covers_the_battlefield_for_any_anchor(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'white.png';Image.new('RGBA',(2,2),'white').save(path)
            data=self._particle_plan(path,anchor='caster-unit');self.assertEqual(annotate_white_flashes(data),1)
            self.assertIn('impact flash',data['effects'][0]['nodes'][1]['presentationCoverage']['origin'])
            self.assertEqual(annotate_white_flashes(self._particle_plan(path,life=90)),0)
            self.assertEqual(annotate_white_flashes(self._particle_plan(path,alpha_keys=(1,1))),0)
            self.assertEqual(annotate_white_flashes(self._particle_plan(path,color=(0,0,0))),0)
            self.assertEqual(annotate_white_flashes(self._particle_plan(path,size=100)),0)


if __name__=='__main__':unittest.main()
