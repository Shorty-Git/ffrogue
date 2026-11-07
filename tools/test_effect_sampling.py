import tempfile
import unittest
from pathlib import Path
from PIL import Image
from pack_effect_sheet import pack


class SheetSamplingTests(unittest.TestCase):
    def test_each_adjacent_frame_keeps_its_rgba_in_all_gutters(self):
        with tempfile.TemporaryDirectory(dir='tools/data') as folder:
            source, output = Path(folder) / 'in.png', Path(folder) / 'out.png'
            image = Image.new('RGBA', (4, 4))
            colors = [(255, 0, 0, 0), (0, 255, 0, 128), (0, 0, 255, 255), (71, 29, 13, 23)]
            for i, color in enumerate(colors):
                image.paste(color, (i % 2 * 2, i // 2 * 2, i % 2 * 2 + 2, i // 2 * 2 + 2))
            image.save(source)
            self.assertEqual(pack(source, output, 2, 2, 4, 2, 1)['framesUnchanged'], 4)
            result = Image.open(output)
            for i, color in enumerate(colors):
                cell = result.crop((i % 2 * 4, i // 2 * 4, i % 2 * 4 + 4, i // 2 * 4 + 4))
                self.assertEqual({cell.getpixel((x, y)) for x in range(4) for y in range(4)}, {color})

    def test_nonuniform_pixels_and_corners_are_not_resampled(self):
        with tempfile.TemporaryDirectory(dir='tools/data') as folder:
            source, output = Path(folder) / 'in.png', Path(folder) / 'out.png'
            image = Image.new('RGBA', (2, 2))
            image.putdata([(x, x + 1, x + 2, x + 3) for x in [1, 20, 70, 240]])
            image.save(source); pack(source, output, 2, 2, 1, 1, 2)
            result = Image.open(output)
            for y in range(6):
                for x in range(6):
                    self.assertEqual(result.getpixel((x, y)), image.getpixel((min(1, max(0, x - 2)), min(1, max(0, y - 2)))))

    def test_wrong_geometry_is_rejected(self):
        with tempfile.TemporaryDirectory(dir='tools/data') as folder:
            source = Path(folder) / 'in.png'; Image.new('RGBA', (2, 2)).save(source)
            with self.assertRaises(ValueError): pack(source, Path(folder) / 'out.png', 3, 2, 1, 1, 1)


if __name__ == '__main__': unittest.main()
