"""Bounded local audio inventory; no decoding, playback, filename-to-skill inference or publication."""
import argparse,collections,hashlib,importlib.util,json,wave
from pathlib import Path

def audit(output, live_hash=None):
 root=Path('rawdata/memorial-packs');banks=[];headers=collections.Counter();streams=[]
 for path in sorted(root.rglob('*')):
  if not path.is_file() or path.suffix.lower() not in ['.acb','.dat']:continue
  with path.open('rb') as file:magic=file.read(4)
  headers[path.suffix+':'+magic.hex()]+=1
  row=dict(path=path.as_posix(),bytes=path.stat().st_size,magicHex=magic.hex())
  (banks if path.suffix=='.acb' else streams).append(row)
 waves=[]
 for path in sorted(Path('rawdata/assets/audio').rglob('*.wav')):
  with wave.open(str(path),'rb') as sound:
   row=dict(path=path.as_posix(),channels=sound.getnchannels(),sampleRate=sound.getframerate(),sampleBytes=sound.getsampwidth(),durationSeconds=sound.getnframes()/sound.getframerate(),frames=sound.getnframes())
  row['sha256']=hashlib.sha256(path.read_bytes()).hexdigest();waves.append(row)
 se=next(Path(r['path']) for r in banks if Path(r['path']).name=='SE.acb');raw=se.read_bytes()
 spec=importlib.util.spec_from_file_location('existing_cpk','rawdata/ffbe_asset_dump/tools/cpk.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
 try:
  table,rows=reader.read_utf(raw);cue=dict(compatible=True,table=table,columns=list(rows[0]),bankCueMappingVerified=False)
 except (ValueError,IndexError,KeyError) as error:
  cue=dict(compatible=False,error=type(error).__name__+': '+str(error),bankCueMappingVerified=False,
   boundary='Existing CPK UTF reader did not parse this ACB header; no cue/file mapping claimed. ACB-compatible table reading is a future parser requirement.')
 links=[]
 for file in ['tools/data/cross-slash-playable-20261028/candidates/cloud-214830/skill-source.json','tools/data/skill-expansion-20261028/seal-source/skill-source.json']:
  source=json.loads(Path(file).read_text(encoding='utf-8'));skill=source['skill']
  groups=[dict(group=g['groupId'],frame=g['startFrame'],soundsRaw=g['soundsRaw'],status=g['status']) for b in skill['effects'] for g in b['groups'] if g.get('soundsRaw')]
  links.append(dict(skillId=skill['id'],name=skill['name'],groups=groups,bankDispatchVerified=False))
 actual=hashlib.sha256(raw).hexdigest();expected=live_hash
 result=dict(schema='ffbe-audio-inventory-v1',cachedAcbFiles=len(banks),utfBankCandidates=sum(r['magicHex']=='40555446' for r in banks),unclassifiedAcbFiles=sum(r['magicHex']!='40555446' for r in banks),adjacentUnclassifiedDatFiles=len(streams),headers=dict(headers),banks=banks,unclassifiedDatFiles=streams,waves=waves,
  se=dict(path=se.as_posix(),sha256=actual,liveExternalHash=expected,liveBytesMatch=(actual==expected if expected else None),liveHashOrigin="Caller-supplied ADB checksum; this audit never contacts the emulator",metadataReader=cue),effectGroupReferences=links,
  limits=['Counts describe the preserved local assetpack snapshot; only SE.acb was independently hash-checked against current FFBE Trace external storage.',
   'ADB external storage readable; private run-as access failed. No reinstall, app changes, hooks or new recordings.',
   'Original codec inside UTF bank candidates is unestablished. Two .acb files have XML headers and are not validated banks; adjacent .dat files are UNCLASSIFIED, not confirmed audio. No decoding/decryption/export attempted.',
   'Known WAV paths are inventory only. They are not assigned to skills by basename.',
   'Group frames and opaque sound IDs are source metadata, not measured native playback or a proven CRI CueID join. Skill SFX, music and ambience remain separate future systems.'])
 output=output.resolve()
 if not output.is_relative_to(Path('tools/data').resolve()):raise ValueError('Ignored research output required')
 output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(result,indent=2),encoding='utf-8')
 print(json.dumps(dict(acbFiles=len(banks),utfBankCandidates=sum(r['magicHex']=='40555446' for r in banks),unclassifiedDatFiles=len(streams),wav=len(waves),seLiveBytesMatch=(actual==expected if expected else None),cueMappingVerified=False)))
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);p.add_argument('--live-se-sha256');args=p.parse_args();audit(args.output,args.live_se_sha256)
