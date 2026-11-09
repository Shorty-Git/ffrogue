"""Export original FFBE status icons for the battle HUD (offline; reads the asset dump).

state_icon_up.png / state_icon_down.png are 32 px grids (9 columns); the single ailment icons
come from rawdata/assets/icons/ailments. Output: public/assets/ui/status/<key>.png, one per game status.
    <python> tools/export_status_icons.py
"""
from pathlib import Path
from PIL import Image

OUT = Path('public/assets/ui/status')
CELL, COLUMNS = 34, 9  # 32 px icon plus 2 px gap, measured from the alpha runs (1..30, 33..62, ...)
GRID = {
    'physical-boost': ('rawdata/assets/ui/battle/state_icon_up.png', 0),   # ATK up
    'auto-revive': ('rawdata/assets/ui/battle/state_icon_up.png', 24),     # Reraise (figure with golden aura)
    'guard-physical': ('rawdata/assets/ui/battle/state_icon_up.png', 1),   # DEF up (shield): Protect
    'guard-magical': ('rawdata/assets/ui/battle/state_icon_up.png', 3),    # SPR up (hat): Shell
}
SINGLE = {
    'attack-down': 'rawdata/assets/icons/ailments/break_atk.png',
    'physical-weakness': 'rawdata/assets/icons/ailments/break_def.png',
    'magic-weakness': 'rawdata/assets/icons/ailments/break_spr.png',
    'silence': 'rawdata/assets/icons/ailments/silence.png',
    'stop': 'rawdata/assets/icons/ailments/stop.png',
    # Enemy debuffs on heroes (heroBuffs.mjs 'break' per stat, 'blind').
    'break-attack': 'rawdata/assets/icons/ailments/break_atk.png',
    'break-defense': 'rawdata/assets/icons/ailments/break_def.png',
    'break-magic': 'rawdata/assets/icons/ailments/break_mag.png',
    'break-spirit': 'rawdata/assets/icons/ailments/break_spr.png',
    'blind': 'rawdata/assets/icons/ailments/blind.png',
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for key, (sheet, index) in GRID.items():
        with Image.open(sheet) as image:
            column, row = index % COLUMNS, index // COLUMNS
            box = (1 + column * 32, 2 + row * 34, 1 + column * 32 + 30, 2 + row * 34 + 32)
            image.convert('RGBA').crop(box).resize((48, 48), Image.LANCZOS).save(OUT / f'{key}.png')
    for key, path in SINGLE.items():
        with Image.open(path) as image:
            image.convert('RGBA').resize((48, 48), Image.LANCZOS).save(OUT / f'{key}.png')
    print(sorted(p.name for p in OUT.glob('*.png')))


if __name__ == '__main__':
    main()
