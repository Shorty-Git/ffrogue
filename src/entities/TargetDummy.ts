import Phaser from 'phaser';
import { UnitManifest } from '../types/manifest';
import { BATTLE_ART_SCALE } from '../ui/battleLayout';

const SPRITE_SCALE = 2.5 * BATTLE_ART_SCALE;

export interface TargetDummyConfig {
  maxHp?: number;
  nameTag?: string;
  isBoss?: boolean;
}

export class TargetDummy extends Phaser.GameObjects.Container {
  public maxHp: number = 5000;
  public currentHp: number = 5000;
  public baseX: number;
  public baseY: number;
  public isDepthBoosted: boolean = false;

  public get homeY(): number {
    return this.baseY;
  }
  public nameTag: string;
  public isBoss: boolean;
  public readonly manifest: UnitManifest;

  public sprite!: Phaser.GameObjects.Sprite;
  private defeatStarted = false;
  private pointerHandlersRegistered = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    manifest: UnitManifest,
    config?: TargetDummyConfig
  ) {
    super(scene, x, y);
    this.baseX = x;
    this.baseY = y;
    this.manifest = manifest;
    this.maxHp = config?.maxHp ?? 5000;
    this.currentHp = this.maxHp;
    this.nameTag = config?.nameTag ?? 'DIRE RAT';
    this.isBoss = config?.isBoss ?? false;

    this.registerAnimations();
    this.createDummySprite();

    // Retain the generous selection area around the monster sprite.
    this.setupInteractivity();

    this.setDepth(y);
    scene.add.existing(this);
  }

  /**
   * Sets up a generous 150x205 hitbox centered around the monster and stand ellipse.
   */
  public setupInteractivity(): void {
    const hitRect = new Phaser.Geom.Rectangle(-75, -140, 150, 205);
    this.setInteractive({
      hitArea: hitRect,
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    if (this.pointerHandlersRegistered) return;
    this.pointerHandlersRegistered = true;

    this.on('pointerover', () => {
      if (this.currentHp > 0 && this.scene) {
        this.scene.input.setDefaultCursor('pointer');
      }
    });

    this.on('pointerout', () => {
      if (this.scene) {
        this.scene.input.setDefaultCursor('default');
      }
    });

    this.on('pointerdown', () => {
      if (this.currentHp > 0) {
        this.scene.events.emit('enemy_clicked', this);
      }
    });
  }

  /**
   * Returns the world Y coordinate of the top of the monster sprite.
   */
  public getTopY(): number {
    const idleMeta = this.manifest.animations['idle'];
    if (idleMeta) {
      const topOffset = idleMeta.pivotY * idleMeta.frameHeight * this.sprite.scaleY;
      return this.y - Math.round(topOffset);
    }
    return this.y - 130;
  }

  /**
   * Returns the ideal Y coordinate for the floating target marker above this monster.
   */
  public getMarkerY(): number {
    return this.getTopY() - 10;
  }

  private registerAnimations(): void {
    if (!this.manifest || !this.manifest.animations) return;

    for (const [animName, animMeta] of Object.entries(this.manifest.animations)) {
      const phaserKey = `training_dummy_${animName}`;
      if (!this.scene.anims.exists(phaserKey)) {
        this.scene.anims.create({
          key: phaserKey,
          frames: animMeta.frames.map((f) => ({
            key: phaserKey,
            frame: f.index,
            duration: f.durationMs,
          })),
          repeat: animName === 'idle' ? -1 : 0,
        });
      }
    }
  }

  private createDummySprite(): void {
    // Real authentic FFBE Training Dummy Sprite
    const idleMeta = this.manifest.animations['idle'];
    this.sprite = this.scene.add.sprite(0, 0, 'training_dummy_idle', 0);
    this.sprite.setScale(SPRITE_SCALE);

    if (idleMeta) {
      this.sprite.setOrigin(idleMeta.pivotX, idleMeta.pivotY);
    } else {
      this.sprite.setOrigin(0.5, 0.76);
    }

    if (this.scene.anims.exists('training_dummy_idle')) {
      this.sprite.play('training_dummy_idle');
    }

    this.add(this.sprite);
  }

  public setNameTag(name: string): void {
    this.nameTag = name;
  }

  public setDepthBoost(boosted: boolean, customDepth: number = 1000): void {
    this.isDepthBoosted = boosted;
    if (boosted) {
      this.setDepth(customDepth);
    } else {
      this.setDepth(this.homeY);
    }
  }

  public updateDepth(): void {
    if (!this.isDepthBoosted) {
      this.setDepth(this.y);
    }
  }

  public setBaseSlot(x: number, y: number): void {
    this.baseX = x;
    this.baseY = y;
    this.setPosition(x, y);
    this.setDepthBoost(false);
  }

  /**
   * Applies damage and displays its number; quiet presentations omit impact motion and tint.
   */
  public applyDamage(damage: number, isCritical = false, damageType: 'physical' | 'holy' = 'physical', quiet = false): void {
    if (this.currentHp <= 0) return;

    this.currentHp = Math.max(0, this.currentHp - damage);

    if (!quiet) {
      this.sprite.setTintFill(0xffffff);
      this.scene.time.delayedCall(65, () => {
        this.sprite.clearTint();
      });

      this.scene.tweens.add({
        targets: this,
        x: this.baseX - 7,
        duration: 35,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          this.x = this.baseX;
        },
      });
    }

    // 3. Floating Damage Number
    this.spawnDamagePopup(damage, isCritical, damageType);

  }

  private spawnDamagePopup(damage: number, isCritical: boolean, damageType: 'physical' | 'holy'): void {
    const startX = this.x + Phaser.Math.Between(-14, 14);
    const startY = this.y - 70;

    let color = '#ffffff';
    let stroke = '#0f172a';
    let label = damage.toLocaleString();

    if (isCritical) {
      color = '#fbbf24'; // Gold
      stroke = '#78350f';
      label += ' CRIT!';
    } else if (damageType === 'holy') {
      color = '#67e8f9'; // Bright Cyan
      stroke = '#0e7490';
    }

    const dmgText = this.scene.add.text(startX, startY, label, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: isCritical ? '26px' : '22px',
      color: color,
      fontStyle: 'bold',
      stroke: stroke,
      strokeThickness: isCritical ? 5 : 4,
    }).setOrigin(0.5).setDepth(2500).setScale(0.6);

    // Scale-Bounce: fast pop to 1.35x, then settle at 1.0x
    this.scene.tweens.add({
      targets: dmgText,
      scale: isCritical ? 1.4 : 1.25,
      duration: 80,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: dmgText,
          scale: 1.0,
          duration: 90,
          ease: 'Cubic.easeOut',
        });
      },
    });

    // Upward float and drift
    const driftX = startX + Phaser.Math.Between(-16, 16);
    this.scene.tweens.add({
      targets: dmgText,
      x: driftX,
      y: startY - 45,
      duration: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        // Fade out
        this.scene.tweens.add({
          targets: dmgText,
          alpha: 0,
          duration: 350,
          ease: 'Linear',
          onComplete: () => dmgText.destroy(),
        });
      },
    });
  }

  /**
   * Counter-attack: Dire Rat glides to target, plays 'atk' animation, triggers impact damage, and glides back.
   */
  public executeAttack(
    targetX: number,
    targetY: number,
    onImpact: () => void,
    onComplete: () => void
  ): void {
    if (this.currentHp <= 0) {
      onComplete();
      return;
    }

    this.setDepthBoost(true);
    const attackX = targetX - 85 * BATTLE_ART_SCALE;
    const attackY = targetY;

    // 1. Move to target
    this.scene.tweens.add({
      targets: this,
      x: attackX,
      y: attackY,
      duration: 320,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        // 2. Play attack animation
        if (this.scene.anims.exists('training_dummy_atk')) {
          this.sprite.play('training_dummy_atk');
        }

        // Deal impact damage on frame 1 (~130ms)
        let impactFired = false;
        const impactTimer = this.scene.time.delayedCall(130, () => {
          if (!impactFired) {
            impactFired = true;
            onImpact();
          }
        });

        // 3. Return to base slot after attack completes
        this.scene.time.delayedCall(300, () => {
          if (!impactFired) {
            impactFired = true;
            impactTimer.remove();
            onImpact();
          }

          this.scene.tweens.add({
            targets: this,
            x: this.baseX,
            y: this.baseY,
            duration: 360,
            ease: 'Cubic.easeInOut',
            onComplete: () => {
              if (this.scene.anims.exists('training_dummy_idle') && this.currentHp > 0) {
                this.sprite.play('training_dummy_idle');
              }
              this.setDepthBoost(false);
              onComplete();
            },
          });
        });
      },
    });
  }

  /**
   * Smooth defeat staging: red flash and alpha fadeout of monster sprite.
   */
  public playDefeatFade(onComplete?: () => void): void {
    if (this.defeatStarted) return;
    this.defeatStarted = true;
    this.setDepthBoost(false);
    this.disableInteractive();
    if (this.scene) {
      this.scene.input.setDefaultCursor('default');
    }

    // 1. Red impact tint
    this.sprite.setTintFill(0xef4444);

    this.scene.time.delayedCall(100, () => {
      this.sprite.clearTint();
      this.sprite.setTint(0xf87171);

      // 2. Alpha fadeout over 650ms
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        duration: 650,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          this.setVisible(false);
          if (onComplete) onComplete();
        },
      });
    });
  }

  /**
   * Smooth spawn/materialize staging for new waves (400-500ms):
   * Starts transparent at 80% of the viewport's sprite scale,
   * fades in with a slight bounce, then settles at the shared art scale,
   * white flash for 60ms, then transitions into idle.
   */
  public playSpawnAnimation(newMaxHp?: number, nameTag?: string, onComplete?: () => void): void {
    if (newMaxHp) {
      this.maxHp = newMaxHp;
    }
    if (nameTag) {
      this.setNameTag(nameTag);
    }
    this.defeatStarted = false;
    this.currentHp = this.maxHp;

    // Reset base properties & re-enable 150x205 hitbox
    this.setPosition(this.baseX, this.baseY);
    this.setVisible(true);
    this.setupInteractivity();

    // Initial state: transparent and scaled down
    this.sprite.setAlpha(0);
    this.sprite.setScale(SPRITE_SCALE * 0.8);
    this.sprite.clearTint();

    if (this.scene.anims.exists('training_dummy_idle')) {
      this.sprite.play('training_dummy_idle');
    }

    // 1. Alpha fade-in (300ms)
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 1,
      duration: 300,
      ease: 'Cubic.easeOut',
    });

    // 2. Scale bounce relative to the viewport's sprite scale.
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: SPRITE_SCALE * 1.06,
      scaleY: SPRITE_SCALE * 1.06,
      duration: 320,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Settle at the shared art scale.
        this.scene.tweens.add({
          targets: this.sprite,
          scaleX: SPRITE_SCALE,
          scaleY: SPRITE_SCALE,
          duration: 120,
          ease: 'Cubic.easeInOut',
        });

        // 3. Quick white flash (60ms)
        this.sprite.setTintFill(0xffffff);
        this.scene.time.delayedCall(60, () => {
          this.sprite.clearTint();

          // Preserve the final materialization pause before unlocking the wave.
          this.scene.time.delayedCall(180, () => onComplete?.());
        });
      },
    });
  }

  /**
   * Resets or respawns Dire Rat to full health and returns to base slot.
   */
  public resetCombat(newMaxHp?: number, nameTag?: string): void {
    if (newMaxHp) {
      this.maxHp = newMaxHp;
    }
    if (nameTag) {
      this.setNameTag(nameTag);
    }
    this.defeatStarted = false;
    this.currentHp = this.maxHp;
    this.setVisible(true);
    this.setupInteractivity();
    this.sprite.setAlpha(1);
    this.sprite.clearTint();
    this.sprite.setScale(SPRITE_SCALE);
    this.setPosition(this.baseX, this.baseY);

    if (this.scene.anims.exists('training_dummy_idle')) {
      this.sprite.play('training_dummy_idle');
    }
  }

  /**
   * Restores HP to 100%, clears the defeat state and shows a healing popup.
   */
  public healFull(): void {
    this.defeatStarted = false;
    this.currentHp = this.maxHp;
    // Green healing text popup
    const healText = this.scene.add.text(this.baseX, this.baseY - 75, '+5,000 HEAL', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '22px',
      color: '#4ade80',
      fontStyle: 'bold',
      stroke: '#064e3b',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2500).setScale(0.7);

    this.scene.tweens.add({
      targets: healText,
      scale: 1.1,
      y: this.baseY - 120,
      alpha: 0,
      duration: 750,
      ease: 'Cubic.easeOut',
      onComplete: () => healText.destroy(),
    });
  }
}
