# FFRogue – current state and how to work on it

Single entry point for any developer or AI picking up the project. Read this first, then
`docs/vision.md` (goals), `AGENTS.md` (rules) and the specialised docs linked below.
Last consolidated: 2026-11-07.

## Cloud night 2026-11-10 (docs/cloud-night-brief.md)

Branch `claude/night-2026-11-10`, one commit per brief task. Checks before every commit:
`node --test tools/test_*.mjs` (35 files fail before and after on the cloud machine: they need ignored raw
data or pin hashes of local-only files; no new failures), `npx tsc --noEmit -p .`, `npx vite build`.

### 1. Elements in combat
- `src/run/elementRules.mjs` (shared by BattleScene and the simulator): resistance r % scales damage by
  `1 - r/100`, held to 0.25-2.0 (`ELEMENT_MIN/MAX`); FFBE absorb (r > 100) is the 0.25 floor, never healing;
  several elements average their multipliers. Hero skill elements: `originalCommand.raw.element` (first `@`
  branch). Enemy skills: `enemyAction` adds `elements` from `ENEMY_SKILL_ELEMENTS`; heroes take them through
  `HERO_ELEMENT_RESIST`. Basic attacks and Barrage repeats use `heroAttackElements(member)` (the weapon, task 3).
  Unmitigated damage (execute fallbacks) ignores elements.
- Readability: damage numbers tagged `WEAK` (orange) / `RESIST` (steel grey) on enemies and heroes; enemy
  name plates show weakness chips and struck-through resist chips (`src/ui/elementChips.ts`), the enemy hover
  tooltip names them; `skillDescription` adds "Fire element". Small enemies' damage numbers now start low
  and rise less, so the DOM name plate no longer hides them.
- Simulator mirrors the rule (enemy resistances, hero resistances, element-aware greedy choice).
  400 runs: full roster 99.8 % -> 100 % wins, 50.1 % -> 51.8 % party HP after the final fight;
  starters 99.8 % -> 100 %, 52.3 % -> 54.8 %.
- Tests: `tools/test_elements.mjs`. Browser check (headless, dev server): Microchu plate "WEAK FIRE EARTH
  ~~WATER~~", a fire hit of 400 showed "600 WEAK", hero popups "-300 WEAK" / "-120 RESIST".
- Data finding: Sephiroth's reviewed pattern never uses his imported Firaga/Blizzaga (only Heartless Angel
  carries an element).

### 2. Balance: buffs, debuffs, elements, rewards
- Simulator: now mirrors blind misses (`BLIND_MISS_CHANCE` moved to heroBuffs.mjs), raise, limit-fill, and
  its greedy policy uses Protect/Shell (fresh guard type, enemy HP > 3000), Esuna-type cleanses (two
  debuffed allies, or self) and raise. New `--ablate a,b` switches mechanics off (elements, guard, boost,
  break, blind, cleanse, debuff, lb, heal, raise) to measure their weight.
- Finding (400 runs, before the change): Limit Bursts dominated: without them wins fell 100 % -> 70.8 %
  (5.26 LB per run, one LB every ~4 actions per hero). Everything else moved final-fight HP by <= 3.5 points.
  Breaks/blind hit only 15 times in 100 runs (their skills come late in normal-enemy patterns), so they have
  no measurable weight in the simulator.
- Changes: `LB_PER_ACTION` 25 -> 15 (LB every ~7 actions); `RUN_BALANCE.damage` 390 -> 350,
  `damagePerEncounter` 95 -> 85. Guard/boost/break strengths unchanged (their weight is limited by how often
  they are used, not by their size).
- Reward pool (`src/run/runState.mjs`): new party relic `ward` (+50 % resistance to one element, `run.wards`,
  once per element), offered only for elements the next stage's enemies really attack with
  (`stageElementProfile`, every pattern step in both phases). Offers are drawn with weights
  (`REWARD_WEIGHTS`: learn a skill hitting a weakness of the next stage x3, ward x2, others x1), one RNG draw
  per pick as before, deterministic per seed. Reward card "Dark Ward" with element chip.
- Result (400 runs): full roster 100 % wins, 47.3 % party HP after the final fight, 3.75 LB per run
  (before: 100 % / 51.8 % / 5.26); starters 99.5 % / 51.6 % / 3.71 (before: 100 % / 54.8 % / 5.18).
  Ablations now: no LB 81.8 % wins / 29.8 % HP; no heal 99.8 % / 42.0 %; no elements 46.0 %; no guard 46.6 %.
- Tests: `tools/test_reward_hints.mjs`. Browser check: reward screen shows the Dark Ward card.

### 3. Weapons (new reward type)
- `src/run/weapons.mjs`: curated pool from `public/assets/items/weapons.json` (loaded in BootScene, set in
  PreloadScene before any save is validated): per category and rarity 3-7 the strongest weapon without
  element plus per element and rarity the strongest elemental weapon = 115 of 984. Rarity tiers per area
  index (`WEAPON_TIERS` [3-4], [4-6], [5-7]).
- Rule (FFRogue, not FFBE equipment): one slot per hero (`member.weapon`, stored whole in the save). Original
  ATK/MAG / 600 become an additive bonus on the attack/magic multipliers (`memberPower`), held to
  min(25 %, 3 % x rarity). Weapon elements apply to basic attacks, Barrage repeats and physical skills
  without an own element (`actionElements`); weapon element resistances add to the wielder's. Ailment
  chances are not used yet.
- Reward pool: one weapon candidate per hero from the next area's tier, picked by seed hash (no RNG draw,
  so the pool is recomputable for save validation); half the heroes look first at weapons hitting a
  weakness of the next stage. Weights: weapon x1, weapon on a weakness x2.
- UI: reward card "WEAPON" (portrait + category glyph badge, bonus summary, replaced weapon), weapon line
  with glyph and element chips on hero cards and on the battle HUD party card (tooltip = effect).
- Saves: `RUN_VERSION` 3 -> 4; v3 saves migrate unchanged (weapons and wards are optional fields).
- Simulator: weapons in the reward choice and damage; `--ablate weapons`. 400 runs: full roster 99.8 % /
  48.4 % HP after the final fight (without weapons 100 % / 47.3 %), starters 99.5 % / 52.9 %.
- Tests: `tools/test_weapons.mjs`; test_unit_forms and test_combat_regressions follow the constants.
  Browser check: reward screen with two weapon cards, HUD shows "Thunder Spear (FFII) THUNDER".

### 4. Run structure, skill swap, reward mix, UI
- Run structure (`courseAreas`): two seeded areas from every stage except Nibelheim, sorted by difficulty,
  then always Nibelheim (`FINAL_STAGE`, area flag `final`). Each area: its normal fight, then its closing
  fight. `encounters()` adds `kind`: `elite` for the closing fight of a seeded area (Guard Scorpion, Ochu,
  X-ATM092, Leviathan, Kain, Air Buster, Kimahri), `boss` only for Sephiroth. 4 -> 6 fights per run.
  HUD caption "Battle / Elite / Boss n / 6", intro banner "ELITE ENCOUNTER" / "BOSS ENCOUNTER", the
  awakening card is an "ELITE RELIC". Saves keep their own area list, so old 2-area saves play on unchanged
  (no extra version bump beyond v4; validation accepts an optional `final` on the last area only).
- Reward mix (decision): three cards, always one per kind in this order: skill (learn / rank up), upgrade
  (stat, ward, rest, elite relic, revival), weapon. The elite relic takes the upgrade card; a revival takes
  the upgrade card, or the weapon card when the relic holds it. Empty kinds fall back to any reward.
  Reason: every screen offers a real choice between kinds, and the player reads the cards by position.
- Skill swap: the replacement screen was laid out by the reward-card grid and lost its text order. New
  layout: the incoming skill on top, three "FORGET" cards (rank loss marked), "Keep current skills" returns
  to the reward choice (declining). `chooseReward(..., replace)` unchanged.
- UI pass: reward cards carry a hover tooltip with the full text; battle HUD party cards show the weapon as
  glyph + element chip beside the name (tooltip: name and effect); the caption shows party wards.
  Screenshots (outside git): skill swap before/after, HUD with weapons and wards.
- Simulator with the new structure before rebalancing: 25 % wins (fight 5 86 %, Sephiroth 29 %); task 5.
- Tests: `tools/test_reward_hints.mjs` (structure, reward mix), `tools/test_run_state.mjs` (6 fights).

### 5. Balance of the whole system (6-fight runs)
- Problem after task 4: 25 % wins; the party reached Sephiroth with ~44 % HP / 25 % MP (attrition over five
  fights, no MP regeneration, only one upgrade card per screen).
- New rule: camp between areas (`AREA_CAMP` in runState.mjs): entering a new area restores 30 % base HP and
  30 % max MP to living members (K.O. stays K.O., no RNG); the elite reward screen says so ("Area cleared ·
  camp before ...").
- Values: `RUN_BALANCE.damage` 350 -> 390, `damagePerEncounter` 85 -> 30 (the longer run made the per-fight
  step too steep: fight 6 hit with 775); `LB_PER_FULL_HP_LOST` 60 -> 45 (Limit Bursts gained weight again in
  longer fights). Enemy HP unchanged (normals 2000 x stage difficulty, elites 5000 / 7200, Sephiroth 9400).
- Result (400 runs): full roster 100 % wins, 52.2 % party HP after Sephiroth, 6.47 LB per run (1.08 per
  fight); starters 99.3 % / 54.5 %. Per fight (full roster) HP lost 688 / 1170 / 844 / 1952 / 1601 / 3290
  and rounds 2.3 / 3.4 / 2.5 / 4.3 / 2.8 / 5.7: Sephiroth is clearly the hardest fight (most damage, most
  rounds, only fight with K.O.s). Ablations: no LB 88.8 % / 31.8 %, no heal 99.5 % / 47.4 %; elements,
  guard and weapons each move final HP by < 1 point (elements now cut both ways: Nibelheim's enemies attack
  with ice, lightning and dark).
- Open: Sephiroth's reviewed pattern never casts his imported Firaga / Blizzaga (recipe
  `tools/stages/nibelheim.json`, regenerated by tools/import_stage.mjs, which needs local data).
- Tests: camp test in `tools/test_reward_hints.mjs`; browser check of the elite reward screen.

### 6. UI polish (title, heroes, sound, Fate Engine, awakening, tooltips)
- Title: logo + crystal + Continue / Begin (New Journey) / Heroes / Training Grounds / crystals and hero
  count / Summon; tagline, rules blurb, save footer and the big seed field are gone (seed sits in a small
  "Fate seed" fold-out, `#run-seed` unchanged).
- Heroes collection (`RunUI.heroes`, title button "Heroes"): every drawable hero sorted by origin; locked
  heroes as black silhouettes "???". Hover/focus tooltip: name, origin game and variant, base rarity, start
  level range (rarity floor to Lv 6), max level and awakening ranks, Bond, skills with element chips, Limit
  Burst. Tooltips flip at screen edges.
- Sound settings: only Music and Sound effects (volume + mute) for players; battle cursor profiles, the
  sound comparison and the housing-shake toggle need `?dev=1`.
- Fate Engine mix: gains from measured sample loudness (`FATE_GAIN` in src/ui/fateEngine.ts, test
  `tools/test_fate_mix.mjs`): rarer tiers land louder (bronze -27 ... NV -21 dBFS), NV `limit-open` was ~4 dB
  above the 7★ cue and now sits under it, the verdict is no longer buried. A landing reel fades the previous
  reel's 1.5-2.1 s cue over 0.3 s (`playSample` stop handle with fade) instead of stacking three cues; 7★/NV
  keep their tail. The summon roulette uses the same gains. Reels already show full bodies; they gained a
  hover tooltip (variant, level, starting skill, Limit Burst). Not listened to in the cloud: levels are
  measured, not heard.
- Awakening: plays as a compact banner over the awakening hero inside the live battle view
  (`RunUI.awakening(..., anchor)` with the hero's screen box); the full-screen panel remains only without a
  battle view.
- Tooltips: commands (name, cost, description), party cards (HP, MP, Limit, state), status badges with
  explanations ("Protect: physical damage taken down · 2 rounds"), enemy hover (weak/resist, statuses,
  intent), reward cards (full text), weapons, wards.
- Screenshots (outside git): title, heroes (900 and 375 wide), battle HUD 375 wide, awakening banner,
  slot machine. Mobile: the HUD weapon marker hides below 600 px so names stay readable.

### 7. Battle placement across all arenas
- Review: headless screenshots of all 8 arenas (normal pair + closing fight, outside git). Findings: in every
  two-enemy formation the top and bottom slots shared x 0.32 and were only ~137 px apart, so a tall front
  body hid the back enemy (Altissia: Magitek Axeman covered Magitek Infantry completely) and the name plates
  overlapped; in Altissia the enemies stood over the tidal wave instead of the stone quay; Nibelheim's
  Ghirofelgo hangs from the ceiling, so its plate slid under the caption.
- One layout for all arenas (`src/ui/battleLayout.ts`): staggered enemy pair, back (top) x 0.32 -> 0.23 /
  y 0.16 -> 0.14, front (bottom) x 0.32 -> 0.38; centre and party unchanged. Per-arena override only where
  needed: `enemyShiftX` (Altissia 0.18, in `src/data/battleArenas.ts`). Name plates of bodies reaching the
  top of the arena stay inside their box (`.arena-health.is-inside`).
- Distances: melee approach is relative to the target (`targetOffsetX`), so it follows the new slots; the
  regression test over all arenas passes, and a browser check of a basic attack on Altissia's front enemy
  landed (3100 -> ~2700 HP). Limit Burst clamping (`approachX`) is unchanged; a Limit Burst in Altissia was
  not captured on screen in the cloud check (not verified visually).

## Product state

- Playable PC roguelike prototype: title → slot-machine team draw (3 heroes, rerolls) →
  expedition (2 areas, 4 encounters, Ochu and Guard Scorpion bosses) → rewards / awakening →
  result. Saves locally. Roster since 2026-11-09: 51 units (26 characters plus 25 variants, 49 drawable) with 346 Source skills and 49 Limit
  Bursts (253 before the pipeline-gate fixes of 2026-11-09 evening: zero-prefix motions 3/5/6, `@` branches,
  empty 99999999 rows, raise) (variants: `tools/characters/roster-variants.json`); before the variants: 26 characters, 161 skills, an LB each (`tools/import_character_wave.mjs`). The original seven (Cloud, Aerith, Barret, Cloud of Darkness,
  Cloud AC, Delita, Jack) plus Squall, Tifa and 18 wave characters (Warrior of Light … Cidolfus, FFI–FFXVI,
  FFT, Type-0). Awakened forms go up to 7★ / NV; FFXVI units are NV-only. New profiles unlock heroes
  gradually (see Meta-progression).
- Rewards (`src/run/runState.mjs`): learn skill, skill rank, stat, awakening (boss), Field Rest
  and Phoenix Down (`revive`, 2026-11-08). K.O. persists between battles; while a member is
  K.O., one revival offer (50% base HP, `REVIVE_HP_SHARE`) is guaranteed among the three, next
  to the guaranteed boss awakening. A K.O. member enters the next battle in its dead pose; a
  revived member starts with an empty Limit gauge (a K.O. empties it).
- 47 Source skills (original FFBE effect data rendered in real time). Authoring-free imports
  2026-11-07/08 include Meteor Rain, Banish, Holy, Fury Brand, Healing Wind, Curaja, Earthly
  Healing, Prayer of the Cetra, Northswain's Strike, Northern Sky Apprentice, Meditate, Big Shot,
  Ungarmax, Grenade Bomb, Satellite Beam, Cheer, Call of the Void, Fusion Sword 1st/3rd, Spin Drive,
  Reraise (auto-revive), Thundaga Blade (first type 7 lightning), Thundara, Thundaga, Sonic Impact, Buster End,
  Finishing Touch (both Clouds), Fusion Sword 2nd/4th, Pulse of Life, Warring Slash. Approximation mode plays
  repeated generation cycles once and falls back to the authoring-free stand-in when matched
  authoring disagrees with the binary (both listed in plan.approximations).
  Approximation mode also treats empty selected alpha curves as constant and skips engine-only
  effect groups without files (e.g. 99999999), each listed in plan.approximations. Members starting before frame 0 are clamped to 0 in approximation mode.
  + 2 Limit Bursts
  (Cloud's Omnislash; Cloud AC's Omnislash Version 5, the first authoring-free import, 2026-11-07).
- Battle UI (DOM `CombatHud` over Phaser): target-first (enemies clickable any time, crystal
  cursor), Attack + up to 3 skills + Limit Burst as one-click commands, original FFBE UI parts
  (window frame, HP/MP/LIMIT gauges, enemy gauge, skill icons), animated HP drain with damage
  trail, buff/debuff status badges with remaining rounds. All menus use the same FFBE window style (`src/ui/ffbeTheme.css`).
  Details: `docs/battle-layout.md`.
- Limit Burst gauge: `src/run/limitGauge.mjs` (+25 per action, damage taken fills, LB empties
  it). Only heroes with a published `type: LIMIT` skill have one. Since 2026-11-08 the gauge
  carries to the next battle (`member.limit` in the run save) for heroes who end a battle
  standing; a K.O. empties it.
- Enemy single-target attacks hit a random standing hero (`src/run/enemyTargeting.mjs`,
  combat RNG stream); before 2026-11-08 they always hit party slot 1.
- Friendly effect kinds (`allyEvents`, stationary `self`/`party` skills): `heal`, `physical-boost`,
  `auto-revive` (Reraise-style: `hpFraction`, `turns`; the next K.O. in the window revives once)
  `limit-fill` (`amount` 1–100 on the Limit gauge) and `raise` (2026-11-09: revives K.O. allies with
  `hpFraction`; only with `allyTargeting` `fallen-ally`/`fallen-allies`). Validated in `reviewedSkillEvents`,
  scaled by skill level in `skillForRun`, described in the HUD by `skillDescription`. The last two
  are data model + battle handling only (2026-11-08); no published skill uses them yet.

## Battle start prepares only this battle's scenes (2026-11-09)

BattleScene used to prepare every registered skill scene (about 400, each in 1-3 target variants)
one after another at battle start, so late registry entries (e.g. Aerith's Full-Life) stayed
unplayable for minutes and the cost grew with every import. It now prepares only the party's chosen
skills and Limit Bursts plus every `presentation` the encounter's enemies reference
(`ENEMY_CONTENT`/`ENEMY_SKILLS`). BootScene still loads all manifest JSONs (cheap).

## Enemy debuffs on heroes and Esuna (2026-11-10)

- Hero statuses gain enemy debuffs (`src/effects/heroBuffs.mjs`): `break` per stat (ATK/MAG lower
  dealt damage, DEF/SPR raise taken damage of that type, alongside Protect/Shell) and `blind` (each
  basic-attack hit misses with 50 %, "MISS"). Original ailment icons (break_atk/def/mag/spr, blind).
- import_enemy_skills.mjs decodes the extra processes of damaging monster skills: 24 (negative stat
  changes -> breaks, strength held to 10-40 %, 1-5 rounds) and 6 (blind chance). Current carriers:
  Condor Beak (DEF -30 %), Sweeper Smoke Shot (blind), X-ATM092 Arm Crush+ (all stats -40 %, party).
  Debuffs land once per hit hero with their chance; floating "... BREAK" / "BLIND".
- Esuna-type cleanse (process 5 whose ailment list includes blind): friendly effect `cleanse` removes
  breaks and blind (adaptation: original Esuna clears ailments only). Imported: Esunaga (Aerith, Unsung
  Hero Ramza), Esuna (Wondrous Flash Lightning), Medicate (Delita, Ramza), Return (Cloud of Darkness),
  Ray of Hope (Terra). Poisona waits for poison. Dispel (59) waits for enemy buffs.
- Browser check: Arm Crush+ broke all four stats on the party, Esunaga cleared them
  (tools/data/debuff-check/). Roster: 379 skills. Tests: `tools/test_hero_debuffs.mjs`.

## Barrage-type commands (process 42, 2026-11-10)

- Process 42 ("0,0,minHits,maxHits,power%", no effect or hit frames) repeats the unit's basic attack.
  New execution `basic-attack-repeat` (`src/effects/basicRepeat.mjs`, shared by importer and battle):
  the hero dashes in and plays the attack clip N times (rolled from min..max) with the original
  basic-attack hit frames; range 3 picks a random living enemy per repetition, 1 the target, 2 all.
  No scene: `canUseSourceSkill`, `runCatalog`, `heroBodyClips` and the pipeline report admit it
  explicitly; import_character keeps `execution` only for this type. Per-hit power is the source
  percentage held to 50-100 % (Barrage rows carry 1500). The importer drafts these outside --max-skills.
- Imported: Barrage (Bartz, Cloud of Darkness, Delita), Gale Barrage (Bartz), Lightning Flash (Jack);
  the same wave also published Delita's Karma Blade. Roster: 372 skills. Browser check: Gale Barrage
  and Lightning Flash land every repetition. Tests: `tools/test_basic_repeat.mjs`.

## Cooldown commands and periodic Null activations (2026-11-09)

- Process 130 ("cast ability X, every a turns, first after b") is a wrapper. inspectCharacter already adds
  the wrapped ability to the catalog and imports it; the wrapper itself is reported as "not supported"
  but has no content of its own. Of 86 such wrappers in the roster, 24 wrap damage skills and 18 of those
  were already published (Limit Raid, Seventh Heaven, Boiling Point, ...). FFBE cooldowns are not
  modelled; wrapped skills cost MP like any other.
- `bmb_playback_fields.py`: a ControlNull with generation mode 1, count 1, duration > 1 and interval > 0
  (periodic activation) plays the decoded mode-0 schedule in approximation mode and is recorded as
  `periodic-null-activation-as-mode-0`. Unblocked "Unknown native generation delay profile" for
  Ancient Holy, Flames of Rebirth, Cherry Blossom, Focused Shot and Burst; Ace Vermilion's wave also
  added Burst++, Support Hand+, Jackpot Triad, Shining Card, Spark Card and Card Showdown. Roster: 366
  skills. Visual check: tools/data/delay-profile-check/ (Ancient Holy, Cherry Blossom hit the target).

## Protect, Shell and source-derived stat buffs (2026-11-09)

- New hero status `guard` ({damageType: physical|magical, reduction, turns}; `src/effects/heroBuffs.mjs`
  `heroDamageTakenMultiplier`). Enemy damage of that type is reduced; guards of both types stack.
  Badges use the original DEF-up / SPR-up icons (`export_status_icons.py`: guard-physical,
  guard-magical); floating text PROTECT / SHELL. Level scaling: +0.05 reduction and +1 turn per level.
- Enemy skills carry `damageType` from their original damage process (15 magical, 1 physical;
  import_enemy_skills.mjs): 11 magical, 17 physical. Basic and FFRogue enemy actions are physical.
- Friendly stat buffs come from the source (`tools/lib/source-buffs.mjs`): process 3 "ATK,DEF,MAG,SPR"
  plus 18/19 mitigation. ATK or MAG -> physical-boost x1.3, DEF or 18 -> physical guard 0.3, SPR or
  19 -> magical guard 0.3, 3 rounds (reviewed defaults; FFBE percentages are not copied). The importer
  drafts them with `--source-buff`; `node tools/refresh_source_buffs.mjs [--check]` re-derived the 8
  earlier physical-boost-only drafts (Cheer x3 and Embolden gained Protect; Focus x2, Meditate and
  Magical Activation gained Shell). Tests: `tools/test_guard_buffs.mjs`.
- Imported with the new rule: Protect/Shell (Cecil, Ramza), Protect/Protectga (Cloud of Darkness),
  Protectga/Shellga (Aerith Cetra) and Protectga (Avalanche's Barret, now drawable). Roster: 355 skills,
  50 of 51 units drawable (Red Wings Cecil still needs barrier/cover mechanics). Browser check:
  Protect cut a 290 hit to 203.

## Playtest round 2026-11-09 (developer feedback)

- Enemy turns: an original monster skill ends after its last hit plus 400 ms
  (`ENEMY_SKILL_SETTLE_MS`); the scene's decorative tail fades on its own, as for heroes. Average
  enemy skill 4.0 s -> 1.7 s over the 28 imported monster skills; a real turn with Bite + Beak took
  3.2 s in a browser run.
- Basic attacks hit on the original frames: `character.battle.hitFrames` comes from the unit row
  `attackFrames` (frame on the attack clip's 60 fps clock, damage share). import_character.mjs writes it
  on every publish; `node tools/backfill_basic_hits.mjs [--check]` refreshed all 51 published
  characters. Cloud of Darkness now hits with her beam (frame 75) instead of sprite frame 2.
  Multi-hit rows split one damage roll by their shares. Tests: `tools/test_basic_hits.mjs`.
- Screen surfaces: two more generic import rules (see Pipelines). Squall's Lion Heart darkening now
  covers the whole canvas and its end flash is a battlefield flash instead of a white box. A dry run
  over all 416 screen-API plans matched only Lion Heart.
- Rarity: the original base rarity is the start-level floor (3★ Lv 1, 4★ Lv 2, 5★ Lv 3, 7★ Lv 5,
  NV Lv 6); the weight table can only lift a hero above it. Summons and expedition unlocks are weighted
  by base rarity (`SUMMON_WEIGHTS` 50/35/25/15/10/6 for Lv 1..6).
- Summon roulette: "Summon a hero" plays a case-style strip of hero heads (real summon weights, Fate
  Engine tier colours) that stops on the summoned hero, then the result card. Skip and reduced motion
  land at once.

## Levels Lv 1-6 and Bond (2026-11-09)

One power scale for every variant (3★=Lv1 … 7★=Lv5, NV=Lv6). Start levels roll one weight table with
the base rarity as the floor (see above), boss relics give +1 level, and the body follows the original forms. Cards and reels show the level
(a star per level, NV at Lv 6). Run saves are version 3; v2 saves migrate. Design, the duplicate
economy proposal (Bond) and variant import: `docs/progression-design.md`.

## Meta-progression v1 (2026-11-09)

`src/run/profile.mjs` (tests: `tools/test_profile.mjs`) holds a profile in localStorage
(`ffrogue.profile.v1`), separate from the run save:
- Unlocked heroes: a new profile starts with the first reviewed roster (`STARTER_HEROES`: Cloud,
  Aerith, Barret, Squall, Delita, Jack, Cloud of Darkness). The Fate Engine draws only unlocked heroes
  (`drawCatalog`). Saved runs still validate against the full catalog. The profile is always topped up
  to three canonical identities.
- Crystals: 10 per won battle and 60 for a finished expedition. Each finished run settles once, keyed
  by seed and history length.
- A won expedition unlocks one random locked hero, shown on the result screen.
- Summon on the title screen: 100 crystals summon one hero, weighted by base rarity; duplicates give
  Bond. A case-style roulette shows the draw.
- Power split stays with the run rules: start forms are drawn by rank weights (3★…7★/NV,
  `originalForms`), and higher ranks give `powerPerRank` stat growth. NV-only units (FFXVI) start at
  their NV base.
- Developer direction for later: more influence over starting heroes and their level between runs.
  Candidates are duplicates raising a hero's minimum start rank, and a "favoured hero" slot.

## Nibelheim, Sephiroth and weapon data (2026-11-10)

- New stage Nibelheim (FFVII, Shinra Mansion bg 120144, music Let the Battles Begin! / J-E-N-O-V-A
  4002203): Ghirofelgo, Yin & Yang (Blizzara, Thundara) and boss Sephiroth (FFBE trial, dictionary
  3254710) with 7 original moves (Double Strike, Quad Strike, Draw Slash, Octaslash, Heartless Angel,
  Firaga, Blizzaga). Pattern announces every party attack (test convention). Known: Heartless Angel's
  feather storm shows a hard right edge (effect pipeline, local fix needed).
- New stage Mako Reactor 05 (FFVII, bg 120141; Sweeper; elite Air Buster with Rear Gun and Moon Energy;
  boss music Kikaitou no Kessen 4000711). 20 enemies in total.
- Developer direction: normal -> elite -> final boss; Nibelheim/Sephiroth ends every run (cloud brief).
- Further trial boss candidates in the DB: Safer-Sephiroth (Super Nova, Flare), Gilgamesh, Kefka,
  Exdeath, Ultima Weapon, summons (Bahamut, Ifrit, Shiva, Odin). Each needs a reviewed arena/music.
- `public/assets/items/weapons.json`: 984 original weapons (tools/export_weapons.mjs); gameplay is
  the cloud brief's task. Simulator after Nibelheim: 99.7 % wins, 49.8 % HP after the final fight.

## Playtest round 2026-11-10 (developer feedback)

- Great Gospel showed a dark box: screen-sized particle rule now starts at 200 units and also accepts
  one-axis gradient textures (rows uniform, premultiplied, tolerance 8). Dry run over 416 plans:
  Great Gospel nodes 28/30/32 and Terra's Riot Blade Lotus node 24; both republished.
- Cid's basic attack (6 original hits) lost hit sounds at the two-voice limit: basic hits with an
  original frame are now authored onsets (the oldest voice is retired instead of dropping new hits).
- FPS: prepared scenes are warmed (shader compile, texture upload) one variant per idle frame
  (`PreparedSceneBridge.warmVariant`). Squall's Flame Barret first play: max frame 250 ms -> 55 ms.
  Flame Barret itself still runs ~18 ms/frame (other Squall skills 6 ms).
- Elements: `node tools/export_elements.mjs [--check]` writes `src/run/elements.mjs` from the original
  database (monster resistances for 16 enemies, 8 enemy skill elements, 18 hero resistances). Hero skill
  elements are already published (`originalCommand.raw.element`, 154 of 362 damage skills). Gameplay
  use is not implemented yet.
- Victory fanfare: FFBE `la009_battleend` (resource 400009, intro + loop) plays on a won expedition's
  result screen. Test: `tools/test_victory_fanfare.mjs`.

## Balance check after the 2026-11-09/10 features

Target: the developer-approved feel of 2026-11-08 (simulated ~99.5 % run wins, ~51 % party HP after
the final boss). Before this check the simulator gave 100 % wins and 62-64 % HP left: the new skills
(Protect/Shell, Barrage, Esuna, more damage skills) made runs easier. The start level matters little
(level sum 5 vs 18: 70 % vs 67 % HP left; one level is +3.5 % power/defence, +5 % HP).
- `RUN_BALANCE.damage` 300 -> 390, `damagePerEncounter` 70 -> 95.
- Result (300 runs each): full roster 99.7 % wins, 51.4 % HP after the final fight; starter roster
  (`--roster starters`) 100 %, 53.2 %.
- Simulator now mirrors Protect/Shell, breaks/blind from enemy skills, cleanse, magic break and
  Barrage repeats, and prints a breakdown by team start level.
- Open: Limit Bursts per run are 5.2 (1.5 on 2026-11-08; every character has one now). Left as is
  until playtested.

## Balance (2026-11-08, overnight cloud session)

Evidence tool: `node tools/simulate_run_balance.mjs [--runs 400] [--json out.json]` plays
seeded runs with a greedy policy through the game's own rule modules (run state, encounters,
enemy patterns, statuses, buffs, Limit gauge, skill scaling); only BattleScene's damage
formulas are re-implemented there (kept next to the code they mirror — update both). It reports
pacing trends, not skilled play. Rerun it after any balance change.

| | before | after |
| --- | --- | --- |
| `RUN_BALANCE` (normal HP / boss HP / +per area / damage / +per encounter) | 950 / 2600 / 1200 / 140 / 25 | 2000 / 5000 / 2200 / 300 / 70 |
| Simulated run win rate | 100 % | 99.5 % |
| Rounds per encounter 1–4 | 1.0 / 1.7 / 2.1 / 3.0 | 1.2 / 2.7 / 3.6 / 5.0 |
| Party HP after final boss | 92 % | 51 % |
| Limit Bursts per run | 0.01 | 1.54 |

Skill gameplay fields (recipe and published `skills.json`; visuals untouched): Brave Slash
18→12 MP; Trigger Smash 55→40 MP; Meteor Rain 2→3.5×; Ungarmax 2→4.2×; Holy 2.5→3.5×;
Northswain's Strike 20→18 MP, 2.2→2.6×; Northern Sky Apprentice 2.8→3.4×; Omnislash Version 5
15.2→8× (desc keeps the original 15.2× as provenance); Iai Strike 12→20 MP. Reason: each was
dominated by a sibling skill (e.g. Meteor Rain 2×/45 MP vs Blade Beam 3×/30 MP) or ended
fights alone. Not touched: Chant, buffs/debuffs, enemy patterns, reward pool, MP economy
(no MP regeneration; ~23 % party MP left after the final boss in the simulator).

## Decisions that shape all work (from the developer)

- Skill fidelity bar: looks convincing, hits the target, impact on the enemy. Not pixel parity.
- Import must scale (FF I–XVI roster, 10–20 skills per character): data-driven importer, no
  per-skill manual tweaks, no recordings. Reverse engineering is time-boxed; generic rules
  beat exact single-skill reconstruction. Approximations are explicit and listed.
- Work autonomously in small verified milestones, commit + push to `main`, report afterwards.
- Accepted visuals (15 skills, crystal encounter, slot lever, awakening) must not change
  without reason; the frozen Cloud baseline guards this.

## Pipelines (all in `tools/`, game loads only prepared files)

| Content | Entry | Doc |
| --- | --- | --- |
| New character (all-in-one) | `node tools/import_full_character.mjs --key <k> --unit <id> ...` | character-import-workflow.md (top) |
| Characters / bodies | `node tools/import_character.mjs --recipe tools/characters/<key>.json` | character-import-workflow.md |
| Skills / Limit Bursts | plan → stage → prepare → publish (see below) | skill-reconstruction-workflow.md (top entry) |
| Skill icons | `node tools/export_skill_icons.mjs` after any skill publication | character-import-workflow.md §5 |
| Battle UI parts | `<python> tools/export_battle_ui.py` | battle-layout.md |
| Long body sheets | `<python> tools/wrap_wide_sheets.py` (grid > 16384 px) | skill-reconstruction-workflow.md |
| New stage (all-in-one) | `node tools/import_stage.mjs --recipe tools/stages/<key>.json` | background-import-workflow.md (top) |
| Backgrounds / music | see background-import-workflow.md | |

Abilities (ABILITY rows) need the composed path first (unit attack prefix / zero-prefix Motion 2):
`compose_skill_effects.py --unit-id <unit> --skill-id <id>` → `resolve_composed_skill.mjs` →
`stage_original_skill.py` (see skill-reconstruction-workflow.md). MAGIC and LIMIT rows carry no
motionType: plan → stage as below; their hits are the row's attackFrames at offset 0.
Fire any skill for a phone GIF: `node tools/capture_battle_screencast.mjs <dir> --hero <i> --skill <id>`.

Skill / Limit Burst import (example Omnislash; replace character and source id):
```powershell
node tools/plan_source_imports.mjs --select cloud:207000105 --output tools/data/<run>/intake
<python> tools/stage_source_imports.py --selection tools/data/<run>/intake/selection.json
<python> tools/prepare_original_preview.py --source tools/data/<run>/intake/cloud-207000105/skill-source.json --unit cloud --motion atk --recipe tools/characters/cloud.json --profile source-preview-v1 --authoring-directory rawdata/assets/battle_effect --native-shaders-apk tools/data/memorial-audit/installed-base-v208.apk --native-shader-package tools/data/particle-native-audit/bmshaderpack.bin --renderer-reference tools/data/memorial-audit/diagnostic-v7/renderer-reference.json --approximate-unverified --output tools/data/<run>/intake/cloud-207000105/plan.json
node tools/publish_scene_presentations.mjs --recipe tools/presentations/<recipe>.json
node tools/import_character.mjs --recipe tools/characters/cloud.json --publish-skills-only --python <python>
node tools/export_skill_icons.mjs
```
The recipe skill entry needs `type` (ABILITY/MAGIC/LIMIT), `ffbeId`, scope, moveType,
`execution: prepared-source`, original `damageEvents` (the pipeline re-derives and compares
them), `scenePresentation`, `preparedSourceReceipt` and `actionChoreography`. The
presentation recipe needs `placementCoordinates: ffbe-screen-api` + `placementReview`.

Generic rules added 2026-11-07 (no per-skill exceptions):
- `--approximate-unverified`: unverified curves held constant, unknown enums take the
  authoring value, all listed in `plan.approximations`.
- Anchor mode 3 = caster unit rectangle (`caster-unit`); the host moves the caster so the
  source strike point lands on the target (`casterStrikeOffset`).
- Limit Bursts: catalog kind `LIMIT`, hits from `limitburst.attackFrames`, body `limit_atk`.
- Source scenes own the clock: no hit-stop pauses the caster's body during a prepared Source
  action (it drifted Omnislash's body >1 s behind its hits). Check any Limit Burst with
  `node tools/review_limit_burst_sync.mjs` (body drift per hit must stay ≤ 1 frame).
- Screen backdrops (automatic for `placementCoordinates: ffbe-screen-api` bindings): a static,
  uniform unit-XY Model in a screen-anchored effect whose authored width is ≥ the FFBE logical
  width 640 (e.g. Omnislash's black dimming quad) gets `presentationCoverage` via
  `prepare_scene_flashes.py --screen-backdrops` and is stretched over the whole canvas
  (`host.view`); FFBE's field is smaller than ours, so source size left undimmed strips.
  Colour/alpha curves stay source data. Accepted particle flashes keep the arena clip.
  Second form: an opaque constant-colour uniform Quad (width ≥ 200) on screen for ≥ 80 % of
  the effect's longest node life is a background replacement (`unit-quad`, e.g. Cloud AC).
- Impact flashes (prepare_scene_flashes.py `annotate_white_flashes`, applied with the screen
  backdrops): a short (<= 30 frames), uniform-scale Quad of plain opaque white with constant white
  colour, an alpha curve that rises from 0 to at least 0.8 and back, and an effective width >= 200
  units covers the visible battlefield (`unit-quad`) instead of showing as a hard-edged white box.
  Alpha, blend and timing stay source data. Matches only Cloud AC's Omnislash V5 node 62 today.
  Particle form (2026-11-09): a plain white Particle (white texture and constant colour, same alpha
  shape, <= 60 frames, >= 200 units on both axes) on any anchor gets `screen-particle` coverage
  (Squall's Lion Heart front node 3, 360 x 320, 40 frames).
- Original draw order (approximation imports): `tools/bmb_draw_priority.py` reads the header
  priority-sort flag (0x4d) and emitter SortPriority (Quad +508, Particle +408, Model +460;
  verified on 92 matched pairs) into `plan.drawOrder`; `PreparedSceneBridge.applyOriginalDrawOrder`
  sets `renderOrder` (priority, then node index) instead of three.js depth sorting. Done in the
  bridge because `originalEffectPlayer.mjs` is a frozen baseline identity (test_scene_migration):
  never edit the player casually — republishing all presentations then rewrites accepted
  manifests. Meteor Rain's glow was hidden under its smoke until this.
- Texture tint (Texture1 colour scale) is decoded from IBMB (`tools/bmb_texture_tint.py`).
- Spawn horizon (approximation mode): `effectHorizon` reaches the last original hit + 60
  (Holy hits at 450; the fixed 180 cut its late explosion). Recorded in plan.approximations.
- Screen backdrops also cover uniform Basic Particles held on screen-anchored effects for
  ≥ 80 % of the longest life (`screen-particle`, e.g. Holy's fade). Colour/alpha curves do not
  count as movement for any backdrop rule. Screen-sized form (2026-11-09): a static opaque Basic
  Particle authored at >= 300 units on both axes on a screen-anchored effect is a backdrop whatever
  its life (helper ControlNull nodes can outlive it); the texture may be a gradient (Lion Heart back
  nodes 3 and 4). Tests: `tools/test_scene_flashes.py`.
- Limit clips stay on screen: `tools/annotate_clip_extents.py` (also run by export_unit.py)
  stores `extentX` [left, right] (frame px from pivot, 2nd/98th percentile) on every
  `limit_*` clip; `BattleScene.approachX` first aligns the strike, then clamps the caster so
  the whole clip fits the canvas. Cloud's Omnislash keeps x 494; Cloud AC moves from 206 to
  694. Trade-off: FFBE clips are authored for a narrower screen, so caster-attached effects of
  a clamped LB land between caster and target (damage/flash on the target stay in sync).
  After manifest changes rerun `<python> tools/prepare_victory_poses.py --output public/assets/victory-poses.json`.
- Authoring-free import (approximation mode only): most effects in the dump have no matched
  `.bmsln` (the dominant roster blocker). `prepare_original_preview.py` then uses
  `tools/authoring_sources.py`: decoded IBMB controls first, otherwise the BMSLN corpus mode per
  node type/field from `tools/effects/authoring-defaults.json` (rebuild with
  `<python> tools/build_authoring_defaults.py`, 3957 projects). Also in approximation mode:
  binary ConstFlat Quad RGB is evaluated (`--flat-quad-rgb` on), constant opaque corner
  gradients use their mean RGB, single-shot generation modes ≠ 0 read as mode 0. Each
  substitution is listed in `plan.approximations`. Staging still reports
  `missing-matched-authoring`; that is information, not a stop, in approximation mode.

## Skill sound (2026-11-08)

Original skill sounds come from the common SE bank (SE.acb). `node tools/admit_skill_audio.mjs --python <python>`
admits every published presentation whose effect-group cues are all common-bank cues: cue ID →
name (`tools/read_acb_cues.py`) → vgmstream stream (`tools/data/audio-vertical/se-streams.tsv`,
built by looping `vgmstream-cli -m -s N SE.acb`) → `public/assets/audio/combat/<name>.wav`,
pinned in `tools/presentations/source-audio-review.json`; it republishes the presentation and
regenerates `src/audio/skillCueRegistry.ts`, which `src/audio/combatCues.ts` merges with the
hand-mixed cues (default gain 0.23). Run it (then import_character per character) after every
skill import. 48 of 49 presentations play original sounds; only Trigger Smash is silent (its source
has no sound record). Fixed 2026-11-08: vgmstream names a waveform shared by several cues
"cue_a; cue_b", so the tool now maps every cue name in that list (this was the "alias" gap of Big Shot,
Northern Sky Apprentice, Thundaga Blade and Sonic Impact). A sound group that starts before the scene
(Reraise, raw frame -54) plays at frame 0 and keeps `clampedFromFrame`. The generator had literal line
breaks inside its strings since 5e73b50 and did not run; restored. Blade Beam and Climhazzard got their
master sounds recovered into their legacy manifests (audio only, visual data unchanged).

Next: music transitions (menu → battle → victory) are not smooth yet (developer feedback).

## Environment and tools

- Original reference (developer's BlueStacks "FFBE Trace" Memorial instance): adb via
  `C:/Program Files/BlueStacks_nxt/HD-Adb.exe connect 127.0.0.1:5575` (instance port from
  `C:/ProgramData/BlueStacks_nxt/bluestacks.conf`), screen 1080x1920. Battles: Memories → left
  season arrow → "JP Memories" event list → e.g. Chamber of Crystals BGN → Depart. Swipe right on
  a unit card for abilities; tap the card to act. Record with `shell screenrecord` (set
  `MSYS_NO_PATHCONV=1` in Git Bash), pull, extract frames with
  `tools/extract_video_frames.mjs <video> <outDir> [step] [from] [to]` (needs a blank.html next to the video) (Chrome element screenshots, no ffmpeg).
  Party there: Cloud (NV), Delita, Barret, Jack. Compare before claiming colours/placement.

- Python: plain `python`/`py` are not installed. Use
  `C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`.
- Playwright (headless Chrome) for scripted checks:
  `C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`.
- Dev server: `npm run dev` (port 3000). Review servers: Vite on 3001
  (`npx vite --host 127.0.0.1 --port 3001 --strictPort`) + receipt server 3163
  (`node tools/preview_original_skill.mjs --plan tools/data/braver-20261101/source/plan.json --port 3163 --game-origin http://127.0.0.1:3001`);
  restart the receipt server after code changes; `node tools/check_dev_server.mjs` checks freshness.
- Dev hooks: `window.__ffrogueGame` (dev builds); `createTrainingRun` (`src/run/trainingRun.ts`)
  for fixed training battles (encounter 1 = boss dummy, 2 = two dummies).
- Phone review (developer often remote): `node tools/capture_battle_screencast.mjs tools/data/<run>/frames`
  then `<python> tools/screencast_to_gif.py tools/data/<run>/frames out.gif` and send the GIF
  (CDP screencast, no ffmpeg download needed).
- Manual pages: `/tools/test-source-scene.html` (Source review checks),
  `/tools/test-source-limit-burst.html` (Limit Burst playground), `?gallery=arenas`.

## Verification routine (what "done" means)

1. `npx tsc --noEmit`, `npm run build`.
2. All `tools/test_*.mjs` (node) and `tools/test_*.py` (project Python, run from repo root).
   All tests are expected to pass (since 2026-11-08). `test_scene_migration.mjs` pins the VISUAL
   data of the accepted Cloud manifests (JSON without audioSource) and the effect player bytes, so
   sound can improve freely; a visual change there must be deliberate and noted next to the pin.
3. Source review: Vite 3001 + receipt 3163, then
   `node tools/data/cleanup-20261107/review_all.mjs <out.json>`; compare with
   `tools/data/cleanup-20261107/baseline.json` (FAILs saying "requires", "needs an imported",
   "needs its registered", "default party" are not-applicable). Expect 19 applicable PASS.
4. Visual: headless screenshots / video of the changed flow; technical checks are not visual
   acceptance – the developer accepts visuals.

## Next steps (handoff, 2026-11-08 evening)

GitHub account is suspended (appeal pending / maybe a new account): commit locally only, push later.
DONE (2026-11-08): all raw sources moved into rawdata/ (one folder per source; identical files hard-linked,
legacy recorded paths resolved by tools/lib/raw-paths.mjs). See asset_structure.md "Raw-data layout".
DONE (2026-11-08): raw-data audit plus a sixth source (Memorial download cache, holds la842 and ~286 BGM banks).
There is little byte duplication (2.2 of 30 GB), so the sources were not moved; source priority rules apply instead.
Details: docs/asset_structure.md "Raw-data sources and duplicate audit". Cleanup (developer-approved):
tools/data shrank from 92 to 37 GB; all 92 tests and tsc pass afterwards.
Then, in order (scene transition DONE; one-command character importer DONE 2026-11-08 with Squall, see character-import-workflow.md top; one-command stage importer DONE with Dollet/FFVIII, see background-import-workflow.md top; original monster skills DONE 2026-11-09, see enemy-import-workflow.md top; six stages since 2026-11-09: Whisperwood, Mako Reactor, Dollet, Besaid, Altissia, Fabul; NEXT: enemy support skills/debuffs, jump, FFIX once its battle theme is downloaded, run twists) →
complete character importer (one command: body, poses, all skills via import_skill_batch +
admit_skill_audio + icons + LB + forms; test on a new character, e.g. Tifa AC) → stage importer
(stage + SSPB animations + original music + world enemies/bosses with their skills, mainline FF I–XVI
and Tactics only) → run twists. Remaining skill gaps: type 7 ribbons without FieldGoal, Banishga/Dispelga
(BR3M mesh), support skills without mechanics (Esunaga, Protect, Blind, Store, Speed Drink).

## Basic attack sounds and Limit Burst placement (2026-11-08)

- Basic attacks: `node tools/export_basic_attack_cues.mjs` regenerates src/audio/basicAttackCues.ts for
  every published body. It follows unit.effectFrames → effect_group sound field → the first bank-1 cue.
  The importer runs it, so new characters (Squall was missing) get their swing sound. The 18
  existing entries are unchanged.
- LB placement (BattleScene.approachX): the extent clamp that keeps a travelling LB body on screen
  now lets the body leave the screen by up to a third of its travel before shifting the whole
  performance, because a full clamp moved every hit off the target (Lion Heart +107 px, Omnislash V5
  +480 px). Omnislash is unchanged. Hits on target take priority over full body visibility at the
  clip's widest frames.

## Training grounds (2026-11-08)

Main menu → "Training grounds" (src/ui/TrainingSetup.ts, GameFlow.training/startTraining,
src/run/trainingRun.ts options `party`, `opponent`, `unlimitedMp`, `fullLimit`, `onSettle`).
- Setup: pick 1-3 heroes, each with a form (base, 6★, 7★, NV as admitted by the run catalog)
  and up to three skills; then an arena (every BATTLE_ARENAS entry) and an opponent (one or two
  training dummies, or any ENEMY_CONTENT enemy).
- Opponents have 999,999 HP. Unlimited MP sets MP to 999; a full Limit gauge starts at LB_MAX.
- Never saved as a run; only the last setup is remembered in localStorage.
- In battle: Change setup / Restart / Title. A finished fight returns to the setup.
- Verified headless: Squall 7★ form, MP 999, full LB, Lion Heart against Guard Scorpion in Reactor 05.

## Developer playtest feedback (2026-11-08)

Difficulty after the overnight rebalance feels right (a real challenge, healing matters, debuff
badges read well; skill visuals and sounds approved). Polish before the next character import:
1. DONE (interim): heroes hit by enemies get an impact burst, knockback, strike cue and, for heavy
   hits, a camera shake (`playHeroHitFeedback`). Real monster attack effects come with the enemy importer.
2. DONE: original FFBE skill banners (blue party / red enemy, `skill_banner_*` from the battle UI atlas)
   with the ability name large. Root cause of the tiny text everywhere: the unquoted "Source Sans 3"
   family made every Phaser font shorthand invalid (10 px fallback) — RPG_FONT is now quoted.
3. DONE: enemies use the same body sampling rule as heroes (run_rules bodyTextureFilter, linear).
4. DONE: Mako Reactor plays classic FFVII "Let the Battles Begin!" (400842, loop [143152, 3230640)).
   Source: JP Memorial download cache on the VM disk (tools/extract_memorial_side_stories.py),
   which also holds ~286 BGM banks for the stage importer (asset_structure.md).
5. More variety: enemies, stages, music.
6. DONE: music crossfade lengthened (1.2 s in / 0.9 s out). New default battle entry "shatter"
   (src/ui/paintShatterEncounter.ts): the outgoing screen cracks from the centre, breaks into glass
   shards with FFBE's own se_ev_glass_break (SE.acb stream 274), with a white flash
   (cover 980 ms; then the arena fades up from the dark over 900 ms while the camera eases in and the
   command HUD rises; skippable, reduced motion respected). Old styles deleted. Verified with headless frames
   (tools/data/shatter-transition/shatter.gif).
7. DONE (start sequence polish, 2026-11-08): the party slot machine is the "Fate Engine"
   (src/ui/fateEngine.ts + fateEngine.css). Tiers: bronze 3★, silver 4★, gold 5★, rainbow 6-7★, NV.
   Each tier has its own frame, landing burst, popping stars and FFBE summon sound (System.acb
   se_menu_get_unit1-4; reel slide, fireworks, limit open and result cues in public/assets/audio/fate).
   Rainbow/NV reels slow down with a glow first. A team verdict (Humble/Bright/Golden/Rainbow/Unbound)
   scores the whole draw, because most base units are 5★. Reels decelerate and bounce. The lever has a
   crystal handle, and ratchet/brake sounds were re-synthesised. Title crystal: faceted SVG FF crystal
   (src/ui/titleCrystal.css) cycling blue, silver, bronze, gold and rainbow. GIFs: tools/data/start-sequence/.
8. DONE (playtest follow-up 2026-11-08):
   a) Title crystal is a hexagonal bipyramid drawn live in SVG (src/ui/TitleCrystal.ts) that turns about
      its axis with per-facet shading; colour cycling stays in titleCrystal.css.
   b) Tiers split: 6★ = rainbow (subtle), 7★ = prism. Tease, machine flash, shake and fireworks only for
      prism/NV (fateEngine.isShowTier); 5★/6★ get frame, stars and a soft glow.
   c) Shatter only at run start (GameFlow.battle('start')); between fights a 320 ms dip to dark
      ('fade' mode), then the same fade-up. Root cause of the missing run-start shatter: html2canvas
      cannot parse color-mix(), which the verdict banner used, so the snapshot failed. Rule: no
      color-mix()/color() in UI CSS.
   d) Menu and Fate Engine texts rewritten (FATE SEED, "Begin the journey", "Set out", "SPENT").
   e) Page jump fixed: the reel results, verdict and skills panel reserve their space before the first
      draw (the centred layout changed height by ~110 px before).

## Open items

- More Limit Bursts (limit_atk bodies exist for Barret, Aerith, Jack, CoD) and the remaining
  abilities blocked only by missing authoring (ROSTER_SKILL_COVERAGE.md); other gates are
  unknown node types 4/7/15, non-file groups and conditional branches.
- Banish, Holy and Northswain's Strike await the developer's acceptance (GIFs sent 2026-11-07);
  only Meteor Rain was compared with the BlueStacks original so far.
- Motion 8 (Barret's ranged commands) = stationary atk body, zero-prefix timing, from the native
  body observer (SKILL_RECONSTRUCTION_MAP). Big Shot compared with the BlueStacks original
  (charge flash, orange blast/explosion on the target) — matches.
- Open import gates (roster scan 2026-11-08, tools/data/wave2-20261107/stage.json): BMB node
  type 7 (1856-byte records, NOT a Particle variant: Particle offsets read garbage; no BMSLN
  name in the 3957-project corpus) blocks ~25 roster skills and is the biggest next lever;
  type 4 = EmitterSimpleParticle (592 bytes, verified on 163 CPK pairs, no decoder yet);
  type 15 = FieldGoal (208 bytes, particle attractor). Type 7 = lightning emitter, drawn as approximate bolts by
  src/effects/lightningLayer.mjs when it has FieldGoal children (docs/research/bmb-node-type-7-lightning.md). Also: Warring Slash needs repeated
  generation in the frozen player; commands without effect timelines (Limit Braver etc.).
- Batch import: `sh tools/import_skill_batch.sh <batch.txt> tools/data/<run>` (lines:
  `character skillId id key [--heal N|--buff X|--mult X|--mp N]`) composes/stages, drafts the
  recipe entry (`tools/draft_skill_entry.mjs`, provisional gameplay values), prepares in
  approximation mode, publishes and runs import_character per character. Review GIFs after.
- Unsupported node types 7/4/15 are omitted with their subtrees in approximation mode
  (`tools/bmb_prune.py`, listed in plan.approximations). Type 7 + FieldGoal children = lightning/
  line emitters: lightning-centred skills (Thundara/Thundaga/Thundaga Blade) stay unimported.
  Multi-process hit strings ("@", e.g. Spin Drive) split weights per process. Still open: another generation mode
  (Ancient Holy), authoring-comparison mismatches (Finishing Touch, Fusion Sword 2nd/4th).
- Party buffs (Fury Brand, Cheer) reuse the existing physical-boost status (x1.3, 3 rounds,
  allyTargeting living-allies) and need a `friendlyTargetReview` with the source target/range.
  Support skills without a game mechanic (Speed Drink, Store, Return) stay unimported. Reraise now
  has a game mechanic (`auto-revive`, see Product state) but still needs single-ally scope in the
  presentation pipeline and its own Source review before import.
- Balance values from 2026-11-08 are simulator-based and await play-testing by the developer.
- All Cloud forms use the 5★ Omnislash.
- Several node tests pin manifest SHA-256 values of Windows (CRLF) checkouts
  (test_body_assets, test_stage_content, test_victory_poses); on a Linux/LF checkout they fail
  without any content change (verified for test_body_assets: every mismatch matches after CRLF
  conversion).
- Cinzel name font: developer mildly unsure, kept for now.
