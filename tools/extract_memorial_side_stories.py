"""Copy the JP Memorial client's internal download cache out of the BlueStacks VM disk (read-only).

The Memorial client (com.square_enix.ffbejpn) stores on-demand downloads such as most BGM banks
(`la842_bgm_ff7_tatakaumono.acb`, ...) in app-internal storage:
  /data/data/com.square_enix.ffbejpn/files/side_stories/<sha256>/<original name>
adb cannot read it without root, so this tool opens the instance's Data.vhdx directly
(dissect.hypervisor + dissect.extfs) and copies every file with its original name. The VM may keep
running; the disk is only read. Files that the game downloads later appear on the next run.

Requires: pip install --target <dir> dissect.hypervisor dissect.extfs  (pass --pylib <dir>)

Usage:
  python -I tools/extract_memorial_side_stories.py --pylib <dir> \
    --disk C:/ProgramData/BlueStacks_nxt/Engine/Tiramisu64_2/Data.vhdx \
    --out rawdata/memorial-downloads
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

PACKAGE_DIR = 'data/com.square_enix.ffbejpn/files/side_stories'


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--pylib', help='directory with the dissect packages')
    parser.add_argument('--disk', default='C:/ProgramData/BlueStacks_nxt/Engine/Tiramisu64_2/Data.vhdx')
    parser.add_argument('--out', default='rawdata/memorial-downloads')
    args = parser.parse_args()
    if args.pylib:
        sys.path.insert(0, args.pylib)
    from dissect.hypervisor.disk.vhdx import VHDX
    from dissect.extfs import ExtFS
    from dissect.util.stream import RangeStream
    from dissect.volume.disk import Disk

    disk = VHDX(open(args.disk, 'rb'))
    filesystem = None
    for partition in Disk(disk).partitions:
        try:
            filesystem = ExtFS(RangeStream(disk, partition.offset, partition.size))
            filesystem.get(PACKAGE_DIR)
            break
        except Exception:
            filesystem = None
    if filesystem is None:
        print('side_stories directory not found on any ext partition', file=sys.stderr)
        return 1

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    index = []
    copied = skipped = 0
    for bucket, node in filesystem.get(PACKAGE_DIR).listdir().items():
        if bucket in ('.', '..'):
            continue
        try:
            entries = node.listdir().items()
        except Exception:
            continue
        for name, inode in entries:
            if name in ('.', '..'):
                continue
            target = out / name
            data = None
            if target.exists() and target.stat().st_size == inode.size:
                skipped += 1
            else:
                data = inode.open().read()
                target.write_bytes(data)
                copied += 1
            if data is None:
                data = target.read_bytes()
            index.append({'name': name, 'bucket': bucket, 'bytes': len(data),
                          'sha256': hashlib.sha256(data).hexdigest()})
    index.sort(key=lambda row: row['name'])
    (out / 'index.json').write_text(json.dumps({'disk': args.disk, 'source': PACKAGE_DIR,
                                                'files': index}, indent=1), encoding='utf-8')
    print(f'{len(index)} files ({copied} copied, {skipped} unchanged), '
          f'{sum(row["bytes"] for row in index) / 2**30:.2f} GiB -> {out}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
