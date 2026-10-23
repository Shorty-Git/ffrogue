# Source inheritance review

This implements the first bounded follow-up to the
[renderer feature audit](original-renderer-feature-audit.md). Only the offline
research evaluator changes. No runtime skill, published sheet, damage value or
chaining mechanic changes.

## Supported corrections

- Explicit authoring `ParentAlphaRate=0` preserves the node's own alpha, including
  its material alpha. It no longer multiplies by the parent alpha.
- Explicit `TranslateParentNodeInfluenceType=OnGenerateTime`, with Matrix,
  Rotation and Scale influence all On, inherits the parent translation at the
  child's actual birth. Current parent rotation/scale and the child's own movement
  continue to apply. The source member's placement remains a separate adaptation.

The common transform evaluator resolves a parent's state recursively at any
requested effect time. Birth snapshots use the instance's fractional birth time;
they are not captured on the first render. Caches live for one evaluation, so
seeking, replaying and switching the A/B control cannot leave stale snapshots.

`original_inheritance.py` attaches explicit BMSLN metadata only after the existing
known-category binary/source comparison succeeds. It retains node and root legacy
flags separately, validates modes and finite 0–1 rates, and records provenance.
These inheritance fields are authoring supplements, **not decoded BMB offsets**.
They are enabled only by `prepare_original_preview.py --inheritance` and an
explicit list of matching authoring projects. Existing prepared plans keep their
old rendering policy.

## Remaining limits

Nonzero alpha influence still uses the previous multiplication assumption; its
compatibility-dependent native equations have not been established. Unsupported
transform combinations, including Brave Slash's three rotation exclusions, retain
the previous transform behavior with diagnostics. Source-less effects such as
Climhazzard's Power Geyser also retain the previous behavior with diagnostics.

This is partial inheritance support. Model vertex colors, billboard orientation,
model-surface generation, native sorting, field influence and parent expiration
are not implemented by this milestone. No correction values were added per skill.

## Preview

The prepared comparison plans are:

```text
tools/data/shared-skill-review/brave-slash/plan-inheritance.json
tools/data/shared-skill-review/blade-beam/plan-inheritance.json
tools/data/shared-skill-review/climhazzard/plan-inheritance.json
```

Repeat the preparation commands in the shared-skill review with `--inheritance`
and the output filename `plan-inheritance.json`. For Climhazzard also pass
`--authoring assets/battle_effect/eff_strobe_white_a50_f30.bmsln`; its original
binary passes the existing comparison too. Keep the previous experiment flags.

```powershell
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash/plan-inheritance.json --plan tools/data/shared-skill-review/blade-beam/plan-inheritance.json --plan tools/data/shared-skill-review/climhazzard/plan-inheritance.json --port 3119
```

Under **Rendering diagnostics and A/B comparisons**, toggle
**Use source inheritance fixes (alpha and birth position)**. On enables only the
two supported corrections; off restores the preceding evaluator behavior.
Useful comparison frames: Brave Slash preview F42 (effect F20), Climhazzard preview
F34 (slash effect F16). Other visual limitations still apply to both sides.

## Executed verification

- Python: six tests across `test_original_*.py`, none skipped. Source inheritance,
  root/node compatibility, malformed rates, rejected source mismatches and prior
  texture supplements were checked.
- Node: 18 tests across `test_original_effect_player.mjs` and
  `test_original_inheritance.mjs`, none skipped. The strengthened five-test
  inheritance suite was also rerun after adding animated parent rotation/scale.
- Original Brave Slash node 12, instance 95, effect F20: old alpha
  `0.3521788365`, corrected alpha `0.9259259673`, matching the audit's local alpha.
- Original Climhazzard slash node 10, instance 14: effect F31 parent-translation
  difference `395.646056` source units, matching the audited birth/live difference.
- Synthetic nested and fractional-birth cases verify continued local motion,
  current parent rotation/scale, separate parent instances and seek-order identity.
- Browser review: all three skills loaded with eight GPU blend checks passing.
  Brave Slash in Reactor/middle target and Climhazzard in Forest/lower target were
  played from F0 to F210 with no warning/error console entries. Blade Beam also
  completed F0 to F210 in Reactor/upper target with a clean warning/error console.
  A/B screenshots of
  Brave Slash F42 and Climhazzard F34 were inspected. The Climhazzard screenshots
  differ within the effect area; this is not a native-reference comparison.

No new original-game video comparison or game build was performed. Model-color
handling remains the next isolated A/B experiment.

Follow-up: the [appearance audit](original-appearance-review.md) found incorrect
activation of dormant local alpha/color curves, so that correction was completed
before model-color work. The original verification above remains historical.
