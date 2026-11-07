"""Export raw, source-identified module parameters without republishing a plan."""
import argparse
import hashlib
import json
from pathlib import Path
from inspect_bmb import read_bmb
from bmb_playback_fields import attach_playback_fields

def compile_inputs(source):
    raw = source.read_bytes()
    parsed = read_bmb(raw)
    attach_playback_fields(raw, parsed['nodes'])
    return dict(schema='native-module-inputs-v1', source=source.as_posix(),
        sourceSha256=hashlib.sha256(raw).hexdigest(),
        boundary='Raw parameter inputs only; no inferred module selection or render support',
        nodes=[dict(index=n['index'], typeId=n['typeId'], inputs=n['nativeModuleInputs'],
                    **({'initialization':n['nativeInitialization']} if 'nativeInitialization' in n else {}))
               for n in parsed['nodes'] if 'nativeModuleInputs' in n])

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must stay inside ignored tools/data')
    result = compile_inputs(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(dict(output=str(args.output), nodes=len(result['nodes']), sourceSha256=result['sourceSha256'])))
