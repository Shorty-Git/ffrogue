"""Compare registered original forms around prepared foot pivots; never invent art."""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
import argparse
import hashlib
import json
import math
import sqlite3


def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()


def inspect(output):
    content=json.loads(Path('public/assets/run-content.json').read_text());results=[]
    board=Image.new('RGB',(760,len(content['forms'])*310),(7,20,45));draw=ImageDraw.Draw(board)
    with sqlite3.connect(Path('rawdata/assets/static_data/ffbe-data.db').resolve().as_uri()+'?mode=ro',uri=True)as db:
        db.row_factory=sqlite3.Row
        for row,form in enumerate(content['forms']):
            key=form['identityKey'];roots=[Path('public/assets/units')/key,Path('public')/form['assetPath']]
            manifests=[json.loads((root/'manifest.json').read_text())for root in roots]
            original=[dict(db.execute('select unitId,unitSeries,rare,maxLv from unit where unitId=?',(m['unitId'],)).fetchone())for m in manifests]
            if original[0]['unitSeries']!=original[1]['unitSeries']:raise ValueError('Different unit series')
            metadata=[m['animations']['idle']for m in manifests];images=[]
            left=math.ceil(max(a['pivotX']*a['frameWidth']for a in metadata))+2
            top=math.ceil(max(a['pivotY']*a['frameHeight']for a in metadata))+2
            width=left+math.ceil(max((1-a['pivotX'])*a['frameWidth']for a in metadata))+2
            height=top+math.ceil(max((1-a['pivotY'])*a['frameHeight']for a in metadata))+2
            for i,(root,a)in enumerate(zip(roots,metadata)):
                with Image.open(root/a['file'])as im:crop=im.convert('RGBA').crop((0,0,a['frameWidth'],a['frameHeight']))
                normalized=Image.new('RGBA',(width,height));normalized.alpha_composite(crop,(round(left-a['pivotX']*a['frameWidth']),round(top-a['pivotY']*a['frameHeight'])));images.append(normalized)
                presentation=Image.new('RGBA',normalized.size,(7,20,45,255));presentation.alpha_composite(normalized)
                scale=min(3,330/width,235/height);presentation=presentation.resize((round(width*scale),round(height*scale)),Image.Resampling.NEAREST)
                board.paste(presentation.convert('RGB'),(25+i*370,row*310+45));draw.text((25+i*370,row*310+12),f"{key} {original[i]['rare']}* / {original[i]['unitId']}",fill='white')
            differences=[]
            for bg in [0,255]:
                colored=[]
                for im in images:
                    rgb=Image.new('RGBA',im.size,(bg,bg,bg,255));rgb.alpha_composite(im);colored.append(rgb.convert('RGB'))
                differences.append(ImageChops.difference(*colored))
            visible=ImageChops.lighter(*differences);changed=sum(max(v)>0 for v in visible.get_flattened_data())
            sources=[]
            for m in manifests:
                atlas=Path('rawdata/ffbe_asset_dump/unit_animated')/f"unit_anime_{m['unitId']}.png"
                sources.append(dict(path=atlas.as_posix(),sha256=sha(atlas)))
            results.append(dict(key=key,original=original,prepared=[dict(path=(r/'manifest.json').as_posix(),sha256=sha(r/'manifest.json'))for r in roots],
              sourceAtlases=sources,alignedFirstIdle=dict(changedVisiblePixels=changed,identical=changed==0,comparison='Aligned prepared foot pivot; composited over black and white, excludes invisible RGB'),
              sheets=[dict(clip=clip,rgbaEqual=Image.open(roots[0]/manifests[0]['animations'][clip]['file']).convert('RGBA').tobytes()==Image.open(roots[1]/manifests[1]['animations'][clip]['file']).convert('RGBA').tobytes())for clip in sorted(set(manifests[0]['animations'])&set(manifests[1]['animations']))]))
    output.mkdir(parents=True,exist_ok=True);(output/'original-form-appearance.json').write_text(json.dumps(dict(forms=results,limits='Different pixels do not imply a redesigned costume. Review aligned images; no original asset is modified.'),indent=2)+'\n');board.save(output/'original-form-appearance.png');print(json.dumps([dict(key=r['key'],firstIdle=r['alignedFirstIdle'])for r in results]))


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,default=Path('tools/data/awakening-polish-20261102/forms'));inspect(p.parse_args().output)
