"""Read-only EFKE EDIT inspection; never rewrites source or runtime effects.

Binary XML layout follows EffekseerCore/IO/EfkEfc.cs in the official
https://github.com/effekseer/Effekseer repository (EfkEfcXml.Decompress).
"""
import argparse
import struct
import zlib
from pathlib import Path
import xml.etree.ElementTree as ET


def encode_project(project):
    """Encode the same string-table format, with four-byte Boolean fields."""
    keys, values = {}, {}

    def children(nodes):
        result = bytearray(struct.pack('<h', len(nodes)))
        for node in nodes:
            key = keys.setdefault(node.tag, len(keys))
            value = node.text if not len(node) and node.text else None
            result.extend(struct.pack('<hI', key, int(value is not None)))
            if value is not None:
                result.extend(struct.pack('<h', values.setdefault(value, len(values))))
            result.extend(struct.pack('<I', int(bool(len(node)))))
            if len(node):
                result.extend(children(list(node)))
        return result

    body = children([project])
    result = bytearray()
    for table in [keys, values]:
        result.extend(struct.pack('<h', len(table)))
        for text, index in table.items():
            encoded = text.encode('utf-8')
            result.extend(struct.pack('<h', len(encoded)))
            result.extend(encoded)
            result.extend(struct.pack('<h', index))
    return zlib.compress(bytes(result) + body)


def decode_project(data):
    if data[:4] != b'EFKE':
        raise ValueError('Not an EFKE file')
    offset, compressed = 8, None
    while offset + 8 <= len(data):
        tag, size = struct.unpack_from('<4sI', data, offset)
        offset += 8
        if offset + size > len(data):
            raise ValueError('Truncated EFKE chunk')
        if tag == b'EDIT':
            compressed = data[offset:offset + size]
        offset += size
    if offset != len(data):
        raise ValueError('Truncated EFKE chunk header')
    if compressed is None:
        raise ValueError('Missing editor project')
    decoder = zlib.decompressobj()
    raw = decoder.decompress(compressed, 16 * 1024 * 1024)
    if not decoder.eof or decoder.unused_data:
        raise ValueError('Invalid or oversized compressed editor project')
    cursor = 0

    def take(size):
        nonlocal cursor
        if cursor + size > len(raw):
            raise ValueError('Truncated binary XML')
        result = raw[cursor:cursor + size]
        cursor += size
        return result

    def number():
        value = struct.unpack('<h', take(2))[0]
        if value < 0:
            raise ValueError('Negative binary XML count/index')
        return value

    def table():
        result = {}
        for _ in range(number()):
            text = take(number()).decode('utf-8')
            key = number()
            if key in result:
                raise ValueError('Duplicate binary XML string index')
            result[key] = text
        return result

    keys, values = table(), table()

    def children(parent, depth=0):
        if depth > 128:
            raise ValueError('Binary XML nesting limit exceeded')
        for _ in range(number()):
            node = ET.SubElement(parent, keys[number()])
            has_value = struct.unpack('<I', take(4))[0]
            if has_value not in (0, 1):
                raise ValueError('Invalid value flag')
            if has_value == 1:
                node.text = values[number()]
            has_children = struct.unpack('<I', take(4))[0]
            if has_children not in (0, 1):
                raise ValueError('Invalid children flag')
            if has_children == 1:
                children(node, depth + 1)

    document = ET.Element('document')
    children(document)
    if cursor != len(raw) or len(document) != 1 or document[0].tag != 'EffekseerProject':
        raise ValueError(f'Unexpected editor project structure: roots={[n.tag for n in document]}, cursor={cursor}/{len(raw)}')
    return document[0]


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--effect', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    if args.effect.resolve() == args.out.resolve():
        raise ValueError('Source must not be overwritten')
    project = decode_project(args.effect.read_bytes())
    ET.indent(project)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    ET.ElementTree(project).write(args.out, encoding='utf-8', xml_declaration=True)
    print(f'Inspected {len(list(project.iter("Node")))} nodes: {args.out}')
