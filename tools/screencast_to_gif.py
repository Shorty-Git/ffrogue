"""Turn a CDP screencast capture (tools/capture_battle_screencast.mjs) into a phone-friendly GIF.

Usage: <python> tools/screencast_to_gif.py <frames-dir> <out.gif> [fps=10] [width=380]
"""
import glob
import json
import os
import sys
from PIL import Image

frames_dir, out = sys.argv[1], sys.argv[2]
fps = float(sys.argv[3]) if len(sys.argv) > 3 else 10
width = int(sys.argv[4]) if len(sys.argv) > 4 else 380
times = json.load(open(os.path.join(frames_dir, 'times.json')))
rect = json.load(open(os.path.join(frames_dir, 'rect.json')))
files = sorted(glob.glob(os.path.join(frames_dir, 'f*.jpg')))
step, images, index, target = 1 / fps, [], 0, 0.0
while target <= times[-1]:
    while index + 1 < len(times) and times[index + 1] <= target:
        index += 1
    image = Image.open(files[index]).convert('RGB').crop(tuple(rect))
    image = image.resize((width, int(image.height * width / image.width)), Image.LANCZOS)
    images.append(image.quantize(colors=96, method=Image.MEDIANCUT))
    target += step
images[0].save(out, save_all=True, append_images=images[1:], duration=int(1000 / fps), loop=0, optimize=True)
print(f'{len(images)} frames, {os.path.getsize(out) // 1024} KB -> {out}')
