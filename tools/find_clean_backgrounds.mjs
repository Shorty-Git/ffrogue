import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const bgDir = 'ffbe_asset_dump-main/battle_bg';
const previewDir = 'tools/bg_preview';

if (!fs.existsSync(previewDir)) {
  fs.mkdirSync(previewDir, { recursive: true });
}

function analyzePng(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    let offset = 8;
    let ihdr = null;
    let trns = null;
    let idatChunks = [];
    while (offset < data.length) {
      const len = data.readUInt32BE(offset);
      const type = data.toString('ascii', offset + 4, offset + 8);
      if (type === 'IHDR') {
        ihdr = {
          w: data.readUInt32BE(offset + 8),
          h: data.readUInt32BE(offset + 12),
          depth: data.readUInt8(offset + 16),
          colorType: data.readUInt8(offset + 17)
        };
      } else if (type === 'tRNS') {
        trns = data.subarray(offset + 8, offset + 8 + len);
      } else if (type === 'IDAT') {
        idatChunks.push(data.subarray(offset + 8, offset + 8 + len));
      } else if (type === 'IEND') {
        break;
      }
      offset += 12 + len;
    }
    if (!ihdr) return null;

    if (ihdr.colorType === 2 || (ihdr.colorType === 3 && !trns)) {
      return { ...ihdr, transparentPct: 0 };
    }

    const idatBuf = Buffer.concat(idatChunks);
    const uncompressed = zlib.inflateSync(idatBuf);
    let transparentCount = 0;
    const totalPixels = ihdr.w * ihdr.h;

    if (ihdr.colorType === 6 && ihdr.depth === 8) {
      const stride = ihdr.w * 4 + 1;
      for (let y = 0; y < ihdr.h; y++) {
        const rowOffset = y * stride + 1;
        for (let x = 0; x < ihdr.w; x++) {
          if (uncompressed[rowOffset + x * 4 + 3] < 16) transparentCount++;
        }
      }
    } else if (ihdr.colorType === 3 && ihdr.depth === 8 && trns) {
      const stride = ihdr.w + 1;
      for (let y = 0; y < ihdr.h; y++) {
        const rowOffset = y * stride + 1;
        for (let x = 0; x < ihdr.w; x++) {
          const idx = uncompressed[rowOffset + x];
          if (idx < trns.length && trns[idx] < 16) transparentCount++;
        }
      }
    }

    return { ...ihdr, transparentPct: (transparentCount / totalPixels * 100) };
  } catch (e) {
    return null;
  }
}

console.log('Scanning ffbe_asset_dump-main/battle_bg for clean landscape backgrounds...');
const files = fs.readdirSync(bgDir).filter(f => f.endsWith('.png'));

const cleanLandscapePngs = [];
for (const f of files) {
  const p = path.join(bgDir, f);
  const info = analyzePng(p);
  // Requirements: width > height, width >= 1000px, transparentPct < 15% (no sparse atlas chunking)
  if (info && info.w > info.h && info.w >= 1000 && info.transparentPct < 15) {
    cleanLandscapePngs.push({
      file: f,
      width: info.w,
      height: info.h,
      transparentPct: Number(info.transparentPct.toFixed(1)),
      sizeKb: Number((fs.statSync(p).size / 1024).toFixed(1))
    });
  }
}

cleanLandscapePngs.sort((a, b) => a.transparentPct - b.transparentPct);

console.log(`Found ${cleanLandscapePngs.length} clean landscape PNGs matching criteria (w > h, w >= 1000, transparency < 15%):`);
cleanLandscapePngs.forEach(c => {
  console.log(`  - ${c.file.padEnd(25)} [${c.width}x${c.height}] Transp: ${c.transparentPct}% (${c.sizeKb} KB)`);
});

// Pick 3 representative candidates
// 1. battle_bg_3017_01.png (1018x710, 5.3% transp) - Arena / Ruins / Shrine
// 2. battle_bg_0291_01.png (1012x780, 6.3% transp) - Town / Industrial / Street
// 3. battle_bg_2009_05.png (1018x410, 10.9% transp) - Panoramic Horizon / Scenery
const candidates = [
  cleanLandscapePngs.find(c => c.file.includes('3017_01')) || cleanLandscapePngs[0],
  cleanLandscapePngs.find(c => c.file.includes('0291_01')) || cleanLandscapePngs[1],
  cleanLandscapePngs.find(c => c.file.includes('2009_05')) || cleanLandscapePngs[2]
].filter(Boolean);

console.log('\nCopying selected preview candidates to tools/bg_preview/:');
for (const cand of candidates) {
  const src = path.join(bgDir, cand.file);
  const dst = path.join(previewDir, cand.file);
  fs.copyFileSync(src, dst);
  console.log(`  -> Copied ${cand.file} to ${previewDir}/`);
}

// Generate simple preview index
const previewManifest = {
  candidates,
  allCleanLandscapeCount: cleanLandscapePngs.length,
  timestamp: new Date().toISOString()
};
fs.writeFileSync(path.join(previewDir, 'manifest.json'), JSON.stringify(previewManifest, null, 2));
console.log('Done! Manifest saved to tools/bg_preview/manifest.json');
