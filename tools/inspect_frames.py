from PIL import Image
import json

anims = ['idle', 'move', 'atk']

print("=" * 60)
print("FFBE CLOUD (207000105) - FRAME & ANCHOR ANALYSIS")
print("=" * 60)

for anim in anims:
    json_path = f"tools/test_output/207000105-{anim}.json"
    png_path = f"tools/test_output/207000105-{anim}.png"
    
    with open(json_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
        
    img = Image.open(png_path)
    f_rect = meta["frameRect"]
    delays = meta["frameDelays"]
    num_frames = len(delays)
    f_w = f_rect["width"]
    f_h = f_rect["height"]
    
    # In ffbetool, all parts are placed relative to HALF_CANVAS (1000, 1000).
    # The bounding box starts at frameRect.x, frameRect.y.
    # Therefore, (1000, 1000) within the cropped frame coordinate system is:
    origin_x = 1000 - f_rect["x"]
    origin_y = 1000 - f_rect["y"]
    
    norm_x = origin_x / f_w
    norm_y = origin_y / f_h
    
    print(f"\n[ANIMATION: {anim.upper()}]")
    print(f"  - Spritesheet Bildgroesse (PNG): {img.size[0]} x {img.size[1]} px")
    print(f"  - Einzel-Frame Groesse:          {f_w} x {f_h} px")
    print(f"  - Frame-Anzahl:                  {num_frames} Frames")
    print(f"  - Frame Delays (Ticks):          {delays}")
    print(f"  - frameRect (auf 2000x2000):     x={f_rect['x']}, y={f_rect['y']}, w={f_w}, h={f_h}")
    print(f"  - Exakter Ursprungspunkt/Anchor: ({origin_x}, {origin_y}) px relativ zur oberen linken Ecke des Frames")
    print(f"  - Normalisierter Phaser-Pivot:   ({norm_x:.4f}, {norm_y:.4f})")

print("\n" + "=" * 60)
print("VERGLEICH DER ANCHOR-POSITIONEN (WARUM DER SPRITE OHNE KORREKTUR SPRINGT):")
print("=" * 60)
print("Wenn ein Game-Engine wie Phaser standardmaessig Pivot (0.5, 0.5) oder (0, 0) nutzt:")
print("  - idle: Ursprung ist bei x=51, y=54 im 86x69 Frame")
print("  - move: Ursprung ist bei x=19, y=73 im 75x88 Frame (Cloud beugt sich vor!)")
print("  - atk:  Ursprung ist bei x=103, y=87 im 163x126 Frame (Buster Sword ragt weit nach links/oben/rechts!)")
print("\nErgebnis: Der Charakter verschiebt sich innerhalb der Bounding-Box massiv!")
print("Aber: ffbetool liefert in der JSON ueber 'frameRect' exakt die Koordinaten,")
print("mit denen der Ursprungspunkt (1000 - x, 1000 - y) fuer JEDE Animation")
print("mathematisch perfekt auf denselben Weltkoordinaten-Punkt verankert werden kann!")
