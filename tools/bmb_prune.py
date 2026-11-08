"""Approximation mode: drop subtrees rooted at node types the pipeline cannot evaluate.

Node type 7 (1856-byte records; with FieldGoal children it draws lightning/line effects),
type 4 (EmitterSimpleParticle, 592 bytes) and type 15 (FieldGoal, 208 bytes) have no decoder or
player support yet. Every IBMB node shares the same header (kind, size, child count at +8), so the
hierarchy can be read for all nodes; the unknown subtrees are removed and the remaining nodes are
renumbered (`sourceIndex` keeps the original position). Each dropped subtree is recorded in
plan.approximations. Strict preparation never calls this.
"""
import struct

KNOWN = {0, 2, 3, 6}


def _hierarchy(data, nodes):
    parents, stack = [], []
    for index, node in enumerate(nodes):
        first, count, _ = struct.unpack_from('<QQQ', data, node['offset'] + 8)
        if first != count or count >= len(nodes):
            raise ValueError('Invalid IBMB child count')
        while stack and stack[-1][1] == 0:
            stack.pop()
        if index and not stack:
            raise ValueError('Unexpected second IBMB root')
        parent = stack[-1][0] if stack else None
        parents.append(parent)
        if parent is not None:
            stack[-1][1] -= 1
        if count:
            stack.append([index, count])
    return parents


def prune_unknown_subtrees(data, result, log):
    """Remove unknown-type subtrees in place; returns the number of removed nodes."""
    nodes = result['nodes']
    if all(n['typeId'] in KNOWN for n in nodes):
        return 0
    parents = _hierarchy(data, nodes)
    dropped = set()
    for index, node in enumerate(nodes):
        parent = parents[index]
        if node['typeId'] not in KNOWN or (parent is not None and parent in dropped):
            dropped.add(index)
    if 0 in dropped:
        raise ValueError('Unknown root node type')
    for index in sorted(dropped):
        if nodes[index]['typeId'] not in KNOWN and (parents[index] is None or parents[index] not in dropped):
            subtree = [i for i in sorted(dropped) if i == index or _descends(parents, i, index)]
            log.append({'droppedNode': index, 'typeId': nodes[index]['typeId'], 'bytes': nodes[index]['bytes'],
                        'subtreeSize': len(subtree), 'treatment': 'unsupported-node-type-subtree-omitted'})
    kept = [i for i in range(len(nodes)) if i not in dropped]
    remap = {old: new for new, old in enumerate(kept)}
    rebuilt = []
    for old in kept:
        node = nodes[old]
        node['sourceIndex'] = old
        node['index'] = remap[old]
        node['parentIndex'] = remap[parents[old]] if parents[old] is not None else None
        rebuilt.append(node)
    for node in rebuilt:
        node['children'] = [n['index'] for n in rebuilt if n['parentIndex'] == node['index']]
        node['childCount'] = len(node['children'])
    result['nodes'] = rebuilt
    result['hierarchy'] = {'decoded': True, 'rootIndex': 0,
                           'method': 'Shared header child counts; unknown-type subtrees omitted (approximation)'}
    return len(dropped)


def _descends(parents, node, ancestor):
    while node is not None:
        if node == ancestor:
            return True
        node = parents[node]
    return False
