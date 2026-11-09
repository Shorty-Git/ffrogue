// Windows file writes can fail briefly while another process (Defender, the indexer, a dev-server
// watcher) holds the file open: EBUSY, EPERM or errno -4094 (UNKNOWN) on open. Shared registry files
// such as public/assets/icons/skills/index.json are rewritten by every character import, so a wave
// hit this a few times per run. Retry with a short synchronous back-off before giving up.
import fs from 'node:fs';

const TRANSIENT = new Set(['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN']);
const pause = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

export function withFileRetry(action, attempts = 8) {
  for (let attempt = 1; ; attempt++) {
    try { return action(); }
    catch (error) {
      if (attempt >= attempts || !TRANSIENT.has(error.code)) throw error;
      pause(50 * 2 ** Math.min(attempt, 5));
    }
  }
}

export const writeFileRetry = (file, data, options) => withFileRetry(() => fs.writeFileSync(file, data, options));
export const readFileRetry = (file, options) => withFileRetry(() => fs.readFileSync(file, options));
