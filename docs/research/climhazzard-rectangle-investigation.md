# Climhazzard rectangular light investigation

## Result and limits

The large rectangular wash at preview F50 is traced to original power-geyser
particle node 15. Both texture bindings are absent. The experimental player
rendered this as a uniformly colored unit plane without evidence that this is
the native primitive. Hiding only node 15 removes the large rectangular wash.
This establishes its contribution to our renderer's image, not native behavior.

The revised opt-in plan withholds untextured particles explicitly. The warning,
issue list and legacy checkbox expose the omission. The source node, transforms,
alpha curve and missing resource bindings remain in the plan. No circular mask,
borrowed texture, arbitrary crop or replacement effect was added. This is still
an incomplete reconstruction, not a faithful replacement or approved bake.

A separate missing feature was confirmed: distortion quad 9 has black upper
corner RGB and white lower corner RGB, with alpha 1 at all corners and flat color
disabled. Quad 7 has white corners. The earlier renderer ignored these fields.
The new plan evaluates their constant RGBA colors. This correction must not be
misreported as the cause of the larger rectangle; node 15 caused that wash.

## Source checks

`bmb_quad_colors.py` reads quad corner RGBA initial values at offsets 104, 136,
168 and 200, with range vectors at +16, flat-color byte 320 and color-mode uint32
1720. Local tests compare eight original binary/authoring pairs, including
independently varying corner values/alpha, both flat settings, Constant and Curve
mode labels. Values are compared exactly as float32; mutation is rejected.

The player supports only Constant, zero-range corner colors in this experiment.
Animated or randomized colors fail preparation. Flat mode copies the first
corner's color; independent mode follows the existing plane's four vertices.
RGBA is interpolated in the actual shader. The material's unused center color
does not tint these quads a second time. No primitive size or geometry was changed.

The supported metadata is restricted to distortion quads when preparing this
experiment. This avoids silently treating unrelated unsupported quad animations
as constant. The shared decoder itself can inspect other quads for comparison.

## Reproduce

```powershell
python tools/prepare_original_preview.py --source tools/data/climhazzard-source/skill-source.json --unit cloud --motion atk --authoring assets/battle_effect/atk_slash7_side_purple.bmsln --authoring assets/battle_effect/atk_blow1_purple.bmsln --distortion --fit-screen --scene-composite --quad-colors --withhold-untextured --output tools/data/climhazzard-quad-colors/plan.json
node tools/preview_original_skill.mjs --plan tools/data/climhazzard-quad-colors/plan.json --port 3117
python -m unittest discover -s tools -p 'test_bmb_quad_colors.py'
node --test tools/test_original_effect_player.mjs
```

Default F50 shows the same early main eruption used for diagnosis. The source
corner-color checkbox toggles their interpolation independently. The untextured
particle checkbox restores the unverified legacy white-plane assumption. The
diagnostic selector can hide one source node at a time, without removing it from
the plan. The default selector adds no diagnostic omission; withholding unsupported
primitives is a separate explicit capability setting.

## Verification and next boundary

The source comparisons and nine Node tests passed. The real WebGL preview passed
eight GPU pixel checks: background identity, additive/normal blending, upper/lower
RGB interpolation, upper/lower alpha interpolation and corner-color bypass. They
share the actual shader/compositor helpers. This checks our implementation,
not equivalence to Bishamon or the entire original animation.

At F50, node isolation, the legacy particle switch and the resulting image were
inspected in-browser. Screenshots are stored beside the ignored plan.
Playback also completed from F0 to F210 with source corner colors enabled and
the unverified particle withheld, without browser warning/error logs. Native
rendering of untextured particles is the next unresolved issue. A missing texture
binding does not justify assuming that the intended source feature was empty,
a white rectangle, or a circular glow. Earlier shader, UV-clock, inheritance and
placement uncertainties also remain. Runtime skills and recipes were not migrated.

## Follow-up: local authoring evidence boundary

A full XML search covered 3,956 authoring projects whose filenames also occur in
the local original-archive member inventory. It inspected 5,796 Particle and
10,250 Quad nodes, including explicit empty tags and whitespace-only texture
names. None had both texture references empty; none of those emitters had
`Basic_Meta_Enable=false`. Filename overlap is only a search filter, not proof
that the authoring project and archived binary are the same revision.

Consequently this collection provides no direct authoring counterpart for
power-geyser Particle node 15's missing texture bindings. The search does not
establish a native white plane, circular primitive, or invisible particle.

Activation was checked separately against original archive files for
`eff_intelligence_up_back`, `_all` and `_blue`. Each binary retains all 12 source
nodes, including a disabled `FieldGoal`. Disabled authoring nodes are therefore
not necessarily removed during compilation. This does not decode an activation
flag for Particle nodes. The strobe project's actual Particle node is enabled
and displayed; some ControlNull nodes have Display=false. Neither editor field
is currently interpreted as a runtime visibility flag.

The reusable, read-only inventory tool also reports other emitter types,
untextured nodes and disabled emitters, with source hashes for reported nodes:

```powershell
python tools/inspect_authoring_primitives.py --members tools/data/bmb-format/pairs.json --output tools/data/bmb-format/authoring-primitives.json
```

The member inventory and result remain ignored local research data. This search
does not change preview geometry, runtime effects, or existing skill recipes.
No new native-rendering correction resulted from this investigation.
The inventory tool completed the full collection scan with the same Particle
and Quad counts. Its broader search also found no untextured or disabled
emitters among 16,172 Model and 2,339 SimpleParticle nodes. Manual fixture checks
passed for empty tags, whitespace-only names, disabled flags, source hashes and
filename filtering. No new browser animation comparison was performed in this
follow-up because rendering was unchanged.

Recommended next milestone: prepare a visibly reviewed game adaptation using
the recovered effect components and a separately declared lighting treatment.
Keep it distinct from a native reconstruction, retain unsupported source nodes
in provenance, and compare it against the reference before publication. This
recommendation does not approve the current preview or authorize bulk migration.
