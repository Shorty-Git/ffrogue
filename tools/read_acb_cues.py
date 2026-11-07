"""Read unencrypted CRI ACB cue IDs and names without assuming stream ordinals."""
import argparse
import json
import struct
from pathlib import Path


def table(data):
    magic, size, _, row_offset, string_offset, data_offset, _, count, width, length = struct.unpack_from('>4sIHHIIIHHI', data)
    if magic != b'@UTF' or size + 8 > len(data):
        raise ValueError('Invalid or unsupported UTF table')
    data = data[:size + 8]
    row_offset, string_offset, data_offset = (value + 8 for value in (row_offset, string_offset, data_offset))

    def string(offset):
        start = string_offset + offset
        return data[start:data.index(b'\0', start, data_offset)].decode('utf-8', errors='replace')

    def value(offset, kind):
        code = ('B', 'b', 'H', 'h', 'I', 'i', 'Q', 'q', 'f', 'd', 'I', 'II')[kind]
        fields = struct.unpack_from('>' + code, data, offset)
        result = fields[0]
        if kind == 10:
            result = string(result)
        if kind == 11:
            result = data[data_offset + result:data_offset + result + fields[1]]
        return result, offset + struct.calcsize('>' + code)

    columns = []
    at = 32
    for _ in range(count):
        flags, name = struct.unpack_from('>BI', data, at)
        if not flags & 0x10:
            raise ValueError('Unnamed UTF column')
        at += 5
        default = None
        if flags & 0x20:
            default, at = value(at, flags & 15)
        columns.append((string(name), flags, default))
    for index in range(length):
        at = row_offset + index * width
        row = {}
        for name, flags, default in columns:
            if flags & 0x40:
                row[name], at = value(at, flags & 15)
            else:
                row[name] = default
        yield row


def cue_rows(data):
    root, = table(data)
    cues = list(table(root['CueTable']))
    for row in table(root['CueNameTable']):
        cue = cues[row['CueIndex']]
        yield {'name': row['CueName'], 'cueId': cue['CueId'], 'referenceType': cue['ReferenceType'],
               'referenceIndex': cue['ReferenceIndex']}


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('bank', type=Path)
    cli.add_argument('--contains', default='')
    args = cli.parse_args()
    print(json.dumps([row for row in cue_rows(args.bank.read_bytes()) if args.contains in row['name']], indent=2))
