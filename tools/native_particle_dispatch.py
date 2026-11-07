"""Inspect pinned Particle scale and rotation init/update/make dispatch.

This identifies initial module pointers only. A resolved pointer is not proof of
supported simulation, inheritance, geometry, or whole-skill fidelity.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import zipfile

from inspect_bmb import read_bmb
from native_material_selection import APK_SHA, NATIVE_SHA

# Bounded inspected index windows, not a promise about arbitrary native enums.
WINDOWS = {'rotation': (0x128, 0x2d92ed0, 14), 'scale': (0x12c, 0x2d92f40, 29),
           'scaleInit': (0x12c, 0x2d94cc0, 29), 'scaleUpdate': (0x12c, 0x2d94790, 29),
           'rotationInit': (0x128, 0x2d94c50, 14), 'rotationUpdate': (0x128, 0x2d94720, 14),
           'parentCoord': (0x100, 0x2d92dc0, 1)}


class ParticleDispatch:
    def __init__(self, apk):
        if hashlib.sha256(apk.read_bytes()).hexdigest() != APK_SHA:
            raise ValueError('Unexpected source APK')
        with zipfile.ZipFile(apk) as archive:
            self.native = archive.read('lib/arm64-v8a/libgame.so')
        if hashlib.sha256(self.native).hexdigest() != NATIVE_SHA:
            raise ValueError('Unexpected native library')
        offset = struct.unpack_from('<Q', self.native, 40)[0]
        stride, count = struct.unpack_from('<HH', self.native, 58)
        self.sections = [struct.unpack_from('<IIQQQQIIQQ', self.native, offset + i * stride) for i in range(count)]
        slots = {base + i * 8 for field, base, count in WINDOWS.values() for i in range(count)}
        relocated = {}
        for section in self.sections:
            if section[1] != 4:
                continue
            symbols = self.sections[section[6]]
            strings = self.sections[symbols[6]]
            for offset in range(section[4], section[4] + section[5], section[9]):
                address, info, addend = struct.unpack_from('<QQq', self.native, offset)
                if address not in slots:
                    continue
                if info & 0xffffffff != 257 or addend != 0 or address in relocated:
                    raise ValueError('Unexpected Particle module relocation')
                symbol = struct.unpack_from('<IBBHQQ', self.native, symbols[4] + (info >> 32) * symbols[9])
                start = strings[4] + symbol[0]
                name = self.native[start:self.native.index(b'\0', start)].decode('utf-8')
                relocated[address] = {'address': hex(symbol[4]), 'symbol': name, 'bytes': symbol[5],
                                      'sha256': hashlib.sha256(self.read(symbol[4], symbol[5])).hexdigest()}
        self.tables = {}
        for kind, (field, base, count) in WINDOWS.items():
            rows = []
            for index in range(count):
                slot = base + index * 8
                target = relocated.get(slot)
                if target is None and self.read(slot, 8) != bytes(8):
                    raise ValueError('Unresolved nonnull module entry')
                rows.append({'index': index, 'slot': hex(slot), 'target': target})
            self.tables[kind] = {'fieldOffset': field, 'tableAddress': hex(base), 'rows': rows}

    def read(self, address, size):
        section = next(s for s in self.sections if s[1] != 8 and s[3] <= address and address + size <= s[3] + s[5])
        start = section[4] + address - section[3]
        return self.native[start:start + size]

    def select(self, kind, index):
        if kind not in self.tables or not isinstance(index, int) or index < 0:
            raise ValueError('Invalid Particle dispatch query')
        rows = self.tables[kind]['rows']
        if index >= len(rows):
            return {'resolved': False, 'index': index, 'reason': 'Outside inspected dispatch index window'}
        return {'resolved': True, **rows[index]}

    def inspect_effect(self, path):
        raw = path.read_bytes()
        nodes = read_bmb(raw)['nodes']
        result = []
        for node in nodes:
            if node['typeId'] != 3:
                continue
            selection = {}
            for kind, (field, base, count) in WINDOWS.items():
                if field + 4 > node['bytes']:
                    raise ValueError('Particle selector outside node')
                index = struct.unpack_from('<I', raw, node['offset'] + field)[0]
                selection[kind] = self.select(kind, index)
            result.append({'node': node['index'], 'offset': node['offset'], **selection})
        return {'name': path.name, 'sourceSha256': hashlib.sha256(raw).hexdigest(), 'particles': result}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', required=True, type=Path)
    parser.add_argument('--effect', action='append', default=[], type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(Path('tools/data').resolve()):
        parser.error('Output must stay in ignored tools/data')
    catalog = ParticleDispatch(args.apk)
    effects = [catalog.inspect_effect(path) for path in args.effect]
    receipt = {'approved': False, 'nativeSha256': NATIVE_SHA, 'tables': catalog.tables, 'effects': effects,
               'boundary': 'Initial scale init/update/make and rotation make-vertex pointer selection only; not runtime support'}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    print(json.dumps({'effects': len(effects), 'particles': sum(len(e['particles']) for e in effects)}, indent=2))
