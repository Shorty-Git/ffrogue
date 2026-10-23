# Skill reconstruction and export runbook

This is the operational entry point for original skill visuals, current as of
2026-10-22. Read [the asset map](asset_structure.md) first and use
[the character import workflow](character-import-workflow.md) for form identity,
body animations, reviewed recipes and existing publication. Research documents
linked below retain the evidence and historical experiments; their old ports,
test totals and statements of missing features describe those earlier revisions.

**The shared extraction and research preview work. Complete native reconstruction
and publication of these new previews are not finished.** `plan-basic-uv.json`
is the current three-skill experiment, with `approved: false`. The Phaser game
still uses its previously published assets. A good-looking preview, successful
parse or passing source comparison does not change that status.

The project imports skill names, body motion and fluid visual presentation.
Original FFBE chaining, damage formulas and multi-hit gameplay are not goals.
Keep their raw metadata for provenance; define roguelike damage, MP costs and
wave progression separately. Visual component timing still matters even when
the game intentionally applies one combined damage event.

## 1. Resolve the skill before extracting anything

Use an exact sprite form and inspect the character recipe:

```powershell
npm run character:import -- --recipe tools/characters/cloud.json
```

The ignored report is `tools/data/characters/cloud/report.json`. The read-only
SQLite source is `assets/static_data/ffbe-data.db`. Resolve this chain:

```text
sprite form -> unit.unitSeries -> unit_series_lv_acquire -> ability / magic
ability.effectFrames -> effect_group.effectData -> effect.fileInfo
original BMB -> typed texture/model references -> exact CPK resource members
```

Never join an effect-group ID directly to `effect.effectId`: those numeric ID
spaces overlap. Never choose a similarly named file as a substitute. Keep the
kind (`ABILITY` or `MAGIC`), IDs, original filenames, database/source hashes and
all raw fields. Series acquisition is not proof that every form learns the skill.

Outer effect-group start ticks and member delays combine into a component start
time. These are 60 Hz timeline ticks, not zero-based body-sheet frame indices.
Keep target/caster/screen anchors, front/back layer, member scale and filename
transform suffixes separate. A whole skill can contain several timed effects,
each containing a hierarchy of emitters and models; it is not one PNG animation.

The eight-field member tuple is observed in the current database, but not every
field's meaning is recovered. Alternate effect references, trailing placement
fields and orientation modes remain unresolved. `@` segments can associate
parallel process/target groups: the existing importer conservatively labels later
segments conditional, which is a known limitation, not a decoded native rule.
Do not flatten these segments or reinterpret them silently. Preserve groups with
no visual members as full source records; the preview's `audioGroupsNotPlayed`
summary does not prove every empty group is audio-only. See the
[composition audit](research/original-composition-audit.md).

## 2. Archive and format boundaries

| Source | Reader / role | Established boundary |
| --- | --- | --- |
| `com.square_enix.android_googleplay.FFBEWW/files/**/*.cpk` | `ffbe_asset_dump-main/tools/cpk.py` | Masked CRI UTF tables, archive entries and CRILAYLA decompression; indexing is not validation of every payload |
| Original `.bmb` (`IBMB`) | `tools/inspect_bmb.py` and `bmb_*.py` | Supported version bytes `01 01 03 01`, bounded typed blocks/resources, selected parameters and curves; unknown layouts must stay unknown |
| Matching `.bmsln` | XML authoring supplement, compared by `compare_project` | Explicitly selected matching project, known-field comparison and hashes; supplemental fields are not automatically decoded BMB fields |
| Original `.m3r` (`BR3M`) | `tools/inspect_m3r.py` | Observed single-material versions 34/35; positions, normals, packed RGBA, UV and indices preserved |
| Converted `.efkefc` (`EFKE`) | Existing effect baker / `tools/inspect_effect_project.py` | Converted Effekseer resource; EDIT inspection decodes its compressed binary XML, not BMSLN or IBMB |
| Converted `.efkmodel` | Comparison input | Checked models reverse V and triangle winding relative to M3R; do not apply that reversal twice |

Original IBMB cannot be loaded by renaming it to an Effekseer file. Converted
effects are useful secondary evidence, but can omit source material properties.
Blade Beam's converted crescent omits the UV rotation/translation that is present
in the original data. Its conversion cannot decide the original orientation.
Node texture bindings can also override a model's embedded default texture.

Use the structural/resource reader, not heuristic ASCII-name extraction. Extract
only exact selected effects and typed dependencies from the archive inventory.
Staging checks the indexed entry against the current archive, decompressed size,
existing-file hash and output boundary. Resource staging preserves archive
identity rather than choosing a version silently. Missing or ambiguous original
members fail. If duplicate resource stems arise, inspect their hashes and resolve
source identity before preparation; do not assume the preview makes that choice.

The ignored inventory is `tools/data/android-cpk-audit/members.jsonl`. It contains
one JSON object per entry with `archive`, `dir`, `name`, `size`, `extract`, `offset`
and `id`. The audited backup had 446 archives and 117,969 entries; these historical
counts are not acceptance constants for another backup. See
[the recovery evidence](research/missing-effect-sources.md).

There is no dedicated maintained inventory CLI. If the local inventory is absent,
this PowerShell/Python command rebuilds entry metadata using the existing reader;
it extracts no payloads. Configure `$env:FFROGUE_PYTHON` to a Python executable
with Pillow before running the commands in this document.

```powershell
@'
import importlib.util
import json
from pathlib import Path

root = Path.cwd().resolve()
spec = importlib.util.spec_from_file_location("cpk_reader", root / "ffbe_asset_dump-main/tools/cpk.py")
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)
archives = sorted((root / "com.square_enix.android_googleplay.FFBEWW/files").rglob("*.cpk"))
if not archives:
    raise ValueError("No local CPK archives found")
rows = []
for archive in archives:
    cpk = reader.Cpk(archive)
    try:
        rows.extend({"archive": archive.relative_to(root).as_posix(), **entry} for entry in cpk.entries)
    finally:
        cpk.f.close()
output = root / "tools/data/android-cpk-audit/members.jsonl"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
print(f"Indexed {len(archives)} archives, {len(rows)} entries: {output}")
'@ | & $env:FFROGUE_PYTHON -X utf8 -
```

For this documentation consolidation, the inventory loop was executed read-only
and its 117,969 rows matched the existing inventory across all 446 archives.
The documentation check did not extract payloads or rewrite the inventory.

Raw backup, source package, SDKs, inventory, extracted files, reports and research
plans remain ignored. Do not inspect preferences/account files to find effects.
Do not make Vite watch the source dumps. All parsing stays in `tools/`; `src/`
loads prepared standard sheets and clean game metadata only.

## 3. Reproduce the current three-skill review

Run from the repository root. Prerequisites are Node.js 24, installed project
dependencies, Python/Pillow, the local source roots, CPK reader/index, and the
existing prepared Cloud, training-dummy and reactor/forest assets. The preview
also uses `tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js`. Missing prerequisites
are setup failures, not permission to replace an asset or download a different one.

The following stage commands use the character report created in step 1:

```powershell
& $env:FFROGUE_PYTHON tools/stage_original_skill.py --report tools/data/characters/cloud/report.json --skill-id 214800 --output tools/data/shared-skill-review/brave-slash
& $env:FFROGUE_PYTHON tools/stage_original_skill.py --report tools/data/characters/cloud/report.json --skill-id 214810 --output tools/data/shared-skill-review/blade-beam
& $env:FFROGUE_PYTHON tools/stage_original_skill.py --report tools/data/characters/cloud/report.json --skill-id 214820 --output tools/data/shared-skill-review/climhazzard
```

Each stage contains `skill-source.json`, hashed `originals/*.bmb`, and per-effect
`effects/<stem>/resources.json` plus extracted dependencies. The seven original
effects include six explicitly matching authoring projects; Power Geyser has no
matching local authoring project and must not receive one from another effect.

Prepare the current experimental capability set explicitly:

```powershell
& $env:FFROGUE_PYTHON tools/prepare_original_preview.py --source tools/data/shared-skill-review/brave-slash/skill-source.json --unit cloud --recipe tools/characters/cloud.json --authoring assets/battle_effect/atk_impact_001_pink.bmsln --scene-composite --withhold-untextured --inheritance --source-appearance --basic-uv --output tools/data/shared-skill-review/brave-slash/plan-basic-uv.json
& $env:FFROGUE_PYTHON tools/prepare_original_preview.py --source tools/data/shared-skill-review/blade-beam/skill-source.json --unit cloud --recipe tools/characters/cloud.json --authoring assets/battle_effect/atk_aerialslash_001_green.bmsln --authoring assets/battle_effect/atk_slash5_blue.bmsln --scene-composite --withhold-untextured --inheritance --source-appearance --basic-uv --output tools/data/shared-skill-review/blade-beam/plan-basic-uv.json
& $env:FFROGUE_PYTHON tools/prepare_original_preview.py --source tools/data/shared-skill-review/climhazzard/skill-source.json --unit cloud --recipe tools/characters/cloud.json --authoring assets/battle_effect/atk_slash7_side_purple.bmsln --authoring assets/battle_effect/atk_blow1_purple.bmsln --authoring assets/battle_effect/eff_strobe_white_a50_f30.bmsln --distortion --fit-screen --scene-composite --quad-colors --withhold-untextured --inheritance --source-appearance --basic-uv --output tools/data/shared-skill-review/climhazzard/plan-basic-uv.json

node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash/plan-basic-uv.json --plan tools/data/shared-skill-review/blade-beam/plan-basic-uv.json --plan tools/data/shared-skill-review/climhazzard/plan-basic-uv.json --port 3121
```

Open `http://127.0.0.1:3121/?skill=214800` (Brave Slash), `?skill=214810`
(Blade Beam) or `?skill=214820` (Climhazzard). If port 3121 is already occupied by
this review, reuse it; otherwise choose a free port without stopping the main game.
The server loads plans at startup; restart the relevant review after regenerating
them. Do not mistake an older running preview for newly prepared data.

These commands are the shared workflow, not three implementations. A new skill
changes the source ID, selected reviewed recipe and explicit matching authoring
inputs. Unsupported behavior must become a shared capability or a declared
limitation; never add a loader or hidden correction for one character.

## 4. Reading and evaluating the data correctly

Preserve the hierarchy and resource bindings. BMB block offsets are type-specific,
relative to a verified node layout, and valid only for the supported binary
version. BMSLN begins with a default-node template that the comparison excludes.
Known-field comparison establishes matching order and values, not complete
coverage of the original renderer.

**Stored data is not necessarily active data.** Constant, NewtonDynamics,
CurveValue and CurveSpeed are selectors. A nonempty curve can be dormant editing
history. Constant alpha uses its constant; selected Curve alpha uses its curve,
without multiplying by the dormant constant. Apply the same active-mode rule to
translation, rotation, scale, color, UV and deformation. Keep inactive keys as
evidence. Never enable one because it looks more convincing.

Selected unsupported modes must remain visible, and missing selected curves must
not become invented defaults. Source supplements must be explicit, hashed and
accepted by the existing known-field comparison. Their fields must retain their
authoring origin rather than being advertised as recovered BMB offsets.

| Area | Current status and boundary | Evidence / implementation |
| --- | --- | --- |
| IBMB hierarchy, typed resources, selected fixed/vector/scalar fields | Verified field subset; not every node type or property | [Structure](research/bmb-structural-reader.md), [vectors](research/bmb-vector-channels.md), [fixed parameters](research/bmb-fixed-parameters.md); `inspect_bmb.py`, `bmb_*.py` |
| Original model geometry | Verified supported M3R payloads; renderer still omits model vertex RGBA | [Models/materials](research/bmb-materials-models.md); `inspect_m3r.py` |
| Alpha / center-color activation | Corrected supported selectors; Particle color without matching authoring, random RGB and parent RGB remain limited | [Appearance](research/original-appearance-review.md); `original_appearance.py` |
| Inheritance | Rate-zero parent alpha and supported birth-time translation implemented; other modes/compatibility remain experimental or unsupported | [Inheritance](research/original-inheritance-review.md); `original_inheritance.py` |
| Two-texture Add | Independent source layers/UVs with explicit authoring supplement; clamped RGBA addition and exact UV matrix remain experimental | [Playback/material experiments](research/original-skill-playback.md); `original_texture_layers.py` |
| Single-texture UV | Source-confirmed Basic mapping, active Crop 1x1, reversal Off and supported 2D modes; inverse TRS/pivot equation is experimental | [Blade Beam audit](research/blade-beam-source-geometry.md); `original_texture_mapping.py` |
| Distortion and constant quad corners | Source controls decoded for bounded cases; displacement strength/order, layer alpha and native blending unresolved | [Rectangle investigation](research/climhazzard-rectangle-investigation.md), [playback](research/original-skill-playback.md) |
| Birth scheduling, RNG, interpolation, transform evaluation | Deterministic research policies, not recovered native scheduling/random sequence or compatibility equations | `original_effect_player.mjs`, its `POLICIES`, and [feature audit](research/original-renderer-feature-audit.md) |
| Actor choreography and arena placement | Reviewed game/preview adaptations: approach/return, target body offset, group centroid, screen fit; not original coordinate rules | [Shared review](research/shared-skill-import-review.md), [composition audit](research/original-composition-audit.md) |
| Publication of original-data previews | Not implemented/approved; existing converted-effect publication is a separate path | [Character workflow](character-import-workflow.md), [pipeline direction](research/skill-pipeline-foundation.md) |

## 5. Remaining reconstruction work

The current preview is partial for concrete reasons:

- **Geometry and facing:** ordinary Particle planes and Billboard models lack the
  complete camera-facing treatment. Model-surface emission is withheld for Blade
  Beam wave node 10; unverified untextured particles are withheld instead of being
  drawn as white rectangles. Model vertex RGBA is preserved but not rendered.
  See the [particle audit](research/original-particle-geometry-audit.md) and
  [feature audit](research/original-renderer-feature-audit.md).
- **Coordinates:** member placement fields, alternate-side assets, Euler order
  and root/node compatibility precedence are unresolved. Blade Beam's raw
  `-1100` remains unapplied. The theory that it compensates two initial 275-unit
  translations was rejected: one of those curves is dormant. Do not rescale the
  effect or change its anchor to hide this. Use
  `tools/audit_member_offsets.py --output tools/data/member-offset-audit.json`
  and the [geometry audit](research/blade-beam-source-geometry.md).
- **Materials and hierarchy:** native blend/distortion equations, nonzero alpha
  influence, rotation/scale exclusions, parent RGB, random RGB, sort priority,
  fields and expiration rules still have gaps. Power Geyser's missing authoring
  source means some channels cannot use the supplemented capability branches.
  The [appearance follow-up](research/original-appearance-review.md#follow-up-controlnull-offset-328-is-not-established-rgb)
  shows that the presumed ControlNull RGB at block+328 matches generation-area
  scale instead. Node 9 of Blade Beam's wave distinguishes those values. The
  decoder label is not corrected yet; do not rely on it as color or enable parent
  tint from it. Parent RGB is not implemented.
- **Composition and delivery:** process-associated branches, full records for
  groups without visual members, sound mapping, body/effect synchronization and
  the new research renderer's export/publication contract need bounded work.
  The 180-effect-frame horizon and 210-preview-frame end are current fixtures,
  not a duration standard for arbitrary future skills.

The current UV correction uses source rotation/pivot rather than an artwork
repair. **Never stack the older Blade Beam `artworkRotationDegrees: 90` bake on
this original-data UV path.** The research player loads original staged textures.
Existing manually adapted sheets remain a separate, labeled implementation until
a reviewed migration replaces them.

## 6. Validation, evidence and publication gate

Run the suites appropriate to changed capabilities; these are the current
cross-skill reconstruction checks:

```powershell
& $env:FFROGUE_PYTHON -m unittest discover -s tools -p 'test_bmb*.py'
& $env:FFROGUE_PYTHON tools/test_m3r.py
& $env:FFROGUE_PYTHON -m unittest discover -s tools -p 'test_original_*.py'
node --test tools/test_original_effect_player.mjs tools/test_original_inheritance.mjs tools/test_original_appearance.mjs tools/test_original_texture_mapping.mjs
```

Some integration tests require ignored local sources and explicitly skip when
absent. Record skipped tests; a run without them does not establish source coverage.
The latest UV milestone recorded 15 Python original-source and 26 Node tests
passing, all three skills playing F0 through F210 with no returned browser
warning/error logs, and eight GPU blend checks passing per preview. These results
are historical executed checks, not a claim that this documentation edit reran
them. The [UV review](research/blade-beam-source-geometry.md) records exact scope.

For each new visual capability or skill, retain:

1. Source IDs, full composition records, database/asset/project/recipe hashes and
   exact preparation command; do not overwrite the only previous comparison plan.
2. Per-component/channel evidence (`verified`, `inferred`, `unknown`) separately
   from execution (`rendered`, `unsupported`, `adapted`). Unknown active behavior
   keeps the overall skill partial even if the page has zero skill-specific issues.
3. Actual test results and same-seed/frame A/B screenshots; use unchanged controls
   to show that a common fix does not alter unrelated geometry or timing.
4. Browser playback, seeking, restart and target/arena checks, clipping/tail review,
   diagnostics and console results. An initialization receipt is not a visual review.
5. Original reference URL/time/frame or explicit developer acceptance, remaining
   visible differences and an honest fidelity label. Current A/B screenshots
   compare our evaluators; they are not native FFBE pixel comparisons.

There is currently no supported command that turns `plan-basic-uv.json` into an
approved Phaser skill. Do not pass it to the existing Effekseer baker, copy its
research JavaScript into `src/`, or mark it approved to bypass that boundary.
The publication milestone must define a reproducible bake/composition format,
preserve required blend/layer/anchor semantics, validate hashes and dimensions,
and integrate with the common prepared-asset loader and reviewed game recipe.
Then run the character pipeline/build/combat checks and actual gameplay review
from the character workflow. New reward skills and wave balance come after that
separate integration; original chaining is not a missing prerequisite.
