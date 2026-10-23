# Cross Slash: atlas selection repair

## Finding

Source command: Cloud ability `214790`, learned at 5-star level 16, 20 MP.
SQLite schedules hits at F4/F30/F60/F90/F120 with weights 10/10/10/10/60;
the total physical modifier is 300%. A second process describes an 80% paralysis
chance, corroborated separately by the local JP ability snapshot. These mechanics
have not been newly implemented in this milestone.

Both visual members start at F4 on the selected target:

| Effect | Layer | Source |
| --- | --- | --- |
| 8001600 | Back | `sp_20157_kyogiri_back.bmb` / converted `.efkefc` |
| 8001601 | Front | `sp_20157_kyogiri_front.bmb` / converted `.efkefc` |

The developer supplied an [official Cloud trailer](https://www.youtube.com/watch?v=slOrIxrJLco).
The gameplay scene around 21–22 seconds shows distinct orange strokes composing
the attack symbol. The initial local preview repeated a vertical texture region,
which substantially changed the shape.

## Root cause

The original front `.bmsln` has twelve emitters using the 128x128 texture
`tex_ffvii_kyogiri001.png`. Texture scale is `(2,2)`. Four emitters select the
top-left quadrant with translation `(0,0)`, four select the top-right with
`(-1,0)`, and four select the bottom-left with `(0,-1)`. They contain different
stroke shapes, not interchangeable copies.

The converted effect retained 64x64 crop sizes but omitted every crop start.
Both its editor project and compiled payload therefore used normalized
`(startX,startY,width,height) = (0,0,0.5,0.5)` for all twelve nodes.
Changing overall artwork rotation or target position cannot recover these
missing texture selections.

The offline inspector decodes the effect's `EDIT` string-table format using the
layout in official [Effekseer EfkEfcXml](https://github.com/effekseer/Effekseer/blob/master/Dev/Editor/EffekseerCore/IO/EfkEfc.cs).
It is independent of Phaser and does not rewrite any input effect.

## Repair and boundaries

`tools/effects/repairs/cross_slash_uv.json` pins the exact converted and authoring
SHA-256 hashes and all twelve emitter names. `tools/repair_effect_uv.py` derives
the missing normalized starts from the original constant texture transforms.
Eight starts change; four remain at `(0,0)`. Both editor data and compiled UV
records are updated in a separate ignored source variant:

`assets/battle_effect/sp_20157_kyogiri_front_uvfix.efkefc`

The repair rejects changed input hashes, ambiguous compiled record counts,
unexpected editor node order, different crop sizes, unsupported versions,
animated/rotated texture mappings, or output paths that overwrite the original.
Compiled modifications are restricted to UV start fields. No motion, timing,
scale, rotation, color, resource, or background-plane parameters are changed.
A receipt records every node, compiled offset and source/output hash.

The research preview accepts a repair receipt explicitly and validates its
source, recipe and output hashes. It preserves the original member metadata
alongside the variant; it does not silently substitute a runtime effect.

## Reproduce

Configure `FFROGUE_PYTHON` as described in the import standard, then run from the
repository root:

```powershell
& $env:FFROGUE_PYTHON tools/repair_effect_uv.py --recipe tools/effects/repairs/cross_slash_uv.json
node tools/preview_skill.mjs --recipe tools/characters/cloud.json --skill cross_slash --source-id 214790 --scope single_enemy --motion atk --repair-receipt tools/data/cross-slash/uv-repair.json --output tools/data/cross-slash/repaired --port 3111
```

Open the printed URL and wait for the diagnostic renders. The preview supports
the three enemy rows explicitly, in top/center/bottom order, on both arenas.
Use F60 to compare the assembled strokes before the later flare. An unselected
source ID is a research selection from the learning catalog; it does not create
a legacy command or alter the character recipe. Party-target previews fail
closed until a suitable ally-formation review exists.

For an unchanged-source comparison, omit `--repair-receipt`, choose
`--output tools/data/cross-slash/original` and use a separate port.
No character commands or prepared runtime sheets are published by this process.

## Verification and remaining work

- Parsed the real original editor project (77 nodes) and matched all twelve
  atlas emitters to the `.bmsln` authoring data.
- Ran the repair on the real source and rendered the variant through the actual
  Effekseer WebGL SDK. The separate vertical, corner and crossing stroke regions
  are now visible in the composite preview.
- Rendered the two individual members and six arena/target-row compositions.
- Three Python tests pass: Unicode/nested project round-trip; truncated input
  rejection; synthetic compiled UV repair with original-file preservation,
  deterministic rerun, unchanged surrounding binary data and stale-input rejection.
- The eleven existing pipeline tests also passed during this work.

This fixes a specific conversion defect, not the entire skill presentation.
The back authoring layer contains a semitransparent model plane (alpha 0.8,
scale X 700), which currently appears as a conspicuous target-centered rectangle.
Its framing needs review against the video. Body approach, repeated strike
choreography, gameplay hit scheduling, paralysis support and selection in the
three-command dock remain separate work. Original-game visual fidelity and a
complete gameplay import are not claimed.
