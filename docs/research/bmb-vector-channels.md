# Verified legacy IBMB vector channels

Checked on 2026-10-22. Offline data inspection only: no original-effect rendering,
runtime publication, game changes, SDK installation or purchase.

This extends the [structural and alpha reader](bmb-structural-reader.md).
`tools/bmb_channels.py` holds the verified channel layouts and source comparisons;
`tools/inspect_bmb.py` includes their output in each known node's `vectorCurves`.

## Verified scope

Using the same seven original BMB/BMSLN pairs, all active authoring curve channels
are now accounted for by either the scalar-alpha reader or the selected vector
channels below. Comparisons still include the previous hierarchy, lifetime and
typed resource-table checks.

| Source channel | Nonempty curves | Vector keys |
| --- | ---: | ---: |
| Translation value | 13 | 32 |
| Translation speed | 24 | 60 |
| Rotation value | 2 | 4 |
| Rotation speed | 2 | 4 |
| Scale value | 36 | 83 |
| Scale speed | 1 | 3 |
| Texture layer 1 translation speed | 19 | 38 |
| Texture layer 1 scale value | 1 | 2 |
| Center RGB color | 42 | 124 |
| Top-left vertex RGB color | 1 | 10 |
| **Total** | **141** | **360** |

These are vector key records, each with three component values, three component
interpolation IDs and separate left/right tangents for each component. This is
additional to the previously verified 121 alpha curves and 328 scalar keys.

All component values, tangents and source `Frame` positions match the exact
float32 conversion of the XML authoring data. No tolerance, axis permutation,
angle conversion or corrective offsets were used. Interpolation IDs also match.
The comparison rejects an active source curve when no verified offset exists
for its channel and node type; such a curve cannot silently disappear from a
successful comparison.

## Layout

References are uint64 key count and uint64 parameter-relative data offset.
Each key occupies 52 bytes: three uint32 interpolation IDs, three float32 left
tangents, three right tangents, three values, then one source `Frame` float32.
Motion/UV components follow source XYZ order; RGB channels follow source RGB
order. RGB authoring alpha is not part of these three-component records.

Only offsets located through nonempty source curves are enabled. All offsets
below are relative to the node block; a missing entry is unverified, not zero.

| Channel key | ControlNull | EmitterQuad | EmitterParticle | EmitterModel |
| --- | ---: | ---: | ---: | ---: |
| `translationValue` | 560 | — | — | 1392 |
| `translationSpeed` | 576 | — | 1344 | 1408 |
| `rotationValue` | 592 | — | — | — |
| `rotationSpeed` | 608 | — | — | — |
| `scaleValue` | 624 | 1488 | — | 1456 |
| `scaleSpeed` | 640 | — | — | — |
| `texture1TranslationSpeed` | — | — | — | 1504 |
| `texture1ScaleValue` | — | — | — | 1552 |
| `centerColor` | 672 | — | 1632 | 1696 |
| `vertexTopLeftColor` | — | 1728 | — | — |

The parser checks bounded arrays, finite numbers and ordered key positions.
Unknown interpolation IDs remain explicit. Empty curves stay empty.

## Climhazzard

The recovered power-geyser binary yields the following data in mapped channels:

| Channel | Curves | Keys |
| --- | ---: | ---: |
| Translation value | 3 | 19 |
| Translation speed | 2 | 8 |
| Scale value | 9 | 18 |
| Scale speed | 1 | 3 |
| Center RGB color | 4 | 13 |
| **Total** | **19** | **61** |

All decoded component interpolation IDs are recognized. This binary has no local
BMSLN counterpart, so it uses the layout validated on other effects. The 19
curves do not establish complete channel coverage for Climhazzard. Nonanimated
initial values, motion modes and unverified channel locations remain unread.

In particular, absence of keys in a mapped UV channel does not mean a texture
is static: constant speed/acceleration parameters can still animate it. Likewise,
a decoded XYZ curve is not yet a world-space motion or an original-game timing
claim. No curve evaluator or renderer has been implemented in this milestone.

## Reproduction and evidence

```powershell
& $env:FFROGUE_PYTHON -m unittest discover -s tools -p 'test_bmb*.py'
& $env:FFROGUE_PYTHON tools/inspect_bmb.py tools/data/bmb-format/sp_20157_kyogiri_front.bmb --project assets/battle_effect/sp_20157_kyogiri_front.bmsln --output tools/data/bmb-format/sp_20157_kyogiri_front-verified.json
& $env:FFROGUE_PYTHON tools/inspect_bmb.py tools/data/climhazzard-source/originals/atk_powergeyser_001_purple.bmb --output tools/data/bmb-format/climhazzard-structure.json
```

All seven real source comparisons were executed successfully. Their ignored
`*-verified.json` receipts include source/project hashes and per-channel counts.
`tools/data/bmb-format/vector-validation-summary.json` records channel totals;
`channel-discovery.json` records the nonempty-source pointer observations.

All twelve automated tests pass. New checks cover component ordering, independent
axis interpolation/tangents, unchanged input, truncation/bad references,
nonfinite values, empty/unknown curves, unordered positions, swapped source axes
and rejection of unverified active authoring channels. The game build was not
run because only offline Python tools and research documentation changed.

## Remaining boundary

Follow-up: [fixed transform/UV values, selected motion modes and per-node
texture/model bindings](bmb-fixed-parameters.md) are now decoded and verified
against these same source pairs, plus two explicit partial comparisons.
Other curve locations, generation timing, curve evaluation/inheritance semantics,
other material controls, blend behavior and M3R geometry still require work before an original effect can
be rendered. No silent defaults or substitute effects were introduced.
