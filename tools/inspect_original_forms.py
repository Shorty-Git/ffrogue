"""Check published original form edges and inventory the corresponding local bodies."""

import argparse
import csv
import hashlib
import json
import sqlite3
from collections import Counter
from pathlib import Path


def inspect(content_path, database_path, dump):
    content = json.loads(content_path.read_text(encoding="utf8"))
    inventory = {}
    with sqlite3.connect(database_path.resolve().as_uri() + "?mode=ro", uri=True) as db:
        db.row_factory = sqlite3.Row
        for key, unit in content["units"].items():
            published = {form["unitId"]: form for form in content["forms"]
                         if form["identityKey"] == key}
            by_key = {form["key"]: form["unitId"] for form in published.values()}
            by_key[key] = unit["unitId"]
            rows = db.execute(
                "select unitId, unitSeries, unitName, rare, isNv, isNvSublimationUnit, "
                "nvSeriesId, nvShiftTurnInfoId, nvShiftOrder, hp, mp, atk, mag, def, spr "
                "from unit where unitSeries=? order by rare, isNv, unitId", (unit["identity"],)
            ).fetchall()
            records = []
            for original in rows:
                row = dict(original)
                unit_id = row["unitId"]
                row["next"] = [r[0] for r in db.execute(
                    "select classUpUnitID from unit_class_up where unitId=?", (unit_id,)
                )]
                row["shift"] = [dict(r) for r in db.execute(
                    "select unitId, nvShiftOrder from unit where nvSeriesId=? and nvShiftOrder>0",
                    (row["nvSeriesId"],)
                )] if row["nvSeriesId"] else []
                atlas = dump / "unit_animated" / f"unit_anime_{unit_id}.png"
                csv_root = dump / "unit_animated_csv"
                tracks = sorted(csv_root.glob(f"*_{unit_id}.csv"))
                row["atlasSha256"] = hashlib.sha256(atlas.read_bytes()).hexdigest() if atlas.exists() else None
                row["tracks"] = [p.name for p in tracks]
                idle = csv_root / f"unit_idle_cgs_{unit_id}.csv"
                cgg = csv_root / f"unit_cgg_{unit_id}.csv"
                if idle.exists() and cgg.exists():
                    poses = list(csv.reader(cgg.read_text(encoding="utf8").splitlines()))
                    refs = {int(line[0]) for line in csv.reader(idle.read_text(encoding="utf8").splitlines()) if line and line[0]}
                    modes = Counter()
                    for index in refs:
                        pose = poses[index]
                        count = int(pose[1])
                        if count:
                            stride = (len(pose[2:]) - (pose[-1] == "")) // count
                            for part in range(count):
                                modes[pose[5 + part * stride]] += 1
                    row["idleBlendModes"] = dict(modes)
                if form := published.get(str(unit_id)):
                    predecessor = int(by_key[form["awakensFrom"]])
                    edge = db.execute("select 1 from unit_class_up where unitId=? and classUpUnitID=?",
                                      (predecessor, unit_id)).fetchone()
                    if not edge or row["rare"] != form["rarity"] or bool(row["isNv"]) != (form.get("rank") == "NV"):
                        raise ValueError(f"Unverified class-up edge {predecessor} → {unit_id}")
                    manifest = Path("public") / form["assetPath"] / "manifest.json"
                    raw = manifest.read_bytes()
                    hashes = {hashlib.sha256(body).hexdigest() for body in (raw, raw.replace(b"\r\n", b"\n"))}
                    if (json.loads(raw)["unitId"] != str(unit_id)
                            or form["source"]["manifestSha256"] not in hashes
                            or not row["atlasSha256"] or not tracks):
                        raise ValueError(f"Incomplete or modified body for {unit_id}")
                    row["publishedBody"] = form["key"]
                records.append(row)
            if not set(published) <= {str(row["unitId"]) for row in records}:
                raise ValueError(f"Published form outside its original series for {key}")
            inventory[key] = {"canonicalIdentity": unit["canonicalIdentity"], "currentUnit": unit["unitId"], "forms": records}
    return inventory


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    inventory = inspect(Path("public/assets/run-content.json"), Path("assets/static_data/ffbe-data.db"), Path("ffbe_asset_dump-main"))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(inventory, indent=2) + "\n", encoding="utf8")
    print(f"Verified {sum('publishedBody' in row for unit in inventory.values() for row in unit['forms'])} published original edges")
