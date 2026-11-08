"""Compare published audio with exact Memorial master effect-group composition."""
import argparse
import csv
import hashlib
import json
import sqlite3
from pathlib import Path

from compose_skill_effects import compose_effects
from read_acb_cues import cue_rows


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def groups(db, timeline):
    result = []
    for entry in timeline.split('&'):
        frame, group, *_ = entry.split(':')
        raw, = db.execute('SELECT "1fVZ3rKd" FROM effect_group WHERE effectGroupId=?',
                          (int(group),)).fetchone()
        if raw:
            result.append({'group': int(group), 'frame': int(frame), 'soundsRaw': raw})
    return result


def attack_clip(form):
    path = Path(f'rawdata/ffbe_asset_dump/unit_animated_csv/unit_atk_cgs_{form}.csv')
    if not path.is_file():
        return None
    with path.open(newline='', encoding='utf-8-sig') as source:
        durations = [int(row[3]) for row in csv.reader(source) if row]
    return {'path': path.as_posix(), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'poseCount': len(durations), 'durationFrames': sum(durations)}


def audit(db, bank):
    review = load('tools/presentations/source-audio-review.json')
    bank_bytes = bank.read_bytes()
    assert hashlib.sha256(bank_bytes).hexdigest() == review['bankSha256'], 'Unexpected SE bank'
    native = {row['cueId']: row['name'] for row in cue_rows(bank_bytes)}
    for key, cue in review['cues'].items():
        assert native[int(key.split(':')[1])] == cue['name'], key
    catalog = load('public/assets/content.json')['characters']
    skills, attacks = [], []
    for unit_key in catalog:
        recipe = load(f'tools/characters/{unit_key}.json')
        unit_id = recipe['spriteUnitId']
        attack, = db.execute('SELECT effectFrames FROM unit WHERE unitId=?', (unit_id,)).fetchone()
        series, = db.execute('SELECT unitSeries FROM unit WHERE unitId=?', (unit_id,)).fetchone()
        for form, damage, effects in db.execute(
            'SELECT unitId, attackFrames, effectFrames FROM unit WHERE unitSeries=? ORDER BY unitId', (series,)
        ):
            attacks.append({'unit': unit_key, 'form': form, 'attackFrames': damage, 'bodyClip': attack_clip(form),
                            'soundGroups': groups(db, effects)})
        for skill in load(f'public/assets/units/{unit_key}/skills.json')['skills']:
            key = skill.get('scenePresentation')
            if not key:
                continue
            source_id = skill['ffbeId']
            motion, timeline = db.execute('SELECT motionType,effectFrames FROM ability WHERE abilityId=?',
                                          (source_id,)).fetchone()
            composed = compose_effects(attack, timeline, motion)
            original = groups(db, composed['effectFrames'])
            manifest = load(f'public/assets/presentations/{key}/manifest.json')
            audio = manifest.get('audioSource', {})
            played = audio.get('playbackSupported', False)
            if played:
                assert audio['sourceGroups'] == original, key
            skills.append({'skill': skill['name'], 'id': source_id, 'referenceForm': unit_id,
                           'presentation': key, 'soundGroups': original, 'published': played})
    return {'skills': skills, 'standardAttacks': attacks}


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('database', type=Path)
    cli.add_argument('bank', type=Path)
    args = cli.parse_args()
    with sqlite3.connect(args.database.resolve().as_uri() + '?mode=ro', uri=True) as connection:
        print(json.dumps(audit(connection, args.bank), indent=2))
