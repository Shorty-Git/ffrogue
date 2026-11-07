"""Read-only stage availability and bounded animation support; no guessed world joins."""
from pathlib import Path
import argparse
import hashlib
import json
import sqlite3
import struct
from PIL import Image
from ssbp_v1 import Project
from prepare_stage_animation import render_frame

ROOT=Path('ffbe_asset_dump-main/battle_bg')
SELECTED=['2013_01','2013_02','2013_03','2013_04','2013_05','2013_06','2013_07','2013_08','2013_13','2013_16','2006_01','2016_03']


def info(p):
    return dict(path=p.as_posix(),exists=p.is_file(),bytes=p.stat().st_size if p.is_file()else None,
                sha256=hashlib.sha256(p.read_bytes()).hexdigest()if p.is_file()else None)


def inventory(output):
    database=Path('assets/static_data/ffbe-data.db')
    with sqlite3.connect(database.resolve().as_uri()+'?mode=ro',uri=True)as db:
        db.row_factory=sqlite3.Row
        backgrounds=[dict(r)for r in db.execute('select * from battle_bg')]
        mainline=[dict(r)for r in db.execute('select * from game_title where gameTitleId between 10001 and 10016')]
        mission_refs={r[0]:r[1]for r in db.execute('select battleBgId,count(*) from mission group by battleBgId')}
        catalog=[]
        for row in backgrounds:
            image=ROOT/row['fileInfo'];spec=row['Dc5w1Yda']or'';name=spec.split('#')[0];binary=ROOT/name if name else None
            header=binary.open('rb').read(8)if binary and binary.is_file()else b''
            catalog.append(dict(master=row,image=info(image),animation=info(binary)if binary else None,
                literalVersion=struct.unpack_from('<I',header,4)[0]if header[:4]==b'SSPB'else None,
                localMissionReferences=mission_refs.get(row['battleBgId'],0),origin='No gameTitleId/world join present in battle_bg'))
        selected=[]
        for stem in SELECTED:
            full='battle_bg_'+stem
            record=dict(stem=full,master=[r for r in backgrounds if r['fileInfo']==full+'.jpg'],image=info(ROOT/(full+'.jpg')),animation=info(ROOT/(full+'.ssbp')))
            try:
                with Image.open(ROOT/(full+'.jpg'))as im:record['image']['size']=im.size;record['image']['format']=im.format
                p=Project(ROOT/(full+'.ssbp'));packs={}
                for key,a in p.animations.items():
                    states=[s for f in a['frames']for s in f]
                    result=dict(frames=a['count'],fps=a['fps'],parts=len(a['parts']),deformedRecords=sum('vertices'in s for s in states),
                      colorRecords=sum('color'in s for s in states),instanceParts=sum(part['type']==3 for part in a['parts']))
                    try:
                        for frame in range(a['count']):render_frame(p,key,frame)
                        result.update(profile='supported-packets',blocker=None)
                    except ValueError as e:result.update(profile='blocked',blocker=str(e))
                    packs[key]=result
                record['packs']=packs;record['atlases']=[]
                for image in sorted(set(c['image']for c in p.cells)):
                    atlas=info(ROOT/image)
                    if atlas['exists']:
                        with Image.open(ROOT/image)as im:atlas['size']=im.size;atlas['alphaExtrema']=im.convert('RGBA').getchannel('A').getextrema()
                    record['atlases'].append(atlas)
            except Exception as e:record['inspectionBlocker']=str(e)
            record['publication']='Published only for2013_02; others are intake, not approved stages'
            record['audio']={'musicResource':None,'soundCues':[],'status':'No authenticated stage-to-music join; filenames not treated as sound IDs'}
            selected.append(record)
        enemies=[]
        names=['Air Buster','Guard Scorpion','Sweeper','Reno','Rude','Abzu','Magitek Armor','Kefka','Imperial Soldier','Ghirofelgo','Yin & Yang','Lost Number','Elvoret','G-Soldier','Elite Soldier','X-ATM092']
        for name in names:
            for r in db.execute('select d.*,e.explainShort from monster_dictionary d left join monster_dictionary_explain e using(dictionaryId) where d.name=?',(name,)):
                data=dict(r);sprite=str(data['dictionaryId'])
                files=[Path('ffbe_asset_dump-main/monster_animated')/f'monster_anime_{sprite}.png',
                    Path('ffbe_asset_dump-main/monster_animated_csv')/f'monster_cgg_{sprite}.csv']
                files += [Path('ffbe_asset_dump-main/monster_animated_csv')/f'monster_{clip}_cgs_{sprite}.csv'for clip in ['idle','atk']]
                enemies.append(dict(original=data,bodyCandidates=[info(f)for f in files],allBodyCandidatesPresent=all(f.is_file()for f in files),
                  status='Exact dictionary ID filename candidates, not assembled/validated bodies or original stage encounters'))
        report=dict(schema='stage-candidates-v1',database=info(database),mainlineTitleCatalog=mainline,backgrounds=catalog,selected=selected,enemies=enemies,
          reviewedProposals=json.loads(Path('tools/stages/mainline-candidates.json').read_text()),
          counts=dict(masterBackgrounds=len(backgrounds),localJpgs=len(list(ROOT.glob('*.jpg'))),localSsbps=len(list(ROOT.glob('*.ssbp'))),
            exactImageRowsPresent=sum(r['image']['exists']for r in catalog),animationRowsPresent=sum(bool(r['animation']and r['animation']['exists'])for r in catalog)),
          limits=['FFI–XVI title metadata is not a stage ownership join. No title inferred from numeric basename.',
            'The monster dictionary default battleBgId is not proof of an original mainline encounter.',
            'Selected profile support is export capability, not reviewed arena framing, publication or original pixel fidelity.',
            'FFVII reactor visual/theme identification is reviewed; other world labels require independent evidence.'])
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
    print(json.dumps(dict(counts=report['counts'],selected=[dict(stem=r['stem'],packs=r.get('packs'),blocker=r.get('inspectionBlocker'))for r in selected])))


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,default=Path('tools/data/awakening-polish-20261102/stage-candidates.json'));inventory(p.parse_args().output)
