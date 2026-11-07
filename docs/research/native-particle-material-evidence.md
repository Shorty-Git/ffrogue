# Native particle and material evidence

Follow-up: [native slot-table recovery and initial selection](native-material-selection.md)
supersedes the earlier regex-only shader inventory and establishes the initial
Quad/Particle descriptor path. It also records the gated Distortion alpha
correction. This document retains the earlier static investigation evidence.

Evidence date: 2026-10-24. Static, read-only inspection of the pinned installed
Memorial APK. No emulator changes, rendering correction or fidelity approval.
This follows the [white Particle attribution](brave-slash-white-flash.md).

## A more useful native boundary

The earlier wrapper-name inventory did not cover the internal `ml::bm` symbols.
The pinned ARM64 library actually retains 2,499 defined `ml::bm` / `ml::bmfw`
dynamic symbols, including module assignment, version-dependent vertex selectors,
geometry, UV, color and alpha functions. These are not the unrelated Cocos2d
PUBillboardChain functions. Names alone do not prove that a particular node uses
a particular path, but they provide named boundaries for a targeted trace.

Both bundled Bishamon shader packages also contain complete, readable GLSL
source strings. The extractor records their exact package byte offsets, lengths
and SHA-256 hashes. It does not guess shader permutation IDs from string order.

| Package | Vertex sources | Fragment sources | SHA-256 |
| --- | ---: | ---: | --- |
| bmshaderpack.bin | 126 | 36 | `2f36d1839cad4ede93764b4237a05d4cbe4085392a9a2b6f93c5833e14d7dd0b` |
| bmshaderpack_gl2.bin | 126 | 72 | `90cdbdee63950026ba9031f9a04fed98dbefbb199610a32a438003b119ee2f6c` |

Counts include repeated source strings across entries; they are not counts of
unique algorithms. A fragment source in the first package, for example, clamps
interpolated color times `colorScale`. This proves that equation exists in the
package, not that node 34 selects it. The CPU still generates positions/colors;
shader recovery alone does not solve Particle facing, model emission, simulation
or a reusable native export endpoint.

## Alpha equations: verified instructions, incomplete source mapping

Library SHA-256:
`6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`.
APK SHA-256:
`9d21fc8b61c9900eaacb1c2ddef2cabcad1e97d2dc720be16ac09b06fc0086b4`.

`ml::bm::module::alpha_blend::make_vertex::Mod` at `0x1fc24c4`
reads context floats at `0x164` and `0x17c`, multiplies them and writes `0x164`.
`Lerp` at `0x1fc24ac` reads `0x164`, `0x17c` and `0x180`, and writes the fused
multiply-add result. Thus, for these context coefficients:

```text
Mod:  alpha = alpha * coefficient17c
Lerp: alpha = fma(coefficient17c, alpha, coefficient180)
```

The tool asserts the exact complete instruction sequences for both functions.
This is static disassembly evidence, not execution or a recovered full inheritance
equation. In particular, do not substitute source `ParentAlphaRate` directly for
either coefficient without tracing how the context is populated.

`ParticleSetupper::AssignModule` at `0x2003b10` reads the float at Particle-param
`0x19c`, compares its absolute value with a threshold and leaves module index 0
for the below-threshold case. Otherwise it selects an index using the enum at
`0x204`. The corpus's authored Particle rates are all zero; they cannot establish
nonzero rate semantics or distinguish compatibility behavior. Applying these
Particle offsets to other node layouts is invalid: a trial across all node types
failed 14 of 94 rate comparisons, and model enum reads were float bit patterns.
No such cross-type field interpretation was added to the decoder.

`VertexMaker<ParticleEmitterNode<ParticleTraits>>::SelectFunction` at `0x2022a7c`
selects different internal code addresses using a caller flag, presence of the
parameter object and a byte at parameter `0xda`. This proves selection exists;
it does not identify that byte as a specific authoring compatibility flag.
`ParticleSetupper::GetSetupVertexBufferFunction` at `0x2004cd8` has additional
context/parameter-dependent branches. A single universal billboard equation is
therefore not justified from the Particle label alone.

## Reproduction and checks executed

```powershell
& $env:FFROGUE_PYTHON tools/memorial/audit_particle_rules.py --apk tools/data/memorial-audit/installed-base-v208.apk --output tools/data/particle-native-audit/reproducible
```

The script uses the existing ignored Capstone installation at
`tools/data/memorial-audit/python-deps`; `--dependencies` can select another
installed dependency directory. It verifies both pinned APK/library hashes,
inventories relevant symbols, invokes the existing bounded disassembler for six
named functions, and writes extracted GLSL and a receipt only under `tools/data`.
Raw shader sources and generated native receipts remain ignored.

The command ran twice with byte-identical receipt output. All 360 extracted source
files were checked against their recorded lengths and hashes. An incorrect APK
was rejected. The two alpha instruction assertions and git whitespace check
passed. No GLSL compilation, native function execution, live module capture,
browser comparison or game build was performed in this milestone. The current
preview and its known white rectangle remain unchanged.

## Next bounded measurement

Use the named native boundaries to identify the actually selected Particle
vertex function and shader/material for the already attributed white layer.
Record source-node identity as well as the selected pointer: a function observed
somewhere in a battle is not evidence for node 34. Trace the context coefficient
population before generalizing alpha inheritance. Preserve the layer and its
source scale while these rules are unknown.

This makes native shader reuse a concrete option for shared materials, with
source identity and recoverable code. It does not yet establish automated native
playback, transparent export, correct blend state, or a completed import path.
