# Native scalar Particle alpha evaluator

## Result (2026-10-25)

The shared research renderer now exports `nativeScalarAlpha(keys, time)` as a
separate pure helper. It matches576 outputs of the original scalar Particle
alpha UpdateCurve routine across64 controlled cases. Maximum numeric residual
is4.768376715702516e-8; this is tolerance-based agreement, not bit-exact ARM64
floating-point reproduction.

The ordinary `scalar` function, vector evaluation and active preview paths remain
unchanged. No plan automatically enables the helper. This milestone establishes
a verified scalar-alpha equation for a subsequent explicitly gated preview
comparison; it does not publish a skill or claim general curve support.

## Original reference and confirmed rules

The reference executes the original selected init/update chain with explicit
scalar key relocation described in [the chain report](native-particle-chains.md).
The relevant original function is:

```text
_ZN2ml2bm6module5alpha6update5CurveERNS1_13UpdateContextERKNS0_5CurveILi1EEE
entry0x1fcd3b4, symbol bytes568
```

APK/native hashes remain pinned to the preceding reports. The exported control
receipt includes the function hash, native hash, baseline source hash and node
identity. The complete chain is used as an execution harness; synthetic curve
keys replace its alpha payload. These are controlled scalar inputs, not sampled
frames of that source skill.

Confirmed within the tested scalar-alpha branch:

- The earlier key selects the interval mode. Constant0, Linear1, Spline2 and
  BreakSpline3 behave consistently across all16 earlier/later type combinations.
- Constant holds the earlier value, switching to the later value within the
  original normalized endpoint epsilon. The float32 literal at0x1fcd5ec is
  9.999999974752427e-7. Linear uses the normalized fraction.
- Spline and BreakSpline use cubic Hermite basis functions, the earlier key's
  first stored tangent (+4) and later key's second stored tangent (+8), without
  multiplying tangents by the interval length.
- Before/after the key range, the endpoint values are used. The alpha module
  clamps all output to0..1, including endpoint and Spline overshoot cases.
  This clamp belongs to scalar alpha, not arbitrary vector/motion curves.

Static disassembly of the original function independently shows its type
dispatch, unscaled tangent loads and final clamp. The4-entry dispatch table at
0x260a634 selects Constant0x1fcd520, Linear0x1fcd4c8 and the shared Spline2/3
branch0x1fcd550. The prior JS evaluator uses interval-scaled tangents and opposite
stored tangent fields, so it remains a distinct experimental policy.

The new helper validates finite float32-representable values and known types.
It rejects empty keys, unordered times and adjacent float32 times closer than
the epsilon. Native degenerate-key behavior is not silently approximated.
Normalized time/key values use float32 conversion for boundary decisions;
polynomial evaluation uses JavaScript numbers. NaN and unsupported types fail.

## Actual controls and checks

`tools/memorial/export_scalar_alpha_controls.py` exports the original outputs
through the existing offline chain harness. It combines:

- All16 earlier/later type pairs.
- Key intervals0..0.5 and0..1.
- Two asymmetric tangent/value sets, including values outside0..1.
- Nine ages each: before/at first key, interval samples, two near-end samples,
  exact end and after range.

The resulting64 cases contain576 samples. The Node differential test consumes
that receipt and compares every original output with the actual shared JS
helper, rather than a Python copy of the proposed equation. Separate tests
check invalid inputs and that the old scalar/vector policy remains independent.

```powershell
$env:PYTHONPATH=(Resolve-Path tools/data/native-locator-emulation/python-deps).Path
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/memorial/export_scalar_alpha_controls.py --apk tools/data/memorial-audit/installed-base-v208.apk --source tools/data/shared-skill-review/climhazzard/originals/eff_strobe_white_a50_f30.bmb --node 3 --output tools/data/native-locator-emulation/scalar-alpha-controls.json
node --test tools/test_native_scalar_alpha.mjs tools/test_original_effect_player.mjs tools/test_effect_host_context.mjs tools/test_preview_host_view.mjs
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -m unittest discover -s tools/memorial -p 'test_particle_*reference.py' -q
```

Executed:33 targeted Node tests and54 Python reference tests pass, no skips.
The differential test reports the576-sample residual above. The chain harness
now accepts explicitly supplied bounded finite ages; default samples remain
unchanged. Receipt `scalar-alpha-controls.json` and static
`scalar-alpha-update-static.json` remain under ignored
`tools/data/native-locator-emulation/`, approved:false. Whitespace check passes.

No browser/game build/emulator operation or new recording was performed. The
native work-budget reservation from the preceding report was not investigated
in this scalar-only block and remains unresolved.

## Next gate

Bind this helper only to source-verified Particle scalar alpha curves under an
explicit plan/capability switch and review numerical/visible A/B. Do not replace
vector, UV, translation, model/quad alpha or parent-alpha rules from this result.
The native scheduling, unconsumed work budget, resource-dependent chains and
parent/child contexts remain independent gates.
