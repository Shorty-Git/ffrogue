# Renderer coverage inventory and shared implementation priorities

**Superseded as the working inventory (2026-11-12):** the corpus-wide successor is the generated
[player issue inventory](player-issue-inventory.md) over all published scenes, with the
[box detector report](box-detector-report.md). Of the priorities below, two-texture Distortion, Quad
corner gradients, zero-extent emitters and untextured screen planes are implemented in approximation
mode (see `docs/current-state.md`, "Renderer completion session"); parent alpha/transform
combinations, Particle facing/billboards and emitters with an extent are still open. The text below is
the 2026-10-24 evidence for three strict Cloud plans and is kept unchanged.

Baseline evidence date: 2026-10-24. **Successor:** the
[shared RGBA experiment](model-vertex-rgba.md) implements and tests the first
recommendation under an explicit plan flag. The table below records the baseline
plans, which do not enable that flag. The immediate recommendation at this revision is a shared model
vertex-RGBA A/B experiment, with Brave Slash and Climhazzard as affected cases
and Blade Beam as an opaque-white control. This is not another Brave Slash size
adjustment. The general import path needs explicit capability coverage, not
per-character fixes or a claim that all FFBE skills already work.

## Actual current corpus and method

The audited plans are:

| Skill | Plan | Effect definitions | Nodes | Member references | Potential draw nodes |
| --- | --- | ---: | ---: | ---: | ---: |
| Brave Slash | brave-slash-composed/plan.json | 2 | 44 | 2 | 21 |
| Blade Beam | blade-beam/plan-renderer-reference.json | 2 | 24 | 2 | 9 |
| Climhazzard | climhazzard/plan-renderer-reference.json | 4 | 56 | 5 | 24 |

Paths above are relative to `tools/data/shared-skill-review/`. The corpus covers
three selected physical abilities, eight effect definitions and 124 nodes. It
is not representative proof for healing, summons, every magic family or all
unit variants. Only Brave Slash's plan currently includes the recovered unit
attack prefix; the composition inspector can inspect the others but their
preview plans have not been migrated.

`audit_original_skill_features.py` checks original BMB hashes, hierarchy/bindings,
matched authoring categories and original M3R byte equality. Its historical
finding descriptions are now explicitly labeled as baseline descriptions; they
are not reused as current statuses. Seven effect definitions have matched
BMSLN supplements; Power Geyser does not. This 7/8 result describes only this
corpus, not FFBE's asset inventory.

`audit_renderer_coverage.mjs` imports the actual current runtime helpers for
inheritance limitations, primitive classification, instance scheduling and
transform/alpha evaluation. It distinguishes missing features, withheld geometry,
unknown controls, unverified native equations and implemented subsets. It pins
the player, plans, source audit and its own tool hash. Counts deduplicate
(effect,node,capability,status), even when one node has multiple messages.

Potential draw nodes exclude ControlNull, withheld surface-emitter subtrees,
withheld untextured particles and unsupported selected distortion. Parent
controls can still feed a draw candidate even when the parent itself has no
mesh. Positive-alpha sampling uses the current evaluator at integer frames
0..180, seed 1; it is not proof of native screen visibility, area, brightness,
random sequence, or animation-time equivalence. A node can need several
capabilities; rows must not be summed as missing pictures.

Ignored results: `tools/data/renderer-coverage/source-features.json`,
`coverage.json`, `coverage.log`. Current coverage SHA-256:
`504b77d18c77ac39da68ce76ddb4d5993d3eac52ca66144dc0452d912f71f1bf`.

## Current requirement matrix

Counts are distinct source nodes in this corpus, not instances or member repeats.

| Requirement / status | Brave Slash | Blade Beam | Climhazzard | Interpretation |
| --- | ---: | ---: | ---: | --- |
| Nonwhite model vertex RGBA missing | 6 | 0 | 2 | All eight are draw candidates with positive alpha sampled; binary vertex bytes exist but GPU color attribute is absent |
| Nonzero parent-alpha equation unverified | 6 | 4 | unknown in Power Geyser | Rate/mode/compatibility need native validation; current multiplication is not automatically proven wrong |
| Unsupported parent transform combination | 3 parents | 0 | unknown in Power Geyser | Three Brave parents feed draw candidates; source-less controls cannot be counted as inactive |
| Particle facing equation unverified | 4 | 1 | 6 | Draw candidates currently use inherited transformed planes |
| Selected model Billboard missing | 1 | 1 | unknown in Power Geyser | Explicit matched authoring selectors |
| Model-surface emitter withheld | 0 | 1 | unknown in Power Geyser | Actual omitted Blade Beam component, distinct from visible particle-facing cases |
| Untextured primitive withheld | 0 | 0 | 1 | Power Geyser node 15, not a license to render a white plane |
| Quad corner handling unverified | 5 | 3 | 7 | Selected/prepared appearance limits; not proof every corner differs visibly |
| Experimental two-texture materials | 4 | 4 | 9 | Native operation, alpha and blending still need validation |
| Source sort priority missing | 4 | 2 | 2 known | Nondefault priority exists; actual overlap consequences remain unmeasured |
| Authoring-dependent controls unknown | 0 | 0 | 30 nodes | Power Geyser lacks the authoring supplement; 12 nodes still qualify as draw candidates under current fallbacks |

Some earlier gaps are already supported and must not be reopened as missing:
rate-zero parent alpha occurs on 36/18/23 nodes respectively and is handled by
the current source-inheritance subset. Supported birth-time parent translation
is present once in Blade Beam (its emitter is withheld for another reason) and
once in Climhazzard (a draw candidate). All 94 authoring-backed nodes in this
corpus specify parent-color rate zero. That does not establish Power Geyser's
unknown rate or make parent RGB a solved general feature.

## Priority and next bounded milestone

### 1. Model vertex RGBA: next implementation experiment

This has verified binary inputs, a missing common GPU input, two affected skills
and a strong unchanged control. Native M3R data already survives preparation:

- Brave Slash nodes 15/16: model_aura_024, 204/300 nonwhite vertices, alpha 0..255.
- Brave Slash nodes 18/20/22: model_fire_001, 200/215 nonwhite, alpha 0..255.
- Brave Slash node 28: model_aura_025, 200/225 nonwhite, alpha 0..255.
- Climhazzard node 11: model_fire_002, 212/230 nonwhite, alpha 0..255.
- Climhazzard node 22: model_aura_041, 297/297 nonwhite, alpha 0..230.
- Blade Beam models: all vertices opaque white, so this omission alone cannot
  explain Blade Beam differences.

These gradients could explain excessive visible coverage, but that is an
inference to test, not an established native shader equation. Implement one
shared opt-in RGBA path, preserving the original vertex bytes and provenance.
No skill IDs, model-name branches, manual opacity factors or size corrections
belong in that path. Establish the color/alpha combination with shader evidence
or a declared experimental equation before considering it a supported default.

Acceptance: check original bytes and interpolation, A/B both affected skills,
verify the opaque-white Blade Beam control stays numerically/visually unchanged,
and preserve seeking/determinism and all other prepared transforms. A successful
experiment closes one common input omission; it does not approve full fidelity,
all missing fields or runtime publication. Native frame alignment remains
necessary for a same-time original comparison, but must not block testing shared
capabilities with already-verified data.

### 2. Parent alpha/transform compatibility, then facing

Resolve one bounded alpha/compatibility rule at a time with simple source cases
and native observations. Preserve source flags; rate-zero is already implemented.
Follow with camera-facing Particle and selected Billboard models as shared
geometry features. Their affected node sets overlap several skills. Do not make
unsupported transform combinations appear correct using another skill's offsets.

### 3. Complete geometry and authoring-independent decoding

Model-surface emission and the untextured Power Geyser primitive are real withheld
components. Recover their selected modes/geometry; do not replace them with
points or white rectangles. The Power Geyser controls must ultimately be read
from original binary/native data rather than requiring a matching BMSLN that
may not exist. Missing authoring is unknown support, not a passing import. The
known ControlNull initialColor field ambiguity must likewise be resolved before
implementing parent RGB; current zero-rate authored controls do not require it.

### 4. Materials, ordering and validation breadth

Two-texture operations, blending, distortion and source sort order are separate
shared capabilities. Isolate their active modes and preserve unsupported cases.
After common cases improve, add representative nonphysical/healing fixtures to
measure coverage breadth. Three Cloud skills cannot establish universal support.

## End-to-end pipeline gaps separate from renderer gaps

A general workflow still needs: exact source identity -> composed visual timeline
-> capability inspection -> reusable render/export -> validated runtime assets.
Current staging/inspection and partial rendering work; a production capability
gate and the original-data export/publication bridge are not implemented.
This audit is a research report, not that gate. Unknown active modes should
ultimately block or explicitly exclude an import, without silent substitutions.

Measured native camera/anchor rules and the motion-1 composition are reusable
within their tested build/scope. Native animation age, internal emitter clock,
RNG and compatibility semantics remain validation gaps. Further emulator use
should answer a named question about those shared capabilities, preferably with
an isolated control. Additional unsynchronized screenshots of one battle are
not a substitute for renderer coverage.

## When to reconsider the backend

Continue the bounded shared-renderer experiment first: the inventory exposes
specific common omissions with usable source data. Do not commit to recreating
every Bishamon feature or promise an extraction completion date from this audit.
After the RGBA and one isolated alpha/compatibility probe, reassess whether the
common model works without per-effect tuning and whether binary-only effects
can be supported. If progress requires per-skill corrections or unavailable
authoring for essential controls, stop extending that path and run a separate
native-renderer export feasibility milestone.

That alternative is currently unproven: it must first load/render a known effect
without manual battle choreography, export repeatable frames and retain the
needed transparency/blend/anchor semantics. Screen recording or opaque screenshots
alone do not prove a reusable exporter. Background-dependent distortion and
additive blending may require retained layers or declared adaptations rather
than a single transparent sheet. The native library's exported names are not
proof of an available render-to-file API.

## Reproduction and checks executed

```powershell
& $env:FFROGUE_PYTHON tools/audit_original_skill_features.py --plan tools/data/shared-skill-review/brave-slash-composed/plan.json --plan tools/data/shared-skill-review/blade-beam/plan-renderer-reference.json --plan tools/data/shared-skill-review/climhazzard/plan-renderer-reference.json --output tools/data/renderer-coverage/source-features.json
node tools/audit_renderer_coverage.mjs tools/data/renderer-coverage/source-features.json tools/data/renderer-coverage/coverage.json
node --test tools/test_renderer_coverage.mjs
```

All three commands ran on the actual staged inputs. Source checks covered eight
original BMB definitions, their prepared model payloads and seven matched
known-category authoring comparisons. Coverage generation ran twice with identical
output bytes. Four tests passed with no skips: nonwhite/white model control,
withheld-parent propagation, rate-zero support and absent-source controls.
Unique-node matrix totals were independently checked against the report examples.
Python compilation and git diff checks passed. No renderer behavior, game assets,
preview size or emulator state was changed; no browser/fidelity review or game
build was run for this inventory milestone. The proposed RGBA experiment has not
yet been implemented at this baseline revision; see the linked successor for its implementation.
