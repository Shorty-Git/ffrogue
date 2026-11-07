"""Additional source-checked fields needed by the isolated playback experiment."""
import struct
from inspect_bmb import LIFE_OFFSETS

SQUARE = {0: 110, 2: 319, 3: 223, 6: 271}
INTERVAL = {0: 220, 2: 520, 3: 420, 6: 472}


def attach_playback_fields(data, nodes):
    unsupported = sorted({node['typeId'] for node in nodes if node['typeId'] not in LIFE_OFFSETS})
    if unsupported:
        raise ValueError('Playback blocked by unsupported BMB node types: ' + ', '.join(map(str, unsupported)))
    if any('childCount' not in node for node in nodes):
        raise ValueError('Playback requires a decoded complete hierarchy; child counts must not be guessed')
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
        # Native ActivateGenerator inputs. These are not complete lifecycle rules.
        if node['typeId'] in (0, 2, 3):
            mode_offset = {0: 0x100, 2: 0x268, 3: 0x208}[node['typeId']]
            enabled_offset = {2: 0x138, 3: 0xd8}.get(node['typeId'])
            node['nativeGeneration'] = dict(node['generation'],
                profile='native-constant-activation-v1', typeId=node['typeId'], childCount=node['childCount'],
                mode=struct.unpack_from('<I', data, start + mode_offset)[0],
                enabled=bool(data[start + enabled_offset]) if enabled_offset is not None else True,
                nullLifetimeMode=struct.unpack_from('<I', data, start + 0xc4)[0] if node['typeId'] == 0 else None,
                rawControlBytes=dict(offset=hex({0:0x69,2:0x13a,3:0xd8}[node['typeId']]),
                    values=list(data[start + (0x69 if node['typeId'] == 0 else 0x13a if node['typeId'] == 2 else 0xd8):
                                     start + (0x6c if node['typeId'] == 0 else 0x13d if node['typeId'] == 2 else 0xdb)])),
                boundary='Activation only; Null enabled means an explicitly invoked caller, not decoded source visibility')
        # Color fields are checked separately against the known source projects.
        color_offset = {0: 328, 2: 720, 3: 104, 6: 120}[node['typeId']]
        node['initialColor'] = list(struct.unpack_from('<3f', data, start + color_offset))
        # Original color1 wrappers use two vec4 parameters; only RGB is sampled.
        # Availability of these raw inputs does not select/admit a module.
        if node['typeId'] in (0, 3):
            node['nativeModuleInputs'] = {'color1': {
                'value': list(struct.unpack_from('<3f', data, start + color_offset)),
                'range': list(struct.unpack_from('<3f', data, start + color_offset + 16)),
                'valueOffset': start + color_offset, 'rangeOffset': start + color_offset + 16}}
        if node['typeId'] == 3:
            node['nativeModuleInputs']['texture2Scale'] = {
                'value': list(struct.unpack_from('<3f', data, start + 0x4e0)),
                'range': list(struct.unpack_from('<3f', data, start + 0x4ec)),
                'valueOffset': start + 0x4e0, 'rangeOffset': start + 0x4ec}
        if node['typeId'] == 2:
            node['nativeModuleInputs'] = {'flatColor': {
                'value': list(struct.unpack_from('<3f', data, start + 0x68)),
                'range': list(struct.unpack_from('<3f', data, start + 0x78)),
                'valueOffset': start + 0x68, 'rangeOffset': start + 0x78}}
