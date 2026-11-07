"""Prepare a master-verified monster with the existing CGG/CGS exporter.

No downloading, implicit registration, generated VFX or original AI claims.
Publication is a separate explicit step after reviewing the staged sheets.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(recipe_path, publish=False):
    recipe = json.loads(recipe_path.read_text(encoding='utf-8'))
    key, sprite = recipe['key'], str(recipe['spriteId'])
    if recipe['schemaVersion'] != 1 or not re.fullmatch(r'[a-z][a-z0-9_]*', key) or not sprite.isdigit():
        raise ValueError('Reviewed monster recipe required')
    database = Path('assets/static_data/ffbe-data.db')
    with sqlite3.connect(database.resolve().as_uri() + '?mode=ro', uri=True) as db:
        db.row_factory = sqlite3.Row
        row = db.execute('SELECT * FROM monster WHERE monsterId=?', (recipe['monsterId'],)).fetchone()
        dictionary = db.execute('SELECT * FROM monster_dictionary WHERE dictionaryId=?', (recipe['dictionaryId'],)).fetchone()
        if not row or not dictionary or row['dictionaryId'] != recipe['dictionaryId'] or dictionary['name'] != recipe['displayName']:
            raise ValueError('Original monster/dictionary/name identity mismatch')
        source = {'monster': dict(row), 'dictionary': dict(dictionary), 'databaseSha256': digest(database)}
    dump = Path('ffbe_asset_dump-main')
    files = [dump / 'monster_animated' / f'monster_anime_{sprite}.png',
             dump / 'monster_animated_csv' / f'monster_cgg_{sprite}.csv']
    tracks = sorted((dump / 'monster_animated_csv').glob(f'monster_*_cgs_{sprite}.csv'))
    if not all(p.is_file() for p in files) or not tracks:
        raise ValueError('Missing original atlas, CGG or CGS tracks')
    files += tracks
    work = Path('tools/data/monsters') / key
    work.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix='stage-', dir=work)).resolve()
    raw = stage / 'raw'
    raw.mkdir()
    for p in files:
        shutil.copyfile(p, raw / p.name)
    subprocess.run([str(Path('tools/bin/ffbetool.exe').resolve()), sprite, '-i', str(raw),
                    '-o', str(stage / 'assembled'), '--unit_type', 'monster', '--json'], check=True)
    subprocess.run([sys.executable, 'tools/export_unit.py', '--id', sprite, '--name', key,
                    '--type', 'monster', '--input', str(stage / 'assembled'), '--output', str(stage / 'prepared')], check=True)
    output = stage / 'prepared' / key
    subprocess.run([sys.executable, 'tools/validate_character.py', str(output)], check=True)
    manifest = json.loads((output / 'manifest.json').read_text())
    expected = {p.name.removeprefix('monster_').removesuffix(f'_cgs_{sprite}.csv') for p in tracks}
    if set(manifest['animations']) != expected or any(a not in expected for a in recipe['review']['requiredAnimations']):
        raise ValueError('Exporter omitted a source track or required animation')
    source.update(recipe=recipe_path.as_posix(), recipeSha256=digest(recipe_path), spriteId=sprite,
                  files=[{'path': p.as_posix(), 'sha256': digest(p)} for p in files],
                  animations={k: {'frames': v['frameCount'], 'durationMs': sum(f['durationMs'] for f in v['frames'])}
                              for k, v in manifest['animations'].items()},
                  manifestSha256=digest(output / 'manifest.json'), directory=str(output), published=publish,
                  limits=['Original attack body supported; original named skills, AI and external VFX are not imported.',
                          'Hit, defeat, spawn and movement staging are explicitly reviewed FFRogue presentation.'])
    source['preparedFiles'] = [{'file': p.name, 'sha256': digest(p)} for p in sorted(output.iterdir()) if p.is_file()]
    if publish:
        destination = Path('public/assets/monsters') / key
        if destination.exists():
            raise ValueError('Existing monster publication must be reviewed explicitly; refusing overwrite')
        shutil.copytree(output, destination)
        (destination / 'source.json').write_text(json.dumps({k: v for k, v in source.items() if k != 'directory'}, indent=2) + '\n', encoding='utf-8')
    (work / ('publication.json' if publish else 'preparation.json')).write_text(json.dumps(source, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'key': key, 'directory': str(output), 'animations': source['animations'], 'published': publish}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--recipe', type=Path, required=True)
    parser.add_argument('--publish', action='store_true', help='Only after visual review of the staged body sheets')
    options = parser.parse_args()
    prepare(options.recipe, options.publish)
