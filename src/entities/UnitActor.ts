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

  // Floating Mini-HUD above head
  private floatingHud?: Phaser.GameObjects.Container;
  private fgBar?: Phaser.GameObjects.Rectangle;
  private barWidth: number = 52;
  private barHeight: number = 5;

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

    // Create floating overhead mini-bar
    this.createFloatingHud();
  }

  protected preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.floatingHud) {
      this.floatingHud.setPosition(this.x, this.y - 105);
      this.floatingHud.setDepth(this.depth + 10);
    }
  }

  private createFloatingHud(): void {
    const hud = this.scene.add.container(this.x, this.y - 105);
    const halfWidth = this.barWidth / 2;

    // 1. Dark background with subtle border
    const bg = this.scene.add.rectangle(0, 0, this.barWidth + 4, this.barHeight + 4, 0x0f172a, 0.9);
    bg.setStrokeStyle(1, 0x334155);

    // 2. Foreground Health Fill
    this.fgBar = this.scene.add
      .rectangle(-halfWidth, 0, this.barWidth, this.barHeight, 0x22c55e)
      .setOrigin(0, 0.5);

    // 3. Mini Name Tag above bar
    const nameText = this.scene.add
      .text(0, -9, this.heroName, {
        fontFamily: 'monospace',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);

    hud.add([bg, this.fgBar, nameText]);
    this.floatingHud = hud;
  }

  public updateFloatingBar(): void {
    if (!this.fgBar || !this.floatingHud) return;

    const pct = Math.max(0, this.currentHp / this.maxHp);
    this.fgBar.width = this.barWidth * pct;

    if (pct > 0.5) {
      this.fgBar.fillColor = 0x22c55e; // Green
    } else if (pct > 0.25) {
      this.fgBar.fillColor = 0xf59e0b; // Amber
    } else {
      this.fgBar.fillColor = 0xef4444; // Red
    }
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

    // 4. Update Floating Bar
    this.updateFloatingBar();

    // 5. Check Death
    if (this.currentHp <= 0) {
      this.isDead = true;
      this.hasActed = true;
      this.playAnimation('dead');
      if (this.floatingHud) {
        this.floatingHud.setVisible(false);
      }
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
    this.updateFloatingBar();
    if (this.floatingHud) {
      this.floatingHud.setVisible(true);
    }
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
