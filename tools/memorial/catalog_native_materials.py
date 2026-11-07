"""Export a pinned native shader-slot catalog into ignored research storage."""
import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from native_material_selection import native_catalog


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', type=Path, required=True)
    parser.add_argument('--package', type=Path, action='append', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must stay inside ignored tools/data')
    result = native_catalog(args.apk, args.package)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps({'descriptors': len(result['descriptors']), 'packages': {
        name: {stage: {'slots': len(package[stage]),
                       'uniqueSources': len({s['sha256'] for s in package[stage]})}
               for stage in ('vertex', 'fragment')}
        for name, package in result['packages'].items()}}, indent=2))
