# Original-data playback experiment

This is an isolated, incomplete Climhazzard research candidate. It is not a
reviewed skill import, an original-game fidelity proof, or a runtime replacement.
The browser makes its missing features and evaluator assumptions visible.

## Reproduce

From the repository root, with Python and Pillow available:

```powershell
python tools/prepare_original_preview.py --source tools/data/climhazzard-source/skill-source.json --unit cloud --motion atk --output tools/data/climhazzard-playback/plan.json
node tools/preview_original_skill.mjs --plan tools/data/climhazzard-playback/plan.json --port 3113
node --test tools/test_original_effect_player.mjs
```

The source receipt and extracted resources are local ignored research outputs.
They must already exist; these commands do not download assets. The preparer
checks source/resource hashes and emits decoded geometry, source component
timing, bindings and an explicit image allowlist. The server checks image hashes
and listens only on localhost. Open http://127.0.0.1:3113/.

The game still loads prepared PNG/JSON. No BMB/M3R decoder was added to `src/`.

## What the candidate displays

- Cloud's existing prepared move/attack/idle sheets, with an explicit 18-frame
  approach and 12-frame return adaptation.
- Two source slash members and a blow at skill F0, a screen strobe at F1 and
  the original power-geyser geometry/textures at F20.
- A source hit marker at skill F4. This does not apply damage or validate
  original choreography; the main geyser starts later in the source composition.
- Seeded generation, static vectors and decoded curves in an experimental
  shared evaluator. Scrubbing recomputes the same state without simulation drift.
- Reactor/forest selection and upper/middle/lower target anchors.

## Unresolved behavior

The baseline and two-texture plans withhold two power-geyser distortion nodes.
The opt-in third experiment below displays them with unresolved shader policies.
Seven unique slash/blow nodes
use a second texture. The baseline plan leaves these out. The supplementary plan
below evaluates them using separate UV transforms, wrap modes and constant
per-layer color/alpha. Its checkbox disables only the second sample, preserving
the new UV/color evaluation for an isolated comparison. It does not restore the
entire previous renderer.

The current TRS parent chain, normalized curve clock, Hermite interpolation,
range sampling, Newton stepping, additive blending and camera-facing planes are
explicit preview policies. Source inheritance modes, expiration, native facing,
quad deformation, vertex-color control and shader equations are unresolved.
Source fields being readable does not prove these evaluation policies correct.
Audio-only groups are retained in the plan but not played.

Do not bake or publish this candidate as an approved Climhazzard. Use the visible
result to identify the next specific renderer discrepancy; then compare against
an original-game reference before migrating shared imports or reward content.

## Verification performed

The preparation command ran successfully and the browser loaded the actual
WebGL candidate. Source F4, the slash phase and the later geyser phase were
inspected by scrubbing. Target anchoring was visually checked at the upper and
middle reactor positions and the lower forest position. Play and Restart were
exercised, including Cloud's return. This is not an exhaustive six-case review.

Four Node tests check curve endpoints/interpolation, parent-relative batch
scheduling, deterministic ranges and explicit failures for unsupported generation.
They verify the implemented preview policies, not equivalence with FFBE.
The browser-generated receipt is initialization evidence, not visual approval.

## Two-texture material milestone

Generate the supplementary plan explicitly; authoring files are not discovered
or silently added by the preparer:

```powershell
python tools/prepare_original_preview.py --source tools/data/climhazzard-source/skill-source.json --unit cloud --motion atk --authoring assets/battle_effect/atk_slash7_side_purple.bmsln --authoring assets/battle_effect/atk_blow1_purple.bmsln --output tools/data/climhazzard-layered/plan.json
node tools/preview_original_skill.mjs --plan tools/data/climhazzard-layered/plan.json --port 3114
python -m unittest discover -s tools -p 'test_original_texture_layers.py'
```

`original_texture_layers.py` first runs the full supported BMB/BMSLN comparison
to establish node order and matching known values. It then supplements Add nodes
with authoring layer color/ranges and motion modes. These values are explicitly
marked as BMSLN supplements, with the project hash; they are not claimed to be
new binary-field discoveries. Unsupported animated color, mapping or crop modes
fail preparation. This is a research path, not a new per-character loader.

The material uses independently sampled layers, inverse 2D TRS about the source
pivot and clamped RGBA addition before node tint/opacity. Random layer colors
use a separate deterministic seed so they do not change generated geometry.
The [vendor material manual](https://www.matchlock.co.jp/manual/bishamonツールオンラインマニュアル/bishamon詳細/ビュー/インスペクタ/マテリアル/)
documents Add as adding the second texture to the first. It does not establish
our exact alpha saturation, premultiplication or UV matrix equations. Those
remain preview policies, not a verified native shader reproduction.

The [vendor distortion manual](https://www.matchlock.co.jp/manual/bishamonツールオンラインマニュアル/bishamon詳細/ビュー/インスペクタ/歪み　変位マップについて/)
describes an RG displacement map modifying the first texture's UVs. Background
distortion requires a special backbuffer mapping. The current Climhazzard nodes
bind glow textures, not a backbuffer; do not assume they require scene capture.
Their strength/color controls and exact displacement equation remain unresolved.

The supplementary candidate loaded and compiled in the real browser without
warning/error logs. At preview F28 (skill F10), toggling the second sample visibly
changes the slash highlights. This observation establishes that the missing
sample affects the image, not that the image now matches original FFBE footage.
Five Node tests cover evaluator policies including independent inverse UV
transforms. Three local-source integration tests cover the authoring supplement
and rejection of mismatched/unsupported inputs; these skip if the ignored local
source pair is unavailable.

## Distortion material milestone

```powershell
python tools/prepare_original_preview.py --source tools/data/climhazzard-source/skill-source.json --unit cloud --motion atk --authoring assets/battle_effect/atk_slash7_side_purple.bmsln --authoring assets/battle_effect/atk_blow1_purple.bmsln --distortion --output tools/data/climhazzard-distortion/plan.json
node tools/preview_original_skill.mjs --plan tools/data/climhazzard-distortion/plan.json --port 3115
python -m unittest discover -s tools -p 'test_bmb_distortion.py'
node --test tools/test_original_effect_player.mjs
```

The opt-in flag adds decoded quad fields to the prepared research plan. Neither
runtime assets nor game loaders change. Unsupported UV/color modes fail preparation.
Only the checked midpoint `[128,128,128]` is accepted for this experiment.

`bmb_distortion.py` reads quad layer RGB initial/range vectors, midpoint, color
mode/value curves and six UV motion-mode fields. Local integration tests compare
them with thirteen original binary/authoring pairs, including varying color and
UV modes and nonempty RGB curves/tangents. Values are checked as float32. The
midpoint examples all use 128: this is a source match, not evidence for arbitrary
nondefault midpoint behavior.

Climhazzard nodes 7 and 9 both have texture-2 RGB `[0.35,0.35,0.35]`, midpoint 128
and randomized initial UV translation. Their texture-2 translation uses CurveSpeed.
A candidate vector-curve slot at quad offset 1632 contains two linear keys from
`(0,-0.03,0)` at normalized time 0 to `(0,-0.01,0)` at 1. The reference projects
found with nonempty texture-2 speed curves use model nodes, not quads. **The quad
slot's interpretation is not yet validated by a nonempty authoring counterpart.**
The plan and browser retain this uncertainty explicitly; no original fidelity
claim follows from structurally valid key data.

The experimental shader samples the displacement map using its independent UV
transform and samples the glow at `uv1 + (mask.rg - midpoint/255) * strength.rg`.
Layer-1 RGB tints the result; source node alpha still controls opacity. Per-layer
alpha controls, native UV operation order and exact native displacement equations
remain unresolved. No scene background/backbuffer is sampled. Different shader
programs have separate cache keys/defines so additive and distortion materials
cannot accidentally share a compiled fragment program.

The second checkbox withholds both distortion nodes when off. It compares the
presence of these layers; it is not a neutral-mask or original-game comparison.
At preview F65, the enabled candidate visibly adds a violet displaced light
column above the ground effect. Both checkbox states were inspected and saved.
The lower forest target was inspected at F50, and Play completed from F0 to F210
with the distortion candidate enabled. The browser compiled and played the shader
without warnings/errors. The new CPU evaluator
test checks neutral midpoint, zero strength and displacement direction; it does
not prove native GPU equivalence. The candidate remains unapproved for baking.

## Scene blending and screen-flash comparison

The user supplied the [official Cloud showcase, starting around 18 seconds](https://www.youtube.com/watch?v=HOI8ALqkZgo&t=18s).
The sequence was inspected in the actual YouTube player using paused frame
stepping. Around 19 seconds the battle view brightens broadly and the purple
eruption has a large white center. This is a qualitative visual reference, not
a frame-synchronized pixel comparison. A local screenshot records the reference.

The existing prepared plan already includes a white screen-anchored strobe at
skill F1; its source alpha curve peaks near 0.4875 at age 15/30. The baseline
renders it as an offset, partially covering world-space rectangle. Source group
offset fields and the original game-to-effect coordinate conversion remain
unresolved. The experiment below explicitly fits its static projected bounds to
the arena, keeping source start time, lifetime and alpha. This **fit is a preview
adaptation**, not a newly decoded original placement rule. Animated/randomized
screen transforms fail preparation. There is no automatic import of a new flash.

An independent compositor defect was identified: effects were blended onto a
transparent WebGL intermediate and then source-over-composited in Canvas2D.
That second composition changes the intended selected WebGL blend equations,
weakening additive light and potentially darkening the scene. The opt-in scene
compositor snapshots the existing opaque scene into WebGL, renders each effect
material against it, and copies the resulting opaque pass back. The back pass
precedes the actors; the front pass snapshots the scene including actors. Each
material retains its own normal/additive blend rather than applying a single
Canvas2D additive operation to all effects, including opaque debris.

```powershell
python tools/prepare_original_preview.py --source tools/data/climhazzard-source/skill-source.json --unit cloud --motion atk --authoring assets/battle_effect/atk_slash7_side_purple.bmsln --authoring assets/battle_effect/atk_blow1_purple.bmsln --distortion --fit-screen --scene-composite --output tools/data/climhazzard-screen/plan.json
node tools/preview_original_skill.mjs --plan tools/data/climhazzard-screen/plan.json --port 3116
```

Two additional checkboxes isolate arena fitting and scene compositing. Default
preview F34 shows the screen-flash peak; F50 shows the early main eruption. The
baseline source files, gameplay hit schedule and runtime skills are unchanged.

Three real GPU checks share the same snapshot/compositor helpers as the preview.
They check background identity, additive blending and normal alpha blending
against known pixel results, with a two-byte rounding tolerance. Their actual
pixels and pass results are saved in `browser-result.json`. Seven Node tests
also pass, including screen-cover bounds/centering and displacement policies.
These checks establish our chosen renderer behavior, not Bishamon equivalence.
Play also completed from F0 to F210 with scene composition and screen fitting
enabled; no browser warning/error logs were reported during that check.

The new candidate was inspected at F34 and F50 with the scene-composition switch
on and off. Light is visibly stronger, but a rectangular bright edge remains
in the eruption. Native quad shape/facing, layer alpha, placement/scale inheritance
and original material equations still need work. Investigation also found dormant
scale curves in nodes whose active mode is NewtonDynamics; they must not be
activated merely because their values look useful. The vendor's
[scale documentation](https://www.matchlock.co.jp/en/manual/bishamonツールオンラインマニュアル/bishamon詳細/ビュー/インスペクタ/拡縮/)
distinguishes active scale modes. The vendor's
[deformation documentation](https://www.matchlock.co.jp/manual/bishamonツールオンラインマニュアル/bishamon詳細/ビュー/インスペクタ/変形/)
also excludes particle/model nodes from quad deformation; their dormant authoring
corner values cannot justify doubling every sprite primitive. No global size
multiplier or dormant-curve override was added to imitate the video.

The [rectangle investigation](climhazzard-rectangle-investigation.md) subsequently
isolates the large wash to an untextured particle rendered with an unverified
white-plane assumption. It also adds source constant quad corner colors. Its
explicitly incomplete comparison plan runs on port 3117; this is not a completed
native reconstruction of that particle.
