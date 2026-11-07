# Ancestor locator observer preparation

Subsequent status: see the [capture result and rollback](ancestor-locator-result.md).
Revision 18 over-recorded descendant calls and was removed; FFBE Trace is back
on verified revision 14. The source observer is now revision 19 with offline
scope/detach regressions, not an installed or performance-verified build.
The preparation/install checks below describe the earlier revision-18 artifact.

Status: 2026-10-24. Revision 18 is installed and startup-verified only in the
existing FFBE Trace clone. **No ancestor capture or hierarchy rule is verified yet.**
This is the bounded successor to the [locator/projection audit](particle-locator-projection.md).

## Named question and native boundary

Observe which functions actually evaluate source nodes 1 and 33 in the pink
impact, and retain their input/output transform fields. Do not infer behavior
from the final white plane or a function name alone.

The pinned native library remains SHA-256
`6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`.
The original pink BMB remains SHA-256
`89c3cb5e7c16df69bf8d1c538622afdd42e30942240141a8147dd55da4de690f`.
No native library or non-script/non-signature APK entry is changed.

Bounded disassembly of `NullEmitterNode::PostUpdate` and its traversal trampoline
establishes these observation points for this exact build:

- The trampoline passes `(object, NodeHeader, UpdateContext)` and replaces the
  second argument with the third before branching. Identification uses the
  original NodeHeader argument, not the Particle object's parameter offset.
- PostUpdate reads the computed-locator callback from object +0x08 and the
  update callback table from +0x28. The observer caps table count at 96.
- Context fields include basis +0x88, rotation pointer +0xd0, quaternion +0xd8,
  scale +0xe8, translation +0xf4 and inherited-basis pointer +0x80. Labels follow
  static accesses; live values still need world/local interpretation. Unreadable
  fields remain null with reasons, never identity/zero substitutes.

Only the named pink wrapper and nodes 1/33 are admitted. Identification checks
the IBMB header at exact source-relative offsets and three 16-byte windows per
node. All six windows also match the previously reconstructed loaded memory.
This is partial source identity, not whole loaded-file equality.

Only fingerprinted translation/scaling/rotation/locator update callbacks and four
bounded computed-locator helpers can be attached. Unknown callbacks remain
unverified. Calls require a matching per-thread ancestor scope and explicit arm.
Each object is sampled at most six times, at least 25 ms apart. The 60-second
window and 2500-event limit remain. No skill or transform mutation is performed.

## Preparation and startup actually verified

The earlier `diagnostic-v17` output belongs to the stopped export prototype and
was preserved. The new observer uses revision 18 and separate ignored output.

```powershell
& $env:FFROGUE_PYTHON tools/memorial/prepare_diagnostic.py --apk tools/data/memorial-audit/installed-base-v208.apk --output tools/data/memorial-audit/diagnostic-v18-locator --mode observe
node --check tools/data/memorial-audit/diagnostic-v18-locator/observer-expanded.js
node --test tools/memorial/test_locator_observer.mjs tools/memorial/test_particle_observer.mjs
& $env:FFROGUE_PYTHON -m unittest discover -s tools/memorial -p test_particle_trace.py
```

The actual artifact passed 16 KB alignment and v1/v2/v3 signature verification
with the existing diagnostic certificate. Same-key `pm install -r --abi arm64-v8a`
succeeded only on `emulator-5574`, configured as `Tiramisu64_2` / FFBE Trace.
No uninstall or main-instance modification occurred. The pre-update installed
hash matched the known revision-14 artifact.

Installed and host APK SHA-256 both equal
`11dc8f81c300d6da1b178ce2bdff348802f21c1e2818b443d2bfde5cc4909b8c`.
Restart produced revision-18 boot, calibration-pass with object `0x1234` and
floats `[1.25,-2.5,3.75]`, ready with 28 hooks and the existing scale reference.
Receipts: `preparation.json`, `startup-log.txt`, `installation.json` under
`tools/data/memorial-audit/diagnostic-v18-locator`. Startup does not prove the
new ancestor callbacks were reached or their context fields are readable.

Seven Node observer tests and six Python trace tests passed. They cover Frida
context preservation, scope/window exclusion, fingerprint reuse, missing-field
reporting and selected-callback/sample provenance. `git diff --check` passed.
No game build or renderer correction was performed.

## Next controlled action

The developer has been asked to prepare Brave Slash and report ready without
executing it. Only then start the tag-only recorder, create a unique arm token
and request these flags:

```json
{"token":"UNIQUE_CAPTURE_TOKEN","sampleFiles":["atk_impact_001_pink"],"particleNode":true,"particleVertices":true,"locatorNodes":true,"cameraSnapshot":true}
```

Copy the arm file to the established clone path after preparation, verify its
matching armed event, then request one execution. A repeated source-memory dump
is unnecessary. Stop the owned recorder after the bounded collection.

`summarize_particle_trace.py` preserves `locatorNodes`, `locatorCalls` and
`locatorUnreadable`, rejecting calls without one matching selected fingerprinted
node/sample. `summarize_trace.py` preserves `locatorRecords` alongside its camera,
wrapper and execution joins. Missing fields/callbacks are an incomplete result,
not permission to select a guessed locator equation.
