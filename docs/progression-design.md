# Character variants and the level system (proposal, 2026-11-09)

Status: the level scale is implemented up to Lv 6 (2026-11-09, see "Implemented"); Bond for duplicates and the first variant wave are implemented too. Meta-progression v1 (`src/run/profile.mjs`) already exists and
stays compatible with it.

## Source facts (master data `ffbe-data.db`, checked 2026-11-09)

- One playable *variant* is one `unitSeries`: one skill tree, base rarity up to its highest form.
  1573 series exist.
- Rarity spans of the series:
  - 715 are NV-only (7★ → NV);
  - 276 go 5★ → 7★;
  - 95 go 5★ → NV;
  - 186 go 4★ → 6★;
  - 126 go 3★ → 5★;
  - the rest are smaller groups.
- Many characters have several variants. Examples:
  - Squall: Squall (5–7★), Lone Lion Squall (5★–NV) and Sorceress's Knight Squall (NV).
  - Tidus: Tidus, Star Player, New Guardian and Ace Striker.
  - Barret: Barret (4–6★), Barret (Remake, 5★–NV) and Avalanche's Barret (NV).
  - Cloud: Cloud (5★–NV), AC, Remake and Cloud Strife.
- Neo Vision comes in two forms: summoned NV units and NV awakenings of 7★ units (NVA, e.g. 207000117
  Cloud). Later FFBE added EX+1 to EX+3 on NV units (Brave Shift at EX+1). The local data carries
  `nvLvl` 0–3 in `unit_series_lv_acquire`, which matches EX+0..EX+3. Sources: altema.jp NV guide,
  r/FFBraveExvius NV tutorial (2020); see the chat log of 2026-11-09.
- Skills are learned per rarity and level, and NV skills per `nvLvl`. The importer already records
  this in `report.catalog[].learned`.

## Proposal: one level scale for everyone

| FFRogue level | FFBE form |
| --- | --- |
| 1 | 3★ |
| 2 | 4★ |
| 3 | 5★ |
| 4 | 6★ |
| 5 | 7★ |
| 6 | NV / NVA (EX+0) |
| 7 | NV EX+1 |
| 8 | NV EX+2 |
| 9 | NV EX+3 |

- Each variant has a start level (its base rarity) and a max level (its highest form).
  - Classic Cloud is level 3–6.
  - Remake Cloud is level 6 only, or up to 9 once EX steps are modelled.
  - Barret (classic) is level 2–4.
- The same level means the same power, whatever the variant. FFBE's power creep between variants is
  not copied. Level replaces today's rank weights and `powerPerRank` as the power axis.
- Body and look: a level shows the variant's own form for that rarity. Levels past the highest
  existing form keep the last body; NV and EX levels keep the NV body.
- Skill trees by level: a skill joins the run pool only when the member's level reaches the level
  where FFBE teaches it (rarity, or nvLvl for NV/EX). The importer already has the data; the run
  catalog would carry `unlockLevel` per skill.
- Variants stay separate heroes under one canonical identity. The Fate Engine never draws two variants
  of one character into one party (already enforced through `canonicalIdentity`).

## How it connects to meta-progression

- Unlocks are per variant. Unlocking Lone Lion Squall is separate from unlocking classic Squall.
- Duplicates: see "duplicates as Bond" below. They no longer raise the start level directly.
- Inside a run, a boss reward "awaken" raises the level by one, as awakening does today.
- UI: show "Lv 3 / max 6" instead of stars; stars and NV stay as flavour on the card.

## Implemented (2026-11-09): Lv 1-6, one power scale

Developer decision: implement levels up to 6 (NV) now. EX levels 7-9 and Brave Shift wait.

- `src/run/unitForms.mjs`:
  - `levelOf`: 3★=1 … 7★=5, NV=6.
  - `MAX_LEVEL = 6`.
  - `formForLevel`: highest reviewed same-identity form at or below the level, else the base form.
- Run (`src/run/runState.mjs`, save version 3):
  - Every member has `level`.
  - Start levels come from one table for all heroes: the run-rules weights by original rank, read as
    Lv 1..6. Measured over 12000 draws: 45 % Lv 1, 30 % Lv 2, 19 % Lv 3, 4 % Lv 4, <1 % Lv 5/6.
  - Stats are `1 + (level - 1) × per-rank growth`, so the same level gives the same power for every
    variant.
  - Body is `formForLevel`. A 5★ hero at Lv 1 shows its 5★ body. An NV-only unit at Lv 2 shows its NV
    body with Lv 2 power.
  - Boss relic "Awakening" is +1 level up to 6 for every hero. The awakening presentation plays only
    when the body changes.
  - v2 saves gain `level = levelOf(form)`.
- Deliberate deviation from the first proposal: there are no per-variant level ranges. Every hero can
  reach Lv 6, so the variant decides look and skills, not power.
  Reasons:
  - NV-only units (715 series) would otherwise always start at the top.
  - 3★-5★ units would be capped below the others.
- Revised after the 2026-11-09 playtest (developer: "a base 5★ Cloud must not start at Lv 1, rarity
  has to show"): the base rarity is now the start-level floor (`newMember`: max(roll, levelOf(base),
  Bond floor)). A 5★ base unit starts at Lv 3 or higher, NV-only units always at Lv 6. Max level stays
  6 for everyone, so low-rarity heroes still grow the furthest in a run. Rarity is balanced by
  scarcity instead: summons and expedition unlocks weight heroes by base level (`SUMMON_WEIGHTS`
  50/35/25/15/10/6), so an NV unit is about 8x rarer than a 3★ unit. Starter roster: Cloud, Aerith,
  Barret, Squall and Delita start at Lv 3, Jack and Cloud of Darkness at Lv 1.
- UI: cards and reels show "Lv N", and the Fate Engine tier follows the level. Stars and NV stay as
  flavour on the reel.

## Duplicates as Bond, not power (implemented 2026-11-09)

Problem: if duplicates raise the start level, a long-time profile only draws Lv 6 heroes, and the slot
machine loses its tension.

Proposal: duplicates give Bond to that hero, with capped steps:
1. Bond 1: the Fate Engine draws this hero more often (weight ×1.5). Control, not power.
2. Bond 2: choose this hero's starting skill.
3. Bond 3: start level is at least Lv 2 (one-time floor; it never rolls Lv 1).

Further copies return 40 crystals. The slot machine stays, and its start level is still rolled per run.
Summons draw from the whole drawable roster: a locked hero is unlocked, an unlocked one gains Bond.
Code: `src/run/profile.mjs` (`bond`, `drawCatalog` perks, `summonHero`) and `src/run/runState.mjs`
(`pickHero` weights, `minStartLevel`, `chooseStartSkill`). Tests: `tools/test_profile.mjs`.
Power mostly comes from inside the run (relics, skills, levels), as in a roguelike.

## Variant import (first wave 2026-11-09)

Developer decision: work on the main PC only; repo size is not a constraint now.
`tools/characters/roster-variants.json` lists 25 variants found through the master data's explicit
`unitCharacterId` (Brave Shift forms with `nvShiftOrder 1` excluded). Each variant keeps its
character's canonical identity, so it never shares a party with another variant of the same character.
Run: `node tools/import_character_wave.mjs --wave tools/characters/roster-variants.json`.
Result: 51 units with 253 skills and 49 Limit Bursts, 47 of them drawable. Barret (Avalanche), Cecil
(Red Wings), Ace (Wild Card) and Terra (NV) have only their LB so far. Variants without NV data in
`unitCharacterId` (e.g. Cloud KH, Star Player Tidus) are not found yet. NV awakenings of variants
(isNvSublimationUnit forms) are not prepared yet.

Earlier notes:

Import all variants of a character together when it is imported. Technical limits:
- Size: about 10 MB per variant including forms. The 27 current characters add about 260 MB to git.
  All variants of the roster (about 130) would add about 1.3 GB, which slows the two-PC sync.
  Alternative: keep generated assets out of git and rebuild them with the importer on each PC; this
  needs the raw dumps on both PCs.
- Skill-tree unlocks by level (`learned` rarity/nvLvl → `unlockLevel`) are the next step for
  variant-specific trees.

## Open decisions for the developer

1. Decided 2026-11-09: implement up to Lv 6 now; EX later.
2. Decided: Bond as above (developer left it to Claude).
3. Decided: import all variants per character; main PC only.
