# Original particle geometry audit

This audit records a camera-facing omission in the shared research player. It
does not implement a geometry fix, approve the three skills, or establish native
FFBE fidelity. Measurements were reproduced on 2026-10-22 using the local
`plan-inheritance.json` plans for Brave Slash, Blade Beam and Climhazzard.

Read alongside [the renderer feature audit](original-renderer-feature-audit.md)
and [the inheritance implementation review](original-inheritance-review.md).
Those documents already identify model billboards and unsupported surface
emission. The additional finding here concerns ordinary, currently visible
Particle nodes.

## Confirmed current behavior

`tools/original_effect_player.mjs` creates non-model geometry with
`PlaneBufferGeometry(1, 1)`. It copies the full evaluated parent/local transform
into each instance group. No camera-facing operation follows that assignment.
Consequently, inherited X/Y rotation tilts a Particle's plane away from the
camera. The policy string describing these planes as camera-facing overstates
what the implementation does: an XY plane initially faces the current camera,
but does not remain camera-facing after arbitrary inherited rotation.

The subsequent [appearance milestone](original-appearance-review.md) corrected
that misleading policy string. The underlying billboard geometry is still
unimplemented; these measured fixtures remain applicable.

The [manufacturer's primitive detail table][primitive-detail] lists Particle as
Billboard by default and describes Billboard as always facing the screen.
Polygon, Facing and Polyline are separate options for other primitive types.
The table also distinguishes Facing toward the camera position from Billboard.
It therefore supports a screen/view-aligned invariant, rather than an arbitrary
three-dimensional plane or an assumed camera-position look-at operation.

The affected source projects pass the existing known-category BMB/BMSLN
comparison. That comparison is not proof of complete decoding, and the full
native billboard equation has not been recovered.

## Reproduced fixtures

All instance/node numbers are zero-based. The probe uses each plan's seed of 1,
its effect horizon of 180, and `createTransformEvaluator(...)(frame, true)`.
Each instance is sampled at its birth frame. The camera's current view direction
is along the Z axis. For matrix columns `x` and `y`, the normalized plane normal
is `normalize(cross(x, y))`; its absolute Z component is the orthographic
projected-area/full-plane-area ratio. This is geometry, not a measurement of
native FFBE pixels, texture coverage, or final brightness.

| Skill / effect | Node | Instance | Effect frame | Life | Evaluated alpha | Area ratio |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Blade Beam / `atk_slash5_blue.bmb` | 8 | 31 | 3 | 15 | 1 | 0.12130313026694284 |
| Climhazzard / `atk_blow1_purple.bmb` | 7 | 16 | 3 | 20 | 1 | 0.12627000483791953 |

Both fixtures are live, textured Particle nodes with supported Point emission.
Neither is a withheld Model-surface emitter. Their local rotations are zero.
Both effect members also have zero rotation. Blade Beam's hit member starts at
frame 5, placing its sample at skill frame 8; Climhazzard's blow member starts at
frame 0, placing its sample at skill frame 3. Uniform member scale does not change
the area ratio.

The resulting unit normals are:

- Blade Beam: `(0.9319769707319961, 0.34162036914190785, -0.12130313026694284)`.
- Climhazzard: `(0.9820973253614531, 0.1397881589982205, 0.12627000483791953)`.

The source of the tilt is an ancestor's randomized XYZ rotation. Blade Beam's
ancestor ControlNull node 6 has rotation value range `(360, 360, 360)`; this
instance samples approximately `(70.450982, -248.745116, 185.828694)` degrees.
Climhazzard's ancestor ControlNull node 5 has the same range and samples
approximately `(312.091359, -280.857920, -299.682357)` degrees. The intermediate
nodes and the particles have zero local rotation in these samples.

At birth, across all instances of the two Particle nodes:

| Effect / node | Count | Minimum ratio | Upper-middle ratio | Maximum ratio |
| --- | ---: | ---: | ---: | ---: |
| `atk_slash5_blue.bmb` / 8 | 9 | 0.1213031303 | 0.2169265512 | 0.9815901041 |
| `atk_blow1_purple.bmb` / 7 | 8 | 0.1262700048 | 0.2169265512 | 0.9815901041 |

The upper-middle statistic is explicitly `sorted[Math.floor(count / 2)]`, not
the average of the middle pair for an even count. Several planes therefore
become almost edge-on under the current evaluator, despite the documented
billboard invariant.

## Reproduction

Run from the repository root in PowerShell. This reads existing prepared plans
and the bundled Three.js library; it creates no files and does not start a server.

```powershell
@'
import fs from 'node:fs';
import vm from 'node:vm';
import { instances, createTransformEvaluator } from './tools/original_effect_player.mjs';
const THREE = {};
vm.runInNewContext(
  fs.readFileSync('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js', 'utf8'),
  { exports: THREE, module: { exports: THREE }, console }
);
for (const [folder, effectName, nodeIndex] of [
  ['blade-beam', 'atk_slash5_blue.bmb', 8],
  ['climhazzard', 'atk_blow1_purple.bmb', 7],
  ['climhazzard', 'atk_blow1_purple.bmb', 3],
  ['climhazzard', 'atk_blow1_purple.bmb', 4],
  ['brave-slash', 'atk_impact_001_pink.bmb', 8],
  ['brave-slash', 'atk_impact_001_pink.bmb', 24],
  ['brave-slash', 'atk_impact_001_pink.bmb', 34],
]) {
  const plan = JSON.parse(fs.readFileSync(
    `tools/data/shared-skill-review/${folder}/plan-inheritance.json`, 'utf8'
  ));
  const effect = plan.effects.find(e => e.name === effectName);
  const built = instances(effect, plan.seed, plan.effectHorizon);
  const evaluate = createTransformEvaluator(THREE, effect, built);
  const rows = built.filter(item => item.node === nodeIndex).map(item => {
    const state = evaluate(item.birth, true)[item.id];
    const m = state.matrix.elements;
    const normal = new THREE.Vector3(m[0], m[1], m[2])
      .cross(new THREE.Vector3(m[4], m[5], m[6])).normalize();
    return {
      instance: item.id, frame: item.birth, alpha: state.alpha,
      areaRatio: Math.abs(normal.z)
    };
  }).sort((a, b) => a.areaRatio - b.areaRatio);
  console.log(JSON.stringify({
    folder, effectName, nodeIndex, count: rows.length, minimum: rows[0],
    upperMiddle: rows[Math.floor(rows.length / 2)].areaRatio,
    maximum: rows.at(-1).areaRatio
  }));
}
'@ | node --input-type=module
```

## Controls and rejected shortcuts

- Climhazzard blow Particle nodes 3 and 4 have identity-facing transforms and
  area ratio 1, with alpha 1 at birth. They provide an unchanged geometry control.
- Brave Slash Particle nodes 8, 24 and 34 have ratio approximately
  `cos(25 degrees) = 0.9063077870`, reflecting ancestor node 1's X rotation.
  This is a smaller tilt than the two randomized cases. Nodes 24 and 34 have
  zero alpha in their birth samples; their ratios here are geometric controls,
  not a claim that those particular birth samples are visibly drawn.
- Blade Beam wave's billboard Model node 12 has identity rotations throughout
  its ancestors. Correcting only this already documented model-billboard omission
  would not alter its present orientation with the current camera.
- Brave Slash's rotation-inheritance `Off` control node 14 currently receives
  cancelling +25/-25-degree ancestor rotations. Its current parent rotation is
  therefore an unchanged control, not evidence of a large visible error.
- Blade Beam wave Particle node 10 is already withheld for unsupported
  Model-surface emission. It is not counted as a currently visible billboard bug.
- Examined Quad sources use deformation mode `Constant` and size `(1, 1, 0)`.
  Their stored explicit vertex corners of +/-1 belong to another deformation
  mode and are dormant. They do not justify doubling every Quad's geometry.

## Next bounded experiment and unresolved semantics

Simulation transforms and rendering orientation need distinct treatment. Parent
rotation can distribute particles in three-dimensional space while each rendered
particle still faces the view. Changing the ancestor's matrix to face the camera
would also change trajectories. The manufacturer's [Null billboard tutorial][null-billboard]
describes that whole-hierarchy behavior separately.

Start with an asymmetric-texture fixture, preserving simulation positions while
rotating a parent about X and Y through 0, 45 and 90 degrees. The display-plane
normal must remain parallel to the view direction, and its projected area must
remain stable. The two real zero-local-rotation fixtures above then provide
deterministic A/B cases without choosing a skill-specific correction angle.

The next fixture must vary local Z rotation, inherited Z rotation, effect-member
rotation, camera roll and nonuniform scale separately. The inspected vendor
documentation establishes camera-facing behavior but does not establish the
complete roll/inheritance equation or its order of operations. Taking the Z
component of a decomposed world Euler rotation would be another hypothesis,
not a recovered native rule. Converted EFKE files are a lossy cross-check and
cannot settle that equation by themselves.

The player currently applies member rotation outside the evaluator on
`entry.root`. Billboarding an instance first and subsequently applying arbitrary
member XYZ rotation could tilt it away from the camera again. A future equation
must account for the final member/world transform and view basis without
altering simulation matrices or child trajectories.

Billboard support remains an explicit missing capability until these semantics
are resolved and checked. This audit supplies no geometry patch and no claim
that billboarding alone explains every remaining mismatch. The manufacturer
also [leaves physical units to the host application][units], so these measurements
do not establish FFBE's effect-to-screen pixel scale.

[primitive-detail]: https://www.matchlock.co.jp/manual/bishamonツールオンラインマニュアル/bishamon詳細/ビュー/インスペクタ/詳細/
[null-billboard]: https://www.matchlock.co.jp/manual/bishamonツールオンラインマニュアル/basicoperation/null_emitter/2-全体ビルボードを設定する/
[units]: https://www.matchlock.co.jp/manual/bishamonツールオンラインマニュアル/よくある質問と回答/bishamonの単位を知りたい/
