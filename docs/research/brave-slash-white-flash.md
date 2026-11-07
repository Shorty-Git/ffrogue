# Brave Slash frame-29 white rectangle diagnosis

## Follow-up: remaining white boundaries, 2026-10-25

The user confirmed that the visible white rectangle affects Brave Slash and
Climhazzard, **not Blade Beam**. The deterministic X-display milestone corrects
one Climhazzard strobe geometry rule; it does not solve these remaining edges.

Fresh exact staged-texture inspection finds one fully opaque white texture in
Brave Slash (pink Particle34), one in Climhazzard (strobe Particle3), and none in
Blade Beam. Receipt: `tools/data/native-x-preview/remaining-white-planes.json`,
including plan/source texture hashes. Blade Beam was also inspected in-browser
at preview F12/F20/F38; no corresponding solid-white rectangle was attributed.
This does not establish complete Blade Beam fidelity.

The native Particle34 buffer has since been reconstructed and agrees with the
recorded six output positions. See [the offline writer](native-particle-writer-offline-reference.md).
The white plane is therefore not an automatic missing-texture substitute.
The [native viewport comparison](native-viewport-current.md) also establishes
that the same large plane extends beyond both sides of the recorded native
viewport while retaining a lower edge inside it. The regular arena preview's
camera and placement are adapted and can expose source-plane boundaries that
lie outside the native image. This is a confirmed projection/setup difference;
it does not prove that projection alone explains every visible edge.

Prioritize the shared projection/viewport/placement and draw clipping boundary
for these two white layers before further scale tweaks. Native alpha timing,
scissor state and original UI occlusion are not established here. In particular,
do not crop to the old top-1200 diagnostic merely to hide a lower edge, remove
the white source textures, substitute a glow, or turn source planes into global
screen flashes without tracing their original draw behavior. No playback patch
was made during this follow-up. Only existing local evidence was used.

Evidence date: 2026-10-24, opt-in `plan-model-vertex-rgba.json`, Cloud 207000105.
This diagnoses a source layer; it does not correct or approve native rendering.

## Confirmed attribution

In the shared preview at F29 (skill F11), hiding only
`atk_impact_001_pink.bmb:34` removes the rectangular white contribution above the
target. The other source layers remain. Restoring the diagnostic selection to
None restores the contribution. Screenshots are ignored research receipts under
`tools/data/model-vertex-rgba/f29-before.png` and
`f29-node34-omitted-diagnostic.png`. Omission is a diagnostic, not a published fix.

Node 34 is `EmitterParticle`, not a model or a missing/untextured primitive.
It binds the original named `white` texture. The staged PNG is 8 by 8, with all
RGBA channels 255 after palette expansion. SHA-256:
`3b03488b361554f606c86d64c5b745640bdc722370361d78516ec2818864ed7d`.
The BMB SHA-256 is
`89c3cb5e7c16df69bf8d1c538622afdd42e30942240141a8147dd55da4de690f`;
the matched BMSLN SHA-256 is
`074d71c0a4b531db1ac97806eb82292ee588744cfc136efaf21df66a9977398a`.
The shader's optional model RGBA operation does not apply to this Particle.

Source values and current evaluation:

| Input / state | Value |
| --- | --- |
| Blend / texture combination | SemiAdd / Basic |
| Local scale | 360, 320, 1 |
| Local lifetime / parent start | 12 / 4 effect frames |
| Skill member start | F6 |
| At preview F29 | Effect F5, instance 125, age 1 |
| Evaluated alpha | 0.13016426061296005 |
| Alpha with inheritance experiment disabled | Same value |
| Authoring parent alpha | Lerp, rate 0 |
| Node compatibility / root compatibility | V16 true, V15 true / both false |
| Current transformed plane normal | 0, -0.42261826, 0.90630779 |

The material is already translucent. The existing rate-zero alpha experiment is
not the differentiating factor at this frame. The source intentionally contains
a large white contribution; that fact does not establish the native primitive
size, facing, screen coverage or blending semantics. The current player uses a
transformed unit XY plane and still lacks complete Particle billboard support.
Do not remove the node, replace its texture with a glow, clamp its dimensions or
lower its opacity merely to remove the visible rectangle.

## Repeatable inspection

`inspect_preview_node.mjs` is a read-only diagnostic for any staged effect/node.
It accepts **skill time**, before subtracting each member's start. It records all
matching member/instance states, original source-node metadata, evaluated matrices,
alpha with/without the inheritance experiment, plane normals and verified texture
hashes. It never changes the plan or declares native fidelity.

```powershell
node tools/inspect_preview_node.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-model-vertex-rgba.json --effect atk_impact_001_pink.bmb --node 34 --skill-frame 11 --output tools/data/model-vertex-rgba/f29-source-node.json
```

Checks executed: this command, two additional actual-plan probes (Blade Beam
blue slash node 8 at skill F20, Climhazzard Power Geyser node 11 at F32), assertions
on receipt provenance and unchanged source-plan hashes, and rejection of an
unknown node, negative frame and output outside the research directory. Browser
omission/restoration was checked at F29. No native capture or game build was run;
no render behavior or published content was changed by this diagnostic step.

## Next question

Use this node as a named native primitive/material fixture alongside the planned
alpha/compatibility probe. Establish its native shape, facing and actual draw
alpha/blend state before changing geometry or attenuation. A screenshot alone
cannot choose between those rules. This is a shared-renderer coverage issue,
not a request for another skill asset or a per-Cloud patch.
