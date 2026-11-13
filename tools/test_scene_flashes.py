"""A reviewed flash policy never fits patterned, translucent or untextured effects."""
import hashlib
from pathlib import Path
import tempfile
import unittest
from PIL import Image
from prepare_scene_flashes import annotate, annotate_arena_surfaces, annotate_screen_backdrops, annotate_white_flashes, annotate_screen_models
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
            self.assertEqual(annotate_screen_backdrops(self._particle_plan(path,size=90,alpha_keys=())),0)
            self.assertEqual(annotate_screen_backdrops(self._particle_plan(path,anchor='caster-unit',alpha_keys=())),0)
            self.assertEqual(annotate_screen_backdrops(self._particle_plan(path,combination='Add',alpha_keys=())),1)
            # A uniform translucent plane is a one-axis gradient too (accepted); a patterned plane is a screen layer as well since 2026-11-12.
            Image.new('RGBA',(2,2),(0,0,0,128)).save(path)
            self.assertEqual(annotate_screen_backdrops(self._particle_plan(path,alpha_keys=())),1)
            im=Image.new('RGBA',(2,2),(0,0,0,0));im.putpixel((1,0),(255,255,255,255));im.save(path)
            self.assertEqual(annotate_screen_backdrops(self._particle_plan(path,alpha_keys=())),1)

    def test_uniform_colour_plane_covers_the_battlefield_for_any_anchor_life_and_alpha(self):
        from prepare_scene_flashes import annotate_uniform_planes
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'white.png';Image.new('RGBA',(2,2),'white').save(path)
            # Long life and a constant alpha: not an impact flash, still a plane of one colour.
            data=self._particle_plan(path,anchor='target-unit',life=240,alpha_keys=(1,1))
            self.assertEqual(annotate_white_flashes(data),0);self.assertEqual(annotate_uniform_planes(data),1)
            self.assertIn('uniform-colour plane',data['effects'][0]['nodes'][1]['presentationCoverage']['origin'])
            self.assertEqual(annotate_uniform_planes(self._particle_plan(path,size=90)),0)
            self.assertEqual(annotate_uniform_planes(self._particle_plan(path,combination='Add')),0)
            # Off the screen anchor a moving plane stays as it is; on it, the motion is replaced.
            for anchor,expected in [('target-unit',0),('screen',1)]:
                moving=self._particle_plan(path,anchor=anchor);moving['effects'][0]['nodes'][1]['vectorCurves']={'translationValue':{'keys':[[0,1]]}}
                self.assertEqual(annotate_uniform_planes(moving),expected)
            # A plane that only grows (a flash that opens) is still covered off the screen anchor.
            growing=self._particle_plan(path,anchor='target-unit');growing['effects'][0]['nodes'][1]['vectorCurves']={'scaleValue':{'keys':[[0,1]]}}
            self.assertEqual(annotate_uniform_planes(growing),1)
            # Untextured Particles are planes of their own colour, once the plan draws them.
            bare=self._particle_plan(path,anchor='target-unit');bare['effects'][0]['nodes'][1]['resourceBindings']={}
            self.assertEqual(annotate_uniform_planes(bare),1)
            self.assertNotIn('textureSha256',bare['effects'][0]['nodes'][1]['presentationCoverage'])
            im=Image.new('RGBA',(2,2),'white');im.putpixel((1,0),(0,0,0,255));im.save(path)
            self.assertEqual(annotate_uniform_planes(self._particle_plan(path,anchor='target-unit')),0)

    def test_screen_frame_of_edge_bars_is_scaled_to_this_view(self):
        from prepare_scene_flashes import annotate_screen_frames
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'white.png';Image.new('RGBA',(2,2),'white').save(path)
            def frame(offsets=((0,-187,0),(160,-15,90),(0,157,180),(-160,-15,-90)),anchor='screen',extra=None):
                def channel(value):return {'valueInitial':value,'valueRange':[0,0,0],'speedInitial':[0,0,0],'speedRange':[0,0,0],'accelerationInitial':[0,0,0],'accelerationRange':[0,0,0]}
                def node(index,type_id,parent,scale,translation=(0,0,0),turn=0,**more):
                    return {'index':index,'typeId':type_id,'parentIndex':parent,'vectorCurves':{},'lifeParameter':240,
                        'staticVectors':{'transform':{'translation':channel(list(translation)),'rotation':channel([0,0,turn]),'scale':channel(scale)}},**more}
                bars=[node(i+1,2,0,[190,30,100],(x,y,0),turn,resourceBindings={'texture1':{'name':'tex'}}) for i,(x,y,turn) in enumerate(offsets)]
                return {'files':{'image':{'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}},
                    'members':[{'effect':0,'anchor':anchor,'scalePercent':100,'placement':{'rectangle':anchor}}],
                    'effects':[{'textures':{'tex':'image'},'meshes':{},'nodes':[node(0,0,None,[1,1,1]),*bars,*(extra or [])]}]}
            data=frame();self.assertEqual(annotate_screen_frames(data),1)
            root=data['effects'][0]['nodes'][0]
            self.assertAlmostEqual(root['staticVectors']['transform']['scale']['valueInitial'][0],563/360,places=3)
            self.assertIn('not an original scale',root['presentationFit']['origin'])
            self.assertEqual(annotate_screen_frames(data),0,'applied once')
            self.assertEqual(annotate_screen_frames(frame(anchor='caster-unit')),0)
            self.assertEqual(annotate_screen_frames(frame(offsets=((0,-40,0),(160,-15,90)))),0,'a bar in the middle is not a frame')
            self.assertEqual(annotate_screen_frames(frame(offsets=((0,-187,45),))),0,'only quarter turns')

    def test_white_flash_particle_covers_the_battlefield_for_any_anchor(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'white.png';Image.new('RGBA',(2,2),'white').save(path)
            data=self._particle_plan(path,anchor='caster-unit');self.assertEqual(annotate_white_flashes(data),1)
            self.assertIn('impact flash',data['effects'][0]['nodes'][1]['presentationCoverage']['origin'])
            self.assertEqual(annotate_white_flashes(self._particle_plan(path,life=90)),0)
            self.assertEqual(annotate_white_flashes(self._particle_plan(path,alpha_keys=(1,1))),0)
            self.assertEqual(annotate_white_flashes(self._particle_plan(path,color=(0,0,0))),0)
            self.assertEqual(annotate_white_flashes(self._particle_plan(path,size=90)),0)


class ScreenQuadTests(unittest.TestCase):
    def test_screen_sized_patterned_quad_is_a_screen_layer_but_small_or_moving_quads_are_not(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'lines.png';im=Image.new('RGBA',(2,2),(0,0,0,0));im.putpixel((1,0),(200,180,255,255));im.save(path)
            def channel(value):return {'valueInitial':value,'valueRange':[0,0,0],'speedInitial':[0,0,0],'speedRange':[0,0,0],'accelerationInitial':[0,0,0],'accelerationRange':[0,0,0]}
            def plan(size=360,curves=None):
                parent={'index':0,'typeId':0,'parentIndex':None,'vectorCurves':{'translationValue':{'keys':[[0,1]]}},
                    'staticVectors':{'transform':{'translation':channel([5,0,0]),'rotation':channel([0,0,0]),'scale':channel([1,1,1])}}}
                quad={'index':1,'typeId':2,'parentIndex':0,'vectorCurves':curves or {},'lifeParameter':140,
                    'staticVectors':{'transform':{'translation':channel([0,0,0]),'rotation':channel([0,0,0]),'scale':channel([size,320,1])}},
                    'resourceBindings':{'texture1':{'name':'lines'}}}
                return {'files':{'image':{'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}},
                    'members':[{'effect':0,'anchor':'screen','scalePercent':100,'placement':{'rectangle':'screen'}}],
                    'effects':[{'textures':{'lines':'image'},'meshes':{},'nodes':[parent,quad]}]}
            data=plan();self.assertEqual(annotate_screen_backdrops(data),1)
            self.assertEqual(data['effects'][0]['nodes'][1]['presentationCoverage']['primitive'],'unit-quad')
            self.assertEqual(annotate_screen_backdrops(plan(size=180)),0)
            self.assertEqual(annotate_screen_backdrops(plan(curves={'scaleValue':{'keys':[[0,1]]}})),0)



class ScreenModelTests(unittest.TestCase):
    def test_screen_sized_wall_model_covers_the_arena_on_any_anchor_but_rotated_or_small_ones_do_not(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'cloud.png';im=Image.new('RGBA',(2,2),(0,0,0,0));im.putpixel((1,0),(120,40,40,255));im.save(path)
            def channel(value):return {'valueInitial':value,'valueRange':[0,0,0],'speedInitial':[0,0,0],'speedRange':[0,0,0],'accelerationInitial':[0,0,0],'accelerationRange':[0,0,0]}
            mesh={'triangleCount':2,'sourceSha256':'m','vertices':[{'position':[x,y,0],'colorBytes':[255,255,255,255]} for x in [-.5,.5] for y in [-.5,.5]]}
            def plan(size=700,rotation=0,anchor='target-group',tilt=0,layer='front'):
                wall={'index':0,'typeId':6,'parentIndex':None,'vectorCurves':{},'lifeParameter':120,
                    'staticVectors':{'transform':{'translation':channel([60,0,0]),'rotation':channel([tilt,0,rotation]),'scale':channel([size,800,1])}},
                    'resourceBindings':{'texture1':{'name':'cloud'},'model':{'name':'wall'}}}
                return {'files':{'image':{'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}},
                    'members':[{'effect':0,'anchor':anchor,'layer':layer,'scalePercent':100,'placement':{'rectangle':'target-side'}}],
                    'effects':[{'textures':{'cloud':'image'},'meshes':{'wall':mesh},'nodes':[wall]}]}
            data=plan();self.assertEqual(annotate_screen_models(data),1)
            self.assertEqual(data['effects'][0]['nodes'][0]['presentationCoverage']['primitive'],'unit-xy-model')
            self.assertEqual(annotate_screen_models(plan(size=300)),0)
            # A constant turn around Z does not matter to a stretched layer; a tilt out of the picture plane does.
            self.assertEqual(annotate_screen_models(plan(rotation=90)),1)
            self.assertEqual(annotate_screen_models(plan(tilt=30)),0)
            # Area backdrop: on the back layer of a target-side effect the smaller screen-layer size applies.
            self.assertEqual(annotate_screen_models(plan(size=300,layer='back')),1)
            self.assertEqual(annotate_screen_models(plan(size=150,layer='back')),0)


if __name__=='__main__':unittest.main()
