"""Boundary and format-drift checks for the legacy IBMB structural reader."""
import struct
import unittest
import xml.etree.ElementTree as ET
from inspect_bmb import compare_project, read_bmb


def fixture():
    data = bytearray(824)
    data[:8] = bytes.fromhex('49424d4201010301')
    struct.pack_into('<I', data, 16, 1)
    struct.pack_into('<I', data, 32, 0)
    struct.pack_into('<II', data, 88, 800, 816)
    struct.pack_into('<II', data, 96, 0, 704)
    data[800:816] = b'../\0texture_001\0'
    struct.pack_into('<Q', data, 816, 4)
    return data


class BmbStructureTests(unittest.TestCase):
    def test_resource_is_taken_from_table_not_arbitrary_strings(self):
        data = fixture()
        before = bytes(data)
        result = read_bmb(data)
        self.assertEqual(result['nodes'][0]['type'], 'ControlNull')
        self.assertEqual([r['name'] for r in result['resources']], ['texture_001'])
        self.assertFalse(result['rendered'])
        self.assertEqual(bytes(data), before)

    def test_invalid_offsets_and_truncation_are_rejected(self):
        for offset, value in [(88, 900), (92, 799), (32, 900), (100, 4)]:
            with self.subTest(offset=offset):
                data = fixture()
                struct.pack_into('<I', data, offset, value)
                with self.assertRaises(ValueError):
                    read_bmb(data)
        with self.assertRaises(ValueError):
            read_bmb(fixture()[:-1])
        data = fixture()
        struct.pack_into('<Q', data, 816, 5)
        with self.assertRaises(ValueError):
            read_bmb(data)

    def test_version_and_node_layout_drift_are_rejected(self):
        data = fixture()
        data[4] = 2
        with self.assertRaises(ValueError):
            read_bmb(data)
        data = fixture()
        struct.pack_into('<II', data, 96, 6, 704)
        with self.assertRaises(ValueError):
            read_bmb(data)

    def test_source_comparison_rejects_different_source_data(self):
        project = b'''<Solution><ResIdeNode><Basic_Meta_Name /></ResIdeNode>
        <ChildList><EffectProject>
        <ResIdeNode><Basic_Meta_NodeType>ControlNull</Basic_Meta_NodeType>
        <Basic_Basic_Life>0</Basic_Basic_Life><Basic_Basic_LifeRange>0</Basic_Basic_LifeRange>
        </ResIdeNode>
        </EffectProject></ChildList></Solution>'''
        project_root = ET.fromstring(project)
        source_node = project_root.findall('.//ResIdeNode')[1]
        ET.SubElement(source_node, 'Blend_Basic_BlendAlphaType').text = 'Constant'
        ET.SubElement(source_node, 'Color_Basic_ColorType').text = 'Constant'
        ET.SubElement(source_node, 'Blend_Basic_Alpha').text = '0'
        for group in ['Translate', 'Rotate', 'Scale']:
            for term in ['Value', 'Speed', 'Acceleration']:
                for suffix in ['Initial', 'Range']:
                    ET.SubElement(source_node, group + '_' + term + '_' + suffix, X='0', Y='0', Z='0')
            ET.SubElement(source_node, group + '_Basic_' + group + 'Type').text = 'Constant'
        project = ET.tostring(project_root)
        data = fixture()
        struct.pack_into('<I', data, 16, 0)
        result = read_bmb(data)
        self.assertTrue(compare_project(result, project)['lifeParametersMatch'])
        changed = project.replace(b'<Basic_Basic_Life>0', b'<Basic_Basic_Life>60')
        with self.assertRaises(ValueError):
            compare_project(result, changed)
        ET.SubElement(source_node, 'Texture_Layer1_PictureName').text = 'unexpected_texture'
        with self.assertRaises(ValueError):
            compare_project(result, ET.tostring(project_root))

    def test_unknown_node_type_remains_explicitly_unknown(self):
        data = fixture()
        struct.pack_into('<I', data, 96, 99)
        result = read_bmb(data)
        self.assertEqual(result['nodes'][0]['type'], 'Unknown')
        self.assertNotIn('lifeParameter', result['nodes'][0])
        self.assertFalse(result['hierarchy']['decoded'])

    def test_scalar_key_data_and_bad_references(self):
        data = fixture()
        struct.pack_into('<QQ', data, 96 + 280, 2, 8)
        data.extend(struct.pack('<I4f', 2, 0.25, -0.5, 0.75, 0))
        data.extend(struct.pack('<I4f', 1, 0, 0, 0, 1))
        result = read_bmb(data)
        curve = result['nodes'][0]['alphaCurve']
        self.assertEqual(curve['keys'][0]['type'], 'Spline')
        self.assertEqual(curve['keys'][0]['slopeRight'], -0.5)
        self.assertEqual(curve['keys'][1]['frame'], 1)
        unknown = bytearray(data)
        struct.pack_into('<I', unknown, 824, 99)
        self.assertEqual(read_bmb(unknown)['nodes'][0]['alphaCurve']['keys'][0]['type'], 'Unknown')
        with self.assertRaises(ValueError):
            read_bmb(data[:-1])
        unordered = bytearray(data)
        struct.pack_into('<f', unordered, len(data) - 4, -1)
        with self.assertRaises(ValueError):
            read_bmb(unordered)
        nonfinite = bytearray(data)
        struct.pack_into('<f', nonfinite, 824 + 12, float('nan'))
        with self.assertRaises(ValueError):
            read_bmb(nonfinite)

    def test_tree_rejects_missing_children_and_second_root(self):
        data = fixture()
        struct.pack_into('<QQQ', data, 104, 1, 1, 0)
        with self.assertRaises(ValueError):
            read_bmb(data)
        # Add another independently valid control block without a parent slot.
        first = fixture()
        data = first[:800] + first[96:800] + first[800:]
        struct.pack_into('<II', data, 88, 1504, 1520)
        with self.assertRaises(ValueError):
            read_bmb(data)
        # The same blocks form one valid tree when the root has one child.
        struct.pack_into('<QQQ', data, 104, 1, 1, 0)
        result = read_bmb(data)
        self.assertEqual(result['nodes'][0]['children'], [1])
        self.assertEqual(result['nodes'][1]['parentIndex'], 0)
        struct.pack_into('<Q', data, 112, 2)
        with self.assertRaises(ValueError):
            read_bmb(data)


if __name__ == '__main__':
    unittest.main()
