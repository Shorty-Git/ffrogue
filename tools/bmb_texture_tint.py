"""First-texture colour scale (texture tint) read from IBMB node records.

Verified 2026-11-07 against matched BMB/BMSLN pairs: Texture1_Color_Scale_Rgb_Value_Initial is
three float32 at the node offset below, Texture1_Color_Scale_Rgb_Value_Range follows 16 bytes
later. Evidence: 92 locally staged pairs plus 20 CPK originals selected for coloured Model
tints; Quad 74/74, Particle 24/24, Model 52/52 exact float matches, ranges equally exact.
Alpha and the motion type of the tint are NOT decoded here.
"""
import math
import struct

TINT_OFFSETS = {2: 248, 3: 152, 6: 168}


def read_texture_tint(raw, node):
    """(rgb, rgb_range) or None for node types without a verified tint slot."""
    relative = TINT_OFFSETS.get(node['typeId'])
    if relative is None:
        return None
    at = node['offset'] + relative
    rgb = list(struct.unpack_from('<3f', raw, at))
    rgb_range = list(struct.unpack_from('<3f', raw, at + 16))
    if not all(math.isfinite(v) for v in rgb + rgb_range):
        raise ValueError('Non-finite binary texture tint')
    return rgb, rgb_range
