# Current geometry under the captured native viewport

Status: 2026-10-24. Offline diagnostic only, `approved: false`. Uses the existing
revision-14 camera/root/CPU-vertex receipts with the current
[Particle](particle-geometry-subset.md) and [Null locator](null-locator-subset.md)
experiments. No new Android capture, emulator update, game layout or publication.

## What changed

`prepare_native_projection.py` now accepts an explicit `--effect` and a matching
`--geometry-audit`. This permits a measured-geometry comparison without video
frames; earlier reference-frame commands retain their legacy default effect.
The selected member's diagnostic clock starts at zero while its original member
record and plan remain preserved. The input plan is not modified.

Preparation checks native build, plan hash, geometry-audit player hash, camera,
root, member scale and selected source/node. Ambiguous source members, stale
geometry receipts, malformed/unsupported projections, nonzero root Z and a
nonidentity view under the current geometry subsets fail explicitly. Reference
frames and geometry receipts remain different evidence types. All inputs and
outputs stay in ignored `tools/data` through the CLI path checks.

The shared native comparison page now supports:

- The **full 1080x1920 viewport**, with an explicit optional top-1200 crop.
- Independent Particle-geometry and Null-locator A/B switches.
- Isolation of the measured source node through the shared player's diagnostic
  filter. Other meshes are hidden only for inspection; parent evaluation remains
  active. This is not a missing-effect substitute or a publication setting.
- A pinned table of measured CPU geometry and analytical projected bounds,
  rather than an unsynchronized video labeled as the same frame.

The old page's transparent WebGL output could conceal additive color because
the destination alpha remained transparent outside other primitives. The page
now uses an explicitly **opaque neutral inspection background**. This fixes the
diagnostic display, not the native blend equation, and is not a transparent
effect export. The regular arena preview and published Phaser effects are not
changed by that diagnostic background.

## Actual result

The matching revision-14 camera has identity view, logical extent approximately
640x1136 and viewport 1080x1920. Its root is `[188,636,0]`, not the later capture's
`[194,643,0]`. Both current source-driven geometry experiments remain enabled.
The native white Particle's bounds project to:

```text
X: -761.06 .. 1395.56 pixels   (viewport width 1080)
Y: -489.93 .. 1430.07 pixels  (viewport height 1920)
```

The browser's isolated current source plane covers both sides and the top;
the old internal side edge is absent under this viewport. **Its lower edge is
still inside the full viewport.** The earlier top-1200 display crop could hide
that lower edge; it must not be used to claim complete native reconstruction.

The screenshot at reconstruction age F5 has a 250-CSS-pixel-wide native canvas
starting at screenshot Y257. Analytical lower edge:
`257 + 1430.07043166 * 250 / 1080 = 588.0348`. The last changed screenshot row
is 588 (exclusive difference bounds end at 589), within one CSS pixel.
This validates the geometry/projection connection at the inspected frame,
not native alpha, shader processing, scissor state or synchronized animation.

A/B inspection also shows the expected internal bounds when Particle geometry
is disabled and the shifted lower edge when the Null locator is disabled.
At reconstruction F16 the isolated plane has expired and the inspected canvas
crop is identical to the neutral background. Source lifetime is used; native
sample age remains unknown.

## Reproduce

Prepare the three source candidates using the Null locator review first. Set
`FFROGUE_PYTHON` to a working Python executable. A player change requires
regenerating the geometry receipt before the comparison can be prepared.

```powershell
node tools/audit_particle_locator.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-null-locator.json --trace tools/data/particle-native-audit/locator-trace-summary.json --particles tools/data/particle-native-audit/combined-node34-summary.json --effect atk_impact_001_pink.bmb --node 34 --effect-frame 5 --output tools/data/null-locator/native-audit.json
& $env:FFROGUE_PYTHON tools/prepare_native_projection.py --plan tools/data/shared-skill-review/brave-slash-composed/plan-null-locator.json --audit tools/data/particle-native-audit/locator-camera-audit.json --effect atk_impact_001_pink.bmb --geometry-audit tools/data/null-locator/native-audit.json --output tools/data/null-locator/native-viewport/plan.json
node tools/preview_original_skill.mjs --plan tools/data/null-locator/native-viewport/plan.json --port 3131
& $env:FFROGUE_PYTHON -m unittest discover -s tools -p test_native_projection.py
& $env:FFROGUE_PYTHON -m unittest discover -s tools/memorial -p test_camera_projection.py
```

Open `http://127.0.0.1:3131/native-projection.html`. The initial reconstruction
age is the geometry receipt's diagnostic F5. Native CPU measurements stay pinned
while sliders/switches affect only reconstruction. Source/native hashes are
retained in the preceding audits; comparison input hashes and unapproved browser
readiness are preserved in the generated plan and browser receipt.

## Checks actually executed

- Actual native geometry audit, comparison preparation and browser rendering
  completed. Ready receipt remains `approved: false`, `timingAligned: false`.
- Four new preparation tests and four existing Python camera tests passed.
  They reject stale/cross-build/ambiguous data, scale mismatches, unsupported
  camera/root values and preserve input flags/source clock.
- All 56 relevant Node regressions passed, including current source geometry,
  locator/frame controls and observer regressions. No tests skipped locally.
- Real browser inspection at isolated F5, Particle-off, locator-off, full effect
  and expired isolated F16. Saved screenshots are 1021x1122. The measured canvas
  crop `(752,258,1000,700)` was compared with its F16 neutral reference using
  Pillow; `pixel-review.json` retains the observed differences and lower-edge
  calculation. Background color comes from that reference, not an assumed RGB.
- Fresh three-skill source/coverage receipts were regenerated after the shared
  player's diagnostic-filter change. No game build or native-pixel fidelity
  approval was performed. Native blend/performance was not newly measured.

Geometry and viewport now explain this rectangle's inspected bounds without
per-skill shrinking or hiding. Remaining shared material/alpha, model-facing,
ordering and unsupported-source questions are separate work. Do not use further
camera adjustments to conceal those gaps or promote this page as a native exporter.
