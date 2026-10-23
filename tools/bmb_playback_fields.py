"""Additional source-checked fields needed by the isolated playback experiment."""
import struct
from inspect_bmb import LIFE_OFFSETS

SQUARE = {0: 110, 2: 319, 3: 223, 6: 271}
INTERVAL = {0: 220, 2: 520, 3: 420, 6: 472}


def attach_playback_fields(data, nodes):
    for node in nodes:
        if node['typeId'] not in LIFE_OFFSETS:
            raise ValueError('Playback experiment does not support unknown node types')
        start = node['offset']
        life = start + LIFE_OFFSETS[node['typeId']]
        node['generation'] = {
            'start': struct.unpack_from('<I', data, life - 8)[0],
            'startRange': struct.unpack_from('<I', data, life - 4)[0],
            'count': struct.unpack_from('<I', data, life + 16)[0],
            'duration': struct.unpack_from('<I', data, life + 20)[0],
            'repeatCount': struct.unpack_from('<I', data, life + 24)[0],
            'interval': struct.unpack_from('<f', data, start + INTERVAL[node['typeId']])[0],
        }
        node['uniformScale'] = bool(data[start + SQUARE[node['typeId']]])
        # Color fields are checked separately against the known source projects.
        color_offset = {0: 328, 2: 720, 3: 104, 6: 120}[node['typeId']]
        node['initialColor'] = list(struct.unpack_from('<3f', data, start + color_offset))
