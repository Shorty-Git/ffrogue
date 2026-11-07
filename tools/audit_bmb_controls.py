"""Compare bounded binary control fields against an explicit matched-pair corpus."""
import argparse
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from inspect_bmb import read_bmb, compare_project
from bmb_source_controls import compare_source_controls, control_coverage, read_intake_controls, TAGS
import struct


def compare_intake_pair(binary, xml):
    """Verify only intake controls on a structurally matched pair, not playback."""
    data = read_bmb(binary)
    root = ET.fromstring(xml)
    sources = root.findall('.//ResIdeNode')
    if not sources or sources[0].findtext('Basic_Meta_Name'):
        raise ValueError('Expected leading authoring template')
    sources = sources[1:]
    wrappers = [e for e in root.iter() if e is not root and e.find('ResIdeNode') is not None]
    if len(sources) != len(data['nodes']) or len(wrappers) != len(sources):
        raise ValueError('Intake pair node count differs')
    indexes = {id(w): i for i, w in enumerate(wrappers)}
    parents = {}
    for i, wrapper in enumerate(wrappers):
        for child in wrapper.findall('ChildList/*'):
            if id(child) not in indexes:
                raise ValueError('Unknown intake hierarchy child')
            parents[indexes[id(child)]] = i
    count, fields = 0, {}
    for node, source in zip(data['nodes'], sources):
        if (node['type'] != source.findtext('Basic_Meta_NodeType')
                or not data['hierarchy']['decoded']
                or node['parentIndex'] != parents.get(node['index'])):
            raise ValueError('Intake pair node type/order/parent differs')
        for name, tag in [('lifeParameter', 'Basic_Basic_Life'),
                          ('lifeRangeParameter', 'Basic_Basic_LifeRange')]:
            if node[name] != int(source.findtext(tag)):
                raise ValueError('Intake pair lifetime differs')
        for name, field in read_intake_controls(binary, node).items():
            expected = source.findtext(TAGS[name])
            if expected is None or field['status'] != 'decoded':
                raise ValueError('Missing or unresolved intake control: ' + name)
            equal = (struct.pack('<f', float(expected)) == struct.pack('<f', field['value'])
                     if isinstance(field['value'], float) else expected == field['value'])
            if not equal:
                raise ValueError('Intake source control differs: ' + name)
            key = str(node['typeId']) + ':' + name
            fields[key] = fields.get(key, 0) + 1
            count += 1
    resources = {(kind, name) for source in sources for tag, kind in [
        ('Texture_Layer1_PictureName', 'texture'), ('Texture_Layer2_PictureName', 'texture'),
        ('Model_Basic_ModelName', 'model')] if (name := source.findtext(tag))}
    if resources != {(r['kind'], r['name']) for r in data['resources']}:
        raise ValueError('Intake pair typed resource sets differ')
    return dict(nodes=len(sources), intakeFieldsChecked=count, fieldCounts=fields,
                structuralPairValidated=True, wholeProjectCompared=False)


def audit(corpus, output, intake_only=False):
    if not output.resolve().is_relative_to(Path('tools/data').resolve()):
        raise ValueError('Ignored output required')
    rows = json.loads(corpus.read_text(encoding='utf-8'))['pairs']
    results = []
    for row in rows:
        path, project = Path(row['binary']), Path(row['authoring'])
        binary, xml = path.read_bytes(), project.read_bytes()
        if hashlib.sha256(binary).hexdigest() != row['sha256']:
            raise ValueError('Changed original: ' + str(path))
        if intake_only:
            results.append(dict(binary=path.as_posix(), sha256=row['sha256'], authoring=project.as_posix(),
                authoringSha256=hashlib.sha256(xml).hexdigest(), **compare_intake_pair(binary, xml)))
            continue
        data = read_bmb(binary)
        project_comparison = compare_project(data, xml)
        sources = ET.fromstring(xml).findall('.//ResIdeNode')[1:]
        comparisons = [dict(node=n['index'], typeId=n['typeId'],
            checked=compare_source_controls(n,s,data=binary),
            fields={**n['sourceControls']['fields'], **read_intake_controls(binary,n)})
            for n,s in zip(data['nodes'],sources)]
        results.append(dict(binary=path.as_posix(), sha256=row['sha256'], authoring=project.as_posix(),
            authoringSha256=hashlib.sha256(xml).hexdigest(), nodes=comparisons,
            projectComparison=project_comparison,
            coverage=control_coverage(data['nodes'], binary)))
    if intake_only:
        report = dict(schema='bmb-intake-control-comparison-v1', pairs=len(results),
            nodes=sum(r['nodes'] for r in results), values=sum(r['intakeFieldsChecked'] for r in results),
            differences=[], results=results, newlyPlayableSkills=0, authoringFreePreparationSupported=False,
            parserInputs={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in [
                'tools/inspect_bmb.py', 'tools/bmb_source_controls.py', 'tools/audit_bmb_controls.py']},
            limits=['Structural match and intake controls only; not full project/material/curve validation.',
                    'Does not replace strict control-audit receipts or authorize publication.'])
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(json.dumps({k:v for k,v in report.items() if k != 'results'}))
        return report
    report = dict(schema='bmb-source-control-comparison-v1', pairs=len(results),
        nodes=sum(len(r['nodes']) for r in results),
        values=sum(n['checked'] for r in results for n in r['nodes']), differences=[], results=results,
        parserInputs={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in [
            'tools/inspect_bmb.py','tools/bmb_channels.py','tools/bmb_parameters.py',
            'tools/bmb_materials.py','tools/bmb_source_controls.py']},
        newlyPlayableSkills=0, authoringFreePreparationSupported=False,
        limits=['Existing matching projects verify serialized fields, not full native runtime semantics.',
                'Other inheritance selectors, compatibility, appearance, emission and texture controls remain gated.',
                'No existing published plan was replaced or regenerated.'])
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='results'}))


if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--corpus',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    p.add_argument('--intake-only',action='store_true',help='Bounded field comparison; never a strict publication/control receipt')
    a=p.parse_args();audit(a.corpus,a.output,a.intake_only)
