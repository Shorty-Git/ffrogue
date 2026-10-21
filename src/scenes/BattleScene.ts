import Phaser from 'phaser';
import { UnitActor } from '../entities/UnitActor';
import { UnitManifest } from '../types/manifest';

export class BattleScene extends Phaser.Scene {
  private manifests!: Record<string, UnitManifest>;
  private cloud!: UnitActor;
  private aerith!: UnitActor;
  private selectedUnit!: UnitActor;

  private debugMarkerGraphics!: Phaser.GameObjects.Graphics;
  private showDebugMarker: boolean = true;
  private isAttacking: boolean = false;
  private statusText!: Phaser.GameObjects.Text;
  private activeUnitBtnText!: Phaser.GameObjects.Text;
  private attackModeBtnContainer?: Phaser.GameObjects.Container;
  private attackModeBtnText?: Phaser.GameObjects.Text;
  private targetDummy!: Phaser.GameObjects.Container;

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

    // 3. Target Dummy on Minion 1 Slot (400, 220)
    this.createTargetDummy(400, 220);

    // 4. Instantiate Party Units:
    // Cloud on Front-Mid (880, 360) - Vanguard/Tank
    this.cloud = new UnitActor(this, 880, 360, 'cloud', this.manifests.cloud, {
      attackType: 'melee',
      targetOffsetX: 90,
      attackAnim: 'atk',
    });
    this.cloud.setScale(2.5);
    this.cloud.setFacingLeft(true);

    // Aerith on Back-Top (1040, 220) - Healer/Ranged
    this.aerith = new UnitActor(this, 1040, 220, 'aerith', this.manifests.aerith, {
      attackType: 'ranged',
      targetOffsetX: 220,
      attackAnim: 'magic_atk',
    });
    this.aerith.setScale(2.5);
    this.aerith.setFacingLeft(true);

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
      { x: 1040, y: 500, label: 'Back-Bot (Frei)' },
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
      { x: 220, y: 360, label: 'Back-Mid (Boss-Slot)', isBoss: true },
      { x: 400, y: 220, label: 'Front-Top (Minion 1 / Dummy)', isBoss: false },
      { x: 400, y: 500, label: 'Front-Bot (Minion 2)', isBoss: false },
    ];

    enemySlots.forEach((slot) => {
      if (slot.isBoss) {
        // Larger prominent Boss ellipse
        g.fillStyle(0xef4444, 0.18);
        g.fillEllipse(slot.x, slot.y, 160, 56);
        g.lineStyle(2, 0xf87171, 0.7);
        g.strokeEllipse(slot.x, slot.y, 160, 56);
      } else {
        g.fillStyle(0xef4444, 0.12);
        g.fillEllipse(slot.x, slot.y, 115, 40);
        g.lineStyle(1, 0xf87171, 0.4);
        g.strokeEllipse(slot.x, slot.y, 115, 40);
      }

      this.add.text(slot.x, slot.y + (slot.isBoss ? 28 : 20), slot.label, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#71717a',
      }).setOrigin(0.5).setDepth(11);
    });
  }

  private createTargetDummy(x: number, y: number): void {
    this.targetDummy = this.add.container(x, y);

    // Dummy base
    const base = this.add.graphics();
    base.fillStyle(0xef4444, 0.3);
    base.fillCircle(0, -60, 28);
    base.lineStyle(2, 0xf87171, 0.9);
    base.strokeCircle(0, -60, 28);

    // Target cross inside dummy
    base.lineBetween(-20, -60, 20, -60);
    base.lineBetween(0, -80, 0, -40);

    // Dummy pole & stand
    base.fillStyle(0x78716c, 1);
    base.fillRect(-6, -32, 12, 32);
    base.fillRect(-22, -4, 44, 4);

    const nameText = this.add.text(0, -100, 'ZIEL-DUMMY', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#f87171',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // HP Bar background
    const hpBg = this.add.rectangle(0, -114, 80, 8, 0x1f2937);
    const hpBar = this.add.rectangle(-40, -114, 80, 8, 0xef4444).setOrigin(0, 0.5);

    this.targetDummy.add([base, nameText, hpBg, hpBar]);
    this.targetDummy.setDepth(y);
  }

  private triggerTargetHit(): void {
    if (!this.targetDummy) return;

    // Flash and punch shake effect
    const originalX = 400;
    this.tweens.add({
      targets: this.targetDummy,
      x: originalX - 16,
      duration: 60,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.targetDummy.x = originalX;
      },
    });

    // Floating damage number
    const isCloud = this.selectedUnit === this.cloud;
    const dmg = isCloud ? '9,999!' : (this.selectedUnit.combatConfig.attackType === 'ranged' ? '5,420 (Holy)!' : '3,850!');
    const color = isCloud ? '#fbbf24' : '#67e8f9';

    const dmgText = this.add.text(400, 110, dmg, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: color,
      fontStyle: 'bold',
      stroke: '#0f172a',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(2000);

    this.tweens.add({
      targets: dmgText,
      y: 60,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => dmgText.destroy(),
    });
  }

  private createUI(width: number, height: number): void {
    // Header Info Banner
    const headerBg = this.add.rectangle(width / 2, 28, width, 56, 0x0f172a, 0.85);
    headerBg.setStrokeStyle(1, 0x1e293b);
    headerBg.setDepth(1000);

    this.add.text(24, 16, 'FF ROGUE - 3-VS-3 DREIECKS-FORMATION & ATTACK-LOGIK', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#38bdf8',
      fontStyle: 'bold',
    }).setDepth(1001);

    this.add.text(24, 36, 'Party (Rechts <): Cloud (Front) & Aerith (Back) | Y-Sorting & Differenzierte Angriffe', {
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
      95,
      barY - 14,
      'Einheit: CLOUD ▾',
      () => this.toggleActiveUnit(),
      '#0e7490',
      '#06b6d4',
      125
    );
    this.activeUnitBtnText = unitToggleContainer.getAt(1) as Phaser.GameObjects.Text;

    // 2. AERITH ATTACK MODE TOGGLE (Ranged / Melee)
    this.attackModeBtnContainer = this.createButton(
      225,
      barY - 14,
      'Modus: FERNKAMPF ▾',
      () => this.toggleAerithAttackMode(),
      '#1e293b',
      '#f472b6',
      130
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

    let startX = 350;
    animButtons.forEach((btn) => {
      this.createButton(startX, barY - 14, btn.label, () => {
        if (this.isAttacking) return;
        if (!this.selectedUnit.manifest.animations[btn.key]) {
          this.updateStatus(`[Info] ${this.selectedUnit.unitKey.toUpperCase()} hat keine '${btn.key}'-Animation.`);
          return;
        }
        this.selectedUnit.playAnimation(btn.key);
        this.updateStatus(`Animation gewechselt: ${this.selectedUnit.unitKey.toUpperCase()} -> ${btn.label.toUpperCase()}`);
      }, '#1e293b', '#38bdf8', 68);
      startX += 74;
    });

    // 4. TOGGLE DEBUG PIVOT MARKER BUTTON
    this.createButton(startX + 18, barY - 14, 'Pivot An/Aus', () => {
      this.showDebugMarker = !this.showDebugMarker;
      this.updateStatus(`Debug-Pivot: ${this.showDebugMarker ? 'SICHTBAR' : 'VERSTECKT'}`);
    }, '#475569', '#94a3b8', 95);

    // 5. MOVE-TO-TARGET ACTION BUTTON
    this.createButton(
      width - 150,
      barY - 14,
      '⚡ Angriff ausfuehren',
      () => this.executeAttack(),
      '#0369a1',
      '#38bdf8',
      140
    );
  }

  private toggleActiveUnit(): void {
    if (this.isAttacking) return;

    if (this.selectedUnit === this.cloud) {
      this.selectedUnit = this.aerith;
      this.activeUnitBtnText.setText('Einheit: AERITH ▾');
    } else {
      this.selectedUnit = this.cloud;
      this.activeUnitBtnText.setText('Einheit: CLOUD ▾');
    }

    this.updateAttackModeBtnVisibility();
    this.updateStatus(`Ausgewaehlt: ${this.selectedUnit.unitKey.toUpperCase()} (Pos: ${this.selectedUnit.homeSlot.x}, ${this.selectedUnit.homeSlot.y})`);
  }

  private toggleAerithAttackMode(): void {
    if (this.isAttacking || this.selectedUnit !== this.aerith) return;

    if (this.aerith.combatConfig.attackType === 'ranged') {
      this.aerith.combatConfig = {
        attackType: 'melee',
        targetOffsetX: 220, // Offset tuned for Aerith's internal 116px (290px world) sprite lunge
        attackAnim: 'atk',
      };
      this.attackModeBtnText?.setText('Modus: NAHKAMPF-RUN ▾');
      this.updateStatus('Aerith-Modus: NAHKAMPF (gleitet vor das Ziel mit Offset 220px)');
    } else {
      this.aerith.combatConfig = {
        attackType: 'ranged',
        targetOffsetX: 220,
        attackAnim: 'magic_atk',
      };
      this.attackModeBtnText?.setText('Modus: FERNKAMPF ▾');
      this.updateStatus('Aerith-Modus: FERNKAMPF (bleibt auf Slot stehen & zaubert)');
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
   * Executes combat attack logic based on unit's combatConfig:
   * - 'ranged': Unit stays on slot, casts/attacks without moving
   * - 'melee': Unit glides forward to targetX + targetOffsetX, strikes, and returns
   */
  public executeAttack(): void {
    if (this.isAttacking) return;
    this.isAttacking = true;

    const unit = this.selectedUnit;
    const homeX = unit.homeSlot.x;
    const homeY = unit.homeSlot.y;
    const targetX = 400; // Target dummy on Minion 1 slot
    const targetY = 220;

    const unitName = unit.unitKey.toUpperCase();
    const config = unit.combatConfig;

    if (config.attackType === 'ranged') {
      // --- RANGED ATTACK SEQUENCE (Stationary) ---
      this.updateStatus(`Aktion: ${unitName} fuehrt Fernkampf/Zauber aus...`);
      unit.playAnimation(config.attackAnim);

      // Staff cast impact trigger
      this.time.delayedCall(300, () => {
        // Subtle projectile / light orb travel effect
        const projectile = this.add.circle(homeX - 50, homeY - 40, 9, 0x67e8f9, 0.95);
        projectile.setDepth(1200);

        this.tweens.add({
          targets: projectile,
          x: targetX,
          y: targetY - 40,
          duration: 180,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            projectile.destroy();
            this.triggerTargetHit();
          },
        });
      });

      unit.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        unit.playAnimation('idle');
        this.isAttacking = false;
        this.updateStatus(`Bereit - ${unitName} Fernangriff beendet!`);
      });
    } else {
      // --- MELEE MOVE-TO-TARGET SEQUENCE ---
      const attackArrivalX = targetX + config.targetOffsetX;
      const attackArrivalY = targetY;

      this.updateStatus(`Aktion: ${unitName} gleitet zum Ziel (Ziel-Offset: ${config.targetOffsetX}px)...`);
      unit.playAnimation('move');

      this.tweens.add({
        targets: unit,
        x: attackArrivalX,
        y: attackArrivalY,
        duration: 380,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          this.updateStatus(`Aktion: ${unitName} schlaegt zu ('${config.attackAnim}')...`);
          unit.playAnimation(config.attackAnim);

          // Impact timing (mid-strike)
          const hitDelay = unit === this.cloud ? 300 : 350;
          this.time.delayedCall(hitDelay, () => {
            this.triggerTargetHit();
          });

          unit.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
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
