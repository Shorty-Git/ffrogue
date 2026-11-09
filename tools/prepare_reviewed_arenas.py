"""Prepare reviewed stages and inventory the local master without guessing title ownership."""
import hashlib
import json
import shutil
import sqlite3
import tempfile
from pathlib import Path

from PIL import Image
from prepare_stage_animation import prepare

dump = Path('rawdata/ffbe_asset_dump/battle_bg')
review = json.loads(Path('tools/stages/reviewed-arenas.json').read_text(encoding='utf-8-sig'))
target = Path('public/assets/stages')


def letterbox_content(image):
    """Fraction of the width that is real picture: FFBE's narrow screen never shows the black side
    bars some backgrounds carry, our wider arena would. Symmetric bars (as authored) are measured."""
    grey = image.convert('L')
    width, height = grey.size
    def dark(x):
        return sum(grey.getpixel((x, y)) for y in range(0, height, 8)) / len(range(0, height, 8)) < 20
    left = next((x for x in range(width // 3) if not dark(x)), 0)
    right = next((x for x in range(width // 3) if not dark(width - 1 - x)), 0)
    return round((width - 2 * min(left, right)) / width, 4)


def record(path):
    return {'file': path.name, 'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


with sqlite3.connect('file:rawdata/assets/static_data/ffbe-data.db?mode=ro', uri=True) as db:
    db.row_factory = sqlite3.Row
    rows = {r['battleBgId']: dict(r) for r in db.execute('select * from battle_bg')}
    registry = {r['resourceId']: r['fileName'] for r in db.execute('select * from resource_map where resourceType=400')}
    banks = {}
    for root in (Path('rawdata/memorial-packs'), Path('rawdata/memorial-downloads'), Path('rawdata/android-global')):
        for file in sorted(root.rglob('*.acb')):
            key = file.name.lower()
            banks.setdefault(key, []).append(file.as_posix())
            if key.startswith('ver') and '_' in key:
                banks.setdefault(key.split('_', 1)[1], []).append(file.as_posix())

    original_music = {}
    for table, column in [('mission', 'battleBgmResourceId'), ('mission_phase', 'bgmResourceId'),
                          ('monster_dictionary', 'battleBgmResourceId')]:
        for row in db.execute(f'select battleBgId,{column} from {table} where {column}>0 and battleBgId>0'):
            original_music.setdefault(row[0], {}).setdefault(row[1], set()).add(table)

    published = {}
    with tempfile.TemporaryDirectory() as temp:
        for key, recipe in review.items():
            row = rows[recipe['id']]
            image = dump / row['fileInfo']
            with Image.open(image) as im:
                width, height = im.size
                content_width = letterbox_content(im)
            folder = Path(temp) / key
            folder.mkdir()
            shutil.copyfile(image, folder / image.name)
            animation = None
            if row['Dc5w1Yda']:
                # 'file#back,...&file,front/anime,1': the back layer is prepared; a front overlay layer is not yet.
                layers = row['Dc5w1Yda'].split('&')
                file, member = layers[0].split('#')
                _, root, x, y = member.split(',')
                animation = prepare(dump / file, root, folder, [float(x), float(y)], [width, height])
            music = recipe.get('music')
            bank = registry.get(music)
            if music and (not bank or not banks.get(bank.lower())):
                raise ValueError(f"{key}: missing local bank for music {music}")
            assignment = ('historical' if music in original_music.get(recipe['id'], {}) else
                          'thematic' if music else 'unresolved')
            published[key] = {
                **recipe, 'texture': f'arena_{key}', 'file': image.name, 'width': width, 'height': height,
                'floorTop': recipe['floor'][0], 'floorBottom': recipe['floor'][1],
                **({'contentWidth': content_width} if content_width < 0.97 else {}),
                'animation': {'fps': animation['fps'], 'frames': animation['count'],
                              **({'omittedLayers': len(row['Dc5w1Yda'].split('&')) - 1} if '&' in row['Dc5w1Yda'] else {})} if animation else None,
                'image': record(image), 'musicAssignment': assignment,
                'status': 'prepared', 'titleEvidence': 'reviewed-stage-candidates-v1',
            }
        for key in published:
            shutil.copytree(Path(temp) / key, target / key, dirs_exist_ok=True)

    output = Path('tools/data/arena-ui/catalog.json')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({
        'titles': [dict(r) for r in db.execute('select * from game_title')],
        'arenas': [{**row, 'imagePresent': (dump / row['fileInfo']).is_file(),
                    'animationPresent': bool(row['Dc5w1Yda'] and (dump / row['Dc5w1Yda'].split('#')[0]).is_file()),
                    'originalMusic': {id: sorted(origins) for id, origins in original_music.get(key, {}).items()}}
                   for key, row in rows.items()],
        'music': [{'id': id, 'bank': name, 'local': banks.get(name.lower(), [])}
                  for id, name in registry.items() if name],
        'reviewed': published,
    }, indent=2) + '\n', encoding='utf-8')
    (target / 'reviewed.json').write_text(json.dumps(published, indent=2)+'\n', encoding='utf-8')
