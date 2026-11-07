# Explicit preview host-scene contract

Follow-up: [explicit screen-anchor host reference](screen-anchor-host-reference.md)
separates full host screen from the earlier arena-only screen baseline. Game and
native-proportion contexts default to full host, with a separate A/B checkbox.
This adjusts host anchoring, not source plane size or native fidelity claims.

2026-10-25. Follow-up to [viewport/UI diagnosis](white-plane-viewport-ui.md).
This changes only the research preview. No new capture, Phaser game change,
effect publication or suppression of source white planes.

## Concrete inconsistency and result

The earlier preview asked the real game layout for 1000x1100 positions, then
drew into a 1000x800 canvas with a matching centered 1000x800 camera. The actual
game's 300-pixel dock was entirely outside that image. The preview therefore
could not reproduce foreground occlusion even when the source plane and its
projection were otherwise meaningful. This is a source-code inconsistency,
separate from the remaining original-camera/placement fidelity questions.

The preview now declares scene dimensions and foreground ordering separately.
Default mode remains the earlier legacy study. A server may select another
default with `--host-view`; the UI and `?view=` can select any available context.

| Mode | Canvas / camera span | Layout source | Foreground |
| --- | --- | --- | --- |
| legacy | 1000x800 | earlier 1000x1100 layout retained for exact comparison | none |
| game | 1000x1100 | current exported BATTLE_VIEW and getBattleLayout | actual declared header/dock bounds, diagnostic appearance |
| native-proportions | 640x1136 for the current reference | getBattleLayout in rounded captured logical extent | same game layout rules, adapted dimensions and diagnostic appearance |

The native-proportions mode derives extent from the verified native audit's
projection matrix, not its physical pixel resolution or a hand-picked crop.
It accepts only the pinned build's finite, identity-view, positive axis-aligned
orthographic projection with the expected origin. Unknown/unsupported data fails.
Extent is rounded to whole preview logical pixels. This is **not** an original
scene replay: source roots, native actor/UI layout, native scissor state and
timing are not copied from the captured scene.

## Shared coordinate and composition rules

`presentationAnchor()` now receives an optional view width/height. Existing
callers retain the exact centered 1000x800 default. The same supplied dimensions
control the camera center, pixel-to-world anchor conversion, screen rectangle,
background placement and all render canvases. One logical unit remains one
preview pixel; no effect-size or alpha multiplier was added.

On view changes, renderer buffers, projection and scene-snapshot geometry are
resized together. The native-blend intermediate target is resized too. No
simulation parameters, source transforms, skill-specific filenames or shader
equations are changed by the host context.

The final ordering is background -> back effects -> actors -> front effects ->
declared host foreground -> diagnostic text. Foreground regions come from the
same getBattleLayout used by the game: header ends at arena.y; dock starts at
partyTop and ends at view.height. The preview paints these opaque diagnostic
surfaces after effects. They are not a scissor, an enlarged source flash or
reconstructed FFBE UI. The checkbox can remove foreground independently so
reviewers can inspect continuing effect content underneath it.

All views keep the source effect alive. Legacy and foreground-off comparisons
remain available. No measured Y1190/top-1200 original-video mask was encoded.
The game's current dock layout determines these regions; its suitability for
original frame reproduction is not inferred from the disappearance of an edge.

## Actual browser review

Port3138 hosts Brave Slash's plan-native-null and Climhazzard's plan-native-x.
Both native-proportion views passed the existing 49 GPU fixture checks and
returned no warning/error log entries during inspected rendering.

- Brave Slash at preview F29 / skill F11: inspected native proportions with
  foreground on/off. The source plane's lower region is exposed when foreground
  is off; the declared dock covers it when on. No freestanding side rectangle
  was visible in this inspected adapted view.
- Climhazzard at preview F30 / skill F12: inspected with the same host rules and
  the earlier deterministic X display enabled. Its white strobe illuminates the
  visible field without the earlier freestanding rectangle at that frame.
- Earlier game-host mode also loaded. The mode switch exercises buffer/camera
  resize; exact native visual fidelity and every animation frame remain unproven.

Screenshots are ignored under `tools/data/host-view/`. Browser receipts now
retain host mode/dimensions/origin, foreground state, reference hash and inspected
frame. Mode/foreground/manual-frame changes update the receipt rather than
leaving its initial host state. Receipts remain `approved: false`.

## Reproduction

```powershell
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json --plan tools/data/shared-skill-review/climhazzard/plan-native-x.json --host-view game --camera-reference tools/data/particle-native-audit/locator-camera-audit.json --port 3138
```

Open:

```text
http://127.0.0.1:3138/?skill=214800&view=native-proportions
http://127.0.0.1:3138/?skill=214820&view=native-proportions
```

The reference must stay in ignored tools/data; the server hashes it for review
receipts. All image assets still go through the existing allowlist/hash checks.
Without a reference only legacy/game are available. Existing server defaults
and old configs remain legacy-compatible; no game publication is involved.

Actually executed: full Node runner 82 passed, zero skips. Four new host tests
cover pixel/world roundtrips, unchanged default anchors, independent foreground
regions, captured-projection extent and rejection of unsupported inputs. The
targeted host/player suite passed again (20 tests) after review-state changes.
`git diff --check` passed. No Python code or Phaser gameplay changed; no new
Python suite or game build was run for this tools-only milestone.

Changed files: shared research player, preview HTML, preview server and
`tools/test_preview_host_view.mjs`. Native data, assets and published effects
are unchanged. Source geometry/native material work remains reusable across
hosts; each host must explicitly own its scene scale, anchor and foreground
contract. VelocityX scheduling, random-state ownership, unsupported controls and
source-independent scene fidelity remain separate open renderer requirements.
