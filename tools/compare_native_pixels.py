"""Compare retained shared-player receipts with native pixels and render matched views."""
import argparse
import base64
import hashlib
import io
import json
from pathlib import Path
import zlib
from PIL import Image, ImageChops, ImageDraw, ImageFont


def compare(fixture_file,before_file,after_file,output,image,animation=None,change_description=None):
    for path in [output,image,*([animation] if animation else [])]:
        if not path.resolve().is_relative_to(Path('tools/data').resolve()):
            raise ValueError('Keep reference comparisons ignored')
    fixture=json.loads(fixture_file.read_text());before=json.loads(before_file.read_text());after=json.loads(after_file.read_text())
    if before['sourceSha256']!=after['sourceSha256'] or before['sourceSha256']!=fixture['sourceSha256']:
        raise ValueError('Source identity mismatch')
    for receipt in [before,after]:
        if not receipt.get('pngEncoding','').startswith('opaque-rgb-from-readback'):
            raise ValueError('Use opaque RGB readback views; ordinary Canvas RGBA PNGs can alter RGB')
    expected=[f['frame'] for f in fixture['frames']]
    if any([r['frame'] for r in x['results']]!=expected for x in [before,after]):raise ValueError('Frame conditions differ')
    width,height=fixture['width'],fixture['height'];rows=[];views={};native_states=[]
    crop=(0,450,750,870) # One documented pixel rectangle for the whole observed sequence.
    for ref,a,b in zip(fixture['frames'],before['results'],after['results']):
        frame=ref['frame'];data=Path(ref['outputs']['black'].lstrip('/'))
        raw=zlib.decompress(data.read_bytes())
        if len(raw)!=width*height*4:raise ValueError('Incomplete original pixel output')
        native=Image.frombytes('RGBA',(width,height),raw).transpose(Image.Transpose.FLIP_TOP_BOTTOM).convert('RGB')
        pictures=[Image.open(io.BytesIO(base64.b64decode(r['png'].split(',')[1]))).convert('RGB') for r in [a,b]]
        maxima=[]
        for pic,receipt in zip(pictures,[a,b]):
            if pic.size!=(width,height):raise ValueError('Target dimensions differ')
            delta=ImageChops.difference(native,pic);bands=delta.split()
            maximum_band=ImageChops.lighter(ImageChops.lighter(bands[0],bands[1]),bands[2])
            histogram=maximum_band.histogram();maximum=max(i for i,n in enumerate(histogram) if n)
            total=sum(i*n for band in bands for i,n in enumerate(band.histogram()))
            metrics=receipt['comparisons']['black']
            if maximum!=metrics['maximumRgb'] or abs(total/(3*metrics['unionPixels'])-metrics['meanAbsoluteRgbOnUnion'])>1e-12:
                raise ValueError('PNG visualization does not preserve measured framebuffer RGB')
            offset=maximum_band.tobytes().index(maximum);x,y=offset%width,offset//width
            maxima.append(dict(rgbDifference=maximum,x=x,y=y,original=native.getpixel((x,y)),renderer=pic.getpixel((x,y))))
        rows.append(dict(frame=frame,before=a['comparisons'],after=b['comparisons'],largestRgbPixels=dict(before=maxima[0],after=maxima[1]),
                         actualRendererSubmission=b.get('submission'),renderContext=ref['renderContext']))
        views[frame]=[native,*pictures]
        metadata=data.parent/f"render-v35-j-d{ref['drawIndex']}.json"
        m=json.loads(metadata.read_text())
        native_states.append(dict(frame=frame,drawIndex=m['drawIndex'],commands=[dict(
            name=c['name'],program=c['program'],count=c['count'],mode=c['mode'],blend=c['blend'],
            textures=c['renderState']['textures'],cullEnabled=c['renderState']['cullEnabled'],depthFunc=c['renderState']['depthFunc']) for c in m['commands']]))
    def aggregate(key):
        values=[r[key]['black'] for r in rows];weight=sum(x['unionPixels'] for x in values)
        return dict(meanOfFrameMeans=sum(x['meanAbsoluteRgbOnUnion'] for x in values)/len(values),
                    signalWeightedMean=sum(x['meanAbsoluteRgbOnUnion']*x['unionPixels'] for x in values)/weight,
                    maximumRgb=max(x['maximumRgb'] for x in values),
                    maximumAlphaAllBackgrounds=max(c['maximumAlpha'] for r in rows for c in r[key].values()))
    result=dict(schema='native-pixel-before-after-v1',sourceSha256=fixture['sourceSha256'],
        receipts=dict(before=str(before_file),after=str(after_file)),fixtureSha256=hashlib.sha256(fixture_file.read_bytes()).hexdigest(),
        frameCount=len(rows),imageSize=[width,height],scope='Controlled source effect with measured seeds/host, not the unmodified complete skill',
        conditions=change_description or 'Same native outputs, source time, resources, prepared Cocos uploads, linear sampling, camera and scissor. Original source priority is the runtime change.',
        rgbMetric='Absolute RGB levels on black nonzero signal union; alpha independent. White union is clear-color aware only in harness revision7 or newer.',
        aggregate=dict(before=aggregate('before'),after=aggregate('after')),frames=rows,nativeGpuCalls=native_states,
        fullPixelParity=False,view=dict(commonCrop=list(crop),coordinates='Top-left physical framebuffer pixels after vertical readback flip',
            resampling='Identical nearest-neighbor resize in all columns; no alignment/rotation/color fitting',
            animation='Twelve observed visible source steps, slowed to50ms per step; no claim about missing tail frames'))
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',19);small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15)
    # Include a common zoom at the largest pre-change error, chosen deterministically.
    maximum=rows[0]['largestRgbPixels']['before'];x,y=maximum['x'],maximum['y']
    zoom=(max(0,min(width-128,x-64)),max(0,min(height-128,y-64)))
    zoom=(*zoom,zoom[0]+128,zoom[1]+128)
    result['view']['firstFrameZoom']=list(zoom)
    panels=[(1,crop,224),(1,zoom,300),(6,crop,224)]
    sheet=Image.new('RGB',(1280,1060),'#111b2c');d=ImageDraw.Draw(sheet)
    d.text((20,12),'Matched FFBE / FFRogue rendering comparison',font=font,fill='white')
    d.text((20,40),'Controlled source; identical frame and camera. Changed inputs documented in paired JSON. No full-skill claim.',font=small,fill='#bdcbdc')
    for col,title in enumerate(['Original FFBE GPU','Previous FFRogue','Improved FFRogue']):d.text((20+col*420,78),title,font=font,fill='white')
    top=110
    for frame,rectangle,target_height in panels:
        for col,pic in enumerate(views[frame]):
            cut=pic.crop(rectangle);target_width=round(cut.width/cut.height*target_height)
            cut=cut.resize((target_width,target_height),Image.Resampling.NEAREST)
            sheet.paste(cut,(20+420*col+(400-target_width)//2,top))
        r=next(r for r in rows if r['frame']==frame)
        d.text((20,top+target_height+8),f"F{frame}; crop {rectangle}; mean RGB {r['before']['black']['meanAbsoluteRgbOnUnion']:.4f} -> {r['after']['black']['meanAbsoluteRgbOnUnion']:.4f}; max {r['before']['black']['maximumRgb']} -> {r['after']['black']['maximumRgb']}",font=small,fill='#d6e3f1')
        top+=target_height+60
    sheet.save(image)
    if animation:
        sequence=[]
        for frame in expected:
            canvas=Image.new('RGB',(1190,300),'#111b2c');draw=ImageDraw.Draw(canvas)
            for col,title in enumerate(['Original FFBE','Previous FFRogue','Improved FFRogue']):
                draw.text((10+col*395,6),title,font=font,fill='white')
                canvas.paste(views[frame][col].crop(crop).resize((375,210),Image.Resampling.NEAREST),(10+col*395,35))
            draw.text((10,262),f'Observed source step {frame}/12 - slowed playback, controlled source and host',font=small,fill='#c4d3e2')
            sequence.append(canvas)
        sequence[0].save(animation,save_all=True,append_images=sequence[1:],duration=50,loop=0,lossless=True)
    output.write_text(json.dumps(result,indent=2),encoding='utf-8')
    return result['aggregate']

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    for flag in ['fixture','before','after','output','image']:p.add_argument('--'+flag,type=Path,required=True)
    p.add_argument('--animation',type=Path);p.add_argument('--change-description');a=p.parse_args()
    print(json.dumps(compare(a.fixture,a.before,a.after,a.output,a.image,a.animation,a.change_description)))
