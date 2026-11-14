# FFRogue game design: loop v2 (decided 2026-11-14)

Binding product direction from the developer conversation of 2026-11-14. It supersedes the run structure,
party draw, rarity and UI-style statements of `docs/vision.md` sections 2 and 6 (see the vision's
"Präzisierungen 2026-11-14"). Everything else in the vision (original visuals, import pipelines, scope
FF I–XVI + Tactics) stays.

## Why a new loop
The 2026-11 build looks good but plays flat: 6 fights, growth mostly "+20 % attack", rewards that never
change rules, almost no risk decisions, no difficulty ladder, and most players win early. Target feel:
Balatro, Hades 1/2, PokeRogue, Slay the Spire, Across the Obelisk – runs that are hard, readable and
build-driven, and are usually lost the first few times.

## Pillars
1. **FFBE provides the look, FFRogue owns the rules.** Sprites, skill effects, sounds, music, arenas,
   monsters and bosses come from the originals. Damage numbers, costs, effects, statuses, AI and
   progression are FFRogue's own design. No FFBE formulas, chains, rarities or unit systems.
2. **Depth between fights, readable fights.** Builds come from choices (party, skills, Materia,
   Espers, relics, path). Every mechanic must create a choice somewhere and fit one tooltip line.
3. **Hard but fair.** The first win should take roughly 3–6 attempts on the base level; a voluntary
   difficulty ladder keeps experienced players going.
4. **About 30 minutes per run,** resumable at any time.

## Run structure
- **Three acts plus the final boss room.** Each act is a small branching map (Slay the Spire style)
  with visible node types: battle, elite, event, Moogle merchant, campfire, treasure; an act boss closes
  the act. About 10–12 fights per run.
- **Elites** are optional, clearly harder fights with an affix (e.g. Enraged, Barrier, Haste, Reflect)
  and a relic reward.
- **Bosses** (act bosses and the final boss) each carry one rule in the spirit of Balatro's boss blinds
  (e.g. Silence: magic costs double; Doom: win within N rounds; a weakness hit heals the boss once).
- **Enemy scaling** per act and per node depth; the opening should be dangerous until the build forms.
- **Saving:** the run is saved after every map node and every decision; closing the game mid-battle
  restarts that battle from its starting state on resume (same as Slay the Spire / Hades).

## Party
- **Free choice:** the run starts with 3 heroes picked from the unlocked roster (no slot machine in the
  main flow; one canonical character at most once).
- **Fourth hero:** after the act-1 boss a fourth hero joins, chosen from 3 candidates. Four slots map to
  roles (tank, healer, damage, support).
- **No rarity as power.** Every hero starts in the base form. 5★/6★/7★/NV bodies become in-run growth:
  levels and boss milestones awaken the hero into the higher original forms.
- **Variants are aspects** (Hades weapon aspects): Cloud, Cloud AC and Cloud Remake are one hero with
  three play styles (own start skills and look), unlocked by achievements. The roster shows characters,
  not 51 separate entries.

## Build systems
- **Materia** (the Joker layer): 2 slots per hero; rule-changing effects (e.g. Fire: attacks burn,
  Double Cut, Counter, Auto-Life, MP Absorb); Materia levels up through battles (AP). Combinations make
  synergies.
- **Espers** (the boon layer): at the start of each act the party chooses one of three Espers (Ifrit,
  Shiva, Ramuh, Bahamut …) whose themed boons appear during that act; two Espers together unlock rare duo
  boons. Espers can also appear as summons in battle where original effects exist.
- **Relics** (accessories such as Ribbon, Genji Glove, Sprint Shoes): rare and strong, from elites and
  bosses.
- **Hero growth:** experience and levels during the run, awakenings at milestones, new skills, Limit
  Burst ranks.
- **Mechanics the systems need** (ordered by priority): statuses on enemies (burn, blind, break, sleep),
  element imbue and element resistance up/down, regen and MP restore/drain, provoke/cover/counter,
  self-target skills (Limit fill, own buffs). Delayed damage only for Limit Bursts and boss telegraphs.
  Not planned: FFBE ability-enabling chains (process 130), steal, libra, dispel (until enemies buff).

## Economy and meta
- **Gil** per win, with interest on savings (Balatro); the merchant sells Materia, consumables and
  rerolls.
- **Meta progression:** crystals between runs; heroes are unlocked by achievements (defeating a final boss
  unlocks a hero of that game; small quests unlock aspects) and can be bought directly with crystals (no
  gacha). Unlocked Materia and Espers join the pools. Light permanent perks (Hades mirror) only.
- **Start roster:** about 6 heroes derived from the player's favourite Final Fantasies.
- **Difficulty ladder ("crystal levels"):** after the first win, the player adds chosen rules
  (Hades heat / Slay the Spire ascension), e.g. no Phoenix Downs in shops, bosses with a second phase,
  less gil.
- The slot machine (Fate Engine) leaves the main flow. It may return later as an optional "Fate mode"
  (random party for bonus crystals, daily challenge).

## UI
- A new, modern visual style replaces the FFBE window style; PC portrait layout stays.
- Process: 2–3 clickable style mockups (battle screen and map) for the developer to choose, then a design
  system (tokens, type, frames, motion), then all screens migrate. Starts after the run skeleton so no
  screen is polished before its content is settled.
- The battle HUD must hold four heroes.

## Roadmap
1. Run skeleton: act maps, elites with affixes, enemy scaling, boss rules, save per node, own damage
   formula baseline.
2. UI style mockups → developer choice → design system.
3. Status mechanics and Materia; fourth hero.
4. Free party choice, base-form start with awakening as growth, aspects, unlock rules (replaces slot
   machine and rarities).
5. Espers, relics, gil interest, crystal levels.
6. Balancing with the run simulator (overnight) towards "first win after 3–6 attempts".

## Balancing targets (first draft)
- Base level: a new player wins about 1 run in 4–6; act 1 is cleared in most runs, act 3 in about half.
- Fights: normal 3–5 rounds, elite 5–8, boss 8–12.
- No single Materia or relic should be mandatory; each build archetype (element, status, physical,
  support/tank) should reach the final boss in simulation.
