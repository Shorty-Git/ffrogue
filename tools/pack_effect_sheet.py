"""Extrude sheet gutters without resampling or changing any original frame pixel."""
import argparse
import hashlib
import json
import math
from pathlib import Path
from PIL import Image


def pack(source, output, width, height, count, columns, gutter):
    if not all(type(n) is int and n > 0 for n in [width, height, count, columns, gutter]) or gutter > 4:
        raise ValueError('Expected positive bounded sheet geometry and gutter')
    image = Image.open(source).convert('RGBA')
    rows = math.ceil(count / columns)
    if image.size != (width * columns, height * rows):
        raise ValueError('Input must be an unpadded sheet with exact reviewed dimensions')
    stride_x, stride_y = width + 2 * gutter, height + 2 * gutter
    if max(stride_x * columns, stride_y * rows) > 8192:
        raise ValueError('Padded sheet exceeds the texture budget')
    result = Image.new('RGBA', (stride_x * columns, stride_y * rows))
    before, after = hashlib.sha256(), hashlib.sha256()
    for index in range(count):
        col, row = index % columns, index // columns
        frame = image.crop((col * width, row * height, (col + 1) * width, (row + 1) * height))
        x, y = col * stride_x + gutter, row * stride_y + gutter
        before.update(frame.tobytes())
        result.paste(frame, (x, y))
        # Duplicate edge texels into the whole gutter, including all four corners.
        for a, b, c, d, box in [
            (0, 0, 1, height, (x - gutter, y, x, y + height)),
            (width - 1, 0, width, height, (x + width, y, x + width + gutter, y + height)),
            (0, 0, width, 1, (x, y - gutter, x + width, y)),
            (0, height - 1, width, height, (x, y + height, x + width, y + height + gutter)),
            (0, 0, 1, 1, (x - gutter, y - gutter, x, y)),
            (width - 1, 0, width, 1, (x + width, y - gutter, x + width + gutter, y)),
            (0, height - 1, 1, height, (x - gutter, y + height, x, y + height + gutter)),
            (width - 1, height - 1, width, height, (x + width, y + height, x + width + gutter, y + height + gutter)),
        ]:
            result.paste(frame.crop((a, b, c, d)).resize((box[2] - box[0], box[3] - box[1]), Image.Resampling.NEAREST), box[:2])
        after.update(result.crop((x, y, x + width, y + height)).tobytes())
    assert before.digest() == after.digest()
    result.save(output)
    return dict(framePixelsSha256=before.hexdigest(), framesUnchanged=count, size=list(result.size))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    for key in ['width', 'height', 'count', 'columns', 'gutter']:
        parser.add_argument('--' + key, type=int, required=True)
    args = parser.parse_args()
    print(json.dumps(pack(args.input, args.output, args.width, args.height, args.count, args.columns, args.gutter)))
