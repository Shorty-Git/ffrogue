"""Extract reviewed battle UI regions; raw Godot resources stay offline."""
from pathlib import Path
import hashlib
import json
import re
from PIL import Image

SOURCE = Path('assets/ui/battle')
OUTPUT = Path('public/assets/ui/battle')
REGIONS = {
    'command_plate': 'battle_com_bg',
    'attack': 'battle_com_icon_attack',
    'magic': 'battle_com_icon_magic',
    'ability': 'battle_com_icon_special',
    'party_plate': 'battle_listchara',
}

OUTPUT.mkdir(parents=True, exist_ok=True)
atlas = Image.open(SOURCE / 'battle.png')
receipt = {}
for key, name in REGIONS.items():
    resource = SOURCE / f'{name}.tres'
    match = re.search(r'region = Rect2\((\d+), (\d+), (\d+), (\d+)\)', resource.read_text())
    if not match:
        raise ValueError(f'Missing atlas region: {resource}')
    x, y, width, height = map(int, match.groups())
    if x + width > atlas.width or y + height > atlas.height:
        raise ValueError(f'Atlas region out of bounds: {resource}')
    target = OUTPUT / f'{key}.png'
    atlas.crop((x, y, x + width, y + height)).save(target)
    receipt[key] = {'source': resource.as_posix(), 'region': [x, y, width, height],
                    'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}
(OUTPUT / 'provenance.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(f'Exported {len(receipt)} reviewed UI regions to {OUTPUT}')
