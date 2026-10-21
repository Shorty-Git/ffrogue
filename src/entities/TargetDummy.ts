import Phaser from 'phaser';

export class TargetDummy extends Phaser.GameObjects.Container {
  public maxHp: number = 5000;
  public currentHp: number = 5000;
  public readonly baseX: number;
  public readonly baseY: number;

  private barWidth: number = 140;
  private barHeight: number = 10;
  private fgBar!: Phaser.GameObjects.Rectangle;
  private chipBar!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private koBanner!: Phaser.GameObjects.Text;
  private flashOverlay!: Phaser.GameObjects.Graphics;
  private chipTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.baseX = x;
    this.baseY = y;

    this.createDummyGraphics();
    this.createHealthBar();

    this.setDepth(y);
    scene.add.existing(this);
  }

  private createDummyGraphics(): void {
    // 1. Stand and pole
    const stand = this.scene.add.graphics();
    stand.fillStyle(0x78716c, 1);
    stand.fillRect(-6, -32, 12, 32);
    stand.fillRect(-24, -4, 48, 5);

    // 2. Dummy target body
    const body = this.scene.add.graphics();
    body.fillStyle(0xef4444, 0.35);
    body.fillCircle(0, -60, 28);
    body.lineStyle(2, 0xf87171, 0.9);
    body.strokeCircle(0, -60, 28);

    // Target cross inside dummy
    body.lineBetween(-20, -60, 20, -60);
    body.lineBetween(0, -80, 0, -40);

    // 3. White Flash Overlay (silhouette)
    this.flashOverlay = this.scene.add.graphics();
    this.flashOverlay.fillStyle(0xffffff, 1);
    this.flashOverlay.fillCircle(0, -60, 29);
    this.flashOverlay.fillRect(-6, -32, 12, 32);
    this.flashOverlay.setAlpha(0);

    // 4. Name Tag
    const nameText = this.scene.add.text(0, -112, 'ZIEL-DUMMY', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#f87171',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add([stand, body, this.flashOverlay, nameText]);
  }

  private createHealthBar(): void {
    const barY = -92;
    const halfWidth = this.barWidth / 2;

    // 1. Dark background with border
    const hpBg = this.scene.add.rectangle(0, barY, this.barWidth + 4, this.barHeight + 4, 0x0f172a, 0.95);
    hpBg.setStrokeStyle(1, 0x334155);

    // 2. Yellow/Amber Chip-Damage Bar (Background)
    this.chipBar = this.scene.add.rectangle(-halfWidth, barY, this.barWidth, this.barHeight, 0xfbbf24).setOrigin(0, 0.5);

    // 3. Dynamic Color Health Bar (Foreground)
    this.fgBar = this.scene.add.rectangle(-halfWidth, barY, this.barWidth, this.barHeight, 0x22c55e).setOrigin(0, 0.5);

    // 4. HP Text Display (e.g. "5,000 / 5,000 HP")
    this.hpText = this.scene.add.text(0, barY + 14, `${this.currentHp.toLocaleString()} / ${this.maxHp.toLocaleString()} HP`, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#cbd5e1',
    }).setOrigin(0.5);

    // 5. K.O. Banner (hidden by default)
    this.koBanner = this.scene.add.text(0, -60, 'K.O. - BESIEGT', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#dc2626',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setVisible(false);

    this.add([hpBg, this.chipBar, this.fgBar, this.hpText, this.koBanner]);
  }

  /**
   * Applies damage, triggers impact shake & flash, updates 2-phase HP bar and spawns bouncing floating number.
   */
  public applyDamage(damage: number, isCritical = false, damageType: 'physical' | 'holy' = 'physical'): void {
    if (this.currentHp <= 0) {
      damage = 0;
    }

    this.currentHp = Math.max(0, this.currentHp - damage);

    // 1. Impact Flash (White overlay for 60ms)
    this.flashOverlay.setAlpha(0.95);
    this.scene.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration: 80,
      ease: 'Linear',
    });

    // 2. Impact Shake (horizontal vibration for 120ms)
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

    // 3. Floating Damage Number
    this.spawnDamagePopup(damage, isCritical, damageType);

    // 4. 2-Phase HP Bar Update
    this.updateHealthBar();

    // 5. Check K.O.
    if (this.currentHp <= 0) {
      this.koBanner.setVisible(true);
    }
  }

  private updateHealthBar(): void {
    const pct = this.currentHp / this.maxHp;
    const targetWidth = Math.max(0, this.barWidth * pct);

    // 1. Foreground bar updates immediately
    this.fgBar.width = targetWidth;

    // Color gradient based on health remaining
    if (pct > 0.5) {
      this.fgBar.fillColor = 0x22c55e; // Green
    } else if (pct > 0.25) {
      this.fgBar.fillColor = 0xf59e0b; // Amber/Orange
    } else {
      this.fgBar.fillColor = 0xef4444; // Red
    }

    // Update text
    this.hpText.setText(`${this.currentHp.toLocaleString()} / ${this.maxHp.toLocaleString()} HP`);

    // 2. Chip-Damage bar smoothly catches up after 200ms delay
    if (this.chipTween) {
      this.chipTween.stop();
    }

    this.scene.time.delayedCall(200, () => {
      this.chipTween = this.scene.tweens.add({
        targets: this.chipBar,
        width: targetWidth,
        duration: 420,
        ease: 'Cubic.easeOut',
      });
    });
  }

  private spawnDamagePopup(damage: number, isCritical: boolean, damageType: 'physical' | 'holy'): void {
    const startX = this.baseX + Phaser.Math.Between(-14, 14);
    const startY = this.baseY - 125;

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
   * Restores HP to 100%, clears K.O. state and animates HP bar back to full.
   */
  public healFull(): void {
    this.currentHp = this.maxHp;
    this.koBanner.setVisible(false);

    // Animate bars back to full
    this.scene.tweens.add({
      targets: [this.fgBar, this.chipBar],
      width: this.barWidth,
      duration: 350,
      ease: 'Cubic.easeOut',
    });

    this.fgBar.fillColor = 0x22c55e;
    this.hpText.setText(`${this.maxHp.toLocaleString()} / ${this.maxHp.toLocaleString()} HP`);

    // Green healing text popup
    const healText = this.scene.add.text(this.baseX, this.baseY - 130, '+5,000 HEAL', {
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
      y: this.baseY - 170,
      alpha: 0,
      duration: 750,
      ease: 'Cubic.easeOut',
      onComplete: () => healText.destroy(),
    });
  }
}
