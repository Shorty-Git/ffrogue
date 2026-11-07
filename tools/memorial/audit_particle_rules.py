"""Extract bounded native particle evidence; never install or alter a device."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct
import sys
import zipfile


def audit(apk, output):
    from inspect_native_calls import inspect
    from prepare_diagnostic import EXPECTED_APK, EXPECTED_NATIVE

    if hashlib.sha256(apk.read_bytes()).hexdigest() != EXPECTED_APK:
        raise ValueError('Unexpected source APK')
    with zipfile.ZipFile(apk) as archive:
        native = archive.read('lib/arm64-v8a/libgame.so')
        packages = {name: archive.read('assets/bishamon/' + name)
                    for name in ('bmshaderpack.bin', 'bmshaderpack_gl2.bin')}
    if hashlib.sha256(native).hexdigest() != EXPECTED_NATIVE:
        raise ValueError('Unexpected native library')
    offset = struct.unpack_from('<Q', native, 40)[0]
    stride, count = struct.unpack_from('<HH', native, 58)
    sections = [struct.unpack_from('<IIQQQQIIQQ', native, offset + i * stride)
                for i in range(count)]
    section = sections[struct.unpack_from('<H', native, 62)[0]]
    names = native[section[4]:section[4] + section[5]]
    dynsym = next(s for s in sections if names[s[0]:names.index(0, s[0])] == b'.dynsym')
    section = sections[dynsym[6]]
    names = native[section[4]:section[4] + section[5]]
    symbols = []
    for at in range(dynsym[4], dynsym[4] + dynsym[5], dynsym[9]):
        name, _, _, defined, address, size = struct.unpack_from('<IBBHQQ', native, at)
        name = names[name:names.index(0, name)].decode()
        if defined and ('2ml2bm' in name or '2ml4bmfw' in name):
            symbols.append(dict(name=name, address=address, size=size))

    selected = [s['name'] for s in symbols if
                'alpha_blend11make_vertex' in s['name']
                or 'alpha_blend11ModuleTable18MakeVertexModuleOf' in s['name']
                or '16ParticleSetupper12AssignModule' in s['name']
                or '16ParticleSetupper28GetSetupVertexBufferFunction' in s['name']
                or '14ParticleTraitsEEEE14SelectFunction' in s['name']]
    evidence = inspect(apk, selected)
    expected = {
        'Mod': ['ldr s0, [x0, #0x164]', 'ldr s1, [x0, #0x17c]',
                'fmul s0, s0, s1', 'str s0, [x0, #0x164]', 'ret '],
        'Lerp': ['ldr s2, [x0, #0x164]', 'ldr s0, [x0, #0x17c]',
                 'ldr s1, [x0, #0x180]', 'fmadd s0, s0, s2, s1',
                 'str s0, [x0, #0x164]', 'ret '],
    }
    for name, instructions in expected.items():
        function = next(f for f in evidence['functions']
                        if 'make_vertex' + str(len(name)) + name + 'E' in f['name'])
        if [i['instruction'] for i in function['instructions']] != instructions:
            raise ValueError('Native alpha instruction receipt changed: ' + name)

    output.mkdir(parents=True, exist_ok=True)
    shader_catalog = []
    for package, data in packages.items():
        entries = []
        for match in re.finditer(rb'[\x20-\x7e]{20,}', data):
            source = match.group().decode('ascii')
            if 'void main' not in source:
                continue
            stage = 'vertex' if 'gl_Position' in source else 'fragment' if 'gl_FragColor' in source else None
            if stage is None:
                continue
            # These are complete observed source strings, not decoded permutation IDs.
            if not source.endswith('}') or match.end() >= len(data) or data[match.end()] != 0:
                raise ValueError('Incomplete shader source boundary')
            digest = hashlib.sha256(match.group()).hexdigest()
            file = output / package / (str(match.start()) + '.' + stage + '.glsl')
            file.parent.mkdir(exist_ok=True)
            file.write_bytes(match.group())
            entries.append(dict(offset=match.start(), stage=stage, bytes=len(match.group()),
                                sha256=digest, file=str(file)))
        shader_catalog.append(dict(package=package, bytes=len(data),
                                   sha256=hashlib.sha256(data).hexdigest(), entries=entries))
    receipt = dict(apkSha256=EXPECTED_APK, nativeSha256=EXPECTED_NATIVE,
                   approved=False, symbols=symbols, disassembly=evidence, shaders=shader_catalog,
                   equations={'contextMod': 'alpha * coefficientAt17c',
                              'contextLerp': 'fma(coefficientAt17c, alpha, coefficientAt180)'},
                   limitations=[
                       'Context equations do not establish source rate/parent/compatibility mapping.',
                       'Shader source offsets are not native permutation IDs or bound draw evidence.',
                       'No shader compilation, native execution, device modification or renderer fix is performed.',
                       'Cocos2d billboard symbols are not evidence of Bishamon Particle implementation.'])
    (output / 'receipt.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    return receipt


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--dependencies', type=Path, default=Path('tools/data/memorial-audit/python-deps'))
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must stay inside ignored tools/data')
    sys.path.insert(0, str(args.dependencies.resolve()))
    result = audit(args.apk, args.output)
    print(json.dumps(dict(symbols=len(result['symbols']),
                          functions=len(result['disassembly']['functions']),
                          shaderSources={p['package']: {stage: sum(e['stage'] == stage for e in p['entries'])
                                                        for stage in ('vertex', 'fragment')}
                                         for p in result['shaders']}), indent=2))
