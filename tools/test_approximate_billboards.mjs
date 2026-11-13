import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {approximateParticleDisplay, approximateBillboardDisplay} from '../src/effects/originalEffectPlayer.mjs';

const runtime = vm.createContext({console});
vm.runInContext(fs.readFileSync('public/vendor/three-preview.js', 'utf8'), runtime);
const THREE = runtime.THREE;
const world = (position, degrees, scale) => new THREE.Matrix4().compose(new THREE.Vector3(...position),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(...degrees.map(v => v * Math.PI / 180))), new THREE.Vector3(...scale));
const corner = (matrix, x, y) => Array.from(new THREE.Vector3(x, y, 0).applyMatrix4(matrix).toArray(), v => Math.round(v * 1e6) / 1e6 + 0);

test('a Particle is a view-aligned quad of radius one at its hierarchy position', () => {
  // Scale 10 x 4, tilted 70 degrees about X: the legacy plane would be nearly edge-on.
  const display = approximateParticleDisplay(THREE, world([5, -3, 2], [70, 0, 0], [10, 4, 1]));
  assert.deepEqual(corner(display, .5, .5), [15, 1, 2]);     // half-width 10, half-height 4, facing the camera
  assert.deepEqual(corner(display, -.5, -.5), [-5, -7, 2]);
});

test('roll follows the in-plane direction of the world X axis; a degenerate transform draws nothing', () => {
  const display = approximateParticleDisplay(THREE, world([0, 0, 0], [0, 0, 90], [3, 1, 1]));
  assert.deepEqual(corner(display, .5, 0), [0, 3, 0]);        // the X edge points up after a quarter turn
  assert.equal(approximateParticleDisplay(THREE, world([0, 0, 0], [0, 0, 0], [0, 1, 1])), null);
  // X axis pointing at the viewer: no in-plane direction, the quad stays unrolled.
  assert.deepEqual(corner(approximateParticleDisplay(THREE, world([0, 0, 0], [0, 90, 0], [2, 1, 1])), .5, 0), [2, 0, 0]);
});

test('a Billboard Quad or Model keeps its scale (unit plane, no radius factor) and drops X/Y tilt', () => {
  const display = approximateBillboardDisplay(THREE, world([1, 2, 0], [60, 0, 0], [10, 4, 2]));
  assert.deepEqual(corner(display, .5, .5), [6, 4, 0]);
  assert.equal(approximateBillboardDisplay(THREE, world([0, 0, 0], [0, 0, 0], [1, 0, 1])), null);
});
