"""Re-lay published body sheets wider than MAX_SHEET_WIDTH into the shared grid (tools/sheet_grid.py).

Frames are copied unchanged; only their position in the sheet changes. Plain sheets are rewritten
in place; hashed body layers get new content-hash names and the manifest is updated. Already
fitting sheets are left byte-identical, so the command is safe to repeat.

Run from the repository root:  <python> tools/wrap_wide_sheets.py
"""
import hashlib
import io
import json
from pathlib import Path
from PIL import Image
from sheet_grid import MAX_SHEET_WIDTH, wrap_strip

ROOTS = [Path('public/assets/units'), Path('public/assets/forms'), Path('public/assets/monsters')]
RUN_CONTENT = Path('public/assets/run-content.json')


def hashed_name(clip, layer, image):
    stream = io.BytesIO()
    image.save(stream, format='PNG')
    data = stream.getvalue()
    return f'{clip}.{layer}.{hashlib.sha256(data).hexdigest()[:16]}.png', data


changed = []
rewritten = set()
for root in ROOTS:
    for manifest_file in sorted(root.glob('*/manifest.json')):
        folder = manifest_file.parent
        manifest = json.loads(manifest_file.read_text(encoding='utf-8'))
        dirty = False
        for clip, meta in manifest.get('animations', {}).items():
            width, height, count = meta['frameWidth'], meta['frameHeight'], meta['frameCount']
            if width * count <= MAX_SHEET_WIDTH:
                continue
            plain = folder / meta['file']
            with Image.open(plain) as image:
                image.load()
                wrapped = wrap_strip(image, width, height, count)
            if wrapped is not image:
                wrapped.save(plain)
                changed.append(plain.as_posix())
            for layer, name in list(meta.get('bodyLayers', {}).items()):
                source = folder / name
                with Image.open(source) as image:
                    image.load()
                    wrapped = wrap_strip(image, width, height, count)
                if wrapped is image:
                    continue
                new_name, data = hashed_name(clip, layer, wrapped)
                (folder / new_name).write_bytes(data)
                if new_name != name:
                    source.unlink()
                meta['bodyLayers'][layer] = new_name
                changed.append((folder / new_name).as_posix())
                dirty = True
        if dirty:
            manifest_file.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
            rewritten.add(folder.as_posix())
# Form entries in run-content.json pin their manifest hash; keep them in step with the rewrite.
if rewritten:
    content = json.loads(RUN_CONTENT.read_text(encoding='utf-8'))
    for form in content['forms']:
        folder = Path('public') / form['assetPath']
        if folder.as_posix() in rewritten and 'source' in form:
            form['source']['manifestSha256'] = hashlib.sha256((folder / 'manifest.json').read_bytes()).hexdigest()
    RUN_CONTENT.write_text(json.dumps(content, indent=2) + '\n', encoding='utf-8')
print(f'Wrapped {len(changed)} sheets wider than {MAX_SHEET_WIDTH} px')
for path in changed:
    print('  ' + path)
