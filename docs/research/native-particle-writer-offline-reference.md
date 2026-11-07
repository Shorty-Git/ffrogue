# Offline Particle buffer-writer reference

Follow-up: [constant module dataflow](native-particle-module-dataflow.md) now
separates record scale from the group vector and verifies local roll production
in controlled Const paths. The reconstructed factor roles in the earlier
node34 agreement below were not established by output agreement alone.

2026-10-25. This block uses existing local files and an existing revision-14
capture. No emulator interaction, new recording, game change or publication.

## Result and scope

The observed single-texture Particle writer can now execute offline on
controlled inputs. Its original ARM64 instructions agree with a recovered
draw-basis geometry equation in 48 fixtures. They reproduce the existing node34
six-position output with maximum residual 0 under the explicitly reconstructed
inputs below. This is a reusable differential reference for geometry work,
not a complete Particle simulation or arbitrary-skill renderer.

The existing preview and its Particle eligibility gates are unchanged. Negative
and zero scales are diagnostic fixtures here; they do not expand runtime support.

## Pinned identity and boundaries

- APK: `tools/data/memorial-audit/installed-base-v208.apk`, SHA-256
  `9d21fc8b61c9900eaacb1c2ddef2cabcad1e97d2dc720be16ac09b06fc0086b4`.
- ARM64 `libgame.so`: SHA-256
  `6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`.
- Observed writer entry `0x20016bc`; retained range ends at `0x2001a40`,
  the next selector-returned entry. This is not a recovered symbol size.
  Range SHA-256:
  `0db11d5239975567796c65731013070d19cc32cc19082145ed71f4dee3c38601`.
- Entry/stride are independently present in the existing node34 capture:
  six vertices, 40-byte stride. Only position outputs are compared here.
- Unicorn 2.1.4 executes the bounded range. Execution outside it is rejected,
  except the two explicit `sinf`/`cosf` stubs. Those use Python math rounded to
  float32; original libc is not executed. The six-vertex output has a checked
  trailing guard, finite-position validation and an instruction limit.

`ParticleSetupper::GetSetupVertexBufferFunction` at `0x2004cd8` selects this
writer when texture1 is nonempty, operation `Particle+0x6a0` is zero, and
`drawData+0x80` is nonzero. Other branches select `0x20011d4`, `0x2001270`,
`0x200133c`, `0x2001438` or `0x2001a40`; none is validated by this experiment.
`InitDrawData` initializes the flag to 1 in this path and stride to `0x28`.
The source selectors are preserved in the ignored static disassembly receipt;
texture availability alone is not a reason to invoke this writer for every node.

## Recovered equation

The writer reads a **computed** center at context `+0x98`, roll in radians at
`+0xb8`, scales at `+0xbc/+0xc0` and half extents at `+0xc8/+0xcc`.
The draw basis is reached through `context+0x30`, then pointer `+0x20`.
Its first two 4x4 columns provide vectors U and V; its translation column is
not added to the center again.

For roll r, h = halfExtentX * scaleX and v = halfExtentY * scaleY:

```text
right = h * (cos(r) * U + sin(r) * V)
up    = v * (-sin(r) * U + cos(r) * V)
vertices = center + [ -right+up, -right-up, right-up,
                       right+up, -right+up, right-up ]
```

The native near-zero branch uses U*h and V*v directly for absolute roll below
the float32 literal at `0x2001a38` (approximately 1e-6). It skips both math calls.
Do not derive r from a decomposed world Euler Z without tracing its producer.

The 48 differential cases combine four rolls (0, 37, 90, -45 degrees), four
scale pairs (uniform, nonuniform, mirrored, zero X), and three supplied bases
(identity, Y-rotated, Z-rotated with nonzero translation column).
Maximum permitted position residual against the independent equation is 0.0003
for these float32 fixtures. Additional checks cover topology, center preservation,
ignored basis translation, the near-zero branch and invalid inputs.

## Existing output agreement

Receipt: `tools/data/particle-native-audit/combined-node34-summary.json`, SHA-256
`cb5a1c9bf2af8f93368f73a71bd53492f8021aa21b07b71091edbf80bce75cb9`.
Native identity is checked before comparison. Its recorded node34 writer output
matches exactly using center `[188,857.875,0]`, zero roll, scales `[1.775,1.775]`,
half extents `[360,320]` and the recorded identity draw basis.

These are reconstructed context inputs, not a complete recorded context-memory
replay. Agreement does not establish their provenance for other particles,
randomized transforms, camera states or animation times. Nongeometry attributes
are neutral fixtures in the emulator and are not validated against live output.

## Reproduction and actual checks

Optional dependencies remain in ignored `tools/data`. The game and normal
preparation do not depend on Unicorn.

```powershell
$env:PYTHONPATH=(Resolve-Path tools/data/native-locator-emulation/python-deps).Path
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/memorial/emulate_particle_writer.py --apk tools/data/memorial-audit/installed-base-v208.apk --output tools/data/native-locator-emulation/particle-writer-fixtures.json --existing-capture tools/data/particle-native-audit/combined-node34-summary.json
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -m unittest discover -s tools/memorial -p test_particle_writer_reference.py -v
```

Executed: 48 instruction fixtures, existing output comparison, six differential
test methods with zero skips. No browser or game build was run for this
research-only addition. Earlier suite totals describe earlier milestones.

To regenerate selector disassembly, use `inspect_native_calls.py` with the
pinned APK and function
`_ZN2ml2bm16ParticleSetupper28GetSetupVertexBufferFunctionERNS0_11InitContextERKNS0_3bmb5param8ParticleERNS0_27ParticleEmitterNodeDrawDataE`;
output must remain under `tools/data`. Capstone dependencies live separately in
`tools/data/memorial-audit/python-deps`. The observed caller can be inspected
with explicit `--range 0x2021718:0x400`; that range is not a function boundary.

## Next gate

The missing bridge is the producer of computed roll, scale and half extents in
`MakeVertexContext`. The observed traversal at `0x2021718` initializes these
fields, invokes per-node modules, then invokes the writer. Modules and inheritance
must be traced before mapping source authoring to writer inputs generally.
Existing node34 evidence identifies six callbacks, but does not record all
intermediate geometry inputs. Static module inspection can continue offline.
If that cannot close a specific variant, request a bounded before/after context
sample for that producer, not another general video of the same skill.

See [the earlier capture](native-particle-node34-capture.md),
[the current narrow Particle subset](particle-geometry-subset.md), and
[the preceding Null reference](native-zscreen-offline-reference.md).
