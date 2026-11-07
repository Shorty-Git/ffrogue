"""Resource identity, not nearest pixels, controls version selection."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from PIL import Image
from memorial.prepare_texture_upload import prepare, prepare_source


class TextureSourceSelectionTests(unittest.TestCase):
    def test_source_and_native_upload_hashes_are_both_required_to_match(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'source.png'
            Image.new('RGBA', (2, 1), (129, 64, 255, 127)).save(path)
            raw, meta = prepare_source(path)
            self.assertEqual(raw, bytes([64, 32, 127, 127])*2)
            self.assertEqual(prepare_source(path, meta['sourceSha256'], meta['sha256'])[0], raw)
            with self.assertRaisesRegex(ValueError, 'source texture hash'):
                prepare_source(path, '0'*64, meta['sha256'])
            with self.assertRaisesRegex(ValueError, 'native upload identity'):
                prepare_source(path, meta['sourceSha256'], '0'*64)

    def test_incomplete_or_extraneous_bindings_never_choose_a_source_implicitly(self):
        with tempfile.TemporaryDirectory(dir='tools/data') as folder:
            base=Path(folder);fixture=base/'fixture.json';binding=base/'bindings.json'
            fixture.write_text(json.dumps({'plan': {'effects': [{'textures': {'image': '/assets/missing.png'}}]}}))
            for resources in [{}, {'extra': {}}]:
                binding.write_text(json.dumps({'schema':'verified-texture-sources-v1','resources':resources}))
                with self.assertRaisesRegex(ValueError, 'cover exactly'):
                    prepare(fixture, base/'out', bindings_file=binding)
            source=base/'source.png';Image.new('RGBA',(1,1),(255,0,0,128)).save(source)
            raw,meta=prepare_source(source)
            item={'source':source.as_posix(),'sourceSha256':meta['sourceSha256'],
                  'nativeUploadSha256':meta['sha256'],'evidence':'synthetic controlled test'}
            binding.write_text(json.dumps({'schema':'verified-texture-sources-v1','resources':{'/assets/missing.png':item}}))
            receipt=prepare(fixture,base/'out',bindings_file=binding)
            upload=receipt['uploads']['/assets/missing.png']
            self.assertEqual((Path.cwd()/upload['url'].lstrip('/')).read_bytes(),raw)
            self.assertEqual(upload['selection'],item)
            self.assertEqual(receipt['resourceBindingsSha256'],hashlib.sha256(binding.read_bytes()).hexdigest())


if __name__ == '__main__':
    unittest.main()
