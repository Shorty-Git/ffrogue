# Original renderer feature audit

This milestone checks what the current research player omits from Brave Slash,
Blade Beam and Climhazzard. It changes neither the player nor published game assets.
The audit covers seven original effect binaries. Six have matching BMSLN projects
that pass the existing known-category comparison; the Power Geyser has no matching
authoring project. A passing comparison is not a completeness check.

The first [inheritance implementation review](original-inheritance-review.md)
now covers the measured rate-zero alpha and birth-time translation cases. The
audit below describes the preceding player revision; its hashed receipts remain
historical evidence rather than a report of the updated player's capabilities.

Follow-up audits found additional independent gaps: [source appearance mode
selection](original-appearance-review.md), [Particle billboarding](original-particle-geometry-audit.md)
and [skill composition](original-composition-audit.md). The appearance review
implements the bounded Constant/Curve correction; the other two remain evidence
and unresolved implementation work.

## Confirmed omissions

| Feature | Local evidence | Current player | Assessment |
| --- | --- | --- | --- |
| Model vertex colors | Five original M3R models contain nonwhite color/alpha bytes | Bytes survive preparation, but geometry submits only position, normal and UV | Confirmed omitted input; native shader combination remains unverified |
| Parent alpha controls | Source contains rates, Multiply/Lerp modes and compatibility flags | Always multiplies parent alpha | Numerically consequential for Brave Slash node 12 in the current evaluator |
| Translation inheritance at birth | Climhazzard slash node 10 specifies `OnGenerateTime` | Always uses the live parent matrix | Parent moves substantially during the child's life |
| Rotation inheritance | Brave Slash control nodes 4, 14, 27 specify `Off` | Always uses the complete parent matrix | Missing behavior; visible impact not established by this audit |
| Model billboard | Brave Slash node 12 and Blade Beam wave node 12 specify `Billboard` | Models use ordinary transform matrices | Missing camera-facing behavior; no native image comparison yet |
| Surface emission | Blade Beam wave particle 10 specifies Model emission | Explicitly withholds this node | Known missing component, not a new discovery |
| Sort priority | Six nodes have priorities other than 0.5 | Source priorities are not assigned; Three.js sorting applies | Missing source control; pixel impact not measured |

Node numbers are zero-based indices in each effect's verified preorder hierarchy.
The source settings above are BMSLN evidence. They have not newly been decoded
from BMB or included in the binary/source comparison. M3R color bytes, by contrast,
were reread from original staged resources and checked against the prepared meshes.

## Measured consequences

The probe uses the existing deterministic instance generator, interpolation and
transform evaluator, sampling effect frames 0 through 180 with the plan's seed.
These are evaluator measurements, not measurements of native FFBE pixels.

**Brave Slash: unintended extra dimming.** In `atk_impact_001_pink.bmb`, model
node 12, instance 95, effect frame 20, the local alpha is `0.9259259673`.
The current parent multiplication reduces it to `0.3521788365`. Its authoring
settings say `ParentAlphaRate=0`, `AlphaParentNodeInfluenceType=Lerp` and
`Version1_6=true`. The manufacturer's basic-settings documentation says that zero
parent influence preserves the local alpha in both the described old and newer
rules. This is a concrete contradiction to unconditional multiplication.
It does not justify replacing every nonzero-rate mode with one new formula.

**Climhazzard: a child remains attached to a moving origin.** In
`atk_slash7_side_purple.bmb`, Quad node 10, instance 14, is born at effect frame 2.
Its parent's position changes from approximately `(174.557, -3.671, 0)` at birth
to `(-221.089, -3.671, 0)` at effect frame 31. That is `395.646` effect-coordinate
units, before member scale/rotation and arena placement. The source specifies
translation inheritance only at generation time. The current player still applies
the live parent translation. This is not a request to add a corrective offset.

**The original models contain gradients we discard.**

| Skill | Model | Nonwhite vertices / total | Alpha-byte range | Nodes using it |
| --- | --- | --- | --- | --- |
| Brave Slash | `model_aura_024` | 204 / 300 | 0–255 | 15, 16 |
| Brave Slash | `model_fire_001` | 200 / 215 | 0–255 | 18, 20, 22 |
| Brave Slash | `model_aura_025` | 200 / 225 | 0–255 | 28 |
| Climhazzard Power Geyser | `model_fire_002` | 212 / 230 | 0–255 | 11 |
| Climhazzard Power Geyser | `model_aura_041` | 297 / 297 | 0–230 | 22 |

All eight listed nodes have positive-alpha live samples in the current evaluator.
They are not merely unused model files. Their color bytes are grayscale in these
cases; shader multiplication, alpha application and material-record behavior still
need an isolated visual check. Vertex colors could affect the apparent outline
and glow, but this audit does not establish the final native appearance.

Negative controls matter: Blade Beam's two models have only opaque-white vertices.
Vertex-color handling alone therefore cannot explain its remaining differences.
The rate-zero alpha probe found no numerical difference in the other six effects.
Blade Beam's `OnGenerateTime` particle is already withheld for unsupported surface
emission; it is not counted as a visible movement error by the probe.

## Manufacturer documentation

- [Model overview](https://www.matchlock.co.jp/manual/bishamonツールオンラインマニュアル/overview/summary/) explicitly supports model vertex colors.
- [Basic settings](https://www.matchlock.co.jp/manual/bishamonツールオンラインマニュアル/bishamon詳細/ビュー/インスペクタ/基本設定/) distinguishes continuous/birth-time parent influence and alpha rates.
- [Alpha compatibility FAQ](https://www.matchlock.co.jp/manual/bishamonツールオンラインマニュアル/よくある質問と回答/親ノードからのアルファ値の影響方法について/) documents changed alpha behavior and legacy emulation.
- [Primitive detail settings](https://www.matchlock.co.jp/manual/bishamonツールオンラインマニュアル/bishamon詳細/ビュー/インスペクタ/詳細/) distinguishes Standard and camera-facing Billboard models.

These describe Bishamon behavior, not the exact FFBE integration. In particular,
the manual describes multiple historical alpha rules. Root and per-node legacy
flags must be preserved and resolved before choosing nonzero-rate equations.
The source files contain both root and node compatibility settings; reading only
the last XML occurrence would give a misleading result.

## Next bounded implementation

1. Resolve parent-influence controls in the common evaluator. Start with the
   evidenced rate-zero and birth-time cases; preserve unsupported modes explicitly.
   Birth snapshots must evaluate the parent at the child's actual generation time,
   including fractional births, so seeking and continuous playback agree.
2. Check original M3R vertex colors in an isolated A/B experiment for Brave Slash
   and Climhazzard, using Blade Beam as an unchanged control. Resolve shader
   combination before publishing a default; do not compensate with brightness knobs.
3. Address model billboard and Blade Beam's surface emitter as separate shared
   capabilities, with source priorities retained for a later compositing check.

This order targets shared causes, not per-skill retouching or complete emulation of
every Bishamon feature. Chaining, damage formulas and roguelike balance are outside
this milestone. Untextured Power Geyser geometry, some distortion semantics and
raw member-placement fields remain open; no claim of complete reconstruction follows.

## Reproduce and verification

With the existing staged three-skill plans and Python environment:

```powershell
python tools/audit_original_skill_features.py --plan tools/data/shared-skill-review/brave-slash/plan.json --plan tools/data/shared-skill-review/blade-beam/plan.json --plan tools/data/shared-skill-review/climhazzard/plan.json --output tools/data/shared-skill-review/feature-audit.json
node tools/probe_original_skill_features.mjs tools/data/shared-skill-review/feature-audit.json tools/data/shared-skill-review/feature-probe.json
```

Both commands were executed against the local originals. The audit checks original
binary/resource hashes, model payload equality and all six known-category source
comparisons. The probe checks the audit's player and plan hashes. Both output files
are ignored research receipts. Repeating both commands produced identical bytes.
No renderer change, browser A/B, original-video comparison or game build was
performed for this audit; those are not implied by the successful source checks.
