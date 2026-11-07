"""Prepare exact Cocos RGBA8 PNG upload bytes; keep source parsing outside the game."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from PIL import Image


def premultiply_rgba8(raw):
    if len(raw) % 4:
        raise ValueError('RGBA8 bytes required')
    result = bytearray(raw)
    for at in range(0, len(result), 4):
        alpha = raw[at + 3] + 1
        for channel in range(3):
            result[at + channel] = raw[at + channel] * alpha >> 8
    return bytes(result)


def verify_original(apk):
    from emulate_zscreen_locator import LocatorReference, HEAP, STOP
    from unicorn import Uc, UC_ARCH_ARM64, UC_MODE_ARM, UC_HOOK_CODE
    from unicorn.arm64_const import UC_ARM64_REG_X0, UC_ARM64_REG_LR, UC_ARM64_REG_PC
    image = LocatorReference(apk)
    entry, size = 0x212a5a0, 144
    cpu = Uc(UC_ARCH_ARM64, UC_MODE_ARM)
    cpu.mem_map(entry & ~4095, 4096)
    cpu.mem_write(entry & ~4095, image.read(entry & ~4095, 4096))
    cpu.mem_map(HEAP, 65536)
    cpu.mem_map(STOP, 4096)
    raw = bytes(channel for alpha in range(256) for rgb in [0,1,2,17,63,127,128,191,254,255]
                for channel in [rgb,255-rgb,(rgb*3)%256,alpha])
    cpu.mem_write(HEAP + 0x1000, raw)
    cpu.mem_write(HEAP + 0x28, struct.pack('<Q', HEAP + 0x1000))
    cpu.mem_write(HEAP + 0x38, struct.pack('<2I', len(raw)//4, 1))
    cpu.reg_write(UC_ARM64_REG_X0, HEAP)
    cpu.reg_write(UC_ARM64_REG_LR, STOP)
    def guard(machine, address, size, _):
        if not entry <= address < entry + 144:
            raise ValueError('Execution left the original alpha function')
    cpu.hook_add(UC_HOOK_CODE, guard)
    cpu.emu_start(entry, STOP, count=200000)
    if cpu.reg_read(UC_ARM64_REG_PC) != STOP or bytes(cpu.mem_read(HEAP+0x1000,len(raw))) != premultiply_rgba8(raw):
        raise ValueError('Original premultiplication mismatch')
    return dict(entry=hex(entry), codeSha256=hashlib.sha256(image.read(entry,size)).hexdigest(),
                pixels=len(raw)//4, exact=True, pngDefaultEnabled=image.read(0x2e153a8,1).hex(),
                boundary='Original isolated instructions with synthetic RGBA8 inputs; not a new live texture readback')


def prepare_source(source, expected_source=None, expected_upload=None):
    """Decode a selected source version; never infer identity from a filename."""
    source_digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if expected_source is not None and source_digest != expected_source:
        raise ValueError('Selected source texture hash mismatch')
    with Image.open(source) as image:
        if image.format != 'PNG':
            raise ValueError('Original PNG source required')
        image = image.convert('RGBA')
        raw = premultiply_rgba8(image.tobytes())
        width, height = image.size
    digest = hashlib.sha256(raw).hexdigest()
    if expected_upload is not None and digest != expected_upload:
        raise ValueError('Prepared texels do not match the explicit native upload identity')
    return raw, dict(width=width, height=height, sha256=digest, sourceSha256=source_digest)


def prepare(fixture_file, output, apk=None, bindings_file=None):
    root = Path.cwd().resolve()
    output = output.resolve()
    if not output.resolve().is_relative_to(root/'tools/data'):
        raise ValueError('Prepared research output must remain ignored')
    fixture = json.loads(fixture_file.read_text(encoding='utf-8'))
    bindings = json.loads(bindings_file.read_text(encoding='utf-8')) if bindings_file else None
    urls = {url for effect in fixture['plan']['effects'] for url in effect['textures'].values()}
    if bindings is not None and (bindings.get('schema') != 'verified-texture-sources-v1'
            or set(bindings.get('resources', {})) != urls):
        raise ValueError('Explicit resource bindings must cover exactly the selected plan textures')
    uploads = {}
    output.mkdir(parents=True, exist_ok=True)
    for effect in fixture['plan']['effects']:
        for url in set(effect['textures'].values()):
            source = root/'public'/url.lstrip('/')
            if not source.resolve().is_relative_to(root/'public'):
                raise ValueError('Unexpected source texture path')
            selected = bindings['resources'][url] if bindings is not None else None
            if selected is not None:
                if set(selected) != {'source', 'sourceSha256', 'nativeUploadSha256', 'evidence'} or not selected['evidence']:
                    raise ValueError('Selected resource requires explicit source/upload identities and evidence')
                source = (root/selected['source']).resolve()
                if not source.is_relative_to(root) or not source.is_file():
                    raise ValueError('Selected source must be an existing workspace file')
            raw, metadata = prepare_source(source, selected['sourceSha256'] if selected else None,
                                            selected['nativeUploadSha256'] if selected else None)
            destination = output/(metadata['sha256']+'.rgba')
            if destination.exists() and destination.read_bytes() != raw:
                raise ValueError('Refusing to replace different content under a texel hash')
            destination.write_bytes(raw)
            uploads[url] = dict(profile='cocos-rgba8-premultiplied-v1',**metadata,
                                url='/'+destination.relative_to(root).as_posix(),
                                **({'selection': selected} if selected else {}))
    receipt = dict(profile='cocos-rgba8-premultiplied-v1',formula='RGB = (RGB * (A + 1)) >> 8; alpha unchanged',
                   uploads=uploads, original=verify_original(apk) if apk else None,
                   resourceBindingsSha256=hashlib.sha256(bindings_file.read_bytes()).hexdigest() if bindings_file else None)
    (output/'uploads.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
    return receipt


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fixture',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--verify-native',type=Path)
    parser.add_argument('--resource-bindings',type=Path,help='Complete hash-pinned source selection; no filename fallback')
    args = parser.parse_args()
    result = prepare(args.fixture,args.output,args.verify_native,args.resource_bindings)
    print(json.dumps(dict(textures=len(result['uploads']),original=result['original'])))
