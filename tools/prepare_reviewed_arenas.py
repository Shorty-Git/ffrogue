"""Prepare reviewed stages and inventory the local master without guessing title ownership."""
import hashlib
import json
import shutil
import sqlite3
import tempfile
from pathlib import Path

from PIL import Image
from prepare_stage_animation import prepare

dump = Path('ffbe_asset_dump-main/battle_bg')
review = json.loads(Path('tools/stages/reviewed-arenas.json').read_text(encoding='utf-8-sig'))
target = Path('public/assets/stages')


def record(path):
    return {'file': path.name, 'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


with sqlite3.connect('file:assets/static_data/ffbe-data.db?mode=ro', uri=True) as db:
    db.row_factory = sqlite3.Row
    rows = {r['battleBgId']: dict(r) for r in db.execute('select * from battle_bg')}
    registry = {r['resourceId']: r['fileName'] for r in db.execute('select * from resource_map where resourceType=400')}
    banks = {}
    for root in (Path('tools/data/memorial-audit/trace-clone-backup'), Path('com.square_enix.android_googleplay.FFBEWW')):
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
            folder = Path(temp) / key
            folder.mkdir()
            shutil.copyfile(image, folder / image.name)
            animation = None
            if row['Dc5w1Yda']:
                file, member = row['Dc5w1Yda'].split('#')
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
                'animation': {'fps': animation['fps'], 'frames': animation['count']} if animation else None,
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
