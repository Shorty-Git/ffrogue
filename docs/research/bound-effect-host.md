# Skill binding to the measured effect host

## Boundary implemented on 2026-10-25

The separate `/bound-host.html` research view connects imported skill members to
the [host compositor](effect-host-compositor.md). The ordinary skill view keeps
its existing path. No public assets, game code or reviewed runtime support changed.
No ADB/BlueStacks operation or new recording was needed.

`effectHostMemberAnchor(context, member, bindings)` in
`tools/original_effect_player.mjs` requires explicit schema1 bindings:

- `memberScaleAxes: "xy"` declares member percentages on X/Y only. Z retains
  the measured global geometry scale. This policy is explicit, not a default
  applied to other callers.
- `rectangles` maps each source placement rectangle name to a declared scene
  rectangle. Missing entries fail before the preview starts.
- `scatter` supplies the displacement for randomized source placement axes.
  Zero scatter is a declared adaptation, not recovered original RNG.

The helper reuses source placement and engine-height Y conversion, without
centered-preview offsets or geometry scaling of placement offsets. The player
accepts the returned three-axis root scale. Its NativeX consumer now reads the
actual root X scale; the first browser run exposed an obsolete local `scale`
reference, which was corrected before verification.

For the local comparison, the declared screen rectangle is `[0,0,640,666]` and
target-unit rectangle is `[1,240,282,261]`, taken from the captured scene. These
are caller inputs, not skill-ID branches or universal FFBE scene dimensions.
The strobe anchor at zero scatter is `[320,617,0]`; applying the separately
measured scatter `[-4,-7]` instead reproduces the captured `[316,624,0]`.
Climhazzard's five members bind with global scale1.774999976: the two50% members
use XY0.887499988, the200% member XY3.549999952, and100% members XY1.774999976.
All retain Z1.774999976.

## Reproduce

Host source identity, calibration and export requirements remain those in
[effect-host-context.md](effect-host-context.md) and the revision23 capture.
Local bindings are retained in ignored
`tools/data/memorial-audit/pipeline-v23-20261025/declared-host-bindings.json`:

```json
{
  "schemaVersion": 1,
  "memberScaleAxes": "xy",
  "rectangles": {
    "screen": {"x": 0, "y": 0, "width": 640, "height": 666},
    "target-unit": {"x": 1, "y": 240, "width": 282, "height": 261}
  },
  "scatter": [0, 0],
  "policy": "Captured scene rectangles with explicitly adapted zero scatter; no original actor or HUD reconstruction."
}
```

```powershell
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/climhazzard/plan-native-x.json --port 3141 --host-view game --host-reference tools/data/memorial-audit/pipeline-v23-20261025/effect-host-context.json --host-bindings tools/data/memorial-audit/pipeline-v23-20261025/declared-host-bindings.json
node --test tools/test_effect_host_context.mjs tools/test_preview_host_view.mjs tools/test_original_effect_player.mjs
```

The server validates every member binding before serving. Both reference and
bindings are explicit tools/data inputs. `/bound-host-review-result` stores a
separate ignored `bound-host-result.json`, with `approved:false`, five anchors,
inputs, host evidence and outstanding issues. It does not overwrite ordinary
skill or compositor receipts. Server3141 was started in exec session25058.

## Verification and limits

- All30 targeted Node tests pass, no skips, after the root-scale fix. They cover
  missing bindings/scatter/policy rejection, XY scale, coordinate separation and
  both preview inline modules parsing.
- Actual browser F12 and F35 views report five GPU compositor checks passing,
  including the measured1080x1920 viewport/scissor. F35 visibly renders the later
  purple geyser phase. Screenshots are ignored `bound-host-f12.png` (untextured
  comparison enabled) and `bound-host-f35.png` (default comparison disabled)
  under `tools/data/shared-skill-review/climhazzard/`.
- The ordinary Climhazzard page on3141 remains ready with49 existing GPU checks
  passing and83 declared source/rendering limitations.
- No full game build was run for this tools-only milestone.

The bound view has a neutral host background and does not reconstruct original
actors or foreground HUD. It uses the direct skill frame, not an actor movement
offset. Untextured primitives remain disabled by default; their labeled
comparison checkbox is independent of host binding. Experimental source
simulation, material/alpha questions, native RNG and birth/update scheduling
remain unresolved. Passing host fixtures does not prove original skill pixels
or arbitrary-skill coverage. Next work should target those shared renderer
semantics, with source-linked evidence rather than per-skill visual adjustments.
