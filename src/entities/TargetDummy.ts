import type { EnemyStatusEffect } from '../types/skills';
import { statusDamageMultiplier } from '../effects/enemyStatus.mjs';
import Phaser from 'phaser';
import { UnitManifest } from '../types/manifest';
import { BATTLE_ART_SCALE } from '../ui/battleLayout';
import type {EnemyDefinition} from '../run/stageContent.mjs';

const SPRITE_SCALE = 2.5 * BATTLE_ART_SCALE;
const SPAWN_SCALE={start:.8,target:1.06,backOvershoot:1.70158};
// Phaser Back.Out's derivative reaches its maximum at -2s/(3(s+1)).
// Include its actual overshoot above the tween target, not an arbitrary safety scale.
const s=SPAWN_SCALE.backOvershoot;
export const ENEMY_SPAWN_MAX_SCALE=SPAWN_SCALE.start+(SPAWN_SCALE.target-SPAWN_SCALE.start)*(1+4*s*s*s/(27*(s+1)*(s+1)));

/** Preserve the formation anchor/pivots; fit every supported body clip inside the arena. */
export function fitPreparedEnemyScale(manifest:UnitManifest,desired:number,x:number,y:number,bounds:{left:number;right:number;top:number;bottom:number}):number {
  const clips=Object.values(manifest.animations);
  const extents=[Math.max(...clips.map(a=>a.pivotX*a.frameWidth)),Math.max(...clips.map(a=>(1-a.pivotX)*a.frameWidth)),
    Math.max(...clips.map(a=>a.pivotY*a.frameHeight)),Math.max(...clips.map(a=>(1-a.pivotY)*a.frameHeight))];
  const available=[x-bounds.left,bounds.right-x,y-bounds.top,bounds.bottom-y];
  if(desired<=0||!Number.isFinite(desired)||available.some(v=>v<=0))throw Error('Invalid enemy placement');
  // Include the existing materialization bounce, not only the settled body.
  return Math.min(desired,...extents.map((e,i)=>e>0?available[i]/(e*ENEMY_SPAWN_MAX_SCALE):desired));
}

export interface TargetDummyConfig {
  maxHp?: number;
  nameTag?: string;
  isBoss?: boolean;
  assetKey?: string;
  scale?: number;
  attack?: EnemyDefinition['attack'];
  bounds?: {left:number;right:number;top:number;bottom:number};
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
  public statusEffects: EnemyStatusEffect[] = [];
  public nameTag: string;
  public isBoss: boolean;
  public readonly manifest: UnitManifest;
  public readonly assetKey: string;
  public actionCursor = 0;
  private readonly resourceScale: number;
  private readonly attackProfile?: EnemyDefinition['attack'];

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
    this.assetKey = config?.assetKey ?? 'training_dummy';
    this.resourceScale = config?.bounds?fitPreparedEnemyScale(manifest,config.scale??SPRITE_SCALE,x,y,config.bounds):config?.scale??SPRITE_SCALE;
    this.attackProfile = config?.attack;
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


  private registerAnimations(): void {
    if (!this.manifest || !this.manifest.animations) return;

    for (const [animName, animMeta] of Object.entries(this.manifest.animations)) {
      const phaserKey = `${this.assetKey}_${animName}`;
      if(!this.scene.textures.exists(phaserKey))continue;
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
    this.sprite = this.scene.add.sprite(0, 0, `${this.assetKey}_idle`, 0);
    this.sprite.setScale(this.resourceScale);

    if (idleMeta) {
      this.sprite.setOrigin(idleMeta.pivotX, idleMeta.pivotY);
    } else {
      this.sprite.setOrigin(0.5, 0.76);
    }

    if (this.scene.anims.exists(`${this.assetKey}_idle`)) {
      this.sprite.play(`${this.assetKey}_idle`);
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
  public applyDamage(damage: number, isCritical = false, damageType: 'physical' | 'holy' | 'unmitigated' = 'physical', quiet = false): void {
    if (this.currentHp <= 0) return;

    damage = Math.round(damage * statusDamageMultiplier(this.statusEffects, damageType));
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

  private spawnDamagePopup(damage: number, isCritical: boolean, damageType: 'physical' | 'holy' | 'unmitigated'): void {
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

    if (this.attackProfile) {
      this.executePreparedAttack(targetX, targetY, onImpact, onComplete);
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

  /** Reviewed FFRogue attack timing over a real prepared body, not original AI/VFX. */
  private executePreparedAttack(targetX:number,targetY:number,onImpact:()=>void,onComplete:()=>void):void {
    const profile=this.attackProfile!,meta=this.manifest.animations[profile.clip];
    if(!meta||!meta.frames[profile.impactFrame])throw Error('Unsupported prepared enemy attack');
    const play=(clip:string)=>{const a=this.manifest.animations[clip];this.sprite.setOrigin(a.pivotX,a.pivotY);this.sprite.play(`${this.assetKey}_${clip}`);};
    const finish=()=>{if(this.currentHp>0)play('idle');this.setDepthBoost(false);onComplete();};
    const strike=()=>{
      play(profile.clip);
      const impact=meta.frames.slice(0,profile.impactFrame).reduce((n,f)=>n+f.durationMs,0);
      const duration=meta.frames.reduce((n,f)=>n+f.durationMs,0);
      this.scene.time.delayedCall(impact,()=>{if(this.currentHp>0)onImpact();});
      this.scene.time.delayedCall(duration,()=>{
        if(profile.movement==='stationary'){finish();return;}
        this.scene.tweens.add({targets:this,x:this.baseX,y:this.baseY,duration:360,ease:'Cubic.easeInOut',onComplete:finish});
      });
    };
    this.setDepthBoost(true);
    if(profile.movement==='stationary'){strike();return;}
    this.scene.tweens.add({targets:this,x:targetX-85*BATTLE_ART_SCALE,y:targetY,duration:320,ease:'Cubic.easeInOut',onComplete:strike});
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
      this.scene.events.emit('enemy-dissolve',this);
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
    this.actionCursor = 0;
    this.statusEffects = [];
    this.currentHp = this.maxHp;

    // Reset base properties & re-enable 150x205 hitbox
    this.setPosition(this.baseX, this.baseY);
    this.setVisible(true);
    this.setupInteractivity();

    // Initial state: transparent and scaled down
    this.sprite.setAlpha(0);
    this.sprite.setScale(this.resourceScale * SPAWN_SCALE.start);
    this.sprite.clearTint();

    if (this.scene.anims.exists(`${this.assetKey}_idle`)) {
      const idle=this.manifest.animations.idle;this.sprite.setOrigin(idle.pivotX,idle.pivotY);
      this.sprite.play(`${this.assetKey}_idle`);
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
      scaleX: this.resourceScale * SPAWN_SCALE.target,
      scaleY: this.resourceScale * SPAWN_SCALE.target,
      duration: 320,
      ease: 'Back.easeOut',
      easeParams: [SPAWN_SCALE.backOvershoot],
      onComplete: () => {
        // Settle at the shared art scale.
        this.scene.tweens.add({
          targets: this.sprite,
          scaleX: this.resourceScale,
          scaleY: this.resourceScale,
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
}
