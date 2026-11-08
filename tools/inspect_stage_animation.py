"""Inventory exact SpriteStudio resources; not a guessed SSPB frame decoder."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import struct
from PIL import Image


def info(path):
    row = dict(path=path.as_posix(), exists=path.is_file())
    if not path.is_file():
        return row
    data = path.read_bytes()
    row.update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
    if path.suffix in ['.jpg', '.png']:
        with Image.open(path) as image:
            image.load()
            row.update(size=image.size, mode=image.mode, frames=getattr(image, 'n_frames', 1),
                       alphaExtrema=image.convert('RGBA').getchannel('A').getextrema())
    return row


def inspect(output):
    records = []
    with sqlite3.connect(Path('rawdata/assets/static_data/ffbe-data.db').resolve().as_uri() + '?mode=ro', uri=True) as db:
        db.row_factory = sqlite3.Row
        for stem in ['battle_bg_0003_01', 'battle_bg_2013_02']:
            root = Path('rawdata/ffbe_asset_dump/battle_bg')
            binary = root / (stem + '.ssbp')
            data = binary.read_bytes()
            if data[:4] != b'SSPB' or struct.unpack_from('<I', data, 4)[0] != 1:
                raise ValueError('This inventory expects the inspected SSPB v1 assets')
            strings = [m.group().decode('ascii') for m in re.finditer(rb'[\x20-\x7e]{4,}', data)]
            names = sorted({s for s in strings if re.fullmatch(r'[A-Za-z0-9_./-]+\.(png|jpg)', s)})
            if any(not (root / name).resolve().is_relative_to(root.resolve()) for name in names):
                raise ValueError('Unsafe cell-map image path')
            records.append(dict(source=info(binary), signature='SSPB', version=1,
                master=[dict(r) for r in db.execute('SELECT * FROM battle_bg WHERE fileInfo=?', (stem + '.jpg',))],
                images=[info(root / name) for name in names], strings=strings,
                decoder=dict(imageReferencesVerified=True, originalFrameTiming=False, partHierarchy=False,
                             nestedInstances=False, uvAndCellMaps=False, drawOrderBlend=False, productive=False)))
    report = dict(schema='stage-animation-resource-intake-v1', stages=records,
        reference='https://github.com/SpriteStudio/ssbpLib/blob/master/Players/ssbpLib/SS5PlayerData.h',
        limits=['Binary v1 differs from current SDK layouts; no offset guessing or newer-player compatibility assumed.',
                'Image/instance names are literal references, not a decoded original scene or invented motion.',
                'Master back/anime,0,216 is preserved raw, not interpreted as a frame count or frame rate.',
                'Reactor2013_02 references2013_01.png; its same-stem transparent PNG is not the animation atlas.'])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(dict(stages=len(records), referencedImages=sum(len(r['images']) for r in records),
                         allImagesPresent=all(i['exists'] for r in records for i in r['images']), productiveAnimations=0)))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('tools/data/battle-polish-20261102/stage-animation-intake.json'))
    inspect(parser.parse_args().output)
