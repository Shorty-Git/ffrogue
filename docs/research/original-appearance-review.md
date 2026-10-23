# Source appearance activation review

This research milestone corrects channel selection, not overall FFBE fidelity.
It prepares three optional `plan-appearance.json` files under ignored
`tools/data/shared-skill-review/`. No game assets or skill recipes are published.

## Finding and correction

The player previously evaluated every nonempty alpha/center-color curve. It also
multiplied the alpha curve by the constant alpha value, even though Constant and
Curve are alternative source modes. Stored keys can be inactive authoring history.
The manufacturer's [Blend reference](https://www.matchlock.co.jp/manual/bishamonツールオンラインマニュアル/bishamon詳細/ビュー/インスペクタ/ブレンド/)
and [Color reference](https://www.matchlock.co.jp/manual/bishamonツールオンラインマニュアル/bishamon詳細/ビュー/インスペクタ/色/)
distinguish fixed values from selected curve playback.

`--source-appearance` now prepares explicit appearance descriptors. Constant alpha
uses only the constant; Curve alpha uses only the selected curve. Supported center
color follows its selector. Dormant keys remain in the source data but are not
evaluated. Unknown alpha modes and empty selected alpha curves fail preparation.
Unresolved color capabilities keep a labeled legacy preview path. The preview's
“Use source color and alpha modes” checkbox compares both evaluators at one frame;
inheritance and quad-corner controls remain independent.

Concrete current examples (zero-based node indices):

| Source | Dormant alpha curves | Dormant center-color curves |
| --- | --- | --- |
| `atk_impact_001_pink` | 11, 15, 16, 31, 32 | 8, 10, 12, 16, 18, 20, 22, 24, 26, 31, 32 |
| `atk_powergeyser_001_purple` | 12, 23, 24 | No proven Particle selector |
| `eff_strobe_white_a50_f30` | None | 3 |

Brave Slash Model 15 has fixed alpha 0.5; its stored fade must not change that local
value. The strobe has constant white RGB; the previous player incorrectly played
its cream/yellow/orange keys. Its source alpha curve continues to run. This is a
source-verified correction, not proof of the native blend equation.

## Reproducible binary evidence

Run `python tools/audit_appearance_offsets.py`. Its default receipt is
`tools/data/shared-skill-review/appearance-offset-audit.json`. It rereads staged
binaries and authoring projects, hashes both, records exclusions and scans aligned
fields independently for intersections. This run admitted 28 pairs and explicitly
rejected four; one staged effect has no authoring counterpart.

| Type | Nodes | Color mode | Alpha mode | Constant alpha |
| --- | ---: | ---: | ---: | ---: |
| ControlNull | 456 | 664 | 688 | 244 |
| Quad | 189 | 1720 | 1828 | 544 |
| Model | 144 | 1688 | 1748 | 496 |
| Particle | 36 | Unresolved | 1684 | 444 |

Offsets are relative to the node block, for the existing supported IBMB version.
Null alpha is distinguished by `area_eff_sum_203004407_img2`, node 43: value 0.5
occurs at exactly one aligned float offset, 244. Both selector values occur in the
accepted datasets. No offset is promoted from all-zero/all-one samples alone.

Particle candidate 1624 is rejected: `1st_Fina_lb4` nodes 44/46 contradict it while
the existing known-category comparison passes. Current Particle color selectors
are therefore supplied only by explicitly matching BMSLN projects. Power Geyser's
three Particle color selectors stay unresolved.

## Remaining gaps and import contract

- All 18 Model and nine Particle RGB constants in the six current paired effects
  match authoring. Five nodes have nonzero RGB ranges; this preview still uses base
  values and lists the missing random sampling.
- Blade Beam wave Null 9 has different binary/authoring RGB. It is reported as
  unsupported rather than silently overridden. Parent RGB propagation is also
  missing, so local Null tint is not currently applied to children.
- Quad corner colors are evaluated only by the existing explicitly enabled
  corner-color capability. Other quads retain their labeled legacy tint.
- The [particle geometry audit](original-particle-geometry-audit.md) shows missing
  camera-facing geometry. Local color correction cannot fix that shape problem.
- Model vertex RGBA, native blend/distortion equations, random distributions,
  nonzero inheritance rates and sorting still need controlled reconstruction.
- The [composition audit](original-composition-audit.md) records unresolved member
  placement, reverse-asset selection and process-group association.

### Follow-up: ControlNull offset 328 is not established RGB

The documentation consolidation rechecked the 28 eligible pairs in the existing
appearance audit. All 456 ControlNull values at block-relative `+328` match
`GenerateShape_Area_Scale`; 455 also match center RGB because both are `(1,1,1)`.
Blade Beam wave node 9 is the distinguishing case: the binary contains
`(0.5,1,0.75)`, matching the source generation-area scale, while its source center
RGB is `(1,1,1)`. This is evidence of a mislabeled binary field, not proof of a
different original tint. Do not use the current `initialColor` name as a verified
ControlNull RGB mapping or enable parent tint from it.

Reproduce the distinguishing case without changing files:

```powershell
@'
import struct, sys, xml.etree.ElementTree as ET
from pathlib import Path
sys.path.insert(0, 'tools')
from inspect_bmb import read_bmb
binary = Path('tools/data/shared-skill-review/blade-beam/originals/atk_aerialslash_001_green.bmb').read_bytes()
node = read_bmb(binary)['nodes'][9]
source = ET.fromstring(Path('assets/battle_effect/atk_aerialslash_001_green.bmsln').read_bytes()).findall('.//ResIdeNode')[1:][9]
print('block+328:', struct.unpack_from('<3f', binary, node['offset'] + 328))
print('area scale:', source.find('GenerateShape_Area_Scale').attrib)
print('center color:', source.find('Color_Center_Value').attrib)
'@ | & $env:FFROGUE_PYTHON -X utf8 -
```

The read-only cross-pair comparison was executed on 2026-10-22. No decoder or
renderer change was made in this documentation task. Correcting the field's
label/layout and locating genuine Null RGB remain a separate bounded task;
the current appearance capability already lists the distinguishing mismatch as
unsupported and parent RGB propagation is not implemented.

The earlier [inheritance review](original-inheritance-review.md) addresses a
separate issue. Its Brave Slash dimming example was also affected by dormant
parent alpha keys. Its rate-zero correction remains valid, but never established
that local alpha activation was correct.

For the eventual importer, each channel needs source/hash, selected mode, active
value or keys, evidence status, implementation capability and a reference check.
Inactive keys are preserved as evidence. Unknown or unsupported fields must remain
visible in the coverage report; a successful parse cannot approve a skill.

## Validation

Run from the project root (use the available Python executable on this machine):

```powershell
python -m unittest discover -s tools -p 'test_bmb*.py'
python -m unittest discover -s tools -p 'test_original_*.py'
node --test tools/test_original_effect_player.mjs tools/test_original_inheritance.mjs tools/test_original_appearance.mjs
```

The tests check actual paired sources, dormant-key invariance, selected-curve
evaluation, rejection of missing selected curves, explicit unresolved channels,
and deterministic seeking with finite matrices/colors/alpha across all three
prepared skills. They do not compare native FFBE pixels.

Preparation adds `--source-appearance` to the commands in the inheritance review,
writing `plan-appearance.json` instead of `plan-inheritance.json`. Launch:

```powershell
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash/plan-appearance.json --plan tools/data/shared-skill-review/blade-beam/plan-appearance.json --plan tools/data/shared-skill-review/climhazzard/plan-appearance.json --port 3120
```

Executed on 2026-10-22:

- Python: 26 BMB tests and 11 original-source tests passed; none skipped.
- Node: 23 player/inheritance/appearance tests passed; none skipped.
- The offset audit completed again after the decoder changes: 28 eligible pairs,
  four rejected pairs, one missing authoring counterpart, one initial RGB
  mismatch and two contradictions to the Particle-selector hypothesis.
- All three browser previews loaded with eight GPU blend checks passing each.
  Climhazzard in Reactor/middle, Brave Slash in Forest/lower and Blade Beam in
  Reactor/upper each played from F0 to F210. No warning/error console entries
  were returned after those runs.
- Same-frame A/B screenshots were saved and inspected at Brave Slash F42 and
  Climhazzard F34. Files are `appearance-{legacy,source}-f42.png` and
  `appearance-{legacy,source}-f34.png` in their respective ignored review folders.
  Brave Slash loses the unintended yellow/orange center; the Climhazzard flash
  is white. These compare our old and corrected evaluator, not native FFBE.
- `git diff --check` passed for tracked changes (line-ending warnings only).

No new native-game frame comparison succeeded in this milestone. The supplied
YouTube reference was attempted but did not yield usable reference frames.
No application build or publication was needed for these offline tool changes.

The subsequent [Blade Beam geometry and UV audit](blade-beam-source-geometry.md)
isolates missing single-texture rotation/pivot handling. Its separate preview
preserves these appearance changes and keeps placement conventions unresolved.
