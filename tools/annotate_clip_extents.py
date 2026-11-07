"""Horizontal body extent of Limit Burst clips, for on-screen placement.

FFBE Limit Burst bodies travel far inside their own clip (Cloud AC's limit_atk reaches ~370
frame pixels left of the pivot). The game host keeps that whole clip on screen, so each
published `limit_*` clip records `extentX: [left, right]` in frame pixels relative to the pivot:
the 2nd/98th percentile of the per-frame opaque bounds (alpha > 40), ignoring single blur frames.
export_unit.py calls `clip_extent` for new imports; this CLI annotates published manifests and
keeps the run-content form hashes in step.

    <python> tools/annotate_clip_extents.py
"""
import hashlib
import json
from pathlib import Path
from PIL import Image
from sheet_grid import frame_origin

ROOTS = [Path('public/assets/units'), Path('public/assets/forms')]
RUN_CONTENT = Path('public/assets/run-content.json')
ALPHA = 40


def clip_extent(png, meta):
    width, height, count = meta['frameWidth'], meta['frameHeight'], meta['frameCount']
    pivot = meta['pivotX'] * width
    lefts, rights = [], []
    with Image.open(png) as image:
        alpha = image.convert('RGBA').getchannel('A').point(lambda v: 255 if v > ALPHA else 0)
        for index in range(count):
            x, y = frame_origin(index, width, height, count)
            box = alpha.crop((x, y, x + width, y + height)).getbbox()
            if box:
                lefts.append(box[0] - pivot)
                rights.append(box[2] - pivot)
    if not lefts:
        return None
    lefts.sort()
    rights.sort()
    pick = lambda values, q: values[min(len(values) - 1, int(q * (len(values) - 1) + 0.5))]
    return [round(pick(lefts, 0.02), 1), round(pick(rights, 0.98), 1)]


if __name__ == '__main__':
    rewritten = set()
    for root in ROOTS:
        for manifest_file in sorted(root.glob('*/manifest.json')):
            manifest = json.loads(manifest_file.read_text(encoding='utf-8'))
            dirty = False
            for clip, meta in manifest.get('animations', {}).items():
                if not clip.startswith('limit_'):
                    continue
                extent = clip_extent(manifest_file.parent / meta['file'], meta)
                if extent and meta.get('extentX') != extent:
                    meta['extentX'] = extent
                    dirty = True
            if dirty:
                manifest_file.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
                rewritten.add(manifest_file.parent.as_posix())
                print(manifest_file.parent.as_posix(), {c: m.get('extentX') for c, m in manifest['animations'].items() if c.startswith('limit_')})
    if rewritten:
        content = json.loads(RUN_CONTENT.read_text(encoding='utf-8'))
        for form in content['forms']:
            folder = Path('public') / form['assetPath']
            if folder.as_posix() in rewritten and 'source' in form:
                form['source']['manifestSha256'] = hashlib.sha256((folder / 'manifest.json').read_bytes()).hexdigest()
        RUN_CONTENT.write_text(json.dumps(content, indent=2) + '\n', encoding='utf-8')
    print(f'Annotated {len(rewritten)} manifests')
