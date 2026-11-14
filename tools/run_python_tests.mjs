// Runs every tools/test_*.py with PYTHONPATH=tools and reports failures (npm run test:py).
// Python: FFROGUE_PYTHON or --python <exe> (Pillow and NumPy required, see docs/current-state.md).
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const i = process.argv.indexOf('--python');
const python = i > 0 ? process.argv[i + 1] : process.env.FFROGUE_PYTHON ?? 'python';
const tests = fs.readdirSync('tools').filter(f => /^test_.*\.py$/.test(f)).sort();
const failed = [];
for (const test of tests) {
  const result = spawnSync(python, [`tools/${test}`], {env: {...process.env, PYTHONPATH: 'tools'}, encoding: 'utf8'});
  const ran = /Ran (\d+) test/.exec(result.stderr)?.[1];
  // A file without a unittest.main() call runs nothing and must not count as passing.
  if (result.status !== 0 || !ran || ran === '0') failed.push(test);
  console.log(`${result.status === 0 && ran && ran !== '0' ? 'ok  ' : 'FAIL'} ${test}${ran ? ` (${ran})` : ' (no tests ran)'}`);
  if (result.status !== 0) console.log(result.stderr.trim().split('\n').slice(-5).join('\n'));
}
console.log(`${tests.length - failed.length}/${tests.length} Python test files passed`);
if (failed.length) process.exit(1);
