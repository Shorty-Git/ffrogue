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

interface PartyRowUi {
  container: Phaser.GameObjects.Container;
  cursorText: Phaser.GameObjects.Text;
  highlightBg: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  roleText: Phaser.GameObjects.Text;
  fgBar: Phaser.GameObjects.Rectangle;
  chipBar: Phaser.GameObjects.Rectangle;
  hpText: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
  chipTween?: Phaser.Tweens.Tween;
  lastHp: number;
}

export class BattleScene extends Phaser.Scene {
  private manifests!: Record<string, UnitManifest>;
  private cloud!: UnitActor;
  private aerith!: UnitActor;
  private barret!: UnitActor;
  private targetDummy!: TargetDummy;

  // Turn-Order State
  private turnOrder: UnitActor[] = [];
  private activeHeroIndex: number = 0;
  private combatState: CombatState = 'PLAYER_TURN';
  private currentRound: number = 1;

  // Header UI
  private roundBannerText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  // Classic JRPG Bottom HUD Elements
  // 1. Left Box: Command Menu
  private cmdHeaderName!: Phaser.GameObjects.Text;
  private cmdHeaderRole!: Phaser.GameObjects.Text;
  private cmdAttackBtnBg!: Phaser.GameObjects.Rectangle;
  private cmdAttackBtnText!: Phaser.GameObjects.Text;
  private cmdModeBtnBg?: Phaser.GameObjects.Rectangle;
  private cmdModeBtnText?: Phaser.GameObjects.Text;

  // 2. Right Box: Party Status
  private partyRows: Map<string, PartyRowUi> = new Map();
  private readonly rowBarWidth = 260;
  private readonly rowBarHeight = 10;

  // End of Battle Modal
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

    // 2. Party & Enemy Combat Grids
    this.createCombatGrids();

    // 3. Target Dummy (Werratte) on Back-Mid (220, 360)
    this.targetDummy = new TargetDummy(this, 220, 360, this.manifests.training_dummy);

    // 4. Instantiate Party Units
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
    this.cloud.on('pointerdown', () => {
      if (this.getActiveHero() === this.cloud) {
        this.executeActiveHeroAttack();
      }
    });

    // Aerith: Back-Top (1040, 220) - Healer (2.100 HP)
    this.aerith = new UnitActor(this, 1040, 220, 'aerith', this.manifests.aerith, {
      maxHp: 2100,
      heroName: 'AERITH',
      heroRole: 'HEALER',
      attackType: 'melee', // default: staff melee strike
      targetOffsetX: 200,
      attackAnim: 'atk',
      hitFrameIndex: 19,
    });
    this.aerith.setScale(2.5);
    this.aerith.setFacingLeft(true);
    this.aerith.setInteractive({ useHandCursor: true });
    this.aerith.on('pointerdown', () => {
      if (this.getActiveHero() === this.aerith) {
        this.executeActiveHeroAttack();
      }
    });

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
    this.barret.on('pointerdown', () => {
      if (this.getActiveHero() === this.barret) {
        this.executeActiveHeroAttack();
      }
    });

    // Strict sequential turn order: Cloud -> Aerith -> Barret
    this.turnOrder = [this.cloud, this.aerith, this.barret];

    // 5. Header UI
    this.createHeaderUI(width);

    // 6. Classic JRPG Bottom HUD
    this.createClassicJRPGHud(width, height);

    // 7. Global Keyboard Controls (Space / Enter triggers active hero attack)
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.combatState === 'PLAYER_TURN') {
        this.executeActiveHeroAttack();
      }
    });
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.combatState === 'PLAYER_TURN') {
        this.executeActiveHeroAttack();
      }
    });

    // 8. Start Battle at Round 1
    this.startRound();
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

    // Enemy Slot (Left, Back-Mid)
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

    this.roundBannerText = this.add.text(24, 16, 'RUNDE 1 • SPIELER-ZUG', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#38bdf8',
      fontStyle: 'bold',
    }).setDepth(1001);

    this.statusText = this.add.text(24, 36, 'Bereit für Aktionen...', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#94a3b8',
    }).setDepth(1001);

    // Reset Battle Button in Header
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
   * Builds the authentic two-box Final Fantasy JRPG Bottom HUD.
   * Left: Command Menu for active hero.
   * Right: Vertical Party Status list with 2-phase HP bars.
   */
  private createClassicJRPGHud(width: number, height: number): void {
    const panelY = height - 70; // Center at y = 650
    const panelHeight = 135;

    // --- LEFT BOX: BEFEHLSMENÜ (Width: 320px, x: 20 to 340) ---
    const leftW = 320;
    const leftX = 20 + leftW / 2; // 180

    const leftBox = this.add.container(leftX, panelY);
    leftBox.setDepth(1002);

    const leftBg = this.add.rectangle(0, 0, leftW, panelHeight, 0x0f172a, 0.96);
    leftBg.setStrokeStyle(2, 0x0284c7);

    // Header: Active Hero Name & Role
    this.cmdHeaderName = this.add.text(-leftW / 2 + 16, -panelHeight / 2 + 16, '▸ CLOUD', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#38bdf8',
      fontStyle: 'bold',
    });

    this.cmdHeaderRole = this.add.text(-leftW / 2 + 115, -panelHeight / 2 + 18, '[VANGUARD]', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#64748b',
    });

    // Aerith Mode Switch Pill (visible when Aerith is active)
    this.cmdModeBtnBg = this.add.rectangle(leftW / 2 - 55, -panelHeight / 2 + 24, 88, 20, 0x1e293b, 0.95);
    this.cmdModeBtnBg.setStrokeStyle(1, 0xf472b6);
    this.cmdModeBtnBg.setInteractive({ useHandCursor: true });
    this.cmdModeBtnBg.on('pointerdown', () => this.toggleAerithMode());
    this.cmdModeBtnBg.setVisible(false);

    this.cmdModeBtnText = this.add.text(leftW / 2 - 55, -panelHeight / 2 + 24, 'Nahkampf ▾', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#f472b6',
    }).setOrigin(0.5);
    this.cmdModeBtnText.setVisible(false);

    // Button 1: [ANGRIFF] (Active)
    const btnW = leftW - 32;
    const btnH = 34;

    this.cmdAttackBtnBg = this.add.rectangle(0, -6, btnW, btnH, 0x0284c7, 0.95);
    this.cmdAttackBtnBg.setStrokeStyle(1, 0x38bdf8);
    this.cmdAttackBtnBg.setInteractive({ useHandCursor: true });

    this.cmdAttackBtnText = this.add.text(0, -6, '⚡ ANGRIFF (Leertaste)', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.cmdAttackBtnBg.on('pointerover', () => {
      if (this.combatState === 'PLAYER_TURN') {
        this.cmdAttackBtnBg.setStrokeStyle(2, 0xffffff);
      }
    });
    this.cmdAttackBtnBg.on('pointerout', () => {
      this.cmdAttackBtnBg.setStrokeStyle(1, 0x38bdf8);
    });
    this.cmdAttackBtnBg.on('pointerdown', () => {
      if (this.combatState === 'PLAYER_TURN') {
        this.executeActiveHeroAttack();
      }
    });

    // Button 2 & 3: Disabled Placeholders [FÄHIGKEIT] & [ABWEHR]
    const subBtnW = (btnW - 8) / 2;
    const subBtnY = 32;

    const skillBg = this.add.rectangle(-subBtnW / 2 - 4, subBtnY, subBtnW, 28, 0x1e293b, 0.6);
    skillBg.setStrokeStyle(1, 0x334155);
    const skillText = this.add.text(-subBtnW / 2 - 4, subBtnY, '✦ FÄHIGKEIT', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#64748b',
    }).setOrigin(0.5);

    const guardBg = this.add.rectangle(subBtnW / 2 + 4, subBtnY, subBtnW, 28, 0x1e293b, 0.6);
    guardBg.setStrokeStyle(1, 0x334155);
    const guardText = this.add.text(subBtnW / 2 + 4, subBtnY, '🛡 ABWEHR', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#64748b',
    }).setOrigin(0.5);

    leftBox.add([
      leftBg,
      this.cmdHeaderName,
      this.cmdHeaderRole,
      this.cmdModeBtnBg,
      this.cmdModeBtnText,
      this.cmdAttackBtnBg,
      this.cmdAttackBtnText,
      skillBg,
      skillText,
      guardBg,
      guardText,
    ]);

    // --- RIGHT BOX: PARTY STATUS (Width: 900px, x: 360 to 1260) ---
    const rightW = width - leftW - 60; // 1280 - 320 - 60 = 900
    const rightX = leftW + 40 + rightW / 2; // 360 + 450 = 810

    const rightBox = this.add.container(rightX, panelY);
    rightBox.setDepth(1002);

    const rightBg = this.add.rectangle(0, 0, rightW, panelHeight, 0x0f172a, 0.96);
    rightBg.setStrokeStyle(2, 0x334155);
    rightBox.add(rightBg);

    // 3 Vertical Rows: Cloud (y: -36), Aerith (y: 0), Barret (y: +36)
    const rowYOffsets = [-38, 0, 38];

    this.turnOrder.forEach((hero, idx) => {
      const rowY = rowYOffsets[idx];
      const rowContainer = this.add.container(0, rowY);

      // Row background highlight (active state glow)
      const highlightBg = this.add.rectangle(0, 0, rightW - 20, 32, 0x0284c7, 0.15);
      highlightBg.setStrokeStyle(1, 0x38bdf8, 0.4);
      highlightBg.setVisible(false);

      // Interactive row click triggers active hero attack if clicked
      highlightBg.setInteractive({ useHandCursor: true });
      highlightBg.on('pointerdown', () => {
        if (this.getActiveHero() === hero && this.combatState === 'PLAYER_TURN') {
          this.executeActiveHeroAttack();
        }
      });

      // Cursor arrow
      const cursorText = this.add.text(-rightW / 2 + 20, 0, '▸', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#38bdf8',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5).setVisible(false);

      // Hero Name
      const nameText = this.add.text(-rightW / 2 + 42, 0, hero.heroName, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#f8fafc',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);

      // Hero Role
      const roleText = this.add.text(-rightW / 2 + 130, 0, `[${hero.heroRole}]`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#64748b',
      }).setOrigin(0, 0.5);

      // 2-Phase HP Bar
      const barX = -rightW / 2 + 240;
      const barBg = this.add.rectangle(barX + this.rowBarWidth / 2, 0, this.rowBarWidth + 4, this.rowBarHeight + 4, 0x1e293b, 1);
      barBg.setStrokeStyle(1, 0x334155);

      const chipBar = this.add.rectangle(barX, 0, this.rowBarWidth, this.rowBarHeight, 0xfbbf24).setOrigin(0, 0.5);
      const fgBar = this.add.rectangle(barX, 0, this.rowBarWidth, this.rowBarHeight, 0x22c55e).setOrigin(0, 0.5);

      // Numeric HP Text
      const hpText = this.add.text(barX + this.rowBarWidth + 18, 0, `${hero.currentHp.toLocaleString()} / ${hero.maxHp.toLocaleString()} HP`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#cbd5e1',
      }).setOrigin(0, 0.5);

      // Status Badge
      const statusText = this.add.text(rightW / 2 - 30, 0, 'BEREIT', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#94a3b8',
        fontStyle: 'bold',
      }).setOrigin(1, 0.5);

      rowContainer.add([
        highlightBg,
        cursorText,
        nameText,
        roleText,
        barBg,
        chipBar,
        fgBar,
        hpText,
        statusText,
      ]);

      rightBox.add(rowContainer);

      this.partyRows.set(hero.unitKey, {
        container: rowContainer,
        cursorText,
        highlightBg,
        nameText,
        roleText,
        fgBar,
        chipBar,
        hpText,
        statusText,
        lastHp: hero.maxHp,
      });
    });
  }

  private toggleAerithMode(): void {
    if (this.getActiveHero() !== this.aerith || this.combatState !== 'PLAYER_TURN') return;

    if (this.aerith.combatConfig.attackType === 'melee') {
      this.aerith.combatConfig = {
        attackType: 'ranged',
        targetOffsetX: 0,
        attackAnim: 'magic_atk',
        hitFrameIndex: 2,
      };
      if (this.cmdModeBtnText) this.cmdModeBtnText.setText('Zauber ▾');
      this.updateStatus('Aerith-Modus: Zauber / Heiliges Licht (700-900 Schaden)');
    } else {
      this.aerith.combatConfig = {
        attackType: 'melee',
        targetOffsetX: 200,
        attackAnim: 'atk',
        hitFrameIndex: 19,
      };
      if (this.cmdModeBtnText) this.cmdModeBtnText.setText('Nahkampf ▾');
      this.updateStatus('Aerith-Modus: Basis-Nahkampf (180-260 Schaden)');
    }
  }

  private getActiveHero(): UnitActor | undefined {
    return this.turnOrder[this.activeHeroIndex];
  }

  /**
   * Starts a new combat round: resets living heroes' action flags and selects first alive hero.
   */
  private startRound(): void {
    if (this.targetDummy.currentHp <= 0) {
      this.triggerVictory();
      return;
    }

    const aliveHeroes = this.turnOrder.filter((h) => !h.isDead);
    if (aliveHeroes.length === 0) {
      this.triggerDefeat();
      return;
    }

    // Reset action flags
    aliveHeroes.forEach((h) => (h.hasActed = false));

    // Find first alive hero index (starts at Cloud = 0)
    let firstAliveIdx = 0;
    while (firstAliveIdx < this.turnOrder.length && this.turnOrder[firstAliveIdx].isDead) {
      firstAliveIdx++;
    }

    this.activeHeroIndex = firstAliveIdx;
    this.combatState = 'PLAYER_TURN';

    this.roundBannerText.setText(`RUNDE ${this.currentRound} • SPIELER-ZUG`);
    this.roundBannerText.setColor('#38bdf8');

    this.updateCommandMenu();
    this.updatePartyStatusUi();
    this.updateStatus(`Runde ${this.currentRound}: ${this.getActiveHero()?.heroName} ist am Zug! [ANGRIFF] drücken.`);
  }

  /**
   * Advances the turn pointer to the next living hero who hasn't acted yet.
   * If all living heroes have acted, advances to enemy turn.
   */
  private advanceToNextHero(): void {
    if (this.targetDummy.currentHp <= 0) {
      this.triggerVictory();
      return;
    }

    // Find next alive hero that hasn't acted
    let nextIdx = this.activeHeroIndex + 1;
    while (nextIdx < this.turnOrder.length) {
      const hero = this.turnOrder[nextIdx];
      if (!hero.isDead && !hero.hasActed) {
        break;
      }
      nextIdx++;
    }

    if (nextIdx < this.turnOrder.length) {
      // Next hero found
      this.activeHeroIndex = nextIdx;
      this.combatState = 'PLAYER_TURN';
      this.updateCommandMenu();
      this.updatePartyStatusUi();
      this.updateStatus(`Nächster Held: ${this.getActiveHero()?.heroName} ist am Zug!`);
    } else {
      // All living heroes have acted this round -> Enemy turn!
      this.combatState = 'ENEMY_TURN';
      this.roundBannerText.setText(`RUNDE ${this.currentRound} • GEGNER-ZUG`);
      this.roundBannerText.setColor('#f87171');
      this.updateCommandMenu();
      this.updatePartyStatusUi();
      this.updateStatus('Alle Helden haben gehandelt! Werratte stürmt vor...');
      this.time.delayedCall(450, () => this.executeEnemyTurn());
    }
  }

  /**
   * Updates the Left Command Menu based on active hero and combat state.
   */
  private updateCommandMenu(): void {
    const hero = this.getActiveHero();

    if (this.combatState === 'PLAYER_TURN' && hero && !hero.isDead && !hero.hasActed) {
      // Hero active
      this.cmdHeaderName.setText(`▸ ${hero.heroName}`);
      let color = '#38bdf8';
      if (hero === this.aerith) color = '#f472b6';
      else if (hero === this.barret) color = '#fbbf24';
      this.cmdHeaderName.setColor(color);
      this.cmdHeaderRole.setText(`[${hero.heroRole}]`);

      // Aerith mode button
      const isAerith = hero === this.aerith;
      this.cmdModeBtnBg?.setVisible(isAerith);
      this.cmdModeBtnText?.setVisible(isAerith);
      if (isAerith && this.cmdModeBtnText) {
        this.cmdModeBtnText.setText(hero.combatConfig.attackType === 'ranged' ? 'Zauber ▾' : 'Nahkampf ▾');
      }

      // Attack button enabled
      this.cmdAttackBtnBg.fillColor = 0x0284c7;
      this.cmdAttackBtnBg.setStrokeStyle(1, 0x38bdf8);
      this.cmdAttackBtnText.setText(hero === this.barret ? '⚡ SALVE (Leertaste)' : '⚡ ANGRIFF (Leertaste)');
      this.cmdAttackBtnText.setColor('#ffffff');
    } else {
      // Hero attacking or Enemy turn
      if (this.combatState === 'ENEMY_TURN') {
        this.cmdHeaderName.setText('▸ GEGNER');
        this.cmdHeaderName.setColor('#f87171');
        this.cmdHeaderRole.setText('[WERRATTE]');
      }
      this.cmdModeBtnBg?.setVisible(false);
      this.cmdModeBtnText?.setVisible(false);

      // Disable attack button
      this.cmdAttackBtnBg.fillColor = 0x1e293b;
      this.cmdAttackBtnBg.setStrokeStyle(1, 0x475569);
      this.cmdAttackBtnText.setText(this.combatState === 'HERO_ATTACKING' ? 'AKTION LÄUFT...' : 'GEGNER-PHASE');
      this.cmdAttackBtnText.setColor('#64748b');
    }
  }

  /**
   * Refreshes all 3 rows in the Right Party Status box with cursor, highlights, and 2-phase HP.
   */
  private updatePartyStatusUi(): void {
    const activeHero = this.getActiveHero();

    this.turnOrder.forEach((hero) => {
      const row = this.partyRows.get(hero.unitKey);
      if (!row) return;

      const isActive = this.combatState === 'PLAYER_TURN' && hero === activeHero && !hero.isDead && !hero.hasActed;

      // 1. Cursor & Row Highlight
      row.cursorText.setVisible(isActive);
      row.highlightBg.setVisible(isActive);

      if (isActive) {
        row.nameText.setColor('#38bdf8');
      } else if (hero.isDead) {
        row.nameText.setColor('#64748b');
      } else {
        row.nameText.setColor('#f8fafc');
      }

      // 2. 2-Phase HP Bar
      const pct = Math.max(0, hero.currentHp / hero.maxHp);
      const targetWidth = this.rowBarWidth * pct;

      // Immediate Foreground Bar
      row.fgBar.width = targetWidth;
      if (pct > 0.5) row.fgBar.fillColor = 0x22c55e;
      else if (pct > 0.25) row.fgBar.fillColor = 0xf59e0b;
      else row.fgBar.fillColor = 0xef4444;

      // Delayed Chip-Damage Bar (catches up after 200ms)
      if (hero.currentHp < row.lastHp) {
        if (row.chipTween) row.chipTween.stop();
        this.time.delayedCall(200, () => {
          row.chipTween = this.tweens.add({
            targets: row.chipBar,
            width: targetWidth,
            duration: 400,
            ease: 'Cubic.easeOut',
          });
        });
        row.lastHp = hero.currentHp;
      } else {
        row.chipBar.width = targetWidth;
        row.lastHp = hero.currentHp;
      }

      // Numeric HP text
      row.hpText.setText(`${hero.currentHp.toLocaleString()} / ${hero.maxHp.toLocaleString()} HP`);

      // 3. Status text
      if (hero.isDead) {
        row.statusText.setText('K.O.');
        row.statusText.setColor('#ef4444');
      } else if (hero.hasActed) {
        row.statusText.setText('GEHANDELT');
        row.statusText.setColor('#475569');
      } else if (isActive) {
        row.statusText.setText('AM ZUG');
        row.statusText.setColor('#38bdf8');
      } else {
        row.statusText.setText('BEREIT');
        row.statusText.setColor('#94a3b8');
      }
    });
  }

  /**
   * Executes the active hero's attack and then advances the turn.
   */
  public executeActiveHeroAttack(): void {
    if (this.combatState !== 'PLAYER_TURN') return;
    const hero = this.getActiveHero();
    if (!hero || hero.isDead || hero.hasActed) return;

    this.combatState = 'HERO_ATTACKING';
    this.updateCommandMenu();

    const row = this.partyRows.get(hero.unitKey);
    if (row) {
      row.statusText.setText('GREIFT AN...');
      row.statusText.setColor('#fbbf24');
    }

    this.executeHeroSequence(hero, () => {
      hero.hasActed = true;
      this.updatePartyStatusUi();

      // Check Victory
      if (this.targetDummy.currentHp <= 0) {
        this.triggerVictory();
        return;
      }

      // Advance to next hero
      this.advanceToNextHero();
    });
  }

  /**
   * Executes the individual animation and movement sequence of a hero.
   */
  private executeHeroSequence(hero: UnitActor, onComplete: () => void): void {
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
   * Werratte executes counter-attack on live target (Cloud first, else Barret/Aerith).
   */
  private executeEnemyTurn(): void {
    if (this.targetDummy.currentHp <= 0) {
      this.triggerVictory();
      return;
    }

    const aliveHeroes = this.turnOrder.filter((h) => !h.isDead);
    if (aliveHeroes.length === 0) {
      this.triggerDefeat();
      return;
    }

    const target = aliveHeroes.includes(this.cloud) ? this.cloud : aliveHeroes[0];
    this.updateStatus(`GEGNER-ZUG: Werratte stürmt vor und greift ${target.heroName} an!`);

    this.targetDummy.executeAttack(
      target.x,
      target.y,
      () => {
        // Impact
        const dmg = Phaser.Math.Between(250, 400);
        target.applyDamage(dmg);
        this.updatePartyStatusUi();
      },
      () => {
        // Return completed
        const stillAlive = this.turnOrder.filter((h) => !h.isDead);
        if (stillAlive.length === 0) {
          this.triggerDefeat();
        } else {
          this.currentRound++;
          this.time.delayedCall(450, () => this.startRound());
        }
      }
    );
  }

  private triggerVictory(): void {
    this.combatState = 'VICTORY';
    this.roundBannerText.setText('VICTORY! • SIEG!');
    this.roundBannerText.setColor('#4ade80');
    this.updateStatus('SIEG! Die Werratte wurde bezwungen!');

    // Living heroes play victory celebration
    this.turnOrder.forEach((hero) => {
      if (!hero.isDead) {
        hero.playAnimation('win');
      }
    });

    this.showEndBattleBanner(true);
  }

  private triggerDefeat(): void {
    this.combatState = 'DEFEAT';
    this.roundBannerText.setText('DEFEAT • NIEDERLAGE');
    this.roundBannerText.setColor('#ef4444');
    this.updateStatus('NIEDERLAGE: Alle Helden sind im Kampf gefallen!');

    this.showEndBattleBanner(false);
  }

  private showEndBattleBanner(isVictory: boolean): void {
    if (this.endBattleBanner) {
      this.endBattleBanner.destroy();
    }

    const { width, height } = this.scale;
    const banner = this.add.container(width / 2, height / 2 - 20);
    banner.setDepth(3000);

    const cardWidth = 440;
    const cardHeight = 220;

    const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.45);
    banner.add(backdrop);

    const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x0f172a, 0.98);
    bg.setStrokeStyle(2, isVictory ? 0xfbbf24 : 0xef4444);

    const titleText = this.add.text(0, -60, isVictory ? '★ VICTORY! ★' : '☠ DEFEAT ☠', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: isVictory ? '#fbbf24' : '#ef4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);

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

  public resetBattle(): void {
    if (this.endBattleBanner) {
      this.endBattleBanner.destroy();
      this.endBattleBanner = undefined;
    }

    this.currentRound = 1;
    this.turnOrder.forEach((hero) => hero.resetCombatState());
    this.targetDummy.resetCombat();

    this.startRound();
  }

  private updateStatus(msg: string): void {
    if (this.statusText) {
      this.statusText.setText(msg);
    }
  }
}
