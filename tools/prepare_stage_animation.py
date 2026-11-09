"""Prepare reviewed SSPB-v1 normal/additive 2-D stage packets, never raster frames."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
from PIL import Image
from ssbp_v1 import Project

SDK = 'https://github.com/SpriteStudio/ssbpLib/tree/2a80bf76d9077275f301b89d604624eac420d168/Players/ssbpLib'


def multiply(a, b):
    return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
            a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
            a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]]


# ssbpLib instance flags: 1 infinite loop, 2 reverse, 4 ping-pong, 8 independent (own clock).
INDEPENDENT_APPROXIMATIONS = set()
COLOR_APPROXIMATIONS = set()


def instance_frame(parent, instance, absolute=None):
    if set(instance) != {'key', 'start', 'end', 'speed', 'loops', 'flags'}:
        raise ValueError('Incomplete instance clock')
    flags = instance['flags']
    infinite = bool(flags & 1)
    if flags & ~15 or instance['speed'] < 0 or (instance['loops'] < 1 and not infinite):
        raise ValueError('Unknown instance clock unsupported')
    if flags & 8:
        # Independent clocks keep running on absolute time across parent loops (ssbpLib). Only
        # endless ones are admitted; prepare() lengthens the loop so they close seamlessly.
        if not infinite:
            raise ValueError('Finite independent instance clock unsupported')
        INDEPENDENT_APPROXIMATIONS.add((instance['speed'], instance['start'], instance['end']))
        if absolute is not None:
            parent = absolute
    elapsed = int(parent*instance['speed'])-instance['key']
    length = instance['end']-instance['start']+1
    if length <= 0:
        raise ValueError('Invalid instance range')
    if elapsed < 0:
        return None
    loop, frame = divmod(elapsed, length)
    limit = instance['loops'] * (2 if flags & 4 else 1)
    if not flags & 1 and loop >= limit:
        loop, frame = limit-1, length-1
    reverse = bool(flags & 2) ^ bool(flags & 4 and loop % 2)
    return instance['end']-frame if reverse else instance['start']+frame


def render_frame(project, animation, frame, parent=None, parent_alpha=255, trail=(), absolute=None):
    if animation in trail:
        raise ValueError('Recursive instance')
    a = project.animations[animation]
    if not 0 <= frame < a['count']:
        raise ValueError('Invalid frame')
    transforms = {}
    out = []
    for s in sorted(a['frames'][frame], key=lambda s:s['index']):
        part = a['parts'][s['index']]
        if s['rotationX'] or s['rotationY'] or s['z'] or 'vertices' in s:
            raise ValueError('Unsupported 3-D/deformed profile')
        if 'color' in s:
            # Part colour blending is not rendered yet: the part keeps its texture colour (approximation).
            COLOR_APPROXIMATIONS.add(s['color']['mode'])
        if any(s[k] != d for k,d in [('uMove',0),('vMove',0),('uvRotation',0),('uScale',1),('vScale',1)]):
            raise ValueError('UV animation not admitted')
        r = -s['rotationZ'] * math.pi/180
        local = [math.cos(r)*s['scaleX'], math.sin(r)*s['scaleX'],
                 -math.sin(r)*s['scaleY'], math.cos(r)*s['scaleY'], s['x']/10, -s['y']/10]
        base, alpha = transforms[part['parent']] if part['parent'] >= 0 else (parent or [1,0,0,1,0,0],parent_alpha)
        transforms[part['index']] = (multiply(base, local), s['opacity']*alpha//255)
    # The frame record sequence is the original draw order, NOT hierarchy index.
    for s in a['frames'][frame]:
        part = a['parts'][s['index']]
        matrix, alpha = transforms[part['index']]
        if s['flags'] & 1 or not alpha:
            continue
        if part['type'] == 3:
            child = instance_frame(frame, s['instance'], absolute)
            if child is not None:
                out += render_frame(project, part['ref'], child, matrix, alpha, trail+(animation,), absolute)
        elif part['type'] == 1 and s['cell'] >= 0:
            if part['blend'] not in (0,2):
                raise ValueError('Unreviewed blend')
            cell = project.cells[s['cell']]
            # v1 anchors remain in the screen-oriented part space after Y inversion.
            w, h = cell['width'], cell['height']
            draw_w = s['sizeX'] if s['flags'] & 1 << 17 else w
            draw_h = s['sizeY'] if s['flags'] & 1 << 18 else h
            points = []
            for u,v in [(0,0),(0,1),(1,0),(1,1)]:
                x = (.5-s['anchorX'])*w+(u-.5)*draw_w
                y = (.5-s['anchorY'])*h+(v-.5)*draw_h
                points += [round(matrix[0]*x+matrix[2]*y+matrix[4],6),
                           round(matrix[1]*x+matrix[3]*y+matrix[5],6)]
            out.append([s['cell'],part['blend'],alpha,int(bool(s['flags'] & 2)),int(bool(s['flags'] & 4)),*points])
    return out


def prepare(source, animation, output, offset, canvas):
    p = Project(source)
    root = p.animations[animation]
    frames = [render_frame(p,animation,f) for f in range(root['count'])]
    if INDEPENDENT_APPROXIMATIONS:
        # Endless independent instances run on absolute time: the prepared loop covers the least
        # common length of the parent and every such instance (capped at 30 s), so it closes seamlessly.
        count = root['count']
        for speed, start, end in INDEPENDENT_APPROXIMATIONS:
            period = round((end - start + 1) / speed) if speed > 0 else 1
            count = count * period // math.gcd(count, period)
        count = min(count, 900)
        frames = [render_frame(p, animation, f % root['count'], absolute=f) for f in range(count)]
    images = sorted(set(c['image'] for c in p.cells))
    textures = []
    for image in images:
        path = p.path.parent/image
        with Image.open(path) as im:
            w,h=im.size
            if any(c['x'] < 0 or c['y'] < 0 or c['x']+c['width'] > w or c['y']+c['height'] > h for c in p.cells if c['image']==image):
                raise ValueError('Atlas cell exceeds image')
        textures.append(dict(file=image,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),width=w,height=h))
    result = dict(schema='prepared-stage-packets-v1',source=dict(file=p.path.name,sha256=hashlib.sha256(p.data).hexdigest(),sdk=SDK),
                  profile='sspb-v1-affine-normal-add',animation=animation,fps=root['fps'],count=len(frames),loop=True,
                  presentation=dict(canvas=canvas,origin=[canvas[0]/2+offset[0],canvas[1]/2+offset[1]],
                    policy='Shared static-arena cover crop; master-authored animation offset; no native camera fidelity claim'),
                  textures=textures,cells=p.cells,frames=frames,audio=[],
                  **({'approximations': [dict(kind='independent-instance-clock', speed=sp, start=st, end=en,
                      treatment=f'absolute time; prepared loop {len(frames)} frames (parent {root["count"]})')
                      for sp, st, en in sorted(INDEPENDENT_APPROXIMATIONS)]
                      + [dict(kind='part-color-blend', mode=m, treatment='not rendered; texture colour kept') for m in sorted(COLOR_APPROXIMATIONS)]}
                   if INDEPENDENT_APPROXIMATIONS or COLOR_APPROXIMATIONS else {}))
    COLOR_APPROXIMATIONS.clear()
    INDEPENDENT_APPROXIMATIONS.clear()
    output.mkdir(parents=True,exist_ok=True)
    (output/'animation.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
    for image in images:
        shutil.copyfile(p.path.parent/image,output/image)
    return result


if __name__ == '__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--source',required=True)
    ap.add_argument('--animation',default='back/anime')
    ap.add_argument('--output',type=Path,required=True)
    ap.add_argument('--offset',type=float,nargs=2,required=True,help='Reviewed master layer placement, not inferred from filenames')
    ap.add_argument('--canvas',type=int,nargs=2,required=True)
    args=ap.parse_args()
    r=prepare(args.source,args.animation,args.output,args.offset,args.canvas)
    print(json.dumps(dict(source=r['source'],frames=r['count'],fps=r['fps'],draws=sum(map(len,r['frames'])),textures=r['textures'])))
