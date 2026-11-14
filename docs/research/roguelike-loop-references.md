# Roguelike loop references for FFRogue loop v2 (2026-11-15)

Concrete patterns from four reference games, each with what FFRogue takes, what it leaves and why. Binding
direction stays `docs/game-design.md`; this note explains the reasoning behind the run skeleton built on
2026-11-15 (`src/run/actMap.mjs`, `src/run/encounterRules.mjs`) and lists options for later systems.

**Source quality.** The cloud session could search the web, but direct page fetches (Wikipedia, kosgames)
were blocked by the session's network policy, so every fact below comes from search-result summaries of fan
wikis, guides and forum posts, not from official documentation or game files. Numbers marked *(unverified)*
disagree between sources or come from a single guide; check them against the game or a primary wiki before
using them for balancing.

## Slay the Spire: map generation and node ratios

What the sources say:
- The act map is a grid climbed bottom to top; the player picks one node per floor and edges only go to the
  next floor. The first floor is always a normal fight, a rest floor sits right before the boss (floor 15 of
  each act), and a treasure floor sits in the middle *(fan guide; floor numbers vary between sources)*.
- Elites and rest sites never appear in the lowest floors (below floor 6 per most guides; the Slay the Spire 2
  patch notes describe a similar "lower-map gate" up to floor 7) *(unverified exact threshold)*.
- Elite, merchant and rest site cannot follow themselves on a path; the same elite never comes twice in a row,
  and a shop never follows a shop *(fan guide, Reddit FAQ)*.
- Elite share rises from 8% to 16% on Ascension 1+ *(single guide, unverified)*. Slay the Spire 2 reassigns
  room types after pruning when too few shops, elites, rest sites or unknown rooms remain.

What FFRogue takes (implemented 2026-11-15):
- Bottom-up act map with non-crossing edges to neighbouring columns; row 0 always a battle; a campfire row
  before every boss; a treasure row in the middle (`ROW_TYPES`).
- No elite before row 2 and never two elites in a row on a path; at most one elite per path in act 1.
- Instead of raw room percentages, FFRogue types nodes constructively so every path holds 2–3 fights below the
  boss. Reason: our runs are ~30 minutes with 10–13 fights (game-design.md), much shorter than the Spire's
  ~50 floors, so fight count variance between paths must be small; the choice is *which* risk (elite, event,
  merchant), not *how many* fights.
- Like StS 2's repair step, a map must contain at least one elite, one event and one merchant (regenerated
  with the next deterministic salt otherwise).

Left out for now: unknown "?" rooms that can turn into fights (our event node is always the shrine), burning
elites/keys, ascension-dependent elite rates (candidate for the "crystal levels" ladder).

## Hades: boons and duo boons

What the sources say:
- Each Olympian offers themed boons; a duo boon is only offered after the player already holds qualifying
  boons from both gods of the pair. In Hades 2 it then appears with about a 12% chance, some duos also need a
  boon rarity or weapon perk, and several gods (e.g. Artemis, Athena, Chaos, Dionysus, Hades, Hermes) have no
  duos *(Hades 2 guides)*. Hades 1 has 28 duo boons *(guide)*.

What FFRogue takes (proposed, roadmap step 5 "Espers"):
- Espers are the gods: the party picks one of three Espers at the start of each act; that act's boon offers
  are themed by it. A duo boon is offered only when the party holds a qualifying boon of each of two Espers
  (e.g. Ifrit + Shiva → a "thermal shock" boon). Reason: duos reward committing to two themes across acts,
  which is exactly the build depth game-design.md asks for, and the requirement fits one tooltip line.
- A low offer chance after the requirement is met (Hades 2's ~12%) keeps duos special; FFRogue should start
  higher (~25%) because a run has far fewer reward screens than a Hades run *(proposal, to tune by
  simulation)*.

Left out: boon rarity tiers as raw power (game-design.md rejects rarity as power), Chaos-style curse boons
(possible later as shrine variants).

## Balatro: boss blinds and economy with interest

What the sources say:
- Every ante ends in a boss blind with one rule that disrupts the build, e.g. *The Wall* (much larger score
  target, sources disagree whether 2× or 4× the base), *The Needle* (only one hand, half the target),
  *The Psychic* (must play five cards), *The Flint* (base chips and mult halved). Only a milder subset can
  appear on ante 1; ante 8 draws from a special set; jokers like Chicot (disable all boss effects) or Luchador
  (disable one) counter them.
- Interest: +$1 per $5 held at the end of a round, capped at $5 (reached at $25). Vouchers raise the cap
  (Seed Money to $10, Money Tree to $20).

What FFRogue takes:
- Implemented: every boss carries exactly one rule shown before the fight on the map and in the battle
  caption: *Silence* (skills cost double MP), *Doom* (win within 12 rounds), *Endurance* (boss regenerates 5%
  per round). Consecutive bosses of a run never share a rule. Elites get one affix the same way (Enraged,
  Armored, Regenerating). Reason: a visible rule before the node lets the player route and prepare — the
  Balatro "read the boss, adapt the build" moment.
- Proposed next: a milder rule pool for act 1 (as ante 1), a counter relic (Ribbon-style "ignore the boss
  rule once", the Luchador pattern), and rules that target builds (e.g. "weakness hits heal the boss once",
  "only two heroes may act per round") once statuses exist.
- Proposed economy: interest of +1 Gil per 10 Gil held when leaving a merchant or campfire, capped at +10 per
  act node *(proposal)*. Reason: rewards saving vs. spending at the Moogle without Balatro's per-round cadence
  (FFRogue has ~20 nodes per run, not ~24 rounds with shops between all of them). Current gil numbers (50 /
  120 / 150 per normal / elite / boss, chest 60–110) are first guesses.

Left out: score-target scaling as the difficulty axis (FFRogue scales enemy HP/damage per act and row instead).

## Across the Obelisk: four-role party balance

What the sources say:
- Four classes — Warrior, Scout, Mage, Healer; 16 heroes, each belonging to one class; the starting team is
  one hero per class (Magnus, Andrin, Evelyn, Reginald). Warriors focus on melee or blocking, scouts add range,
  stealth and poison, mages deal elemental damage, healers keep the party alive. Some heroes blur the lines
  (Heiner as shielder, healer or holy damage; Laia with access to both Warrior and Healer pools).

What FFRogue takes (implemented 2026-11-15):
- A party of four with one hero per role — damage, healer, tank, support — and a default draw that fills
  every role (`src/run/roles.mjs`, `runState.rollParty`). Roles are derived from each hero's published
  skills (heal/raise share → healer; guard vs. buff/debuff share → tank or support; else damage) with a small
  reviewed override table for heroes whose kit and fame disagree (Cecil and Warrior of Light as tanks).
- Like Laia/Heiner, some FF heroes fit two roles; the override table is the place to decide, and later
  aspects (Cloud / Cloud AC) can carry different roles.

Open: the role split of the current roster is uneven (25+ damage dealers, 3 tanks, 4 supports, 5 healers);
tanks need a mechanic of their own (provoke/cover, roadmap "Mechanics the systems need") before the role is
more than a label in battle.

## Sources (search results, 2026-11-15)
- Slay the Spire: [kosgames map generation guide](https://kosgames.com/slay-the-spire-map-generation-guide-26769/),
  [StS 2 map system changes](https://sts2-calculator.pages.dev/v101-map-system-changes),
  [ludo.guide map generation](https://www.ludo.guide/guide/slay-the-spire/pathing-risk-assessment/map-generation-and-branching),
  [r/slaythespire FAQ](https://lr.eu.psf.lt/r/slaythespire/comments/fu0xwq/frequently_asked_questions_read_before_posting/lro4bu5/?context=3),
  [Slay the Spire wiki: map locations](https://slay-the-spire.fandom.com/wiki/File:Shop1.jpg)
- Hades: [Prima Games duo boons](https://primagames.com/tips/hades-what-are-duo-boons-how-get-duo-boons),
  [FandomSpot duo boons](https://www.fandomspot.com/hades-best-duo-boons/),
  [RogueRanker Hades 2 duo boons](https://rogueranker.com/hades-2-duo-boons/),
  [Fextralife Soul Mate](https://hades2.wiki.fextralife.com/Soul+Mate)
- Balatro: [shop economy](https://saschb2b.github.io/game-mechanics/games/balatro/shop-economy),
  [games.gg economy guide](https://games.gg/balatro/guides/balatro-economy-guide/),
  [Dot Esports antes and blinds](https://dotesports.com/indies/news/balatro-antes-blinds-explained),
  [dood.gg The Needle](https://dood.gg/en/balatro/blinds/the-needle), [dood.gg The Flint](https://dood.gg/en/balatro/blinds/the-flint),
  [TV Tropes Balatro](https://www.tvtropes.org/pmwiki/pmwiki.php/VideoGame/Balatro)
- Across the Obelisk: [Gamepressure best characters](https://www.gamepressure.com/newsroom/across-the-obelisk-best-characters/z04930),
  [Steam store page](https://store.steampowered.com/app/1385380),
  [LessWrong review](https://www.lesswrong.com/posts/u3w2h5HerCFAwJJNj/spoiler-free-review-across-the-obelisk)
