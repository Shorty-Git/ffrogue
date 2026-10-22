# Combat audit — 2026-10-22

## Fixes

- `BattleScene.ts`: lock commands while encounters spawn; exclude unused pooled enemies from combat by clearing their HP; cancel overlapping target-marker tweens.
- `BattleScene.ts`: wait for outstanding ranged impacts before advancing the turn; reject impacts on dead targets or after victory. The existing synchronous victory lock remains separate from celebration, allowing the acting hero to return home first.
- `BattleScene.ts`: reset through Phaser scene restart, with fresh run fields and cleanup of scene click and keyboard listeners. This cancels old timers, tweens and sprite animation listeners via scene shutdown.
- `BattleScene.ts`: guard repeated reward selection and progression; preserve explicit zero target offsets; remove geometric magic-orb placeholders while preserving impact delay and damage.
- `BattleScene.ts`, `TargetDummy.ts`: make chip-bar delays part of cancellable tweens. Repeated HUD refreshes no longer snap the chip bar to the current HP.
- `TargetDummy.ts`: register pointer handlers only once across respawns; ignore damage on defeated targets; start defeat fade only once; restore the K.O. label alpha on respawn.
- `UnitActor.ts`: derive K.O. from HP; share the skill motion type for attack configuration; reject invalid MP costs; support signed recoil offsets using their absolute magnitude for the threshold.
- `manifest.ts`, `PreloadScene.ts`: declare the optional `character | monster` discriminator and remove the `any` cast; clean up the loading progress listener after completion.

## Already correct

- Boot, preload and battle scenes contain no external effect sprite references or `battle_bg` texture references. The dark native gradient already renders at depth -100.
- Hero pivots are taken from animation metadata. Normal attack update listeners are removed on completion. Enemy click listeners were the repeated-registration problem.
- HP and MP persist between encounters; only an explicit run reset restores starting resources.
- `mpCost`, `attackType` and `targetOffsetX` have required resolved types; optional constructor values receive defaults. `recoilOffsetX` remains optional with a zero default.

## Validation and limits

- `npm run build`: TypeScript and Vite succeed. Vite still reports the pre-existing bundle-size advisory for the approximately 1.54 MB bundle containing Phaser. This is not a compiler warning; the threshold was not raised to hide it.
- `node tools/test_combat_regressions.mjs`: deterministic regression checks against actual transpiled combat methods with mocked engine boundaries.
- Checked 35 loaded sprite sheets against manifest dimensions, frame counts, durations and pivots; checked all loaded hero skills for valid MP costs, supported scopes and existing motions. Checked the generated HTML and JS entry point.
- Browser rendering, animation appearance, hit-stop feel and actual Phaser restart behavior were not exercised interactively. The restart lifecycle was also checked against the installed Phaser source.

## Remaining scope differences

- Skills still use one timed impact; `attackFrames` multi-hit execution remains a separate milestone. The type also permits `single_ally`, but the executor has no branch for it and the current datasets do not use it.
- The run still has six fights, with explicit encounters for fights 1 and 2 and scaled fallback encounters afterward. The handover's five-fight/elite/boss structure is not implemented by this audit.
- Historical external-effect presets remain in offline import tools; runtime scenes do not load them. No dump assets were imported or regenerated.
