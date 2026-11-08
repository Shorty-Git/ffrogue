"""Inventory the published character roster's CGG mode-1 use, without changing assets."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops
from prepare_cgg_body_layers import rows


def inventory(key, path, dump):
    manifest = json.loads((path / 'manifest.json').read_text(encoding='utf-8'))
    unit = manifest['unitId']
    cgg = dump / 'unit_animated_csv' / f'unit_cgg_{unit}.csv'
    atlas = dump / 'unit_animated' / f'unit_anime_{unit}.png'
    result = {'key': key, 'unit': unit, 'clips': len(manifest['animations']), 'active': {}}
    if not cgg.is_file() or not atlas.is_file():
        return {**result, 'blockers': ['Missing CGG or atlas']}
    for label, source in [('cgg', cgg), ('atlas', atlas)]:
        result[label] = {'path': str(source), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()}
    blockers = []
    poses = []
    with Image.open(atlas) as image:
        red, green, blue, alpha = image.convert('RGBA').split()
        light = ImageChops.multiply(ImageChops.lighter(ImageChops.lighter(red, green), blue), alpha)
        for index, row in enumerate(rows(cgg)):
            if len(row) != 2 + row[1] * 11:
                blockers.append(f'Unsupported CGG layout in pose {index}')
                poses.append(None)
                continue
            parts = [row[i:i + 11] for i in range(2, len(row), 11)]
            if any(p[3] not in (0, 1) or p[10] for p in parts):
                blockers.append(f'Unsupported blend or atlas page in pose {index}')
            poses.append(sum(1 for p in parts if p[3] == 1 and p[4] > 0 and p[10] == 0
                             and light.crop((p[6], p[7], p[6]+p[8], p[7]+p[9])).getbbox()))
    for clip, meta in manifest['animations'].items():
        cgs = cgg.with_name(f'unit_{clip}_cgs_{unit}.csv')
        if not cgs.is_file():
            blockers.append(f'{clip}: no matching source CGS')
            continue
        sequence = rows(cgs)
        delays_match = [row[3] for row in sequence] == [frame['delayTicks'] for frame in meta['frames']]
        if not delays_match:
            blockers.append(f'{clip}: source and published delays differ')
        counts = [poses[row[0]] for row in sequence]
        if any(counts):
            result['active'][clip] = {'frames': sum(bool(n) for n in counts), 'sourceFrames': len(counts),
                                      'publishedLayers': 'bodyLayers' in meta}
    return {**result, 'blockers': blockers}


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--dump', type=Path, default=Path('rawdata/ffbe_asset_dump'))
    cli.add_argument('--output', type=Path, required=True)
    args = cli.parse_args()
    root = Path('public')
    roster = json.loads((root / 'assets/content.json').read_text())
    run = json.loads((root / 'assets/run-content.json').read_text())
    targets = {key: root / 'assets/units' / key for key in roster['characters']}
    targets.update({form['key']: root / form['assetPath'] for form in run['forms']})
    report = [inventory(key, path, args.dump) for key, path in targets.items()]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    for entry in report:
        idle = entry['active'].get('idle', {}).get('frames', 0)
        print(f"{entry['key']:24} {entry['unit']}  idle {idle:2}, clips {len(entry['active']):2}/{entry['clips']:2}, blockers {len(entry['blockers'])}")
