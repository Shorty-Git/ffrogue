# Shared skill import review

This offline milestone compares Brave Slash (214800), Blade Beam (214810) and
Climhazzard (214820) using the same staging, preparation and preview tools.
No runtime skills or effect recipes are replaced. Names and presentation are the
import target; FFBE damage formulas and chaining are not acceptance requirements.

The subsequent [renderer feature audit](original-renderer-feature-audit.md) identifies
source properties that this preview omits, including measured alpha and inherited
movement differences. Known-category comparisons below are not completeness checks.

## What changed

`stage_original_skill.py` replaces the Climhazzard-only research extraction script
with a skill-ID argument. It follows an existing character inspection report,
requires exact archive-member matches, checks indexed entries and decompressed
sizes, hashes original binaries, and stages typed texture/model dependencies.
It refuses missing or ambiguous sources and changed existing originals.

The first strict authoring comparisons for Brave Slash and Blade Beam failed on
previously unmapped vector curves. Newly located fields are:

| Node type | Field | Relative byte offset |
| --- | --- | --- |
| Quad | Translation value curve | 1424 |
| Quad | Translation speed curve | 1440 |
| Quad | Translation mode | 1416 |
| Particle | Texture 1 translation speed curve | 1440 |
| Particle | Texture 1 translation mode | 1800 |

Nonempty keyframe payloads were located by exact source float32 values and their
count/pointer references. The Quad mode slot was uniquely identified across 147
locally paired nodes with Constant, NewtonDynamics, CurveValue and CurveSpeed
settings; the Particle UV mode slot across 29 nodes with Constant/NewtonDynamics.
These are local evidence counts, not a claim of full format support.

Importantly, the three affected Quad curves are dormant: their actual mode is
NewtonDynamics. The Particle UV speed curve is also dormant, with Constant mode.
Reading a curve must not activate it. The new source integration test checks this.
All three new original effect files now pass the full existing partial binary /
authoring comparison. This permits the already shared two-texture Add evaluator
to be used on both additional skills, without bypassing the comparison gate.

Blade Beam also exposed a previously missing generator interval for Particle
nodes. The verified interval offsets are ControlNull 220, Quad 520, Particle 420,
Model 472. A scan of locally paired nodes checked varying source intervals;
the source-case integration test compares these values directly. Fractional
intervals use the existing deterministic instance generator. This establishes
field values, not original-game generation or inheritance semantics.

## Shared presentation

Preparation can take `--recipe tools/characters/cloud.json`. Movement and scope
come from the selected reviewed game definition, not imported damage metadata.
The same presentation helpers handle both movement types and target scopes:

- Brave Slash and Climhazzard approach the selected target, play their body
  motion on the effect clock, and return home.
- Blade Beam casts from home. A target-group effect uses the enemy group's
  centroid; target effects are instantiated once per enemy.
- Changing the selected enemy does not move an area effect's group anchor.
- Approach/return durations, target-body offset and group-centroid mapping remain
  declared preview adaptations. Source hit markers do not apply gameplay damage.

`preview_original_skill.mjs` accepts repeated `--plan` arguments. One page offers
all three skills, both arenas, target rows, playback and frame scrubbing. Rendering
diagnostics are collapsible and include the existing second-texture A/B switch.

## Current limits

| Skill | Current evidence | Remaining limitations |
| --- | --- | --- |
| Brave Slash | Original binary and 15 resources staged; full known source comparison passes; shared Add layers available | Research renderer policies still apply; this is not approval to replace the existing reviewed flashcut bake |
| Blade Beam | Two original binaries and seven resources staged; shared stationary / area presentation | Particle node 10 of the main wave emits from a Model surface, which is unsupported and explicitly withheld; raw member offset -1100 is retained but not evaluated |
| Climhazzard | Four original binaries staged through the same tool; existing distortion / corner-color experiment retained | Untextured Particle withheld; distortion, inheritance and unresolved member placement fields remain unverified |

The model-surface limitation is read from the matching authoring project after
the known binary/source comparison succeeds. The player must not silently turn
that emitter into point emission. Unsupported shapes are listed and their node
is withheld; this is an incomplete preview. Original sources without authoring
supplements retain the earlier research uncertainties.

Nonzero trailing source member fields now produce explicit preview issues.
Neither an issue count of zero nor a successful decoder comparison establishes
complete native renderer support. Global evaluator policies remain visible.

## Reproduce

For each source ID above, stage through the same command, varying only ID/output:

```powershell
python tools/stage_original_skill.py --report tools/data/characters/cloud/report.json --skill-id 214800 --output tools/data/shared-skill-review/brave-slash
python tools/stage_original_skill.py --report tools/data/characters/cloud/report.json --skill-id 214810 --output tools/data/shared-skill-review/blade-beam
python tools/stage_original_skill.py --report tools/data/characters/cloud/report.json --skill-id 214820 --output tools/data/shared-skill-review/climhazzard

python tools/prepare_original_preview.py --source tools/data/shared-skill-review/brave-slash/skill-source.json --unit cloud --recipe tools/characters/cloud.json --authoring assets/battle_effect/atk_impact_001_pink.bmsln --scene-composite --withhold-untextured --output tools/data/shared-skill-review/brave-slash/plan.json
python tools/prepare_original_preview.py --source tools/data/shared-skill-review/blade-beam/skill-source.json --unit cloud --recipe tools/characters/cloud.json --authoring assets/battle_effect/atk_aerialslash_001_green.bmsln --authoring assets/battle_effect/atk_slash5_blue.bmsln --scene-composite --withhold-untextured --output tools/data/shared-skill-review/blade-beam/plan.json
python tools/prepare_original_preview.py --source tools/data/shared-skill-review/climhazzard/skill-source.json --unit cloud --recipe tools/characters/cloud.json --authoring assets/battle_effect/atk_slash7_side_purple.bmsln --authoring assets/battle_effect/atk_blow1_purple.bmsln --distortion --fit-screen --scene-composite --quad-colors --withhold-untextured --output tools/data/shared-skill-review/climhazzard/plan.json

node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash/plan.json --plan tools/data/shared-skill-review/blade-beam/plan.json --plan tools/data/shared-skill-review/climhazzard/plan.json --port 3118

python -m unittest discover -s tools -p 'test_bmb*.py'
python -m unittest discover -s tools -p 'test_original_texture_layers.py'
node --test tools/test_original_effect_player.mjs
```

All stage files and screenshots stay under ignored `tools/data/`. The new source
test skips explicitly when those local originals are absent. It does not replace
visual review or authorize publishing a skill.

## Verification performed

- 26 Python BMB tests passed, including the three new local source comparisons
  and generator-interval checks; none skipped in this workspace.
- Three authoring-layer tests and 13 Node playback/presentation tests passed.
- Preparing all three plans a second time produced byte-identical SHA256 hashes;
  the receipt is `tools/data/shared-skill-review/repeatability.json`.
- All three plans reached ready state in the actual browser and passed the eight
  existing GPU blend/color checks. Ready reports list 0 skill-specific issues for
  Brave Slash, 2 for Blade Beam and 5 for Climhazzard, in addition to global policies.
- Second-layer A/B images were inspected for Brave Slash at F35 and Blade Beam's
  per-target cuts at F8. Blade Beam F35's main crescent does not demonstrate the
  second-layer feature; its Model-surface particle is withheld.
- Full F0–F210 playback was checked for Brave Slash / Forest / upper target,
  Climhazzard / Forest / lower target and Blade Beam / Reactor / upper target in
  a fresh browser tab without warning/error logs. Blade Beam also completed in
  Forest / lower target. The earlier missing-interval failure was corrected;
  it is not counted as a passing run.
- No in-game damage, MP, progression or runtime replacement was tested or changed.
  No new original-game video comparison was performed for this milestone.

This proves repeatable shared preparation and bounded preview capabilities. It
does not approve these three research animations for runtime publication. The
next reusable visual capability to evaluate is emission from model surfaces;
do not repair Blade Beam by silently replacing its unsupported emission shape.
