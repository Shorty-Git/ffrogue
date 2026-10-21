import Phaser from 'phaser';
import { UnitActor } from '../entities/UnitActor';
import { UnitManifest } from '../types/manifest';

export class BattleScene extends Phaser.Scene {
  private cloudManifest!: UnitManifest;
  private cloud!: UnitActor;
  private debugMarkerGraphics!: Phaser.GameObjects.Graphics;
  private showDebugMarker: boolean = true;
  private isAttacking: boolean = false;
  private statusText!: Phaser.GameObjects.Text;
  private targetDummy!: Phaser.GameObjects.Container;

  constructor() {
    super('BattleScene');
  }

  init(data: { cloudManifest: UnitManifest }): void {
    this.cloudManifest = data.cloudManifest;
  }

  create(): void {
    const { width, height } = this.scale;

    // 1. Arena Background
    this.createArenaBackground(width, height);

    // 2. Party & Enemy Grids
    this.createCombatGrids();

    // 3. Target Dummy on the Left
    this.createTargetDummy(340, 430);

    // 4. Cloud UnitActor on Party Slot (Right side: 920, 430)
    this.cloud = new UnitActor(this, 920, 430, 'cloud', this.cloudManifest);
    this.cloud.setScale(2.5);
    this.cloud.setFacingLeft(true); // Cloud naturally faces left towards the enemy

    // 5. Debug Pivot Graphics
    this.debugMarkerGraphics = this.add.graphics();
    this.debugMarkerGraphics.setDepth(100);

    // 6. UI Controls
    this.createUI(width, height);

    this.updateStatus('Bereit - Animation: IDLE');
  }

  update(): void {
    // Redraw debug pivot marker at Cloud's exact ground coordinates
    this.debugMarkerGraphics.clear();
    if (this.showDebugMarker && this.cloud) {
      const cx = this.cloud.x;
      const cy = this.cloud.y;

      // Outer ring
      this.debugMarkerGraphics.lineStyle(2, 0xff0055, 0.9);
      this.debugMarkerGraphics.strokeCircle(cx, cy, 8);

      // Inner solid point
      this.debugMarkerGraphics.fillStyle(0x00ffff, 1.0);
      this.debugMarkerGraphics.fillCircle(cx, cy, 3);

      // Crosshair lines
      this.debugMarkerGraphics.lineStyle(1, 0x00ffff, 0.7);
      this.debugMarkerGraphics.lineBetween(cx - 14, cy, cx + 14, cy);
      this.debugMarkerGraphics.lineBetween(cx, cy - 14, cx, cy + 14);
    }
  }

  private createArenaBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    // Sky/Upper gradient
    bg.fillGradientStyle(0x0a0f1d, 0x0a0f1d, 0x111827, 0x111827, 1);
    bg.fillRect(0, 0, width, height);

    // Ground plane
    bg.fillStyle(0x0f172a, 0.9);
    bg.fillRect(0, 320, width, height - 320);

    // Subtle arena floor grid
    bg.lineStyle(1, 0x1e293b, 0.6);
    for (let y = 340; y < height; y += 40) {
      bg.lineBetween(0, y, width, y);
    }
    for (let x = 60; x < width; x += 80) {
      bg.lineBetween(x, 320, x, height);
    }

    // Arena separator accent
    bg.lineStyle(2, 0x38bdf8, 0.3);
    bg.lineBetween(0, 320, width, 320);

    // Center divider glow
    bg.lineStyle(1, 0x64748b, 0.2);
    bg.lineBetween(width / 2, 320, width / 2, height);
  }

  private createCombatGrids(): void {
    const g = this.add.graphics();

    // Player Party 2x3 Grid Slots (Right)
    const partySlots = [
      { x: 920, y: 310, label: 'Front-Top' },
      { x: 920, y: 430, label: 'Front-Mid (Cloud)' },
      { x: 920, y: 550, label: 'Front-Bot' },
      { x: 1070, y: 310, label: 'Back-Top' },
      { x: 1070, y: 430, label: 'Back-Mid' },
      { x: 1070, y: 550, label: 'Back-Bot' },
    ];

    partySlots.forEach((slot) => {
      // Slot shadow/base
      g.fillStyle(0x0284c7, 0.12);
      g.fillEllipse(slot.x, slot.y, 110, 38);
      g.lineStyle(1, 0x38bdf8, 0.4);
      g.strokeEllipse(slot.x, slot.y, 110, 38);

      this.add.text(slot.x, slot.y + 18, slot.label, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#64748b',
      }).setOrigin(0.5);
    });

    // Enemy Area Slots (Left)
    const enemySlots = [
      { x: 340, y: 310, label: 'Enemy-Top' },
      { x: 340, y: 430, label: 'Target Dummy' },
      { x: 340, y: 550, label: 'Enemy-Bot' },
    ];

    enemySlots.forEach((slot) => {
      g.fillStyle(0xef4444, 0.12);
      g.fillEllipse(slot.x, slot.y, 120, 42);
      g.lineStyle(1, 0xf87171, 0.4);
      g.strokeEllipse(slot.x, slot.y, 120, 42);
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
  }

  private triggerTargetHit(): void {
    if (!this.targetDummy) return;

    // Flash and punch shake effect
    const originalX = 340;
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
    const dmgText = this.add.text(340, 320, '9,999!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#fbbf24',
      fontStyle: 'bold',
      stroke: '#78350f',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: dmgText,
      y: 260,
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

    this.add.text(24, 16, 'FF ROGUE - MEILENSTEIN 2', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#38bdf8',
      fontStyle: 'bold',
    });

    this.add.text(24, 36, 'Phaser 3 + UnitActor mit dynamischem Pivot & Move-to-Target Test', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#94a3b8',
    });

    this.statusText = this.add.text(width - 24, 26, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#fbbf24',
    }).setOrigin(1, 0.5);

    // Bottom Controls Bar
    const barY = height - 52;
    const barBg = this.add.rectangle(width / 2, barY, width, 80, 0x0f172a, 0.95);
    barBg.setStrokeStyle(1, 0x1e293b);

    // Animation Buttons
    const animButtons = [
      { key: 'idle', label: 'Idle' },
      { key: 'move', label: 'Move' },
      { key: 'atk', label: 'Attack' },
      { key: 'limit_atk', label: 'Limit Atk' },
      { key: 'win', label: 'Win' },
      { key: 'dead', label: 'Dead' },
    ];

    let startX = 40;
    animButtons.forEach((btn) => {
      this.createButton(startX, barY - 14, btn.label, () => {
        if (this.isAttacking) return;
        this.cloud.playAnimation(btn.key);
        this.updateStatus(`Animation gewechselt: ${btn.label.toUpperCase()}`);
      });
      startX += 95;
    });

    // Toggle Debug Marker Button
    this.createButton(startX + 15, barY - 14, 'Pivot-Punkt An/Aus', () => {
      this.showDebugMarker = !this.showDebugMarker;
      this.updateStatus(`Debug-Pivot: ${this.showDebugMarker ? 'SICHTBAR' : 'VERSTECKT'}`);
    }, '#64748b', '#94a3b8');

    // MOVE-TO-TARGET ACTION BUTTON
    this.createButton(
      width - 200,
      barY - 14,
      '⚡ Test Move-to-Target Attack',
      () => this.executeMoveToTargetAttack(),
      '#0369a1',
      '#38bdf8',
      190
    );
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
   * Executes the full FFBE-style Move-to-Target sequence:
   * 1. Switch to 'move'
   * 2. Tween forward to target position (440, 430)
   * 3. Play 'atk' and trigger impact damage
   * 4. Step/Glide back to home slot (920, 430)
   * 5. Return to 'idle'
   */
  public executeMoveToTargetAttack(): void {
    if (this.isAttacking) return;
    this.isAttacking = true;

    const homeX = this.cloud.homeSlot.x;
    const homeY = this.cloud.homeSlot.y;
    const targetAttackX = 450; // Just in front of the target dummy
    const targetAttackY = 430;

    this.updateStatus('Aktion: 1. Move zum Ziel...');

    // 1. Switch to 'move'
    this.cloud.playAnimation('move');

    // 2. Glide to target
    this.tweens.add({
      targets: this.cloud,
      x: targetAttackX,
      y: targetAttackY,
      duration: 380,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        // 3. Arrived at target: Play full 'atk' animation
        this.updateStatus('Aktion: 2. Ausfuehrung Angriff (Buster Sword)...');
        this.cloud.playAnimation('atk');

        // Trigger impact midway or on specific strike frame
        this.time.delayedCall(300, () => {
          this.triggerTargetHit();
        });

        // Listen for attack animation completion
        this.cloud.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
          this.updateStatus('Aktion: 3. Rueckweg zum Slot...');

          // Turn / step back towards home slot
          this.cloud.playAnimation('move');
          this.cloud.setFacingLeft(false); // face backwards towards slot

          this.tweens.add({
            targets: this.cloud,
            x: homeX,
            y: homeY,
            duration: 420,
            ease: 'Cubic.easeInOut',
            onComplete: () => {
              // 4. Back home: face enemy and resume idle
              this.cloud.setFacingLeft(true);
              this.cloud.playAnimation('idle');
              this.isAttacking = false;
              this.updateStatus('Bereit - Angriff erfolgreich abgeschlossen!');
            },
          });
        });
      },
    });
  }
}
