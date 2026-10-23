# Clockwise effect presentation correction

The developer requested both beams face straight left through enemies rather
than down-left. Source files, source XYZ transforms, scale, target anchors,
damage events, MP costs and action durations remain unchanged.

| Effect | Clockwise artwork rotation | Pivot |
| --- | --- | --- |
| Blade Beam green wave | 90 degrees | dominant bright body, tracked each frame |
| Satellite Beam | 45 degrees | fixed target origin |

Rotating the complete moving effect around its emitter would rotate its flight
path as well. Blade Beam instead rotates its artwork around its moving body.
That body's pivot uses the largest 8-connected component above RGB maximum 80
and alpha 12. This excludes the detached light burst that would shift a whole-
image bounding-box pivot at F30. If no bright component exists, visible bounds
above RGB/alpha 12 provide a fallback; empty frames fall back to the origin.
The source files and arbitrary opaque offset fields are not edited or guessed.

Satellite Beam retains source emitter Z45 as provenance. A separate screen-space
clockwise artwork correction makes its down-left ray horizontal. Source hit/MP
metadata remains separate from the game's existing simplified damage event.

The shared baker writes reviewed angle/pivot metadata and checks it during
publication alongside recipe/source/resource/sheet hashes. Every output cell is
clipped before rotation, preventing artwork from painting into neighboring frames.
No per-character runtime transform or loader was introduced.

## Verification

- Both effects rebaked and visually compared before publication. All 90 Blade
  Beam frames and 180 Satellite Beam frames have no RGB-above-12 edge contact.
- Satellite Beam's bright-pixel principal axis at local F70/F105/F140 changed
  from approximately -44.8..-44.9 degrees to +0.16..+0.20 degrees (axis measurement
  has no directional sign). The ray now points left at the target's height.
- Frame F20/F30/F40 body tracking was checked, including the detached flash.
  Tests cover horizontal travel preservation, ignoring detached flashes, the
  clockwise ray transform and rejecting unreviewed artwork adaptations.
- Nine pipeline tests, 33 combat regression checks and production build passed.
  Registry, prepared character metadata, recipe hashes and production sheet
  hashes were checked after publishing both characters.
- Both real game casts were checked on the reactor trio. Blade Beam showed
  1122 damage on each target, Cloud MP 100 -> 70. Satellite Beam then showed
  777 each, Barret MP 80 -> 35. The corrected directions, visible target impacts
  and clear command dock were inspected. Existing damage timing stayed F30/F165.
- Research screenshots and numerical/image comparisons are ignored under
  `tools/data/effect-orientation/`. No original FFBE fidelity comparison or full
  run was performed. Both-arena gameplay was checked in the prior import; this
  orientation correction was played on the reactor scene.
