import os
import sys
import shutil
import json
import glob
import argparse

def export_unit(unit_id, unit_name, input_dir="tools/test_output", output_base="public/assets/units"):
    target_dir = os.path.join(output_base, unit_name)
    os.makedirs(target_dir, exist_ok=True)
    
    print(f"Exporting unit {unit_id} ({unit_name}) from '{input_dir}' to '{target_dir}'...")
    
    # Find all json files matching the unit_id
    json_pattern = os.path.join(input_dir, f"{unit_id}-*.json")
    json_files = glob.glob(json_pattern)
    
    if not json_files:
        print(f"Error: No JSON files found matching pattern '{json_pattern}'")
        sys.exit(1)
        
    manifest = {
        "unitId": str(unit_id),
        "name": unit_name,
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
        
    manifest_path = os.path.join(target_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        
    print(f"\nManifest successfully written to: {manifest_path}")

def main():
    parser = argparse.ArgumentParser(description="Export assembled FFBE unit assets to Phaser format.")
    parser.add_argument("--id", "-i", type=str, default="207000105", help="Unit ID (e.g. 207000105 for Cloud, 207000405 for Aerith)")
    parser.add_argument("--name", "-n", type=str, default=None, help="Unit name / target folder name (e.g. cloud, aerith)")
    parser.add_argument("--input", "-in", dest="input_dir", type=str, default="tools/test_output", help="Input directory containing ffbetool output")
    parser.add_argument("--output", "-out", dest="output_base", type=str, default="public/assets/units", help="Output base directory")
    
    # Also support positional arguments for backwards compatibility
    parser.add_argument("pos_id", nargs="?", default=None, help="Positional Unit ID fallback")
    parser.add_argument("pos_name", nargs="?", default=None, help="Positional Unit name fallback")
    
    args = parser.parse_args()
    
    unit_id = args.pos_id or args.id
    unit_name = args.pos_name or args.name
    
    if not unit_name:
        # Try to resolve from character_data.json if present
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
            
    export_unit(unit_id, unit_name, args.input_dir, args.output_base)

if __name__ == "__main__":
    main()
