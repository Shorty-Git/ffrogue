import Phaser from 'phaser';
import { UnitActor } from '../entities/UnitActor';
import { TargetDummy } from '../entities/TargetDummy';
import { UnitManifest } from '../types/manifest';

export class BattleScene extends Phaser.Scene {
  private manifests!: Record<string, UnitManifest>;
  private cloud!: UnitActor;
  private aerith!: UnitActor;
  private barret!: UnitActor;
  private selectedUnit!: UnitActor;

  private debugMarkerGraphics!: Phaser.GameObjects.Graphics;
  private showDebugMarker: boolean = true;
  private isAttacking: boolean = false;
  private statusText!: Phaser.GameObjects.Text;
  private activeUnitBtnText!: Phaser.GameObjects.Text;
  private attackModeBtnContainer?: Phaser.GameObjects.Container;
  private attackModeBtnText?: Phaser.GameObjects.Text;
  private targetDummy!: TargetDummy;

  constructor() {
    super('BattleScene');
  }

  init(data: { manifests: Record<string, UnitManifest> }): void {
    this.manifests = data.manifests;
  }

  create(): void {
    const { width, height } = this.scale;

    // 1. Arena Background
    this.createArenaBackground(width, height);

    // 2. Party & Enemy 3-vs-3 Triangle Grids
    this.createCombatGrids();

    // 3. Target Dummy on Centered Single-Target Slot: Back-Mid (220, 360)
    this.targetDummy = new TargetDummy(this, 220, 360, this.manifests.training_dummy);

    // 4. Instantiate Party Units:
    // Cloud on Front-Mid (880, 360) - Vanguard/Tank
    this.cloud = new UnitActor(this, 880, 360, 'cloud', this.manifests.cloud, {
      attackType: 'melee',
      targetOffsetX: 90,
      attackAnim: 'atk',
      hitFrameIndex: 2, // Frame 2: Buster Sword impacts forward
    });
    this.cloud.setScale(2.5);
    this.cloud.setFacingLeft(true);

    // Aerith on Back-Top (1040, 220) - Healer/Ranged
    // Default to Basis-Angriff (Melee-Run with calibrated offset & Frame 19 hit)
    this.aerith = new UnitActor(this, 1040, 220, 'aerith', this.manifests.aerith, {
      attackType: 'melee',
      targetOffsetX: 200,
      attackAnim: 'atk',
      hitFrameIndex: 19, // Frame 19: Maximum forward leap & staff impact strike
    });
    this.aerith.setScale(2.5);
    this.aerith.setFacingLeft(true);

    // Barret on Back-Bot (1040, 500) - Ranged Gunner
    // Stationary ranged attack from slot with Gatling gun burst
    this.barret = new UnitActor(this, 1040, 500, 'barret', this.manifests.barret, {
      attackType: 'ranged',
      targetOffsetX: 0,
      attackAnim: 'atk',
      hitFrameIndex: 14, // Frame 14: Gatling gun muzzle flash begins
    });
    this.barret.setScale(2.5);
    this.barret.setFacingLeft(true);

    // Default active test unit is Cloud
    this.selectedUnit = this.cloud;

    // 5. Debug Pivot Graphics
    this.debugMarkerGraphics = this.add.graphics();
    this.debugMarkerGraphics.setDepth(1500);

    // 6. UI Controls
    this.createUI(width, height);

    this.updateStatus(`Bereit - Aktive Einheit: ${this.selectedUnit.unitKey.toUpperCase()} (IDLE)`);
  }

  update(): void {
    // Dynamic Y-depth sorting for all combat actors
    if (this.cloud) this.cloud.updateDepth();
    if (this.aerith) this.aerith.updateDepth();
    if (this.barret) this.barret.updateDepth();
    if (this.targetDummy) this.targetDummy.setDepth(this.targetDummy.y);

    // Redraw debug pivot marker at selected unit's exact ground coordinates
    this.debugMarkerGraphics.clear();
    if (this.showDebugMarker && this.selectedUnit) {
      const cx = this.selectedUnit.x;
      const cy = this.selectedUnit.y;

      // Outer ring
      this.debugMarkerGraphics.lineStyle(2, 0xff0055, 0.9);
      this.debugMarkerGraphics.strokeCircle(cx, cy, 9);

      // Inner solid point
      this.debugMarkerGraphics.fillStyle(0x00ffff, 1.0);
      this.debugMarkerGraphics.fillCircle(cx, cy, 3);

      // Crosshair lines
      this.debugMarkerGraphics.lineStyle(1, 0x00ffff, 0.7);
      this.debugMarkerGraphics.lineBetween(cx - 15, cy, cx + 15, cy);
      this.debugMarkerGraphics.lineBetween(cx, cy - 15, cx, cy + 15);
    }
  }

  private createArenaBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    // Sky/Upper gradient
    bg.fillGradientStyle(0x0a0f1d, 0x0a0f1d, 0x111827, 0x111827, 1);
    bg.fillRect(0, 0, width, height);

    // Ground plane
    bg.fillStyle(0x0f172a, 0.9);
    bg.fillRect(0, 160, width, height - 160);

    // Subtle arena floor grid
    bg.lineStyle(1, 0x1e293b, 0.6);
    for (let y = 180; y < height; y += 45) {
      bg.lineBetween(0, y, width, y);
    }
    for (let x = 60; x < width; x += 80) {
      bg.lineBetween(x, 160, x, height);
    }

    // Arena separator accent
    bg.lineStyle(2, 0x38bdf8, 0.3);
    bg.lineBetween(0, 160, width, 160);

    // Center divider glow
    bg.lineStyle(1, 0x64748b, 0.2);
    bg.lineBetween(width / 2, 160, width / 2, height);
  }

  private createCombatGrids(): void {
    const g = this.add.graphics();
    g.setDepth(10); // Floor plane depth

    // 1. Party 3-Slot Triangle Grid (Right, Arrow < pointing left)
    const partySlots = [
      { x: 880, y: 360, label: 'Front-Mid (Cloud)' },
      { x: 1040, y: 220, label: 'Back-Top (Aerith)' },
      { x: 1040, y: 500, label: 'Back-Bot (Barret)' },
    ];

    partySlots.forEach((slot) => {
      g.fillStyle(0x0284c7, 0.15);
      g.fillEllipse(slot.x, slot.y, 115, 40);
      g.lineStyle(1, 0x38bdf8, 0.5);
      g.strokeEllipse(slot.x, slot.y, 115, 40);

      this.add.text(slot.x, slot.y + 20, slot.label, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#64748b',
      }).setOrigin(0.5).setDepth(11);
    });

    // 2. Enemy 3-Slot Triangle Grid (Left, Arrow > pointing right, centered Boss slot)
    const enemySlots = [
      { x: 220, y: 360, label: 'Back-Mid (Zentrierter Dummy / Boss)', isBoss: true },
      { x: 400, y: 220, label: 'Front-Top (Minion 1 - Frei)', isBoss: false },
      { x: 400, y: 500, label: 'Front-Bot (Minion 2 - Frei)', isBoss: false },
    ];

    enemySlots.forEach((slot) => {
      if (slot.isBoss) {
        // Prominent Centered Single-Target / Boss ellipse
        g.fillStyle(0xef4444, 0.2);
        g.fillEllipse(slot.x, slot.y, 160, 56);
        g.lineStyle(2, 0xf87171, 0.8);
        g.strokeEllipse(slot.x, slot.y, 160, 56);
      } else {
        // Subtle minion slots (active when multiple enemies present)
        g.fillStyle(0xef4444, 0.08);
        g.fillEllipse(slot.x, slot.y, 115, 40);
        g.lineStyle(1, 0xf87171, 0.3);
        g.strokeEllipse(slot.x, slot.y, 115, 40);
      }

      this.add.text(slot.x, slot.y + (slot.isBoss ? 28 : 20), slot.label, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#71717a',
      }).setOrigin(0.5).setDepth(11);
    });
  }

  private triggerTargetHit(): void {
    if (!this.targetDummy) return;

    const unit = this.selectedUnit;
    let baseDmg = 0;
    let isCrit = false;
    let dmgType: 'physical' | 'holy' = 'physical';

    if (unit === this.cloud) {
      // Cloud: 450-650 physical damage
      baseDmg = Phaser.Math.Between(450, 650);
      isCrit = Math.random() < 0.20; // 20% crit chance
      dmgType = 'physical';
    } else if (unit === this.barret) {
      // Barret single shot fallback: 500-720 physical damage
      baseDmg = Phaser.Math.Between(500, 720);
      isCrit = Math.random() < 0.20;
      dmgType = 'physical';
    } else {
      // Aerith
      if (unit.combatConfig.attackType === 'ranged') {
        // Magic / Skill: 700-900 holy damage
        baseDmg = Phaser.Math.Between(700, 900);
        isCrit = Math.random() < 0.15;
        dmgType = 'holy';
      } else {
        // Melee staff strike: 180-260 physical damage
        baseDmg = Phaser.Math.Between(180, 260);
        isCrit = Math.random() < 0.15;
        dmgType = 'physical';
      }
    }

    if (isCrit) {
      baseDmg = Math.round(baseDmg * 1.5);
    }

    this.targetDummy.applyDamage(baseDmg, isCrit, dmgType);
  }

  private fireRangedProjectile(fromX: number, fromY: number, toX: number, toY: number): void {
    // Magic light projectile
    const projectile = this.add.circle(fromX - 40, fromY - 40, 10, 0x67e8f9, 0.95);
    projectile.setDepth(1500);

    // Glowing aura
    const aura = this.add.circle(fromX - 40, fromY - 40, 16, 0x38bdf8, 0.4);
    aura.setDepth(1499);

    this.tweens.add({
      targets: [projectile, aura],
      x: toX,
      y: toY - 40,
      duration: 180,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        projectile.destroy();
        aura.destroy();
        this.triggerTargetHit();
      },
    });
  }

  private fireBulletProjectile(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    damage: number,
    isCrit: boolean
  ): void {
    // Barret's Gunfire Tracer Bullet
    const startX = fromX - 60;
    const startY = fromY - 32;
    const endX = toX + 15;
    const endY = toY - 20;

    // Fast yellow-orange tracer bullet
    const bullet = this.add.ellipse(startX, startY, 20, 5, 0xfde047);
    bullet.setRotation(Math.atan2(endY - startY, endX - startX));
    bullet.setDepth(1500);

    const glow = this.add.ellipse(startX, startY, 28, 9, 0xf97316, 0.5);
    glow.setRotation(Math.atan2(endY - startY, endX - startX));
    glow.setDepth(1499);

    this.tweens.add({
      targets: [bullet, glow],
      x: endX,
      y: endY,
      duration: 110,
      ease: 'Linear',
      onComplete: () => {
        bullet.destroy();
        glow.destroy();
        if (this.targetDummy) {
          this.targetDummy.applyDamage(damage, isCrit, 'physical');
        }
      },
    });
  }

  private createUI(width: number, height: number): void {
    // Header Info Banner
    const headerBg = this.add.rectangle(width / 2, 28, width, 56, 0x0f172a, 0.85);
    headerBg.setStrokeStyle(1, 0x1e293b);
    headerBg.setDepth(1000);

    this.add.text(24, 16, 'FF ROGUE - 3ER-PARTY (CLOUD / AERITH / BARRET) VS WERRATTE', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#38bdf8',
      fontStyle: 'bold',
    }).setDepth(1001);

    this.add.text(24, 36, 'Melee Move-to-Target (Cloud/Aerith) & Ranged Salven (Aerith/Barret) mit Frame-Hit & HP-Bar', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#94a3b8',
    }).setDepth(1001);

    this.statusText = this.add.text(width - 24, 26, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#fbbf24',
    }).setOrigin(1, 0.5).setDepth(1001);

    // Bottom Controls Bar
    const barY = height - 52;
    const barBg = this.add.rectangle(width / 2, barY, width, 80, 0x0f172a, 0.95);
    barBg.setStrokeStyle(1, 0x1e293b);
    barBg.setDepth(1000);

    // 1. UNIT TOGGLE BUTTON (Cloud <-> Aerith)
    const unitToggleContainer = this.createButton(
      90,
      barY - 14,
      'Einheit: CLOUD ▾',
      () => this.toggleActiveUnit(),
      '#0e7490',
      '#06b6d4',
      120
    );
    this.activeUnitBtnText = unitToggleContainer.getAt(1) as Phaser.GameObjects.Text;

    // 2. AERITH ATTACK MODE TOGGLE (Basis-Angriff / Zauber / Skill)
    this.attackModeBtnContainer = this.createButton(
      230,
      barY - 14,
      'Aerith: BASIS-ANGRIFF ▾',
      () => this.toggleAerithAttackMode(),
      '#1e293b',
      '#f472b6',
      155
    );
    this.attackModeBtnText = this.attackModeBtnContainer.getAt(1) as Phaser.GameObjects.Text;
    this.updateAttackModeBtnVisibility();

    // 3. ANIMATION SWITCH BUTTONS
    const animButtons = [
      { key: 'idle', label: 'Idle' },
      { key: 'move', label: 'Move' },
      { key: 'atk', label: 'Attack' },
      { key: 'magic_atk', label: 'Magic' },
      { key: 'limit_atk', label: 'Limit' },
      { key: 'win', label: 'Win' },
    ];

    let startX = 365;
    animButtons.forEach((btn) => {
      this.createButton(startX, barY - 14, btn.label, () => {
        if (this.isAttacking) return;
        if (!this.selectedUnit.manifest.animations[btn.key]) {
          this.updateStatus(`[Info] ${this.selectedUnit.unitKey.toUpperCase()} hat keine '${btn.key}'-Animation.`);
          return;
        }
        this.selectedUnit.playAnimation(btn.key);
        this.updateStatus(`Animation gewechselt: ${this.selectedUnit.unitKey.toUpperCase()} -> ${btn.label.toUpperCase()}`);
      }, '#1e293b', '#38bdf8', 65);
      startX += 70;
    });

    // 4. TOGGLE DEBUG PIVOT MARKER BUTTON
    this.createButton(startX + 15, barY - 14, 'Pivot An/Aus', () => {
      this.showDebugMarker = !this.showDebugMarker;
      this.updateStatus(`Debug-Pivot: ${this.showDebugMarker ? 'SICHTBAR' : 'VERSTECKT'}`);
    }, '#475569', '#94a3b8', 90);

    // 5. RESET / HEAL DUMMY BUTTON
    this.createButton(startX + 115, barY - 14, 'Dummy heilen', () => {
      this.targetDummy.healFull();
      this.updateStatus('Ziel-Dummy vollstaendig auf 5.000 HP geheilt!');
    }, '#15803d', '#22c55e', 100);

    // 6. ATTACK ACTION BUTTON
    this.createButton(
      width - 125,
      barY - 14,
      '⚡ Angriff',
      () => this.executeAttack(),
      '#0369a1',
      '#38bdf8',
      120
    );
  }

  private toggleActiveUnit(): void {
    if (this.isAttacking) return;

    if (this.selectedUnit === this.cloud) {
      this.selectedUnit = this.aerith;
      this.activeUnitBtnText.setText('Einheit: AERITH ▾');
    } else if (this.selectedUnit === this.aerith) {
      this.selectedUnit = this.barret;
      this.activeUnitBtnText.setText('Einheit: BARRET ▾');
    } else {
      this.selectedUnit = this.cloud;
      this.activeUnitBtnText.setText('Einheit: CLOUD ▾');
    }

    this.updateAttackModeBtnVisibility();
    this.updateStatus(`Ausgewaehlt: ${this.selectedUnit.unitKey.toUpperCase()} (Pos: ${this.selectedUnit.homeSlot.x}, ${this.selectedUnit.homeSlot.y})`);
  }

  private toggleAerithAttackMode(): void {
    if (this.isAttacking || this.selectedUnit !== this.aerith) return;

    if (this.aerith.combatConfig.attackType === 'melee') {
      // Switch to Zauber / Skill (Ranged)
      this.aerith.combatConfig = {
        attackType: 'ranged',
        targetOffsetX: 0,
        attackAnim: 'magic_atk',
        hitFrameIndex: 2, // Frame 2: Staff points forward, spells bursts
      };
      this.attackModeBtnText?.setText('Aerith: ZAUBER / SKILL ▾');
      this.updateStatus('Aerith-Modus: Zauber / Skill (Stationär am Platz | Hit auf Frame 2)');
    } else {
      // Switch to Basis-Angriff (Melee-Run)
      this.aerith.combatConfig = {
        attackType: 'melee',
        targetOffsetX: 200, // Calibrated for Aerith's internal forward lunge
        attackAnim: 'atk',
        hitFrameIndex: 19, // Frame 19: Maximum forward leap & staff strike
      };
      this.attackModeBtnText?.setText('Aerith: BASIS-ANGRIFF ▾');
      this.updateStatus('Aerith-Modus: Basis-Angriff (Melee-Run mit Stab-Schlag | Hit auf Frame 19)');
    }
  }

  private updateAttackModeBtnVisibility(): void {
    if (!this.attackModeBtnContainer) return;
    this.attackModeBtnContainer.setVisible(this.selectedUnit === this.aerith);
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    bgColor = '#1e293b',
    hoverColor = '#38bdf8',
    width = 85
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setDepth(1005);

    const bg = this.add.rectangle(0, 0, width, 32, Phaser.Display.Color.HexStringToColor(bgColor).color, 0.9);
    bg.setStrokeStyle(1, 0x475569);
    bg.setInteractive({ useHandCursor: true });

    const text = this.add.text(0, 0, label, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#f8fafc',
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(hoverColor).color);
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(1, 0x475569);
    });
    bg.on('pointerdown', () => {
      onClick();
    });

    container.add([bg, text]);
    return container;
  }

  private updateStatus(msg: string): void {
    if (this.statusText) {
      this.statusText.setText(msg);
    }
  }

  /**
   * Executes combat attack logic based on unit's combatConfig with frame-accurate impact timing.
   */
  public executeAttack(): void {
    if (this.isAttacking) return;
    this.isAttacking = true;

    const unit = this.selectedUnit;
    const homeX = unit.homeSlot.x;
    const homeY = unit.homeSlot.y;

    // Centered single-target enemy dummy
    const targetX = this.targetDummy.x; // 220
    const targetY = this.targetDummy.y; // 360

    const unitName = unit.unitKey.toUpperCase();
    const config = unit.combatConfig;

    if (unit === this.barret) {
      // --- BARRET RANGED GATLING GUN BURST (Stationary at home slot, Frames 14, 17, 20, 23) ---
      this.updateStatus(`Aktion: BARRET feuert Gatling-Gun-Salve (Frames 14, 17, 20, 23)...`);
      const burstFrames = [14, 17, 20, 23];
      const firedFrames = new Set<number>();

      const onAnimUpdate = (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        const frameIdx = Number(frame.textureFrame);
        if (burstFrames.includes(frameIdx) && !firedFrames.has(frameIdx)) {
          firedFrames.add(frameIdx);
          const isCrit = Math.random() < 0.20;
          let bulletDmg = Phaser.Math.Between(130, 180);
          if (isCrit) bulletDmg = Math.round(bulletDmg * 1.5);
          this.fireBulletProjectile(homeX, homeY, targetX, targetY, bulletDmg, isCrit);
        }
      };

      unit.on(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
      unit.playAnimation(config.attackAnim);

      unit.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        unit.off(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
        if (firedFrames.size === 0) {
          const isCrit = Math.random() < 0.20;
          this.fireBulletProjectile(homeX, homeY, targetX, targetY, 550, isCrit);
        }
        unit.playAnimation('idle');
        this.isAttacking = false;
        this.updateStatus(`Bereit - BARRET Gatling-Gun-Salve erfolgreich abgeschlossen!`);
      });
    } else if (config.attackType === 'ranged') {
      // --- AERITH RANGED ATTACK SEQUENCE (Stationary at home slot) ---
      this.updateStatus(`Aktion: ${unitName} fuehrt Zauber / Skill aus (Hit-Frame: ${config.hitFrameIndex})...`);
      let hitTriggered = false;

      const onAnimUpdate = (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        if (!hitTriggered && frame.textureFrame === config.hitFrameIndex) {
          hitTriggered = true;
          this.fireRangedProjectile(homeX, homeY, targetX, targetY);
        }
      };

      unit.on(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
      unit.playAnimation(config.attackAnim);

      unit.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        unit.off(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
        if (!hitTriggered) {
          this.fireRangedProjectile(homeX, homeY, targetX, targetY);
        }
        unit.playAnimation('idle');
        this.isAttacking = false;
        this.updateStatus(`Bereit - ${unitName} Zauber erfolgreich beendet!`);
      });
    } else {
      // --- MELEE MOVE-TO-TARGET SEQUENCE ---
      const attackArrivalX = targetX + config.targetOffsetX;
      const attackArrivalY = targetY;

      this.updateStatus(`Aktion: ${unitName} gleitet zum zentrierten Ziel (Offset: ${config.targetOffsetX}px)...`);
      unit.playAnimation('move');

      this.tweens.add({
        targets: unit,
        x: attackArrivalX,
        y: attackArrivalY,
        duration: 380,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          this.updateStatus(`Aktion: ${unitName} schlaegt zu (Hit-Frame: ${config.hitFrameIndex})...`);
          let hitTriggered = false;

          const onAnimUpdate = (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
            if (!hitTriggered && frame.textureFrame === config.hitFrameIndex) {
              hitTriggered = true;
              this.triggerTargetHit();
            }
          };

          unit.on(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
          unit.playAnimation(config.attackAnim);

          unit.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            unit.off(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
            if (!hitTriggered) {
              this.triggerTargetHit();
            }

            this.updateStatus(`Aktion: ${unitName} kehrt exakt auf Slot (${homeX}, ${homeY}) zurueck...`);
            unit.playAnimation('move');
            unit.setFacingLeft(false); // turn back

            this.tweens.add({
              targets: unit,
              x: homeX,
              y: homeY,
              duration: 420,
              ease: 'Cubic.easeInOut',
              onComplete: () => {
                unit.setFacingLeft(true); // face enemy
                unit.playAnimation('idle');
                this.isAttacking = false;
                this.updateStatus(`Bereit - ${unitName} Angriff erfolgreich abgeschlossen!`);
              },
            });
          });
        },
      });
    }
  }
}
