"""Read-only global ownership/resource census; no availability-to-playability inference."""
import argparse,collections,hashlib,json,re,sqlite3
from pathlib import Path


def inventory(database,index,output):
    if not output.resolve().is_relative_to(Path('tools/data').resolve()):raise ValueError('Ignored output directory required')
    output.mkdir(parents=True,exist_ok=True)
    db=sqlite3.connect(database.resolve().as_uri()+'?mode=ro',uri=True);db.row_factory=sqlite3.Row
    units=[dict(r) for r in db.execute('SELECT unitId,unitSeries,unitName,limitBurstId FROM unit')]
    series=collections.defaultdict(list)
    for row in units:series[row['unitSeries']].append(row)
    commands={}
    for kind,table,key,where in [('ABILITY','ability','abilityId','WHERE abilityType=2'),('MAGIC','magic','magicId',''),('LIMITBURST','limitburst','limitBurstId','')]:
        for r in db.execute('SELECT * FROM '+table+' '+where):commands[(kind,r[key])]=dict(r)
    owners=collections.defaultdict(set);unknown=[]
    for row in db.execute('SELECT unitSeriesId,abilityId,magicId FROM unit_series_lv_acquire'):
        if row['unitSeriesId'] not in series:continue
        for kind,field in [('ABILITY','abilityId'),('MAGIC','magicId')]:
            for value in str(row[field] or '').split(','):
                if not value:continue
                if not value.isdecimal():unknown.append({'series':row['unitSeriesId'],'kind':kind,'raw':value});continue
                key=(kind,int(value))
                if key in commands:owners[key].add(row['unitSeriesId'])
                elif kind=='MAGIC' or not db.execute('SELECT 1 FROM ability WHERE abilityId=?',(int(value),)).fetchone():
                    unknown.append({'series':row['unitSeriesId'],'kind':kind,'id':int(value),'reason':'missing master row'})
    for u in units:
        if ('LIMITBURST',u['limitBurstId']) in commands:owners[('LIMITBURST',u['limitBurstId'])].add(u['unitSeries'])
    groups={r['effectGroupId']:dict(r) for r in db.execute('SELECT * FROM effect_group')}
    effects={r['effectId']:dict(r) for r in db.execute('SELECT * FROM effect')};db.close()
    archive_members=collections.defaultdict(list)
    for line in index.read_text(encoding='utf-8').splitlines():
        r=json.loads(line)
        if '/battleEffect/' in r['archive'].replace('\\','/'):archive_members[r['name']].append(r['archive'])
    published={};registry=json.loads(Path('public/assets/content.json').read_text())
    units_by_id={str(r['unitId']):r for r in units}
    for name in registry['characters']:
        recipe=json.loads(Path('tools/characters',name+'.json').read_text());unit=units_by_id[recipe['spriteUnitId']]
        for s in json.loads(Path('public/assets/units',name,'skills.json').read_text())['skills']:
            if s.get('scenePresentation') and s.get('importStatus')=='imported':
                published[(s.get('type','ABILITY'),s['ffbeId'],unit['unitSeries'])]={'character':name,'skill':s['id'],'scene':s['scenePresentation']}
    # Reuse bounded, source-identified intake receipts. They are not global support proofs.
    receipt_files=[
      *Path('tools/data/cross-slash-playable-20261028').glob('candidates/candidate-audit.json'),
      *Path('tools/data/skill-expansion-20261028').glob('*/candidate-audit.json'),
      *Path('tools/data/import-decision-20261028').glob('*/candidate-audit.json'),
      *Path('tools/data/skill-seven-eight-20261028').glob('*audit.json'),
      *Path('tools/data/skill-seven-eight-20261028/automatic-selection').glob('candidate-audit.json')]
    reviewed={}
    for p in sorted(receipt_files):
        for row in json.loads(p.read_text(encoding='utf-8')).get('candidates',[]):
            key=(row.get('kind','ABILITY'),row['sourceId']);value={'file':p.as_posix(),'blockers':row['blockers'],'status':row['status']}
            if key not in reviewed or len(value['blockers'])>len(reviewed[key]['blockers']):reviewed[key]=value
    records=[];pair_counts=collections.Counter();unique_counts=collections.Counter();blockers_count=collections.Counter()
    for key,owned in sorted(owners.items()):
        raw=commands[key];timeline=raw.get('effectFrames') if key[0]!='LIMITBURST' else raw.get('effectFrame')
        files=set();data_gaps=[];mechanics=[];group_count=0;sound_only=0
        if not timeline:mechanics.append('command-without-effect-timeline:dispatch-not-reconstructed')
        else:
            if '@' in timeline:mechanics.append('process-indexed-effect-lanes')
            for token in re.split(r'[@&,]',timeline):
                fields=token.split(':')
                if len(fields)<3 or not fields[1].isdecimal():data_gaps.append('unclassified-timeline-entry');continue
                g=groups.get(int(fields[1]));group_count+=1
                if g is None:data_gaps.append('missing-effect-group');continue
                if not g['effectData']:
                    if g.get('1fVZ3rKd') and not g.get('rPHs9p8F'):sound_only+=1
                    else:mechanics.append('non-file-group:dispatch-not-reconstructed')
                    continue
                for token in re.split(r'[&,]',g['effectData']):
                    fields=token.split(':');e=effects.get(int(fields[1])) if len(fields)>1 and fields[1].isdecimal() else None
                    if not e or not e.get('fileInfo'):data_gaps.append('missing-effect-record');continue
                    files.add(e['fileInfo'].split(':')[0])
        absent=[name for name in sorted(files) if not archive_members.get(name)]
        if absent:data_gaps.append('original-not-indexed-in-selected-cpk-backup')
        evidence=reviewed.get(key)
        if evidence:mechanics.extend(evidence['blockers'])
        if key[0]=='LIMITBURST':mechanics.append('limit-burst-command-profile-not-implemented')
        base_status='not-reliably-assessed'
        if mechanics:base_status='blocked-by-known-mechanisms'
        if evidence and not evidence['blockers']:base_status='partially-prepared'
        if data_gaps:base_status='not-reliably-assessed'
        published_for=[s for s in sorted(owned) if (*key,s) in published]
        statuses={str(s):'fully-playable' if s in published_for else base_status for s in sorted(owned)}
        pair_counts.update(statuses.values());unique_counts['fully-playable' if published_for else base_status]+=1
        families=set()
        for reason in set(mechanics):
            if 'missing-matched-authoring' in reason:family='authoring-independent-inputs'
            elif 'unsupported-node-type:' in reason:family='node-type:'+reason.rsplit(':',1)[1]
            elif 'curve' in reason.lower():family='active-curves'
            elif 'versions' in reason:family='resource-versions'
            elif 'material' in reason:family='material-controls'
            else:family=reason.split(':')[0]
            families.add(family)
        blockers_count.update(families)
        records.append({'kind':key[0],'id':key[1],'name':raw.get('name'),'ownerSeries':sorted(owned),'publishedForSeries':published_for,
            'statusBySeries':statuses,'scope':'Series learning, not equipment/quest eligibility for each form',
            'effectGroups':group_count,'soundOnlyGroups':sound_only,'originalFiles':sorted(files),
            'indexedOriginalCount':len(files)-len(absent),'unindexedOriginals':absent,
            'matchedAuthoringFiles':[name for name in sorted(files) if Path('assets/battle_effect',Path(name).with_suffix('.bmsln')).exists()],
            'knownBlockers':sorted(set(mechanics)),'dataGaps':sorted(set(data_gaps)),'existingIntake':evidence,
            'hasExistingIntakeEvidence':bool(evidence),'fullyImportableUnpublished':False})
    sprite_ids={p.stem.removeprefix('unit_anime_') for p in Path('ffbe_asset_dump-main/unit_animated').glob('unit_anime_*.png')}
    characters=[{'seriesId':sid,'names':sorted({u['unitName'] for u in us}),'forms':[u['unitId'] for u in us],
        'formsWithLocalSprite':[u['unitId'] for u in us if str(u['unitId']) in sprite_ids],
        'knownActiveCommands':sum(sid in owned for owned in owners.values())} for sid,us in sorted(series.items())]
    for category in ['fully-playable','fully-importable-unpublished','partially-prepared','blocked-by-known-mechanisms','not-reliably-assessed']:
        pair_counts.setdefault(category,0);unique_counts.setdefault(category,0)
    summary={'schema':'ffbe-source-census-v1','database':{'file':database.as_posix(),'sha256':hashlib.sha256(database.read_bytes()).hexdigest()},
        'resourceIndex':{'file':index.as_posix(),'sha256':hashlib.sha256(index.read_bytes()).hexdigest()},'masterUnitForms':len(units),'masterUnitSeries':len(series),'formsWithLocalSprite':sum(str(u['unitId']) in sprite_ids for u in units),
        'uniqueOwnedLearnedActiveAbilitiesAndMagic':sum(k[0]!='LIMITBURST' for k in owners),
        'uniqueOwnedLimitBursts':sum(k[0]=='LIMITBURST' for k in owners),'uniqueOwnedOriginalCommands':len(owners),
        'seriesCommandPairs':sum(len(v) for v in owners.values()),'pairCategories':dict(pair_counts),'uniqueCommandCategories':dict(unique_counts),
        'fullyImportableUnpublishedConfirmed':0,'existingIntakeUniqueCommands':len(reviewed),'unknownAcquisitionReferences':len(unknown),
        'blockerIncidencesNotGuaranteedUnlocks':dict(blockers_count),
        'limits':['Read-only census; no mass raw extraction or publication.',
          'Indexed original bytes/PNG/model dependencies not newly decoded or version-hash-verified for unreviewed commands.',
          'File/authoring presence is not proof of renderer support. Fully importable requires complete preparation and reviewed gameplay.',
          'Published status belongs to the tested character-series/command pair, not every other owner of a shared command.',
          'Series learning and limit-burst links covered; equipment, upgrades, quest unlocks and cooldown child ownership remain separate.']}
    (output/'inventory.json').write_text(json.dumps({'summary':summary,'characters':characters,'commands':records,'unknownAcquisitions':unknown},indent=2),encoding='utf-8')
    (output/'summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8');print(json.dumps(summary,indent=2))


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--database',type=Path,default=Path('assets/static_data/ffbe-data.db'))
    p.add_argument('--index',type=Path,default=Path('tools/data/android-cpk-audit/members.jsonl'));p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();inventory(a.database,a.index,a.output)
