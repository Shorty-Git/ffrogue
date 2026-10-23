# Background import workflow

This is the current static-arena workflow. Start with the
[asset pipeline handbook](asset-pipeline-handbook.md) and
[asset structure guide](asset_structure.md). Character and effect processing are
covered separately by the [character import standard](character-import-workflow.md).
Run commands from the repository root in PowerShell.

The supported result is a visually reviewed, complete static image under
`public/assets/backgrounds/`, loaded by Phaser as an image. There is no dedicated
background exporter, scene compositor, SSBP interpreter, or animated-background
loader in this project. A matching JPG, PNG and SSBP basename does not establish
how the original game combined or animated them.

## Source selection and inspection

Search only the relevant source directory after reading the structure guide:

```powershell
rg --files ffbe_asset_dump-main/battle_bg -g '*2013_02*'
```

Inspect the actual image with a real image decoder, including dimensions, alpha,
frame count and visible content. For example, with Python and Pillow configured
as described in the character workflow:

```powershell
@'
from pathlib import Path
from PIL import Image
import hashlib

for path in sorted(Path('ffbe_asset_dump-main/battle_bg').glob('*2013_02*')):
    print(path, path.stat().st_size, hashlib.sha256(path.read_bytes()).hexdigest())
    if path.suffix.lower() not in {'.jpg', '.jpeg', '.png', '.gif'}:
        continue
    with Image.open(path) as image:
        print('size:', image.size, 'mode:', image.mode,
              'frames:', getattr(image, 'n_frames', 1))
        alpha = image.convert('RGBA').getchannel('A')
        print('alpha extrema:', alpha.getextrema(), 'visible bounds:', alpha.getbbox())
'@ | & $env:FFROGUE_PYTHON -X utf8 -
```

Open the candidate image as well. A low transparent-pixel count is not proof that
an image is a composed scene; it may be an atlas, separate foreground layer,
texture tile, mask, or empty companion file. Inspect the floor, horizon, walls,
railings and any repeated/disconnected image regions. Choose a complete static
scene only when its pixels support that interpretation. Do not invent an arena
name, geographic identity or layer mapping from a numeric ID alone.

`tools/find_clean_backgrounds.mjs` is an older candidate-scouting script, not an
acceptance gate or exporter. It considers only landscape PNGs at least 1000 pixels
wide, excluding both current JPG arenas. Its transparency calculation reads
inflated PNG scanline bytes without reversing PNG row filters, so that estimate
is unreliable. It copies candidates into ignored `tools/bg_preview/`; it does not
prove scene composition. Use Pillow and visual inspection instead of trusting
its labels or automatic candidate choices.

## Verified prepared arenas

On 2026-10-22, both runtime JPGs were decoded with Pillow, visually inspected,
and SHA-256 compared with their source files and JSON receipts. Each is an RGB,
single-frame 960 by 1024 image, copied byte-for-byte without resampling.

| Arena | Exact local source under `ffbe_asset_dump-main/battle_bg/` | Prepared file | SHA-256 |
| --- | --- | --- | --- |
| Forest clearing | `battle_bg_0003_01.jpg` | `public/assets/backgrounds/forest_clearing.jpg` | `621d9ef2a4f4ef511793e55412a6b7243825f8cc9a6bad4a048b00892a36035f` |
| Reactor marked 01 | `battle_bg_2013_02.jpg` | `public/assets/backgrounds/reactor_01.jpg` | `e6a781b66e91c8008e083773c1bee13839d78438a1ff6095596dcfdd658a015f` |

The reactor's companion `battle_bg_2013_02.png` is 987 by 816 pixels and **fully
transparent** in this local dump: all 805,392 alpha values are zero. It is not the
visible reactor image. A same-stem SSBP exists for both selected JPGs. Their
presence does not establish a decoded animation or that all original decorative
layers have been recovered. No same-stem forest PNG was present during this check.

The adjacent `forest_clearing.json` and `reactor_01.json` files preserve source,
dimensions, checksum, static status and review notes. They are provenance
receipts, not runtime manifests: the game does not currently load or validate
them. The forest receipt's earlier prose about feet at 57% of the arena predates
the current floor-region calculation. Use `src/data/battleArenas.ts` and
`src/ui/battleLayout.ts` for current placement.

## Prepare and register a reviewed image

For a complete static image, copy the exact source without destructive editing.
Do not replace the currently accepted arenas while scouting. This example
reproduces the existing reactor file and must only be run when that is the
intended publication operation:

```powershell
Copy-Item -LiteralPath 'ffbe_asset_dump-main/battle_bg/battle_bg_2013_02.jpg' -Destination 'public/assets/backgrounds/reactor_01.jpg'
Get-FileHash -LiteralPath 'ffbe_asset_dump-main/battle_bg/battle_bg_2013_02.jpg' -Algorithm SHA256
Get-FileHash -LiteralPath 'public/assets/backgrounds/reactor_01.jpg' -Algorithm SHA256
```

For a new arena, choose a new descriptive English filename and add an adjacent
JSON receipt with the exact source path, output filename, dimensions, SHA-256,
`animation: "static"` and the visual-review rationale. These fields follow the
existing receipts; there is currently no schema validator. If processing becomes
necessary, keep it in `tools/`, record the exact transform and both source/output
hashes, and retain the untouched raw source.

Registration is centralized, but background selection is not fully generic:

1. Add the unique texture key, filename, actual source dimensions and reviewed
   normalized `floorTop` / `floorBottom` to `src/data/battleArenas.ts`.
2. `PreloadScene` already loops over `BATTLE_ARENAS` and loads
   `assets/backgrounds/${arena.file}`. Backgrounds are **not** registered through
   `public/assets/content.json`, which serves characters, monsters and effects.
3. `BattleScene.init` currently selects only `arena=reactor`; everything else
   selects forest. Adding a catalog entry alone does not make a new query value
   selectable. Extend selection explicitly when implementing a new arena.
4. `BattleScene.createArenaBackground` centers the image in the arena at depth
   -100, applies proportional cover, and explicitly selects **LINEAR** texture
   filtering. Global `pixelArt: true` does not override that explicit filter.
   Keep pixel-sprite nearest sampling and illustrated-background sampling
   distinct; changing the latter requires a visual review.
5. Preview tools are separate consumers. `prepare_original_preview.py` currently
   embeds the two prepared reactor/forest images explicitly. A new runtime arena
   is not automatically present in a previously prepared skill-preview plan.

Raw inputs remain ignored. Track only the selected prepared image, receipt,
registration changes and relevant documentation. Never copy the full background
dump, SSBP files or raw animation parsing into `public/` or `src/`.

## Aspect ratio, floor and actor placement

The active desktop layout is a single **1000 by 1100** logical viewport, scaled
with Phaser FIT. The arena is `x=0, y=48, width=1000, height=752`; the command dock
starts at `y=800`. Old `?layout=portrait` and `?layout=desktop` values do not select
different layouts. Historical portrait documentation is not the active contract.

The image keeps its aspect ratio. Let `W,H` be the registered image dimensions,
`Aw,Ah` the arena dimensions and `Ay` its top:

```text
s = max(Aw / W, Ah / H)
cropY = (H * s - Ah) / 2
fieldTop = round(Ay + H * floorTop * s - cropY)
fieldBottom = min(partyTop - 85, round(Ay + H * floorBottom * s - cropY))
slotX = round(Aw * normalizedX)
slotY = round(fieldTop + (fieldBottom - fieldTop) * normalizedY)
```

This is proportional **cover**, not stretching to unrelated width and height.
With the current images, `s=1.041666...` and vertical crop is 157.333... logical
pixels per side; the nominal arena therefore shows a vertically cropped portion
of the source. The background image itself has no arena geometry mask; the header
and command UI are layered over it. Do not confuse this with the separate mask
used for prepared skill effects.

Current reviewed source floor regions are forest 0.56–0.80 and reactor 0.54–0.76
of source height. They become field Y bounds 488–715 and 467–701 respectively.
These are project layout choices based on visible floor, **not original FFBE
engine coordinates**. A source image's size or basename does not encode its floor.

The shared normalized formation is:

| Actor/slot | X across arena | Y within reviewed floor region |
| --- | --- | --- |
| Cloud | 0.67 | 0.48 |
| Aerith | 0.79 | 0.20 |
| Barret | 0.83 | 0.92 |
| Enemy center / single-boss slot | 0.19 | 0.50 |
| Enemy top | 0.32 | 0.16 |
| Enemy bottom | 0.32 | 1.00 |

Placement is the actor's logical foot, using its prepared pivot. Check actual
sprite bounds at idle, attack and death; the feet alone do not guarantee that a
large enemy clears a railing or the HUD. The present trio is a small-enemy
formation. Medium enemies may need fewer slots; a large boss needs a review of
its actual body in the center slot. Preserve manifest pivots and reviewed melee
arrival offsets; do not compensate for a wrong floor by modifying sprite crops.

See [battle layout](battle-layout.md) for target selection, existing attack-offset
evidence and previous playthrough checks.

## Review before publication

Inspect the scene in the running game, including:

- All three hero feet and enemy slots against the intended floor, rails and HUD.
- Top, center and bottom targets; approach, hit placement and exact home return.
- Skill effects that use target, group or screen anchors on both arena types.
- Real sprite extents for each new monster size and the selected-target display.
- A resized desktop viewport, confirming preserved aspect ratio and no UI clipping.

The existing comparison URLs are
`http://127.0.0.1:3000/?arena=forest&formation=trio` and
`http://127.0.0.1:3000/?arena=reactor&formation=trio` when the dev server uses port
3000. `formation=trio` substitutes three rats in the first encounter only; it does
not verify a future boss. Start the usual server with `npm run dev` when needed
and use its actual printed port.

For code or registration changes, run `npm run build` and the relevant existing
combat checks (`node tools/test_combat_regressions.mjs`), then inspect the browser.
Asset decoding, hash equality, code checks and browser inspection answer different
questions; record which were actually performed. The 2026-10-22 documentation
audit above checked current source/runtime pixels, hashes and code. It did not
rerun a battle or decode the SSBP files.

## Animated backgrounds remain unsupported

Neither a GIF preview nor an SSBP file proves that we can reconstruct an animated
arena. GIF previews elsewhere in the dump often represent units/effects; they are
not a background animation specification. No current game path plays GIF frames,
SSBP tracks, source parallax, camera movement, or layered background animation.

Before claiming support, establish the exact source scene/layer mapping, timing,
transforms, blending and loop behavior. Implement and review that conversion
offline under `tools/`, then publish ordinary frame sheets and clean metadata
with an explicit runtime playback contract. Until then, describe the current
arenas as static selections and report unavailable animation/layers explicitly.
