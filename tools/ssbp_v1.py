"""Bounded SSPB-v1 decoder. Original processing stays outside the game.

Layout/stream evidence: SpriteStudio/ssbpLib commit
2a80bf76d9077275f301b89d604624eac420d168, SS5PlayerData.h and Player::setFrame.
No later-format structures or inferred default instance values are accepted.
"""
import struct
import hashlib
from pathlib import Path

FLOAT_NAMES = ['anchorX', 'anchorY', 'rotationX', 'rotationY', 'rotationZ',
               'scaleX', 'scaleY', 'sizeX', 'sizeY', 'uMove', 'vMove',
               'uvRotation', 'uScale', 'vScale', 'radius']
FIELDS = [(3, 'cell', 'h'), (4, 'x', 'h'), (5, 'y', 'h'), (6, 'z', 'h')]
FIELDS += [(bit, name, 'f') for bit, name in zip(range(7, 14), FLOAT_NAMES[:7])]
FIELDS += [(14, 'opacity', 'H')]
FIELDS += [(bit, name, 'f') for bit, name in zip(range(17, 25), FLOAT_NAMES[7:])]


class Project:
    def __init__(self, path):
        self.path = Path(path)
        self.data = self.path.read_bytes()
        magic, version, flags, image_base, cells, packs, nc, np = self.read('4sIIIIIhh', 0)
        if magic != b'SSPB' or version != 1:
            raise ValueError('Only literal SSPB version1 is supported')
        self.flags = flags
        self.image_base = self.string(image_base)
        self.cells = []
        for i in range(nc):
            name, cm, index, x, y, w, h, _ = self.read('IIhhhHHh', cells + 20*i)
            map_name, image, map_index, _ = self.read('IIhh', cm)
            self.cells.append(dict(name=self.string(name), image=self.string(image),
                                   map=self.string(map_name), mapIndex=map_index,
                                   index=index, x=x, y=y, width=w, height=h))
        self.animations = {}
        for i in range(np):
            name, parts, animations, n_parts, n_anims = self.read('IIIhh', packs + 16*i)
            pack_name = self.string(name)
            part_list = []
            for j in range(n_parts):
                pn, index, parent, typ, bounds, blend, ref = self.read('Ihhhhh2xI', parts+20*j)
                if index != j or parent >= j or parent < -1 or typ not in (0, 1, 3):
                    raise ValueError('Unsupported/cyclic part structure')
                part_list.append(dict(name=self.string(pn), index=index, parent=parent,
                                      type=typ, bounds=bounds, blend=blend, ref=self.string(ref)))
            for j in range(n_anims):
                an, defaults, frames, user, labels, count, fps, n_labels = self.read('IIIIIhhh', animations+28*j)
                initial = []
                for k in range(n_parts):
                    ix, _, fl, cell, x, y, z, opacity = self.read('hhIhhhhH', defaults+80*k)
                    values = dict(zip(FLOAT_NAMES, self.read('15f', defaults+80*k+20)))
                    initial.append(dict(index=ix, flags=fl, cell=cell, x=x, y=y, z=z, opacity=opacity, **values))
                decoded = []
                spans = []
                for frame in range(count):
                    at = self.read('I', frames+4*frame)[0]
                    start = at
                    states = []
                    for _ in range(n_parts):
                        index, fl = self.read('hI', at)
                        at += 6
                        if index < 0 or index >= n_parts or fl & 0x80000000:
                            raise ValueError('Invalid frame record')
                        state = dict(initial[index], index=index, flags=fl)
                        for bit, field, fmt in FIELDS:
                            if fl & 1 << bit:
                                state[field] = self.read(fmt, at)[0]
                                at += struct.calcsize('<'+fmt)
                        if fl & 1 << 16:
                            vf = self.read('H', at)[0]; at += 2
                            state['vertices'] = {}
                            for corner in range(4):
                                if vf & 1 << corner:
                                    state['vertices'][corner] = self.read('hh', at); at += 4
                        if fl & 1 << 15:
                            cf = self.read('H', at)[0]; at += 2
                            color = dict(mode=cf & 255, mask=cf >> 8, values=[])
                            for corner in range(5):
                                if cf >> 8 & 1 << corner:
                                    rate, rgba = self.read('fI', at); at += 8
                                    color['values'].append(dict(corner=corner, rate=rate, rgba=rgba))
                            state['color'] = color
                        if part_list[index]['type'] == 3:
                            instance = {}
                            for bit, key, fmt in [(25,'key','h'),(26,'start','h'),(27,'end','h'),(28,'speed','f'),(29,'loops','h'),(30,'flags','h')]:
                                if fl & 1 << bit:
                                    instance[key] = self.read(fmt, at)[0]; at += struct.calcsize('<'+fmt)
                            state['instance'] = instance
                        if state['cell'] < -1 or state['cell'] >= nc or state['opacity'] > 255:
                            raise ValueError('Cell/opacity out of range')
                        states.append(state)
                    if len(set(s['index'] for s in states)) != n_parts:
                        raise ValueError('Duplicate/missing frame parts')
                    spans.append([start, at])
                    decoded.append(states)
                key = pack_name+'/'+self.string(an)
                for previous, following in zip(spans, spans[1:]):
                    gap = following[0]-previous[1]
                    if gap not in (0, 2) or any(self.data[previous[1]:following[0]]):
                        raise ValueError('Frame stream length/padding mismatch')
                self.animations[key] = dict(parts=part_list, fps=fps, count=count,
                                            frames=decoded, spans=spans, userData=bool(user), labels=n_labels)
        for key, animation in self.animations.items():
            for p in animation['parts']:
                if p['type'] == 3 and p['ref'] not in self.animations:
                    raise ValueError('Unresolved instance '+p['ref'])

    def read(self, fmt, at):
        if at < 0 or at+struct.calcsize('<'+fmt) > len(self.data):
            raise ValueError('Binary bounds')
        return struct.unpack_from('<'+fmt, self.data, at)

    def string(self, at):
        if at == 0:
            return ''
        if at < 0 or at >= len(self.data):
            raise ValueError('String bounds')
        end = self.data.index(0, at)
        return self.data[at:end].decode('utf8')

    def summary(self):
        return dict(path=str(self.path), sha256=hashlib.sha256(self.data).hexdigest(),
                    cells=self.cells, animations={k:dict(fps=a['fps'], frames=a['count'],
                    parts=a['parts'], flags=sorted(set(s['flags'] for f in a['frames'] for s in f)))
                    for k,a in self.animations.items()})


if __name__ == '__main__':
    import json
    import sys
    project = Project(sys.argv[1])
    print(json.dumps(project.summary(), indent=2))
