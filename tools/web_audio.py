"""Web build step: convert the built music (dist/assets/audio/*.wav, top level only) to Ogg Vorbis and
point the built code at the .ogg files. Source WAVs in public/ stay untouched; loop points are given in
seconds and Vorbis decodes sample-exact, so loops keep their positions. Combat cues (audio/combat) stay WAV.

    <python with soundfile> tools/web_audio.py dist [--quality 0.6]
"""
import argparse
import re
import sys
from pathlib import Path

import soundfile as sf


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('dist', type=Path)
    parser.add_argument('--quality', type=float, default=0.6, help='Vorbis quality 0..1')
    args = parser.parse_args()
    audio = args.dist / 'assets' / 'audio'
    converted = []
    # Music only: small system/UI samples stay WAV (instant decode, no measurable size gain).
    for wav in sorted(p for p in audio.glob('*.wav') if p.stat().st_size > 1_000_000):
        data, rate = sf.read(wav, dtype='float32', always_2d=True)
        ogg = wav.with_suffix('.ogg')
        with sf.SoundFile(ogg, 'w', samplerate=rate, channels=data.shape[1], format='OGG', subtype='VORBIS',
                          compression_level=1 - args.quality) as out:
            # Block-wise: one huge write overflows libsndfile's Vorbis encoder stack on Windows.
            for start in range(0, len(data), 65536):
                out.write(data[start:start + 65536])
        frames = sf.info(ogg).frames
        if frames != len(data):
            sys.exit(f'{wav.name}: {frames} frames after encoding, expected {len(data)}')
        converted.append((wav.name, ogg.name, wav.stat().st_size, ogg.stat().st_size))
        wav.unlink()
    # Built code and JSON reference the music by path; rewrite those references.
    names = {w: o for w, o, *_ in converted}
    pattern = re.compile('|'.join(re.escape(n) for n in names)) if names else None
    patched = 0
    for file in list(args.dist.rglob('*.js')) + list(args.dist.rglob('*.json')) + list(args.dist.glob('*.html')):
        if pattern is None:
            break
        text = file.read_text(encoding='utf-8', errors='strict')
        new = pattern.sub(lambda m: names[m.group(0)], text)
        if new != text:
            file.write_text(new, encoding='utf-8')
            patched += 1
    before, after = sum(c[2] for c in converted), sum(c[3] for c in converted)
    print(f'converted {len(converted)} tracks: {before / 1e6:.0f} MB -> {after / 1e6:.0f} MB; patched {patched} files')


if __name__ == '__main__':
    main()
