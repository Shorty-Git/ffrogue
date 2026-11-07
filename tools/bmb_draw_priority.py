"""Original emitter draw priorities from IBMB records.

The original non-full-Z NodeTree sorts emitter packets by Float32 SortPriority when the header
enables priority sorting (byte 0x4d), ties broken by metadata (node) index; without it packets
keep node order. Priority offsets verified 2026-11-07 against Basic_Basic_SortPriority of 92
matched BMB/BMSLN pairs: Quad +508 (134/134), Particle +408 (149/149), Model +460 (331/331).
The Quad/Particle offsets match tools/prepare_draw_submission.py.
"""
import math
import struct

PRIORITY_OFFSETS = {2: 508, 3: 408, 6: 460}


def attach_draw_priorities(raw, data):
    if raw[0x4c] not in (0, 1) or raw[0x4d] not in (0, 1):
        raise ValueError('Unknown original sorting flags')
    data['drawOrder'] = {'fullZSort': raw[0x4c] == 1, 'prioritySort': raw[0x4d] == 1}
    for node in data['nodes']:
        relative = PRIORITY_OFFSETS.get(node['typeId'])
        if relative is None:
            continue
        value = struct.unpack_from('<f', raw, node['offset'] + relative)[0]
        if not math.isfinite(value):
            raise ValueError('Nonfinite source priority')
        node['sortPriority'] = value
