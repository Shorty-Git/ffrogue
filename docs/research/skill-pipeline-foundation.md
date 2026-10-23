# Skill pipeline foundation and run progression

Decision recorded on 2026-10-22. This is a design target and milestone order,
not an implemented catalog, executor, renderer or reward system.

For current commands and capability status, start with the
[asset pipeline handbook](../asset-pipeline-handbook.md). The milestones below
record the development direction; linked follow-ups may supersede earlier status.

## Product objective

Each hero starts a run with an explicitly configured small skill loadout.
Victories offer three reward cards; eligible cards can teach a compatible hero
a new skill for that run. Skills, eligibility and offer weights come from data,
not per-character code or a fixed three-skill catalog. Exact starting loadouts,
active-slot limits and balance weights remain explicit design choices.

### Presentation and gameplay scope

The game reuses skill names and animations to provide fluid, readable combat.
FFBE chaining, chain families, chain multipliers and cross-character frame
synchronization are out of scope. Original hit counts and damage formulas are
not requirements for the importer or combat executor.

Source timings may help synchronize actor motion, effects and visible impacts.
Keep them as provenance; do not automatically turn every source hit into a
gameplay damage event. The reviewed game definition chooses damage application,
MP costs and other mechanics independently. Tune their values later against
wave progression. Multiple visual impacts do not require chaining support.

The immediate import goal is a repeatable path for coherent animations across
multiple skills. Prefer shared rendering capabilities over individual visual
repairs. Unsupported visuals remain explicit and can hold back that skill
without holding back the supported catalog.

## What the existing evidence establishes

- Original BMB fields are checked against matching BMSLN authoring projects.
  These comparisons establish decoded fields, not original-game playback.
- Original M3R geometry is checked against converted Effekseer model files.
  This establishes counterpart relationships and conversion differences, not
  original-game rendering fidelity.
- The current Effekseer baker loads converted effects and their dependencies,
  including models. A spritesheet can contain a correctly rendered 3D effect.
  Existing effects are not automatically invalid because of the output format.
- Some conversions and presentations are already known adaptations: the Brave
  Slash flashcut variant, Cross Slash UV repair, and combined area damage for
  Blade Beam/Satellite Beam. Their provenance must remain visible.
- A partial original-data Climhazzard preview now exists through the shared
  reconstruction workflow. Complete native fidelity and runtime publication
  remain unapproved. Decoder test counts and wireframes cannot substitute for
  visual skill acceptance.

## Stable layers

| Layer | Responsibility |
| --- | --- |
| Original-source resolver | Exact character form, skill identity, region/version, branches, body motions, effects, resources and hashes |
| Normalized offline skill plan | One presentation clock with actor motion, approach/return, effect anchors/layers, source impact markers and unsupported visual features |
| Reviewed game definition | Skill ID, compatible heroes/forms, MP cost, targeting, damage/healing/status operations and deliberate roguelike balance changes |
| Visual preparation | Reproducible reviewed rendering/export with explicit supported features, camera/pivots, seeds, dependencies and output hashes |
| Runtime skill catalog | Only processed assets and clean game data; no BMB/M3R/SQLite parsing in Phaser |
| Shared combat executor | Play the prepared motion/presentation and apply reviewed gameplay events; no character-specific skill handlers |
| Run state | Which skill IDs each hero has learned and which are equipped during this run |
| Reward offers | Filter the approved catalog against the current party/run and generate three eligible choices with configured weights |

Keep original mechanics and the reviewed game definition distinct. Source
mechanics are research metadata, not automatically imported requirements.
Only unsupported operations required by the reviewed game definition block
gameplay publication. Do not implement FFBE chaining to satisfy a source record.

## Readiness gates

Skill readiness needs separate evidence for source completeness, visual support
and combat behavior. A proposed progression is:

1. `discovered`: source identity/ownership known.
2. `source-resolved`: all required source records/assets found; unknown features
   are enumerated, not replaced.
3. `previewable`: an actual complete preview runs and declares its adaptations.
4. `visually-reviewed`: full animation inspected for the relevant arenas, target
   rows and party positions; original-game reference comparison recorded when
   available. Without one, fidelity stays explicitly unverified.
5. `runtime-ready`: the combat executor supports the reviewed operations and the
   skill has passed an in-game execution check.
6. `reward-enabled`: compatibility, acquisition conditions, balance and offer
   metadata are reviewed for inclusion in a run.

These names are proposed design terms, not new runtime enums. Reward eligibility
must not infer readiness from asset existence or the source game's learn list.

## Rendering boundary

Retain Phaser, the working character-sheet importer and processed PNG/JSON
publication as the current boundary. Replace incomplete source conversion and
skill choreography incrementally, without discarding proven output loaders.

Background-dependent distortion may not survive a transparent PNG bake with
original behavior. The newly decoded `Distortion` labels are not a solved shader.
A reference experiment must determine whether the MVP can use a reviewed baked
adaptation or needs a separate prepared runtime presentation feature. Such a
feature requires an explicit architecture review before implementation; do not
silently broaden runtime raw-format support or label an approximation faithful.

## Run ownership and card offers

- A character's compatible catalog, run-learned skills and equipped skills are
  separate sets. Learning a skill does not have to mean unlimited active slots.
- Configure starting IDs explicitly. The current dock exposes three skill slots;
  catalog size must not be limited by that UI. Do not silently change the slot
  limit or progression rules while implementing the importer.
- A skill reward identifies its recipient and skill ID. Applying it updates
  run ownership, not the source catalog or prepared character files.
- Offer only `reward-enabled`, compatible, supported and currently learnable
  skills. Exclude already learned skills unless a separate upgrade rule exists.
- Store offer weights/tiers/prerequisites as reviewed roguelike data. They are
  not inferred from FFBE source rarity or gacha probabilities.
- Resolve three distinct eligible offers when possible. Small pools need an
  explicitly defined fallback using available reward categories; never fill a
  card with an unsupported skill. Selection applies once and advances the run.
- Existing reward code offers fixed buff/heal choices. Dynamic skill rewards
  and run ownership are not implemented by this design document.

## Implementation order and acceptance

1. **Compare shared capabilities.** Assess Brave Slash, Blade Beam and
   Climhazzard through the existing import path. Identify common missing visual
   functions and explicit unsupported features. Climhazzard is a useful complex
   case, not a prerequisite for importing every other skill.
2. **Prove a shared improvement.** Complete one common capability and inspect
   its effect on multiple skills, including actor motion and target-row
   placement. Express supported presentations as normalized plans and reviewed
   game definitions. Preserve current versions for comparison until replacements
   are accepted. Prove repeatable output and visible unsupported-feature reports;
   do not replace the shared path with individual hand-built versions.
3. **Incremental runtime migration.** Introduce supported timeline operations in
   the common executor and replace approved skills individually. Recheck motion,
   actual damage timing, target scope and MP consumption in the game. Do not
   migrate every old command merely because a decoder now reads more fields.
4. **One progression slice.** With a small approved skill pool, configure a
   starting loadout, win a battle, choose one of three cards, learn a skill and
   execute it in the next battle. Handle the current active-slot limit explicitly.
5. **Expand the pool.** Batch-inspect/import further skills through the proven
   path. New features require shared capability work; unsupported skills remain
   out of offers. Then tune pool variety and reward weights with real runs.

The next user-facing milestone is a visible reference animation, not another
isolated count of successfully parsed fields. This milestone sequence does not
authorize an all-at-once rewrite of the game, reward UI and combat system.

An [isolated original-data playback experiment](original-skill-playback.md) now
provides a visible Climhazzard candidate. It remains incomplete and unapproved;
its limitations prevent publishing that candidate, not evaluating other skills.

The [rectangle investigation](climhazzard-rectangle-investigation.md#follow-up-local-authoring-evidence-boundary)
found no local authoring counterpart for the untextured Particle primitive.
An individual game adaptation was proposed after this investigation, then
deferred in favor of proving reusable pipeline capabilities. Do not assume native
behavior, repeat the same authoring search, or treat the research result as
approval for runtime migration.

The [shared import review](shared-skill-import-review.md) now exercises Brave
Slash, Blade Beam and Climhazzard through the same original-source tools and a
single selectable preview. It records the shared source-comparison additions,
movement/targeting helpers and explicit unsupported emission/placement features.
This is an offline comparison milestone, not approval for runtime publication.
