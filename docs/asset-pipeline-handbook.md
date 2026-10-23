# Asset pipeline handbook

Current handoff: **2026-10-22**, including the original-data single-texture UV
experiment. This is the entry point for agents and contributors working on
characters, backgrounds, skills or their raw sources. Read it before choosing
an importer or applying a renderer correction.

## Is the pipeline finished?

There is a usable character-sheet publication path, a reviewed static-background
path, and a reusable original-skill staging/preview path. There is **not** a
complete, original-faithful extractor for arbitrary FFBE skills or animated
backgrounds. Better-looking previews and passing field comparisons do not close
those gaps. The latest original-data preview has not replaced the published
Phaser effects.

| Area | Working boundary | Remaining boundary |
| --- | --- | --- |
| Character body animation | Exact-form, single-atlas CGG/CGS conversion through ffbetool, prepared sheets, shared pivots, manifest and recipe publication | Alternate atlases/forms/tracks need explicit review; registration does not make a new hero playable in the fixed party |
| Enemies | Existing lower-level sprite conversion and current prepared enemies | No general reviewed enemy/ability/boss import contract; art availability does not provide AI or encounter behavior |
| Backgrounds | Two reviewed, static JPG arenas; proportional fit, reviewed floor regions and shared formation | Manual selection/copy; no SSBP/GIF/layered animation reconstruction |
| Existing game skill effects | Reviewed converted-effect baking and limited shared timeline executors | Deliberate adaptations and legacy commands remain; converted files are not native-renderer references |
| Original skill reconstruction | Exact source resolution, indexed extraction, partial binary decoding, selected source supplements, common preview of Brave Slash / Blade Beam / Climhazzard | Incomplete materials, geometry and placement semantics; no publication bridge from these research plans into the game |
| Skill rewards | Design direction recorded | Dynamic run skill ownership, approved reward pool and skill-card progression are separate future work |

The product needs names and coherent animations. **Do not implement FFBE
chaining, chain multipliers or original damage formulas as import prerequisites.**
Keep source impact times as visual evidence. The reviewed roguelike definition
chooses damage events, costs and later wave balance independently.

## Choose the right workflow

Read [the asset structure guide](asset_structure.md) before searching a dump.
Then use the workflow matching the task:

| Task | Operational guide |
| --- | --- |
| Inspect an exact character, convert body tracks, publish a reviewed character or existing converted effect | [Character and skill import standard](character-import-workflow.md) |
| Select a complete static scene, copy it with provenance, register it and review its floor/formation | [Background import workflow](background-import-workflow.md) |
| Resolve and decode original skill components, prepare the current three-skill comparison, investigate unsupported rendering | [Original skill reconstruction workflow](skill-reconstruction-workflow.md) |
| Adjust actor/target placement or UI against the current arenas | [Battle layout](battle-layout.md) |
| Design skill acquisition and rewards after visuals are ready | [Skill pipeline foundation](research/skill-pipeline-foundation.md) — design, not implemented behavior |

The workflows describe current commands and limitations. Research documents are
revision-specific evidence: an old “next step,” test total, port, or unsupported
feature may have been superseded. Follow their links to later work and the status
here. Do not copy an old manual angle or importer shortcut into the new path.
If code and documentation disagree, inspect the implementation and report the
discrepancy; do not force the data to match prose.

## Data ownership and interpretation

| Location / format | Meaning and handling |
| --- | --- |
| `ffbe_asset_dump-main/` | Local art inventory: exact unit/monster atlases and CGG/CGS, icons, background companions and previews. Naming is a discovery aid, not proof of identity or completeness. |
| `assets/static_data/ffbe-data.db` | Read-only source records: exact form to series, acquisitions, ability/magic, groups and effect references. Preserve region/version and database hash. |
| `ffbe_data-master/` | Separate GL/JP metadata for descriptions and cross-checks. Do not silently join versions by name or presumed numeric equivalence. |
| `com.square_enix.android_googleplay.FFBEWW/files/` | Original CPK archive source. Use indexed exact members; do not bulk-extract the backup or include preferences/account data in reports. |
| Original `.bmb` / `IBMB` | Runtime effect binary with version-specific, partially decoded node structure and resources. Known type/layout checks fail closed; unknown fields are not zeros. |
| Original `.m3r` / `BR3M` | Model geometry/resource data. Preserve positions, normals, UVs, triangles and packed vertex colors; reading a field does not prove shader support. |
| `assets/battle_effect/*.bmsln` | Optional authoring XML. Supplement only explicitly matched BMBs after existing comparison succeeds. Stored curves may be inactive. |
| `assets/battle_effect/*.efkefc`, `assets/effect_resource/` | Converted counterparts and resources for the existing bake path. Conversion can omit original semantics; it is not a fidelity oracle. |
| `tools/characters/`, `tools/effects/` | Reviewed offline recipes. Gameplay adaptations, source variant and bake transforms remain explicit. |
| `tools/data/` | Ignored staging, reports, plans, extracted resources, receipts and review screenshots. Recreate them from commands and source hashes on each PC. |
| `public/assets/` | Selected prepared runtime sheets/images and clean JSON only. No raw-format parsers or raw dumps belong in the Phaser game. |

The root `assets/` source package and `public/assets/` runtime outputs are
different layers. Tools and raw sources are ignored by Git; inspect `.gitignore`
before introducing a new cache. Do not stage an entire dump to make a missing
local fixture available on the other PC.

## Rules for reading source data

1. **Resolve identity before geometry.** Use exact sprite form and database
   series/acquisition records. `effectFrames` references effect groups, which
   then reference effects; group/effect IDs can collide. Preserve all member
   fields and process associations, including unknowns and alternate references.
2. **Select the active mode before evaluating values.** A serialized curve is
   not evidence that Curve mode is selected. Constant, NewtonDynamics, CurveValue
   and CurveSpeed have different meanings. This applies to movement, UVs, color,
   alpha and deformation. Do not “fix” appearance by activating dormant data.
3. **Keep coordinate layers separate.** Body crop/pivot, effect-local geometry,
   parent inheritance, texture UV transform, member transform and arena anchor
   are distinct. A UV quarter-turn must not also rotate a model or trajectory.
   Pixel size does not establish native physical units or placement conventions.
4. **Preserve clocks.** FFBE effect/impact source ticks are 60 Hz; they are not
   character sheet indices. Body tracks have their own frame delays. Snapshot
   inheritance at the actual (possibly fractional) birth time and keep seeking
   deterministic for review.
5. **Keep evidence status separate from playback status.** A value can be read
   correctly while its equation remains experimental. An unsupported component
   must remain visible in the report even if the rest of the animation plays.
6. **Prove shared changes with controls.** Use affected and unchanged cases,
   retain source hashes, inspect the whole animation and compare the same frame
   before/after. No per-skill angle/offset stack or substitute effect hides an
   unresolved source rule.

The current importer conservatively labels later `@` segments as conditional.
The composition audit shows that `@` can separate parallel process groups; the
separator alone does not establish a condition. Do not flatten those groups,
assume they are optional, or treat the present parser label as the native rule.

## Latest skill findings and open work

The current reproducible research candidate is `plan-basic-uv.json` for the three
Cloud skills. The [skill workflow](skill-reconstruction-workflow.md) contains its
full preparation commands. Preview port 3121 is a convenience, not stored asset
state or a substitute for preparing the plans.

| Finding / capability | Current status and evidence |
| --- | --- |
| Active color/alpha selection | Bounded source-mode implementation prevents dormant curves from changing constant appearance; source-less Particle color remains unresolved. [Appearance review](research/original-appearance-review.md) |
| Rate-zero parent alpha; translation at birth | Implemented for explicitly supported cases, with fractional-time/deterministic-seek checks. Other inheritance/rate combinations remain open. [Inheritance review](research/original-inheritance-review.md) |
| Single-texture UV rotation and pivot | Source inputs restored under opt-in `--basic-uv`, using the shared experimental inverse-TRS policy. Blade Beam's three crescent layers contain -90 degrees; no new artwork angle or geometry correction was added. [Blade Beam audit](research/blade-beam-source-geometry.md) |
| Two-texture operations / distortion | Selected experimental material paths exist. The native shader equation, background-dependent behavior and transparent-sheet export are not generally solved. [Playback](research/original-skill-playback.md), [rectangle investigation](research/climhazzard-rectangle-investigation.md) |
| Particle and Model billboarding | Source camera-facing behavior is not fully implemented; simulation transforms and render orientation must be separated. [Particle geometry audit](research/original-particle-geometry-audit.md) |
| Model vertex colors | Original M3R RGBA is present but not fully applied by the research shader. Native combination needs an isolated check. [Renderer audit](research/original-renderer-feature-audit.md) |
| Emission shape / untextured primitives | Blade Beam Model-surface emitter is withheld; source-less Power Geyser untextured Particle remains unresolved. Do not substitute point emission or a white rectangle. [Shared import](research/shared-skill-import-review.md), [rectangle investigation](research/climhazzard-rectangle-investigation.md) |
| Member placement / rotation conventions | Raw offsets, alternate-side selection, Euler/compatibility order and arena mapping remain unresolved. Blade Beam's -1100 is retained, not applied. The two-times-275 compensation hypothesis was rejected because one curve is dormant. [Composition audit](research/original-composition-audit.md), [Blade Beam audit](research/blade-beam-source-geometry.md) |
| Native fidelity / publication | No complete native-frame comparison has approved these research candidates. The player is an offline experiment; the existing game still uses its reviewed converted effects/adaptations. |

These are concrete work items, not requirements to reverse-engineer the entire
original engine before importing another supported skill. Pick one shared
capability, verify it on appropriate fixtures, and retain explicit limits.

## Verification and two-PC handoff

For the concrete USB folder list and second-PC setup, use the
[two-PC handoff](two-pc-handoff.md).

Run commands from the repository root in PowerShell. The character workflow
describes Node.js 24, Python/Pillow, `FFROGUE_PYTHON`, ffbetool and the local effect
SDK prerequisites. Use the actual installed Python path on each machine; do not
hardcode another user's runtime directory into a recipe or shared command.

Check which sources, SDKs and ignored fixtures exist before running a command.
Tests that skip missing local source pairs do not prove those source paths work.
Do not assume `tools/data/` or a running preview server survives Git sync.

Choose checks according to the change:

- **Character/import or existing effect publication:** recipe inspection, the
  pipeline tests, relevant combat checks, build and real game motion/timing review
  described in the character workflow.
- **Original decoding/rendering:** relevant Python/Node source tests, inspect the
  generated reports, finite/deterministic playback and same-frame A/B. List
  remaining unknowns and whether an original-game reference was compared.
- **Background:** real image decode and visual review, source/output hash,
  dimensions, floor and actor extents. Code/registration changes additionally
  need the relevant build/browser checks.
- **Documentation only:** check commands/options against the current tools and
  local links against files. Do not report game behavior as retested.

The latest UV milestone recorded 15 Python and 26 Node tests passing with no
skips, plus full F0–F210 playback of all three skills and eight GPU blend checks
per preview without returned warning/error logs. These are dated observations,
not expected test-count assertions or proof of original fidelity. Its ignored
receipt is `tools/data/shared-skill-review/basic-uv-review-verification.json`.

For each import/reconstruction handoff, retain this information in a tracked
review note (and a detailed ignored machine-readable receipt when appropriate):

```text
Task and scope:
Source identity: region/version, exact form/skill/group/effect IDs
Inputs: repository-relative files, SHA-256, tool/recipe versions
Interpretation: active modes, supported fields, inferred rules, unknowns
Commands: inspection -> preparation -> preview -> publication, only steps used
Outputs: files/keys, dimensions/pivots/timing, checksums
Visual review: arena/target, seed/frames, reference URL/time if actually compared
Adaptations: explicit game choices; separate visual timing from damage events
Unsupported or withheld components:
Checks actually run: commands, results, skipped checks and limitations
Publication state: research-only / reviewed adaptation / runtime-checked
Next bounded task and relevant workflow/evidence links:
```

The terms in this handoff template are documentation labels, not new runtime
enums or a currently implemented approval database. A useful source or successful
preview does not automatically make a skill reward-eligible.

## Detailed evidence index

Use these when changing a specific decoder or rule; do not rederive field
offsets from image appearance:

| Topic | Reference |
| --- | --- |
| IBMB header, node lengths, hierarchy, scalar keys | [Structural reader](research/bmb-structural-reader.md) |
| Vector channels, float32 comparisons, active/dormant keys | [Vector channels](research/bmb-vector-channels.md), [shared skill additions](research/shared-skill-import-review.md) |
| Fixed transforms, mode slots, typed resource bindings | [Fixed parameters](research/bmb-fixed-parameters.md) |
| Materials, M3R layout, converted model differences | [Materials and models](research/bmb-materials-models.md) |
| Source appearance, field ambiguity and verification | [Appearance review](research/original-appearance-review.md) |
| Inheritance, billboards and source feature gaps | [Inheritance](research/original-inheritance-review.md), [particle geometry](research/original-particle-geometry-audit.md), [renderer audit](research/original-renderer-feature-audit.md) |
| Group tuple meanings, parallel processes, offsets | [Composition audit](research/original-composition-audit.md) |
| Latest UV correction and unresolved Blade Beam proportions | [Blade Beam source geometry](research/blade-beam-source-geometry.md) |
| Source-less effects and rejected searches | [Missing effect sources](research/missing-effect-sources.md), [Climhazzard feasibility](research/climhazzard-original-feasibility.md), [rectangle investigation](research/climhazzard-rectangle-investigation.md) |
| Body state/pivot behavior | [Character animation audit](research/character-animation-audit.md) and current character workflow |
| Earlier converted-effect adaptations | [Brave Slash](research/brave-slash-integration.md), [Cross Slash UV repair](research/cross-slash-uv-repair.md), [artwork orientation](research/effect-orientation.md), [Satellite Beam](research/satellite-beam-import.md) |
| Character identity and available skill catalog | [Cloud versions](research/cloud-version-comparison.md), [MVP skill audit](research/mvp-skill-audit.md) |
| Existing batch baker | [Batch workflow](research/skill-batch.md) — converted-effect path, not automatic original-data export |

When a future milestone changes a status above, update this handbook and its
operational workflow in the same change. Keep old receipts as historical
evidence and link the successor result; never rewrite a failed or unperformed
comparison as a success.
