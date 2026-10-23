/** Screen-space artwork rotation; moving bounds keep their original trajectory. */
export function artworkTransform(pixels, width, height, degrees, pivotMode, originX = .5, originY = .5) {
  if (!Number.isFinite(degrees) || !['origin', 'visible-bounds', 'bright-body'].includes(pivotMode)) throw Error('Invalid artwork transform');
  let x = width * originX, y = height * originY;
  if (pivotMode !== 'origin') {
    let left = width, top = height, right = -1, bottom = -1;
    for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
      const i = (py * width + px) * 4;
      if (pixels[i + 3] > 12 && Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 12) {
        left = Math.min(left, px); right = Math.max(right, px);
        top = Math.min(top, py); bottom = Math.max(bottom, py);
      }
    }
    if (right >= left) { x = (left + right + 1) / 2; y = (top + bottom + 1) / 2; }
    if (pivotMode === 'bright-body') {
      const seen = new Uint8Array(width * height), queue = new Int32Array(width * height);
      let largest = 0;
      for (let start = 0; start < seen.length; start++) {
        const i = start * 4;
        if (seen[start] || pixels[i + 3] <= 12 || Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) <= 80) continue;
        let head = 0, tail = 1, l = width, t = height, r = -1, b = -1;
        queue[0] = start; seen[start] = 1;
        while (head < tail) {
          const n = queue[head++], px = n % width, py = Math.floor(n / width);
          l = Math.min(l, px); r = Math.max(r, px); t = Math.min(t, py); b = Math.max(b, py);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx, ny = py + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const next = ny * width + nx, j = next * 4;
            if (seen[next] || pixels[j + 3] <= 12 || Math.max(pixels[j], pixels[j + 1], pixels[j + 2]) <= 80) continue;
            seen[next] = 1; queue[tail++] = next;
          }
        }
        if (tail > largest) { largest = tail; x = (l + r + 1) / 2; y = (t + b + 1) / 2; }
      }
    }
  }
  return { x, y, radians: degrees * Math.PI / 180 };
}
