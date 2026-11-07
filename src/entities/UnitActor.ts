import Phaser from 'phaser';
import { UnitManifest } from '../types/manifest';
import { MotionType, ActiveHeroBuff } from '../types/skills';

export interface UnitCombatConfig {
  attackType: 'melee' | 'ranged';
  targetOffsetX: number;
  attackAnim: MotionType;
  hitFrameIndex: number;
}

export interface UnitActorConfig extends Partial<UnitCombatConfig> {
  maxHp?: number;
  maxMp?: number;
  heroName?: string;
  heroRole?: string;
}

export class UnitActor extends Phaser.GameObjects.Sprite {
  public static readonly LOW_HP_RATIO = 0.25;
  private victoryComplete?: () => void;
  public readonly unitKey: string;
  public readonly manifest: UnitManifest;
  public get visualKey():string { return this.manifest.assetKey??this.unitKey; }
  public currentAnimKey: string = '';
  public homeSlot: { x: number; y: number };
  public combatConfig: UnitCombatConfig;
  public isDepthBoosted: boolean = false;

  public get homeY(): number {
    return this.homeSlot.y;
  }

  // RPG Combat Attributes
  public maxHp: number;
  public currentHp: number;
  public maxMp: number;
  public currentMp: number;
  /** Limit Burst gauge (src/run/limitGauge.mjs); restored from the run at battle start. */
  public limitGauge = 0;
  public heroName: string;
  public heroRole: string;
  public get isDead(): boolean {
    return this.currentHp <= 0;
  }
  public hasActed: boolean = false;
  public sourceBuffs: ActiveHeroBuff[] = [];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    unitKey: string,
    manifest: UnitManifest,
    config?: UnitActorConfig
  ) {
    // Start with the idle spritesheet frame 0 as initial texture
    super(scene, x, y, `${manifest.assetKey??unitKey}_idle`, 0);
    this.unitKey = unitKey;
    this.manifest = manifest;
    this.homeSlot = { x, y };

    this.maxHp = config?.maxHp ?? 3000;
    this.currentHp = this.maxHp;
    this.maxMp = config?.maxMp ?? 100;
    this.currentMp = this.maxMp;
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
    if (scene.game.renderer.type === Phaser.WEBGL && Object.values(manifest.animations).some(clip => clip.bodyLayers)) {
      const emission = scene.add.image(x, y, '__DEFAULT').setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
      const sync = () => {
        const texture = this.texture.key + '_emission';
        if (!this.visible || this.alpha === 0 || !scene.textures.exists(texture)) {
          emission.setVisible(false);
          return;
        }
        emission.setTexture(texture, this.frame.name).setVisible(true)
          .setPosition(this.x, this.y).setOrigin(this.originX, this.originY)
          .setFlip(this.flipX, this.flipY).setScale(this.scaleX, this.scaleY)
          .setRotation(this.rotation).setAlpha(this.alpha).setDepth(this.depth + .001)
          .setScrollFactor(this.scrollFactorX, this.scrollFactorY);
      };
      scene.events.on(Phaser.Scenes.Events.POST_UPDATE, sync);
      this.once(Phaser.GameObjects.Events.DESTROY, () => {
        scene.events.off(Phaser.Scenes.Events.POST_UPDATE, sync);
        if (emission.scene) emission.destroy();
      });
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

    // 4. Check Death
    if (this.currentHp <= 0) {
      this.hasActed = true;
      this.playAnimation('dead');
    } else {
      this.refreshRestPose();
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
   * Spends MP if sufficient amount is available.
   * Returns true if successful, false if insufficient.
   */
  public useMp(cost: number): boolean {
    if (!Number.isFinite(cost) || cost < 0) return false;
    if (this.currentMp < cost) return false;
    this.currentMp -= cost;
    return true;
  }

  /** A reviewed skill cost cannot K.O. its caster or behave as incoming damage. */
  public spendHp(cost: number): boolean {
    if (!Number.isInteger(cost) || cost < 1 || this.isDead || this.currentHp <= cost) return false;
    this.currentHp -= cost;
    this.refreshRestPose();
    return true;
  }

  /**
   * Auto-revive (Reraise-style status): a K.O. hero stands up with `hp` HP.
   * The state changes at once; the rest pose follows after the death frame is visible.
   */
  public revive(hp: number): number {
    if (!this.isDead || !Number.isFinite(hp) || hp < 1) return 0;
    this.currentHp = Math.min(this.maxHp, Math.round(hp));
    this.spawnHealPopup(this.currentHp);
    this.scene.time.delayedCall(450, () => {
      if (!this.isDead && this.currentAnimKey === 'dead') this.playRestPose();
    });
    return this.currentHp;
  }

  /**
   * Restores HP up to maxHp and displays a green floating popup.
   * Returns the actual amount healed.
   */
  public restoreHp(amount: number): number {
    if (this.isDead || amount <= 0) return 0;
    const prevHp = this.currentHp;
    this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
    const actualHealed = this.currentHp - prevHp;

    if (actualHealed > 0) {
      this.setTintFill(0x4ade80);
      this.scene.time.delayedCall(90, () => {
        this.clearTint();
      });
      this.spawnHealPopup(actualHealed);
      this.refreshRestPose();
    }
    return actualHealed;
  }

  private spawnHealPopup(healAmount: number): void {
    const px = this.x + Phaser.Math.Between(-8, 8);
    const py = this.y - 70;

    const popup = this.scene.add.text(px, py, `+${healAmount.toLocaleString()}`, {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#4ade80',
      stroke: '#064e3b',
      strokeThickness: 3,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    popup.setDepth(1600);
    popup.setScale(0.7);

    this.scene.tweens.add({
      targets: popup,
      scaleX: 1.15,
      scaleY: 1.15,
      y: py - 35,
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: popup,
          y: py - 65,
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
   * Enables or disables temporary foreground action depth boost.
   */
  public setDepthBoost(boosted: boolean, customDepth: number = 1000): void {
    this.isDepthBoosted = boosted;
    if (boosted) {
      this.setDepth(customDepth);
    } else {
      this.setDepth(this.homeY);
    }
  }

  /**
   * Updates sprite depth based on current Y coordinate for dynamic sorting.
   * If an action depth boost is active, depth is maintained.
   */
  public updateDepth(): void {
    if (!this.isDepthBoosted) {
      this.setDepth(this.y);
    }
  }

  /**
   * Registers all animations in the manifest with Phaser's global animation manager
   * using exact per-frame durations in milliseconds.
   */
  public registerAnimations(): void {
    for (const [animName, animMeta] of Object.entries(this.manifest.animations)) {
      const phaserKey = `${this.visualKey}_${animName}`;
      if(!this.scene.textures.exists(phaserKey))continue;
      if (!this.scene.anims.exists(phaserKey)) {
        this.scene.anims.create({
          key: phaserKey,
          frames: animMeta.frames.map((f) => ({
            key: phaserKey,
            frame: f.index,
            duration: f.durationMs,
          })),
          repeat: ['idle', 'dying', 'move', 'win', 'standby', 'magic_standby'].includes(animName) ? -1 : 0,
        });
      }
    }
  }

  /**
   * Plays the requested animation and dynamically updates the origin (pivot)
   * so that the unit's logical feet stay at the exact same world coordinate.
   */
  public playAnimation(animName: string, ignoreIfPlaying = false): this {
    if(!this.scene.textures.exists(`${this.visualKey}_${animName}`))throw Error(`Body clip was not admitted before battle: ${this.visualKey}/${animName}`);
    if(animName!=='win_before'&&animName!=='win')this.victoryPoseReady=false;
    const animMeta = this.manifest.animations[animName];
    if (!animMeta) {
      console.warn(`[UnitActor] Animation '${animName}' not found in manifest for ${this.unitKey}`);
      return this;
    }

    if (this.victoryComplete) {
      this.off(`animationcomplete-${this.visualKey}_win_before`, this.victoryComplete);
      this.victoryComplete = undefined;
    }
    this.currentAnimKey = animName;

    // Apply calculated anchor
    const pivotX = this.flipX ? 1.0 - animMeta.pivotX : animMeta.pivotX;
    const pivotY = animMeta.pivotY;
    this.setOrigin(pivotX, pivotY);

    const phaserKey = `${this.visualKey}_${animName}`;
    this.play(phaserKey, ignoreIfPlaying);
    return this;
  }

  /** Select the resting pose without changing position or action depth. */
  public playRestPose(): void {
    const pose = this.isDead ? 'dead'
      : this.currentHp <= this.maxHp * UnitActor.LOW_HP_RATIO && this.manifest.animations.dying
        ? 'dying' : 'idle';
    this.playAnimation(pose, true);
  }

  /** Readiness while choosing a command; the scene owns selection/action locks. */
  public playCommandPose(magic = false): void {
    if (this.isDead) return;
    const pose = magic && this.manifest.animations.magic_standby ? 'magic_standby' : 'standby';
    if (this.manifest.animations[pose]) this.playAnimation(pose, true);
    else this.playRestPose();
  }

  public clearCommandPose(): void {
    if (this.currentAnimKey === 'standby' || this.currentAnimKey === 'magic_standby') this.playRestPose();
  }

  /** Healing and damage must not interrupt actions or victory celebrations. */
  private refreshRestPose(): void {
    if (this.currentAnimKey === 'idle' || this.currentAnimKey === 'dying') {
      this.playRestPose();
    }
  }

  /** Play the entrance once, then celebrate until the next encounter. */
  public playVictory(): void {
    if (this.isDead || this.currentAnimKey === 'win_before' || this.currentAnimKey === 'win') return;
    if (!this.manifest.animations.win_before) {
      this.playAnimation('win');
      return;
    }
    this.playAnimation('win_before');
    this.victoryComplete = () => {
      this.victoryComplete = undefined;
      if (!this.isDead && this.currentAnimKey === 'win_before') this.playAnimation('win');
    };
    this.once(`animationcomplete-${this.visualKey}_win_before`, this.victoryComplete);
  }

  private victoryPoseReady=false;
  public get hasVictoryPose():boolean{return this.victoryPoseReady;}

  /** Signal the verified terminal pose; complete clips continue behind rewards. */
  public playVictoryCycle(onReady:()=>void):()=>void {
    if(this.isDead||!this.manifest.animations.win){onReady();return ()=>{};}
    const event='animationrepeat',key=`${this.visualKey}_win`,events=this.scene.events;
    const registry=this.scene.cache?.json?.get('victory_pose_gates');
    const candidate=registry?.schemaVersion===1?registry.units?.[this.visualKey]:undefined;
    const gate=candidate&&String(candidate.unitId)===String(this.manifest.unitId)
      &&['win_before','win'].includes(candidate.clip)&&Number.isInteger(candidate.frame)&&candidate.frame>=0
      &&candidate.frame<this.manifest.animations[candidate.clip]?.frameCount&&candidate.frameCounts&&typeof candidate.frameCounts==='object'
      &&Object.entries(candidate.frameCounts).every(([clip,count])=>this.manifest.animations[clip]?.frameCount===count)?candidate:null;
    let finished=false;
    const cancel=()=>{this.off(event,ready);this.off('animationstart',pose);this.off('animationupdate',pose);events.off('shutdown',cancel);};
    const complete=()=>{if(finished)return;finished=true;this.victoryPoseReady=true;cancel();onReady();};
    const ready=(animation:Phaser.Animations.Animation)=>{if(animation.key===key)complete();};
    const pose=(animation:Phaser.Animations.Animation,frame:Phaser.Animations.AnimationFrame)=>{
      if(gate&&animation.key===`${this.visualKey}_${gate.clip}`&&Number(frame.textureFrame)>=gate.frame)complete();
    };
    if(gate){this.on('animationstart',pose);this.on('animationupdate',pose);}
    this.on(event,ready);events.once('shutdown',cancel);
    this.playVictory();
    if(gate&&this.currentAnimKey==='win')complete();
    else if(gate&&this.anims?.currentAnim?.key===`${this.visualKey}_${gate.clip}`&&Number(this.anims.currentFrame?.textureFrame)>=gate.frame)complete();
    return cancel;
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
   * 2. The finished animation has a measurable foot offset (absolute recoilOffsetX > 3 pixels).
   * 
   * If BOTH conditions are met (e.g. Barret's Gatling attack):
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
    const hasMeasurableRecoil = Math.abs(recoilOffsetX) > 3;

    if (isStationary && hasMeasurableRecoil) {
      // Facing left (flipX = false) means forward is -X towards enemy.
      const direction = this.flipX ? 1 : -1;
      const screenOffset = direction * recoilOffsetX * Math.abs(this.scaleX);

      this.x = this.homeSlot.x + screenOffset;
      this.y = this.homeSlot.y;
      this.playRestPose();

      this.scene.tweens.add({
        targets: this,
        x: this.homeSlot.x,
        duration: 150,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.x = this.homeSlot.x;
          this.setDepthBoost(false);
          this.updateDepth();
          onComplete?.();
        },
      });
    } else {
      this.setPosition(this.homeSlot.x, this.homeSlot.y);
      this.setDepthBoost(false);
      this.playRestPose();
      this.updateDepth();
      onComplete?.();
    }
  }
}
