"""Validate prepared character sheets before publishing them to the game."""
import json
import sys
from pathlib import Path
from PIL import Image

root = Path(sys.argv[1])
manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
for name, meta in manifest["animations"].items():
    assert meta["frameCount"] > 0 and len(meta["frames"]) == meta["frameCount"], name
    assert all(frame["durationMs"] > 0 for frame in meta["frames"]), name
    assert all(frame["index"] == index for index, frame in enumerate(meta["frames"])), name
    with Image.open(root / meta["file"]) as image:
        image.load()
        assert image.size == (meta["frameWidth"] * meta["frameCount"], meta["frameHeight"]), name
        assert image.mode == "RGBA", name
print(f"Validated {len(manifest['animations'])} prepared animations.")
