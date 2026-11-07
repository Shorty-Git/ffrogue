# Memorial client access feasibility

Read-only discovery on 2026-10-24. No emulator settings, application files,
instrumentation scripts or published game assets were changed.

## Observed local state

- BlueStacks supplies `C:/Program Files/BlueStacks_nxt/HD-Adb.exe`.
- `HD-Adb.exe devices -l` returned no devices. The BlueStacks configuration
  reports `bst.enable_adb_access="0"`; the user was asked to enable ADB in the UI.
- A local download named `FFBE-Memorial-EN-Patch-5-Units-Cards.apk` is available.
  Its presence is not proof that the same APK is installed in BlueStacks.
- APK size: 145144781 bytes.
- APK SHA-256: `534a3ddd18de17ce22db3ab822127308d5463f55f61e2c8e506e50b05875e208`.

## Static APK inventory

The ZIP inventory contains 315 entries, including:

- `lib/arm64-v8a/libgame.so` (48413928 uncompressed bytes), plus an ARMv7 build.
- `lib/arm64-v8a/libfrida-gadget.so` and its configuration.
- `assets/frida_script.js` (197094 bytes); inspected as text, never executed.
- `assets/bishamon/bmshaderpack.bin` and `bmshaderpack_gl2.bin`.

The supplied script uses Cocos2d JNI helpers and hooks named exports in
`libgame.so`. Its Gadget configuration selects script mode with a private
application-file path. This does not demonstrate a remotely attachable Frida
endpoint or permission to replace the installed script. Its `dbg` function is
empty, so detailed diagnostic output must not be assumed to exist.

The ARM64 ELF dynamic symbol table contains 98913 defined global/weak entries.
A targeted name filter found 240 Bishamon/effect-related symbols, including:

| Symbol, demangled for readability | Potential observation boundary |
| --- | --- |
| `BattleCmdEffect::setEffectGroupID(int)` | Effect-group association |
| `BattleCmdEffect::init(...)` | Battle unit/effect relationship |
| `BishamonData::create(ml::bmfw::CreateParam const&)` | Native effect creation |
| `BishamonData::setPosition(float, float)` | Position passed to the wrapper |
| `BishamonData::setScale(float)` / `setScale(float, float)` | Scale passed to the wrapper |
| `BishamonData::setRotate(float)` / `setRotate(float, float, float)` | Rotation passed to the wrapper |
| `BishamonData::setWaitFrame(int)` / `setLayerId(int)` | Delay/layer values |
| `BishamonData::update(float)` / `draw(...)` | Simulation/render boundaries |

Names and signatures establish entry points, not argument semantics, call order,
working instrumentation or a batch-export interface. Native rendering behavior,
shader equations and a clean transparent capture path remain unverified.

## Next bounded experiment

1. Once the user enables ADB, identify the installed package/version/ABI and APK
   hashes. Match the actual native library before considering symbol addresses.
2. Read accessible resource inventories and existing app-scoped diagnostics.
   Do not bulk-copy unrelated application data, preferences or account files.
3. Assess whether the existing community instrumentation can support a minimal
   observation-only trace. Changing or injecting app code is a separate step;
   it has not been performed or validated here.
4. If feasible, trace one skill's group, resource creation and wrapper transforms.
   Compare the trace to the existing database/plan and use a control skill before
   generalizing. Do not implement a new renderer or enumerate every skill first.

Evidence stays ignored under `tools/data/memorial-audit/`: `apk-inventory.json`,
the extracted script text and `native-exports.json`. ADB is transport/shell access,
not an automatic trace of native calls or GPU rendering.

## Follow-up: installed build and accessible archives verified

After the user enabled ADB, `HD-Adb.exe devices -l` reported `emulator-5554`.
Read-only package inspection identified `com.square_enix.ffbejpn`, version name
11.1.1, version code 208, primary ABI ARM64. The package was not running when its
PID was first queried. No app launch or UI interaction was performed.

The installed APK was copied to ignored storage and its host SHA-256 matched
the device-side hash:
`9d21fc8b61c9900eaacb1c2ddef2cabcad1e97d2dc720be16ac09b06fc0086b4`.
Its size is 145206221 bytes. This supersedes the earlier uncertainty about the
installed build, while retaining the earlier download's distinct identity above.

- Installed `libgame.so` SHA-256:
  `6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`.
  It is byte-identical to the earlier APK's ARM64 library, so the discovered
  exported symbols also apply to this installed package's native library.
- The installed APK's Frida script differs (208272 bytes). Its Gadget remains
  configured for private-file script mode. The observed explicit Android log
  tag is `FFBE-UnitSearch`, not a skill/resource playback trace. A bounded read
  of that log tag produced no output.
- Reading `/data/user/0/com.square_enix.ffbejpn/files` was denied. `run-as`
  failed with `setegid(AID_PACKAGE_INFO) ... Operation not permitted`.
  No root, permission changes, script replacement, injection or attach was tried.
- External asset packs are readable under
  `/sdcard/Android/data/com.square_enix.ffbejpn/files/assetpacks/`.
  Filename enumeration returned 2727 CPK paths. This is an inventory, not a
  verification of every archive. The OBB directory checked was absent.

One archive was selected instead of copying the full resource collection:
`on_demand_asset2/199/199/assets/battleEffect1.cpk`, 15529064 bytes,
SHA-256 `c28b85d633127193682b95b6aaee9ad11c983c32e3aa96fdada6983ddeecb698`.
The existing CPK reader parsed 4740 members, including 4738 BMB files.

Three selected payloads were read and parsed with the existing structural reader:

| Original member | Nodes | SHA-256 matches existing research plan |
| --- | ---: | --- |
| `atk_impact_001_pink.bmb` | 35 | Yes |
| `atk_aerialslash_001_green.bmb` | 13 | Yes |
| `atk_powergeyser_001_purple.bmb` | 30 | Yes |

This proves that these Memorial source payloads are already represented in our
current research inputs. It does not verify all components of the three skills,
textures/models, complete timelines or rendered output. Further bulk extraction
or another BMB reader is not justified by this sample. The next decision is how
to establish a controlled native-call observation path despite the private-file
restriction; ADB availability and the bundled Gadget do not establish that path.

Ignored receipts: `installed-build.json`, `installed-cpk-paths.txt`,
`archive-read-check.json`, `cloud-source-comparison.json`, the installed APK and
the single copied CPK. Game source and published assets remain unchanged.

## Instrumentation access decision

A subsequent access check on 2026-10-24 confirmed:

- Both configured BlueStacks instances have root access disabled. ADB shell is
  UID 2000, not the application's UID. `ro.debuggable=1` does not change the
  application's missing DEBUGGABLE flag or grant private-file access.
- Gadget uses `interaction.type=script`, the private file path above, and
  `on_change=ignore`. The embedded application script contains no `rpc.exports`
  or implemented external observation command interface.
- No host `frida`/`frida-ps` command was found on PATH. Installing those alone
  would not supply a device-side attach endpoint for this configuration.
- No Java/keytool/jarsigner/apksigner/apktool command was found on PATH. This is
  not an exhaustive search for software installed elsewhere.

Per the [official Gadget documentation](https://frida.re/docs/gadget/), Script
and Listen are distinct interaction modes. Script mode does not imply a
frida-server-compatible listener. No port forwarding, root activation, package
replacement, private-file writes or process injection was attempted. There is
no working live trace yet.

### Proposed isolated diagnostic change

Use a separate emulator clone, retaining the original application's package ID
inside that clone so its existing resource paths remain valid. First establish
that the clone is disposable and that the original instance is not the target.
Creating or modifying that clone has not been performed in this audit.

Prepare a diagnostic APK from the exact archived installed build:

1. Preserve the community script's existing behavior and add a bounded native
   observation module to `assets/frida_script.js`. Retain autonomous Script
   mode; an open remote-control listener is unnecessary for initial logging.
2. Verify the bootstrap actually copies/loads the packaged script. Updating an
   APK asset alone is insufficient if an older private script is retained.
3. Observe only one action window and cap output. Initial events: effect-group
   assignment, effect-object lifecycle, resource names, layer and wait-frame
   setters. Do not log arbitrary file contents or hook every draw/update call.
4. Validate ARM64 argument handling before trusting transform values. Float
   arguments must not be read as integer/pointer `args[n]`; complete position,
   scale and rotation capture is still an unresolved prototype requirement.
5. Emit structured records under an app-specific Android log tag. Collect that
   tag through ADB without clearing other logs or exporting unrelated data.
6. Sign as a separate diagnostic artifact and install only in the test clone.
   A changed signature must not trigger uninstall/replacement of the working
   original instance. Signing and installation have not been prepared or run.

Acceptance gate: one Blade Beam action produces a bounded, attributable trace
with group/resource association and verified transform/timing values. A known
control or calibration must establish how captured values relate to the API
and the visible effect. Do not treat only function names, successful script
loading or incomplete integer-only logs as meeting this gate.

If the clone, signing/bootstrap or argument-capture prerequisite is not feasible
within a small experiment, stop and report that specific limit. Do not silently
switch to root, alter the main installation or resume broad renderer guessing.

### Preparation status and unresolved ABI boundary

The user was asked to create a separate BlueStacks clone named `FFBE Trace` or
choose file preparation only. No clone identity has yet been supplied. APK
generation, signing and installation must not be reported as completed.

A static DEX string scan finds `FridaBootstrap`, `copyAsset` and
`frida_script.js`. This suggests a packaged-script bootstrap but does not prove
its overwrite policy. The ignored `bootstrap-methods.json` explicitly labels its
code-unit reference scan as heuristic, not validated disassembly. Do not infer
control flow from its candidate references.

For transform observation, Frida's published
[`GumArm64CpuContext`](https://github.com/frida/frida-gum/blob/main/gum/gumdefs.h)
contains floating-point/vector registers. A CModule listener may offer an
observation-only way to read them without replacing game functions. Compatibility
with the exact bundled Gadget and BlueStacks ARM translation must first pass a
known-value calibration; it has not been compiled or run. The original script
already indicates a Frida 17 Gadget, but that comment is not an exact version
measurement.

The bounded route is therefore autonomous logging in a diagnostic APK inside a
confirmed disposable clone, followed by calibration and one skill trace. Opening
a network listener, enabling root or installing a general Frida server is not a
prerequisite of that proposed route. This is a feasibility plan, not a working
capture/export capability.

## Diagnostic APK preparation and isolated installation

The user created `FFBE Trace`, BlueStacks instance `Tiramisu64_2`, ADB
`emulator-5574` (configured port 5575), with root disabled. The original instance
is `Tiramisu64` / `emulator-5554` and is not an installation target. The user
explicitly authorized uninstalling/reinstalling FFBE only in the trace clone
after being told that its application settings/save would be lost.

Reproducible preparation:

```powershell
& $env:FFROGUE_PYTHON tools/memorial/prepare_diagnostic.py --apk tools/data/memorial-audit/installed-base-v208.apk --output tools/data/memorial-audit/diagnostic-v1
node --check tools/data/memorial-audit/diagnostic-v1/observer-expanded.js
```

Use an unused output directory; the preparer refuses an existing output APK,
unexpected source/library hashes, missing symbols and output outside ignored
`tools/data/`. It preserves the community script as an exact prefix, appends
`tools/memorial/observer.js`, and checks that no other non-signature APK entry
changed. The native library remains unchanged. Fourteen named exports have
16-byte code fingerprints checked again on the device before hook installation.

The prototype uses a CModule callback for ARM64 FP registers. Before installing
game hooks it captures pointer `0x1234` and floats `[1.25, -2.5, 3.75]` from a
known native function. Failure emits `calibration-failed` or `blocked` and does
not enable game observation. This runtime calibration is not yet verified.
The observer logs only to `FFBE-Trace`, limits output to 2500 messages, and
observes 12-second windows following engine command-init boundaries. Those
boundaries are not yet identified as original skill IDs. Resource requests from
other native loading APIs may be absent from this initial prototype. Captured
native transforms are evidence, not already-decoded coordinate conventions.

Official portable preparation dependencies, kept ignored:

- Eclipse Temurin JRE 17.0.20.1+1, downloaded through Adoptium's API. ZIP SHA-256:
  `bc21a93923103cdaac93ee337b0ae4365e739fde36df823dd456bc67c8a9d352`.
- Google Android build tools 35.0.0. ZIP SHA-1 from Google's repository metadata:
  `af059bb67cf7786f45ee0db85e2d24985df1b4b6`. Only zipalign, its pthread DLL and
  apksigner.jar were extracted to `tools/bin/memorial-signing/`.
- A locally generated diagnostic-only RSA key/certificate under
  `tools/data/memorial-audit/signing/`; never commit the private key.

`zipalign -P 16 ...` preceded signing. Google apksigner verified v1, v2 and v3
signatures; the signed APK also passed zipalign's alignment check. Its v1 check
warned about META-INF metadata entries; v2/v3 verification succeeded. Certificate
SHA-256: `8c6aaf05cd02d2fb40849a0d89510a70bfbab892a3433e5956d995af74f0d9c2`.
Signed APK SHA-256:
`ffe12e9adebdf008ee62ebca6a6415a9ea50c1ef9a03dc24c09510b718f2f04b`.

Before the clone-only uninstall, 3127 external asset-pack files (6911553805
bytes) were copied to `tools/data/memorial-audit/trace-clone-backup/`. Relative
file paths matched the source inventory; remote content hashes were not checked.
Private app settings could not be backed up through this access path.

The first install command failed because BlueStacks bundles ADB 1.0.36 and the
client does not support the modern `--no-streaming` option. Transferring the APK
to `/data/local/tmp/ffbe-trace.apk` and invoking `shell pm install --abi arm64-v8a`
succeeded. The installed APK hash matched the signed artifact. Asset restoration
completed: all 3127 backed-up relative file paths were present again. This is a
path-inventory check, not a full restored-content hash check. The local receipt
`diagnostic-v1/installation.json` records `assetsRestored: true`.
No launch, runtime calibration or live skill trace has yet been verified.

Read only the diagnostic tag, without clearing logs:

```powershell
& 'C:/Program Files/BlueStacks_nxt/HD-Adb.exe' -s emulator-5574 logcat -d -v raw -s 'FFBE-Trace:I' '*:S'
```

Check `boot`, `calibration-pass` and `ready` before collecting a skill. Treat
`blocked`, `calibration-failed`, absent resource names or exhausted output budget
as incomplete results. Do not install on the original instance or interpret a
successful signature/ZIP check as a successful runtime trace.

### Revision 2: startup calibration verified (2026-10-24)

The first app launch emitted `boot` followed by a CModule compiler error:
`gum_invocation_context_get_cpu_context` is not a declared function. The correct
public context field is `ic->cpu_context`, as defined in the
[Frida invocation-context header](https://raw.githubusercontent.com/frida/frida-gum/main/gum/guminvocationcontext.h).
The observer now uses that field and identifies itself as `observerRevision: 2`.

Rebuilt from the same source into `diagnostic-v2`, aligned, signed with the same
diagnostic key and verified with apksigner (v1/v2/v3) and zipalign. Installed on
`emulator-5574` using `pm install -r --abi arm64-v8a`, without another uninstall.
Installed APK SHA-256:
`041e2c73f6efb7a0659eb72bab12b60caaf14f4f11a47836c6d112c0ee449d35`.

Starting the resolved activity `com.square_enix.ffbejpn/.Lapis` produced:

- `boot` with observer revision 2.
- `calibration-pass`: object `0x1234`, values `[1.25, -2.5, 3.75]`.
- `ready`: 14 hooks, 12000 ms observation windows.

This also verifies that this update's packaged observer was loaded on restart.
The ignored `diagnostic-v2/startup-log.txt` and `installation.json` retain the
local evidence. No live battle or skill trace has been collected yet.

The game requested a 9869.765 MB data download after the initial fresh install,
despite the external asset-path restoration. The precise reason is unverified;
private download/asset-registration metadata was not accessible for backup.
File presence alone does not establish that the game recognizes restored packs.
Do not invent download completion flags or change the original instance to
bypass this screen. A normal download in the diagnostic clone is the next
practical step to reach a battle; the actual required transfer remains unknown.

### Download pause investigation

The first download attempt repeatedly logged `Cannot create download folder`
from `O1.CdnDownloader` / `O1.ResumableTransfer`. The emulator reported 106 GB
free. Restored `files/assetpacks` and its child directories were owned by `shell`
with mode 2770; the package UID is 10107 (`u0_a107`). The `files` parent is owned
by the app. This makes the ADB-restored tree a potential access blocker; the log
does not include the exact failing destination path.

In the diagnostic clone only, the restored tree was renamed within the same
parent to `files/assetpacks-adb-backup`, without deleting its contents. The host
backup also remains intact. A temporary top-directory chmod probe was reverted
to 2770 before the rename. The next download retry must verify whether the app
creates its own tree and the error disappears; this has not yet been confirmed.

The user subsequently confirmed that the retry progressed and reached the main
menu. A read-only check then found a new `files/assetpacks` owned by `u0_a107`,
mode 2770, instead of `shell`. The same app process (PID 5536) retained the
revision-2 `calibration-pass` / `ready` startup records, with no captured action
boundaries yet. This supports the restored directory access issue as the cause
of the pause; it does not establish why the initial download was requested.

A host-side, tag-filtered `logcat -v threadtime -s FFBE-Trace:I '*:S'` capture
was started under an ignored `tools/data/memorial-audit/capture-*/` directory
before the first requested Blade Beam test. Capturing starts with retained
startup records; it does not clear logcat. Source character/form and ability
identity still require confirmation from the actual test selection.

### First reported skill test and revision 3

The user reported executing the requested skill. The capture contained only
startup records for PID 5536, with no action boundaries or skill records. A
fresh logcat read confirmed this was not merely a stopped host capture. Thus
revision 2's command-init gate did not open; its absence cannot prove that the
other effect hooks were not called. No skill parameters or fidelity conclusion
can be extracted from this first attempt.

Revision 3 counts calls independently of the recording gate and emits a
`hook-census` every 30 seconds. The observer polls the dedicated external file
`files/ffrogue-trace-arm.txt`; a changed nonempty token enables recording for
60 seconds, independently of command-init. The global 2500-record bound remains.
The arm file must be readable by the app (the shell-created probe used mode 644).
This is a clone-only diagnostic control file, not a download-completion flag.

The rebuilt APK passed syntax, signature and alignment checks and was updated
with `pm install -r` in the clone, then the resolved activity was restarted.
Signed APK SHA-256:
`2e9e8ea328338d06752e8448c300f179a43947275deec00c4c28173c61e15c8b`.
Live logs confirmed revision 3, calibration values `[1.25, -2.5, 3.75]`, 14 hooks
and `armed` for token `startup-probe`. This verifies manual arming, not a working
battle trace. Prepare the battle first, arm only when the selected skill is
ready, then execute once. Hook reachability in a battle remains unverified.

### First manually armed battle window: native setters captured

The user prepared and then reported executing Blade Beam once after token
`blade-beam-20261024-020345` was acknowledged by `armed` at observer ms 445234.
The selected 60-second window contains 25 transform records and 10 integer
records across five distinct object pointers. Startup calibration had passed.
Raw snapshots and the object summary are retained locally as
`diagnostic-v3/blade-beam-test-log.txt` and `blade-beam-first-window.json`.

| Object (capture-local suffix) | First call ms relative to arming | Position XY | Final captured scale XY | Layer ID | Wait-frame input | Rotation XYZ |
| --- | ---: | --- | --- | ---: | ---: | --- |
| `3b263b80` | 8068 | 458, 367 | 1, 1 | 2 | 1 | 0, 0, 0 |
| `3b1babc0` | 8071 | 464, 370 | 1, 1 | 2 | 1 | 0, 0, 0 |
| `3b18c100` | 8336 | 127.5, 419.5 | 1, 1 | 3 | 3 | 0, 0, 0 |
| `3b151b90` | 8346 | -936, 341 | 3, 3 | 3 | 2 | 0, 0, 0 |
| `3b392af0` | 8352 | 141.5, 417.5 | 1, 1 | 3 | 7 | 0, 0, 0 |

The existing Blade Beam source record (ability 214810) expects group 5003901
with `atk_aerialslash_001_green.bmb`, scale 300 percent and raw member offset
`-1100`, plus group 1000660 with `atk_slash5_blue.bmb`, scale 100 percent.
The captured triple scale and negative X are compatible with those inputs but
do not establish an object-to-file mapping. Do not derive a target anchor from
`-936 + 1100` without independently observing the native anchor calculation.

There are still **no** captured command-init, group-ID, effect-init or resource
filename records in this window. Action remains zero because the command hook
was not reached. The five objects may include other battle feedback. The user
report establishes the intended test, not a trace-verified ability/form ID.
Wall-clock setter call gaps are not animation impact timings, and layer IDs 2/3
are raw values rather than proven front/back meanings.

This establishes that the calibrated native setter hooks are reached in a live
battle. The next bounded investigation is to associate the same object pointers
with original filenames at the actual creation/loading path (a `getFileName`
export exists but its return ABI and safe use have not been established).
No renderer correction, new skill publication or complete extraction claim is
authorized by these records alone. Do not repeat the same skill test until the
missing identity capture has been addressed.

### Revision 4: exact-build filename-field observation prepared

Offline inspection of the pinned native library with Capstone 5.0.9 found
`BishamonData::getFileName()` at ELF virtual address `0x15bd5b0`:

```text
add x1, x0, #0x4a8
mov x0, x8
b   #0x10d9270
```

The wrapper forwards the field at object offset `0x4a8` to the copy path with
the indirect result destination from x8. Calling this as a simple pointer-return
getter would be incorrect. Revision 4 does not invoke it. Instead it applies
the existing bounded libc++ string reader directly at this field during the
already reached native setters. Printable, nonempty results emit `effect-file`
with the **same object pointer** as the associated transform/integer records.
Names are retried on later setters, deduplicated per object/name and cleared
when a new capture token is armed. Missing/unreadable strings leave the game
unchanged; they do not produce a guessed filename.

The builder checks the getter's first two instruction encodings and embeds its
16-byte fingerprint alongside offset 1192. Runtime verifies that fingerprint
in addition to all hook fingerprints before attaching anything. This is a
version-specific field observation, not a general ABI-independent extractor.
The C++ string layout and field contents still need validation against actual
live filenames; an instruction match alone does not establish that result.

The revision-4 APK passed expanded-script syntax, Python compilation, APK
signature v1/v2/v3 verification and 16 KB ZIP alignment checks. Clone-only
`pm install -r --abi arm64-v8a` succeeded, and the installed APK hash matched:
`d3be5958efe831f9da653e3f11c4dfdc83ee697d221db0acc3a4750c97335c33`.
On restart, revision 4 logged `calibration-pass`, `ready` (14 hooks) and `armed`
for the retained previous token. Local startup evidence is in
`diagnostic-v4/startup-log.txt`; no new live `effect-file` record has yet been
verified. The update preserved downloaded app data and did not touch the main
instance. Prepare the next test before issuing a fresh capture token.

### Revision 4 controlled test: filenames joined to native setters

The user prepared the skill, token `blade-beam-filenames-20261024-030743` was
acknowledged at ms 3536840, and the user then reported one execution. This
window captured **49 setter records plus seven filename records across seven
objects**. The calibrated filename-field reader produced nonempty effect keys
without `.bmb` extensions, joined by the same object pointers as the setters.

| Observed native key | Object count | Captured scale XY | Layer ID | Wait-frame input |
| --- | ---: | --- | ---: | ---: |
| `sp_20000_activation_01` | 2 | 1, 1 | 2 | 1 |
| `atk_slash3_green` | 2 | 1, 1 | 3 | 3 |
| `atk_aerialslash_001_green` | 1 | 3, 3 | 3 | 2 |
| `atk_slash5_blue` | 2 | 1, 1 | 3 | 7 |

Both filenames expected by the selected Blade Beam source were observed. The
wave's object `0x7bdd3b3c2f70` received XY `[-944, 341]`, scale `[3, 3]`, wait 2
and zero rotation. The two blue-slash objects received XY `[186.5, 462]` and
`[84.5, 402.5]`, scale `[1, 1]`, wait 7 and zero rotation. This directly joins
observed native names with setter inputs; it does not identify the selected
ability ID, actor form or target assignment. Additional activation/green-slash
objects are retained as observed window contents, not added to the Blade Beam
recipe. Do not infer that every observed object belongs to the selected skill.

The source comparison confirms the observed wave scale equals the source's
300 percent and the blue-slash scale equals 100 percent. Layer IDs remain raw
integers. Wait-frame inputs 2 and 7 are **not** a proven replacement for source
group start ticks 0 and 4; scheduling semantics and placement jitter/anchors
remain unresolved. Native particle/model/material/UV evaluation was not captured.

Reproduce the summary from the ignored raw snapshot:

```powershell
& $env:FFROGUE_PYTHON tools/memorial/summarize_trace.py --log tools/data/memorial-audit/diagnostic-v4/blade-beam-filenames-log.txt --token blade-beam-filenames-20261024-030743 --source tools/data/shared-skill-review/blade-beam/skill-source.json --output tools/data/memorial-audit/diagnostic-v4/blade-beam-filenames-summary.json
```

The summary tool accepts raw or prefixed logcat JSON, requires one matching arm
token and boot provenance, limits records to that window/session and preserves
all captured object records. Exact source basename matches are reported without
silently assigning unmatched names. `identityVerifiedByTrace` stays false:
the source skill/form is a caller-supplied comparison, not a captured engine ID.
The command above was executed successfully against this actual capture;
calibration was present and both expected component basenames matched.

This milestone establishes reusable filename-to-transform observation in the
specific diagnostic build. It is **not** a complete renderer/export pipeline and
does not alter any reviewed gameplay effect. The next bounded task can compare
these confirmed component inputs with the research preview, keeping unknown
anchor/scheduling semantics explicit rather than copying screen coordinates as
universal constants.

### Preview comparison and source-marker correction

`summarize_trace.py --plan <plan.json>` now adds a reproducible member comparison
by exact effect basename, retaining all matching object inputs and the plan's
source/effect hashes. It checks scale equality and zero rotation only; it does
not equate native pixels, raw layer IDs, angular units or scheduler values with
the preview's coordinate/timeline conventions.

| Component | Preview start | Native wait | Preview / observed scale | Rotation |
| --- | ---: | ---: | --- | --- |
| Green wave | 0 | 2 | 3 / 3 | Both zero |
| Blue slash (two captured objects) | 5 | 7 | 1 / 1 | Both zero |

Both wait deltas are +2 in this capture. A shared native scheduling lead is a
hypothesis, not a proven two-frame correction. The existing player applies
`scalePercent / 100` and zero rotation already, so those values need no change.
`presentationAnchor` chooses a preview arena point; it does not evaluate the
retained raw member placement fields, including the wave's `-1100`. The shared
player already reports that limitation. A captured X of -944 cannot substitute
for the missing anchor/offset rule across arenas and targets.

The comparison exposed a separate source-overlay bug: `prepare_original_preview.py`
split `attackFrames` only on `&`, dropping the second entry from the actual
Blade Beam string `4:50:2:2-8:50:2:2`. `source_hit_markers` now retains entries
separated by either `-` or `&`. This changes research hit-marker metadata only,
not roguelike damage or FFBE chaining mechanics.

A new `tools/data/shared-skill-review/blade-beam/plan-native-comparison.json`
was actually regenerated using the same explicit preparation options as the
basic-UV candidate. Compared with the older plan, differences are only the
correct two source markers and the current recipe hash; all presentation
settings, members and rendering data are equal. The first comparison assertion
also detected the recipe-hash difference; it was inspected before accepting
the regenerated plan. The older plan and published game assets were not edited.

```powershell
& $env:FFROGUE_PYTHON tools/memorial/summarize_trace.py --log tools/data/memorial-audit/diagnostic-v4/blade-beam-filenames-log.txt --token blade-beam-filenames-20261024-030743 --source tools/data/shared-skill-review/blade-beam/skill-source.json --plan tools/data/shared-skill-review/blade-beam/plan-native-comparison.json --output tools/data/memorial-audit/diagnostic-v4/blade-beam-preview-comparison.json
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/blade-beam/plan-native-comparison.json --port 3122
```

Checks actually executed: regeneration and comparison commands; assertions on
both actual Blade Beam hit markers, single-hit and ampersand-separated input;
matching scales/zero rotations and +2 wait differences for every matching
captured object; plan-difference inspection; `git diff --check`. Browser review
opened `http://127.0.0.1:3122/?skill=214810`, reported eight passing GPU blend
checks and eight limitations, advanced through playback to F210 and successfully
sought to F65/F20. Screenshots are retained under `diagnostic-v4/`. At F20 the
green wave is visible on the right side; the known unresolved placement remains
visible. No original-game pixel comparison or original-fidelity approval was
performed. A full game build was not rerun because gameplay code/assets did not
change.

The next bounded issue is the source-member anchor/offset calculation in the
native placement caller, before changing `presentationAnchor`. Do not apply a
global -1100 pixel shift or +2 frame delay based on this single capture.

The subsequent [native placement investigation](native-effect-placement.md)
records static caller/axis/offset evidence and revision 5's prepared capture of
effect-group rectangle inputs. Startup checks pass; the new context hook still
requires live validation before its formula can change the shared preview.


The subsequent [native hit-profile and loaded-ability review](native-hit-profiles.md)
records revision 9's observed static profile tables and revision 10's bounded
read-only ability snapshot command. These remain separate from effect execution
traces and cannot establish which skill the user executed on their own.
