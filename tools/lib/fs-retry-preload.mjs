// Preload for pipeline processes (node --import ./tools/lib/fs-retry-preload.mjs): wraps the
// synchronous fs calls the importers use for shared JSON registries with withFileRetry, so a brief
// Windows lock (Defender/indexer: errno -4094 UNKNOWN, EBUSY, EPERM) no longer aborts a character in
// the middle of a wave. The wave runner sets it through NODE_OPTIONS, so every child node inherits it.
import fs from 'node:fs';
import {withFileRetry} from './fs-retry.mjs';

for (const name of ['writeFileSync', 'readFileSync', 'copyFileSync', 'renameSync', 'openSync', 'rmSync', 'unlinkSync']) {
  const original = fs[name];
  fs[name] = (...args) => withFileRetry(() => original.apply(fs, args));
}
