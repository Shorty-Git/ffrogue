export const GENERATION_PROFILE: 'native-constant-activation-v1';
export const PHASE_PROFILE: 'native-node-tree-clock-v1';
export const PARTICLE_PROFILE: 'native-particle-lifecycle-v1';
export interface NativeGeneration {
  profile: typeof GENERATION_PROFILE; typeId: number; childCount: number; mode: number; enabled: boolean;
  start: number; startRange: number; count: number; duration: number; repeatCount: number; interval: number;
}
export interface ScaleModule { kind: 'OneX' | 'ConstX' | 'VelocityX'; value: number; range: number; velocity?: number; velocityRange?: number; }
export function initializeNativeScalar(module: ScaleModule, rng: NativeRandom): number[];
export function updateNativeScalar(record: number[], delta: number): number[];
export interface NativeVectorModule { arithmetic: 'captured-separate-f32'; kind: 'UVConst' | 'ColorConst' | 'TranslationVelocity'; value: number[]; range: number[];
  velocity?: number[]; velocityRange?: number[]; offset?: number[]; multiplier?: number[]; }
export function initializeNativeVector(module: NativeVectorModule, rng: NativeRandom): number[];
export function updateNativeTranslation(record: number[], delta: number, arithmetic: NativeVectorModule['arithmetic']): number[];
export function projectNativeTranslation(position: number[], parent: { basis: number[]; origin: number[] }, arithmetic: NativeVectorModule['arithmetic']): number[];
export function updateRetainedNativeRecords<T>(records: T[], delta: number, options: {
  parent: NativeParentState | null; expired: boolean; onRecord: (record: T, index: number, delta: number) => void;
}): void;
export interface ParticleOptions { profile: typeof PARTICLE_PROFILE; generation: NativeGeneration; words: number[];
  life: number; lifeRange: number; capacity: number; modules: (ScaleModule | (NativeVectorModule & { kind: 'ColorConst' }))[]; }
export interface ParticleRecord { slot: number; lifeTicks: number; ageTicks: number; moduleRecord: number[]; }
export interface ParticleState { mode: number; durationTicks: number; intervalTicks: number; remainingTicks: number;
  emitted: number; cycleEmitted: number; limit: number; delayTicks: number; }
export interface ParticleSnapshot extends ParticleState { rng: number[]; particles?: ParticleRecord[]; }
export class NativeRandom {
  constructor(words: number[]);
  words: number[]; draws: number;
  nextWord(): number;
  uniform(): number;
  snapshot(): { words: number[]; draws: number };
}
export interface NativeGeneratorRecord { index: number; parent: number | string; state: ParticleState; }
export interface NativeParentState { lifeTicks: number; ageTicks: number; }
export interface NativeBirthEvent { record: NativeGeneratorRecord; offset: number; offsetTicks: number; count: number; rng: NativeRandom; }
export interface NativeRecordPost { record: NativeGeneratorRecord; activeTicks: number; rng: NativeRandom; }
export function nativeParentActive(parent: NativeParentState | null): boolean;
export function advanceNativeJoint(joint: NativeParentState, delta: number, parent: NativeParentState | null): NativeParentState;
export class NativeGeneratorOwner {
  constructor(words: number[], options?: { capacity?: number });
  rng: NativeRandom; capacity: number; records: NativeGeneratorRecord[];
  activate(generation: NativeGeneration, parent: number | string): {
    activation: { active: boolean }; state: ParticleState; record: NativeGeneratorRecord | null;
  };
  update(delta: number, options: { parentState: (id: number | string) => NativeParentState | null; onBirth: (event: NativeBirthEvent) => void }): ReturnType<NativeGeneratorOwner['snapshot']>;
  post(delta: number, options: { parentState: (id: number | string) => NativeParentState | null; onRecord: (event: NativeRecordPost) => void }): ReturnType<NativeGeneratorOwner['snapshot']>;
  snapshot(): { rng: { words: number[]; draws: number }; records: NativeGeneratorRecord[] };
}
export class NativeParticleEmitter {
  constructor(options: ParticleOptions);
  owner: NativeGeneratorOwner; rng: NativeRandom;
  active: boolean; state: ParticleState; particles: ParticleRecord[]; expired: boolean; currentStep: number;
  color(particle: ParticleRecord): number[] | null;
  initial: ParticleSnapshot;
  snapshot(includeParticles?: boolean): ParticleSnapshot;
  update(delta: number, options?: { suspended?: boolean }): ParticleSnapshot;
  post(delta: number, options?: { suspended?: boolean }): ParticleSnapshot;
  step(delta: number, options?: { suspended?: boolean }): ParticleSnapshot;
}
export interface PhaseEvent { node: number; phase: 'update' | 'post'; delta: number; suspended: number; zero: number; phaseFlag: number; }
export interface PhaseOptions { profile: typeof PHASE_PROFILE; nodeCount?: number; lifeTicks?: number; ageTicks?: number;
  continueFlag?: boolean; loop?: boolean; rootDisabled?: boolean; paused?: boolean; auxiliary?: boolean; contextAuxiliary?: boolean;
  fullSort?: boolean; countA?: number; countB?: number; initialAge?: number; splitInitial?: boolean; }
export class NativePhaseClock {
  constructor(options: PhaseOptions);
  step(delta: number, options?: { call?: 'update' | 'post'; post?: boolean; onPhase?: (event: PhaseEvent) => void }): { events: PhaseEvent[] };
}
export interface ScalarAlphaKey { frame: number; value: number; slopeLeft: number; slopeRight: number;
  type: 'Constant' | 'Linear' | 'Spline' | 'BreakSpline'; }
export function nativeScalarAlpha(keys: ScalarAlphaKey[], time: number, arithmetic?: 'captured-separate-f32'): number;
