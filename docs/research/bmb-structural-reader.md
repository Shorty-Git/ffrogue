# Legacy FFBE IBMB: verified structural subset

Checked on 2026-10-22. This is an offline reader, not a converter or renderer.
No software was purchased and no SDK was installed. Phaser and the live game
were not changed by this milestone.

Follow-up: hierarchy and scalar alpha-key data are now verified against seven
source pairs. The initial structural milestone and the later validation are
distinguished below.

## Evidence and interpretation

The Android backup contains original binaries matching 4,029 member records
for the 3,957 BMSLN filenames in the local converted-effects package. This is
an inventory intersection, not a claim that all those source pairs match.
Five pairs were extracted and checked individually:

| Pair stem | Binary nodes | Comparison |
| --- | ---: | --- |
| `atk_blow1_purple` | 11 | Pass |
| `atk_slash7_side_purple` | 11 | Pass |
| `eff_strobe_white_a50_f30` | 4 | Pass |
| `sp_20157_kyogiri_back` | 4 | Pass |
| `sp_20157_kyogiri_front` | 75 | Pass |

The BMSLN documents have one leading unnamed default-node template. Excluding
that template, all 105 binary block types and their order match the source
nodes. Both `Basic_Basic_Life` and `Basic_Basic_LifeRange` match for every node;
typed texture/model resource sets also match. These comparisons establish only
the fields described here, not complete scene equivalence.

`tools/inspect_bmb.py` implements this subset. It rejects other version bytes,
invalid section boundaries, truncated tables, invalid string references and
unverified sizes for known node types. Unknown node IDs remain `Unknown` and
do not receive guessed lifetime parameters. `--project` fails on mismatches.

## Observed layout

All integers below are little-endian. Supported bytes 4..7 are `01 01 03 01`.
The four-byte signature is `IBMB`. Header size is 96 bytes for this subset.

| Header offset | Verified use |
| --- | --- |
| `0x10`, `0x14` | Texture and model counts, uint32 |
| `0x20`, `0x24` | Texture and model table offsets relative to the parameter section, uint32 |
| `0x58` | Absolute string-section start, uint32 |
| `0x5c` | Absolute parameter-section start, uint32 |

Node blocks run contiguously from byte 96 to the string section. Each starts
with a uint32 type and uint32 total block length. Known fixed lengths and the
offsets of two adjacent uint32 lifetime parameters, relative to each block:

| Type ID | Matching BMSLN type | Block bytes | Life parameter offset |
| ---: | --- | ---: | ---: |
| 0 | `ControlNull` | 704 | 128 |
| 2 | `EmitterQuad` | 2128 | 348 |
| 3 | `EmitterParticle` | 1840 | 248 |
| 6 | `EmitterModel` | 1904 | 300 |

Each verified resource-table entry is eight bytes and contains a relative
string offset; the reader interprets it as uint64. Names are null-terminated
UTF-8 in the bounded string section. Table indexes distinguish textures from
models, avoiding the previous heuristic ASCII-string scan. Other header
categories and counts remain uninterpreted.

Life parameters are not a computed skill/effect duration: generation delays,
repetition, parent influence, hierarchy, expiration policies and curves still
need decoding. Reading the two parameters does not implement their semantics.

## Climhazzard result

The recovered `atk_powergeyser_001_purple.bmb` parses into:

- 17 control blocks, eight model emitters, two quad emitters and three particle
  emitters: 30 blocks total, all of the four verified types.
- Nine texture names and five model names in the typed resource tables.
- All 14 referenced names found in effectResource CPKs; all extracted files
  passed size/hash checks and all nine PNGs passed Pillow verification.

Ignored outputs: `tools/data/bmb-format/climhazzard-structure.json`,
`*-verified.json` (source and project hashes plus comparison results),
`pair-validation.json`, and `tools/data/climhazzard-source/verified-tables/`.
The original binaries and projects were not rewritten.

All nine previously missing original BMBs were also structurally inspected.
Some have additional unknown node IDs; their block boundaries and texture/model
tables parse, but those node types are not claimed as supported.

## Reproduce

```powershell
& $env:FFROGUE_PYTHON tools/test_bmb_structure.py
& $env:FFROGUE_PYTHON tools/inspect_bmb.py tools/data/bmb-format/sp_20157_kyogiri_front.bmb --project assets/battle_effect/sp_20157_kyogiri_front.bmsln --output tools/data/bmb-format/sp_20157_kyogiri_front-verified.json
& $env:FFROGUE_PYTHON tools/inspect_bmb.py tools/data/climhazzard-source/originals/atk_powergeyser_001_purple.bmb --output tools/data/bmb-format/climhazzard-structure.json
& $env:FFROGUE_PYTHON tools/inspect_bmb_resources.py --source tools/data/climhazzard-source/originals/atk_powergeyser_001_purple.bmb --index tools/data/android-cpk-audit/members.jsonl --output tools/data/climhazzard-source/verified-tables
```

Five automated tests pass: table-driven resource selection and input preservation;
bad offsets/truncation; format/layout drift; source-project mismatch rejection;
and explicit handling of unknown types. The real five-pair comparisons above
and the real Climhazzard extraction were also executed successfully.

## Hierarchy and scalar alpha follow-up

The reader now reconstructs parent/child relationships from the block preorder
and verified child counts. At block offsets `+8` and `+16`, two uint64 values
match the direct child count in the checked projects. The reader requires both
to agree, validates child-pointer storage at the parameter-relative uint64
offset `+24`, and rejects incomplete trees or unexpected second roots. Observed
child-pointer storage values are zero; they are not interpreted as disk node
references. Unknown block types leave hierarchy explicitly undecoded.

The source comparison independently derives parents from BMSLN `ChildList`
wrappers. It checks every decoded node's parent rather than only total counts.

Verified scalar alpha references (`Blend_Basic_Curve`) are uint64 key count and
uint64 parameter-relative data offset at these block-relative offsets:

| Node type | Alpha curve reference offset |
| --- | ---: |
| ControlNull | 280 |
| EmitterQuad | 640 |
| EmitterParticle | 544 |
| EmitterModel | 608 |

Each scalar key occupies 20 bytes: uint32 interpolation ID followed by float32
left tangent, right tangent, value and source `Frame`. IDs 0/1/2/3 match source
`Constant`/`Linear`/`Spline`/`BreakSpline`. Unknown IDs stay unknown. Empty curves
stay empty; they do not receive an invented constant or fallback curve.

All numeric key values are compared to the exact float32 representation of the
source XML values. The reader checks finite numbers, nondecreasing key positions,
bounded references and truncated arrays. These are raw key data; neither the
interpolation function nor the time-domain/lifetime/inheritance semantics have
been implemented or validated by a reference renderer.

Two additional original/project pairs establish the extra interpolation IDs:

| Additional pair | Nodes | Nonempty alpha curves | Keys |
| --- | ---: | ---: | ---: |
| `eff_12boss_12_front` | 94 | 49 | 144 |
| `1st_Fina_lb4` | 47 | 26 | 78 |

Across all seven pairs, all 246 parent/type/order/lifetime assignments and all
121 nonempty alpha curves (328 keys, including their interpolation IDs and
tangents) match the authoring projects. Typed resource sets also still match.
Updated receipts are the seven `tools/data/bmb-format/*-verified.json` files;
`curve-validation-summary.json` records totals.

Climhazzard's recovered power-geyser binary yields one hierarchy with 30 nodes
and 13 nonempty alpha curves containing 46 keys. All those keys now have a
verified interpolation ID. This binary has no matching local BMSLN; its output
uses the reader validated on the seven other pairs, not a direct source-project
comparison. Its output remains `rendered: false`.

Seven automated tests pass. The new coverage exercises scalar key/tangent
reading, truncation, nonfinite values, unordered key positions, explicit unknown
curve IDs, incomplete trees, extra roots and conflicting child counts. All seven
real source comparisons and the real Climhazzard inspection were executed.

## Next bounded milestone

Follow-up: [selected transform, UV and color vector channels](bmb-vector-channels.md)
are now decoded and verified against the same seven pairs. That milestone adds
141 nonempty vector curves with 360 keys and brings automated coverage to twelve
passing tests. Fixed values, motion modes and per-node resource bindings remain
the next bounded milestone, followed by evaluation, blend behavior and M3R geometry.
Model geometry is a separate required layer. Keep unrecognized behavior visible;
do not fill it with default visuals. The existing direct Effekseer rejection
still stands; there is no playable original Climhazzard animation yet.
