# Blade Beam offline choreography review

Current orientation update: the developer requested a clockwise correction after
the original presentation import. The wave now uses +90-degree artwork rotation
around its tracked bright body at the original size, with unchanged movement,
damage and timing. See [the current orientation review](effect-orientation.md).
The unrotated and counterclockwise previews below are historical experiments.

Current status: the developer selected the original unrotated presentation and
rejected the rotated/contact-recoil experiment below. Blade Beam is now published
through the shared stationary area presentation. It plays green at F0 and blue
at F5, applies one combined 3x hit to all living targets at F30 (500 ms), then
completes after F96. No additional tint, recoil or camera shake is used.

The original source hitCount 2 and F4/F8 are retained as provenance; this is an
intentional gameplay adaptation, not a reproduction of the source hit distribution.
No per-character loader or Blade-Beam-specific runtime branch was added.
`tools/effects/blade_beam_wave.json`, `blade_beam_hit.json` and Cloud's
`presentation` configuration are the reusable import example.

Verification: 7 pipeline tests, 31 combat regression checks and the production
build passed. All 90 frames of each prepared sheet were checked for clipping:
none touch an edge above the RGB threshold of 12. Green is visible on F1..59,
blue on F0..19. Both published sheets are 6144 x 4608 and together approximately
1.8 MB compressed. Source/resource/recipe/sheet hashes were validated on import.
In the real reactor trio, every rat went from 3500 to 2582 HP (918 damage each),
Cloud spent 30 MP and the turn advanced to Aerith. In the forest trio, all three
936-damage numbers appeared during the unrotated wave, and the selected enemy
went from 3500 to 2564 HP. Original-game pixel fidelity remains unverified.

The sections below record earlier research and the superseded rotation experiment.

This follows the [MVP skill audit](mvp-skill-audit.md) and the
[character import standard](../character-import-workflow.md). It adds a local
research preview only. No effect recipe, prepared runtime content, skill executor
or gameplay behavior was changed in this milestone.

## Reproduce

From the repository root, run `node tools/preview_blade_beam.mjs`, then open
`http://127.0.0.1:3103/`. The page uses the installed local Effekseer WebGL SDK;
it does not download assets. It first renders diagnostic sheets, then enables
Play, Restart, frame seeking, arena selection and an explicit raw-offset hypothesis.

Outputs are ignored under `tools/data/blade-beam-preview/`: `plan.json` records
source and tool hashes; `results.json` records sampled pixel bounds and emitter
liveness; five PNG contact sheets show isolated effects and both compositions.
Each sheet is 1000 x 880. Render samples are F0, 1, 4, 5, 8, 12, 20, 30, 45,
60, 90, 120, 150 and 180. One update occurs before drawing each labeled tick,
matching the existing exporter convention. These are sampled observations, not
proof that every intermediate frame fits.

## Source mapping

Cloud's acquired ability 214810 uses stationary movement type 4 and motion type 1
(`atk`). Its two damage events are F4 and F8, weighted 50% each, at 60 Hz. The
prepared body track has 12 frames totaling approximately 950 ms. The preview
holds its final attack pose after completion; return-to-idle is outside this study.

| Component | Group / effect | Absolute start | Anchor | Source scale |
| --- | --- | --- | --- | --- |
| `atk_aerialslash_001_green` | 5003901 / 5006511 | F0 | target-group, front | 300% |
| `atk_slash5_blue` | 1000660 / 1000660 | F5 (group F4 + member F1) | target, front | 100% |

Both converted files and their eight referenced resources are available. The
green member retains raw fields `99999999:1:2:2:-1100:0`; their complete semantics
are not established. In particular, -1100 is not an approved world-space offset.
The default preview leaves it unapplied. The checkbox applies it literally on X
only to demonstrate that hypothesis, without treating it as a correction.

## Candidate placement and observed limitations

The preview reads the current game formation and arena crop from the TypeScript
layout. Three rats use their prepared sheets. Cloud remains at his home anchor.
Blue is emitted once per enemy, at its feet minus 50 game pixels. Green is emitted
once at the arithmetic mean of those anchors. The 50-pixel anchor convention and
uniform scale interpretation are candidates inherited from current runtime use,
not recovered FFBE choreography. Both effects use additive composition in front
of actors.

- Both effects rendered with their local resources. Blue appeared on all three
  targets in both scenes. Its lower trail touches the preview boundary at some
  sampled frames, including forest F8; placement still needs review.
- Green contains substantial internal movement. At scale 3 and F8, its isolated
  bounds are x711..784 in a 1000-pixel image with a 4096-unit camera: roughly
  864..1167 world units to the right of its emitter. This explains its early
  absence from the target area without assuming a missing texture.
- At F30 the green effect is near its emitter and much larger. The reactor
  composite has effect pixels at x0 and y799 (1361 pixels in the two-pixel edge
  band); forest has 1465 edge pixels. The default candidate visibly clips.
  At F4/F8, the main green burst is not centered on the selected group.
- Isolated green diagnostics use a wider 4096-unit camera to include its travel;
  blue uses 2048 units. No sampled isolated image touches a boundary. Do not
  confuse the wider diagnostic view with a proposed gameplay scale.
- Both green scales have no above-threshold pixels at F60 and no live emitter at
  F90. Blue has no above-threshold pixels at F20 but its emitter remains alive at
  F120 and has ended by F150. Composite emitters have all ended by F150. Visible
  tail duration and emitter lifetime must therefore be handled separately.

Pixel measurements count RGB maxima above 12 against black. They exclude darker
particles and do not measure the actors or background. Seeds are deterministic
for this preview, but cross-GPU pixel identity was not tested.

## Decision and next milestone

Do not publish this placement as reviewed Blade Beam playback. First establish
the green member's coordinate/offset and scale conventions using an authoritative
renderer reference or an explicitly accepted adapted choreography. A guessed
offset or a timing shift would conceal the present mismatch.

After placement review, the next implementation milestone can add a shared
multi-effect, multi-target timeline executor with two weighted damage events,
cleanup and reviewed sheets. The current single-hit executor does not establish
support for this skill simply because its assets render.

## Verification performed

The local page generated all five PNGs and the JSON report in the in-app browser.
Both arena contact sheets and isolated effect sheets were visually inspected.
Play/Restart, arena selection, frame seeking and the explicit offset hypothesis
were checked separately. Node syntax checks and output/hash assertions passed.
No game build, combat regression run, original FFBE comparison or runtime skill
test was performed for this tools-and-documentation milestone.

## Forward-cut adaptation review (superseded)

The developer requested a forward-facing cut and enemy reactions when the wave
passes through them. The preview now includes an explicitly adapted mode and a
separate source-orientation selector. `orientations.png` compares unrotated,
X +90, X -90 and Y 180 variants. Rotating an Effekseer emitter also rotates its
internal travel, so a complete emitter rotation is not equivalent to changing
only the appearance of the moving slash.

The adapted mode rotates the rendered green artwork -90 degrees in screen space,
about the center of its measured visible bounds, while preserving that center's
horizontal travel. Artwork is reduced to 55% of the original 300% candidate.
These are explicit design parameters, not recovered source transforms. The
moving bounds include particles and can shift as the burst expands; this preview
is a visual experiment, not a production trajectory specification.

First contact is measured independently for each rat against a 48 x 60 torso
rectangle (feet Y minus 80 through minus 20). At least 12 pixels with an RGB
maximum of 80 trigger contact. Only the transformed green layer is measured;
blue flashes cannot trigger other targets. On contact the preview starts the
blue emitter, an 18-tick HIT label and a 12-tick horizontal recoil of up to 12
pixels. Blue becomes visible after the SDK's next normal update. No HP changes
or original two-hit damage distribution are implemented in this experiment.

Frame seeking reconstructs every preceding tick to reproduce contact events.
The adapted results and first-contact ticks are recorded for both arenas in
`results.json`; `adapted-reactor.png` and `adapted-forest.png` show the outcomes.
Disabling the adaptation restores the original F4/F8 marker and F5 blue timing.
The source rotation selector applies only to that comparison. Source timings
have not been overwritten. Runtime publication remains a separate milestone.

Verified contact ticks with seed 1 are F28 (466.7 ms) for top/bottom and F33
(550 ms) for center, in both arenas. The last two contact-sheet cells isolate
the green and blue layers at F30. They render in separate Effekseer contexts;
only green participates in contact detection. The adapted sheets, browser frame
seeking and three contacts in each arena were checked, along with JavaScript
syntax, PNG dimensions and preview provenance. Runtime combat was not tested.
