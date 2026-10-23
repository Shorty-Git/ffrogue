# Missing effect source investigation

Checked on 2026-10-22. No runtime files were changed by this investigation.

## Android backup follow-up: exact originals recovered

The developer supplied `com.square_enix.android_googleplay.FFBEWW/` on
2026-10-22. This supersedes the earlier source-availability blocker below.
The backup is excluded from Git and Vite watching.

- Indexed all 446 CPK archives under `files/` (5,272,996,718 archive bytes).
  All 446 member indexes parsed successfully: 117,969 member records, including
  9,835 `.bmb` records. Counts include records across archives, not unique assets.
- All nine missing exact filenames occur in
  `files/common_lang/sd/battleEffect/Ver31_battleEffect1_common.cpk`.
- Extracted all nine with the existing `ffbe_asset_dump-main/tools/cpk.py`
  reader, including CRILAYLA decompression. Every extracted size matches the
  archive's declared size, and each written file was checked with SHA-256.
  All nine have an `IBMB` binary header.
- Ignored evidence: `tools/data/android-cpk-audit/report.json`,
  `members.jsonl`, `extraction.json` (member hashes and provenance), and
  `exact-effects/` (the nine originals).

| Command | Recovered original stems |
| --- | --- |
| Cloud / Climhazzard | `atk_powergeyser_001_purple` |
| Barret / Big Shot | `sp_20108_hardshot` |
| Barret / Grenade Bomb | `eff_convergence_explosion_orange` |
| Aerith / Healing Wind | `eff_fullcure_white` |
| Aerith / Curaja | `wm_1029_cure5_front` |
| Aerith / Banishga | `wm_1017_banish2_back`, `wm_1017_banish2_front`, `wm_1006_banish_back`, `wm_1006_banish_front` |

This verifies archive indexing and these nine payload extractions only. It does
not verify every archive payload, complete texture dependencies, BMB conversion,
original renderer fidelity or runtime support. The next bounded milestone is
to inspect one recovered effect's dependencies and establish a reviewed BMB
conversion/rendering path before publishing any skill.

## Confirmed findings

- The nine exact stems in [the batch report](skill-batch.md) are absent from the
  two project source roots as loose original or converted effect files. Broader
  filename searches for powergeyser, fullcure, hardshot, convergence, cure5 and
  banish found related cure-back variants, not the missing exact files.
- The local `ffbe_asset_dump-main` is a curated extraction, not all original
  game archives. Its [published recovery report](https://raw.githubusercontent.com/DaddyRaegen/ffbe_asset_dump/main/reports/2026-09-29-recovery/REPORT.md)
  states that 128,905 additional destinations (approximately 15.19 GB), including
  effects, were inventoried but not imported. This establishes an omitted asset
  category; it does not prove these particular nine effects exist in that source.
- [ExviusReborn](https://github.com/Hirurawa/ExviusReborn#assets) distributes its
  modified asset package separately as
  [assets.7z](https://drive.google.com/file/d/1DCw_qFpe03-rCnMiKMWAS5EV56XYO-GA/view).
  The initial pass found only the public landing page. The follow-up below
  subsequently inspected its complete directory and compared effect filenames
  with the local package, without downloading the full archive payload.
- Exact-name web searches for `atk_powergeyser_001_purple` and
  `sp_20108_hardshot` did not return an indexed source. That is not proof of
  absence from online archives.
- [The Spriters Resource Barret package](https://www.spriters-resource.com/mobile/finalfantasybraveexvius/asset/102935/)
  lists character motion PNGs. Its 49-item listing does not include the missing
  hard-shot particle effect. Character body animation and skill particles must
  be checked separately. Cloud and Aerith detail requests returned HTTP 403 in
  this investigation; their archive contents were not verified.
- No `.cpk` source archive was found in the project roots. The source recovery
  README's example `T:\Projects\ffbe\dump` is not an available drive here;
  it is not evidence that the developer owns that exact source location.

## Recommended next step

Locate the original GL/JP CPK dump or its existing archive inventory, if available
on the other computer or a separate disk. Search member names for the nine stems
before extracting anything. Record region, archive, member, size and hash, then
extract only exact matches and their referenced resources into ignored research
storage. Do not bulk-import the optional 15 GB collection.

Original `.bmb` files are not ready-to-bake `.efkefc` files: finding an original
solves source availability, while conversion/rendering remains a separate step.
If the original dump is unavailable, compare the ExviusReborn distribution with
our local package before claiming that a fresh download fixes anything. A
different version or filename needs provenance and visual review; a similar
cure/explosion is not an automatic substitute.

Earlier statements that the effects were simply missing should be read as
**missing from the currently searched local extracted packages**, not unavailable
in every original archive or online source.

## Follow-up: direct archive verification

The developer confirmed that no additional original dump is available on the
other computer. The following checks were therefore performed against existing
sources and public metadata:

- Retrieved the actual 7z archive directory of the ExviusReborn distribution by
  HTTP byte-range reads. The remote archive is 5,153,779,360 bytes. Listing its
  175,864 entries transferred 1,666,720 bytes, without downloading or extracting
  the full payload. The header was parsed by `py7zr`, installed into the ignored
  research dependency directory `tools/bin/archive-inspector/`.
- None of the nine missing stems occurs in any remote archive entry. A broader
  family-name search found the same cure-back variants and unrelated map geyser
  present locally. Comparing remote `battle_effect/` filenames with local files,
  excluding `.import` sidecars, found **zero additional remote effect paths**.
  This is a filename comparison, not a byte-for-byte archive-content comparison.
  A fresh download of this distribution has no demonstrated benefit for these
  missing effects.
- Searched local authoring files and text metadata for the missing stems. The
  one extra match is a town event reference to `wm_1006_banish.bmb`; that is a
  reference, not embedded effect data. The required front/back files remain
  absent. Source database variants likewise reference unavailable powergeyser,
  fullcure, hardshot, convergence and banish families; the cure5 back variants
  exist while their front counterparts do not.
- Inspected the complete current ExviusReborn GitHub tree. It includes Effekseer
  runtime support, but no identified Bishamon-to-Effekseer conversion tool or
  source effect asset directory. Inspected the 106-entry, non-truncated tree of
  [FFBE-JP-Decrypted](https://github.com/DaddyRaegen/FFBE-JP-Decrypted): its DAT
  files are not an identified source of these particle files. No claim is made
  that opaque DAT contents were exhaustively parsed.

Local evidence is retained under ignored `tools/data/missing-effects-online/`:
`remote-archive-result.json`, `remote-archive-names.json`,
`archive-comparison.json`, `source-variants.json` and `skill-candidates.json`.
Temporary byte-range probes remain research-only. No executable from an archive
was run and no game assets were replaced.

## Productive next import candidates

Read-only inspection of 42 active entries in the three learning-series catalogs
found eight **unselected** commands whose direct source effect composition and
resources are present, with no conditional branches or empty source groups:

| Character | Command | Source ID | Important remaining review |
| --- | --- | --- | --- |
| Cloud | Cross Slash | 214790 | Five weighted hits, front/back composition and additional status process |
| Cloud | Trigger Smash | 227151 | Indirect/child-skill process; not an ordinary direct strike |
| Cloud | Buster End | 236488 | Eight weighted hits and ten scheduled effect members |
| Aerith | Breath of the Earth | 229752 | Party buffs/regeneration, screen and party layers |
| Aerith | Holy | 10210 | Special damage process and long timeline through F450 |
| Aerith | Reraise | 10230 | Delayed revival status, not ordinary healing |
| Barret | Mindblow | 227871 | MP/status mechanics, source motion 8 and moving/caster composition |
| Barret | Hammerblow | 227873 | Source motion 5 and process 112 require explicit support |

Availability does not approve these skills or establish current-form unlocks,
runtime support or original-game fidelity. Do not silently swap existing commands
for these candidates. The recommended next small milestone is an offline visual
review of **Cross Slash**, before choosing and publishing its game behavior.
For the original six commands, exact reconstruction remains blocked by missing
sources; a deliberately adapted presentation would need an explicit design choice.
