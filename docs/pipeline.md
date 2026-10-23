# Sprite pipeline: superseded entry point

Use the [asset pipeline handbook](asset-pipeline-handbook.md) for the current
status, source map and agent handoff. The original tutorial at this path has been
replaced because its direct downloader/importer and per-character loading examples
predate the reviewed recipe-based workflow.

- [Character import workflow](character-import-workflow.md): exact form selection,
  CGG/CGS interpretation, ffbetool assembly, pivot/timing contract, recipes,
  staged publication and the shared runtime catalog.
- [Background import workflow](background-import-workflow.md): complete static
  images, provenance, arena fit, floor regions and animation limitations.
- [Skill reconstruction workflow](skill-reconstruction-workflow.md): original
  CPK/BMB/M3R data, explicit authoring supplements, capability-aware preview,
  unresolved semantics and the separate publication boundary.
- [Asset structure guide](asset_structure.md): raw source directories and naming.

`tools/import_unit.py`, `fetch_unit.py` and `export_unit.py` still exist as older
or lower-level tools. Their existence does not make direct publication through
shared test folders the canonical import path. In particular, `import_unit.py`
can fetch remotely and write directly to `public/`; it does not provide the
reviewed importer's full validation and registration contract.

The useful pivot rule is retained in the character workflow:

```text
pivotX = (1000 - frameRect.x) / frameRect.width
pivotY = (1000 - frameRect.y) / frameRect.height
```

This preserves the assembly origin across crops. It is not a guarantee that all
poses, alternate atlases or recoil detection are correct without visual review.
Do not add character-specific preload calls; use the runtime content catalog.

Monster body conversion remains available in the lower-level importer with its
monster source type. It does not automatically configure abilities, AI, boss
behavior or a reviewed enemy recipe pipeline. Keep those integration limits
visible rather than assuming that a successfully exported sheet is playable.
