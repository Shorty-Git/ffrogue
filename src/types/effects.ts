export interface EffectManifest {
  file: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameRate: number;
  originX: number;
  originY: number;
  scale: number;
  blend: 'ADD' | 'NORMAL';
  contentBounds?: { x: number; y: number; width: number; height: number };
}
