# Source combat audio review

The Memorial master SHA-256 is
`ab176368d6a8faa9319f471f3f0138ec4c578cf131c759a593479dac9487183f`.
The pinned original bank and decoded PCM hashes are in
`tools/presentations/source-audio-review.json`. The table below covers
serialized effect-group cues. It does not certify other native audio
paths, equipment-dependent voices or cue waveform selection.

| Source skill | ID | Original cue frames in reviewed composition | Admission |
| --- | ---: | --- | --- |
| Brave Slash | 214800 | 3:1 | Published |
| Blade Beam | 214810 | 3:1, 7:1 | Published picture omits the white attack prefix and places blue slash at F5 |
| Climhazzard | 214820 | 2:1, 3:1, 23:98 | Published picture omits white attack prefix and runs the unshifted ability clock |
| Cross Slash | 214790 | 3:1, 6:614 | Published |
| Trigger Smash | 227151 | No sound entries in resolved effect groups | Distinct unlock follow-up 507650 has F70:81 on group 5025791 |
| Seal Evil | 229751 | 40:600, 61:100, 81:100 | Published |
| Armor Break | 201150 | 74:7+58 | Published |
| Aura Ball | 203280 | 41:82 | Published |
| Braver (FFVII: AC) | 233930 | 5:98+58 | Published |
| Shield Break | 202180 | 41:1+58 | Published |
| Chant | 210550 | 41:25 | Published |
| Cunning Hero's Sword | 1323010 | 38/44/50/56/62/68/74/80/86:1 | Published |
| Helm Break | 202190 | 41:1+58 | Published |
| Piercing Gleam | 203050 | 20:1, 52:1+58 | Published |
| Iai Strike | 200300 | 41:1 | Published |

All listed cues use the native common-bank branch, SE.acb. F numbers for
Motion 1 are composed with the recipe's reference body, as is the current
prepared visual presentation. The runtime preserves that composition
when another body form executes it. A different original per-form
composition, for example Delita NV's attack prefix, requires its own
visual/choreography proof before changing the Source clock.

| New cue | vgmstream one-based stream | Name |
| ---: | ---: | --- |
| 25 | 739 | se_magic_heal_1 |
| 58 | 759 | se_magic_tolerance_break_1 |
| 82 | 841 | se_special_status_down_1 |
| 98 | 822 | se_special_explode_1 (same wave alias se_seiken3_common_explosion) |

## Classic Cloud admission

Brave Slash and Cross Slash start the reviewed attack body at Source F0.
Their compiled visual plans already carry the Motion 1 composition.
Both show the white slash at F3 (unit group 1000290 starts at F2 and its
member and cue each have offset 1). Cross Slash starts its paired Kyōgiri
effects at F6 with the cue on the front group 8003731. Brave Slash's pink
impact starts at F6 without an additional original cue. The legacy plan
omitted audio metadata, so publication restores the complete master group
list from a reviewed fingerprint. The separate clock fingerprint pins the
plan hash and visual members. Changing either requires fresh review.

Brave Slash follow-up. The master command uses process 1 with one attack
marker. The pink group 5008050 has one BMB member (effect 5006440) and
empty sound and auxiliary records. Its resource inspection exposes visual
dependencies. The inspected classic Cloud attack CGS tracks (5★, 6★, 7★
and NV) did not identify a separate body sound binding. The archived
native damage dispatch establishes System 69 for critical damage, with
no Brave Slash-specific impact established by that evidence. The archived
FFBE Brave Slash MP4s have no audio track, and the separate FFBE Trace
instance was offline. This establishes one authored effect-group cue.
Native live audio and other dynamic paths remain unverified.

The browser comparison with seed `skill-sfx-20` recorded one actual
Web Audio start for SE:1 in each action. Brave Slash dispatches through
the Source frame callback at F3, where the white slash starts. The pink
member and reviewed damage marker are at F6 (50 ms later on a 60 FPS
Source clock). The measured browser run dispatched the cue 72.8 ms
before damage. The standard attack dispatched the same buffer at damage
time. Use `review_skill_sfx.mjs <Playwright module path> http://127.0.0.1:3001
cloud_brave_slash` with and without `--basic-comparison`.

Cue 614 follows SE.acb CueNameTable through sequence 613, track and synth
647, waveform row 600 and embedded AWB ID 333. vgmstream r2168 identifies
one-based stream 334 as se_kyougiri_1 (257532 samples, mono 44100 Hz).
Use `vgmstream-cli.exe -i -s 334 -o kyougiri.wav SE.acb`. The WAV hash is
in the review manifest. The cue dispatches once per Source cast and the
existing battle cleanup stops any active tail at scene shutdown.

Blade Beam retains green beam F0 and blue slash F5. Its native composed
clock puts those members at F2 and F7 and also contains the white slash
at F3. Climhazzard retains its unshifted purple members at F0 and F20
with explosion group 7000970 dispatching F21 on that clock. On the
composed original clock it dispatches at F23. The separately composed
white slash is missing from both published visual plans. Complete audio
admission remains open for both. Retiming or adding visual members needs
a separate review.

Trigger Smash 227151 is a Motion 2 wrapper. Groups 5014560 and 5025792
both refer to effect 5012930 (atk_lightup_001_yellow.bmb). Neither has an
audio or auxiliary group record. The prepared plan also has an empty
audio list and the magic attack body track has no identified sound
binding. Process 130 unlocks 507650, whose separate group 5025791 has
SE cue 81 (se_special_status_up_1) at F70. The current wrapper renders
group 5025792 there. No trace ties cue 81 or any other cue to the wrapper
cast itself, so its current presentation has no published sound.

## Standard attacks

Original actor attack clips have their own CGS pose timing and CGG
geometry; neither an apparent weapon swing nor a damage marker is the
source of these cue IDs. The native master effect groups independently
provide these events.

| Reference form | Damage frames | Common-bank cue frames |
| --- | --- | --- |
| Classic Cloud 5★ 207000105 | 4 | 3:1 |
| Aerith 5★ 207000405 | 61 | 60:7 |
| Jack 5★ 254000605 | 24, 56 | 20:1, 52:1 |
| Cloud AC 7★ 207001607 | 10, 21, 36, 79 | 9/20/35/78:1 and 78:29 |
| Delita NV 253000227 | 34, 38, 50 | 33:1, 37:1, 49:2 |
| Barret 5★ 207000205 | 90, 98, 106, 114 | 89/97/105/113:12 |

The sampled attacks often have a cue just before a damage marker, but
neither count nor offset is universal. The condensed FFRogue basic
attack retains its reviewed actual-impact binding. Per-form original
multi-motion scheduling remains separate until its correspondence with
the FFRogue body action is established. No general enemy-attack,
independent impact/hero reaction or hero K.O. cue was newly verified.
Existing native death selectors and the critical cue remain independent.

## Publication and playback

The publisher parses raw tuples, requires a reviewed source identity and
matching effect-group fingerprint, checks the decoded file hash, and
rejects unverified dispatch profiles or events outside the visual clock.
New reviews reuse the same admission path. No skill-specific runtime
dispatch is needed. The prepared scene consumes each admitted cue once
as its clock crosses the frame. Basic-attack audio belongs only to
basic actions. A separate defeat sound may coincide with an authored
cue. Healing and status playback use their own reviewed cues.

The shared audio manager preserves original onsets even for nine
authored sword cues 100 ms apart. When an authored onset would exceed
the two-same-cue or six-voice budget, the oldest applicable tail receives
a short release. This is FFRogue mixing, not verified native mixing.
Muted effects still suppress playback.

## Reproduction

- `python tools/audit_source_combat_audio.py rawdata/assets/static_data/ffbe-data.db <SE.acb>`
- `node --test tools/test_skill_support.mjs`
- `node tools/review_skill_sfx.mjs <Playwright module path>`
- `node tools/review_combat_sfx.mjs <Playwright module path>`

The browser review uses current Vite on port 3001, an isolated Chrome
profile, the production battle commands and reproducible normal draws.
It checks frame dispatch and actual decoded Web Audio starts for all
ten admitted skills. Cunning Hero's Sword also exercises an early K.O.
and the reward transition. Recordings and exact seeds are written to
`tools/data/combat-sfx/skill-review/` from the browser mix.
