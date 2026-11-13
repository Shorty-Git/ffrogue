"""Read the editor project inside an Effekseer .efkefc file (the official conversions of FFBE effects that
ship next to the BMB/BMSLN originals in rawdata/assets/battle_effect).

Research aid only: the conversion shows how the game's own porting tool read a Bishamon effect (Particle
size, billboard type, emission, colours). It is evidence for the meaning of source fields, never a
runtime input and not proof of original-engine behaviour.

    <python> tools/efkefc_project.py rawdata/assets/battle_effect/bm_2035_flare_bg.efkefc [--node emitter_0]

Container: 'EFKE', u32 version, then chunks (4-byte tag, u32 size). The EDIT chunk is zlib data holding a
compact XML: key table and value table (u16 count; per entry u16 length, UTF-8 text, u16 index), a u16,
then one record per element in document order (all u16): name key, has-value flag, 0; with a value: value
index, 0, 0; without: has-children flag, 0 and, if set, the child count followed by the children.
"""
import json
import struct
import sys
import zlib


def read_project(path):
    data = open(path, 'rb').read()
    if data[:4] != b'EFKE':
        raise ValueError('Not an Effekseer .efkefc container')
    pos, edit = 8, None
    while pos < len(data):
        tag, size = data[pos:pos + 4], struct.unpack_from('<I', data, pos + 4)[0]
        if tag == b'EDIT':
            edit = zlib.decompress(data[pos + 8:pos + 8 + size])
        pos += 8 + size
    if edit is None:
        raise ValueError('No EDIT chunk')
    pos = 0

    def table():
        nonlocal pos
        count = struct.unpack_from('<H', edit, pos)[0]
        pos += 2
        out = {}
        for _ in range(count):
            length = struct.unpack_from('<H', edit, pos)[0]
            text = edit[pos + 2:pos + 2 + length].decode('utf-8')
            index = struct.unpack_from('<H', edit, pos + 2 + length)[0]
            pos += 4 + length
            out[index] = text
        return out

    keys, values = table(), table()
    pos += 2

    def element():
        nonlocal pos
        name, has_value, zero = struct.unpack_from('<3H', edit, pos)
        pos += 6
        if zero or has_value not in (0, 1):
            raise ValueError('Unexpected compact XML record')
        node = {'tag': keys[name], 'children': []}
        if has_value:
            value, zero, zero2 = struct.unpack_from('<3H', edit, pos)
            pos += 6
            if zero or zero2:
                raise ValueError('Unexpected compact XML value record')
            node['text'] = values[value]
            return node
        has_children, zero = struct.unpack_from('<2H', edit, pos)
        pos += 4
        if zero or has_children not in (0, 1):
            raise ValueError('Unexpected compact XML parent record')
        if has_children:
            count = struct.unpack_from('<H', edit, pos)[0]
            pos += 2
            node['children'] = [element() for _ in range(count)]
        return node

    root = element()
    if pos != len(edit):
        raise ValueError('Trailing compact XML data')
    return root


def simplify(node):
    """Element tree as nested dicts; repeated child tags become lists."""
    if not node['children']:
        return node.get('text')
    out = {}
    for child in node['children']:
        value = simplify(child)
        if child['tag'] in out:
            if not isinstance(out[child['tag']], list):
                out[child['tag']] = [out[child['tag']]]
            out[child['tag']].append(value)
        else:
            out[child['tag']] = value
    return out


def nodes(project):
    """Flat list of effect nodes in document order with their depth."""
    found = []

    def walk(node, depth):
        found.append((depth, node))
        children = (node.get('Children') or {}).get('Node') if isinstance(node.get('Children'), dict) else None
        for child in children if isinstance(children, list) else [children] if children else []:
            walk(child, depth + 1)

    walk(simplify(project)['Root'], 0)
    return found


if __name__ == '__main__':
    project = read_project(sys.argv[1])
    wanted = sys.argv[sys.argv.index('--node') + 1] if '--node' in sys.argv else None
    for depth, node in nodes(project):
        if wanted and node.get('Name') != wanted:
            continue
        body = {key: value for key, value in node.items() if key != 'Children'}
        print('  ' * depth + json.dumps(body, ensure_ascii=False)[:4000 if wanted else 260])
