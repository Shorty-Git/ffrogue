# Two-PC handoff

Snapshot prepared on 2026-10-23. GitHub contains code, recipes, documentation and
selected prepared game assets. Raw sources, tools and research outputs below
are intentionally ignored and must be available locally on the second PC.

## Copy with the same relative paths

Copy these folders from the current project to the USB drive, then into the
other checkout. Existing identical raw packages do not need another copy.

| Relative path | Purpose | Approximate size on this PC |
| --- | --- | ---: |
| `ffbe_asset_dump-main/` | Unit/monster art, CGG/CGS, backgrounds and CPK reader | 3.35 GiB |
| `assets/` | Source database, authoring projects, converted effects/resources | 13.47 GiB |
| `ffbe_data-master/` | Community GL/JP metadata | 0.07 GiB |
| `com.square_enix.android_googleplay.FFBEWW/files/` | Original CPK archive source; preserve the containing package folder name | Up to 5.55 GiB |
| `tools/bin/` | ffbetool and local rendering SDK | 0.03 GiB |
| `tools/data/` | Current extracted sources, archive index, plans, reports and review evidence | 0.25 GiB |

The total is about 23 GiB; an empty 32 GB drive has enough capacity. These are
approximate payload sizes, excluding nested `.git` and Python cache directories;
filesystem allocation and nested repository history can add overhead. Preserve
filenames and hierarchy. Do not flatten `tools/` or rename the root source
`assets/` to `public/assets/`.

`tools/data/` is reproducible research output, but copying it preserves the exact
latest three-skill review without regenerating plans or losing ignored evidence.
Do not overwrite newer research on the destination blindly; retain a separate
copy when both PCs have diverged. The original app's preferences/account files
outside `files/` are not needed for the asset pipeline.

Do not copy `node_modules/`, `dist/`, Python virtual environments, machine-specific
Codex runtimes or the project's `.git/` over the destination checkout. Install
dependencies locally and update the destination with Git.

## Update and run on the second PC

First inspect destination changes:

```powershell
git status --short
```

If there is local work, preserve/commit it before pulling. Do not reset or discard
it to force a sync. Then, from the project root:

```powershell
git switch main
git pull --ff-only origin main
npm ci
npm run dev
```

Use Node.js 24 and the printed Vite URL. Git and Node.js must be installed on that
machine. The main game needs only the Git checkout and npm dependencies; the
copied source packages are needed for further pipeline/reconstruction work.

For offline Python tools, install Python and Pillow locally. Configure the
actual executable path on that PC, for example in the current PowerShell session:

```powershell
$env:FFROGUE_PYTHON = 'C:\path\to\python.exe'
& $env:FFROGUE_PYTHON -m pip install Pillow
```

The example path is a placeholder. Do not reuse the old PC's user-specific Codex
Python path. Run the required check for the task before claiming its environment
is working.

## Resume the current skill experiment

After restoring `tools/data/` and `tools/bin/`, run:

```powershell
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash/plan-basic-uv.json --plan tools/data/shared-skill-review/blade-beam/plan-basic-uv.json --plan tools/data/shared-skill-review/climhazzard/plan-basic-uv.json --port 3121
```

Open `http://127.0.0.1:3121/?skill=214810` for Blade Beam, `214800` for Brave
Slash or `214820` for Climhazzard. Preview servers and browser tabs do not transfer
between PCs. If the copied plans are absent, regenerate them using the
[skill workflow](skill-reconstruction-workflow.md).

The next agent should start with `AGENTS.md` and the
[asset pipeline handbook](asset-pipeline-handbook.md). The original-data preview
remains a research candidate; complete native fidelity and its runtime export
bridge are still open. Raw packages and copied plans do not change that status.
