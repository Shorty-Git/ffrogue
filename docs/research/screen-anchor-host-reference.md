# Explicit host reference for screen-anchored effects

2026-10-25. Follow-up to [the host scene contract](preview-host-scene-contract.md)
after the user reported incomplete Climhazzard flash coverage. This is a reviewed
research-host adaptation, not new proof of FFBE's original screen rectangle.

## Finding and implementation

The strobe is large enough, but the earlier bridge treats source `screen` as the
battle arena rectangle. That excludes both header and dock, placing its center
126 preview pixels above the center of the full host viewport for the current
game layout. Its source group adds Y150, and its hierarchy contributes further
translation. Enlarging the source texture/geometry would conceal this placement
distinction rather than establish the intended reference.

`presentationAnchor()` now accepts an explicit `bridge.screen` rectangle. It is
used only for `placement.rectangle === 'screen'`; target-side and target-unit
paths retain their previous inputs. Without this field the old arena-only screen
baseline is unchanged. Invalid explicit screen rectangles fail.

New game/native-proportion host contexts default to the full host viewport as
their declared screen reference. Legacy study defaults to the old arena-only
reference. The new checkbox `Screen anchors use full host viewport` can switch
between them without touching source scales, alpha, timing or other anchors.
Changing the scene context selects its declared default again. Browser receipts
record `fullHostScreen`; the existing placement notice now identifies its old
screen rule as a baseline rather than incorrectly describing the active rule.

This is a host-contract choice. No original Climhazzard runtime screen rectangle
was captured here; the source token 99999999 and the decoded axis/offset metadata
do not by themselves prove the bounds of that rectangle in every native scene.

## Quantified source-plane footprint

Using the current strobe source, shared evaluator, native X display helper and
source member scale at preview F30 / skill F12:

| Context | Reference | Plane center Y | Plane width/height | Bottom | Arena bottom | Uncovered bottom band |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| game 1000x1100 | arena-only | -58.8125 | 1464.375 | 673.375 | 800 | 126.625 |
| game 1000x1100 | full host | 67.1875 | 1464.375 | 799.375 | 800 | 0.625 |
| native proportions 640x1136 | arena-only | -40.8125 | 1464.375 | 691.375 | 836 | 144.625 |
| native proportions 640x1136 | full host | 85.1875 | 1464.375 | 817.375 | 836 | 18.625 |

Coordinates are top-left preview pixels. Both references retain exactly the same
plane dimensions. The remaining approximately 19-pixel native-proportion band
is not silently removed: that context uses the game's 300-unit dock rule, not
the original measured FFBE UI layout. No arbitrary extra offset, rounding-based
expansion, crop or opacity adjustment was added to make it disappear.

Ignored receipt: `tools/data/host-view/strobe-screen-anchor-bounds.json`. Its
values describe the current evaluator under declared host rectangles, not
native Climhazzard vertices or a synchronized original frame. Reproduce by
evaluating `eff_strobe_white_a50_f30.bmb` at effect F11, obtaining its parent X
scale, and applying `presentationAnchor()` with/without `bridge.screen`, then
`nativeParticleXDisplayMatrix()`. The shared renderer uses those same helpers.

## Review and checks

Current comparison remains port3138 / skill214820. In game-host view, use F30
and toggle `Screen anchors use full host viewport`. The original rectangle
baseline remains available and the foreground checkbox remains independent.
Native proportions remain an explicitly adapted view, not a corrected native
scene replay. Source files and published effects were not changed.

Tests executed: full Node runner 84 pass, zero skips. The new anchor regression
checks the exact +126 screen-center shift, unchanged target-side anchor, preserved
old default and invalid-screen rejection. The targeted host/player suite passed
21 tests before the final syntax guard; all six host tests passed afterwards.
Browser testing caught a duplicate local control name shared with the older
screen-fit toggle. It was corrected and the inline-module syntax regression now
prevents that loading failure. Browser F30 off/on inspection confirmed the
coverage shift at equal source dimensions; the full-host switch is left on.
The browser reports all 49 existing GPU fixtures passed. No new emulator
recording or game build was performed. Browser review
and current screenshot evidence are retained under ignored tools/data/host-view.

Next original-fidelity gate: obtain/trace the native Climhazzard screen rectangle
and foreground scene context if exact original coverage is required. Do not
promote this host adaptation into an undocumented native anchor rule.
