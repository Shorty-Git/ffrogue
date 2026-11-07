"""Reuse existing staging/parsers for a bounded candidate batch; report unsupported data explicitly."""
import argparse
import contextlib
import hashlib
import io
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from stage_original_skill import stage
from inspect_bmb import compare_project, read_bmb
from inspect_m3r import read_m3r
from bmb_source_controls import control_coverage


def audit_report_name(selection_file):
    """Named selections must not overwrite another batch's evidence."""
    return 'candidate-audit.json' if selection_file.name == 'selection.json' else selection_file.stem + '-audit.json'


def verify_staged_identity(output, source):
    """Recheck cached payloads rather than trusting an unchanged report alone."""
    for original in source['originals']:
        report=json.loads((output/'effects'/Path(original['member']).stem/'resources.json').read_text(encoding='utf-8'))
        inputs=[(report['source'],original['sha256'])]+[(r['output'],r['sha256']) for r in report['resources']]
        for name,expected in inputs:
            path=Path(name).resolve()
            if not path.is_relative_to(output.resolve()) or hashlib.sha256(path.read_bytes()).hexdigest()!=expected:
                raise ValueError('Cached source/resource identity mismatch: '+name)


def audit(selection_file):
    base=selection_file.resolve().parent
    if not base.is_relative_to(Path('tools/data').resolve()):raise ValueError('Ignored candidate directory required')
    selection=json.loads(selection_file.read_text(encoding='utf-8'))['selection'];results=[]
    for item in selection:
        output=base/(item['character']+'-'+str(item['sourceId']));blockers=[];effects=[];log=io.StringIO();reused=False;source={}
        inspection=json.loads(Path(item['report']).read_text(encoding='utf-8'))
        selected=[s for s in inspection['catalog'] if s['id']==item['sourceId'] and s['kind']==item['kind']]
        if len(selected)!=1:raise ValueError('Exact inspected ownership required')
        try:
            if item.get('intakeBlockers'):
                raise ValueError('Unresolved complete composition: ' + '; '.join(item['intakeBlockers']))
            receipt=output/'skill-source.json'
            if receipt.exists() and json.loads(receipt.read_text())['inspectionSha256']==hashlib.sha256(Path(item['report']).read_bytes()).hexdigest():
                reused=True
            else:
                with contextlib.redirect_stdout(log):
                    stage(Path(item['report']),item['sourceId'],item['kind'],Path('tools/data/android-cpk-audit/members.jsonl'),output,Path('ffbe_asset_dump-main/tools/cpk.py'))
            source=json.loads(receipt.read_text(encoding='utf-8'))
            verify_staged_identity(output,source)
            if any(branch.get('conditional') for branch in source['skill']['effects']):
                blockers.append('command:unresolved-process-indexed-effects')
            for original in source['originals']:
                report=json.loads((output/'effects'/Path(original['member']).stem/'resources.json').read_text(encoding='utf-8'))
                source_bytes=Path(report['source']).read_bytes()
                structure=read_bmb(source_bytes);nodes=structure['nodes']
                authoring=Path('assets/battle_effect')/Path(original['member']).with_suffix('.bmsln')
                local=[]
                if not authoring.exists():local.append('missing-matched-authoring')
                else:
                    try:
                        compare_project(structure,authoring.read_bytes())
                        xml=ET.fromstring(authoring.read_bytes()).findall('.//ResIdeNode')[1:]
                        nonpoint=[i for i,n in enumerate(xml) if n.findtext('GenerateShape_Basic_GenerateShapeType')!='Point']
                        if nonpoint:local.append('unsupported-emission-shape-nodes:'+','.join(map(str,nonpoint)))
                    except (ValueError,KeyError) as error:local.append('authoring-comparison:'+str(error))
                for node in nodes:
                    if node['typeId'] not in [0,2,3,6]:local.append('unsupported-node-type:'+str(node['typeId']))
                    mode=node.get('materialControls',{}).get('textureCombination',{}).get('name')
                    if mode and mode not in ['Basic','Add','Distortion']:local.append('unsupported-material:'+str(mode))
                    if any(m['name'].startswith('Unknown') for m in node.get('motionModes',{}).values()):local.append('unknown-motion-enum')
                groups={}
                for resource in report['resources']:
                    groups.setdefault(resource['candidate'],set()).add(resource['sha256'])
                    if resource['output'].endswith('.m3r'):
                        try:read_m3r(Path(resource['output']).read_bytes())
                        except ValueError as error:local.append('unsupported-mesh:'+str(error))
                if any(len(values)>1 for values in groups.values()):local.append('ambiguous-source-resource-versions')
                local=list(dict.fromkeys(local))
                controls=control_coverage(nodes, source_bytes)
                if not authoring.exists():
                    missing=sorted({field for row in controls['nodes'] for field in row['missing']})
                    local.append('unresolved-binary-controls:'+','.join(missing+['compatibility','emission','texture-tint/mapping','geometry-selectors']))
                from original_flat_quad_color import quad_color_preparation_hints
                colors=quad_color_preparation_hints(source_bytes,structure)
                effects.append(dict(name=original['member'],sha256=original['sha256'],nodes=len(nodes),blockers=local,sourceControls=controls,
                                    colorPreparation=colors))
                blockers.extend(original['member']+':'+reason for reason in local)
        except (ValueError,KeyError,OSError) as error:blockers.append('staging:'+str(error))
        output.mkdir(parents=True,exist_ok=True)
        if not reused:(output/'stage.log').write_text(log.getvalue())
        command=source.get('skill',selected[0])
        raw=command.get('raw',{})
        results.append({**item,'status':'blocked' if blockers else 'needs-prepared-plan-and-combat-review',
            'reusedUnchangedStaging':reused,'effects':effects,'blockers':blockers,'playable':False,
            'commandReview':dict(processId=raw.get('processId'),processParam=raw.get('processParam'),
                sourceTarget=raw.get('target'),sourceMove=raw.get('moveType'),sourceMotion=raw.get('motionType'),
                learningRequirements=command.get('learned',[]),automaticDamageApproval=False),
            'remainingGates':['command/process and form review','prepared semantic plan','combat and visual acceptance']})
    result=dict(schema='source-import-candidate-audit-v1',candidates=results,
      limits=['Source staging is not renderer admission, complete support or visual approval.',
              'No skill/catalog/resource publication; existing character execution stays unchanged.',
              'Only explicit blockers are classified; missing Prepared/native evidence remains review work.'])
    (base/audit_report_name(selection_file)).write_text(json.dumps(result,indent=2))
    print(json.dumps([dict(character=r['character'],name=r['name'],status=r['status'],blockers=r['blockers']) for r in results],indent=2))


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--selection',type=Path,required=True);a=p.parse_args();audit(a.selection)
