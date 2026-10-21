import Phaser from 'phaser';
import { UnitActor } from '../entities/UnitActor';
import { TargetDummy } from '../entities/TargetDummy';
import { UnitManifest } from '../types/manifest';

export type CombatState =
  | 'PLAYER_TURN'
  | 'HERO_ATTACKING'
  | 'ENEMY_TURN'
  | 'VICTORY'
  | 'DEFEAT';

interface HudCardElements {
  container: Phaser.GameObjects.Container;
  hpText: Phaser.GameObjects.Text;
  fgBar: Phaser.GameObjects.Rectangle;
  actionBg: Phaser.GameObjects.Rectangle;
  actionText: Phaser.GameObjects.Text;
  modeText?: Phaser.GameObjects.Text;
}

export class BattleScene extends Phaser.Scene {
  private manifests!: Record<string, UnitManifest>;
  private cloud!: UnitActor;
  private aerith!: UnitActor;
  private barret!: UnitActor;
  private targetDummy!: TargetDummy;

  // Turn Loop & Combat State
  private combatState: CombatState = 'PLAYER_TURN';
  private currentRound: number = 1;

  // UI Header Elements
  private roundBannerText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  // Bottom Party HUD Cards
  private hudCards: Map<string, HudCardElements> = new Map();

  // End of Battle Overlay Banner
  private endBattleBanner?: Phaser.GameObjects.Container;

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

    // 3. Target Dummy (Werratte) on Centered Slot: Back-Mid (220, 360)
    this.targetDummy = new TargetDummy(this, 220, 360, this.manifests.training_dummy);

    // 4. Instantiate Party Units with authentic HP & Roles
    // Cloud: Front-Mid (880, 360) - Vanguard (3.200 HP)
    this.cloud = new UnitActor(this, 880, 360, 'cloud', this.manifests.cloud, {
      maxHp: 3200,
      heroName: 'CLOUD',
      heroRole: 'VANGUARD',
      attackType: 'melee',
      targetOffsetX: 90,
      attackAnim: 'atk',
      hitFrameIndex: 2,
    });
    this.cloud.setScale(2.5);
    this.cloud.setFacingLeft(true);
    this.cloud.setInteractive({ useHandCursor: true });
    this.cloud.on('pointerdown', () => this.tryExecuteHeroAttack(this.cloud));

    // Aerith: Back-Top (1040, 220) - Healer / Ranged (2.100 HP)
    this.aerith = new UnitActor(this, 1040, 220, 'aerith', this.manifests.aerith, {
      maxHp: 2100,
      heroName: 'AERITH',
      heroRole: 'HEALER',
      attackType: 'melee', // default: staff melee run
      targetOffsetX: 200,
      attackAnim: 'atk',
      hitFrameIndex: 19,
    });
    this.aerith.setScale(2.5);
    this.aerith.setFacingLeft(true);
    this.aerith.setInteractive({ useHandCursor: true });
    this.aerith.on('pointerdown', () => this.tryExecuteHeroAttack(this.aerith));

    // Barret: Back-Bot (1040, 500) - Tank / Gunner (4.500 HP)
    this.barret = new UnitActor(this, 1040, 500, 'barret', this.manifests.barret, {
      maxHp: 4500,
      heroName: 'BARRET',
      heroRole: 'TANK',
      attackType: 'ranged',
      targetOffsetX: 0,
      attackAnim: 'atk',
      hitFrameIndex: 14,
    });
    this.barret.setScale(2.5);
    this.barret.setFacingLeft(true);
    this.barret.setInteractive({ useHandCursor: true });
    this.barret.on('pointerdown', () => this.tryExecuteHeroAttack(this.barret));

    // 5. Build Clean Header & Bottom Party HUD
    this.createHeaderUI(width);
    this.createBottomPartyHud(width, height);

    // 6. Start Round 1
    this.startPlayerTurn();
  }

  update(): void {
    // Dynamic Y-depth sorting
    if (this.cloud) this.cloud.updateDepth();
    if (this.aerith) this.aerith.updateDepth();
    if (this.barret) this.barret.updateDepth();
    if (this.targetDummy) this.targetDummy.setDepth(this.targetDummy.y);
  }

  private createArenaBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    // Sky gradient
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
    g.setDepth(10);

    // Party 3-Slot Triangle Grid (Right, Arrow < pointing left)
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

    // Enemy Slots (Left, Arrow > pointing right, centered Boss slot)
    const enemySlots = [
      { x: 220, y: 360, label: 'Back-Mid (Werratte)', isBoss: true },
      { x: 400, y: 220, label: 'Front-Top (Frei)', isBoss: false },
      { x: 400, y: 500, label: 'Front-Bot (Frei)', isBoss: false },
    ];

    enemySlots.forEach((slot) => {
      if (slot.isBoss) {
        g.fillStyle(0xef4444, 0.2);
        g.fillEllipse(slot.x, slot.y, 160, 56);
        g.lineStyle(2, 0xf87171, 0.8);
        g.strokeEllipse(slot.x, slot.y, 160, 56);
      } else {
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

  private createHeaderUI(width: number): void {
    const headerBg = this.add.rectangle(width / 2, 28, width, 56, 0x0f172a, 0.9);
    headerBg.setStrokeStyle(1, 0x1e293b);
    headerBg.setDepth(1000);

    // Title & Round
    this.roundBannerText = this.add.text(24, 16, 'RUNDE 1 • SPIELER-ZUG', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#38bdf8',
      fontStyle: 'bold',
    }).setDepth(1001);

    // Subtext status
    this.statusText = this.add.text(24, 36, 'Bereit für Aktionen...', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#94a3b8',
    }).setDepth(1001);

    // Clean Reset Battle Button in Header
    const resetBtn = this.createHeaderButton(width - 95, 28, 'Kampf Reset', () => {
      this.resetBattle();
    });
    resetBtn.setDepth(1001);
  }

  private createHeaderButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 110, 30, 0x1e293b, 0.95);
    bg.setStrokeStyle(1, 0x475569);
    bg.setInteractive({ useHandCursor: true });

    const txt = this.add.text(0, 0, label, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#cbd5e1',
    }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setStrokeStyle(2, 0x38bdf8));
    bg.on('pointerout', () => bg.setStrokeStyle(1, 0x475569));
    bg.on('pointerdown', onClick);

    container.add([bg, txt]);
    return container;
  }

  /**
   * Builds the modern 3-Card Party HUD at the bottom of the screen.
   */
  private createBottomPartyHud(width: number, height: number): void {
    const barY = height - 52;
    const barBg = this.add.rectangle(width / 2, barY, width, 104, 0x090d16, 0.95);
    barBg.setStrokeStyle(1, 0x1e293b);
    barBg.setDepth(1000);

    // 3 Cards spaced evenly
    const cardWidth = 360;
    const cardHeight = 84;
    const cardsData = [
      { unit: this.cloud, x: 210, color: '#38bdf8' },
      { unit: this.aerith, x: 620, color: '#f472b6' },
      { unit: this.barret, x: 1030, color: '#fbbf24' },
    ];

    cardsData.forEach(({ unit, x, color }) => {
      const card = this.add.container(x, barY);
      card.setDepth(1002);

      // Card Background
      const cardBg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x111827, 0.95);
      cardBg.setStrokeStyle(1, 0x334155);

      // Unit Name & Role
      const nameText = this.add.text(-cardWidth / 2 + 16, -24, unit.heroName, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: color,
        fontStyle: 'bold',
      });

      const roleText = this.add.text(-cardWidth / 2 + 95, -22, `[${unit.heroRole}]`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#64748b',
      });

      // Health Bar
      const barW = 190;
      const barH = 10;
      const barX = -cardWidth / 2 + 16;
      const barYPos = 0;

      const hpBg = this.add.rectangle(barX + barW / 2, barYPos, barW, barH, 0x1e293b, 1);
      hpBg.setStrokeStyle(1, 0x334155);

      const fgBar = this.add.rectangle(barX, barYPos, barW, barH, 0x22c55e, 1).setOrigin(0, 0.5);

      const hpText = this.add.text(barX, 16, `${unit.currentHp.toLocaleString()} / ${unit.maxHp.toLocaleString()} HP`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#cbd5e1',
      });

      // Action Button (Right side of card)
      const btnX = cardWidth / 2 - 62;
      const btnY = 0;
      const actionBg = this.add.rectangle(btnX, btnY, 96, 38, 0x0284c7, 0.95);
      actionBg.setStrokeStyle(1, 0x38bdf8);
      actionBg.setInteractive({ useHandCursor: true });

      const actionText = this.add.text(btnX, btnY, '⚡ ANGRIFF', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      actionBg.on('pointerover', () => {
        if (!unit.hasActed && !unit.isDead && this.combatState === 'PLAYER_TURN') {
          actionBg.setStrokeStyle(2, 0xffffff);
        }
      });
      actionBg.on('pointerout', () => {
        actionBg.setStrokeStyle(1, 0x38bdf8);
      });
      actionBg.on('pointerdown', () => {
        this.tryExecuteHeroAttack(unit);
      });

      card.add([cardBg, nameText, roleText, hpBg, fgBar, hpText, actionBg, actionText]);

      let modeText: Phaser.GameObjects.Text | undefined;

      // Special Mode Toggle for Aerith: Nahkampf <-> Zauber
      if (unit === this.aerith) {
        const modeBtnBg = this.add.rectangle(barX + 130, -22, 90, 18, 0x1e293b, 0.9);
        modeBtnBg.setStrokeStyle(1, 0xf472b6);
        modeBtnBg.setInteractive({ useHandCursor: true });

        modeText = this.add.text(barX + 130, -22, 'Nahkampf ▾', {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#f472b6',
        }).setOrigin(0.5);

        modeBtnBg.on('pointerdown', () => {
          this.toggleAerithMode();
        });

        card.add([modeBtnBg, modeText]);
      }

      this.hudCards.set(unit.unitKey, {
        container: card,
        hpText,
        fgBar,
        actionBg,
        actionText,
        modeText,
      });
    });
  }

  private toggleAerithMode(): void {
    if (this.combatState !== 'PLAYER_TURN' || this.aerith.hasActed || this.aerith.isDead) return;

    const hud = this.hudCards.get('aerith');
    if (this.aerith.combatConfig.attackType === 'melee') {
      // Switch to Ranged Holy Magic
      this.aerith.combatConfig = {
        attackType: 'ranged',
        targetOffsetX: 0,
        attackAnim: 'magic_atk',
        hitFrameIndex: 2,
      };
      if (hud?.modeText) hud.modeText.setText('Zauber ▾');
      this.updateStatus('Aerith-Modus: Zauber / Heiliges Licht (Stationär | 700-900 Schaden)');
    } else {
      // Switch to Melee Staff Strike
      this.aerith.combatConfig = {
        attackType: 'melee',
        targetOffsetX: 200,
        attackAnim: 'atk',
        hitFrameIndex: 19,
      };
      if (hud?.modeText) hud.modeText.setText('Nahkampf ▾');
      this.updateStatus('Aerith-Modus: Basis-Nahkampf (Stab-Schlag | 180-260 Schaden)');
    }
  }

  /**
   * Refreshes all party HUD cards with HP and Action state.
   */
  private updateHudCards(): void {
    const units = [this.cloud, this.aerith, this.barret];

    units.forEach((unit) => {
      const hud = this.hudCards.get(unit.unitKey);
      if (!hud) return;

      // 1. HP text and bar width
      hud.hpText.setText(`${unit.currentHp.toLocaleString()} / ${unit.maxHp.toLocaleString()} HP`);
      const pct = Math.max(0, unit.currentHp / unit.maxHp);
      hud.fgBar.width = 190 * pct;

      if (pct > 0.5) hud.fgBar.fillColor = 0x22c55e;
      else if (pct > 0.25) hud.fgBar.fillColor = 0xf59e0b;
      else hud.fgBar.fillColor = 0xef4444;

      // 2. Action Button State
      if (unit.isDead) {
        hud.actionBg.fillColor = 0x450a0a;
        hud.actionBg.setStrokeStyle(1, 0x991b1b);
        hud.actionText.setText('K.O.');
      } else if (unit.hasActed) {
        hud.actionBg.fillColor = 0x1e293b;
        hud.actionBg.setStrokeStyle(1, 0x475569);
        hud.actionText.setText('GEHANDELT');
      } else if (this.combatState === 'HERO_ATTACKING') {
        hud.actionBg.fillColor = 0x075985;
        hud.actionBg.setStrokeStyle(1, 0x38bdf8);
        hud.actionText.setText('WARTET');
      } else {
        // Ready to act
        hud.actionBg.fillColor = 0x0284c7;
        hud.actionBg.setStrokeStyle(1, 0x38bdf8);
        hud.actionText.setText(unit === this.barret ? '⚡ SALVE' : '⚡ ANGRIFF');
      }
    });
  }

  /**
   * Starts a new player turn. Resets all living heroes to active.
   */
  private startPlayerTurn(): void {
    if (this.targetDummy.currentHp <= 0) {
      this.triggerVictory();
      return;
    }

    const aliveHeroes = [this.cloud, this.aerith, this.barret].filter((h) => !h.isDead);
    if (aliveHeroes.length === 0) {
      this.triggerDefeat();
      return;
    }

    this.combatState = 'PLAYER_TURN';
    aliveHeroes.forEach((h) => (h.hasActed = false));

    this.roundBannerText.setText(`RUNDE ${this.currentRound} • SPIELER-ZUG`);
    this.roundBannerText.setColor('#38bdf8');
    this.updateStatus('SPIELER-ZUG: Klicke auf einen Helden oder dessen Karte, um anzugreifen!');
    this.updateHudCards();
  }

  /**
   * Player attempts to trigger a hero's attack.
   */
  public tryExecuteHeroAttack(hero: UnitActor): void {
    if (this.combatState !== 'PLAYER_TURN') return;
    if (hero.isDead || hero.hasActed) return;

    this.combatState = 'HERO_ATTACKING';
    const hud = this.hudCards.get(hero.unitKey);
    if (hud) {
      hud.actionBg.fillColor = 0xd97706;
      hud.actionText.setText('GREIFT AN');
    }

    this.executeHeroAttack(hero, () => {
      hero.hasActed = true;
      this.updateHudCards();

      // Check if Werratte died
      if (this.targetDummy.currentHp <= 0) {
        this.triggerVictory();
        return;
      }

      // Check if all alive heroes have acted
      const aliveHeroes = [this.cloud, this.aerith, this.barret].filter((h) => !h.isDead);
      const allActed = aliveHeroes.every((h) => h.hasActed);

      if (allActed) {
        this.combatState = 'ENEMY_TURN';
        this.roundBannerText.setText(`RUNDE ${this.currentRound} • GEGNER-ZUG`);
        this.roundBannerText.setColor('#f87171');
        this.updateStatus('Alle Helden haben gehandelt! Werratte bereitet Gegenangriff vor...');
        this.time.delayedCall(500, () => this.executeEnemyTurn());
      } else {
        this.combatState = 'PLAYER_TURN';
        this.updateStatus('Wähle den nächsten verfügbaren Helden!');
      }
    });
  }

  /**
   * Executes the individual attack sequence of the selected hero.
   */
  private executeHeroAttack(hero: UnitActor, onComplete: () => void): void {
    const homeX = hero.homeSlot.x;
    const homeY = hero.homeSlot.y;
    const targetX = this.targetDummy.x;
    const targetY = this.targetDummy.y;
    const config = hero.combatConfig;

    if (hero === this.barret) {
      // --- BARRET: RANGED GATLING GUN BURST (Frames 14, 17, 20, 23) ---
      this.updateStatus(`Aktion: BARRET feuert Gatling-Gun-Salve...`);
      const burstFrames = [14, 17, 20, 23];
      const firedFrames = new Set<number>();

      const onAnimUpdate = (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        const frameIdx = Number(frame.textureFrame);
        if (burstFrames.includes(frameIdx) && !firedFrames.has(frameIdx)) {
          firedFrames.add(frameIdx);
          const isCrit = Math.random() < 0.2;
          let bulletDmg = Phaser.Math.Between(130, 180);
          if (isCrit) bulletDmg = Math.round(bulletDmg * 1.5);
          this.fireBulletProjectile(homeX, homeY, targetX, targetY, bulletDmg, isCrit);
        }
      };

      hero.on(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
      hero.playAnimation(config.attackAnim);

      hero.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        hero.off(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
        if (firedFrames.size === 0) {
          const isCrit = Math.random() < 0.2;
          this.fireBulletProjectile(homeX, homeY, targetX, targetY, 550, isCrit);
        }
        hero.playAnimation('idle');
        onComplete();
      });
    } else if (config.attackType === 'ranged') {
      // --- AERITH: RANGED HOLY MAGIC ---
      this.updateStatus(`Aktion: AERITH wirkt Heiliges Licht...`);
      let hitTriggered = false;

      const onAnimUpdate = (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        if (!hitTriggered && Number(frame.textureFrame) === config.hitFrameIndex) {
          hitTriggered = true;
          this.fireMagicProjectile(homeX, homeY, targetX, targetY);
        }
      };

      hero.on(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
      hero.playAnimation(config.attackAnim);

      hero.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        hero.off(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
        if (!hitTriggered) {
          this.fireMagicProjectile(homeX, homeY, targetX, targetY);
        }
        hero.playAnimation('idle');
        onComplete();
      });
    } else {
      // --- MELEE MOVE-TO-TARGET (Cloud / Aerith Melee) ---
      const attackArrivalX = targetX + config.targetOffsetX;
      const attackArrivalY = targetY;

      this.updateStatus(`Aktion: ${hero.heroName} stürmt zum Ziel vor...`);
      hero.playAnimation('move');

      this.tweens.add({
        targets: hero,
        x: attackArrivalX,
        y: attackArrivalY,
        duration: 360,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          let hitTriggered = false;

          const onAnimUpdate = (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
            if (!hitTriggered && Number(frame.textureFrame) === config.hitFrameIndex) {
              hitTriggered = true;
              this.applyHeroMeleeDamage(hero);
            }
          };

          hero.on(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
          hero.playAnimation(config.attackAnim);

          hero.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            hero.off(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
            if (!hitTriggered) {
              this.applyHeroMeleeDamage(hero);
            }

            hero.playAnimation('move');
            hero.setFacingLeft(false); // turn back

            this.tweens.add({
              targets: hero,
              x: homeX,
              y: homeY,
              duration: 380,
              ease: 'Cubic.easeInOut',
              onComplete: () => {
                hero.setFacingLeft(true);
                hero.playAnimation('idle');
                onComplete();
              },
            });
          });
        },
      });
    }
  }

  private applyHeroMeleeDamage(hero: UnitActor): void {
    let baseDmg = 0;
    let isCrit = false;

    if (hero === this.cloud) {
      baseDmg = Phaser.Math.Between(450, 650);
      isCrit = Math.random() < 0.2;
    } else {
      // Aerith melee staff
      baseDmg = Phaser.Math.Between(180, 260);
      isCrit = Math.random() < 0.15;
    }

    if (isCrit) baseDmg = Math.round(baseDmg * 1.5);
    this.targetDummy.applyDamage(baseDmg, isCrit, 'physical');
  }

  private fireMagicProjectile(fromX: number, fromY: number, toX: number, toY: number): void {
    const projectile = this.add.circle(fromX - 40, fromY - 40, 10, 0x67e8f9, 0.95);
    projectile.setDepth(1500);

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

        const baseDmg = Phaser.Math.Between(700, 900);
        const isCrit = Math.random() < 0.15;
        this.targetDummy.applyDamage(isCrit ? Math.round(baseDmg * 1.5) : baseDmg, isCrit, 'holy');
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
    const startX = fromX - 60;
    const startY = fromY - 32;
    const endX = toX + 15;
    const endY = toY - 20;

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
        this.targetDummy.applyDamage(damage, isCrit, 'physical');
      },
    });
  }

  /**
   * Executes the Werratte counter-attack against a living hero (default: Cloud).
   */
  private executeEnemyTurn(): void {
    if (this.targetDummy.currentHp <= 0) {
      this.triggerVictory();
      return;
    }

    const aliveHeroes = [this.cloud, this.barret, this.aerith].filter((h) => !h.isDead);
    if (aliveHeroes.length === 0) {
      this.triggerDefeat();
      return;
    }

    // Default target: Cloud (Vanguard), else first available hero
    const target = aliveHeroes.includes(this.cloud) ? this.cloud : aliveHeroes[0];

    this.updateStatus(`GEGNER-ZUG: Werratte stürmt vor und greift ${target.heroName} an!`);

    this.targetDummy.executeAttack(
      target.x,
      target.y,
      () => {
        // Impact callback: deal damage to target
        const dmg = Phaser.Math.Between(250, 400);
        target.applyDamage(dmg);
        this.updateHudCards();
      },
      () => {
        // Return completed
        const stillAlive = [this.cloud, this.aerith, this.barret].filter((h) => !h.isDead);
        if (stillAlive.length === 0) {
          this.triggerDefeat();
        } else {
          this.currentRound++;
          this.time.delayedCall(450, () => this.startPlayerTurn());
        }
      }
    );
  }

  /**
   * Victory handler: plays win animations on living heroes and displays victory card.
   */
  private triggerVictory(): void {
    this.combatState = 'VICTORY';
    this.roundBannerText.setText('VICTORY! • SIEG!');
    this.roundBannerText.setColor('#4ade80');
    this.updateStatus('SIEG! Die Werratte wurde bezwungen!');

    // Living heroes play authentic FFBE win celebration
    [this.cloud, this.aerith, this.barret].forEach((hero) => {
      if (!hero.isDead) {
        hero.playAnimation('win');
      }
    });

    this.showEndBattleBanner(true);
  }

  /**
   * Defeat handler: displays defeat card.
   */
  private triggerDefeat(): void {
    this.combatState = 'DEFEAT';
    this.roundBannerText.setText('DEFEAT • NIEDERLAGE');
    this.roundBannerText.setColor('#ef4444');
    this.updateStatus('NIEDERLAGE: Alle Helden sind im Kampf gefallen!');

    this.showEndBattleBanner(false);
  }

  /**
   * Displays victory or defeat modal banner.
   */
  private showEndBattleBanner(isVictory: boolean): void {
    if (this.endBattleBanner) {
      this.endBattleBanner.destroy();
    }

    const { width, height } = this.scale;
    const banner = this.add.container(width / 2, height / 2 - 20);
    banner.setDepth(3000);

    const cardWidth = 440;
    const cardHeight = 220;

    // Dimmed background backdrop
    const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.45);
    banner.add(backdrop);

    // Card background
    const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x0f172a, 0.98);
    bg.setStrokeStyle(2, isVictory ? 0xfbbf24 : 0xef4444);

    // Header Title
    const titleText = this.add.text(0, -60, isVictory ? '★ VICTORY! ★' : '☠ DEFEAT ☠', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: isVictory ? '#fbbf24' : '#ef4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    const subText = this.add.text(
      0,
      -15,
      isVictory
        ? `Werratte erfolgreich in ${this.currentRound} Runden besiegt!`
        : 'Deine Party konnte dem Ansturm nicht standhalten...',
      {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#e2e8f0',
      }
    ).setOrigin(0.5);

    // Restart button
    const btnBg = this.add.rectangle(0, 50, 200, 42, isVictory ? 0x15803d : 0x991b1b, 1);
    btnBg.setStrokeStyle(1, 0xffffff);
    btnBg.setInteractive({ useHandCursor: true });

    const btnText = this.add.text(0, 50, isVictory ? 'Erneut kämpfen' : 'Kampf wiederholen', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => btnBg.setScale(1.05));
    btnBg.on('pointerout', () => btnBg.setScale(1.0));
    btnBg.on('pointerdown', () => this.resetBattle());

    banner.add([bg, titleText, subText, btnBg, btnText]);
    this.endBattleBanner = banner;
  }

  /**
   * Resets entire battle to Round 1 full health.
   */
  public resetBattle(): void {
    if (this.endBattleBanner) {
      this.endBattleBanner.destroy();
      this.endBattleBanner = undefined;
    }

    this.currentRound = 1;
    this.cloud.resetCombatState();
    this.aerith.resetCombatState();
    this.barret.resetCombatState();
    this.targetDummy.resetCombat();

    this.startPlayerTurn();
  }

  private updateStatus(msg: string): void {
    if (this.statusText) {
      this.statusText.setText(msg);
    }
  }
}
