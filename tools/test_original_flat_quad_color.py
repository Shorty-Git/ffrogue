"""Native flat RGB source admission must not invent alpha or ignore active modes."""
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from inspect_bmb import read_bmb
from original_flat_quad_color import attach_flat_quad_color, quad_color_preparation_hints


class FlatQuadColorTests(unittest.TestCase):
    def test_original_sword_colors_and_ranges_are_retained_separately_from_alpha(self):
        p = Path('tools/data/roster-expansion-20261101/follow-up/delita-1323010/originals/atk_slash6_rand_orange.bmb')
        raw = p.read_bytes()
        project = Path('rawdata/assets/battle_effect/atk_slash6_rand_orange.bmsln').read_bytes()
        result = read_bmb(raw)
        hints = quad_color_preparation_hints(raw, result)
        self.assertEqual(hints['flatRgbNodes'], [4, 5, 6, 7, 9, 11])
        self.assertEqual(hints['preparationArguments'], ['--flat-quad-rgb'])
        self.assertFalse(hints['wholeEffectAdmitted'])
        self.assertFalse(any('flatQuadColor' in n for n in result['nodes']))
        attach_flat_quad_color(raw, result, project)
        colors = [n['flatQuadColor'] for n in result['nodes'] if n['typeId'] == 2]
        self.assertEqual(len(colors), 6)
        self.assertEqual(colors[0]['value'], [1, .4065420627593994, 0])
        self.assertEqual(len({tuple(c['value']) for c in colors}), 4)
        self.assertTrue(any(any(c['range']) for c in colors))
        self.assertTrue(all(len(c['value']) == len(c['range']) == 3 for c in colors))
        self.assertTrue(all('quadColors' not in n for n in result['nodes']))
        with self.assertRaisesRegex(ValueError, 'exact matching'):
            attach_flat_quad_color(raw, read_bmb(raw), None)
        xml = ET.fromstring(project)
        xml.findall('.//ResIdeNode')[1:][4].find('Color_Basic_ColorType').text = 'Curve'
        altered = ET.tostring(xml)
        with self.assertRaises(ValueError):
            attach_flat_quad_color(raw, read_bmb(raw), altered)


if __name__ == '__main__':
    unittest.main()
