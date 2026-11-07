import { NativeParticleEmitter, nativeScalarAlpha } from './nativeLifecycle.mjs';
import type { ParticleOptions, ScalarAlphaKey } from './nativeLifecycle.mjs';

/** Compiled, neutral-parent Basic material profile; no raw BMB interpretation. */
export interface PreparedParticleProgram {
  profile: 'native-particle-basic-v1';
  clock: 'fixed-60hz-neutral-root-v1';
  frameBudget: number;
  groupScaleX: number;
  pixelsPerUnit: number;
  alphaKeys: ScalarAlphaKey[];
  simulation: ParticleOptions;
}

export function validateParticleProgram(value: unknown): asserts value is PreparedParticleProgram {
  if (!value || typeof value !== 'object') throw Error('Prepared particle program required');
  const object = value as Record<string, unknown>;
  const allowed = ['profile', 'clock', 'frameBudget', 'groupScaleX', 'pixelsPerUnit', 'alphaKeys', 'simulation'];
  if (Object.keys(object).some(key => !allowed.includes(key))) throw Error('Unknown particle program field');
  const program = value as PreparedParticleProgram;
  if (program.profile !== 'native-particle-basic-v1' || program.clock !== 'fixed-60hz-neutral-root-v1'
      || !Number.isInteger(program.frameBudget) || program.frameBudget < 1 || program.frameBudget > 600
      || ![program.groupScaleX, program.pixelsPerUnit].every(v => Number.isFinite(v) && v > 0 && v <= 10000)
      || !Array.isArray(program.alphaKeys) || program.alphaKeys.length > 256) throw Error('Unsupported prepared particle profile');
  nativeScalarAlpha(program.alphaKeys, 0);
  new NativeParticleEmitter(program.simulation);
  const input = program.simulation, g = input.generation;
  const fields = (object: object, allowed: string[]) => {
    if (Object.keys(object).some(key => !allowed.includes(key))) throw Error('Unadmitted particle simulation field');
  };
  fields(input, ['profile', 'generation', 'words', 'life', 'lifeRange', 'capacity', 'modules']);
  fields(g, ['profile', 'typeId', 'childCount', 'mode', 'enabled', 'start', 'startRange', 'count', 'duration', 'repeatCount', 'interval']);
  for (const module of input.modules) fields(module, module.kind === 'ColorConst'
    ? ['kind', 'value', 'range', 'arithmetic'] : module.kind === 'VelocityX'
    ? ['kind', 'value', 'range', 'velocity', 'velocityRange'] : ['kind', 'value', 'range']);
  if (!Number.isInteger(g.interval * 4)) throw Error('Non-quarter-grid generation requires an additional timing reference');
  const minimum = g.start + g.startRange + g.duration + Math.max(1, input.life + input.lifeRange) + 2;
  if (program.frameBudget < minimum || minimum > 600) throw Error('Particle budget omits possible lifetime');
}

