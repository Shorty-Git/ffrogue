#!/usr/bin/env python3
"""
FFBE Unit Skill Extractor
Extracts authentic skills, MP costs, damage multipliers, hit counts, and movement types
from canonical FFBE datamining records (aEnigmatic/ffbe) into clean JSON assets.
"""

import os
import sys
import json
import re
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
REPO_BASE = "https://raw.githubusercontent.com/aEnigmatic/ffbe/master"

SOURCES = {
    "units": f"{REPO_BASE}/units.json",
    "skills_ability": f"{REPO_BASE}/skills_ability.json",
    "skills_magic": f"{REPO_BASE}/skills_magic.json",
}

def ensure_data_file(name: str, url: str) -> dict:
    os.makedirs(DATA_DIR, exist_ok=True)
    file_path = os.path.join(DATA_DIR, f"{name}.json")
    if os.path.exists(file_path) and os.path.getsize(file_path) > 1000:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    print(f"[Download] Fetching {name}.json from {url}...")
    req = urllib.request.Request(url, headers={"User-Agent": "ffrogue-pipeline"})
    with urllib.request.urlopen(req) as resp:
        content = resp.read().decode("utf-8")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    return json.loads(content)

def extract_multiplier(text: str) -> float:
    if not text:
        return 1.0
    eq_match = re.search(r"=\s*(\d+(?:\.\d+)?)x", text, re.I)
    if eq_match:
        return float(eq_match.group(1))
    std_match = re.search(r"\((\d+(?:\.\d+)?)x", text, re.I)
    if std_match:
        return float(std_match.group(1))
    return 1.0

def extract_scope(text: str) -> str:
    if not text:
        return "single_enemy"
    t = text.lower()
    if "to all enemies" in t or "all enemies" in t:
        return "all_enemies"
    if "to all allies" in t or "party" in t or "all allies" in t:
        return "party"
    if "to one ally" in t or "one ally" in t or "caster" in t:
        return "single_ally"
    return "single_enemy"

def find_unit(units: dict, query: str):
    if query in units:
        return query, units[query]
    for k, u in units.items():
        if "entries" in u and isinstance(u["entries"], dict) and query in u["entries"]:
            return k, u
    q = query.lower()
    for k, u in units.items():
        name = u.get("name", "")
        if name and name.lower() == q:
            return k, u
        for alt in u.get("names", []):
            if alt.lower() == q:
                return k, u
    return None, None

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Extract FFBE unit skills from datamine")
    parser.add_argument("-u", "--unit", default="207000105", help="Unit ID or name (default: 207000105)")
    parser.add_argument("-o", "--out", default=None, help="Output JSON path")
    parser.add_argument("-a", "--all", action="store_true", help="Extract all active skills without filtering")
    args = parser.parse_args()

    units_data = ensure_data_file("units", SOURCES["units"])
    abilities_data = ensure_data_file("skills_ability", SOURCES["skills_ability"])
    magic_data = ensure_data_file("skills_magic", SOURCES["skills_magic"])

    root_id, unit = find_unit(units_data, args.unit)
    if not unit:
        print(f"Error: Unit '{args.unit}' not found!")
        sys.exit(1)

    unit_name = unit.get("name", "Unknown")
    unit_slug = re.sub(r"[^a-z0-9]+", "_", unit_name.lower()).strip("_")
    print(f"[Match] Found {unit_name} (ID: {root_id})")

    parsed = []
    seen = set()

    for s in unit.get("skills", []):
        sk_id = s.get("id")
        sk_type = s.get("type")
        sk_obj = None
        if sk_type == "ABILITY":
            sk_obj = abilities_data.get(str(sk_id))
        elif sk_type == "MAGIC":
            sk_obj = magic_data.get(str(sk_id))
        if not sk_obj:
            continue

        name = sk_obj.get("name", "")
        effects = sk_obj.get("effects", [])
        primary = effects[0][0] if effects and effects[0] else ""

        if "unlock " in primary.lower() and " turn " in primary.lower():
            continue

        cost_obj = sk_obj.get("cost", {})
        mp_cost = cost_obj.get("MP", sk_obj.get("mp_cost", 0))
        if mp_cost == 0 and not args.all:
            continue
        if name in seen and not args.all:
            continue
        seen.add(name)

        slug = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
        attack_frames = sk_obj.get("attack_frames", [[]])[0] if sk_obj.get("attack_frames") else []
        hit_count = sk_obj.get("attack_count", [len(attack_frames) or 1])[0]

        parsed.append({
            "id": slug,
            "ffbeId": sk_id,
            "name": name,
            "rarity": s.get("rarity"),
            "level": s.get("level"),
            "type": sk_type,
            "mpCost": mp_cost,
            "scope": extract_scope(primary),
            "damageMultiplier": extract_multiplier(primary),
            "hitCount": hit_count,
            "attackFrames": attack_frames,
            "moveType": "dash" if sk_obj.get("move_type") == 1 else "stationary",
            "motion": "magic_atk" if sk_obj.get("motion_type") == 2 else "atk",
            "desc": primary
        })

    if not args.all:
        parsed = [sk for sk in parsed if sk["mpCost"] <= 65][:6]

    out_path = args.out or os.path.join(os.path.dirname(BASE_DIR), "public", "assets", "units", unit_slug, "skills.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({
            "unitId": root_id,
            "unitName": unit_name,
            "game": unit.get("game", "FF"),
            "skills": parsed
        }, f, indent=2)
    print(f"[Success] Exported {len(parsed)} skills to {out_path}")

if __name__ == "__main__":
    main()
