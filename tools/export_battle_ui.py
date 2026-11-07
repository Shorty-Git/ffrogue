"""Extract reviewed FFBE battle UI parts for the DOM CombatHud; raw Godot resources stay offline.

Reads AtlasTexture regions from `assets/ui/battle/*.tres` (each names its own atlas PNG)
and composes the FFBE window frame from `assets/ui/window/window_*` into one 9-slice
image for CSS `border-image`. Writes standard PNGs plus a provenance receipt to
`public/assets/ui/battle/`.

Run from the repository root:  <python> tools/export_battle_ui.py
"""
from pathlib import Path
import hashlib
import json
import re
from PIL import Image

SOURCE = Path('assets/ui/battle')
WINDOW = Path('assets/ui/window')
OUTPUT = Path('public/assets/ui/battle')
REGIONS = {
    # Original command icons.
    'attack': 'battle_com_icon_attack',
    'magic': 'battle_com_icon_magic',
    'ability': 'battle_com_icon_special',
    'limit': 'battle_com_icon_limit',
    # Limit Burst gauge.
    'limit_gauge': 'battle_unit_limit_gauge',
    'limit_gauge_full': 'battle_unit_limit_gauge_full',
    'limit_bar': 'battle_unit_limit_bar',
    'limit_bar_full': 'battle_unit_limit_bar_full',
    # Party card and gauges.
    'party_unit_base': 'battle_base_partyunit',
    'unit_icon_frame': 'battle_bg_unit_icon',
    'hp_gauge': 'battle_unit_hp_gauge',
    'hp_bar_high': 'battle_unit_hp_bar1',
    'hp_bar_mid': 'battle_unit_hp_bar2',
    'hp_bar_low': 'battle_unit_hp_bar3',
    'mp_gauge': 'battle_unit_mp_long_gauge',
    'mp_bar': 'battle_unit_mp_long_bar',
    # Enemy HP plate.
    'enemy_hp_gauge': 'battle_enemy_hp_gauge',
    'enemy_hp_bar_high': 'battle_enemy_hp_bar1',
    'enemy_hp_bar_mid': 'battle_enemy_hp_bar2',
    'enemy_hp_bar_low': 'battle_enemy_hp_bar3',
    'enemy_hp_damage': 'battle_enemy_hp_bar_damage',
    'enemy_status_glow': 'battle_header_enemystatus',
}
WINDOW_SLICE = 56


def region(name):
    text = (SOURCE / f'{name}.tres').read_text()
    path = re.search(r'path="res://([^"]+)"', text)
    rect = re.search(r'region = Rect2\((\d+), (\d+), (\d+), (\d+)\)', text)
    if not path or not rect:
        raise ValueError(f'Missing atlas texture or region: {name}')
    x, y, width, height = map(int, rect.groups())
    atlas = Image.open(path.group(1)).convert('RGBA')
    if x + width > atlas.width or y + height > atlas.height:
        raise ValueError(f'Atlas region out of bounds: {name}')
    return atlas.crop((x, y, x + width, y + height)), {'source': f'{SOURCE.as_posix()}/{name}.tres',
                                                       'atlas': path.group(1), 'region': [x, y, width, height]}


def window_frame():
    """3x3 grid of 56 px cells: corners as-is, edges and base resampled to one cell."""
    s = WINDOW_SLICE
    sheet = Image.new('RGBA', (3 * s, 3 * s))
    load = lambda n: Image.open(WINDOW / f'window_{n}.png').convert('RGBA')
    cells = {(0, 0): 'corner_lt', (2, 0): 'corner_rt', (0, 2): 'corner_lb', (2, 2): 'corner_rb',
             (1, 0): 'line_top', (1, 2): 'line_bottom', (0, 1): 'line_left', (2, 1): 'line_right', (1, 1): 'base'}
    for (cx, cy), name in cells.items():
        piece = load(name)
        if piece.size != (s, s):
            piece = piece.resize((s, s), Image.LANCZOS)
        sheet.alpha_composite(piece, (cx * s, cy * s))
    return sheet, {'source': [f'{WINDOW.as_posix()}/window_{n}.png' for n in cells.values()],
                   'slice': s, 'note': 'Edges and base resampled to one cell for CSS border-image.'}


OUTPUT.mkdir(parents=True, exist_ok=True)
receipt = {}
outputs = {key: region(name) for key, name in REGIONS.items()}
outputs['window_frame'] = window_frame()
for key, (image, info) in outputs.items():
    target = OUTPUT / f'{key}.png'
    image.save(target)
    receipt[key] = {**info, 'size': list(image.size), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}
(OUTPUT / 'provenance.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(f'Exported {len(receipt)} battle UI parts to {OUTPUT}')
