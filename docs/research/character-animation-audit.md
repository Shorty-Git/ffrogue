# Character animation audit

## Source coverage

The local `ffbe_asset_dump-main/unit_animated_csv/` tracks were compared with
the manifests actually loaded by the game:

| Character | Runtime form | Raw tracks | Exported tracks |
| --- | --- | --- | --- |
| Cloud | 207000105 | 12 | 12 |
| Aerith | 207000405 | 13 | 13 |
| Barret | 207000205 | 13 | 13 |

Barret already uses form 207000205, despite the older handover naming 207000204.
The existing form was preserved. Cloud previously exported only seven tracks.
Added `jump`, `magic_atk`, `magic_standby`, `standby`, and `win_before` using
the existing ffbetool and export_unit.py pipeline, entirely from local files.
Previously exported Cloud sheets remain unchanged. No external effects were added.

## Runtime behavior

- Living heroes rest in `dying` at or below 25% maximum HP, otherwise `idle`.
  This threshold is an explicit game rule, not a value inferred from sprite data.
- Damage/healing refresh resting poses without interrupting actions or victory.
- Action returns and new encounters select the appropriate resting pose.
- Victory plays `win_before` once, followed by the looping `win` animation.
  K.O. heroes do not celebrate. Leaving the entrance early removes its listener.
- `dead` remains a non-looping K.O. pose. Pivots and ranged recoil are preserved.
- Newly exported auxiliary tracks are available but no new jump or casting
  choreography is introduced in this milestone.

## Verification

- `npm run build`: passed; existing Vite large-chunk advisory remains.
- `node tools/test_combat_regressions.mjs`: 16 checks passed, including HP
  boundaries, action precedence, repeated victory and interrupted entrances.
- Pillow verified dimensions and frame counts of all 38 exported sheets.
- Actual Phaser preview at `/tools/preview-character-states.html`: visually
  checked all three low-HP poses, victory entrances, subsequent victory loops,
  return to low-HP rest and healing back to idle.
- A complete multi-wave combat run was not replayed for this change.

The preview imports the real UnitActor implementation; its controls affect only
the preview scene. It is a development tool, not part of the production entry.
