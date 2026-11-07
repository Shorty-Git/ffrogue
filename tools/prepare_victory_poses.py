"""Derive reviewed presentation gates from exact pivot-aligned prepared poses.

No raw FFBE timing is rewritten. The body continues its complete animation.
"""
from pathlib import Path
from PIL import Image
import argparse
import hashlib
import json


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def poses(root, meta):
    with Image.open(root / meta['file']) as sheet:
        result = []
        for i in range(meta['frameCount']):
            frame = sheet.crop((i * meta['frameWidth'], 0, (i + 1) * meta['frameWidth'], meta['frameHeight'])).convert('RGBA')
            bounds = frame.getchannel('A').getbbox()
            if not bounds:
                raise ValueError('Empty victory pose')
            anchor = (bounds[0] - round(meta['pivotX'] * meta['frameWidth']), bounds[1] - round(meta['pivotY'] * meta['frameHeight']))
            cropped = frame.crop(bounds)
            result.append(hashlib.sha256(str((anchor, cropped.size)).encode() + cropped.tobytes()).hexdigest())
        return result


def prepare(output):
    registry = json.loads(Path('public/assets/content.json').read_text())
    forms = json.loads(Path('public/assets/run-content.json').read_text())['forms']
    roots = {key: Path('public/assets/units') / key for key in registry['characters']}
    roots.update({f['key']: Path('public') / f['assetPath'] for f in forms})
    units = {}
    for key, root in roots.items():
        manifest = json.loads((root / 'manifest.json').read_text())
        animations = manifest['animations']
        if 'win' not in animations:
            continue
        win = poses(root, animations['win'])
        intro = poses(root, animations['win_before']) if 'win_before' in animations else []
        first = len(intro)
        while first > 0 and intro[first - 1] in win:
            first -= 1
        clip, frame = ('win_before', first) if first < len(intro) else ('win', 0)
        old = sum(f['durationMs'] for c in ['win_before', 'win'] for f in animations.get(c, {}).get('frames', []))
        ready = (sum(f['durationMs'] for f in animations.get('win_before', {}).get('frames', [])) if clip == 'win' else
                 sum(f['durationMs'] for f in animations[clip]['frames'][:frame]))
        units[key] = dict(unitId=manifest['unitId'], clip=clip, frame=frame,
            frameCounts={c: animations[c]['frameCount'] for c in ['win_before', 'win'] if c in animations},
            source=dict(manifestSha256=sha(root / 'manifest.json'), sheets={c: sha(root / animations[c]['file']) for c in ['win_before', 'win'] if c in animations}),
            evidence='Trailing intro poses exactly match pivot-aligned win poses' if clip == 'win_before' else 'Full entrance completes; first resting win pose starts',
            previousReadyMs=round(old, 2), readyMs=round(ready, 2), savedMs=round(old - ready, 2))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(dict(schemaVersion=1, policy='FFRogue presentation gate; original clips continue unchanged', units=units), indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: {k: row[k] for k in ['clip', 'frame', 'previousReadyMs', 'readyMs', 'savedMs']} for key, row in units.items()}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('tools/data/battle-polish-20261102/victory-poses.json'))
    prepare(parser.parse_args().output)
