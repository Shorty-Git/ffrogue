import os
import sys
import shutil
import json
import glob

def export_unit(unit_id="207000105", unit_name="cloud", input_dir="tools/test_output", output_base="public/assets/units"):
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
        
        print(f"  [+] {anim_name:10s} -> {png_dest_filename} ({f_w}x{f_h}, {len(delays)} frames, pivot: ({pivot_x:.4f}, {pivot_y:.4f}))")
        
    manifest_path = os.path.join(target_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        
    print(f"\nManifest successfully written to: {manifest_path}")

if __name__ == "__main__":
    uid = sys.argv[1] if len(sys.argv) > 1 else "207000105"
    uname = sys.argv[2] if len(sys.argv) > 2 else "cloud"
    export_unit(uid, uname)
