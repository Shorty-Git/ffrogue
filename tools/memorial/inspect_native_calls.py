"""Write bounded ARM64 function disassembly from the pinned Memorial APK."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import zipfile

from capstone import Cs, CS_ARCH_ARM64, CS_MODE_ARM
from prepare_diagnostic import EXPECTED_APK, EXPECTED_NATIVE


def inspect(apk, functions, ranges=(), caller_names=()):
    if hashlib.sha256(apk.read_bytes()).hexdigest() != EXPECTED_APK:
        raise ValueError('Unexpected source APK')
    with zipfile.ZipFile(apk) as archive:
        data = archive.read('lib/arm64-v8a/libgame.so')
    if hashlib.sha256(data).hexdigest() != EXPECTED_NATIVE:
        raise ValueError('Unexpected native library')
    offset = struct.unpack_from('<Q', data, 40)[0]
    stride, count = struct.unpack_from('<HH', data, 58)
    sections = [struct.unpack_from('<IIQQQQIIQQ', data, offset + i * stride)
                for i in range(count)]
    names_section = sections[struct.unpack_from('<H', data, 62)[0]]
    names = data[names_section[4]:names_section[4] + names_section[5]]
    section_names = {names[s[0]:names.index(0, s[0])].decode(): s for s in sections}
    dynsym = section_names['.dynsym']
    strings = sections[dynsym[6]]
    strings = data[strings[4]:strings[4] + strings[5]]
    symbols = []
    for at in range(dynsym[4], dynsym[4] + dynsym[5], dynsym[9]):
        name, info, _, index, address, size = struct.unpack_from('<IBBHQQ', data, at)
        symbols.append({'name': strings[name:strings.index(0, name)].decode(),
                        'address': address, 'size': size, 'defined': bool(index)})
    by_name = {s['name']: s for s in symbols if s['defined']}
    labels = {s['address']: s['name'] for s in symbols if s['defined']}
    relocations = {}
    for section in sections:
        if section[1] != 4 or section[6] != sections.index(dynsym):
            continue
        for at in range(section[4], section[4] + section[5], section[9]):
            slot, info, addend = struct.unpack_from('<QQq', data, at)
            symbol = symbols[info >> 32]
            if symbol['name']:
                relocations[slot] = {'symbol': symbol['name'], 'addend': addend}
    decoder = Cs(CS_ARCH_ARM64, CS_MODE_ARM)
    decoder.detail = True
    plt = section_names['.plt']
    for at in range(plt[4] + 32, plt[4] + plt[5] - 15, 16):
        instructions = list(decoder.disasm(data[at:at + 16], plt[3] + at - plt[4]))
        if len(instructions) == 4 and instructions[0].mnemonic == 'adrp' and instructions[1].mnemonic == 'ldr':
            slot = instructions[0].operands[1].imm + instructions[1].operands[1].mem.disp
            if slot in relocations:
                labels[instructions[0].address] = relocations[slot]['symbol'] + ' [PLT]'
    result = {'nativeSha256': EXPECTED_NATIVE, 'functions': [],
              'bishamonVtable': by_name['_ZTV12BishamonData'],
              'positionRelocations': {hex(k): v for k, v in relocations.items()
                                      if v['symbol'] == '_ZN12BishamonData11setPositionEff'}}
    if caller_names:
        targets = {address: name for address, name in labels.items()
                   if name in caller_names or name.removesuffix(' [PLT]') in caller_names}
        if not all(any(label.removesuffix(' [PLT]') == name for label in targets.values())
                   for name in caller_names):
            raise ValueError('Requested caller target is absent')
        result['callTargets'] = {hex(address): name for address, name in targets.items()}
        result['callers'] = []
        for section in sections:
            if not section[2] & 4:
                continue
            raw = data[section[4]:section[4] + section[5] - section[5] % 4]
            for index, (word,) in enumerate(struct.iter_unpack('<I', raw)):
                if word & 0xfc000000 not in (0x94000000, 0x14000000):
                    continue
                immediate = word & 0x3ffffff
                if immediate & 0x2000000:
                    immediate -= 0x4000000
                address = section[3] + index * 4
                target = address + immediate * 4
                if target in targets:
                    result['callers'].append({'address': hex(address), 'targetSymbol': targets[target],
                                              'tailBranch': word & 0xfc000000 == 0x14000000})
        if len(result['callers']) > 10000:
            raise ValueError('Excessive caller inventory')
    selected = [by_name[name] for name in functions]
    for address, size in ranges:
        if address % 4 or size % 4 or not 0 < size <= 16384:
            raise ValueError('Invalid bounded executable range')
        selected.append({'name': 'range@' + hex(address), 'address': address, 'size': size,
                         'defined': True, 'boundary': 'Explicit byte range, not an inferred function boundary'})
    for symbol in selected:
        if not 0 < symbol['size'] <= 65536:
            raise ValueError('Missing or excessive function size: ' + symbol['name'])
        section = next(s for s in sections
                       if s[2] & 4 and s[3] <= symbol['address'] < s[3] + s[5])
        if symbol['address'] + symbol['size'] > section[3] + section[5]:
            raise ValueError('Executable range exceeds section')
        at = section[4] + symbol['address'] - section[3]
        lines = []
        for ins in decoder.disasm(data[at:at + symbol['size']], symbol['address']):
            label = labels.get(ins.operands[0].imm) if ins.mnemonic in ('bl', 'b') else None
            lines.append({'address': hex(ins.address), 'instruction': ins.mnemonic + ' ' + ins.op_str,
                          **({'targetSymbol': label} if label else {})})
        result['functions'].append({**symbol, 'instructions': lines})
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', type=Path, required=True)
    parser.add_argument('--function', action='append', default=[])
    parser.add_argument('--range', action='append', default=[], help='Explicit executable address:size, integer or hex; maximum 16384 bytes')
    parser.add_argument('--caller-of', action='append', default=[], help='Inventory direct BL/B sites targeting a named symbol or its PLT')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must stay inside ignored tools/data')
    if not args.function and not args.range and not args.caller_of:
        parser.error('At least one function or bounded range is required')
    ranges = [tuple(int(value, 0) for value in item.split(':')) for item in args.range]
    if any(len(item) != 2 for item in ranges):
        parser.error('Range must be address:size')
    result = inspect(args.apk, args.function, ranges, args.caller_of)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps({'functions': [{k: f[k] for k in ('name', 'address', 'size')}
                                   for f in result['functions']],
                      'positionRelocations': result['positionRelocations']}, indent=2))
