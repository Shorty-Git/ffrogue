"""
Inspect Cloud animations and files in the local ffbe_asset_dump-main directory.
Target IDs: 207000105, 207000107
Keywords: climhazzard, unit_atkeff
"""

import os
import glob
import json

DUMP_DIR = "ffbe_asset_dump-main"

def main():
    if not os.path.exists(DUMP_DIR):
        print(f"Error: Directory '{DUMP_DIR}' does not exist.")
        return

    print("=" * 70)
    print("FFBE ASSET DUMP INSPECTION: CLOUD (207000105 / 207000107)")
    print("=" * 70)

    # 1. Search for all files containing 207000105 or 207000107
    unit_ids = ["207000105", "207000107"]
    found_files = {}

    for uid in unit_ids:
        found_files[uid] = []
        for root, dirs, files in os.walk(DUMP_DIR):
            for file in files:
                if uid in file:
                    rel_path = os.path.relpath(os.path.join(root, file), DUMP_DIR)
                    found_files[uid].append(rel_path)

    for uid, files in found_files.items():
        print(f"\n[+] Total files found for UID '{uid}': {len(files)}")
        # Group by category
        cgs_files = [f for f in files if "_cgs_" in f]
        cgg_files = [f for f in files if "_cgg_" in f]
        png_files = [f for f in files if f.endswith(".png")]
        other_files = [f for f in files if f not in cgs_files and f not in cgg_files and f not in png_files]

        print(f"    - PNG Atlases/Images: {len(png_files)}")
        for p in png_files:
            print(f"        * {p}")

        print(f"    - CGG Coordinate Files: {len(cgg_files)}")
        for c in cgg_files:
            print(f"        * {c}")

        print(f"    - CGS Animation Files: {len(cgs_files)}")
        for c in sorted(cgs_files):
            # Extract anim name from unit_<anim>_cgs_<uid>.csv
            base = os.path.basename(c)
            anim_name = base.replace(f"_{uid}.csv", "").replace("unit_", "")
            print(f"        * [{anim_name:18s}] -> {c}")

        if other_files:
            print(f"    - Other files: {len(other_files)}")
            for o in other_files[:10]:
                print(f"        * {o}")

    # 2. Search for climhazzard
    print("\n" + "=" * 70)
    print("SEARCHING FOR 'climhazzard' in dump filenames and CSV content...")
    print("=" * 70)
    clim_matches = []
    for root, dirs, files in os.walk(DUMP_DIR):
        for file in files:
            if "climhazzard" in file.lower():
                clim_matches.append(os.path.relpath(os.path.join(root, file), DUMP_DIR))

    print(f"Files matching 'climhazzard' by filename: {len(clim_matches)}")
    for m in clim_matches:
        print(f"    * {m}")

    # 3. Check data.json for Cloud units
    data_json_path = os.path.join(DUMP_DIR, "data.json")
    if os.path.exists(data_json_path):
        print("\nChecking data.json for Cloud unit metadata...")
        try:
            with open(data_json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for uid in unit_ids:
                    if uid in data:
                        print(f"  [data.json] Unit {uid}: {data[uid]}")
        except Exception as e:
            print(f"  Note: reading data.json skipped: {e}")

if __name__ == "__main__":
    main()
