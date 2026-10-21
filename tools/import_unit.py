import os
import sys
import subprocess
import argparse
import json
from fetch_unit import fetch_unit
from export_unit import export_unit

def import_unit(unit_id, unit_name=None, unit_type="character", skip_fetch=False):
    unit_id_str = str(unit_id)
    
    # 1. Resolve unit name if not provided
    if not unit_name:
        if unit_type == "monster":
            unit_name = f"monster_{unit_id_str}"
        else:
            if os.path.exists("character_data.json"):
                try:
                    with open("character_data.json", "r", encoding="utf-8") as f:
                        cdata = json.load(f)
                        if unit_id_str in cdata:
                            unit_name = cdata[unit_id_str].get("name", "").lower().replace(" ", "_")
                except Exception:
                    pass
            if not unit_name:
                unit_name = f"unit_{unit_id_str}"
            
    print("=" * 65)
    print(f"FFBE IMPORT PIPELINE: {unit_type.upper()} {unit_id_str} -> '{unit_name}'")
    print("=" * 65)
    
    # 2. Fetch raw files
    if not skip_fetch:
        print(f"\n--- STEP 1: Fetching raw {unit_type} files ---")
        fetch_unit(unit_id_str, "tools/test_input", unit_type)
    else:
        print(f"\n--- STEP 1: Skipping fetch (using existing files in tools/test_input) ---")
        
    # 3. Run ffbetool.exe
    print("\n--- STEP 2: Running ffbetool.exe ---")
    ffbetool_bin = os.path.join("tools", "bin", "ffbetool.exe")
    if not os.path.exists(ffbetool_bin):
        print(f"Error: ffbetool executable not found at '{ffbetool_bin}'")
        sys.exit(1)
        
    cmd = [
        ffbetool_bin,
        unit_id_str,
        "-i", "tools/test_input",
        "-o", "tools/test_output",
        "--unit_type", unit_type,
        "--json",
        "--gif",
        "-v"
    ]
    
    print(f"Executing: {' '.join(cmd)}")
    res = subprocess.run(cmd)
    if res.returncode != 0:
        print(f"Error: ffbetool failed with exit code {res.returncode}")
        sys.exit(res.returncode)
        
    # 4. Export to game assets
    output_base = "public/assets/monsters" if unit_type == "monster" else "public/assets/units"
    print(f"\n--- STEP 3: Exporting to {output_base}/{unit_name} ---")
    export_unit(unit_id_str, unit_name, "tools/test_output", output_base, unit_type)
    
    print("\n" + "=" * 65)
    print(f"IMPORT COMPLETE: {unit_name} is ready in {output_base}/{unit_name}/")
    print("=" * 65)

def main():
    parser = argparse.ArgumentParser(description="End-to-end import pipeline for a FFBE character or monster.")
    parser.add_argument("--id", "-i", type=str, required=True, help="Unit/Monster ID")
    parser.add_argument("--name", "-n", type=str, default=None, help="Folder name")
    parser.add_argument("--type", "-t", type=str, default="character", choices=["character", "monster"], help="Type: character or monster")
    parser.add_argument("--skip-fetch", action="store_true", help="Skip downloading if raw files exist in tools/test_input")
    
    args = parser.parse_args()
    import_unit(args.id, args.name, args.type, args.skip_fetch)

if __name__ == "__main__":
    main()
