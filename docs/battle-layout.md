# Desktop battle UI

The current target is desktop only: one 1000 x 1100 internal viewport scaled with
Phaser FIT. Old `?layout=portrait` and `?layout=desktop` links now use that same view.
Resizing preserves the run; there is no device detection or separate mobile layout.

The arena sits below a 48-pixel header and above a 300-pixel command dock. Three
party cards sit horizontally above Attack and three direct skill choices. There
is no modal command window. Select a hero, select a command, then Execute or Space.
Selecting a prepared hero never executes. Clear cancels their plan. 1/2/3 select
heroes and Q/W/E/R select commands. Skill hover text gives descriptions; costs and
unaffordable states remain visible. Actor clicks select heroes and enemy clicks
change the target. Prepared commands on other heroes persist.

Both arenas use proportional cover. `src/data/battleArenas.ts` defines source
sizes and reviewed floor bounds: forest 56–80%, reactor 54–76% of source height.
Floor bounds are transformed through the same cover scale and vertical crop as
the image, with clearance above the HUD. These are visual layout settings, not
coordinates recovered from FFBE. Both backgrounds are static.

Formation slots use normalized positions within that floor region. Cloud and
Barret retain their general front/lower arrangement; Aerith moves closer to Cloud.
Enemies have explicit top/center/bottom roles. The center is also the single-boss
slot. Top and bottom are staggered right to leave space around the center sprite
and its body. A future large boss still needs its actual sprite bounds
reviewed; the current center preview uses the existing rat.

Comparison links:

- `http://127.0.0.1:3000/?arena=forest&formation=trio`
- `http://127.0.0.1:3000/?arena=reactor&formation=trio`

`formation=trio` replaces only the first encounter with three normal rats at the
existing normal-rat 3500 HP each. Without it, existing encounters and HP remain.
`arena=reactor` selects prepared `battle_bg_2013_02.jpg`, the reactor visibly marked
01. Provenance is stored beside the image. The first forest image is unchanged.
Reload/Restart preserves the URL choices; comparing URLs starts fresh battles.

The existing melee offsets were audited against processed hit-frame opacity:
Cloud attack frame 2 spans approximately -206 to +24 pixels from his logical foot
at runtime scale 2; Aerith frame 19 spans -282 to -116. Their reviewed approach
translations of +72 and +160 pixels respectively place the visible attack across
the target. Those source-dependent offsets remain unchanged. Approach Y and target
selection come from the selected enemy, with return to the hero's exact home slot.

## Reviewed assets

`py tools/export_battle_ui.py` reads the exact atlas regions from five reviewed
Godot `.tres` resources in `assets/ui/battle/`. It writes standard PNGs and a
provenance receipt to `public/assets/ui/battle/`. Runtime code never parses Godot
resources. The shared dock uses the original command plate, party strip, attack,
magic, and ability icons. No skill mechanics or effect associations are changed.

No TTF/OTF/WOFF text font was found in the source package. Inspected FNT files in
`assets/ui/font/` contain numeric glyphs, not a complete alphabet. The desktop UI
uses Arial for readable labels rather than claiming to reproduce the FFBE font.

## Verification

Production build and all 29 combat regression checks passed. The party-selection
regression now checks that repeated selection preserves a plan and requires explicit
execution. Browser review covered all three hero cards, direct skill choices,
preparation preservation, clearing, actual Brave Slash and Climhazzard, healing,
Banishga, Barret's area attack, normal attack, enemy phase, subsequent rounds,
unaffordable skills, victory, reward selection, and the next two-enemy encounter.
Keyboard hero selection, skill selection and execution were exercised as well.
A full six-battle run and the defeat screen were not played through.

Formation pass verification: both three-rat previews were visually inspected.
Cloud attacked the bottom rat, Aerith the top rat, and Barret the center rat on
the reactor. Selected targets took damage, heroes returned home, all three enemy
turns completed and returned to their slots, and round 2 began. The added melee
regression exercises actual approach, target damage dispatch and return callbacks
for both melee heroes across all three rows in both arenas. A geometry check
validated each final foot against the reviewed source floor and the HUD boundary.

## Selected-target health display

Enemy names and HP bars no longer render under every enemy. `EnemyTargetPanel`
shows only the selected living enemy in screen space below the top-left header.
The existing marker identifies that enemy on the field. Damage updates immediately,
with a delayed chip bar; changing targets sets both bars directly to the new HP,
so damage does not carry over between targets. No panel is shown during spawning,
victory, defeat, or without a living selection. Other enemies' HP requires selecting
them. Floating hit numbers and sprite defeat effects remain.

All enemy positions moved 4% of arena width left. The upper slot moved from 0% to
16% down its reviewed floor region, creating more clearance from the reactor's
rear railing. Hero positions are unchanged in this pass. These three slots remain
a small-enemy formation; future medium enemies should use fewer slots and a large
boss should use the center slot with its actual sprite bounds reviewed.

The selected-target regression covers damage, different maximum HP, target switches,
defeat, and empty selection. Browser review confirmed the target name/HP switches
from A to B, B takes damage, and returning to A shows its untouched full HP.
