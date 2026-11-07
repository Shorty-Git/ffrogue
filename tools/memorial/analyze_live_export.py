"""Validate and inspect isolated GPU readback; never publish it as a skill."""
import argparse
import hashlib
import json
from pathlib import Path
import re

from PIL import Image, ImageChops, ImageDraw
from prepare_diagnostic import EXPECTED_NATIVE


def analyze(manifest_path, output):
    manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    if manifest.get('nativeSha256')!=EXPECTED_NATIVE or manifest.get('status')!='gpu-mirrored' or manifest.get('approved') is not False:
        raise ValueError('Expected unpublished pinned GPU-mirror receipt')
    width,height=manifest['width'],manifest['height']
    if any(type(v) is not int or not 1<=v<=2560 for v in (width,height)) or not manifest.get('commands'):
        raise ValueError('Invalid size or missing original GPU command provenance')
    if not output.resolve().is_relative_to(Path('tools/data').resolve()):
        raise ValueError('Analysis must stay under tools/data')
    images={};records=[]
    output.mkdir(parents=True,exist_ok=True)
    for item in manifest['outputs']:
        name=item['file'];background=item['background']
        if background not in ('transparent','black','white') or background in images or not re.fullmatch(r'[A-Za-z0-9_-]+\.rgba',name):
            raise ValueError('Invalid output identity')
        raw=(manifest_path.parent/name).read_bytes()
        if len(raw)!=width*height*4 or item['bytes']!=len(raw) or item['framebufferStatus']!=0x8cd5:
            raise ValueError('Readback size or framebuffer status differs')
        image=Image.frombytes('RGBA',(width,height),raw).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        images[background]=image
        image.save(output/(background+'.png'))
        records.append(dict(background=background,sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw),
                            alphaExtrema=image.getchannel('A').getextrema(),rgbExtrema=image.convert('RGB').getextrema()))
    if set(images)!=set(('transparent','black','white')):
        raise ValueError('All three backgrounds required')
    black=images['black'].convert('RGB');white=images['white'].convert('RGB')
    bbox=black.getbbox()
    transparent_delta=ImageChops.difference(images['transparent'].convert('RGB'),black)
    transmission=ImageChops.subtract(white,black)
    r,g,b=transmission.split()
    spread=ImageChops.subtract(ImageChops.lighter(ImageChops.lighter(r,g),b),ImageChops.darker(ImageChops.darker(r,g),b))
    colored_pixels=sum(spread.histogram()[3:])
    png_white=Image.alpha_composite(Image.new('RGBA',(width,height),(255,255,255,255)),images['transparent']).convert('RGB')
    png_error=ImageChops.difference(png_white,white)
    pr,pg,pb=png_error.split()
    mismatch=ImageChops.lighter(ImageChops.lighter(pr,pg),pb)
    result=dict(approved=False,token=manifest['token'],file=manifest['file'],drawIndex=manifest['drawIndex'],
                size=[width,height],gpuCommands=len(manifest['commands']),readbacks=records,
                blackRgbBoundingBox=bbox,transparentVsBlackRgbMax=max(v[1] for v in transparent_delta.getextrema()),
                coloredTransmissionPixels=colored_pixels,
                standardPngOverWhiteMaxError=max(v[1] for v in png_error.getextrema()),
                standardPngOverWhitePixelsAbove2=sum(mismatch.histogram()[3:]),
                compositeBoundary='Black/white comparison only; no arbitrary-background reconstruction, repeatability or full animation proved')
    black.save(output/'black-rgb.png')
    preview_height=round(height*360/width)
    preview=Image.new('RGB',(720,preview_height+24),(32,32,40))
    preview.paste(black.resize((360,preview_height),Image.Resampling.LANCZOS),(0,24))
    preview.paste(white.resize((360,preview_height),Image.Resampling.LANCZOS),(360,24))
    labels=ImageDraw.Draw(preview)
    labels.text((8,6),'Native output on black',fill='white')
    labels.text((368,6),'Native output on white',fill='white')
    preview.save(output/'review-pair.png')
    if bbox:
        crop=(max(0,bbox[0]-12),max(0,bbox[1]-12),min(width,bbox[2]+12),min(height,bbox[3]+12))
        black.crop(crop).save(output/'effect-crop-on-black.png')
        result['reviewCrop']=crop
    (output/'analysis.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    print(json.dumps(analyze(args.manifest,args.output),indent=2))
