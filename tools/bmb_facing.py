"""Facing type of Quad and Model emitters (polygon in the hierarchy or view-aligned billboard).

Found 2026-11-13 by comparing staged originals with matched authoring: the only offsets where one value
per authoring name holds for every node.
- Quad +2120 (`Detail_Basic_QuadType`): 0 Billboard, 1 Polygon, 2 Facing (428 Polygon, 15 Billboard,
  1 Facing nodes). Directional and Polyline exist in authoring but not in the compared set: Unknown.
- Model +1896 (`Detail_Basic_ModelType`): 0 Billboard, 1 Standard (810 Standard, 94 Billboard nodes).
  Polyline: Unknown.
Particles are always billboards in authoring (4,522 of 4,522) and carry no such field here.
"""
import struct

FACING = {
    2: (2120, 'Detail_Basic_QuadType', {0: 'Billboard', 1: 'Polygon', 2: 'Facing'}),
    6: (1896, 'Detail_Basic_ModelType', {0: 'Billboard', 1: 'Standard'}),
}


def attach_facing(raw, result):
    count = 0
    for node in result['nodes']:
        entry = FACING.get(node['typeId'])
        if not entry or node['bytes'] < entry[0] + 4:
            continue
        field = node['offset'] + entry[0]
        code = struct.unpack_from('<I', raw, field)[0]
        node['facing'] = {'id': code, 'name': entry[2].get(code, 'Unknown'), 'fieldOffset': field}
        count += 1
    return count


def compare_facing(node, source):
    """Check one decoded node against its matched authoring node; returns 1 when checked."""
    entry = FACING.get(node['typeId'])
    if not entry or 'facing' not in node:
        return 0
    if node['facing']['name'] == 'Unknown' or node['facing']['name'] != source.findtext(entry[1]):
        raise ValueError('BMB/BMSLN facing type differs')
    return 1
