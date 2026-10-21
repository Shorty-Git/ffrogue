import Phaser from 'phaser';
import { UnitManifest } from '../types/manifest';

export interface UnitCombatConfig {
  attackType: 'melee' | 'ranged';
  targetOffsetX: number;
  attackAnim: string;
  hitFrameIndex: number;
}

export interface UnitActorConfig extends Partial<UnitCombatConfig> {
  maxHp?: number;
  heroName?: string;
  heroRole?: string;
}

export class UnitActor extends Phaser.GameObjects.Sprite {
  public readonly unitKey: string;
  public readonly manifest: UnitManifest;
  public currentAnimKey: string = '';
  public homeSlot: { x: number; y: number };
  public combatConfig: UnitCombatConfig;

  // RPG Combat Attributes
  public maxHp: number;
  public currentHp: number;
  public heroName: string;
  public heroRole: string;
  public isDead: boolean = false;
  public hasActed: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    unitKey: string,
    manifest: UnitManifest,
    config?: UnitActorConfig
  ) {
    // Start with the idle spritesheet frame 0 as initial texture
    super(scene, x, y, `${unitKey}_idle`, 0);
    this.unitKey = unitKey;
    this.manifest = manifest;
    this.homeSlot = { x, y };

    this.maxHp = config?.maxHp ?? 3000;
    this.currentHp = this.maxHp;
    this.heroName = config?.heroName ?? unitKey.toUpperCase();
    this.heroRole = config?.heroRole ?? 'HERO';

    this.combatConfig = {
      attackType: config?.attackType ?? 'melee',
      targetOffsetX: config?.targetOffsetX ?? 90,
      attackAnim: config?.attackAnim ?? 'atk',
      hitFrameIndex: config?.hitFrameIndex ?? 2,
    };

    this.registerAnimations();

    // Default to idle animation
    this.playAnimation('idle');
    this.updateDepth();
    scene.add.existing(this);
  }

  /**
   * Applies damage to this hero with white flash, horizontal shake, floating red number,
   * and transitions to 'dead' animation if HP drops to 0.
   */
  public applyDamage(damage: number): void {
    if (this.isDead) return;

    this.currentHp = Math.max(0, this.currentHp - damage);

    // 1. White impact flash (65ms)
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(65, () => {
      this.clearTint();
    });

    // 2. Impact Shake
    const origX = this.homeSlot.x;
    this.scene.tweens.add({
      targets: this,
      x: this.x - 7,
      duration: 35,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.x = origX;
      },
    });

    // 3. Floating Damage Popup
    this.spawnDamagePopup(damage);

    // 4. Check Death
    if (this.currentHp <= 0) {
      this.isDead = true;
      this.hasActed = true;
      this.playAnimation('dead');
    }
  }

  private spawnDamagePopup(damage: number): void {
    const px = this.x + Phaser.Math.Between(-10, 10);
    const py = this.y - 70;

    const popup = this.scene.add.text(px, py, `-${damage}`, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#f87171',
      stroke: '#450a0a',
      strokeThickness: 3,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    popup.setDepth(1600);
    popup.setScale(0.7);

    // Pop & bounce upward
    this.scene.tweens.add({
      targets: popup,
      scaleX: 1.15,
      scaleY: 1.15,
      y: py - 35,
      duration: 220,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: popup,
          y: py - 60,
          alpha: 0,
          scaleX: 0.9,
          scaleY: 0.9,
          duration: 550,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            popup.destroy();
          },
        });
      },
    });
  }

  /**
   * Resets unit to full HP, alive state, and idle animation.
   */
  public resetCombatState(): void {
    this.currentHp = this.maxHp;
    this.isDead = false;
    this.hasActed = false;
    this.clearTint();
    this.setPosition(this.homeSlot.x, this.homeSlot.y);
    this.setFacingLeft(true);
    this.playAnimation('idle');
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
          repeat: animName === 'idle' || animName === 'move' || animName === 'win' ? -1 : 0,
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

  /**
   * Concludes an attack animation and transitions back to 'idle'.
   * 
   * Strict condition check:
   * 1. The action was stationary (attackType === 'ranged').
   * 2. The finished animation has a measurable foot offset (recoilOffsetX > 3 pixels).
   * 
   * If BOTH conditions are met (e.g. Barret's Gatling stance):
   * Temporarily offsets the sprite's x position by the recoil amount so the switch
   * to 'idle' has 0 visual jump, then executes a 150ms ease-out tween back to homeSlot.
   * 
   * In all other cases (Cloud melee, Aerith magic, zero-offset animations):
   * Instantly transitions to 'idle' with zero delay or movement.
   */
  public returnToIdle(onComplete?: () => void): void {
    const isStationary = this.combatConfig.attackType === 'ranged';
    const animMeta = this.manifest.animations[this.currentAnimKey];
    const recoilOffsetX = animMeta?.recoilOffsetX ?? 0;
    const hasMeasurableRecoil = recoilOffsetX > 3;

    if (isStationary && hasMeasurableRecoil) {
      // Facing left (flipX = false) means forward is -X towards enemy.
      const direction = this.flipX ? 1 : -1;
      const screenOffset = direction * recoilOffsetX * Math.abs(this.scaleX);

      this.x = this.homeSlot.x + screenOffset;
      this.y = this.homeSlot.y;
      this.playAnimation('idle');

      this.scene.tweens.add({
        targets: this,
        x: this.homeSlot.x,
        duration: 150,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.x = this.homeSlot.x;
          this.updateDepth();
          onComplete?.();
        },
      });
    } else {
      this.setPosition(this.homeSlot.x, this.homeSlot.y);
      this.playAnimation('idle');
      this.updateDepth();
      onComplete?.();
    }
  }
}
