# Background import workflow

## Mako Reactor music

FFRogue uses the FFBE archive track `400993` as a thematic selection for
Mako Reactor. The archived name `la993_bgm_FF7R_GuardScorpion.acb` matches
the boss in the FFRogue area. It does not establish an original assignment
to the background. The local master joins `battle_bg 120142` to resource
`106502`, `battle_bg_2013_02.jpg` and the SSPB animation, with no matching
`mission`, `mission_phase` or `monster_dictionary` background row. Nearby
`battle_bg_2013_*` IDs likewise have no mission rows. Targeted name and
numeric BGM searches in missions, phases, area and dungeon metadata, and
`scenario_battle` did not identify an inherited music assignment. The
available archives verify the track identity independently.

The master also lists the classic FFVII banks `400842`
(`la842_bgm_ff7_tatakaumono.acb`, standard battle), `400843`
(`la843_bgm_ff7_saranitatakau.acb`, boss battle) and `400844`
(`la844_bgm_ff7_makouro.acb`, reactor). The local archive and dump file
inventory did not locate those bank payloads. No named BGM column in the
local master references any of those three IDs. Their registry entries
establish the classic FFVII track identities, with stage usage still open.

| Master resource | Memorial assetpack 5 bank | Use |
| --- | --- | --- |
| 400993 | la993_bgm_FF7R_GuardScorpion.acb | FFRogue thematic selection |
| 4000711 | la00711_bgm_FF7R_Kikaitou_no_Kessen.acb | Comparison excerpt |
| 4001005 | la01005_bgm_ccff7_Ayatsurareshi_Tetsu_no_Kemono.acb | Comparison excerpt |

Guard Scorpion bank SHA-256 is
`2782902b61ca236162727b318f996e3f74acf70bd851fea9f2a4b4e54a558ee5`.
Use vgmstream r2168, stream 1, with `-i` to decode one pass. Encode with
`ffmpeg -i input.wav -c:a libvorbis -q:a 7 la993_guard_scorpion.ogg`.
The result hashes to
`9d49e26f320eec62431317c8646f97988b0c6c0b4c42e03830dfa27f8dc353f5`
and decodes to 16,655,536 stereo sample frames at 44.1 kHz, matching the
HCA stream length. The authored loop uses samples 13,261,697–16,655,233.
The audio manager primes the buffer during the area entrance and requests
playback at reveal. Subsequent fights share the same area scope.

## Whisperwood battle music

The original master joins background 100031 to five mission rows and background
101631 to one row, all with `battleBgmResourceId=400005`. These are Latius Woods,
Provisions and Bright Forest entries. `resource_map` resolves 400005 to
`sound/bgm/la005_battle1.acb`. FFRogue uses that source music in both Whisperwood
encounters. The boss assignment is a local presentation choice.

The preserved bank is under
`rawdata/memorial-packs/on_demand_asset3/199/199/assets/`.
Its SHA-256 is `a404058782637cfd7cfca1d58b062990be10ea4e28817beb4a0c07d3498c42cd`.
With the official vgmstream r2168 Windows CLI, run
`vgmstream-cli.exe -m -s 1 <bank>` for evidence and
`vgmstream-cli.exe -i -s 1 -o <output.wav> <bank>` for the PCM export.
The published WAV SHA-256 is
`b164118954d82a9a7197680663a8331578c90429d349446c851b79fb2ac23d98`.
The bank reports CRI HCA, stereo 44,100 Hz, stream `la005_battle1`, and the
loop interval 370898–3816914 samples. The existing similarly named legacy WAV
has a different sample count. The runtime uses the new bank-verified export.

`stageContent.mjs` selects the resource ID and GameFlow requests it from
the shared audio manager. The decoded buffer and active loop survive a
BattleScene restart, Victory, rewards, and boss entry in the same area.
Changes to a different track crossfade over 240 ms after decode. An unmapped
area or expedition result fades to silence. The raw decoder and archives
stay outside the browser. Mako background 120142 has no matching mission or
phase music join in the available master.
The combat-audio follow-up also checked `monster_dictionary`, the
Sweeper and Guard Scorpion battle groups 744010404/744010505, their
lottery pools and scenario links. Those joins did not establish a
track for background 120142.

## FFBE normal Home music

The original master `resource_map` row 400003 resolves to
`sound/bgm/la003_mypage_normal1.acb`. The Memorial ARM64 library
(SHA-256 `6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`)
references that exact NUL-terminated bank name at the ADRP/ADD pair starting
at `0x1458a4c` inside the exported `HomeUtil::playHomeNormalBgm()`. ADB
also reached the actual Home party view. The assignment is based on the
native code reference and master row. Android logcat did not emit a numeric cue.
The distinct main theme bank maps to resource 400002.

Both preserved Memorial assetpack copies (3 and 5) of the Home bank hash to
`180a0faa8640c5486a0302c385f67832207b494f1ad370372c2aa43df2439a96`.
Use the same vgmstream r2168 commands above with the Home bank, stream 1.
It is CRI HCA at 44,100 Hz stereo, 3,390,762 decoded samples, loop samples
215038–3390206. The PCM export SHA-256 is
`2f1310abeb7d5d05382061562a7f93bb9f925ad34c39e0c226f93b7e742f1328`.
FFRogue shares this track across the title and Slot Machine. The original
FFBE login track is a separate context.

## Reviewed soft-cell sampling and future mainline intake (2026-11-02)

The original240 frames/30FPS,7,451 packets, cells, UV flips, transforms, opacities,
blend modes/order and exact reactor atlas remain unchanged. Only a declared
FFRogue display policy changes sampling for reviewed fog/fog2/add_grad cells.
The two fog cells are80x40 with26/14 alpha levels, magnified up to about14 source
pixels per texel. add_grad is20x32 and reaches50x magnification. Nearest sampling
therefore exposes large steps in the original low-resolution gradients.

prepare_stage_sampling.py copies exact RGBA cell pixels into three separate tiny
textures, with2-pixel edge extrusion. The shared StageAnimation applies LINEAR
only to these declared cells. The original atlas stays NEAREST; all hard scenery,
heroes/enemies/Source textures are untouched. Cropping/gutters prevent adjacent
atlas bleed; no blur, rescale, recolor or alpha-curve rewrite occurs. Additional
PNGs total4,386 bytes /33,024 estimated RGBA8 bytes. Original native GPU filtering
was not measured: this is a reviewed FFRogue adaptation, not reconstructed FFBE
sampler semantics. Existing source quantization is preserved, not painted away.

CURRENT reproduction requires BOTH steps (the earlier plain export is unsampled):

```powershell
& $env:FFROGUE_PYTHON tools/prepare_stage_animation.py --source rawdata/ffbe_asset_dump/battle_bg/battle_bg_2013_02.ssbp --output public/assets/stages/reactor --offset 0 216 --canvas 960 1024
& $env:FFROGUE_PYTHON tools/prepare_stage_sampling.py --root public/assets/stages/reactor --recipe tools/stages/reactor-sampling.json
node tools/review_stage_sampling.mjs --playwright INSTALLED_PLAYWRIGHT_PATH
```

Browser before/after frames30/90/150 use the same paused actual BattleScene,
camera/actors and exact packets, changing only the declared sampler overrides.
Receipts/screenshots: tools/data/awakening-polish-20261102/sampling/.
All240 frames/loop/reload/cache, full Source/boss/Victory/rewards also tested.

Mainline inventory is separate from publication. inventory_stage_candidates.py
checks all1,286 master background rows:1,262 have their exact local JPG and1,181
their referenced animation binary. Disk contains1,351 JPGs/1,266 SSBPs; these are
not counts of unique, supported mainline stages. Twelve selected animations were
decoded and fully checked against the current packet exporter:8 supported back
profiles,4 blocked. All selected actual atlases exist. Only1/12 has deformation
(2013_06); three other roots need independent clocks. Whisperwood deformation is
therefore not the next prerequisite for the strongest current candidates.

| Proposed future area | Original battleBgId / resource | Available animation | Matching original body candidates | Remaining admission |
| --- | --- | --- | --- | --- |
| FFVIII Dollet street |120173 /2016_03|600 frames30FPS,3 nested light/neon instances; supported|G-Soldier2058610, Elite Soldier2058710; Elvoret2041910 or Galbadia X-ATM0925060020|Arena framing/floor review; assemble/validate bodies; reviewed boss gameplay/skills|
| FFVII Shinra Mansion / Nibelheim candidate |120144 /2013_04|600 frames30FPS,6 nested instances; supported back; master selects back only|Ghirofelgo2058210, Yin & Yang2058310; Lost Number3011510|Confirm location/framing, validate prepared bodies and encounter design|
| FFVII Reactor05 |120141 /2013_01|240 frames30FPS; same supported shared-atlas family as productive reactor|Existing Sweeper/Guard Scorpion; Air Buster4060910 raw body files present|Review framing/art, assemble Air Buster if selected; no new original attack claim|

The proposals are explicitly reviewed visual/theme identifications, NOT a
gameTitleId foreign-key join in battle_bg or authenticated original encounter
lists. Dollet's Nautilus storefront is visible in the original image and checked
against an independent [Dollet location description](https://ffonline.com/ff8/world/Dollet).
Original enemy descriptions independently mention Dollet/Galbadia, Nibelheim manor
and Shinra reactors. The raw DB IDs/files/hashes remain separate from proposals
in tools/stages/mainline-candidates.json. In particular X-ATM0925060010 is the
Zoldaad version and must NOT be substituted for Galbadia5060020.
Candidate PNG/CGG/idle/atk files all exist; unassembled bodies are not published
enemies and unsupported original attacks remain blocked. No authenticated music
join was found for these candidates; audio IDs/files are not guessed from names.
FFI–XVI title records exist, but complete stage availability for every title is
unproven.2006_01 machinery has unconfirmed origin/independent clocks and is deferred.

Recommendation: prepare Dollet as a future Whisperwood replacement to introduce
a distinct mainline world with supported animation. Keep the current forest and
four-fight expedition unchanged until complete area/body validation. No new area
is enabled in this block; no forest decoder research was started.

## Productive SSPB-v1 reactor layer (2026-11-02)

This supersedes inventory-only claims below: Mako Reactor now overlays its original
back/anime animation on the unchanged JPG. Whisperwood stays static. The common
StageAnimation component consumes clean prepared quads through Phaser's existing
Rope pipeline, same arena cover/crop, clipped behind actors. No new camera or
skill renderer, procedural fog or invented glow curve was added.

Source battle_bg_2013_02.ssbp SHA256:
6a7f9dd42f9025499ea883918cff98a29ad4980ec07a8ee9df10507b860982e1.
The exact shared atlas battle_bg_2013_01.png SHA256:
b0ced167581f14b651d4efefc5dd95a2d75fa27118d158dc8d4ab334a8ae12e0.
tools/ssbp_v1.py uses the ACTUAL version1 structures and stream documented in the
[historical official player](https://github.com/SpriteStudio/ssbpLib/tree/2a80bf76d9077275f301b89d604624eac420d168/Players/ssbpLib),
SS5PlayerData.h and Player::setFrame, rather than today's version4 layout.
Both independent originals decode completely: reactor14 cells/5 packs, forest28
cells/3 packs. Every part occurs once/frame; stream ends match the next aligned
offset, with zero padding only. SDK snapshots/hashes are retained in the receipt.

Admitted export: parent2-D SRT, signed positions/10, negative scales, cell/anchor,
explicit size flags, integer-truncated inherited opacity, UV flips, frame-record
draw order, normal/add blends and nested instance clocks. Reactor has240 frames
at30FPS,7,451 visible prepared quads across8 seconds. Key/start/end/speed, finite
hold/infinite loop are source-derived; reverse/pingpong also have clock controls.
Independent instance clocks, unknown types,3-D/Z, animated UV, deformation, color
shaders and other blends fail closed. Forest has active deformation and therefore
is NOT partly published. Runtime does not parse raw SSBP or load source atlases
by guessed same-stem filenames.

Master120142 references back/anime,0,216. Reviewed mapping uses the existing
960x1024 canvas center plus that placement, origin(480,728). Eight independent
atlas/JPG samples confirm static alignment, including floor1(324,387) and floor2
(0,475)/(632,475); JPEG differences are retained in static-layer-alignment.json.
Viewport cover/crop, continuous repeat, phase reset on scene entry and placement
behind actors are explicit FFRogue presentation policy. This is source-authored
motion interpreted with the historical SDK, NOT newly certified FFBE camera/GPU
filtering/nested visibility or native pixel parity. No new native capture.

Reproduce with configured Python/Pillow:

```powershell
& $env:FFROGUE_PYTHON tools/prepare_stage_animation.py --source rawdata/ffbe_asset_dump/battle_bg/battle_bg_2013_02.ssbp --output public/assets/stages/reactor --offset 0 216 --canvas 960 1024
& $env:FFROGUE_PYTHON -m unittest tools/test_stage_animation.py
node tools/review_stage_runtime.mjs --playwright INSTALLED_PLAYWRIGHT_PATH
```

Metadata687KB loads at title; atlas111KB loads before reactor combat and is reused
by its boss. Scene pause stops its clock; shutdown destroys quad/mask objects and
detaches the listener, retaining shared textures. Audio remains separate/empty.
Actual browser coverage includes all240 frames, loop wrap, changing light pixels,
both bosses/Source effects/Victory/rewards, encounter reload and texture reuse.
Receipts: tools/data/stage-loading-20261102/{animated-browser,stage-runtime,rewards}.

## Animation resource intake (2026-11-02)

Run python tools/inspect_stage_animation.py. Both selected .ssbp files have literal
SSPB signature/version1 and Ss5Converter v1.0.0 provenance. They are binary
SpriteStudio resources, not GIFs. All three readable image references exist:

| Selected binary | Actual atlas references |
| --- | --- |
| battle_bg_0003_01.ssbp | battle_bg_0003_01_1.png and battle_bg_0003_01_2.png (1024x1024 each) |
| battle_bg_2013_02.ssbp | battle_bg_2013_01.png (514x974) |

The same-stem2013_02.png is fully transparent and is NOT the atlas referenced by
this animation. Earlier same-stem inspection did not rule out the shared atlas.
The forest has separate front/back names; the reactor has nested mako/light/fog
instance references. Literal names do not prove their transforms, timing or
parallax. Master back/anime,0,216 remains raw;216 was not guessed as a frame count.

Original atlas data is available. The current implementation gap is a verified
SSPB-v1 cell-map/part/frame/instance decoder with hierarchy, UV transforms,
opacity/blend and native draw order. There is NO supported stage-animation player
or decoded original timing yet, so zero animated stages are productively admitted.
No procedural scrolling/glow was presented as original animation. Both accepted
static arenas remain unchanged under the same camera/effects/Victory overlay.

Official reference consulted: [SpriteStudio player data model](https://github.com/SpriteStudio/ssbpLib/blob/master/Players/ssbpLib/SS5PlayerData.h).
Its current layout must not be applied blindly to these older version1 files.
Hashes/master rows/strings/atlas dimensions are retained in
tools/data/battle-polish-20261102/stage-animation-intake.json. The probe does not
claim that string scanning has decoded cell maps or all nested dependencies.

## Current themed use (2026-11-02)

The same two static, byte-identical arenas below now host Whisperwood's original
Microchu/Ochu and Mako Reactor's Sweeper/Guard Scorpion. Master battle_bg IDs:
100031/101631 -> battle_bg_0003_01.jpg;120142 -> battle_bg_2013_02.jpg. Exact master
rows/SSBP strings and companion hashes are retained by inventory_battle_content.py.
Theme/formation composition is reviewed FFRogue content, not a reconstructed
native stage. Background SSBP layers and original stage/music joins remain unknown.
No new image conversion, invented animated layer or global rescale was introduced.
Run selection now resolves stageContent.mjs; explicit debug arena queries retain
the old forest/reactor behavior described below. See enemy-import-workflow.md.

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
rg --files rawdata/ffbe_asset_dump/battle_bg -g '*2013_02*'
```

Inspect the actual image with a real image decoder, including dimensions, alpha,
frame count and visible content. For example, with Python and Pillow configured
as described in the character workflow:

```powershell
@'
from pathlib import Path
from PIL import Image
import hashlib

for path in sorted(Path('rawdata/ffbe_asset_dump/battle_bg').glob('*2013_02*')):
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

| Arena | Exact local source under `rawdata/ffbe_asset_dump/battle_bg/` | Prepared file | SHA-256 |
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
Copy-Item -LiteralPath 'rawdata/ffbe_asset_dump/battle_bg/battle_bg_2013_02.jpg' -Destination 'public/assets/backgrounds/reactor_01.jpg'
Get-FileHash -LiteralPath 'rawdata/ffbe_asset_dump/battle_bg/battle_bg_2013_02.jpg' -Algorithm SHA256
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

## Reviewed Mainline batch and gallery

Run `python tools/prepare_reviewed_arenas.py` with Pillow and the local Memorial data mounted at the existing repository paths. The importer joins the stage master to the original background and animation selector, validates the soundtrack bank against the local archive inventory, records the background SHA-256, and sends each SSPB through the existing strict packet exporter. The checked-in recipe records the reviewed title, floor and encounter compatibility. The generated local catalog records every stage row, game-title row, BGM bank, direct mission/phase/dictionary association and local file availability. Unreviewed stage ownership is unresolved. An available bank alone is not a playable export.

| Stage | Profile | FFRogue music | Usage |
| --- | --- | --- | --- |
| 120141 | FFVII Mako Reactor 05, 240 frames at 30 FPS | 400993, thematic | Gallery and opt-in seeded reactor variant |
| 120144 | FFVII Shinra Mansion candidate, 600 frames at 30 FPS | 4000711, thematic FFVII Remake machine battle | Gallery training battle |
| 120173 | FFVIII Dollet street, 600 frames at 30 FPS | 4001101, thematic Dead End | Gallery training battle |

The three music pairings are thematic. Master associations are retained separately in the local catalog. Classic FFVII banks 400842, 400843 and 400844 remain known registry entries without local ACB payloads in the surveyed roots. New Ogg assets were decoded using the existing vgmstream tooling and encoded at 44.1 kHz. Loop samples are 30046–11216606 for 4000711 and 9523–3117363 for 4001101. The common audio manager owns both preview and run playback.

Open `/?gallery=arenas` to select the source game, arena and soundtrack and exercise the production battle renderer against training targets. Open `/?arenaVariants=1&seed=combat-audio-20` to use the seeded variant rule for a new expedition. The choice is persisted independently of gameplay RNG. The default route and the four-fight structure are unchanged.

The local catalog contains 1,286 stage rows, 1,262 available JPGs and 1,181 available animation selectors. It also contains 701 registered BGM entries, with local bank filename matches for 247. The master title list covers FFI–FFXVI, FFT and spin-offs such as CCFFVIIR, Type-0 and X-2. These counts do not establish the title of individual arenas. The reviewed batch establishes usable profiles for FFVII and FFVIII only.

## Battle music roles

The playback catalog in `src/audio/musicProfiles.mjs` describes series, edition,
musical function, and local playback availability. Normal encounters select a
playable normal track in their series, then FFBE Battle 1 as a labeled fallback.
Boss tracks require an explicit encounter binding. Event and exploration tracks
are never automatic normal-battle fallbacks. The gallery exposes role, source
title, availability and manual audition. These are FFRogue music pairings.

The FFBEWW export contains `Ver1_la00713_bgm_FF7R_TatakauMonotati_MotoSoldier.acb`
with CRI HCA stream `bgm_FF7R_TatakauMonotati_MotoSoldier`. The published local
profile key is 4000713, derived from the bank basename. The surveyed master
registry has no corresponding row. SHA-256 of the bank is
`602a5f268ecac1b614a7c50cf868486920287177c762733554e82eda0f98726a`.
Decode with `vgmstream-cli -i -o public/assets/audio/la00713_ex_soldier.wav <bank>`.
The WAV SHA-256 is `ca41345e45f8566129a436ebff61eedc1f74c14784dbf3c1f047ce1c4bb2a39`.
Its native 44,100 Hz loop is [1239453, 2619933). Square Enix's
[official track list](https://www.jp.square-enix.com/music/sem/page/FF7R/ost/en/SQEX_10768_75/)
identifies the arrangement as Let the Battles Begin! – Ex-SOLDIER.
Both Reactor backgrounds use it for normal combat. Guard Scorpion is reserved
for its boss encounter, and the boss track remains active through the reward.

FFVIII's Don't Be Afraid (400867, `la867_bgm_ff8_Dont_be_Afraid.acb`) and Force
Your Way (400868) are registry-only in the surveyed files. Update 2026-11-08: classic `la842` is now published as `public/assets/audio/la842_let_the_battles_begin.wav`
(bank SHA-256 `a2999d0f03f2858b50c8c1a19ff2baa0def2eb0e7eab0a93adf530599f948b58`, WAV SHA-256
`ac850c3b138a8ef143d27149670e08b78108b9c39b851eb1280c13533c8b51fb`, native loop [143152, 3230640)) and is
the Mako Reactor normal track; the developer confirmed the Memorial client plays it there. Bank source:
memorial-side-stories (asset_structure.md); `la843`/`la867`/`la868` are present there too. Earlier text:
The three classic
FFVII entries (400842–400844) and the alternate Remake banks 400989 and 401038
also lack payloads in the local search. Dollet uses FFBE Battle 1 as an explicit
cross-series fallback. Dead End and Kikaitou no Kessen remain manual audition
choices and are excluded from normal recommendations. Earlier table entries
describe the previous gallery defaults.
