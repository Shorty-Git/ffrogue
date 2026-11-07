"""Shared sprite-sheet layout for prepared body clips.

Clips are a single row of equal frames unless that row would exceed MAX_SHEET_WIDTH, the
common desktop WebGL texture limit; longer clips (Limit Burst bodies with 140+ frames) wrap
into a row-major grid that Phaser's spritesheet loader slices in the same frame order.
Existing single-row sheets stay byte-identical.
"""
import math

MAX_SHEET_WIDTH = 16384


def grid(frame_width, count, max_width=MAX_SHEET_WIDTH):
    """Columns and rows for `count` frames of `frame_width`."""
    if frame_width <= 0 or count <= 0:
        raise ValueError('Positive frame width and count required')
    if frame_width * count <= max_width:
        return count, 1
    columns = max(1, max_width // frame_width)
    return columns, math.ceil(count / columns)


def sheet_size(frame_width, frame_height, count, max_width=MAX_SHEET_WIDTH):
    columns, rows = grid(frame_width, count, max_width)
    return columns * frame_width, rows * frame_height


def frame_origin(index, frame_width, frame_height, count, max_width=MAX_SHEET_WIDTH):
    """Top-left pixel of frame `index` in the sheet."""
    columns, _ = grid(frame_width, count, max_width)
    return (index % columns) * frame_width, (index // columns) * frame_height


def wrap_strip(image, frame_width, frame_height, count, max_width=MAX_SHEET_WIDTH):
    """Re-lay a single-row strip into the shared grid; returns the input when it already fits."""
    if image.size == sheet_size(frame_width, frame_height, count, max_width):
        return image
    if image.size != (frame_width * count, frame_height):
        raise ValueError(f'Unexpected strip size {image.size} for {count} frames of {frame_width}x{frame_height}')
    from PIL import Image
    sheet = Image.new(image.mode, sheet_size(frame_width, frame_height, count, max_width))
    for index in range(count):
        frame = image.crop((index * frame_width, 0, (index + 1) * frame_width, frame_height))
        sheet.paste(frame, frame_origin(index, frame_width, frame_height, count, max_width))
    return sheet
