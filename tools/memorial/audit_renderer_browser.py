"""Inventory the pinned Android renderer's browser-reuse prerequisites.

Reads headers/import identities only; never loads or executes the Android image.
The optional native extraction is a local input for a separate Wasm format probe.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import zipfile

from prepare_diagnostic import EXPECTED_APK, EXPECTED_NATIVE


def audit(apk):
    if hashlib.sha256(apk.read_bytes()).hexdigest() != EXPECTED_APK:
        raise ValueError('Unexpected source APK')
    with zipfile.ZipFile(apk) as archive:
        entries = archive.namelist()
        data = archive.read('lib/arm64-v8a/libgame.so')
    if hashlib.sha256(data).hexdigest() != EXPECTED_NATIVE:
        raise ValueError('Unexpected native image')
    if data[:6] != b'\x7fELF\x02\x01':
        raise ValueError('Expected ELF64 little-endian image')
    section_offset = struct.unpack_from('<Q',data,40)[0]
    stride,count = struct.unpack_from('<HH',data,58)
    sections = [struct.unpack_from('<IIQQQQIIQQ',data,section_offset+i*stride) for i in range(count)]
    dynamic = next(s for s in sections if s[1]==6)
    strings = sections[dynamic[6]]
    strings = data[strings[4]:strings[4]+strings[5]]
    needed = [strings[value:strings.index(0,value)].decode() for kind,value in
              struct.iter_unpack('<qQ',data[dynamic[4]:dynamic[4]+dynamic[5]]) if kind==1]
    symbols = next(s for s in sections if s[1]==11)
    symbol_strings = sections[symbols[6]]
    symbol_strings = data[symbol_strings[4]:symbol_strings[4]+symbol_strings[5]]
    defined,imports = [],[]
    for offset in range(symbols[4],symbols[4]+symbols[5],symbols[9]):
        name,_,_,index,_,_ = struct.unpack_from('<IBBHQQ',data,offset)
        if name:
            (defined if index else imports).append(symbol_strings[name:symbol_strings.index(0,name)].decode())
    categories = {}
    for label,prefixes in dict(graphics=('gl','egl'),android=('__android_','AAsset'),
                               threads=('pthread_',),files=('fopen','fread','fwrite','stat','open','read','close')).items():
        matches = sorted(n for n in imports if n.startswith(prefixes))
        categories[label] = dict(count=len(matches),examples=matches[:8])
    return dict(approved=False,apkSha256=EXPECTED_APK,nativeSha256=EXPECTED_NATIVE,
                nativeBytes=len(data),magicHex=data[:8].hex(),elfClass=64,
                elfMachine=struct.unpack_from('<H',data,18)[0],neededLibraries=needed,
                undefinedSymbolCount=len(imports),importCategories=categories,
                jniExports=sorted(n for n in defined if n.startswith(('Java_','JNI_')))[:12],
                bishamonEntryPoints=sorted(n for n in defined if n.startswith(('_ZN12BishamonData6create','_ZN2ml4bmfw6System','_ZN2ml4bmfw9Animation')))[:20],
                wasmEntriesInApk=[n for n in entries if n.endswith('.wasm')],
                boundary='ABI/import inventory, not a full call-graph dependency proof or renderer startup'),data


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--extract-native',type=Path)
    args=parser.parse_args()
    for path in (args.output,args.extract_native):
        if path is not None and not path.resolve().is_relative_to(Path('tools/data').resolve()):
            parser.error('Outputs must remain under tools/data')
    result,data=audit(args.apk)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2),encoding='utf-8')
    if args.extract_native:
        args.extract_native.parent.mkdir(parents=True,exist_ok=True)
        args.extract_native.write_bytes(data)
    print(json.dumps(result,indent=2))
