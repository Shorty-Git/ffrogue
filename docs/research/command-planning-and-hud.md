# Command planning and HUD update

The subsequent [portrait layout](portrait-battle-layout.md) replaces the permanent
two-panel HUD with three compact party rows and a transient command window.
Prepared row taps now commit, while right swipes and chevrons edit actions.
The planning and sequential-execution contract below still applies.

## Interaction contract

- Select any living, unacted hero by sprite or party row/portrait/name.
- Attack and skill choices prepare an action for that hero; MP/HP and action
  flags do not change. Preparing magic selects `magic_standby`, physical commands
  use `standby`. Both loop while waiting; other heroes retain their own plans.
- Execute (or Space/Enter from the main panel) commits only the selected hero.
  MP is rechecked and charged at commit. While that action runs, all command
  selection/execution is locked, preventing simultaneous attacks/chains.
- After completion, any remaining hero can be selected and committed. The enemy
  phase begins only after all living heroes have acted. Selecting Barret first
  cannot skip earlier party slots.
- Source target references are saved per plan. Selecting a different enemy while
  editing that plan updates its target. If it is defeated before execution, the
  existing executor selects a living fallback.
- Back/Escape in the skill menu returns to the main panel and restores the saved
  plan's pose. Escape/Backspace on the main panel clears that hero's plan.
- Space/Enter key-repeat is ignored so holding a key cannot prepare and commit
  without a second press. Skill keys 1/2/3 prepare rather than immediately cast.
- Magic preparation plays one exported cycle before the cast; stale callbacks
  check combat state. K.O./acted heroes cannot be selected. Victory and scene
  restart clear plans; scene shutdown cancels timers and destroys UI objects.

This is a project-specific sequential command model, not a claim to reproduce
every interaction of the original game. Square Enix's official support article
describes per-unit ability selection and switching the selected enemy during it:
[FFBE ability-selection information](https://www.jp.square-enix.com/FFBE/blog/2021/10/ability.html).

## Presentation and provenance

- Actual local FFBE `unit_icon_207000105.png`, `207000405.png`, `207000205.png`
  portraits are copied into prepared character folders and declared by recipe.
- Shared portraits appear in the command header and party rows. Row selection
  covers the full portrait/name/resource area even when it is not active.
- The navy/slate HUD uses consistent typography, gold active outlines, muted
  completed rows, HP/chip-damage/MP bars, and distinct prepared-action labels.
- The previously inactive Defend placeholder is replaced by the actual Execute
  control. The command panel shows the prepared action and cancellation shortcut.
- Empty prototype slot rings and the hard horizon divider are removed. Formation
  coordinates and the native dark gradient remain unchanged.
- Raw skill enum names and source formula descriptions are removed from hover
  text; the player sees skill name, scope, MP cost and preparation guidance.

## Validation

Automated checks cover free selection, wrapping available slots, physical/magic
readiness, low-HP restoration, stale magic preparation, durable per-hero plans,
deferred MP payment, concurrent-action rejection and insufficient MP at commit.
Build, browser verification and actual tested sequence are recorded in the task
completion message. Unused jump/limit choreography and new buff mechanics are
outside this change.

Actual validation: build passed (existing Vite chunk-size advisory); 25 combat
regression checks and 6 pipeline tests passed. The portrait-aware Cloud import
was executed and validated. In the real game, prepared Brave Slash, Healing Wind
and Barret's basic burst without MP expenditure, then committed Barret -> Aerith
-> Cloud. Confirmed separate readiness poses, 26/18 MP payment on commit, pending
commands surviving other actions, enemy damage after all three actions, and
round 2 with empty plans. Escape canceled a newly prepared attack without
spending a turn. Layout was checked for all three portrait headers and skill menus.
No full six-battle run was replayed. Browser proof is saved under
`tools/data/characters/cloud/planned-party-hud.png` (ignored).
