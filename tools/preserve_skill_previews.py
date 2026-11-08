"""Freeze existing preview plans, pixels, resources and renderer code without publishing them."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile


def digest(data):
    return hashlib.sha256(data).hexdigest()


def verify(file):
    with zipfile.ZipFile(file) as archive:
        manifest = json.loads(archive.read('VISUAL_REFERENCE_MANIFEST.json'))
        for entry in manifest['files']:
            assert digest(archive.read(entry['path'])) == entry['sha256'], entry['path']
        assert archive.testzip() is None
    return dict(verified=True, files=len(manifest['files']), plans=len(manifest['plans']), sha256=digest(file.read_bytes()))


def preserve(output):
    root = Path.cwd().resolve()
    if not output.resolve().is_relative_to(root / 'tools/data') or output.exists():
        raise ValueError('Use a new archive path inside ignored tools/data')
    files = set()

    def include(file):
        file = Path(file)
        if file.is_file():
            if not file.resolve().is_relative_to(root):
                raise ValueError('Reference outside the workspace: ' + str(file))
            files.add(file.resolve().relative_to(root).as_posix())

    # Freeze the current nonignored workspace; do not change its real Git index.
    paths = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z']).decode().split('\0')
    for file in paths:
        if file:
            include(file)
    folders = ['tools/data/shared-skill-review', 'tools/data/skill-previews/barret/satellite_beam',
               'tools/data/blade-beam-preview', 'tools/data/effect-orientation', 'tools/data/model-vertex-rgba',
               'tools/data/visual-preservation/recovered', 'tools/data/scene-migration', 'tools/data/choreography', 'tools/data/live-effect-export/clip-review-20261026',
               'tools/data/memorial-audit/diagnostic-v7',
               'tools/data/memorial-audit/diagnostic-v29-lifecycle',
               'tools/data/memorial-audit/diagnostic-v30-lifecycle',
               'tools/data/memorial-audit/diagnostic-v31-lifecycle',
               'tools/data/memorial-audit/diagnostic-v32-lifecycle',
               'tools/data/memorial-audit/diagnostic-v34-lifecycle',
               'tools/data/memorial-audit/quad-render-integration',
               'tools/data/memorial-audit/particle-packet-integration',
               'tools/data/memorial-audit/diagnostic-v35-render-context',
               'tools/data/memorial-audit/diagnostic-v35-recovery',
               'tools/data/memorial-audit/diagnostic-v36-texture-state']
    for folder in folders:
        for file in Path(folder).rglob('*'):
            if folder.endswith('diagnostic-v36-texture-state') and any(p.startswith('build-r') for p in file.parts):
                continue
            if file.suffix.lower() in ('.json', '.jsonl', '.png', '.webp', '.bmb', '.m3r', '.rgba', '.efkmodel') or (
                    folder.endswith('-lifecycle') and file.suffix.lower() in ('.log', '.js')) or (
                    folder.endswith(('quad-render-integration', 'particle-packet-integration', 'diagnostic-v35-render-context', 'diagnostic-v35-recovery', 'diagnostic-v36-texture-state')) and file.suffix.lower() in ('.log', '.html', '.mjs', '.js', '.zlib', '.py')):
                include(file)
    texture_bindings = Path('tools/effects/verified_native_textures.json')
    if texture_bindings.is_file():
        for resource in json.loads(texture_bindings.read_text())['resources'].values():
            source = Path(resource['source'])
            if digest(source.read_bytes()) != resource['sourceSha256']:
                raise ValueError('Verified native texture source changed: ' + str(source))
            include(source)
    plans = []
    plan_paths = set(Path('tools/data/shared-skill-review').glob('*/plan*.json'))
    for recipe in Path('tools/presentations').glob('*.json'):
        plan_paths.update(Path(binding['plan']) for binding in json.loads(recipe.read_text())['bindings'])
    for file in sorted(plan_paths):
        data = json.loads(file.read_text(encoding='utf-8'))
        for entry in data['files'].values():
            resource = Path(entry['path'])
            if not resource.is_file() or digest(resource.read_bytes()) != entry['sha256']:
                raise ValueError('Missing/stale prepared resource: ' + str(resource))
            include(resource)
        plans.append(dict(path=file.as_posix(), sha256=digest(file.read_bytes()), skill=data['name'],
                          sourceId=data['sourceId'], resources=len(data['files']),
                          flags={k: v for k, v in data.items() if isinstance(v, bool)},
                          historicalPixelIdentity='Not established: historical renderer hashes are not stored in these plans'))
    satellite = json.loads(Path('tools/data/skill-previews/barret/satellite_beam/plan.json').read_text())
    for member in satellite['effects']:
        for asset in [member['asset'], *member['asset']['resources']]:
            if digest(Path(asset['file']).read_bytes()) != asset['sha256']:
                raise ValueError('Stale converted resource: ' + asset['file'])
            include(asset['file'])
    # Retain reviewed converted inputs as well as their already published pixels.
    for file in Path('public/assets/effects').glob('*/manifest.json'):
        meta = json.loads(file.read_text(encoding='utf-8'))
        if 'source' not in meta:
            continue
        for asset in [dict(file=meta['source'], sha256=meta['sourceSha256']), *meta['resources']]:
            if digest(Path(asset['file']).read_bytes()) != asset['sha256']:
                raise ValueError('Stale published source resource: ' + asset['file'])
            include(asset['file'])
        authoring = Path('rawdata/assets/battle_effect') / Path(meta['masterSource']).with_suffix('.bmsln')
        include(authoring)
    for file in ['tools/bin/effekseer-webgl-1.80.7/effekseer.js', 'tools/bin/effekseer-webgl-1.80.7/effekseer.wasm',
                 'tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js',
                 'tools/data/memorial-audit/diagnostic-v7/renderer-reference.json',
                 'tools/data/memorial-audit/pipeline-v23-20261025/effect-host-context.json',
                 'tools/data/memorial-audit/pipeline-v23-20261025/declared-host-bindings.json']:
        if not Path(file).is_file():
            raise ValueError('Missing replay prerequisite: ' + file)
        include(file)
    for folder in ['tools/data/native-locator-emulation', 'tools/data/reconstruction-map', 'tools/data/connected-effect']:
        for file in Path(folder).glob('*.json'):
            include(file)
    # Preserve the selected independent control's exact inputs, not a whole asset dump.
    capsule_request = Path('tools/data/connected-effect/capsule-request.json')
    if capsule_request.is_file():
        request = json.loads(capsule_request.read_text())
        for source, expected in [(request['source'], request['sourceSha256']),
                                 *[(t['path'], t['sha256']) for t in request['textures'].values()]]:
            if digest(Path(source).read_bytes()) != expected:
                raise ValueError('Independent control input changed: ' + source)
            include(source)
        include('rawdata/assets/battle_effect/eff_capsule_001.bmsln')
    for file in Path('tools/data/memorial-audit/diagnostic-v6').glob('rectangle-*.png'):
        include(file)
    entries = [dict(path=file, bytes=Path(file).stat().st_size, sha256=digest(Path(file).read_bytes())) for file in sorted(files)]
    manifest = dict(schemaVersion=1, approved=False, wholeEffectReconstructed=False,
                    nativeReferenceCorpus=[dict(skill='Brave Slash', sourceId=214800), dict(skill='Blade Beam', sourceId=214810), dict(skill='Climhazzard', sourceId=214820)],
                    nonNativeProductControls=['Satellite Beam: preservation/regression only; never measured in BlueStacks',
                        'Cross Slash: standalone source import control, not native measured fidelity or new loadout; old converted repair is separate'],
                    scope='Frozen existing visual references; not a universal importer or fidelity approval',
                    gitHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
                    runtime='Node24; npm ci from the archived lockfile; local SDK/Three bytes are included',
                    plans=plans, files=entries,
                    limitations=['Native APK/CPK/database and node_modules are not included',
                                 'BMB plans replay from prepared resources; source re-extraction needs external original inputs',
                                 'Use --prepared-plan for the preserved converted Satellite replay; it is not native renderer evidence',
                                 'Screenshots are evidence of past frames, not proof of pixel-identical historical runtime replay'])
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for entry in entries:
            archive.write(entry['path'], entry['path'])
        archive.writestr('VISUAL_REFERENCE_MANIFEST.json', json.dumps(manifest, indent=2))
    receipt = dict(archive=output.as_posix(), bytes=output.stat().st_size, **verify(output))
    output.with_suffix('.receipt.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    return receipt


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--verify', type=Path)
    args = parser.parse_args()
    if bool(args.output) == bool(args.verify):
        parser.error('Choose exactly one of --output or --verify')
    print(json.dumps(verify(args.verify) if args.verify else preserve(args.output)))
