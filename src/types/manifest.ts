export interface FrameMeta {
  index: number;
  delayTicks: number;
  durationMs: number;
}

export interface AnimationMeta {
  file: string;
  bodyLayers?: {normal: string; emission: string};
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  pivotX: number;
  pivotY: number;
  recoilOffsetX?: number;
  /** Horizontal body extent [left, right] in frame pixels relative to the pivot (Limit clips). */
  extentX?: [number, number];
  frames: FrameMeta[];
}

export interface UnitManifest {
  /** Prepared texture/animation namespace; independent of character identity. */
  assetKey?: string;
  unitId: string;
  name: string;
  type?: 'character' | 'monster';
  animations: Record<string, AnimationMeta>;
}
