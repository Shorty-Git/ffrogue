# Native global geometry scale and preview correction

Evidence date: 2026-10-24. Same pinned native library and isolated clone as
[the placement investigation](native-effect-placement.md). No published game
effect was changed. This closes one missing wrapper multiplier, not native
particle-renderer fidelity.

## Missing scale identified in the original wrapper

`BishamonData::updateOffsetPos` loads a global through GOT slot `0x2e07278`.
ELF relocation resolves it to exported float
`BishamonData::SCALE_FACTOR` (`0x2e42f20`, BSS, four bytes). The function
multiplies its wrapper scale by layer scale and this global before storing
the renderer's animation scale. `BishamonData::update` also applies the same
global to local scale before `ml::bmfw::Animation::Update`.

Relevant instructions:

- `updateOffsetPos`, `0x15bd30c..0x15bd368`: global load, independent position/
  rotation copies, geometry scale multiplication and renderer scale stores.
- `update`, `0x15bc950..0x15bc9c0`: global multiplier, optional cached layer
  scale controlled by a flag, renderer scale stores.
- `BishamonDataList::Initialize`, `0x15bdfa0..0x15bdfe0`: calls
  `CommonUtils::getScreenWidth/Height`, compares both divided by float **1136**
  (`0x448e0000`), selects the smaller quotient, stores its reciprocal.

Therefore `SCALE_FACTOR = 1136 / min(screenWidth, screenHeight)` for this build.
It is not the member's `scalePercent`, and it does not multiply the placement
offset. Layer scaling is an additional factor whose live value remains uncaptured.
`CommonUtils::convertPosition` separately returns `[x, layerHeight - y]`, falling
back to director height when the layer height is zero; that is not a global
local-geometry size multiplier.

The offline disassembly receipts under ignored `tools/data/memorial-audit/` are
`bishamon-coordinate-path.json`, `bishamon-convert-position.json`,
`bishamon-initialize.json`, `bishamon-screen-update.json` and
`bishamon-scale-references.json`. The last is a discovery scan, not proof that
every adjacent instruction refers to the same register/global. The initialization
and scale-update functions above were separately disassembled and inspected.

Reproduce bounded disassembly with `tools/memorial/inspect_native_calls.py`,
Capstone 5.0.9 and these exact mangled function names:

```text
_ZN12BishamonData15updateOffsetPosEv
_ZN12BishamonData6updateEf
_ZN16BishamonDataList10InitializeEv
_ZN11CommonUtils14getScreenWidthEv
_ZN11CommonUtils15getScreenHeightEv
_ZN11CommonUtils15convertPositionEff
```

## Runtime reference verified without another skill test

Observer revision 7 fingerprints both screen getters, waits for the exported
scale to become positive, then reads it and calls the two integer-returning
getters. Initialization has already called those getters before setting the
global. It emits one `renderer-reference`; it does not change scale or play an
effect. The existing float/object calibration passed and 18 hooks were ready.

The clone-only APK update passed signature v1/v2/v3 verification and 16 KB ZIP
alignment. Installed hash verified on device:
`332b5d5d53edd844cdc6eccdde34b4506c36122baba81b0a2cb2db20bdd9340a`.
The original instance/root state were unchanged. Live output:

```json
{"globalScale":1.774999976158142,"screenWidth":640,"screenHeight":1100,"formulaScale":1.775,"formulaMatches":true}
```

The local reference receipt `diagnostic-v7/renderer-reference.json` includes the
native hash and SHA-256 of the saved `startup-log.txt`. This is a measured
reference resolution, not a value inferred from the effect's appearance.

## Explicit shared preview support

`prepare_original_preview.py --renderer-reference <receipt>` validates the
positive finite values, formula agreement and provenance hashes, and requires
the explicit rectangle-placement bridge. `rendererGeometryScale` validates the
receipt again in the shared player. The effective root geometry scale becomes:

```text
memberScalePercent / 100 × bridgeUnitsToPixels × measuredGlobalScale
```

The root position and source offset are unchanged. Legacy plans without a
reference keep multiplier 1. Unknown/malformed references fail, rather than
falling back to a guessed value. A visible UI note identifies the measured
resolution/factor and remaining layer/camera uncertainty.

```powershell
& $env:FFROGUE_PYTHON tools/prepare_original_preview.py --source tools/data/shared-skill-review/blade-beam/skill-source.json --unit cloud --recipe tools/characters/cloud.json --authoring assets/battle_effect/atk_aerialslash_001_green.bmsln --authoring assets/battle_effect/atk_slash5_blue.bmsln --scene-composite --withhold-untextured --inheritance --source-appearance --basic-uv --rectangle-placement --renderer-reference tools/data/memorial-audit/diagnostic-v7/renderer-reference.json --output tools/data/shared-skill-review/blade-beam/plan-renderer-reference.json
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/blade-beam/plan-renderer-reference.json --port 3124
node --test tools/test_original_effect_player.mjs
```

Checks actually run: these commands; all **16** player tests passed, including
reference/legacy behavior, malformed reference rejection and the captured
placement cases. The generated plan differs from `plan-rectangle-placement.json`
only by `rendererReference`: members, offsets, timing, decoded nodes/resources
and approval state are unchanged. Python compilation, JS syntax and
`git diff --check` passed.

Browser review reported eight GPU blend checks passing. At F20 the green wave
is visible across the enemy side in both reactor and forest arenas; lower-target
selection was also exercised. Screenshots are saved under ignored
`diagnostic-v7/renderer-*.png`. Playback advanced from F0 to its F210 end and
seeking back to F20 was verified.
No native screenshot/frame-by-frame pixel comparison or native-fidelity approval
was performed. The candidate stays `approved: false`; native layer scaling,
camera mapping, adapted unit bounds and remaining particle/material limitations
still prevent a complete fidelity/export claim.

## Reuse check: Brave Slash and Climhazzard

The developer described the Blade Beam candidate as very close to the original.
That is a positive visual review, not pixel-comparison evidence or approval of
other skills. The next bounded check reused the same global-scale receipt and
shared player for Brave Slash and Climhazzard, without character-specific
loaders or scale overrides.

| Candidate | Prepared source content | Browser initialization | Visible review |
| --- | --- | --- | --- |
| Brave Slash | One `atk_impact_001_pink.bmb` member, source scale 100%, start F4, target-unit rectangle | 8 GPU blend checks pass; 4 limitations | Pink impact visible on selected target at preview F26 / skill F8; forest/top-target controls checked |
| Climhazzard | Four original files, five members: two side slashes at 50%, blow at 200%, geyser at 100%, screen strobe at 100% | 8 GPU blend checks pass; 57 limitations | Early slash at F26 and purple/rock burst at F50 visible; reactor and forest/lower-target reviewed; a hard rectangular light edge remains visible in the early phase |

Climhazzard required a shared extension for source anchor mode **4**. The native
caller disassembly at `0x133166c..0x1331688` constructs a zero-origin rectangle
with field width/height. The opt-in preview maps this to the full current arena;
this is still an adapted boundary, not a captured Climhazzard screen rectangle.
Source member Y offset 150 and its own delay are retained. A regression assertion
checks full-arena centering, the offset and target independence.

The new Climhazzard plan deliberately does **not** enable `--fit-screen`, which
would replace the recovered placement with an arena-cover fit. Combining that
flag with `--rectangle-placement` is now rejected explicitly; an actual negative
CLI check confirmed a nonzero exit and no output plan. Earlier fit-screen plans
remain separate comparison candidates. No guessed rectangle resizing was added
to hide the visible strobe edge.

All 16 player checks pass after the screen-mode extension. Both plans were
generated successfully with the commands in the skill workflow. All three
reference-based plans were served together on port 3125; the skill selector
switched between the new candidates. The initial renderer receipts were copied
to `renderer-reference-browser-review.json` under each stage with plan hashes.
They report `ready`, not original-fidelity approval. Screenshots are retained as
`renderer-reference-*.png` under the two new skill stages.

Climhazzard remains explicitly incomplete: unverified untextured particle
primitives are withheld, several corner-color/random-color/inheritance/emission
features remain unsupported, and distortion/UV/material interpretation remains
experimental. Power Geyser still has no matching authoring supplement. The empty
source group is retained as unplayed metadata, not proven to be audio-only.
No live native trace or native video comparison of Brave Slash/Climhazzard was
collected in this reuse check. Both remain `approved: false`, with no changes to
`public/assets`, game recipes or gameplay skill availability.
