"""Compile one evidence-gated static Default/OneX/Basic source through the shared player."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys
sys.path.insert(0,str(Path(__file__).parent/'memorial'))
from inspect_bmb import read_bmb
from bmb_playback_fields import attach_playback_fields
from native_particle_dispatch import ParticleDispatch
from native_material_selection import native_catalog, select_initial
from original_inheritance import attach_inheritance
from original_texture_layers import attach_texture_layers
from original_basic_material import attach_basic_material


def compile_effect(request_file,apk,output,authoring,seed,shader_package):
    root=Path.cwd().resolve();output=output.resolve()
    if not output.is_relative_to(root/'tools/data'):raise ValueError('Control output must remain ignored')
    if len(seed)!=4 or any(not 0<=word<=0xffffffff for word in seed) or not any(seed):
        raise ValueError('Four explicit nonzero-state uint32 reference seed words required')
    request=json.loads(request_file.read_text(encoding='utf-8'))
    source=Path(request['source']);raw=source.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=request['sourceSha256']:raise ValueError('Source identity mismatch')
    if hashlib.sha256(authoring.read_bytes()).hexdigest()!=request['authoringSha256']:raise ValueError('Matched authoring identity required')
    data=read_bmb(raw);attach_playback_fields(raw,data['nodes']);attach_inheritance(data,authoring.read_bytes())
    attach_texture_layers(data,authoring.read_bytes());nodes=data['nodes'];leaf=nodes[-1]
    if leaf['typeId']!=3 or any(n['typeId']!=0 for n in nodes[:-1]):raise ValueError('Single Particle leaf required')
    parents=[]
    for i,n in enumerate(nodes):
        if n['parentIndex']!=(i-1 if i else None) or n['children']!=([i+1] if i<len(nodes)-1 else []):
            raise ValueError('Static linear source ancestry required')
        if n['generation']!=dict(start=0,startRange=0,count=1,duration=1,repeatCount=1,interval=1):
            raise ValueError('Only one immediate emission is admitted')
        if n['lifeRangeParameter'] or n['lifeParameter'] not in (0,leaf['lifeParameter']):raise ValueError('Independent parent lifetime unsupported')
        if n['alphaCurve']['keys'] or n['materialAlpha']['value']!=1:raise ValueError('Neutral constant alpha required')
        if any(c['keys'] for c in n['vectorCurves'].values()):raise ValueError('Dynamic transform/UV curve unsupported')
        if any(mode['name'] not in ('NewtonDynamics','Constant') for mode in n['motionModes'].values()):
            raise ValueError('Unadmitted source motion mode')
        for domain in n['staticVectors'].values():
            for group in domain.values():
                if any(v for k,values in group.items() if k!='valueInitial' for v in values):raise ValueError('Random/dynamic parameters unsupported')
        color=n['nativeModuleInputs']['color1']
        if color['value']!=[1,1,1] or any(color['range']):raise ValueError('Neutral constant color required')
        if n is not leaf:
            t=n['staticVectors']['transform'];kind=struct.unpack_from('<I',raw,n['offset']+0x2b4)[0]
            inherited=n['authoringInheritance']
            if inherited!=next(e['inheritance'] for e in request['parentEvidence'] if e['node']==n['index']):
                raise ValueError('Parent evidence differs from the matched authoring source')
            parents.append(dict(index=n['index'],parentIndex=n['parentIndex'],locator=kind,
                local=dict(scale=t['scale']['valueInitial'],rotation=[math.radians(v) for v in t['rotation']['valueInitial']],
                           translation=t['translation']['valueInitial']),inheritance=inherited))
    dispatch=ParticleDispatch(apk).inspect_effect(source)['particles'][0]
    if dispatch['scale']['index']!=15 or dispatch['scaleInit']['target'] is not None or dispatch['rotation']['target'] is not None:
        raise ValueError('Source-selected OneX with absent initializer/rotation required')
    if leaf['staticVectors']['transform']['translation']['valueInitial']!=[0,0,0]:raise ValueError('Zero Particle translation required')
    for key in ['texture1','texture2']:
        t=leaf['staticVectors'][key]
        if t['scale']['valueInitial']!=[1,1,1] or any(t['translation']['valueInitial']) or any(t['rotation']['valueInitial']):
            raise ValueError('Full untransformed source UV rectangle required')
    catalog=native_catalog(apk,[shader_package]);selection=select_initial(raw,leaf,catalog)
    if selection!=request['shaderSelection']:raise ValueError('Material evidence differs from source-selected shader')
    blend_id=leaf['materialControls']['blend']['id']
    blend=dict(id=blend_id,row=catalog['renderState']['blendRows'][blend_id])
    if blend!=request['blend']:raise ValueError('Blend evidence differs from source selector')
    leaf['nativeMaterialSelection']=selection;attach_basic_material(data,authoring.read_bytes())
    if leaf['nativeBasicTint']!=request['textureTint']:raise ValueError('Basic tint differs from matched authoring')
    leaf['nativeParticleX']=dispatch
    generation={k:v for k,v in leaf['nativeGeneration'].items() if k not in ['nullLifetimeMode','rawControlBytes','boundary']}
    program=dict(profile='native-static-default-onex-basic-v1',node=leaf,parents=parents,
      simulation=dict(profile='native-particle-lifecycle-v1',generation=generation,words=seed,
        life=leaf['lifeParameter'],lifeRange=0,capacity=1,
        modules=[dict(kind='OneX',value=1,range=0),dict(kind='ColorConst',arithmetic='captured-separate-f32',value=[1,1,1],range=[0,0,0])]),
      textureTints=[[1,1,1,1]],drawBasis=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
      blend={**blend,'equation':catalog['renderState']['equation']},order=0,
      inputBoundary='Source static parameters; explicit external host and synthetic reference seed; no native computed parent/vertex input')
    template=json.loads(Path('public/assets/presentations/cloud_brave_slash/manifest.json').read_text())
    textures={}
    for name,asset in request['textures'].items():
        path=Path(asset['path']);digest=hashlib.sha256(path.read_bytes()).hexdigest()
        if digest!=asset['sha256']:raise ValueError('Texture source changed')
        destination=Path('public/assets/presentations/resources')/(digest+'.png')
        if destination.exists() and destination.read_bytes()!=path.read_bytes():raise ValueError('Texture content conflict')
        destination.write_bytes(path.read_bytes());textures[name]='/assets/presentations/resources/'+destination.name
    effect={**data,'name':source.name,'meshes':{},'textures':textures}
    plan=dict(approved=False,name=source.stem,sourceId=0,seed=1,effects=[effect],effectHorizon=leaf['lifeParameter']+2,
      rendererReference=template['plan']['rendererReference'],nativeBasicMaterial=True,
      nativeMaterialSelection=template['plan']['nativeMaterialSelection'],nativeBlend=template['plan']['nativeBlend'],
      nativeQuadBranches=dict(schema='native-quad-branches-v1',sourceSha256=request['sourceSha256'],wholeEffectSupported=False,
        branches=[],staticBasicBranches=[program]),
      rectanglePlacement=dict(unitsPerPixel=1,scatter=[0,0]),
      presentation=dict(scope='single_enemy',movement='stationary',approachFrames=0,returnFrames=12,targetOffsetX=90),
      members=[dict(effect=0,startFrame=0,anchor='target',layer='front',scalePercent=100,rotation=[0,0,0])])
    output.mkdir(parents=True,exist_ok=True);plan_bytes=json.dumps(plan,indent=2).encode();(output/'plan.json').write_bytes(plan_bytes)
    manifest=dict(schemaVersion=1,profile='bmb-preview-scene-v1',key='static_basic_control',sourceId=0,
      quality='experimental-preview',originalFidelityVerified=False,durationFrames=leaf['lifeParameter']+2,
      provenance=dict(planSha256=hashlib.sha256(plan_bytes).hexdigest(),playerSha256=hashlib.sha256(Path('src/effects/originalEffectPlayer.mjs').read_bytes()).hexdigest(),
        threeSha256=hashlib.sha256(Path('public/vendor/three-preview.js').read_bytes()).hexdigest()),plan=plan)
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(dict(nodes=len(nodes),frames=manifest['durationFrames'],source=source.name)))


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    for name in ['request','apk','output','authoring','shader-package']:p.add_argument('--'+name,type=Path,required=True)
    p.add_argument('--seed',type=int,nargs=4,required=True,help='Explicit reference seed; original global seed construction is not inferred')
    a=p.parse_args();compile_effect(a.request,a.apk,a.output,a.authoring,a.seed,a.shader_package)
