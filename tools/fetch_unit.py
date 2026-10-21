import os
import sys
import json
import urllib.request
import argparse

CATALOG_URL = "https://raw.githubusercontent.com/DaddyRaegen/ffbe_asset_dump/main/catalog/units.json"
BASE_RAW_URL = "https://raw.githubusercontent.com/DaddyRaegen/ffbe_asset_dump/main"

def fetch_unit(unit_id, output_dir="tools/test_input"):
    os.makedirs(output_dir, exist_ok=True)
    unit_id_str = str(unit_id)
    
    print(f"Fetching asset metadata for unit ID {unit_id_str} from catalog...")
    req = urllib.request.Request(CATALOG_URL, headers={"User-Agent": "FFRoguePipeline/1.0"})
    with urllib.request.urlopen(req) as resp:
        catalog = json.loads(resp.read().decode("utf-8"))
        
    unit_entry = None
    for u in catalog:
        if str(u.get("id")) == unit_id_str:
            unit_entry = u
            break
            
    if not unit_entry:
        print(f"Error: Unit ID {unit_id_str} not found in catalog!")
        sys.exit(1)
        
    files_to_download = []
    
    # 1. Atlas sprite sheet
    sprite_sheet = unit_entry.get("sprite_sheet")
    if sprite_sheet:
        files_to_download.append(sprite_sheet)
    else:
        for ss in unit_entry.get("sprite_sheets", []):
            files_to_download.append(ss)
            
    # 2. Frame definition (cgg)
    frame_data = unit_entry.get("frame_data")
    if frame_data:
        files_to_download.append(frame_data)
        
    # 3. Animation CSVs (cgs)
    for anim_csv in unit_entry.get("animation_csvs", []):
        files_to_download.append(anim_csv)
        
    files_to_download = sorted(list(set(files_to_download)))
    print(f"Found {len(files_to_download)} files to download for unit {unit_id_str}.")
    
    downloaded_count = 0
    for rel_path in files_to_download:
        filename = os.path.basename(rel_path)
        dest_path = os.path.join(output_dir, filename)
        file_url = f"{BASE_RAW_URL}/{rel_path}"
        
        print(f"  Downloading {filename}...", end="", flush=True)
        file_req = urllib.request.Request(file_url, headers={"User-Agent": "FFRoguePipeline/1.0"})
        with urllib.request.urlopen(file_req) as file_resp, open(dest_path, "wb") as out_f:
            out_f.write(file_resp.read())
            
        size = os.path.getsize(dest_path)
        print(f" done ({size} bytes)")
        downloaded_count += 1
        
    print(f"\nSuccessfully downloaded {downloaded_count} files into '{output_dir}'.")

def main():
    parser = argparse.ArgumentParser(description="Fetch raw assets for a FFBE unit from GitHub dump.")
    parser.add_argument("--id", "-i", type=str, required=True, help="Unit ID (e.g. 207000405 for Aerith)")
    parser.add_argument("--output", "-o", type=str, default="tools/test_input", help="Output directory")
    
    args = parser.parse_args()
    fetch_unit(args.id, args.output)

if __name__ == "__main__":
    main()
