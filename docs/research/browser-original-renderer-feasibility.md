# Original renderer in the browser: feasibility audit

2026-10-26 follow-up: user declined manufacturer contact. See
[the successful single-state live native export](live-native-gpu-export.md).
The SDK inquiry below remains an unsent historical option, not the active plan.

Evidence date: 2026-10-25. User requested evaluating full original-renderer reuse
before continuing individual renderer reconstruction. This audit separates the
actual Android image from a separately built BISHAMON browser SDK.

## Result

1. The installed-build Android library is **not a browser-loadable renderer**.
   Its actual ELF64/AArch64 image was inventoried and rejected by V8's WebAssembly
   API at the file magic. No renderer initialization or frames were produced.
2. A BISHAMON WebGL SDK has a documented real browser-game deployment. That is
   a credible alternative, not merely a speculative future port.
3. No matching BISHAMON web SDK or core source was located in the examined project
   paths. Public manufacturer pages do not establish a downloadable compatible
   WebGL evaluation package. Access and legacy-format compatibility are the next
   prerequisites; no browser integration can be tested without that input.
4. A previous isolated native-export experiment already failed to create either
   tested effect inside FFBE Trace. This audit did not repeat it unchanged or
   alter the emulator. It does not establish that native export is impossible.

**Decision:** investigate obtaining the existing WebGL SDK before resuming more
Null/particle reconstruction. Do not assume that a source rebuild, SDK license,
old-data support or exact FFBE behavior is already available. No automatic backend
migration, alternate-effect substitution or game publication follows this audit.

## Existing browser implementation: primary evidence

The developer's [CEDEC2018 implementation report](https://ics.media/entry/18881/)
states that their browser game used an effect SDK compiled for the web with
Emscripten, integrating BISHAMON with Babylon.js. Its shared-context, camera and
render-target discussion is useful for a future Phaser integration. The
[conference session record](https://cedil.cesa.or.jp/cedil_sessions/view/1898)
independently identifies the BISHAMON WebGL integration and its authors.

This proves a browser implementation existed in that project; it does not prove
that we can download it, use the same version, or load FFBE's legacy assets.

The [manufacturer's current Japanese page](https://www.matchlock.co.jp/) lists
web browsers among deployment platforms and describes SDK evaluation requests.
The [public store](https://store.matchlock.co.jp/) currently lists a Personal
DirectX11 SDK. The inspected pages did not expose a matching public WebGL SDK
download. This is **not a claim that no WebGL SDK can be supplied**.
The [manufacturer's contact page](https://www.matchlock.co.jp/contact/) provides
the contract/evaluation contact route. No inquiry, registration or purchase was
submitted. A reviewable inquiry draft is linked below.

[Emscripten's build documentation](https://emscripten.org/docs/compiling/Building-Projects.html)
describes building libraries for its target before linking the web application.
Its [Wasm documentation](https://emscripten.org/docs/compiling/WebAssembly.html)
identifies the LLVM Wasm backend. Installing that compiler alone does not turn
our already-compiled AArch64 Android shared library into a web SDK. A separately
built SDK/source route or a substantially different emulation/translation route
would be required; the latter has not been implemented or benchmarked here.

## Actual local inventory and load probe

Pinned APK SHA256:
`9d21fc8b61c9900eaacb1c2ddef2cabcad1e97d2dc720be16ac09b06fc0086b4`.
Native library SHA256:
`6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`.

`audit_renderer_browser.py` reads the actual APK without loading it. Findings:

- `lib/arm64-v8a/libgame.so`:48,413,928 bytes, ELF64 little endian, machine183
  (AArch64), magic `7f454c4602010100`; no `.wasm` entry in the APK.
- DT_NEEDED: libc++_shared, OpenSLES, GLESv2, EGL, log, android, dl, libc and libm.
-503 undefined dynamic symbols in the **whole game library**; category counts
  include103 graphics,15 Android and28 pthread imports. JNI exports are present.
- Original Bishamon wrapper creation and animation reset/update symbols exist.
  Their presence is not a standalone startup contract.

These game-wide imports are not a transitive dependency proof for an extracted
renderer core. No claim is made that every one is required by a separate SDK.

The actual library was extracted only to ignored tools/data and passed to
`probe_renderer_wasm.mjs` under Node v24.20.0/V8:

- A valid minimal Wasm control instantiated successfully.
- `WebAssembly.validate(actualNativeImage)` returned false.
- `WebAssembly.compile(actualNativeImage)` raised CompileError:
  `expected magic word 00 61 73 6d, found 7f 45 4c 46 @+0`.
- rendererStarted:false; renderedFrames:0.

This is a V8 format/startup prerequisite check, **not a browser-renderer execution
test**, a failed SDK compilation or a proof that binary translation is impossible.
No HTML demo pretending to run the renderer was created.

The project-scoped source/artifact search covered assets/, rawdata/ffbe_data/,
rawdata/ffbe_asset_dump/ and tools/, excluding generated tools/data and bundled JRE/
signing tools. It searched source/header/archive/bitcode/Wasm and Bishamon JS
filenames, not raw texture contents. Its sole match was
tools/bin/effekseer-webgl-1.80.7/effekseer.wasm: a different renderer, not a
BISHAMON SDK. The repository-level runtime/build filename search also found no
matching SDK. This does not inventory unrelated locations on the user's PC.
No emcc/em++/clang/wasm-tools/wasmtime/qemu-aarch64 was on the inspected PATH;
Node was present. Missing compilers are secondary to the missing SDK/source.

## Prior native-export attempt: do not repeat blindly

[The dated native-export report](native-export-feasibility.md) records direct
CreateParam and game-factory attempts for pink impact and green aerial slash.
They returned null animation nodes and produced zero PNG files. Resource setup,
invocation context and ABI causes were left unclassified. RenderTexture creation
alone did not validate pixels, stepping or transparency.

The recent conversational statement that full reuse had never been practically
evaluated was too broad: the Android offline-export path had been tested; the
browser SDK availability path was not covered by that failed attempt. Both facts
must remain visible in future backend recommendations.

## Next concrete input and acceptance test

Obtain a manufacturer-supplied WebGL evaluation SDK, or suitable buildable core
source, with confirmation of its supported legacy data/converter versions.
Use the [prepared inquiry](bishamon-web-sdk-inquiry.md); it has not been sent.

Specific compatibility questions:

- Can it load existing `IBMB` files whose version bytes at our validated header
  position are `01 01 03 01`, plus legacy `.m3r` models/material resources?
- Is direct binary loading supported, or are matching `.bmsln` authoring files
  and an SDK-specific converter/shader package required?
- Can it expose frame stepping, seed/reset controls, external resource lookup
  and view/projection matrices in a browser?
- Which WebGL SDK evaluation and use options are available for a private,
  non-commercial prototype? Do not buy the DirectX11 package assuming web support.

Once that input exists, the acceptance test is one source effect loaded and
rendered in an isolated browser page, then a second different source through the
same path. Report unsupported data explicitly. Only after that test connect the
runtime to Phaser and the skill/group timing metadata. Even a successful SDK
does not supply FFBE's battle-command composition automatically.

## Reproduction and actual checks

```powershell
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/memorial/audit_renderer_browser.py --apk tools/data/memorial-audit/installed-base-v208.apk --output tools/data/browser-renderer-feasibility/native-inventory.json --extract-native tools/data/browser-renderer-feasibility/libgame.so
node tools/memorial/probe_renderer_wasm.mjs tools/data/browser-renderer-feasibility/libgame.so tools/data/browser-renderer-feasibility/wasm-probe.json
```

Both commands executed successfully and produced the findings above. Source and
native hashes were checked before inventory/extraction/probing. Receipts and the
extracted binary are ignored. Public vendor/developer pages were read; no
accounts or external correspondence were used. Whitespace check passed. No game
build, new effect simulation, SDK build, browser render or emulator modification
was performed. Prior86 renderer tests were not rerun for this independent audit.
