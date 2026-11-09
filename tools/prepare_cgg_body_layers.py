"""Prepare reviewed CGG source-over and emissive layers without changing clip geometry."""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

import numpy as np
from PIL import Image
from sheet_grid import sheet_size, frame_origin


class FrameBoundsError(ValueError):
    pass


def save_hashed_layer(sheet, output, clip, layer):
    stream = io.BytesIO()
    sheet.save(stream, format='PNG')
    data = stream.getvalue()
    digest = hashlib.sha256(data).hexdigest()[:16]
    name = f'{clip}.{layer}.{digest}.png'
    (output / name).write_bytes(data)
    return name


def rows(path):
    with path.open(newline='', encoding='utf-8-sig') as stream:
        return [tuple(int(value) for value in row if value.strip()) for row in csv.reader(stream)]


def write_rows(path, records):
    path.write_text(''.join(','.join(map(str, record)) + ',\n' for record in records), encoding='ascii')


def isolate_parts(tool, raw, unit, parts, work):
    source, target = work / 'input', work / 'assembled'
    source.mkdir()
    target.mkdir()
    for atlas in raw.glob(f'unit_anime_{unit}*.png'):
        shutil.copyfile(atlas, source / atlas.name)
    results = {}
    with Image.open(source / f'unit_anime_{unit}.png') as atlas:
        alpha = atlas.convert('RGBA').getchannel('A')
        for part in parts:
            x, y, w, h, page = part[6:]
            if page or min(x, y) < 0 or x + w > alpha.width or y + h > alpha.height:
                raise ValueError('Unsupported CGG atlas region')
            if not part[4] or not alpha.crop((x, y, x + w, y + h)).getbbox():
                results[part] = None
    parts = [part for part in parts if part not in results]
    for start in range(0, len(parts), 64):
        batch = parts[start:start + 64]
        write_rows(source / f'unit_cgg_{unit}.csv', [(0, 1, *part) for part in batch])
        write_rows(source / f'unit_idle_cgs_{unit}.csv', [(i, 0, 0, 6) for i in range(len(batch))])
        subprocess.run([tool, unit, '-i', str(source), '-o', str(target), '--json'],
                       check=True, stdout=subprocess.DEVNULL)
        meta = json.loads((target / f'{unit}-idle.json').read_text())
        rect = meta['frameRect']
        width, height = rect['width'], rect['height']
        with Image.open(target / f'{unit}-idle.png') as image:
            if image.size != (width * len(batch), height):
                raise ValueError(f'Unexpected isolated strip at part {start}: {image.size}, expected {(width * len(batch), height)}')
            for i, part in enumerate(batch):
                frame = image.crop((i * width, 0, (i + 1) * width, height)).convert('RGBA')
                bounds = frame.getbbox(alpha_only=True)
                if not bounds:
                    results[part] = None
                    continue
                x, y = rect['x'] + bounds[0], rect['y'] + bounds[1]
                results[part] = (x, y, np.asarray(frame.crop(bounds), dtype=np.float32) / 255)
    return results


def neutral(part):
    return part[:3] + (0,) + part[4:]


def compose(pose, isolated, x, y, width, height):
    normal = np.zeros((height, width, 4), dtype=np.float32)
    emission = np.zeros((height, width, 3), dtype=np.float32)
    # ffbetool's two-layer overlap probe establishes first record on top.
    for part in reversed(pose):
        frame = isolated[neutral(part)]
        if frame is None:
            continue
        px, py, sample = frame
        px, py = px - x, py - y
        h, w, _ = sample.shape
        if px < 0 or py < 0 or px + w > width or py + h > height:
            raise FrameBoundsError('Isolated CGG part exceeds the admitted frame bounds')
        light = emission[py:py + h, px:px + w]
        alpha = sample[..., 3:4]
        rgb = sample[..., :3] * alpha
        if part[3] == 1:
            light += rgb
        else:
            body = normal[py:py + h, px:px + w]
            body *= 1 - alpha
            body[..., :3] += rgb
            body[..., 3:4] += alpha
            light *= 1 - alpha
    emission = emission.clip(0, 1)
    light = np.concatenate((emission, emission.max(axis=2, keepdims=True)), axis=2)
    for layer in (normal, light):
        alpha = layer[..., 3:4]
        np.divide(layer[..., :3], alpha, out=layer[..., :3], where=alpha > 0)
    return tuple(Image.fromarray(np.rint(layer.clip(0, 1) * 255).astype(np.uint8)) for layer in (normal, light))


def prepare(tool, raw, prepared, output):
    manifest = json.loads((prepared / 'manifest.json').read_text())
    unit = manifest['unitId']
    poses = []
    for row in rows(raw / f'unit_cgg_{unit}.csv'):
        if len(row) != 2 + row[1] * 11:
            raise ValueError('Unsupported CGG part layout')
        pose = [row[i:i + 11] for i in range(2, len(row), 11)]
        if any(part[3] not in (0, 1) for part in pose):
            raise ValueError('Unsupported CGG blend')
        poses.append(pose)
    selected = {}
    manifest.pop('bodyLayerIssues', None)
    manifest.pop('omittedRawFrames', None)
    for clip, meta in manifest['animations'].items():
        meta.pop('bodyLayers', None)
        sequence = rows(raw / f'unit_{clip}_cgs_{unit}.csv')
        exported = [f['delayTicks'] for f in meta['frames']]
        if [row[3] for row in sequence] != exported:
            # The sprite exporter omits frames that render fully transparent (e.g. Terra NV's 100-tick
            # vanish in limit_atk). The exported frames must then be an ordered subsequence of the raw
            # sequence; the omitted rows are recorded, anything else still fails.
            kept, at = [], 0
            for index, row in enumerate(sequence):
                if at < len(exported) and row[3] == exported[at]:
                    kept.append(index); at += 1
            if at != len(exported):
                raise ValueError(f'Clip timing differs for {clip}')
            manifest.setdefault('omittedRawFrames', {})[clip] = [i for i in range(len(sequence)) if i not in kept]
            sequence = [sequence[i] for i in kept]
        frames = [poses[row[0]] for row in sequence]
        if any(part[3] == 1 and part[4] for pose in frames for part in pose):
            selected[clip] = frames
    parts = list(dict.fromkeys(neutral(part) for frames in selected.values() for pose in frames for part in pose))
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='parts-', dir=output) as work:
        isolated = isolate_parts(tool, raw, unit, parts, Path(work))
    for clip, poses_for_clip in selected.items():
        meta = manifest['animations'][clip]
        width, height = meta['frameWidth'], meta['frameHeight']
        x, y = round(1000 - meta['pivotX'] * width), round(1000 - meta['pivotY'] * height)
        sheets = [Image.new('RGBA', sheet_size(width, height, len(poses_for_clip))) for _ in range(2)]
        for i, pose in enumerate(poses_for_clip):
            try:
                layers = compose(pose, isolated, x, y, width, height)
            except FrameBoundsError as error:
                manifest.setdefault('bodyLayerIssues', {})[clip] = f'Frame {i}: {error}'
                break
            for sheet, frame in zip(sheets, layers):
                sheet.paste(frame, frame_origin(i, width, height, len(poses_for_clip)))
        else:
            if sheets[1].getbbox(alpha_only=True):
                meta['bodyLayers'] = {layer: save_hashed_layer(sheet, output, clip, layer)
                                      for layer, sheet in zip(('normal', 'emission'), sheets)}
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    layered = sum('bodyLayers' in meta for meta in manifest['animations'].values())
    print(f'{unit}: {layered} layered clips, {len(parts)} isolated parts, '
          f'{len(manifest.get("bodyLayerIssues", {}))} blocked clips')


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--tool', default=str(Path('tools/bin/ffbetool.exe').resolve()))
    for arg in ('raw', 'prepared', 'output'):
        cli.add_argument('--' + arg, required=True, type=Path)
    args = cli.parse_args()
    prepare(args.tool, args.raw, args.prepared, args.output)
