import os
import sys
import json
import urllib.request
import argparse

CATALOG_UNITS_URL = "https://raw.githubusercontent.com/DaddyRaegen/ffbe_asset_dump/main/catalog/units.json"
CATALOG_MONSTERS_URL = "https://raw.githubusercontent.com/DaddyRaegen/ffbe_asset_dump/main/catalog/monsters.json"
BASE_RAW_URL = "https://raw.githubusercontent.com/DaddyRaegen/ffbe_asset_dump/main"

def fetch_unit(unit_id, output_dir="tools/test_input", unit_type="character"):
    os.makedirs(output_dir, exist_ok=True)
    unit_id_str = str(unit_id)
    
    files_to_download = []
    
    if unit_type == "monster":
        print(f"Fetching monster metadata for ID {unit_id_str} from monsters catalog...")
        req = urllib.request.Request(CATALOG_MONSTERS_URL, headers={"User-Agent": "FFRoguePipeline/1.0"})
        with urllib.request.urlopen(req) as resp:
            catalog = json.loads(resp.read().decode("utf-8"))
            
        monster_entry = next((m for m in catalog if str(m.get("id")) == unit_id_str), None)
        if not monster_entry:
            print(f"Warning: Monster ID {unit_id_str} not in catalog, probing standard paths directly...")
            files_to_download.append(f"monster_animated/monster_anime_{unit_id_str}.png")
            files_to_download.append(f"monster_animated_csv/monster_cgg_{unit_id_str}.csv")
            for anim in ["idle", "atk", "damage", "die", "magic", "skill", "move"]:
                files_to_download.append(f"monster_animated_csv/monster_{anim}_cgs_{unit_id_str}.csv")
        else:
            files_to_download.append(monster_entry["sprite_sheet"])
            files_to_download.append(monster_entry["frame_data"])
            files_to_download.append(monster_entry["idle_animation"])
            # Probe additional monster animations
            for anim in ["atk", "damage", "die", "magic", "skill", "move"]:
                files_to_download.append(f"monster_animated_csv/monster_{anim}_cgs_{unit_id_str}.csv")
    else:
        print(f"Fetching character metadata for ID {unit_id_str} from units catalog...")
        req = urllib.request.Request(CATALOG_UNITS_URL, headers={"User-Agent": "FFRoguePipeline/1.0"})
        with urllib.request.urlopen(req) as resp:
            catalog = json.loads(resp.read().decode("utf-8"))
            
        unit_entry = next((u for u in catalog if str(u.get("id")) == unit_id_str), None)
        if not unit_entry:
            print(f"Error: Unit ID {unit_id_str} not found in units catalog!")
            sys.exit(1)
            
        sprite_sheet = unit_entry.get("sprite_sheet")
        if sprite_sheet:
            files_to_download.append(sprite_sheet)
        else:
            for ss in unit_entry.get("sprite_sheets", []):
                files_to_download.append(ss)
                
        frame_data = unit_entry.get("frame_data")
        if frame_data:
            files_to_download.append(frame_data)
            
        for anim_csv in unit_entry.get("animation_csvs", []):
            files_to_download.append(anim_csv)
            
    files_to_download = sorted(list(set(files_to_download)))
    print(f"Checking/Downloading up to {len(files_to_download)} potential files for {unit_type} {unit_id_str}...")
    
    downloaded_count = 0
    for rel_path in files_to_download:
        filename = os.path.basename(rel_path)
        dest_path = os.path.join(output_dir, filename)
        file_url = f"{BASE_RAW_URL}/{rel_path}"
        
        try:
            file_req = urllib.request.Request(file_url, headers={"User-Agent": "FFRoguePipeline/1.0"})
            with urllib.request.urlopen(file_req) as file_resp:
                content = file_resp.read()
            with open(dest_path, "wb") as out_f:
                out_f.write(content)
            size = len(content)
            print(f"  [+] {filename:35s} -> {size} bytes")
            downloaded_count += 1
        except urllib.error.HTTPError as e:
            if e.code == 404:
                # Optional animation not found - normal for monsters without that anim
                pass
            else:
                print(f"  [!] HTTP {e.code} on {filename}")
        except Exception as ex:
            print(f"  [!] Error on {filename}: {ex}")
            
    print(f"\nSuccessfully downloaded {downloaded_count} files into '{output_dir}'.")

def main():
    parser = argparse.ArgumentParser(description="Fetch raw assets for a FFBE unit or monster from GitHub dump.")
    parser.add_argument("--id", "-i", type=str, required=True, help="Unit/Monster ID")
    parser.add_argument("--type", "-t", type=str, default="character", choices=["character", "monster"], help="Unit type (character or monster)")
    parser.add_argument("--output", "-o", type=str, default="tools/test_input", help="Output directory")
    
    args = parser.parse_args()
    fetch_unit(args.id, args.output, args.type)

if __name__ == "__main__":
    main()
