import os
import sys
import shutil
import json
import glob
import argparse
from PIL import Image

def compute_feet_x(image_path, frame_idx, fw, fh, piv_x, piv_y):
    try:
        with Image.open(image_path) as img:
            crop = img.crop((frame_idx * fw, 0, (frame_idx + 1) * fw, fh))
            pixels = crop.load()
            pts = []
            for y in range(fh):
                for x in range(fw):
                    pix = pixels[x, y]
                    if len(pix) >= 4 and pix[3] > 50:
                        pts.append((x - piv_x, y - piv_y))
            if not pts:
                return 0.0
            ys = [p[1] for p in pts]
            max_y = max(ys)
            feet_pts = [p for p in pts if p[1] >= max_y - 3]
            feet_xs = [p[0] for p in feet_pts]
            return round((min(feet_xs) + max(feet_xs)) / 2.0, 2)
    except Exception as e:
        print(f"Warning: Failed to compute feet_x for {image_path}: {e}")
        return 0.0

def export_unit(unit_id, unit_name, input_dir="tools/test_output", output_base="public/assets/units", unit_type="character"):
    # If output_base wasn't explicitly changed from default, route to monsters when type is monster
    if unit_type == "monster" and output_base == "public/assets/units":
        output_base = "public/assets/monsters"
        
    target_dir = os.path.join(output_base, unit_name)
    os.makedirs(target_dir, exist_ok=True)
    
    print(f"Exporting {unit_type} {unit_id} ({unit_name}) from '{input_dir}' to '{target_dir}'...")
    
    # Find all json files matching the unit_id
    json_pattern = os.path.join(input_dir, f"{unit_id}-*.json")
    json_files = glob.glob(json_pattern)
    
    if not json_files:
        print(f"Error: No JSON files found matching pattern '{json_pattern}'")
        sys.exit(1)
        
    manifest = {
        "unitId": str(unit_id),
        "name": unit_name,
        "type": unit_type,
        "animations": {}
    }
    
    for jf in sorted(json_files):
        with open(jf, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        anim_name = data.get("animName")
        frame_rect = data.get("frameRect")
        delays = data.get("frameDelays", [])
        
        png_src = os.path.join(input_dir, f"{unit_id}-{anim_name}.png")
        if not os.path.exists(png_src):
            print(f"Warning: PNG file '{png_src}' not found, skipping animation '{anim_name}'")
            continue
            
        png_dest_filename = f"{anim_name}.png"
        png_dest_path = os.path.join(target_dir, png_dest_filename)
        shutil.copyfile(png_src, png_dest_path)
        
        f_w = frame_rect["width"]
        f_h = frame_rect["height"]
        
        # Origin (1000, 1000) on ffbetool 2000x2000 canvas
        pivot_x = round((1000.0 - frame_rect["x"]) / f_w, 6)
        pivot_y = round((1000.0 - frame_rect["y"]) / f_h, 6)
        
        frames_meta = []
        for idx, delay in enumerate(delays):
            duration_ms = round(delay * (1000.0 / 60.0), 2)
            frames_meta.append({
                "index": idx,
                "delayTicks": delay,
                "durationMs": duration_ms
            })
            
        manifest["animations"][anim_name] = {
            "file": png_dest_filename,
            "frameWidth": f_w,
            "frameHeight": f_h,
            "frameCount": len(delays),
            "pivotX": pivot_x,
            "pivotY": pivot_y,
            "frames": frames_meta
        }
        
        print(f"  [+] {anim_name:12s} -> {png_dest_filename} ({f_w}x{f_h}, {len(delays)} frames, pivot: ({pivot_x:.4f}, {pivot_y:.4f}))")
        
    # Calculate recoilOffsetX for each animation relative to idle frame 0
    idle_meta = manifest["animations"].get("idle")
    if idle_meta:
        idle_png = os.path.join(target_dir, idle_meta["file"])
        idle_fw = idle_meta["frameWidth"]
        idle_fh = idle_meta["frameHeight"]
        idle_px = idle_meta["pivotX"] * idle_fw
        idle_py = idle_meta["pivotY"] * idle_fh
        idle_feet_x = compute_feet_x(idle_png, 0, idle_fw, idle_fh, idle_px, idle_py)
        
        for anim_name, meta in manifest["animations"].items():
            if anim_name == "idle":
                meta["recoilOffsetX"] = 0.0
                continue
            anim_png = os.path.join(target_dir, meta["file"])
            fw = meta["frameWidth"]
            fh = meta["frameHeight"]
            px = meta["pivotX"] * fw
            py = meta["pivotY"] * fh
            last_idx = meta["frameCount"] - 1
            last_feet_x = compute_feet_x(anim_png, last_idx, fw, fh, px, py)
            diff = round(idle_feet_x - last_feet_x, 2)
            meta["recoilOffsetX"] = diff if abs(diff) >= 0.5 else 0.0
            if meta["recoilOffsetX"] != 0.0:
                print(f"      recoilOffsetX for '{anim_name}': {meta['recoilOffsetX']} px (last frame {last_idx})")

    manifest_path = os.path.join(target_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        
    print(f"\nManifest successfully written to: {manifest_path}")

def main():
    parser = argparse.ArgumentParser(description="Export assembled FFBE unit or monster assets to Phaser format.")
    parser.add_argument("--id", "-i", type=str, default="207000105", help="Unit/Monster ID")
    parser.add_argument("--name", "-n", type=str, default=None, help="Folder name")
    parser.add_argument("--type", "-t", type=str, default="character", choices=["character", "monster"], help="Entity type (character or monster)")
    parser.add_argument("--input", "-in", dest="input_dir", type=str, default="tools/test_output", help="Input directory")
    parser.add_argument("--output", "-out", dest="output_base", type=str, default="public/assets/units", help="Output base directory")
    
    # Positional fallback
    parser.add_argument("pos_id", nargs="?", default=None, help="Positional Unit ID fallback")
    parser.add_argument("pos_name", nargs="?", default=None, help="Positional Unit name fallback")
    
    args = parser.parse_args()
    
    unit_id = args.pos_id or args.id
    unit_name = args.pos_name or args.name
    
    if not unit_name:
        if args.type == "monster":
            unit_name = f"monster_{unit_id}"
        else:
            if os.path.exists("character_data.json"):
                try:
                    with open("character_data.json", "r", encoding="utf-8") as f:
                        cdata = json.load(f)
                        if unit_id in cdata:
                            unit_name = cdata[unit_id].get("name", "").lower().replace(" ", "_")
                except Exception:
                    pass
            if not unit_name:
                unit_name = f"unit_{unit_id}"
            
    export_unit(unit_id, unit_name, args.input_dir, args.output_base, args.type)

if __name__ == "__main__":
    main()
