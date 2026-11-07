# FFBE skill pipeline: architecture and root-cause audit

Audit date: 2026-10-26. Status: **analysis and proposed acceptance plan; no renderer implementation authorized by this report.**

Reference clarification: only Cloud's Brave Slash214800, Blade Beam214810 and
Climhazzard214820 were examined against BlueStacks. Satellite Beam is product
history/regression only. Later implementation checkpoints and current next steps
are in SKILL_RECONSTRUCTION_MAP.md; this audit retains its historical scope.

## 1. Decision summary

We have a working game presentation path, a useful but incomplete original-data preview, several strong native function references, and an experimental native pixel exporter. We do **not** have a demonstrated end-to-end importer for arbitrary FFBE skills. A good-looking Cloud preview, a passing function test, and a transferable native image establish three different things.

The main obstacle is incomplete integration of the common simulation and scene rules, rather than a demonstrated shortage of textures. Existing evidence already identifies different birth/RNG rules, interpolation rules, primitive construction, host projection and compositing. Their effects overlap in the final image. Correcting the image without finding the first divergent stage is therefore inefficient.

Recommended product direction: one source-derived skill/effect representation, one explicitly admitted common execution path, and native instructions/runtime as reference oracles. Native GPU capture remains useful reference/export research, but is not established as an automatic production backend. Do not restart a per-module reconstruction loop, silently promote legacy approximations, or commit to native baking for every skill.

The next implementation milestone should establish the shared execution/reference contract and one complete mapped effect through it. It should not add another artwork correction or another disconnected helper test. Implementation remains paused for review of this report.

## 2. What was examined, and what was not rerun

This audit read the current character importer, effect resolver, BMB/vector parsers, preview compiler/player, native connected exporter, live GPU exporter, runtime skill/effect interfaces, battle VFX executor, selected recipes, tests and research receipts. It compared current file identities with recorded coverage and inspected existing export manifests. Read-only ADB queries resolved the ambiguous emulator state after the interrupted installation.

No new battle, recording, renderer patch, import, publication, build or test-suite execution was performed for this audit. Historical pass counts below are attributed to their reports; they are not a fresh green status for the working tree. No external SDK investigation was repeated.

The earlier interrupted export work did leave revision5 installed in Trace: host/device APK SHA256 `b90b252fb0a8ec38e87caac5f64307755a83eca0cf24b348db66674b50a2b2fb`, ready log observed, request file `{}`. Its fixed-step capture behavior has **not** been measured. Installation/startup is not capture acceptance. No main emulator instance was changed by this audit.

### Current architecture, as implemented

| Path | Entry points | What it actually supplies | Remaining boundary |
| --- | --- | --- | --- |
| Character discovery/publication | `tools/import_character.mjs`, `tools/lib/character-pipeline.mjs`, `tools/export_unit.py` | Exact-form sprite conversion, series-level learning catalog, reviewed recipe validation, prepared assets | Not discovery of every equipment, enhancement, cooldown child, quest or limit-burst skill; not an automatic fidelity certificate |
| Published converted-effect path | `tools/export_effect.mjs`, `tools/effects/*.json`, `tools/batch_skills.mjs` | Reviewed EFKE rendering to sheets; cached recipes/dependencies; batch export of already-reviewed entries | Conversion/adaptation and original BMB reconstruction are different paths |
| Game runtime | `src/types/skills.ts`, `src/types/effects.ts`, `src/scenes/BattleScene.ts`, `src/entities/UnitActor.ts` | Prepared body tracks and NORMAL/ADD sheets, selected skill presentations, gameplay execution | No BMB graph execution; one blend mode per effect manifest; restricted motions/scopes/anchors |
| Original-data research preview | `tools/prepare_original_preview.py`, `tools/original_effect_player.mjs` | BMB-derived plans, Three.js geometry/materials, many explicitly gated comparison modes | Own instance generator and approximate transform/curve paths still coexist with native-derived subsets |
| Offline native reference / connected export | `tools/memorial/emulate_*.py`, `tools/memorial/export_connected_effect.py` | Pinned ARM64 function outputs; two complete admitted simple effects through explicit host/parent adapters | Not a general branched NodeTree, common full skill executor, or the browser player's scheduler |
| Live native GPU export | `tools/memorial/live_effect_export.js`, `prepare_live_clip.py`, `serve_live_clip.mjs` | Isolated actual GPU output and blend-run transfer for a sampled game-loaded effect | Automatic loading, full timing, repetition/seed, portability of placement, and a second effect remain unproved |

These paths share evidence and some helpers; they are not one continuous implementation. The published game still uses sheets, not the latest research player. Its current manifest cannot directly express the newly measured mixed NORMAL/additive pass sequence as one ordinary sprite.

### Actual scope, without a misleading completion percentage

- The three checked character recipes select nine commands: **three reviewed timeline presentations and six legacy commands**. This is not nine reconstructed original skills. Cloud selects Brave Slash, Blade Beam and Climhazzard; Climhazzard remains legacy in that publication recipe.
- Existing inspection reports contain 29 Cloud, 32 Aerith and 11 Barret catalog records. These include passive/conditioned acquisition information and are not counts of playable, fully rendered skills.
- The inspected three-physical-skill baseline plans contain eight effect definitions and 124 nodes: Brave Slash 44, Blade Beam 24, Climhazzard 56. This is a narrow corpus, not coverage of magic/healing/cinematic families or the whole asset collection.
- The connected native-code subset has documented four-node/32-state and five-node/123-state exports. The latter is a Capsule fixture, **not a Cloud skill**. Its exporter rejects branching, dynamic/random parents, multiple Particle leaves, two-texture materials and other unsupported inputs.
- There is no reviewed arbitrary-character/all-skills fidelity benchmark with a known denominator. A credible overall percentage cannot currently be calculated.

## 3. Knowledge inventory: established, partial and unknown

“Established” below always means within the cited format/build/branch. Reading a field correctly is not proof that its runtime meaning is implemented.

| Area | Established evidence | Partial interpretation or remaining unknown |
| --- | --- | --- |
| Identity and learning | Unit form to series and level-acquisition joins; source IDs retained | Full ownership closure across enhancements, equipment, LB, unlocks, child commands, forms and regions/builds |
| Body sprites | CGG/CGS conversion through ffbetool; shared crop origin; per-frame delays; dying/readiness/victory track contract | Alternate atlas/track families and every form are not automatically discovered; recoil is a visible-foot heuristic, not decoded choreography |
| Skill/group composition | Explicit ability -> effect_group -> effect mapping; a native-backed ordinary motion1 unit-attack-prefix composition rule | `@` is conservatively labeled conditional in the importer, not universally decoded; other motion branches, parallel/conditional processes and overrides remain incomplete |
| Binary structure | IBMB version `01010301`, four node layouts, checked hierarchy/resource tables, selected vectors, alpha keys, modes; M3R geometry/RGBA | Other versions/types/channels/flags/resources; resource presence is not active branch support |
| Authoring supplements | Matching BMSLN comparisons validate selected binary categories | Several runtime controls still require BMSLN; Power Geyser has no matching supplement in this corpus. Missing authoring cannot imply default behavior |
| Curves | Particle scalar alpha: 576 native outputs, reported maximum residual `4.768376715702516e-8` across 64 controls | Generic scalar/vector/UV evaluation is separate; the native scalar rule does not automatically apply to other domains |
| Scheduling and RNG | Original constant Particle scheduling, delayed-phase behavior and bounded module chains have been exercised | Full interleaved Null/Quad/Particle/Model birth order, ownership of RNG, allocator/lifetime/repeat behavior and inheritance are not connected end to end |
| Parents and transforms | Native locator/writer outputs and limited source-dispatched branches; controlled parent -> Quad handoff | General compatibility/inheritance, derived auxiliary flag, fourth delta-zero phase, random/dynamic nested parents and all facing variants |
| Materials | Original model RGBA bytes, selected Basic/Add/distortion shader evidence, selected native blend factors | All runtime shader overrides/global uniforms, ordering, resource/sampler variants, distortion/background dependencies and all material branches |
| Scene integration | Native placement, geometry scale, camera, viewport and scissor are separately measured in selected samples; shared host contract exists | General original choreography/camera transitions, actor/HUD occlusion and adapted-game mappings are not fully reconstructed |
| Native pixel transfer | One live pink-impact sample has an admitted source-over run followed by an additive run; offline and actual WebGL comparisons reach max2 on black/max3 on white | This validates transfer of original pixels, **not the own renderer's simulation**; arbitrary backgrounds, complete animation and second-source export are not accepted |

Sources: [character workflow](../character-import-workflow.md), [composition audit](original-composition-audit.md), [scalar alpha](native-scalar-alpha.md), [scheduling](native-particle-scheduling.md), [Null chains](native-null-parent-chains.md), [connected export](connected-effect-export.md), [second fixture](connected-second-effect.md), [host contract](effect-host-context.md), [live export](live-native-gpu-export.md).

## 4. Where visual divergence comes from

### Extraction: partly checked, not universally cleared

The BMB reader validates structural boundaries and compares known float32 fields with matched authoring data. A recorded loaded pink BMB retained the checked static vectors, modes, pivots and scalar keys across 35 nodes, despite runtime relocation/initialization changing raw bytes. That is positive evidence against “all relevant values were lost during extraction” for this sample. It does not normalize every changed byte or validate every effect/version.

There are real extraction/coverage limits: authoring-dependent fields, absent channels, unsupported node/version families, source ownership closure and regional/build identity. The correct response is an explicit unsupported capability or unresolved dependency, not a guessed replacement asset.

### Interpretation and timing: confirmed common discrepancies

`original_effect_player.mjs::instances()` still uses its own LCG, positive start jitter, independently sampled parameter ranges, a recursive spawn schedule and a repeatCount1 restriction. Native constant-Particle evidence instead includes a four-word xorshift state, RNG consumption even for zero start range, symmetric/clamped delay, fixed-point time and within-update birth offsets. The native findings are not the browser scheduler. This is a **confirmed semantic divergence**, though its contribution to each screenshot has not been quantified.

The generic `scalar()` uses interval-scaled tangents and different stored tangent sides from the measured Particle scalar-alpha routine. The verified helper is separate and eligibility-gated. This is another confirmed common discrepancy in the older path, not evidence that every curve family should be changed identically.

Three clocks must remain distinct: body-sheet index, source skill/effect time, and original wrapper draw ordinal. The native pink export's ordinal30 is not source F30. The recent readback stalled execution and a later live sample rapidly faded; readback-induced time advancement is a strong hypothesis, **not yet established by a successful fixed-step capture**. Reset/redraw attempts observed zero GPU calls; the reason remains unresolved, and empty output does not prove the whole effect cannot render.

### Transformation and host mathematics: confirmed differences, incomplete general solution

The white Particle is an original white-textured node, not automatically a missing-texture rectangle. Native output for a recorded identity-basis sample has width1278 and height1136. The comparison evaluator under the same root/scale produced approximately639 by514.783 and nonzero Z extent. This localizes a primitive/facing/transform mismatch; it does not justify globally doubling every sprite.

Separate evidence found adapted host dimensions/projection and UI occlusion exposing source-plane edges. A correct primitive can still appear wrong in the wrong host. Conversely, fitting/cropping a bad primitive can make an image look better without correcting simulation. Compare local vertices, world vertices, projected pixels, clipping and final image separately.

### Rendering/compositing: confirmed missing contract

The first exported transparent image, treated as a normal straight-alpha overlay, differed from the native white target by up to220/255, with1,289,258 pixels exceeding two levels. The later actual sample has two ordered blend runs: one source-over command and13 additive commands. Preserving these runs reduced the stored/native comparison to max2/255 on black and3/255 on white; the browser comparison performed before this audit reported the same maxima and zero pixels above3.

That is a valid compositing result for **one sample**. It neither verifies the Three.js geometry/simulation nor permits flattening every skill into one NORMAL/ADD sheet. Background-dependent passes, depth-writing dependencies, sorting and arbitrary masks remain separate requirements.

### Are we correcting symptoms?

Partly. The published Brave Slash recipe deliberately uses a `flashcut` converted variant removing a white emitter; Blade Beam has an approved90-degree artwork adaptation around a tracked bright body. These are documented product adaptations, not decoded original rules. They must not become fidelity references or be reapplied to correctly decoded originals.

The common research renderer does not show a skill-ID dispatch implementing those three Cloud visuals. Many recent changes are legitimate shared capability gates and native comparisons, not arbitrary skill hacks. The structural problem is that tested fragments, gated approximations, adapted recipes and complete-source acceptance have repeatedly been discussed as if they were the same milestone.

## 5. The five largest technical obstacles

1. **One complete lifecycle/phase implementation is missing.** Source graph traversal, birth/death order, shared RNG and init/update/post-update/delta-zero/make/submission must agree as a sequence. Correct leaf math cannot recover wrong parents, age or random history.
2. **The semantic/source contract is incomplete.** Ownership, motion/command composition, branch semantics, binary-only controls and compatibility flags do not cover all source families. A dependency catalog is not yet an executable complete skill graph.
3. **Scene and draw semantics are not uniformly represented.** Facing, parent bases, placement, camera, viewport, sort/depth/occlusion and ordered material passes interact. Current sheet and research paths express different subsets.
4. **There is no stable whole-skill original reference suite.** Strong function references exist, but synchronized complete-effect/whole-skill reference frames with declared RNG/time/host are missing. Native capture currently supplies isolated live states; repeatable full export is unproved.
5. **Evidence, feature flags and product paths are fragmented.** A capability can pass offline without reaching the active browser plan or published game. The cached coverage report is stale, and the current coverage tool itself does not evaluate the native-scalar-alpha flag in its positive-alpha sampling path.

## 6. Why progress has been slow

These are architectural/process causes inferred from the inspected implementation and history, not claims about developer intent:

- **Optimizing the smallest measurable unit.** Many sound tests establish another function or controlled writer, but the count of complete mapped effects/skills often stays unchanged.
- **Changing the acceptance target.** The white prefix, pink impact, Capsule fixture, host clipping and native export each answered different questions. Their results were not consistently joined into one vertical slice.
- **Duplicated semantics.** Original module references and the browser's legacy scheduler/evaluator can improve independently. Passing the reference harness is not a differential test of the player.
- **Testing self-consistency as fidelity.** Formula fixtures, seek repeatability and a round-trip of already-rendered pixels are useful, but cannot independently certify full FFBE rendering.
- **Uncontrolled comparison conditions.** Different game/source clocks, camera/viewport, upgraded body forms, adapted recipes, source builds and RNG can invalidate a screenshot comparison before a shader is considered.
- **Accumulated historical status.** Handbook/handoff entries repeatedly say “current” for different revisions. The coverage receipt pins player `a3b10c...`; current player is `897fde...`. Even a fresh run of the existing coverage tool would omit the latest scalar-alpha sampling flag, so its totals must not be presented as a full current score.
- **Backend feasibility has expanded without a product gate.** Native runtime work is useful only if it yields the specified reference or an automatically reusable export. Another successful startup or one-state capture alone does not meet that gate.

## 7. Proposed universal architecture

Extend the existing prepared-plan model; do not introduce an unrelated engine or rewrite the game now.

```text
Versioned source bundle
  -> character/form/skill ownership catalog
  -> semantic compiler: command/motion tracks + effect dependency graph
  -> capability admission and explicit unresolved requirements
  -> common lifecycle simulation
  -> typed draw packets: geometry, material, order, anchor, camera dependency
  -> shared scene compositor
  -> reviewed prepared assets/metadata -> game runtime

Pinned native instructions / controlled original runtime
  -> independent stage references and validation, not a hidden fallback
```

The contract must preserve source identity, ownership/unlock conditions, body motion, member schedules, hierarchy, phase selectors, RNG ownership, time units, geometry, material state, ordering and host dependencies. A source-derived per-character motion or skill parameter is normal data; a filename/skill-ID correction in the simulator is not.

Maintain three distinct results for each source skill: discovered, executable under a declared capability profile, and reference-validated. Published roguelike availability is a fourth product decision. Unverified-but-visible previews must remain labeled experimental; unsupported active nodes must block fidelity/publication, rather than disappear.

Raw BMB/CGG/SQLite/CPK handling stays in `tools/`. `src/` receives prepared standard assets and clean metadata. Baking is suitable only where its declared local/screen anchors, blend passes and camera/background independence preserve the effect. Distortion, dynamic geometry/camera and other scene-dependent cases need a compatible prepared draw/compositor path or explicit rejection; no universal flat-sheet assumption is justified.

Original names/coherent visuals and source visual timing are import requirements. FFBE chaining, chain multipliers and original damage formulas are not. Keep roguelike MP/damage/rewards separate from the visual reconstruction contract.

### Backend recommendation

Use the existing common renderer as the product candidate and original code/runtime as an oracle, pending one explicit feasibility decision. The current native exporter has not passed automatic named loading, repeatable full timing, second-source and compositing/host-independence gates. A captured screen-space effect cannot automatically serve arbitrary targets/cameras.

If native export is reconsidered as the production backend, give the already-staged fixed-step experiment one bounded acceptance attempt. Require a complete declared sequence and a second source through the same mechanism. If it fails, record the blocker and stop extending that route without a new architecture decision. Do not let another instrumenter revision count as importer progress. This report does not authorize executing that attempt.

## 8. Prioritized delivery plan and stop conditions

| Priority | Deliverable | Acceptance / stop condition |
| --- | --- | --- |
| P0 | One canonical capability/evidence record for exact player, plans, source/native hashes and reference scenarios; typed stage contract based on existing JSON | Explicit current support versus fixture-only evidence; missing references and skipped tests visible. No blanket “supported” boolean inferred from asset availability. Correct coverage sampling/flags before using its totals |
| P1 | One connected lifecycle vertical slice for the mapped nine-node white attack prefix, retaining all nodes and explicit derived phase/RNG inputs | Full source -> simulation -> draw packets -> compositor. Compare first divergence by stage. The four-node strobe and five-node Capsule remain regression controls, not substitutes for this target. If native references cannot determine a required rule, name that exact missing input before a new capture |
| P2 | Run the same completed rule on a second mapped effect requiring it; then assemble one complete skill including unit prefix/body/member timing | No per-skill constant, omitted active node or legacy fallback. Same source identities and host scenario; no “complete skill” claim for a single member |
| P3 | Expand by shared feature demand and add held-out skills/characters | Choose features by newly executable complete effects/skills, not helper-test count. Target a fixed12-skill/four-character benchmark spanning physical, area, magic, healing, multi-stage and screen-dependent families where local sources permit; unresolved families stay explicit |
| P4 | Wire reviewed capabilities into the character compiler/publication path and game executor | A new admitted character uses a recipe/source identity only. Unsupported ownership/motion/material branches report exact blockers. Game receives prepared data, not raw parsers; baseline published effects are not silently replaced |

P1 is a shared engine rule milestone, not a request to tune Brave Slash. Do not fully decode every possible feature before joining existing proven modules. If a work block does not produce a newly complete source, a reduced first-divergence error or a precisely resolved blocker, reassess instead of adding more diagnostics.

## 9. Reproducible reference-test design

### Scenario identity and reproducibility

Each case must identify source build/region, exact character form and skill/motion, source and dependency hashes, native/reference hash, active capability profile, actual RNG input/state, ordered simulation deltas, parent inputs, camera matrices, viewport/scissor, target/caster rectangles, material globals and captured stage/frame identity. A guessed seed1 and an unrelated video frame do not supply those inputs.

Record emitted-instance/node IDs and native simulation age. Align by those values and a common action start; never equate a wrapper draw count, body frame or preview F label. Preserve raw references independently of candidate output. Do not normalize size, crop, exposure or alignment merely to reduce the error.

### Concrete tests and metrics

| Reference test | Measurements and proposed gate | Available reference / limitation |
| --- | --- | --- |
| Extraction and dependencies | Exact IDs/hashes/counts, float32 key/vector bytes, graph edges and resource bindings; zero silently discarded active fields/nodes | Existing BMB/BMSLN/M3R comparisons; limited layouts/categories, incomplete authoring coverage |
| Lifecycle | Exact birth/death counts, parent IDs, event ordering, selected phase/module lists and RNG-before/after; native fixed-point offsets equal where that branch is understood | Native scheduler/chain references exist; no complete general graph reference yet. Missing branches are not passing cases |
| Curves and local parameters | Differential residual by channel/time; scalar Particle alpha existing test tolerance `<3e-6`, reported observed maximum `4.77e-8` |576 native controls available. Vector/UV/general motion require their own oracle, not copied scalar-alpha approval |
| Transform and geometry | Vertex count/stride/order exact; local/world position error separately; proposed projected-vertex error <=0.5 pixel with identical host; viewport/scissor exact | Partial native writer/host samples exist. The observed1278x1136 versus approx639x515 mismatch is a baseline failure, not a current whole-skill residual |
| Native pixel transfer | On identical targets, RGB maximum error <=3/255 and zero pixels above3; exact dimensions/order retained | One actual source-over/additive sample currently meets black/white transfer gate; no patterned-background/full-sequence/second-source acceptance |
| Reconstructed whole effect/skill | All source-required members included. Report event-time error, projected bounds/centroid, per-channel max/mean error, alpha error and differing-pixel fraction inside the union of effect masks; report whole-frame changes too | No reliable synchronized whole-skill image baseline currently establishes these scores. Do not label visual fidelity passed or assign an unsupported SSIM percentage |
| Generic invariants | Same captured RNG/deltas repeat; declared host translation moves vertices accordingly; correct seeking, cleanup and no leaked instances; unchanged control retains output | Some connected-export repeatability/translation tests exist; they do not prove the original scene or every target/camera |
| Held-out import | New characters/skills in declared capability profile require no new renderer branch or artwork fit; unsupported cases fail explicitly | Not yet demonstrated at the proposed benchmark breadth |

The <=0.5-pixel geometry bound and all unexecuted acceptance requirements are **proposed thresholds**, not measured achievements. Establish raster tolerances once per common backend/sampling profile against independent references; do not loosen them per skill. Compare equal deterministic native state where possible; when a real random state is unavailable, label a statistical/visual comparison separately rather than claiming exact agreement.

Existing command families can reproduce bounded references, when their implementation or conditions change:

```powershell
# Known local paths; run from the repository root. Not executed for this audit.
$env:PYTHONPATH = (Resolve-Path tools/data/native-locator-emulation/python-deps).Path
$auditPython = 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'

# Consumes the previously exported original scalar controls; missing receipt can SKIP.
node --test tools/test_native_scalar_alpha.mjs

# Exercises the admitted original-code connected subsets, not arbitrary skills.
& $auditPython -m unittest discover -s tools/memorial -p test_connected_effect.py -v

# Reproduces existing pixel-transfer preparation, not a new emulator recording.
& $auditPython tools/memorial/prepare_live_clip.py --sequence tools/data/live-effect-export/sequence-20261026/ffrogue-live-export-v2/native-clip-pink-20261026-b-d30.json --output tools/data/live-effect-export/clip-review-20261026
```

Fail acceptance when required local original references are missing or tests skip; a unit-test runner's successful exit is insufficient. The future whole-skill suite needs a new scenario/reference manifest before it can have an honest reproduction command. No such runner is claimed to exist now.

### Do not repeat identical checks

Use a result identity derived from: relevant parser/compiler/simulator/compositor hashes + transitive source hashes + native/reference hashes + scenario/time/RNG/host + active modes + test-harness version. Reuse a result when all relevant inputs match. Invalidate only the affected stages and their downstream checks. A new browser port or a new note is not a new test condition.

An unchanged reference control need not be re-exported for a JavaScript-only change. Recompare the changed candidate against the stored reference. Request a new game observation only for a named missing fact that existing artifacts cannot answer, with exact expected fields and a stopping criterion.

### Progress scoreboard

Report per fixed benchmark revision:

1. Discoverable ownership records / known ownership categories covered.
2. Complete dependency-closed skill graphs / all benchmark graphs.
3. Fully executable graphs / all benchmark graphs, with exact unsupported reasons.
4. Complete effects and complete skills with independent stage/image references; keep these separate from fixture/helper counts.
5. Geometry/timing/pixel residuals for each scenario and whether they improved.
6. New held-out skills and characters admitted **without new renderer code**, plus total per-skill adaptations (target zero in the fidelity path).
7. Unresolved active capabilities, skipped reference cases, and regressions; no unknown-to-pass conversion.

Current trustworthy headline: three selected physical-skill research plans, two complete simple connected-effect fixtures, one verified native pixel-transfer sample, and **no demonstrated universal original-faithful all-skills importer**. This states the evidence boundary; it does not erase the substantial reusable native knowledge already obtained.

## 10. Evidence identities and continuation boundary

- Current player SHA256: `897fde4cd35f803b2cd5d2a5ab56063ac46294c67e42fbc9bba6e1fb6fc21829`.
- Preview compiler SHA256: `5ea8dde2f4930c7d85554d9f3ac17b4fa317eceb7e8df60cd49beb2955f9d7a3`.
- BMB parser SHA256: `1bcd037eda146c0389cfd0851d30c9ebb7ced25c32408de675c014d950297d61`.
- Cached coverage hashes an older player: `a3b10c442a2190e403152eb12a9e8be170164e4ce7e5dcc62abaa99dc486fca2`; do not use it as current coverage.
- Native SHA256: `6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`.
- Stored single-sample clip receipt SHA256: `2343f590d186d44eda4e47700e3cd9ba08cafd3a98d6ab226f6440f068942bcc`, at `tools/data/live-effect-export/clip-review-20261026/clip.json`.
- Token `native-clip-pink-20261026-b`: original d30 contains14 GL commands; redraw control contains0. Token `live-runs-pink-20261026-c`: d24 contains15 commands and d30 contains3; d36 was not obtained and the request expired. These are **not a completed sequence**.

The repository contains substantial pre-existing modified/untracked research work, including the unfinished fixed-step probe and clip tools. This audit did not reset or finish them. Resume only after choosing the next acceptance milestone from this report; do not automatically continue the interrupted capture/install loop.
