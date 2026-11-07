# Brave Slash composed research preview

Milestone: 2026-10-24. Implements the recovered character-attack/skill composition
in an isolated preview for the existing 5-star Cloud recipe (207000105), ability
214800. The original command evidence and scope are recorded in
[native hit profiles](native-hit-profiles.md#controlled-execution-character-attack-effects-precede-motion-1-abilities).
The captured upgraded Cloud used the same skill master; this preview uses the
project form's own standard attack effect. No character-form migration occurs.

## What changed

`tools/resolve_composed_skill.mjs` checks the composition's database hash and
unit/ability identity against an inspected character report. It resolves the
combined CSV through the common group resolver, marks groups as `unit-attack`
or `skill`, and preserves the raw ability data and composition provenance.
The existing stage tool extracts exact indexed original members/dependencies.
The shared preparer retains origin metadata in members and the composition
receipt in the plan; the preview displays those origin labels.

The common resolver/preparer now implements the verified native default for
ordinary three-field `frame:group:layer` entries: omitted anchor means target-unit.
`BattleUnit::playBattleEffect` at 0x1331594-0x13315f4 reads a fourth field when
present and otherwise sets mode 1. Explicit unknown anchor values remain unknown;
malformed two-field entries do not receive this default. Original raw strings
are retained rather than rewritten.

The first white-slash preparation failed on a stored
`Texture1_Color_Scale_Alpha_Value_Curve`. Inspection found two stored keys on
node 6, but its authoring selector is `Constant`. The comparison now explicitly
permits only that known dormant channel and records it under
`dormantAuthoringCurvesNotDecoded`. It does not decode its binary key slot or
verify a binary selector; the exclusion uses the explicitly matched BMSLN
supplement. Active CurveValue/missing selectors still fail. No unknown active
curve is enabled, replaced with zero, or accepted silently.

## Result and source identity

The project unit's basic group is `2:1000290:1` (slash1 white). The raw skill
remains `4:5008050:1:1:0`. Their composed group starts are F2/F6. The white member
adds its own one-frame delay, so actual component starts are:

| Component | Origin | Component start |
| --- | --- | --- |
| atk_slash1_white.bmb | unit-attack | F3 |
| atk_impact_001_pink.bmb | skill | F6 |

These are 60 Hz visual ticks. Raw source hit markers remain separately labeled;
they are not a reconstruction of native composed damage/chaining rules.
The pink effect's render data matches the previous reference plan after excluding
only the newly reported empty dormant-authoring metadata field. Its geometry,
textures, colors and renderer reference have not been rescaled for this change.

Inputs:

- Database SHA-256: `ab176368d6a8faa9319f471f3f0138ec4c578cf131c759a593479dac9487183f`.
- Recipe: `tools/characters/cloud.json` (hash retained by prepared plan).
- Archive: `com.square_enix.android_googleplay.FFBEWW/files/common_lang/sd/battleEffect/Ver31_battleEffect1_common.cpk`.
- Pink BMB SHA-256: `89c3cb5e7c16df69bf8d1c538622afdd42e30942240141a8147dd55da4de690f`.
- White BMB SHA-256: `32c66c01d93f64f2fb67a5c0580bb62f2622b1a56a1e36e55210594e10b07de9`.
- Prepared plan SHA-256: `35f5737ff196e8055f7acad1afc6c5f63d246f890c57025092745168ac641488`.

The separate ignored folder is `tools/data/shared-skill-review/brave-slash-composed/`.
It contains inspection/source/composition reports, originals, dependencies, plan,
browser initialization result, screenshots and `composition-review.json`.
The two originals have 18 indexed dependency records in total, with none missing.
The earlier source-only plans are retained for comparison.

## Reproduction

Run from the repository root with FFROGUE_PYTHON configured as in the character
workflow. Refresh the character inspection if its source/recipe has changed.

```powershell
node tools/import_character.mjs --recipe tools/characters/cloud.json
& $env:FFROGUE_PYTHON tools/compose_skill_effects.py --unit-id 207000105 --skill-id 214800 --output tools/data/shared-skill-review/brave-slash/composition-five-star.json
node tools/resolve_composed_skill.mjs --composition tools/data/shared-skill-review/brave-slash/composition-five-star.json --report tools/data/characters/cloud/report.json --output tools/data/shared-skill-review/brave-slash-composed/inspection.json
& $env:FFROGUE_PYTHON tools/stage_original_skill.py --report tools/data/shared-skill-review/brave-slash-composed/inspection.json --skill-id 214800 --output tools/data/shared-skill-review/brave-slash-composed
& $env:FFROGUE_PYTHON tools/prepare_original_preview.py --source tools/data/shared-skill-review/brave-slash-composed/skill-source.json --unit cloud --recipe tools/characters/cloud.json --authoring assets/battle_effect/atk_slash1_white.bmsln --authoring assets/battle_effect/atk_impact_001_pink.bmsln --scene-composite --withhold-untextured --inheritance --source-appearance --basic-uv --rectangle-placement --renderer-reference tools/data/memorial-audit/diagnostic-v7/renderer-reference.json --output tools/data/shared-skill-review/brave-slash-composed/plan.json
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan.json --port 3126
```

The first inspection refresh is a reproduction prerequisite; this milestone used
the already-present inspection after checking unit/ability fields and the matching
composition database hash. No fresh emulator capture or installation was needed.

## Checks actually executed

- 41 Node character-pipeline/player/inheritance/appearance/UV checks passed,
  no skips. After restricting the anchor default to exactly three fields, the
  affected 12 character-pipeline checks passed again.
- 27 Python BMB checks, 15 original-source checks and 5 composition checks passed,
  no skips. Active/missing selectors for the newly excluded dormant curve reject.
- Original extraction, source/resource hash checks, preparation and plan assertions
  passed. Members start at F3/F6 with explicit origins; pink render data is unchanged.
- Browser at `http://127.0.0.1:3126/?skill=214800` reported eight passing GPU blend
  checks and nine source/rendering limitations. Playback ran from F0 to F210;
  seeking to F26/F42 and restart were exercised. Reactor/middle and Forest/upper
  views were inspected: the white slash and later pink impact are visible at the
  target. Screenshots are retained as `browser-f26.png`, `browser-f42.png` and
  `browser-forest-upper-f26.png`. Console logs were not separately inspected.
- `git diff --check` passed. No full game build was run: no src or public assets
  changed. These previews remain `approved: false`.

The original size discrepancy, native camera/rectangle equivalence and existing
particle/material limitations remain open. This milestone verifies composed
source selection/timing and browser playback, not original pixel fidelity.
Only Brave Slash received the new composition preview. Review this bounded result
before extending the same staging path to other skills or defining publication.
