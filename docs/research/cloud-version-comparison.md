# Cloud version comparison

Read-only source audit and isolated sprite export on 2026-10-22. No party member,
character recipe, prepared runtime file or catalog registration was replaced.

## Candidate forms

| Form | Exact sprite ID | Local preparation |
| --- | --- | --- |
| Current Cloud | 207000105 | Existing game character |
| Cloud (FFVII: AC) | 207001607 | Exported and validated in ignored research storage |
| Cloud (FFVII REMAKE), base | 207002007 | Exported and validated in ignored research storage |
| Cloud (FFVII REMAKE), alternate form | 207002017 | Exported and validated in ignored research storage |
| Cloud Strife, base | 207003107 | Source inspected; not exported here |
| Cloud Strife, alternate form | 207003117 | Source inspected; missing dead/win/win_before tracks under the current contract |
| Cloud Journeying for Truth | 207003407 / 207003427 | Art/CSV tracks exist; exact forms absent from the current SQLite snapshot |

`node tools/audit_cloud_versions.mjs` reproduces the comparison and writes
`tools/data/cloud-versions/availability.json`. It follows each exact form's
declared learning-series ID; alternate forms can have different series. The
catalog covers level acquisitions, not all limit bursts, child/unlock skills or
equipment-granted commands.

## What becomes easier

The Remake base form has eighteen animation tracks, including `atk1`, `atk2` and
`atk3`. Directly assembled source frames show painted sword arcs and impact
flashes in these tracks. Those pixels already belong to the character animation;
they can be exported as standard sheets with the existing consistent foot pivot.
They do not require reconstructing a separate Effekseer effect to reproduce the
painted portion of an attack.

All required base character states are present. `ffbetool.exe`, `export_unit.py`
and `validate_character.py` successfully prepared AC, Remake base and Remake
alternate form in isolated folders under `tools/data/cloud-versions/prepared/`.
Each export used the corresponding raw atlas and every matching CGS track, with
no published files or registration changes. PNG contact sheets of the actual
prepared frames were inspected; legacy GIF previews are not the validation source.

## What does not become automatic

Original skill IDs still reference effect groups and independent particle files.
For example, Remake Braver (236010, source motion 11) references missing
`atk_thunder1_blue`, `atk_hammer001_f060_blue` and `eff_quick_slash_white` effects.
AC Climhazzard still references the same unavailable purple power-geyser effect.
The newer Cloud Strife's True Triple Slash also references a missing front-layer
effect. A different unit ID does not supply these files.

The source motion codes 9/11 and the relationship between particular skill IDs
and `atk1`/`atk2`/`atk3` must be reviewed explicitly. The extra track names alone
are not proof of skill choreography. No three new tracks were silently assigned
to old skill names, and no imported variant was labeled fully supported.

The previous Cross Slash error was a dropped texture-atlas offset in the existing
conversion, demonstrated against original authoring data. Unit age alone does
not explain or prevent that class of conversion defect.

## Recommendation

Use **Remake base form 207002007** as the candidate for a separate in-game trial.
It offers a more detailed dark-outfit sprite, all required character states and
three inspectable attacks with painted visual components. Start with the normal
attack and one explicitly reviewed attack track, preserving pivots and verifying
target approach/return. Then decide whether to reproduce original skill mechanics
or deliberately define simplified roguelike attacks around the available tracks.

Do not replace the current character merely by changing its ID while retaining
old skill ownership or inferred motion mappings. A full original-skill import
still needs separate asset availability, choreography and mechanics checks.

Research artifacts:

- `tools/data/cloud-versions/cloud-idle-comparison.png`
- `tools/data/cloud-versions/nv-extra-attacks.png`
- `tools/data/cloud-versions/availability.json`
- Per-form preparation logs and validated manifests in the same ignored directory.

## GL/JP metadata and ffbetool follow-up

Both local `ffbe_data-master/gl/` and `/jp/` were checked, including `unit.json`,
`ability.json`, `learns.json` and `limits.json`. Neither snapshot contains the
requested Remake form IDs 207002007/207002017 or the checked Remake skill IDs
236010/236027/236032/236034/236045. The JP unit file has 1,115 records, the GL
unit file 269; these are record counts, not distinct character counts. The JP
`lastmodified.txt` marker decodes to 2018-02-09 UTC. It is a snapshot marker,
not independent proof of the modification date of every file. GL has no such
local marker. The audit now records file hashes and exact key-presence checks.

These files remain useful for original Cloud and decoded mechanics (for example,
Cross Slash's weighted hits and paralysis). They cannot supply missing artwork
or establish this newer Cloud's mapping when its exact records are absent.

The [current ffbetool documentation](https://github.com/dsxragnarok/ffbetool)
describes PNG-atlas plus CSV assembly into spritesheets, JSON, GIF and APNG.
The local executable's actual `--help` was checked, and it was used successfully
for the three isolated exports above. It is already the canonical character
assembler in this project. Its documented function does not assemble an entire
skill from master effect groups, separate Bishamon/Effekseer particles, target
choreography and damage events. Painted effects inside a character atlas do
benefit directly from this tool. The older JavaScript
[sprite-sheet assembler](https://github.com/dsxragnarok/FFBE-sprite-sheet-assembler)
is deprecated in favor of the Rust ffbetool.

## Newer independent GL JSON snapshot

On the developer's follow-up about community JSON dumps, a newer independent
[aEnigmatic GL dump](https://github.com/aEnigmatic/ffbe) was fetched into ignored
`tools/data/community-gl/`, without replacing either local regional snapshot.
The download was pinned to Git tree
`95727376e82d27acc1290b6dc8ad27ce3c89ea71`, and exact file sizes and SHA-256 hashes
were recorded in `cloud-remake-extract.json`.

- `units.json`: 1,751 records; both 207002007 and 207002017 exist.
- `skills_ability.json`: 28,212 records; all five requested Remake IDs exist.
- Skill records include costs, hit counts, weighted hits, attack/effect frames,
  movement and motion codes, decoded effects, raw process data and requirements.
- Infinity's End 236032 invokes child skill 236033; Triple Slash 236045 invokes
  236046. Disorder 236034 unlocks 236035 under a cooldown condition. Ownership,
  requirements and execution cannot be reconstructed by examining only the
  directly learned parent row. Exact child records and SQLite rows were inspected
  separately in `cloud-child-skills.json`.
- The raw brave-shift table was fetched, but direct keys matching these full
  sprite IDs were absent. No shift mapping was inferred from that alone.

This is useful additional metadata evidence. It does not fill missing particle
files, prove the meaning of motion code 11, or automatically make an indirect
skill supported. GL and the project's SQLite snapshot remain separate; differences
must be reviewed rather than merging by name or silently replacing recipes.
