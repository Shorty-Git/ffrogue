import type { NativeRandom } from './nativeLifecycle.mjs';
export interface NativeLocalTransform { rotation: number[]; scale: number[]; translation: number[]; }
export interface NativeParentTransform { basis: number[]; origin: number[]; }
export interface NativeTransformState extends NativeParentTransform { scale: number[]; quaternion: number[]; }
export interface NativeConstTransformProgram {
  profile: 'null-const-transform-v1'; arithmetic: 'captured-separate-f32';
  scale: { kind: 'ConstX'; value: number; range: number };
  rotation: { value: number[]; range: number[] };
  translation: 'Zero'; color: { value: number[]; range: number[] };
}
export function initializeNativeConstTransform(program: NativeConstTransformProgram, rng: NativeRandom): NativeLocalTransform & { color: number[] };
export function nativeDefaultTransform(local: NativeLocalTransform, parent: NativeParentTransform,
  arithmetic: 'captured-separate-f32'): NativeTransformState;
export function nativeParticleXMakeInputs(input: { scalar: number; center: number[]; groupScale: number[]; rotationMode: 'Absent' }): {
  center: number[]; localScale: number[]; groupScale: number[]; rotation: number[];
};
