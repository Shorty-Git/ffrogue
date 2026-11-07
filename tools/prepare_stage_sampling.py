"""Reviewed FFRogue soft-cell sampling; preserves all original stage packets.

Copies exact cell pixels with an extruded gutter. No blur, color edit, rescale,
source overwrite or claim about the original FFBE sampler state.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image


def prepare(root, names):
    path=root/'animation.json'
    data=json.loads(path.read_text())
    if data.get('sampling'):
        raise ValueError('Prepare from the unsampled original packet export first')
    selected=[]
    for name in names:
        matches=[(i,c) for i,c in enumerate(data['cells']) if c['name']==name]
        if len(matches)!=1:
            raise ValueError('Unique reviewed cell required: '+name)
        index,cell=matches[0]
        with Image.open(root/cell['image']) as atlas:
            crop=atlas.convert('RGBA').crop((cell['x'],cell['y'],cell['x']+cell['width'],cell['y']+cell['height']))
        w,h=crop.size;gutter=2
        padded=Image.new('RGBA',(w+2*gutter,h+2*gutter));padded.paste(crop,(gutter,gutter))
        # Clamp-to-cell sampling without adjacent atlas colors/alpha.
        for y in range(-gutter,h+gutter):
            for x in range(-gutter,w+gutter):
                if not(0<=x<w and 0<=y<h):
                    padded.putpixel((x+gutter,y+gutter),crop.getpixel((min(w-1,max(0,x)),min(h-1,max(0,y)))))
        file=f'soft-cell-{index}.png';padded.save(root/file)
        texture=len(data['textures']);data['textures'].append(dict(file=file,width=padded.width,height=padded.height,sha256=hashlib.sha256((root/file).read_bytes()).hexdigest(),filter='linear'))
        selected.append(dict(cell=index,texture=texture,rect=[gutter,gutter,w,h],originalImage=cell['image'],originalRect=[cell['x'],cell['y'],w,h],rgbaSha256=hashlib.sha256(crop.tobytes()).hexdigest()))
    data['sampling']=dict(policy='ffrogue-reviewed-soft-cells-v1',provenance='FFRogue presentation adaptation; original native sampler state unmeasured',cells=selected)
    path.write_text(json.dumps(data,separators=(',',':'))+'\n')
    return data


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,required=True)
    choice=p.add_mutually_exclusive_group(required=True);choice.add_argument('--cells',nargs='+');choice.add_argument('--recipe',type=Path);a=p.parse_args()
    recipe=json.loads(a.recipe.read_text())if a.recipe else None
    if recipe and(recipe.get('schema')!='reviewed-stage-sampling-v1' or recipe.get('policy')!='ffrogue-reviewed-soft-cells-v1'):
        raise ValueError('Reviewed sampling recipe required')
    r=prepare(a.root,recipe['cells']if recipe else a.cells);print(json.dumps(r['sampling']))
