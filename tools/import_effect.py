"""
FFBE EFFECT IMPORT PIPELINE
Imports visual effect sprite sheets from DaddyRaegen/ffbe_asset_dump into public/assets/effects/<name>/
using ffbetool.exe.
"""

import os
import sys
import json
import shutil
import urllib.request
import subprocess
import argparse

BASE_RAW_URL = "https://raw.githubusercontent.com/DaddyRaegen/ffbe_asset_dump/main"

EFFECT_PRESETS = {
    "slash_heavy": {
        "name": "Heavy Slash",
        "atlas": "unit_animated/unit_anime_100039317.png",
        "cgg": "unit_animated_csv/unit_cgg_100039317.csv",
        "cgs": "unit_animated_csv/unit_limit_atkeff_cgs_100039317.csv",
        "anim_name": "limit_atkeff",
    },
    "curaga_light": {
        "name": "Curaga Light",
        "atlas": "unit_animated/unit_anime_210002507.png",
        "cgg": "unit_animated_csv/unit_cgg_210002507.csv",
        "cgs": "unit_animated_csv/unit_limit_atkeff_cgs_210002507.csv",
        "anim_name": "limit_atkeff",
    },
    "grenade_blast": {
        "name": "Grenade Blast",
        "atlas": "unit_animated/unit_anime_254000403.png",
        "cgg": "unit_animated_csv/unit_cgg_254000403ef.csv",
        "cgs": "unit_animated_csv/unit_limit_atk_cgs_254000403ef.csv",
        "anim_name": "limit_atk",
    },
}

def download_file(url, dest_path):
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "FFRoguePipeline/1.0"})
    with urllib.request.urlopen(req) as resp:
        content = resp.read()
    with open(dest_path, "wb") as f:
        f.write(content)
    return len(content)

def import_effect(effect_key, atlas_rel, cgg_rel, cgs_rel, anim_name="limit_atkeff", display_name=None, temp_uid=999001):
    display_name = display_name or effect_key
    print("=" * 65)
    print(f"IMPORTING EFFECT: {effect_key} ({display_name})")
    print("=" * 65)

    staging_dir = os.path.join("tools", "test_input", "effects")
    output_temp_dir = os.path.join("tools", "test_output", "effects")
    os.makedirs(staging_dir, exist_ok=True)
    os.makedirs(output_temp_dir, exist_ok=True)

    # 1. Clean and stage paths formatted strictly for ffbetool
    staged_png = os.path.join(staging_dir, f"unit_anime_{temp_uid}.png")
    staged_cgg = os.path.join(staging_dir, f"unit_cgg_{temp_uid}.csv")
    staged_cgs = os.path.join(staging_dir, f"unit_{anim_name}_cgs_{temp_uid}.csv")

    for p in [staged_png, staged_cgg, staged_cgs]:
        if os.path.exists(p):
            os.remove(p)

    # 2. Download raw files
    print(f"Downloading raw asset files for '{effect_key}'...")
    download_file(f"{BASE_RAW_URL}/{atlas_rel}", staged_png)
    download_file(f"{BASE_RAW_URL}/{cgg_rel}", staged_cgg)
    download_file(f"{BASE_RAW_URL}/{cgs_rel}", staged_cgs)
    print(f"  [+] Staged as temporary unit ID {temp_uid}")

    # 3. Run ffbetool.exe
    ffbetool_bin = os.path.join("tools", "bin", "ffbetool.exe")
    if not os.path.exists(ffbetool_bin):
        print(f"Error: ffbetool not found at '{ffbetool_bin}'")
        sys.exit(1)

    cmd = [
        ffbetool_bin,
        str(temp_uid),
        "--anim", anim_name,
        "-i", staging_dir,
        "-o", output_temp_dir,
        "--json",
        "-v"
    ]
    print(f"Running ffbetool: {' '.join(cmd)}")
    res = subprocess.run(cmd)
    if res.returncode != 0:
        print(f"Error: ffbetool assembly failed with exit code {res.returncode}")
        sys.exit(res.returncode)

    # 4. Read generated JSON metadata and copy spritesheet
    gen_json_path = os.path.join(output_temp_dir, f"{temp_uid}-{anim_name}.json")
    gen_png_path = os.path.join(output_temp_dir, f"{temp_uid}-{anim_name}.png")

    if not os.path.exists(gen_json_path) or not os.path.exists(gen_png_path):
        print(f"Error: ffbetool did not generate expected files for {temp_uid}")
        sys.exit(1)

    with open(gen_json_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    dest_dir = os.path.join("public", "assets", "effects", effect_key)
    os.makedirs(dest_dir, exist_ok=True)

    dest_png_name = f"{effect_key}.png"
    dest_png_path = os.path.join(dest_dir, dest_png_name)
    shutil.copyfile(gen_png_path, dest_png_path)

    frame_rect = meta["frameRect"]
    delays = meta["frameDelays"]
    fw = frame_rect["width"]
    fh = frame_rect["height"]

    pivot_x = round((1000.0 - frame_rect["x"]) / fw, 6)
    pivot_y = round((1000.0 - frame_rect["y"]) / fh, 6)

    total_duration_ms = 0
    frames_meta = []
    for idx, delay in enumerate(delays):
        d_ms = round(delay * (1000.0 / 60.0), 2)
        total_duration_ms += d_ms
        frames_meta.append({
            "index": idx,
            "delayTicks": delay,
            "durationMs": d_ms
        })

    manifest = {
        "effectId": effect_key,
        "name": display_name,
        "type": "effect",
        "file": dest_png_name,
        "frameWidth": fw,
        "frameHeight": fh,
        "frameCount": len(delays),
        "totalDurationMs": round(total_duration_ms, 2),
        "pivotX": pivot_x,
        "pivotY": pivot_y,
        "frames": frames_meta
    }

    manifest_path = os.path.join(dest_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"Exported to '{dest_dir}':")
    print(f"  Spritesheet : {dest_png_name} ({fw}x{fh}, {len(delays)} frames)")
    print(f"  Duration    : {round(total_duration_ms, 2)}ms")
    print(f"  Pivot       : ({pivot_x:.4f}, {pivot_y:.4f})")

    # 5. Cleanup temporary staged files
    for p in [staged_png, staged_cgg, staged_cgs, gen_json_path, gen_png_path]:
        if os.path.exists(p):
            os.remove(p)

    print(f"Successfully imported effect '{effect_key}'!\n")

def main():
    parser = argparse.ArgumentParser(description="FFBE visual effect importer.")
    parser.add_argument("--preset", "-p", choices=list(EFFECT_PRESETS.keys()) + ["all"], help="Use predefined effect preset")
    parser.add_argument("--key", "-k", type=str, help="Effect identifier")
    parser.add_argument("--atlas", type=str, help="Path in ffbe_asset_dump to atlas png")
    parser.add_argument("--cgg", type=str, help="Path in ffbe_asset_dump to cgg csv")
    parser.add_argument("--cgs", type=str, help="Path in ffbe_asset_dump to cgs csv")
    parser.add_argument("--anim", type=str, default="limit_atkeff", help="Animation name")
    parser.add_argument("--name", "-n", type=str, default=None, help="Display name")

    args = parser.parse_args()

    if args.preset:
        if args.preset == "all":
            for k, p in EFFECT_PRESETS.items():
                import_effect(k, p["atlas"], p["cgg"], p["cgs"], p["anim_name"], p["name"])
        else:
            p = EFFECT_PRESETS[args.preset]
            import_effect(args.preset, p["atlas"], p["cgg"], p["cgs"], p["anim_name"], p["name"])
    elif args.key and args.atlas and args.cgg and args.cgs:
        import_effect(args.key, args.atlas, args.cgg, args.cgs, args.anim, args.name)
    else:
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()
