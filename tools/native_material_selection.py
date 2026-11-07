"""Pinned offline shader-slot catalog and bounded Quad/Particle/Model selection.

This recovers the initial material selection, not live render-state mutations,
vertex execution, global uniforms, or framebuffer blending.
"""
import hashlib
import math
import struct
import zipfile

APK_SHA = '9d21fc8b61c9900eaacb1c2ddef2cabcad1e97d2dc720be16ac09b06fc0086b4'
NATIVE_SHA = '6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77'
PACKAGE_SHAS = {
    'bmshaderpack.bin': '2f36d1839cad4ede93764b4237a05d4cbe4085392a9a2b6f93c5833e14d7dd0b',
    'bmshaderpack_gl2.bin': '90cdbdee63950026ba9031f9a04fed98dbefbb199610a32a438003b119ee2f6c',
}
ADD_SHA = 'b54945426716fdc4ae4678cc85de7acd658d5259f23d5b2b187eb782a748a687'
DISTORTION_SHA = 'f4cef6ffc96d8f8fc66d33fec28619c18390ce445dd06bb2b01d204bbbbea990'
BASIC_SHA = '8ae381afc9f95ab42caafc2c03266ddc08500489623d2e16d39d89737b7d1fb4'
OP_OFFSETS = {0: 0, 1: 96, 2: 32, 3: 64, 4: 128, 5: 160, 6: 192}
# Raw field offsets are preserved without assigning unverified authoring names.
LAYOUTS = {2: (0, 0x145, 0x14a, 0x22c, 0x748, 0x744, 0x730),
           3: (1, 0xe1, 0xe6, 0x1c8, 0x6b8, 0x6b4, 0x6a0)}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def parse_package(data):
    """Read both slot tables; each declared string includes its final NUL."""
    result, block = {}, 0
    for stage in ('vertex', 'fragment'):
        if block + 16 > len(data):
            raise ValueError('Truncated shader block')
        count, relative, span, reserved = struct.unpack_from('<4I', data, block)
        if not 0 < count <= 4096 or reserved or relative < count * 12:
            raise ValueError('Invalid shader table header')
        start = block + 16 + relative
        if start + span > len(data):
            raise ValueError('Truncated shader source span')
        slots = []
        for index in range(count):
            slot, offset, size = struct.unpack_from('<3I', data, block + 16 + index * 12)
            if slot != index or size < 2 or offset + size > span:
                raise ValueError('Invalid shader slot or source range')
            raw = data[start + offset:start + offset + size]
            if raw[-1:] != b'\0' or b'\0' in raw[:-1]:
                raise ValueError('Invalid shader string terminator')
            source = raw[:-1].decode('utf-8')
            if 'void main(' not in source:
                raise ValueError('Shader has no main function')
            slots.append({'slot': slot, 'offset': start + offset, 'bytesWithNul': size,
                          'sha256': sha(raw[:-1]), 'source': source})
        result[stage] = slots
        block = start + span
    if any(data[block:]) or len(data) - block > 16:
        raise ValueError('Unexpected shader package tail')
    return result


def native_catalog(apk, packages):
    if sha(apk.read_bytes()) != APK_SHA:
        raise ValueError('Unexpected source APK')
    with zipfile.ZipFile(apk) as archive:
        native = archive.read('lib/arm64-v8a/libgame.so')
    if sha(native) != NATIVE_SHA:
        raise ValueError('Unexpected native library')
    shoff = struct.unpack_from('<Q', native, 40)[0]
    stride, count = struct.unpack_from('<HH', native, 58)
    sections = [struct.unpack_from('<IIQQQQIIQQ', native, shoff + i * stride)
                for i in range(count)]

    def read_va(address, size):
        matches = [s for s in sections if s[1] != 8 and s[3] <= address
                   and address + size <= s[3] + s[5]]
        if len(matches) != 1:
            raise ValueError('Ambiguous or absent native address')
        section = matches[0]
        offset = section[4] + address - section[3]
        return native[offset:offset + size]

    # Tables reached by CreateMetaShaderData in this exact library revision.
    if read_va(0x2551794, 6) != bytes([0, 12, 24, 33, 38, 50]):
        raise ValueError('Unexpected native resource dispatch')
    for address in (0x255179a, 0x25517a6, 0x25517ac):
        if read_va(address, 6) != bytes([0, 2, 4, 6, 8, 10]):
            raise ValueError('Unexpected native texture-operation dispatch')
    descriptors = [list(struct.unpack('<4I', read_va(0x2551c10 + i * 16, 16)))
                   for i in range(2280)]
    # Null kind 0 unconditionally selects module 3 in AssignModule. Resolve the
    # relocated function slot rather than interpreting its zero-filled image.
    locator_slot = 0x2d927d0 + 3 * 8
    locator_target = None
    for section in sections:
        if section[1] != 4:
            continue
        for offset in range(section[4], section[4] + section[5], section[9]):
            address, info, addend = struct.unpack_from('<QQq', native, offset)
            if address == locator_slot:
                symbols = sections[section[6]]
                symbol = struct.unpack_from('<IBBHQQ', native, symbols[4] + (info >> 32) * symbols[9])
                if info & 0xffffffff != 257 or addend != 0 or symbol[4:6] != (0x1fc04b0, 1412):
                    raise ValueError('Unexpected ZScreen module relocation')
                locator_target = symbol[4]
    if locator_target is None:
        raise ValueError('Missing ZScreen module relocation')
    locator_hash = sha(read_va(locator_target, 1412))
    if locator_hash != '8788174e86964bd11e97f55521d4606fe86af3798cd8f5ac9e920b5802f8f20d':
        raise ValueError('Unexpected ZScreen function')
    blend_bytes = read_va(0x255ab8c, 7 * 12)
    blend_rows = [list(struct.unpack_from('<3I', blend_bytes, i * 12)) for i in range(7)]
    if blend_rows != [[0, 1, 0], [1, 770, 771], [1, 770, 1], [1, 0, 771],
                      [1, 1, 1], [1, 0, 769], [1, 775, 769]]:
        raise ValueError('Unexpected native blend table')
    parsed = {}
    for path in packages:
        raw = path.read_bytes()
        if path.name not in PACKAGE_SHAS or sha(raw) != PACKAGE_SHAS[path.name]:
            raise ValueError('Unexpected shader package')
        stages = parse_package(raw)
        if len(stages['vertex']) != 126 or len(stages['fragment']) != 444:
            raise ValueError('Unexpected native shader counts')
        if any(v >= 126 or f >= 444 for v, f, _, _ in descriptors):
            raise ValueError('Descriptor points outside shader tables')
        parsed[path.name] = {'sha256': sha(raw), **stages}
    if 'bmshaderpack.bin' not in parsed:
        raise ValueError('Primary shader package required')
    return {'schemaVersion': 1, 'approved': False, 'apkSha256': APK_SHA,
            'nativeSha256': NATIVE_SHA, 'descriptorAddress': '0x2551c10',
            'descriptors': descriptors, 'packages': parsed,
            'nullLocatorReference': {'nativeSha256': NATIVE_SHA, 'parameterOffset': 0x2b4,
                                     'typeId': 0, 'moduleIndex': 3, 'moduleAddress': hex(locator_target),
                                     'functionSha256': locator_hash,
                                     'scope': 'ZScreen kind 0, identity view, sampled constant roll and positive constant scales'},
            'renderState': {'nativeSha256': NATIVE_SHA, 'tableAddress': '0x255ab8c',
                            'tableSha256': sha(blend_bytes), 'blendRows': blend_rows,
                            'equation': 32774, 'equationOrigin': 'RenderContext::Begin at 0x15c6914',
                            'defaultColorScale': [1, 1, 1, 1],
                            'colorScaleOrigin': 'Animation constructor +0x44; copied to pixel constants +0x10 by Draw',
                            'colorScaleBoundary': 'Constructor default only; caller writes remain unverified'},
            'boundary': 'Static initial selection; runtime overrides and global uniforms unverified'}


def selected(catalog, index, details):
    descriptor = catalog['descriptors'][index]
    vertex, fragment = descriptor[:2]
    package = catalog['packages']['bmshaderpack.bin']
    source = package['fragment'][fragment]
    return {**details, 'supported': True, 'descriptorIndex': index,
            'descriptor': descriptor, 'vertexSlot': vertex, 'fragmentSlot': fragment,
            'vertexSha256': package['vertex'][vertex]['sha256'],
            'fragmentSha256': source['sha256'], 'fragmentOffset': source['offset'],
            'addCandidateCompatible': source['sha256'] == ADD_SHA,
            'distortionCandidateCompatible': source['sha256'] == DISTORTION_SHA,
            'basicCandidateCompatible': source['sha256'] == BASIC_SHA}


def select_model(data, node, catalog, meshes):
    model_name = node.get('resourceBindings', {}).get('model', {}).get('name')
    mesh = meshes.get(model_name)
    metadata = mesh.get('nativeMaterial', {}) if mesh else {}
    if not metadata.get('supported') or metadata.get('hasUv') is not True or metadata.get('submeshIndex') != 0:
        return {'supported': False, 'reason': 'Verified UV single-submesh native material required'}
    start = node['offset']
    if start < 0 or start + node['bytes'] > len(data):
        raise ValueError('Invalid source Model range')
    offsets = (0x111, 0x118, 0x114, 0x117)
    values = [data[start + offset] for offset in offsets]
    alpha = struct.unpack_from('<f', data, start + 0x1fc)[0]
    op = struct.unpack_from('<I', data, start + 0x6e0)[0]
    extra = struct.unpack_from('<I', data, start + 0x6f4)[0]
    if not math.isfinite(alpha) or op not in OP_OFFSETS:
        return {'supported': False, 'reason': 'Unreviewed Model selector input'}
    bindings = node.get('resourceBindings', {})
    explicit = bool(bindings.get('texture1')) and (op == 0 or bool(bindings.get('texture2')))
    textured = explicit or metadata['textures'][0]['pointerPresent']
    mask = sum((1 << i) for i, value in enumerate(values) if value)
    mask += (16 if alpha != 0 else 0) + (64 if extra == 1 else 0)
    index = 448 + mask + (896 + OP_OFFSETS[op] * 4 if textured else 0)
    return selected(catalog, index, {
        'scope': 'Initial UV single-submesh Model constructor; no runtime override',
        'resourceType': 4, 'specialFlag': 0, 'operation': op, 'textured': textured,
        'textureSelection': 'Explicit BMB names' if explicit else 'Native embedded first-slot pointer presence',
        'modelSha256': mesh['sourceSha256'], 'submeshIndex': 0, 'mask': mask,
        'rawInputs': {**{hex(k): v for k, v in zip(offsets, values)},
                      '0x1fc': alpha, '0x6e0': op, '0x6f4': extra}})


def select_initial(data, node, catalog, meshes=None):
    """Reproduce the verified ordinary constructor path; never guess other types."""
    if node['typeId'] == 6:
        return select_model(data, node, catalog, meshes or {})
    if node['typeId'] not in LAYOUTS:
        return {'supported': False, 'reason': 'Native selector not implemented for this node type'}
    resource_type, bit0, bit1, bit2, bit3, bit4, op_at = LAYOUTS[node['typeId']]
    start = node['offset']
    if start < 0 or start + node['bytes'] > len(data):
        raise ValueError('Invalid source node range')
    byte0, byte1 = data[start + bit0], data[start + bit1]
    value = struct.unpack_from('<f', data, start + bit2)[0]
    word3, word4, op = [struct.unpack_from('<I', data, start + offset)[0]
                        for offset in (bit3, bit4, op_at)]
    if byte0 not in (0, 1) or not math.isfinite(value) or op not in OP_OFFSETS:
        return {'supported': False, 'reason': 'Unreviewed selector input', 'operation': op}
    bindings = node.get('resourceBindings', {})
    textured = bool(bindings.get('texture1')) and (op == 0 or bool(bindings.get('texture2')))
    mask = byte0 | (2 if byte1 else 0) | (4 if value != 0 else 0) | (8 if word3 == 1 else 0)
    mask += 16 if word4 == 1 else 0
    index = mask + (224 + OP_OFFSETS[op] if textured else 0)
    return selected(catalog, index, {'scope': 'Initial ordinary Quad/Particle constructor; no runtime override',
            'resourceType': resource_type, 'specialFlag': 0, 'operation': op,
            'textured': textured, 'mask': mask,
            'rawInputs': {hex(offset): v for offset, v in zip(
                (bit0, bit1, bit2, bit3, bit4, op_at), (byte0, byte1, value, word3, word4, op))}})
