# Satellite Beam import

Current orientation update: a reviewed +45-degree clockwise artwork correction
makes the beam horizontal while retaining source Z45 separately. See
[the orientation review](effect-orientation.md) for current frame checks and game
screenshots; the original diagonal-ray edge measurements below are historical.

This milestone covers Barret's Satellite Beam only. Other commands retain their
existing behavior. Follow [the shared import contract](../character-import-workflow.md).

## Source and deliberate adaptation

Sprite 207000205 resolves to series 207000204. Ability 227874 is acquired at
6-star level 73 and costs 45 MP. Source motion code is 8, movement code 4, and
physical modifier 300%. Ten source hits run from F125 through F215 at 10-frame
intervals, each weighted 10%.

The meaning of motion code 8 remains unverified. The recipe explicitly reviews
`atk` as an adapted gun-casting motion. Both prepared `atk` and `limit_atk` were
inspected; the latter contains a long jumping beam cinematic. Unmapped motion
codes now require the source code, chosen prepared motion and a review reason.

The game uses the same simplified area contract as Blade Beam: one combined 3x
damage event at F165 (2750 ms), no extra recoil/tint/shake, completion at F240
(4000 ms). Original hit metadata is retained. This does not reproduce FFBE's
ten-hit distribution or establish original-game fidelity.

| Source component | Effect ID | Start | Anchor / layer | Preparation |
| --- | --- | --- | --- | --- |
| `sp_20029_nerau` | 5000140 | F41 | each target / front | 100%, ADD |
| `eff_large_beam_blue` | 5022081 | F60 | each target / front | 100%, source Z rotation 45 degrees, ADD |
| `eff_fadeblack_a50_f120` | 5006355 | F40 | screen / back | original black alpha animation, NORMAL |

All members and referenced resources exist. The fade has no external resources;
an empty validated dependency array is legitimate. Raw group offset fields,
including beam 150/-150 and fade 150, remain unapplied. Their units are not guessed.

## Shared preparation and runtime changes

- The effect baker supports reviewed XYZ degree rotations and NORMAL alpha output
  alongside existing black-background ADD output. Source, dependency, recipe and
  sheet hashes still gate publication.
- `presentation.effects` supports explicit back/front layers and a screen anchor.
  No Satellite-Beam-specific runtime branch or loader was added.
- The original fade's union alpha bounds were measured across all 150 prepared
  frames: x76, y69, width104, height76 in a 256-square frame. Recipe/manifest
  `contentBounds` plus `fit: "arena"` fit this original content to the field,
  avoiding a partial dark rectangle. No replacement fade rectangle is drawn.
- Prepared effects are clipped to the arena, so outgoing rays cannot cover the
  command dock. Mask and graphics objects are cleaned up with their sprite,
  including scene shutdown/reset.

The converted beam has a thin outgoing diagonal ray that reaches a sheet corner
in a few early frames, even with a substantially wider camera. Those frames were
inspected separately: the edge contact is this ray, not a cut-off central burst.
The ignored `tools/data/skill-previews/barret/satellite_beam/` folder contains
prepared-frame and edge-review images. The camera/atlas pair preserves six world
units per texture pixel; reducing camera span and frame size removes empty margins
without reducing core detail.

## Reusable source preview

```powershell
node tools/preview_skill.mjs --recipe tools/characters/barret.json --skill satellite_beam --motion atk --port 3106
```

The preview uses the shared inspector, renders all isolated effects and both
arena compositions, and writes ignored images plus source/resource/tool hashes.
It does not publish or apply damage. Its source composition leaves opaque offset
fields unapplied; the game's explicitly fitted screen presentation is separate.
Another selected skill/recipe can use the same command. Missing members/resources,
conditional groups and invalid rotation tuples fail instead of selecting substitutes.

## Remaining skills

The [MVP audit](mvp-skill-audit.md) is the initial inventory snapshot. Current
prepared coverage is Brave Slash, Blade Beam and Satellite Beam. Six commands
remain legacy because required effect files are missing:

| Skill | Missing converted source stem(s) |
| --- | --- |
| Climhazzard | `atk_powergeyser_001_purple` |
| Healing Wind | `eff_fullcure_white` |
| Curaja | `wm_1029_cure5_front` |
| Banishga | `wm_1017_banish2_back`, `wm_1017_banish2_front`, `wm_1006_banish_back`, `wm_1006_banish_front` |
| Big Shot | `sp_20108_hardshot` |
| Grenade Bomb | `eff_convergence_explosion_orange` |

Supply the original effects/dependencies or explicitly choose an intentional
alternative before calling those commands complete. Assets alone do not resolve
their healing, debuff or other source-mechanics limitations.

## Verification performed

- Seven pipeline tests and 33 combat regression checks passed, including motion
  review gates, source rotation/layer matching, one group damage event, screen-fit
  geometry, blend/depth selection and mask cleanup. TypeScript and production build
  passed. The production copy contains the current sheet hashes and presentation.
- All 90 marker, 180 beam and 150 fade frames were inspected with Pillow. Marker
  pixels are visible on local F10..73, beam on F0..166, fade alpha on F3..117.
  The final beam atlas is 3072 x 3840; early F38/F44 contain one outgoing-ray pixel
  at the lower-left corner. Central burst/main beam fit; this ray intentionally
  leaves the viewport. No other edge pixels above threshold 12 were found.
- The final reactor cast showed 885 on all three targets and selected HP
  3500 -> 2615. The forest cast showed 855 each and selected HP 3500 -> 2645.
  Barret's MP changed 80 -> 35; both casts returned to Cloud's selection with
  Barret marked acted. The command dock remained clear, and the original alpha
  fade covered the arena without a partial rectangle.
- Restart with outstanding skill timers restored HP 3500 and MP 80, removed
  effects/fade and did not apply stale damage afterward. Repeated casts after
  reset worked. Screenshots are in the ignored research output folder.
- No complete run, original FFBE comparison, single-enemy Satellite Beam cast or
  newly implemented healing/debuff mechanics were tested in this milestone.
