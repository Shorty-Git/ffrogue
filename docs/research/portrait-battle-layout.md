# Portrait battle layout

## Reference and limits

The [Square Enix 2016 announcement](https://www.jp.square-enix.com/company/ja/news/2016/html/46577215063bc84a0862cf23f8a034e94439bcbb.html)
contains a complete original battle screenshot: enemies on the left, staggered
heroes on the right, and individual command/status panels below the field.
Its supplied image is 1242 by 2136 pixels. Those are screenshot dimensions,
not evidence of FFBE's internal logical viewport or formation coordinates.

The [official support FAQ](https://www.jp.square-enix.com/FFBE/blog/faq2.html)
describes flicking a unit panel to the right to access summon commands.
The [ability-selection article](https://www.jp.square-enix.com/FFBE/blog/2021/10/ability.html)
documents per-unit selection and changing the enemy target during selection.

Our viewport is deliberately 720 by 1280, following the approved portrait
direction. Positions are an adaptation for three heroes, not an extraction of
original engine coordinates. The game keeps sequential execution; FFBE-style
concurrent chaining is intentionally outside this interaction contract.

## Layout contract

- `src/ui/battleLayout.ts` owns viewport dimensions, normalized formation slots,
  the shared art scale and the reserved party region.
- Three 80-pixel party rows with 8-pixel gaps occupy a 276-pixel bottom region
  (21.6 percent of the viewport). HP, chip damage, MP and the prepared action
  remain visible when commands are closed.
- The command window floats immediately above the party region and disappears
  after preparing an action. It can temporarily cover part of the battlefield.
- Tap an available panel without a plan to open commands. Choose Attack or
  Skill to prepare, without spending MP or the turn.
- Tap a prepared panel to select that hero and commit their action immediately.
  Input stays locked until the action finishes; other heroes' plans persist.
- Swipe right at least 28 logical pixels, tap the edit chevron, or tap the actor
  to edit commands. These paths never commit an existing plan.
- Escape goes back from skills, closes commands, then clears a prepared action
  when the window is already closed. Space/Enter still commits the selected
  prepared action, or prepares an affordable skill in the skill submenu.
- Row gestures commit on pointer release. Pointer exit, vertical drags and
  presses beginning during a locked phase do not execute actions.
- The HTML host leaves canvas centering to Phaser's Scale Manager; flex
  centering combined with Phaser margins would displace the portrait canvas.

## Animation coordinates

Character recipe scale remains an asset-level setting. A shared viewport factor
of 0.8 turns the existing 2.5 sprite scale into 2.0. Prepared effects and melee
arrival offsets use the same factor. Monster spawn bounces, reset scales and
marker height follow the actual rendered sprite scale. Manifest foot pivots,
recoil metadata, attack frame timing and effect target anchors stay intact.

The three reward cards fit the viewport width and wrap their text. Their slide
distance and the next-battle button position account for the taller party area.
This does not import any new background or claim that every source background
is a directly usable portrait scene.

## Verification

Build/type checking, deterministic combat checks and asset-pipeline checks are
run separately from browser rendering. Browser observations and screenshots
are recorded in the task handover; raw reference images and screenshots stay
under ignored `tools/data/layout-reference/`.

Verified for this milestone:

- `npm run build`: passed; the existing large-bundle advisory remains.
- `node tools/test_combat_regressions.mjs`: 27 checks passed, including deferred
  planning, explicit row commitment, edit paths and rejection of locked inputs.
- `npm run test:pipeline`: six checks passed.
- Browser: prepared Cloud/Aerith/Barret commands without MP expenditure;
  right-swiped Cloud's prepared Brave Slash into editing without committing it.
  A separate playthrough executed Brave Slash (100 to 82 MP), Banishga
  (220 to 190 MP) and Satellite Beam (80 to 35 MP), then reached round two
  after the enemy counterattack. Cloud's HP persisted at 2975/3200.
- Browser: finished battle one in round two, displayed all three reward cards,
  chose Courage Buff and advanced to the two-enemy encounter. No browser error
  logs were captured during that playthrough. This is not a complete six-battle
  run or a verification of every skill's original VFX.
