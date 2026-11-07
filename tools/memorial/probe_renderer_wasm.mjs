// A bounded V8 format/startup probe, not Android or browser renderer emulation.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw Error('Usage: node probe_renderer_wasm.mjs <native.so> <tools/data/output.json>');
const target = resolve(output), within = relative(resolve('tools/data'), target);
if (within === '..' || within.startsWith('..\\') || within.startsWith('../') || isAbsolute(within)) {
  throw Error('Output must remain under tools/data');
}
const native = await readFile(input);
const hash = createHash('sha256').update(native).digest('hex');
if (hash !== '6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77') throw Error('Unexpected native image');
const control = Uint8Array.from([0,97,115,109,1,0,0,0]);
await WebAssembly.instantiate(control);
let failure;
try {
  await WebAssembly.compile(native);
  throw Error('Unexpected acceptance of ELF as Wasm');
} catch (error) {
  if (!(error instanceof WebAssembly.CompileError)) throw error;
  failure = error.message;
}
const result = {
  approved: false, runtime: process.version, nativeSha256: hash,
  validWasmControlInstantiated: true, nativeWasmValidation: WebAssembly.validate(native),
  nativeCompileError: failure,
  rendererStarted: false, renderedFrames: 0,
  boundary: 'V8 WebAssembly API rejects the actual ELF binary; no browser, translation, SDK compilation or Android emulation was attempted',
};
await mkdir(dirname(target), { recursive: true });
await writeFile(target, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
