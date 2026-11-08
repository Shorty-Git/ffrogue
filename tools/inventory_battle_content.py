"""Bounded read-only original battle inventory; no availability -> runtime claims."""
from pathlib import Path
import argparse
import hashlib
import json
import sqlite3


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inventory(output):
    database = Path('rawdata/assets/static_data/ffbe-data.db')
    with sqlite3.connect(database.resolve().as_uri() + '?mode=ro', uri=True) as db:
        db.row_factory = sqlite3.Row
        rows = lambda query, args=(): [dict(r) for r in db.execute(query, args)]
        monsters = []
        for recipe in sorted(Path('tools/monsters').glob('*.json')):
            data = json.loads(recipe.read_text())
            sprite = data['spriteId']
            sources = [Path('rawdata/ffbe_asset_dump/monster_animated') / f'monster_anime_{sprite}.png',
                       Path('rawdata/ffbe_asset_dump/monster_animated_csv') / f'monster_cgg_{sprite}.csv']
            sources += sorted(Path('rawdata/ffbe_asset_dump/monster_animated_csv').glob(f'monster_*_cgs_{sprite}.csv'))
            skill_sets = rows('SELECT * FROM monster_skill_set WHERE monsterId=?', (data['monsterId'],))
            ids = {int(s) for group in skill_sets for s in (group['skillId'] or '').split(',') if s.strip()}
            skills = [r for i in sorted(ids) for r in rows('SELECT * FROM monster_skill WHERE monsterSkillId=?', (i,))]
            groups = rows('SELECT * FROM battle_group WHERE monsterId=? LIMIT 20', (data['monsterId'],))
            monsters.append(dict(recipe=recipe.as_posix(), identity=data,
                master=rows('SELECT * FROM monster WHERE monsterId=?', (data['monsterId'],)),
                dictionary=rows('SELECT * FROM monster_dictionary WHERE dictionaryId=?', (data['dictionaryId'],)),
                sourceFiles=[dict(path=p.as_posix(), exists=p.is_file(), sha256=sha(p) if p.is_file() else None) for p in sources],
                originalSkillSets=skill_sets, originalSkills=skills, battleGroupsSample=groups,
                limits=['Dictionary fileName=test1 is not a usable atlas reference.',
                        'Reviewed sprite binding is explicit in recipe; atlas/CGG/CGS must be validated together.',
                        'Original named attacks are inventory only, not published gameplay or animation support.']))
        backgrounds = []
        for filename in ['battle_bg_0003_01', 'battle_bg_2013_02']:
            files = [p for p in sorted(Path('rawdata/ffbe_asset_dump/battle_bg').glob(filename + '.*'))]
            backgrounds.append(dict(master=rows('SELECT * FROM battle_bg WHERE fileInfo=?', (filename + '.jpg',)),
                                    files=[dict(path=p.as_posix(), sha256=sha(p), bytes=p.stat().st_size) for p in files]))
        report = dict(schema='bounded-battle-content-v1', databaseSha256=sha(database),
            masterCounts={t: db.execute('SELECT count(*) FROM ' + t).fetchone()[0] for t in ['monster', 'monster_dictionary', 'world', 'dungeon', 'battle_bg']},
            monsters=monsters, backgrounds=backgrounds,
            worlds=rows('SELECT worldId,name,worldType FROM world'),
            audioInventory='docs/asset_structure.md: bounded audio inventory; archives/cue codec and skill audio joins still unsupported',
            limits=['Selected four reviewed monsters and two existing static arenas, not an exhaustive publication audit.',
                    'SSBP companion existence is not decoded background animation.',
                    'Dictionary battleBgmResourceId=0/default background is not an authenticated thematic music/stage join.',
                    'FFRogue encounter lineups, area titles, stats, hit timing and boss patterns are reviewed adaptations.'])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps(dict(monsters=len(monsters), backgrounds=len(backgrounds), masterCounts=report['masterCounts'])))


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output', type=Path, default=Path('tools/data/themed-stages-20261102/inventory.json'))
    inventory(p.parse_args().output)
