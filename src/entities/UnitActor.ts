import Phaser from 'phaser';
import { UnitManifest } from '../types/manifest';

export interface UnitCombatConfig {
  attackType: 'melee' | 'ranged';
  targetOffsetX: number;
  attackAnim: string;
  hitFrameIndex: number;
}

export class UnitActor extends Phaser.GameObjects.Sprite {
  public readonly unitKey: string;
  public readonly manifest: UnitManifest;
  public currentAnimKey: string = '';
  public homeSlot: { x: number; y: number };
  public combatConfig: UnitCombatConfig;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    unitKey: string,
    manifest: UnitManifest,
    combatConfig?: Partial<UnitCombatConfig>
  ) {
    // Start with the idle spritesheet frame 0 as initial texture
    super(scene, x, y, `${unitKey}_idle`, 0);
    this.unitKey = unitKey;
    this.manifest = manifest;
    this.homeSlot = { x, y };

    this.combatConfig = {
      attackType: combatConfig?.attackType ?? 'melee',
      targetOffsetX: combatConfig?.targetOffsetX ?? 90,
      attackAnim: combatConfig?.attackAnim ?? 'atk',
      hitFrameIndex: combatConfig?.hitFrameIndex ?? 2,
    };

    this.registerAnimations();

    // Default to idle animation
    this.playAnimation('idle');
    this.updateDepth();
    scene.add.existing(this);
  }

  /**
   * Updates sprite depth based on current Y coordinate for dynamic sorting.
   */
  public updateDepth(): void {
    this.setDepth(this.y);
  }

  /**
   * Sets the unit's logical home slot position.
   */
  public setHomeSlot(x: number, y: number): void {
    this.homeSlot = { x, y };
    this.setPosition(x, y);
    this.updateDepth();
  }

  /**
   * Registers all animations in the manifest with Phaser's global animation manager
   * using exact per-frame durations in milliseconds.
   */
  public registerAnimations(): void {
    for (const [animName, animMeta] of Object.entries(this.manifest.animations)) {
      const phaserKey = `${this.unitKey}_${animName}`;
      if (!this.scene.anims.exists(phaserKey)) {
        this.scene.anims.create({
          key: phaserKey,
          frames: animMeta.frames.map((f) => ({
            key: phaserKey,
            frame: f.index,
            duration: f.durationMs,
          })),
          repeat: animName === 'idle' || animName === 'move' ? -1 : 0,
        });
      }
    }
  }

  /**
   * Plays the requested animation and dynamically updates the origin (pivot)
   * so that the unit's logical feet stay at the exact same world coordinate.
   */
  public playAnimation(animName: string, ignoreIfPlaying = false): this {
    const animMeta = this.manifest.animations[animName];
    if (!animMeta) {
      console.warn(`[UnitActor] Animation '${animName}' not found in manifest for ${this.unitKey}`);
      return this;
    }

    this.currentAnimKey = animName;

    // Apply calculated anchor
    const pivotX = this.flipX ? 1.0 - animMeta.pivotX : animMeta.pivotX;
    const pivotY = animMeta.pivotY;
    this.setOrigin(pivotX, pivotY);

    const phaserKey = `${this.unitKey}_${animName}`;
    this.play(phaserKey, ignoreIfPlaying);
    return this;
  }

  /**
   * Horizontally flips the actor and recalculates the origin for the active animation.
   */
  public setFacingLeft(facingLeft: boolean): this {
    // In FFBE, characters naturally face left in their raw sprites.
    // So facingLeft = true means flipX = false.
    this.setFlipX(!facingLeft);

    if (this.currentAnimKey && this.manifest.animations[this.currentAnimKey]) {
      const animMeta = this.manifest.animations[this.currentAnimKey];
      const pivotX = this.flipX ? 1.0 - animMeta.pivotX : animMeta.pivotX;
      this.setOrigin(pivotX, animMeta.pivotY);
    }
    return this;
  }
}
