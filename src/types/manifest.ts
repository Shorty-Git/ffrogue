export interface FrameMeta {
  index: number;
  delayTicks: number;
  durationMs: number;
}

export interface AnimationMeta {
  file: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  pivotX: number;
  pivotY: number;
  recoilOffsetX?: number;
  frames: FrameMeta[];
}

export interface UnitManifest {
  unitId: string;
  name: string;
  type?: 'character' | 'monster';
  animations: Record<string, AnimationMeta>;
}
