export const SCENE_PROFILE: 'bmb-preview-scene-v1';
import type { SkillAudioSourcePlan } from '../types/skills';
export interface PreparedSceneManifest {
  schemaVersion: 1;
  profile: typeof SCENE_PROFILE;
  key: string;
  sourceId: number;
  quality: 'experimental-preview';
  originalFidelityVerified: false;
  audioSource?: SkillAudioSourcePlan;
  durationFrames: number;
  provenance: { planSha256: string; playerSha256: string; threeSha256: string };
  plan: Record<string, unknown>;
}
export function validateSceneManifest(value: unknown): PreparedSceneManifest;
export function validateSceneAction(value: unknown, action:{scope:string;moveType:string}): PreparedSceneManifest;
