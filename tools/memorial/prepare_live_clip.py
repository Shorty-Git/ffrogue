"""Prepare an unpublished native pixel clip, preserving admitted material runs."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zlib

import numpy as np
from PIL import Image
from prepare_diagnostic import EXPECTED_NATIVE


def read_pixels(root, item, width, height):
    name = item['file']
    if not re.fullmatch(r'[A-Za-z0-9_-]+\.rgba\.zlib', name):
        raise ValueError('Unsafe readback name')
    packed = (root / name).read_bytes()
    size = width * height * 4
    if item['bytes'] != len(packed) or item['rawBytes'] != size or item['framebufferStatus'] != 0x8cd5:
        raise ValueError('Invalid readback receipt')
    decoder = zlib.decompressobj()
    raw = decoder.decompress(packed, size + 1)
    if len(raw) != size or not decoder.eof or decoder.unused_data:
        raise ValueError('Invalid bounded compressed pixels')
    return np.frombuffer(raw, dtype=np.uint8).reshape(height, width, 4)[::-1].copy()


def blend_mode(state):
    if (not state['enabled'] or state['equationRgb'] != 0x8006
            or state['colorMask'] != [1, 1, 1, 1]):
        raise ValueError('Unsupported color equation or write mask')
    if state['depthTest'] and state['depthMask']:
        raise ValueError('Cross-run depth writing requires a shared native depth target')
    if state['srcRgb'] not in (1, 0x302):
        raise ValueError('Unsupported source color factor')
    if state['dstRgb'] == 1:
        return 'add'
    if state['dstRgb'] == 0x303:
        return 'over'
    raise ValueError('Unsupported destination color factor')


def prepare(sequence_path, output):
    sequence = json.loads(sequence_path.read_text(encoding='utf-8'))
    single = sequence.get('status') == 'gpu-mirrored'
    if single:
        sequence = dict(token=sequence['token'], file=sequence['file'], nativeSha256=sequence['nativeSha256'],
                        approved=False, status='native-stepped', frames=[dict(tick=sequence['drawIndex'], manifest=sequence_path.name, empty=sequence['empty'])],
                        timing='One live wrapper draw ordinal; not a source simulation frame or animation sequence',
                        limitations=['Single live sample only', 'Game-loaded placement and camera retained'])
    if sequence.get('nativeSha256') != EXPECTED_NATIVE or sequence.get('status') != 'native-stepped' or sequence.get('approved') is not False:
        raise ValueError('Pinned unpublished native-stepped sequence required')
    if not output.resolve().is_relative_to(Path('tools/data').resolve()):
        raise ValueError('Clip must remain in ignored research storage')
    output.mkdir(parents=True, exist_ok=True)
    frames, hashes, checks = [], [], []
    dimensions = None
    for entry in sequence['frames']:
        if not re.fullmatch(r'[A-Za-z0-9_-]+\.json', entry['manifest']):
            raise ValueError('Unsafe frame receipt')
        manifest_path = sequence_path.parent / entry['manifest']
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        actual_tick = manifest['drawIndex'] if single else manifest['tick']
        if manifest['nativeSha256'] != EXPECTED_NATIVE or manifest['token'] != sequence['token'] or actual_tick != entry['tick']:
            raise ValueError('Frame identity differs')
        hashes.append(dict(file=entry['manifest'], sha256=hashlib.sha256(manifest_path.read_bytes()).hexdigest()))
        if entry['empty']:
            frames.append(dict(tick=entry['tick'], layers=[]))
            continue
        width, height = manifest['width'], manifest['height']
        if any(type(v) is not int or not 1 <= v <= 2560 for v in (width, height)):
            raise ValueError('Invalid frame size')
        if dimensions and dimensions != [width, height]:
            raise ValueError('Sequence viewport changed')
        dimensions = [width, height]
        refs = {item['background']: read_pixels(sequence_path.parent, item, width, height) for item in manifest['outputs']}
        composited = {bg: np.full((height, width, 3), value, dtype=np.float32) for bg, value in [('black', 0), ('white', 255)]}
        layers = []
        for index, run in enumerate(manifest['runs']):
            mode = blend_mode(run['blend'])
            images = {item['background']: read_pixels(sequence_path.parent, item, width, height) for item in run['outputs']}
            rgb = images['black'][:, :, :3].astype(np.float32)
            if mode == 'add':
                alpha = np.zeros((height, width), dtype=np.uint8)
            else:
                transmission = images['white'][:, :, :3].astype(np.int16) - rgb
                spread = np.max(transmission, axis=2) - np.min(transmission, axis=2)
                if np.max(spread) > 3 or np.min(transmission) < -2:
                    raise ValueError('Run does not admit scalar source-over coverage')
                alpha = np.clip(np.rint(255 - np.mean(transmission, axis=2)), 0, 255).astype(np.uint8)
            rgba = np.dstack((rgb.astype(np.uint8), alpha))
            mask = np.any(rgba != 0, axis=2)
            if not np.any(mask):
                continue
            yy, xx = np.nonzero(mask)
            box = [int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1]
            name = f"f{entry['tick']}-run{index}.rgba"
            cropped = rgba[box[1]:box[3], box[0]:box[2]]
            (output / name).write_bytes(cropped.tobytes())
            Image.fromarray(cropped).save(output / name.replace('.rgba', '.png'))
            layers.append(dict(file=name, mode=mode, box=box, sha256=hashlib.sha256((output / name).read_bytes()).hexdigest()))
            for bg in composited:
                composited[bg] = np.clip(np.rint(rgb + composited[bg] * (1 - alpha[:, :, None] / 255)), 0, 255)
        errors = {}
        for bg in composited:
            delta = np.abs(composited[bg] - refs[bg][:, :, :3])
            errors[bg] = dict(max=float(delta.max()), pixelsAbove3=int(np.count_nonzero(np.max(delta, axis=2) > 3)))
            Image.fromarray(refs[bg]).save(output / f"f{entry['tick']}-native-{bg}.png")
        checks.append(dict(tick=entry['tick'], errors=errors, runs=len(manifest['runs'])))
        frames.append(dict(tick=entry['tick'], layers=layers))
    if not dimensions:
        raise ValueError('No nonempty native frames exported')
    passed = all(v['pixelsAbove3'] == 0 for frame in checks for v in frame['errors'].values())
    result = dict(schemaVersion=1, approved=False, source=sequence['file'], nativeSha256=EXPECTED_NATIVE,
                  size=dimensions, frames=frames, checks=checks, nativeReferenceChecksPassed=passed, sampleKind='Live draw ordinal' if single else 'Native tick',
                  sourceReceipts=hashes, timing=sequence['timing'], ticksPerSecond=60,
                  timingLimit='60 ticks/s is a review playback setting; original wall-clock speed is not established',
                  limitations=sequence['limitations'] + ['Only admitted additive/source-over runs; no depth-writing passes', 'Arbitrary-background accuracy needs an independent patterned native reference'])
    (output / 'clip.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(dict(frames=len(frames), size=dimensions, checksPassed=passed, checks=checks), indent=2))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sequence', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    prepare(args.sequence, args.output)
