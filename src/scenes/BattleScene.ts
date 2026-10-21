import Phaser from 'phaser';
import { UnitActor } from '../entities/UnitActor';
import { TargetDummy } from '../entities/TargetDummy';
import { UnitManifest } from '../types/manifest';
import { SkillConfig, UnitSkillsData } from '../types/skills';

export type CombatState =
  | 'PLAYER_TURN'
  | 'HERO_ATTACKING'
  | 'ENEMY_TURN'
  | 'VICTORY'
  | 'DEFEAT';

interface SkillBtnUi {
  bg: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  tagText: Phaser.GameObjects.Text;
  skill: SkillConfig | null;
}

interface PartyRowUi {
  container: Phaser.GameObjects.Container;
  cursorText: Phaser.GameObjects.Text;
  highlightBg: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  roleText: Phaser.GameObjects.Text;
  fgBar: Phaser.GameObjects.Rectangle;
  chipBar: Phaser.GameObjects.Rectangle;
  hpText: Phaser.GameObjects.Text;
  mpBarBg: Phaser.GameObjects.Rectangle;
  mpFgBar: Phaser.GameObjects.Rectangle;
  mpText: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
  chipTween?: Phaser.Tweens.Tween;
  lastHp: number;
}

interface RewardCardData {
  id: 'cloud_buff' | 'aerith_buff' | 'party_heal';
  category: string;
  categoryColor: string;
  title: string;
  target: string;
  desc: string;
  icon: string;
}

export interface EnemySlotConfig {
  x: number;
  y: number;
  hp: number;
  nameTag: string;
  isBoss: boolean;
}

export const ENCOUNTERS: Record<number, EnemySlotConfig[]> = {
  1: [
    { x: 220, y: 360, hp: 5000, nameTag: 'DIRE RAT (BOSS)', isBoss: true },
  ],
  2: [
    { x: 400, y: 220, hp: 3500, nameTag: 'DIRE RAT A', isBoss: false },
    { x: 400, y: 500, hp: 3500, nameTag: 'DIRE RAT B', isBoss: false },
  ],
};

export class BattleScene extends Phaser.Scene {
  private manifests!: Record<string, UnitManifest>;
  private cloud!: UnitActor;
  private aerith!: UnitActor;
  private barret!: UnitActor;
  private enemies: TargetDummy[] = [];
  private currentTarget: TargetDummy | null = null;
  private targetMarkerContainer!: Phaser.GameObjects.Container;
  private markerVisual!: Phaser.GameObjects.Container;
  private victoryTriggered: boolean = false;

  public get targetDummy(): TargetDummy {
    return this.currentTarget ?? this.enemies[0];
  }

  // Turn-Order State
  private turnOrder: UnitActor[] = [];
  private activeHeroIndex: number = 0;
  private combatState: CombatState = 'PLAYER_TURN';
  private currentRound: number = 1;

  // Roguelike Run Stats & Multipliers
  private fightNumber: number = 1;
  private readonly totalFights: number = 6;
  private cloudDmgMultiplier: number = 1.0;
  private aerithMagicMultiplier: number = 1.0;

  // Header UI
  private roundBannerText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  // Bottom JRPG HUD Master Container (for smooth slide-in / slide-out)
  private bottomHudContainer!: Phaser.GameObjects.Container;

  // 1. Left Box: Command Menu
  private cmdHeaderName!: Phaser.GameObjects.Text;
  private cmdHeaderRole!: Phaser.GameObjects.Text;
  private cmdModeBtnBg?: Phaser.GameObjects.Rectangle;
  private cmdModeBtnText?: Phaser.GameObjects.Text;

  // Sub-Menu Navigation
  private isSkillMenuOpen: boolean = false;
  private cmdMainContainer!: Phaser.GameObjects.Container;
  private cmdSkillContainer!: Phaser.GameObjects.Container;
  private cmdAttackBtnBg!: Phaser.GameObjects.Rectangle;
  private cmdAttackBtnText!: Phaser.GameObjects.Text;
  private cmdSkillBtnBg!: Phaser.GameObjects.Rectangle;
  private cmdSkillBtnText!: Phaser.GameObjects.Text;
  private skillButtons: SkillBtnUi[] = [];
  private cmdSkillBackBtnBg!: Phaser.GameObjects.Rectangle;
  private cmdSkillBackBtnText!: Phaser.GameObjects.Text;

  // Authentic Hero Skills
  private unitSkills: Record<string, SkillConfig[]> = {};

  // 2. Right Box: Party Status
  private partyRows: Map<string, PartyRowUi> = new Map();
  private readonly rowBarWidth = 260;

  // PokeRogue Reward Selection Container
  private rewardsContainer?: Phaser.GameObjects.Container;
  private nextFightBtn?: Phaser.GameObjects.Container;

  // Defeat Modal (only for game over)
  private defeatBanner?: Phaser.GameObjects.Container;

  constructor() {
    super('BattleScene');
  }

  init(data: { manifests: Record<string, UnitManifest> }): void {
    this.manifests = data.manifests;
  }

  create(): void {
    const { width, height } = this.scale;

    // Load preloaded unit skills from JSON cache
    ['cloud', 'aerith', 'barret'].forEach((key) => {
      const data = this.cache.json.get(`skills_${key}`) as UnitSkillsData;
      if (data && Array.isArray(data.skills)) {
        this.unitSkills[key] = data.skills;
      } else {
        this.unitSkills[key] = [];
      }
    });

    // 1. Arena Background
    this.createArenaBackground(width, height);

    // 2. Combat Grids (Floor Slots)
    this.createCombatGrids();

    // 3. Target Marker for interactive selection
    this.createTargetMarker();

    // Listen for enemy clicks on the battlefield
    this.events.on('enemy_clicked', (enemy: TargetDummy) => {
      if (this.combatState === 'PLAYER_TURN' && enemy.currentHp > 0) {
        this.setTarget(enemy, true);
        this.updateStatus(`Target selected: ${enemy.nameTag} (${enemy.currentHp} HP)`);
      }
    });

    // 4. Instantiate Party Units
    // Cloud: Front-Mid (880, 360) - Vanguard (3.200 HP, 100 MP)
    this.cloud = new UnitActor(this, 880, 360, 'cloud', this.manifests.cloud, {
      maxHp: 3200,
      maxMp: 100,
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

    // Aerith: Back-Top (1040, 220) - Healer (2.100 HP, 220 MP)
    this.aerith = new UnitActor(this, 1040, 220, 'aerith', this.manifests.aerith, {
      maxHp: 2100,
      maxMp: 220,
      heroName: 'AERITH',
      heroRole: 'HEALER',
      attackType: 'melee', // default: staff strike
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

    // Barret: Back-Bot (1040, 500) - Tank / Gunner (4.500 HP, 80 MP)
    this.barret = new UnitActor(this, 1040, 500, 'barret', this.manifests.barret, {
      maxHp: 4500,
      maxMp: 80,
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

    // 6. Classic Final Fantasy Deep-Navy Bottom HUD
    this.createClassicJRPGHud(width, height);

    // 7. Global Keyboard Controls (Space / Enter triggers active action, 1/2/3 triggers skill, Esc cancels)
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.combatState === 'PLAYER_TURN') {
        if (this.isSkillMenuOpen) {
          this.executeFirstAvailableSkill();
        } else {
          this.executeActiveHeroAttack();
        }
      }
    });
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.combatState === 'PLAYER_TURN') {
        if (this.isSkillMenuOpen) {
          this.executeFirstAvailableSkill();
        } else {
          this.executeActiveHeroAttack();
        }
      }
    });
    this.input.keyboard?.on('keydown-ONE', () => this.tryExecuteSkillByIndex(0));
    this.input.keyboard?.on('keydown-TWO', () => this.tryExecuteSkillByIndex(1));
    this.input.keyboard?.on('keydown-THREE', () => this.tryExecuteSkillByIndex(2));
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.combatState === 'PLAYER_TURN' && this.isSkillMenuOpen) {
        this.closeSkillSubMenu();
      }
    });
    this.input.keyboard?.on('keydown-BACKSPACE', () => {
      if (this.combatState === 'PLAYER_TURN' && this.isSkillMenuOpen) {
        this.closeSkillSubMenu();
      }
    });

    // 8. Start Battle 1: Materialize encounter 1, then unlocks Round 1!
    this.spawnEncounter(1, () => {
      this.startRound();
    });
  }

  update(): void {
    // Dynamic Y-depth sorting
    if (this.cloud) this.cloud.updateDepth();
    if (this.aerith) this.aerith.updateDepth();
    if (this.barret) this.barret.updateDepth();
    this.enemies.forEach((e) => {
      if (e.visible) e.updateDepth();
    });
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

    // Enemy Slot (Left)
    const enemySlots = [
      { x: 220, y: 360, label: 'Back-Mid (Boss-Slot)', isBoss: true },
      { x: 400, y: 220, label: 'Front-Top (Enemy 1)', isBoss: false },
      { x: 400, y: 500, label: 'Front-Bot (Enemy 2)', isBoss: false },
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
    const headerBg = this.add.rectangle(width / 2, 28, width, 56, 0x071126, 0.92);
    headerBg.setStrokeStyle(1.5, 0x1e3a8a);
    headerBg.setDepth(1000);

    this.roundBannerText = this.add.text(24, 16, `BATTLE ${this.fightNumber}/${this.totalFights} • ROUND 1`, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#38bdf8',
      fontStyle: 'bold',
    }).setDepth(1001);

    this.statusText = this.add.text(24, 36, 'Ready for action...', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#94a3b8',
    }).setDepth(1001);

    // Reset Battle Button in Header
    const resetBtn = this.createHeaderButton(width - 95, 28, 'Reset Battle', () => {
      this.resetBattle();
    });
    resetBtn.setDepth(1001);
  }

  private createHeaderButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 110, 30, 0x0c204c, 0.95);
    bg.setStrokeStyle(1.5, 0xe2e8f0);
    bg.setInteractive({ useHandCursor: true });

    const txt = this.add.text(0, 0, label, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#cbd5e1',
    }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setStrokeStyle(2, 0xfbbf24));
    bg.on('pointerout', () => bg.setStrokeStyle(1.5, 0xe2e8f0));
    bg.on('pointerdown', onClick);

    container.add([bg, txt]);
    return container;
  }

  /**
   * Builds the authentic two-box Final Fantasy JRPG Bottom HUD.
   * Features classic deep-navy gradient with crisp silver double border lines.
   */
  private createClassicJRPGHud(width: number, height: number): void {
    this.bottomHudContainer = this.add.container(0, 0);
    this.bottomHudContainer.setDepth(1002);

    const panelY = height - 70; // Center at y = 650
    const panelHeight = 135;

    // --- LEFT BOX: COMMAND MENU (Width: 320px, x: 20 to 340) ---
    const leftW = 320;
    const leftX = 20 + leftW / 2; // 180

    const leftBox = this.add.container(leftX, panelY);

    // Classic Final Fantasy Deep-Navy Gradient with fine silver double border
    const leftG = this.add.graphics();
    leftG.fillGradientStyle(0x0c204c, 0x0c204c, 0x050d22, 0x050d22, 0.98);
    leftG.fillRoundedRect(-leftW / 2, -panelHeight / 2, leftW, panelHeight, 6);
    leftG.lineStyle(1.5, 0xe2e8f0, 0.85);
    leftG.strokeRoundedRect(-leftW / 2, -panelHeight / 2, leftW, panelHeight, 6);
    leftG.lineStyle(1, 0x1e3a8a, 0.6);
    leftG.strokeRoundedRect(-leftW / 2 + 3, -panelHeight / 2 + 3, leftW - 6, panelHeight - 6, 4);

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
      color: '#94a3b8',
    });

    // Aerith Mode Switch Pill (visible when Aerith is active)
    this.cmdModeBtnBg = this.add.rectangle(leftW / 2 - 55, -panelHeight / 2 + 24, 88, 20, 0x0e2454, 0.95);
    this.cmdModeBtnBg.setStrokeStyle(1, 0xf472b6);
    this.cmdModeBtnBg.setInteractive({ useHandCursor: true });
    this.cmdModeBtnBg.on('pointerdown', () => this.toggleAerithMode());
    this.cmdModeBtnBg.setVisible(false);

    this.cmdModeBtnText = this.add.text(leftW / 2 - 55, -panelHeight / 2 + 24, 'Melee ▾', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#f472b6',
    }).setOrigin(0.5);
    this.cmdModeBtnText.setVisible(false);

    // Button 1: [ATTACK] (Active - Royal Blue with silver border)
    const btnW = leftW - 32;
    const btnH = 34;

    this.cmdMainContainer = this.add.container(0, 0);

    this.cmdAttackBtnBg = this.add.rectangle(0, -6, btnW, btnH, 0x1d4ed8, 0.95);
    this.cmdAttackBtnBg.setStrokeStyle(1.5, 0xe2e8f0);
    this.cmdAttackBtnBg.setInteractive({ useHandCursor: true });

    this.cmdAttackBtnText = this.add.text(0, -6, '⚡ ATTACK (Space)', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.cmdAttackBtnBg.on('pointerover', () => {
      if (this.combatState === 'PLAYER_TURN') {
        this.cmdAttackBtnBg.setStrokeStyle(2, 0xfbbf24);
      }
    });
    this.cmdAttackBtnBg.on('pointerout', () => {
      this.cmdAttackBtnBg.setStrokeStyle(1.5, 0xe2e8f0);
    });
    this.cmdAttackBtnBg.on('pointerdown', () => {
      if (this.combatState === 'PLAYER_TURN') {
        this.executeActiveHeroAttack();
      }
    });

    // Button 2 & 3: [SKILL] & [DEFEND]
    const subBtnW = (btnW - 8) / 2;
    const subBtnY = 32;

    this.cmdSkillBtnBg = this.add.rectangle(-subBtnW / 2 - 4, subBtnY, subBtnW, 28, 0x2563eb, 0.9);
    this.cmdSkillBtnBg.setStrokeStyle(1, 0xe2e8f0, 0.8);
    this.cmdSkillBtnBg.setInteractive({ useHandCursor: true });

    this.cmdSkillBtnText = this.add.text(-subBtnW / 2 - 4, subBtnY, '✦ SKILL', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.cmdSkillBtnBg.on('pointerover', () => {
      if (this.combatState === 'PLAYER_TURN') {
        this.cmdSkillBtnBg.setStrokeStyle(2, 0xfbbf24);
      }
    });
    this.cmdSkillBtnBg.on('pointerout', () => {
      this.cmdSkillBtnBg.setStrokeStyle(1, 0xe2e8f0, 0.8);
    });
    this.cmdSkillBtnBg.on('pointerdown', () => {
      if (this.combatState === 'PLAYER_TURN') {
        this.openSkillSubMenu();
      }
    });

    const guardBg = this.add.rectangle(subBtnW / 2 + 4, subBtnY, subBtnW, 28, 0x081530, 0.7);
    guardBg.setStrokeStyle(1, 0x1e3a8a, 0.5);
    const guardText = this.add.text(subBtnW / 2 + 4, subBtnY, '🛡 DEFEND', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#64748b',
    }).setOrigin(0.5);

    this.cmdMainContainer.add([
      this.cmdAttackBtnBg,
      this.cmdAttackBtnText,
      this.cmdSkillBtnBg,
      this.cmdSkillBtnText,
      guardBg,
      guardText,
    ]);

    // Sub-Menu Container: Dynamic Multi-Skill Sub-Menu
    this.cmdSkillContainer = this.add.container(0, 0);
    this.cmdSkillContainer.setVisible(false);

    this.skillButtons = [];
    const skillBtnW = btnW;
    const skillBtnH = 22;
    const rowYPositions = [-27, -2, 23];

    for (let i = 0; i < 3; i++) {
      const y = rowYPositions[i];
      const bg = this.add.rectangle(0, y, skillBtnW, skillBtnH, 0x2563eb, 0.95);
      bg.setStrokeStyle(1.2, 0xe2e8f0, 0.85);
      bg.setInteractive({ useHandCursor: true });

      const nameText = this.add.text(-skillBtnW / 2 + 10, y, `✦ Skill ${i + 1}`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);

      const tagText = this.add.text(skillBtnW / 2 - 10, y, `[0 MP]`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#93c5fd',
      }).setOrigin(1, 0.5);

      const btnUi: SkillBtnUi = { bg, nameText, tagText, skill: null };
      this.skillButtons.push(btnUi);

      bg.on('pointerover', () => {
        if (btnUi.skill && this.combatState === 'PLAYER_TURN' && this.getActiveHero()?.currentMp! >= btnUi.skill.mpCost) {
          bg.setStrokeStyle(2, 0xfbbf24);
          this.updateStatus(`${btnUi.skill.name}: ${btnUi.skill.desc} (${btnUi.skill.scope}, ${btnUi.skill.mpCost} MP)`);
        }
      });
      bg.on('pointerout', () => {
        if (btnUi.skill && this.getActiveHero()?.currentMp! >= btnUi.skill.mpCost) {
          bg.setStrokeStyle(1.2, 0xe2e8f0, 0.85);
        }
      });
      bg.on('pointerdown', () => {
        if (this.combatState === 'PLAYER_TURN' && btnUi.skill) {
          this.executeSkillChoice(btnUi.skill);
        }
      });

      this.cmdSkillContainer.add([bg, nameText, tagText]);
    }

    this.cmdSkillBackBtnBg = this.add.rectangle(0, 48, skillBtnW, 20, 0x0c204c, 0.9);
    this.cmdSkillBackBtnBg.setStrokeStyle(1, 0x94a3b8, 0.8);
    this.cmdSkillBackBtnBg.setInteractive({ useHandCursor: true });

    this.cmdSkillBackBtnText = this.add.text(0, 48, '◂ BACK (Attack Menu)', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#cbd5e1',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.cmdSkillBackBtnBg.on('pointerover', () => {
      this.cmdSkillBackBtnBg.setStrokeStyle(2, 0xfbbf24);
    });
    this.cmdSkillBackBtnBg.on('pointerout', () => {
      this.cmdSkillBackBtnBg.setStrokeStyle(1, 0x94a3b8, 0.8);
    });
    this.cmdSkillBackBtnBg.on('pointerdown', () => {
      this.closeSkillSubMenu();
    });

    this.cmdSkillContainer.add([
      this.cmdSkillBackBtnBg,
      this.cmdSkillBackBtnText,
    ]);

    leftBox.add([
      leftG,
      this.cmdHeaderName,
      this.cmdHeaderRole,
      this.cmdModeBtnBg,
      this.cmdModeBtnText,
      this.cmdMainContainer,
      this.cmdSkillContainer,
    ]);

    // --- RIGHT BOX: PARTY STATUS (Width: 900px, x: 360 to 1260) ---
    const rightW = width - leftW - 60; // 900
    const rightX = leftW + 40 + rightW / 2; // 810

    const rightBox = this.add.container(rightX, panelY);

    const rightG = this.add.graphics();
    rightG.fillGradientStyle(0x0c204c, 0x0c204c, 0x050d22, 0x050d22, 0.98);
    rightG.fillRoundedRect(-rightW / 2, -panelHeight / 2, rightW, panelHeight, 6);
    rightG.lineStyle(1.5, 0xe2e8f0, 0.85);
    rightG.strokeRoundedRect(-rightW / 2, -panelHeight / 2, rightW, panelHeight, 6);
    rightG.lineStyle(1, 0x1e3a8a, 0.6);
    rightG.strokeRoundedRect(-rightW / 2 + 3, -panelHeight / 2 + 3, rightW - 6, panelHeight - 6, 4);

    rightBox.add(rightG);

    // 3 Vertical Rows: Cloud (y: -38), Aerith (y: 0), Barret (y: +38)
    const rowYOffsets = [-38, 0, 38];

    this.turnOrder.forEach((hero, idx) => {
      const rowY = rowYOffsets[idx];
      const rowContainer = this.add.container(0, rowY);

      // Row background highlight (deep-cobalt glow when active)
      const highlightBg = this.add.rectangle(0, 0, rightW - 20, 32, 0x1e40af, 0.25);
      highlightBg.setStrokeStyle(1, 0x60a5fa, 0.5);
      highlightBg.setVisible(false);

      highlightBg.setInteractive({ useHandCursor: true });
      highlightBg.on('pointerdown', () => {
        if (this.getActiveHero() === hero && this.combatState === 'PLAYER_TURN') {
          if (this.isSkillMenuOpen) {
            this.executeActiveHeroSkill();
          } else {
            this.executeActiveHeroAttack();
          }
        }
      });

      // Cursor arrow
      const cursorText = this.add.text(-rightW / 2 + 20, 0, '▸', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#fbbf24',
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
        color: '#94a3b8',
      }).setOrigin(0, 0.5);

      // 2-Phase HP Bar (y = -6, height = 8)
      const barX = -rightW / 2 + 240;
      const barBg = this.add.rectangle(barX + this.rowBarWidth / 2, -6, this.rowBarWidth + 4, 10, 0x081530, 1);
      barBg.setStrokeStyle(1, 0x1e3a8a);

      const chipBar = this.add.rectangle(barX, -6, this.rowBarWidth, 8, 0xfbbf24).setOrigin(0, 0.5);
      const fgBar = this.add.rectangle(barX, -6, this.rowBarWidth, 8, 0x22c55e).setOrigin(0, 0.5);

      // Numeric HP Text
      const hpText = this.add.text(barX + this.rowBarWidth + 16, -6, `${hero.currentHp.toLocaleString()} / ${hero.maxHp.toLocaleString()} HP`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#cbd5e1',
      }).setOrigin(0, 0.5);

      // Classic Blue MP Bar (y = +7, height = 5)
      const mpBarBg = this.add.rectangle(barX + this.rowBarWidth / 2, 7, this.rowBarWidth + 4, 7, 0x081530, 1);
      mpBarBg.setStrokeStyle(1, 0x1e3a8a);

      const mpFgBar = this.add.rectangle(barX, 7, this.rowBarWidth, 5, 0x3b82f6).setOrigin(0, 0.5);

      // Numeric MP Text
      const mpText = this.add.text(barX + this.rowBarWidth + 16, 7, `MP ${hero.currentMp.toLocaleString()} / ${hero.maxMp.toLocaleString()}`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#93c5fd',
      }).setOrigin(0, 0.5);

      // Status Badge
      const statusText = this.add.text(rightW / 2 - 30, 0, 'READY', {
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
        mpBarBg,
        mpFgBar,
        mpText,
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
        mpBarBg,
        mpFgBar,
        mpText,
        statusText,
        lastHp: hero.maxHp,
      });
    });

    this.bottomHudContainer.add([leftBox, rightBox]);
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
      if (this.cmdModeBtnText) this.cmdModeBtnText.setText('Magic ▾');
      this.updateStatus('Aerith Stance: Magic / Holy Light (700-900 DMG)');
    } else {
      this.aerith.combatConfig = {
        attackType: 'melee',
        targetOffsetX: 200,
        attackAnim: 'atk',
        hitFrameIndex: 19,
      };
      if (this.cmdModeBtnText) this.cmdModeBtnText.setText('Melee ▾');
      this.updateStatus('Aerith Stance: Melee Attack (180-260 DMG)');
    }
  }

  private getActiveHero(): UnitActor | undefined {
    return this.turnOrder[this.activeHeroIndex];
  }

  /**
   * Creates the visual JRPG target marker floating above the selected enemy.
   * Uses an inner container (markerVisual) for local bobbing so it never interferes with world positioning.
   */
  private createTargetMarker(): void {
    this.targetMarkerContainer = this.add.container(0, 0);
    this.targetMarkerContainer.setDepth(2600);
    this.targetMarkerContainer.setVisible(false);

    this.markerVisual = this.add.container(0, 0);

    // Glowing red downward arrow ▼ with tip at y = 0
    const arrow = this.add.text(0, 0, '▼', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#ef4444',
      stroke: '#450a0a',
      strokeThickness: 4,
      fontStyle: 'bold',
    }).setOrigin(0.5, 1.0);

    // Pill label [TARGET] above the arrow
    const labelBg = this.add.rectangle(0, -22, 52, 16, 0xdc2626, 0.95);
    labelBg.setStrokeStyle(1, 0xfecaca);
    const labelText = this.add.text(0, -22, 'TARGET', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.markerVisual.add([arrow, labelBg, labelText]);
    this.targetMarkerContainer.add(this.markerVisual);

    // Gentle local floating bobbing animation (±4px) that cannot corrupt world position
    this.tweens.add({
      targets: this.markerVisual,
      y: -5,
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Sets the specified enemy as the active attack target and positions the marker directly above its head.
   */
  public setTarget(enemy: TargetDummy, smooth = true): void {
    if (!enemy || enemy.currentHp <= 0) return;
    this.currentTarget = enemy;

    const targetX = enemy.x;
    const targetY = enemy.getMarkerY();

    this.targetMarkerContainer.setVisible(
      this.combatState === 'PLAYER_TURN' || this.combatState === 'HERO_ATTACKING'
    );

    if (smooth && this.targetMarkerContainer.visible) {
      this.tweens.add({
        targets: this.targetMarkerContainer,
        x: targetX,
        y: targetY,
        duration: 140,
        ease: 'Cubic.easeOut',
      });
    } else {
      this.targetMarkerContainer.setPosition(targetX, targetY);
    }
  }

  /**
   * Automatically switches targeting to the next alive enemy if current target dies.
   */
  private autoRetarget(): TargetDummy | null {
    const nextAlive = this.enemies.find((e) => e.currentHp > 0);
    if (nextAlive) {
      this.setTarget(nextAlive, true);
      return nextAlive;
    } else {
      this.currentTarget = null;
      this.targetMarkerContainer.setVisible(false);
      return null;
    }
  }

  /**
   * Spawns the encounter wave according to ENCOUNTERS data structure.
   */
  private spawnEncounter(fightNum: number, onComplete?: () => void): void {
    const configs = ENCOUNTERS[fightNum] || [
      // Fallback for fight 3+: scale fight 2 with HP scaling
      { x: 400, y: 220, hp: Math.round(3500 * Math.pow(1.18, fightNum - 1)), nameTag: 'DIRE RAT A', isBoss: false },
      { x: 400, y: 500, hp: Math.round(3500 * Math.pow(1.18, fightNum - 1)), nameTag: 'DIRE RAT B', isBoss: false },
    ];

    // Ensure enough TargetDummy instances in pool
    while (this.enemies.length < configs.length) {
      const dummy = new TargetDummy(this, 0, 0, this.manifests.training_dummy);
      this.enemies.push(dummy);
    }

    // Hide any unused dummies from prior fights
    for (let i = configs.length; i < this.enemies.length; i++) {
      this.enemies[i].setVisible(false);
      this.enemies[i].disableInteractive();
    }

    let completedCount = 0;
    const totalToSpawn = configs.length;

    configs.forEach((cfg, idx) => {
      const enemy = this.enemies[idx];
      enemy.setBaseSlot(cfg.x, cfg.y);
      enemy.isBoss = cfg.isBoss;
      enemy.setNameTag(cfg.nameTag);
      enemy.setDepth(cfg.y);

      // Play spawn animation on each enemy
      enemy.playSpawnAnimation(cfg.hp, cfg.nameTag, () => {
        completedCount++;
        if (completedCount === totalToSpawn) {
          const firstAlive = this.enemies.find((e) => e.currentHp > 0);
          if (firstAlive) {
            this.setTarget(firstAlive, false);
          }
          if (onComplete) onComplete();
        }
      });
    });
  }

  /**
   * Starts a new combat round: resets living heroes' action flags and selects first alive hero.
   */
  private startRound(): void {
    const allDead = this.enemies.every((e) => e.currentHp <= 0);
    if (allDead) {
      this.triggerVictory();
      return;
    }

    const aliveHeroes = this.turnOrder.filter((h) => !h.isDead);
    if (aliveHeroes.length === 0) {
      this.triggerDefeat();
      return;
    }

    this.victoryTriggered = false;

    // Reset action flags
    aliveHeroes.forEach((h) => (h.hasActed = false));

    // Find first alive hero index (Cloud = 0)
    let firstAliveIdx = 0;
    while (firstAliveIdx < this.turnOrder.length && this.turnOrder[firstAliveIdx].isDead) {
      firstAliveIdx++;
    }

    this.activeHeroIndex = firstAliveIdx;
    this.isSkillMenuOpen = false;
    this.combatState = 'PLAYER_TURN';

    // Ensure active target is selected and marker is visible
    if (!this.currentTarget || this.currentTarget.currentHp <= 0) {
      this.autoRetarget();
    } else {
      this.setTarget(this.currentTarget, false);
    }

    this.roundBannerText.setText(`BATTLE ${this.fightNumber}/${this.totalFights} • ROUND ${this.currentRound}`);
    this.roundBannerText.setColor('#38bdf8');

    this.updateCommandMenu();
    this.updatePartyStatusUi();
    this.updateStatus(`Round ${this.currentRound}: ${this.getActiveHero()?.heroName}'s turn! Press [ATTACK].`);
  }

  /**
   * Advances the turn pointer to the next living hero who hasn't acted yet.
   */
  private advanceToNextHero(): void {
    const allDead = this.enemies.every((e) => e.currentHp <= 0);
    if (allDead || this.combatState === 'VICTORY') {
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
      this.isSkillMenuOpen = false;
      this.combatState = 'PLAYER_TURN';
      this.updateCommandMenu();
      this.updatePartyStatusUi();
      this.updateStatus(`Next hero: ${this.getActiveHero()?.heroName}'s turn!`);
    } else {
      // All living heroes have acted this round -> Enemy turn!
      this.isSkillMenuOpen = false;
      this.combatState = 'ENEMY_TURN';
      this.roundBannerText.setText(`BATTLE ${this.fightNumber}/${this.totalFights} • ENEMY TURN`);
      this.roundBannerText.setColor('#f87171');
      this.updateCommandMenu();
      this.updatePartyStatusUi();
      this.updateStatus('All heroes have acted! Enemies attacking...');
      this.time.delayedCall(450, () => this.executeEnemyTurn());
    }
  }

  /**
   * Updates Left Command Menu based on active hero, combat state, and sub-menu state.
   */
  private updateCommandMenu(): void {
    const hero = this.getActiveHero();

    if (this.combatState === 'PLAYER_TURN' && hero && !hero.isDead && !hero.hasActed) {
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
        this.cmdModeBtnText.setText(hero.combatConfig.attackType === 'ranged' ? 'Magic ▾' : 'Melee ▾');
      }

      if (this.isSkillMenuOpen) {
        // Show Dynamic Skill Sub-Menu
        this.cmdMainContainer.setVisible(false);
        this.cmdSkillContainer.setVisible(true);

        const skills = this.unitSkills[hero.unitKey] || [];
        this.skillButtons.forEach((btn, idx) => {
          const skill = skills[idx];
          btn.skill = skill || null;

          if (skill) {
            btn.bg.setVisible(true);
            btn.nameText.setVisible(true);
            btn.tagText.setVisible(true);

            const hasMp = hero.currentMp >= skill.mpCost;
            const scopeLabel = skill.scope === 'party' ? 'Party' : skill.scope === 'all_enemies' ? 'AoE' : 'Single';

            btn.nameText.setText(`✦ ${skill.name}`);
            btn.tagText.setText(`(${scopeLabel}) [${skill.mpCost} MP]`);

            if (hasMp) {
              btn.bg.setInteractive({ useHandCursor: true });
              btn.bg.fillColor = 0x2563eb;
              btn.bg.setStrokeStyle(1.2, 0xe2e8f0, 0.85);
              btn.nameText.setColor('#ffffff');
              btn.tagText.setColor('#93c5fd');
            } else {
              btn.bg.disableInteractive();
              btn.bg.fillColor = 0x081530;
              btn.bg.setStrokeStyle(1, 0x1e3a8a, 0.5);
              btn.nameText.setColor('#64748b');
              btn.tagText.setColor('#475569');
            }
          } else {
            btn.bg.setVisible(false);
            btn.nameText.setVisible(false);
            btn.tagText.setVisible(false);
          }
        });
      } else {
        // Show Main Command Menu
        this.cmdMainContainer.setVisible(true);
        this.cmdSkillContainer.setVisible(false);

        // Attack button enabled
        this.cmdAttackBtnBg.setInteractive({ useHandCursor: true });
        this.cmdAttackBtnBg.fillColor = 0x1d4ed8;
        this.cmdAttackBtnBg.setStrokeStyle(1.5, 0xe2e8f0);
        this.cmdAttackBtnText.setText(hero === this.barret ? '⚡ BURST (Space)' : '⚡ ATTACK (Space)');
        this.cmdAttackBtnText.setColor('#ffffff');

        // Skill button enabled
        this.cmdSkillBtnBg.setInteractive({ useHandCursor: true });
        this.cmdSkillBtnBg.fillColor = 0x2563eb;
        this.cmdSkillBtnBg.setStrokeStyle(1, 0xe2e8f0, 0.8);
        this.cmdSkillBtnText.setColor('#ffffff');
      }
    } else {
      if (this.combatState === 'ENEMY_TURN') {
        this.cmdHeaderName.setText('▸ ENEMY');
        this.cmdHeaderName.setColor('#f87171');
        this.cmdHeaderRole.setText('[DIRE RAT]');
      }
      this.cmdModeBtnBg?.setVisible(false);
      this.cmdModeBtnText?.setVisible(false);

      this.cmdMainContainer.setVisible(true);
      this.cmdSkillContainer.setVisible(false);

      // Disable attack button
      this.cmdAttackBtnBg.disableInteractive();
      this.cmdAttackBtnBg.fillColor = 0x081530;
      this.cmdAttackBtnBg.setStrokeStyle(1, 0x1e3a8a);
      this.cmdAttackBtnText.setText(this.combatState === 'HERO_ATTACKING' ? 'ACTION...' : 'ENEMY TURN');
      this.cmdAttackBtnText.setColor('#64748b');

      // Disable skill button
      this.cmdSkillBtnBg.disableInteractive();
      this.cmdSkillBtnBg.fillColor = 0x081530;
      this.cmdSkillBtnBg.setStrokeStyle(1, 0x1e3a8a, 0.5);
      this.cmdSkillBtnText.setColor('#64748b');
    }
  }

  public openSkillSubMenu(): void {
    if (this.combatState !== 'PLAYER_TURN') return;
    const hero = this.getActiveHero();
    if (!hero || hero.isDead || hero.hasActed) return;

    this.isSkillMenuOpen = true;
    this.updateCommandMenu();
  }

  public closeSkillSubMenu(): void {
    this.isSkillMenuOpen = false;
    this.updateCommandMenu();
  }

  /**
   * Locks the command menu so remaining heroes or buttons cannot be clicked after fight end.
   */
  private lockCommandMenu(): void {
    this.isSkillMenuOpen = false;
    this.cmdMainContainer.setVisible(true);
    this.cmdSkillContainer.setVisible(false);

    this.cmdAttackBtnBg.disableInteractive();
    this.cmdAttackBtnBg.fillColor = 0x0f172a;
    this.cmdAttackBtnBg.setStrokeStyle(1, 0x334155);
    this.cmdAttackBtnText.setText('★ VICTORY ★');
    this.cmdAttackBtnText.setColor('#fbbf24');

    this.cmdSkillBtnBg.disableInteractive();
    this.cmdSkillBtnBg.fillColor = 0x0f172a;
    this.cmdSkillBtnBg.setStrokeStyle(1, 0x334155);
    this.cmdSkillBtnText.setColor('#64748b');

    this.cmdModeBtnBg?.setVisible(false);
    this.cmdModeBtnText?.setVisible(false);
  }

  /**
   * Called immediately whenever an enemy receives damage.
   * If the target reaches 0 HP:
   * - Immediately fades out the defeated enemy.
   * - If ALL enemies are dead: immediately locks command menu, hides target marker,
   *   sets combatState to VICTORY, and marks battle finished.
   * - If other enemies are still alive: immediately retargets to next alive monster.
   */
  private handleTargetDamaged(target: TargetDummy): void {
    if (target.currentHp <= 0) {
      target.playDefeatFade();

      const allDead = this.enemies.every((e) => e.currentHp <= 0);
      if (allDead) {
        this.combatState = 'VICTORY';
        this.targetMarkerContainer.setVisible(false);
        this.lockCommandMenu();
        this.updateStatus(`K.O.! ${target.nameTag} defeated! All enemies eliminated!`);
      } else {
        const next = this.autoRetarget();
        if (next) {
          this.updateStatus(`K.O.! ${target.nameTag} defeated. Retargeting to ${next.nameTag}.`);
        }
      }
    }
  }

  /**
   * Refreshes all 3 rows in the Right Party Status box with cursor, highlights, 2-phase HP, and blue MP.
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

      // 3. Classic Blue MP Bar & Text
      const mpPct = Math.max(0, hero.currentMp / hero.maxMp);
      row.mpFgBar.width = this.rowBarWidth * mpPct;
      row.mpText.setText(`MP ${hero.currentMp.toLocaleString()} / ${hero.maxMp.toLocaleString()}`);

      // 4. Status text
      if (hero.isDead) {
        row.statusText.setText('K.O.');
        row.statusText.setColor('#ef4444');
      } else if (hero.hasActed) {
        row.statusText.setText('ACTED');
        row.statusText.setColor('#475569');
      } else if (isActive) {
        row.statusText.setText('ACTIVE');
        row.statusText.setColor('#fbbf24');
      } else {
        row.statusText.setText('READY');
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
    this.isSkillMenuOpen = false;
    this.updateCommandMenu();

    const row = this.partyRows.get(hero.unitKey);
    if (row) {
      row.statusText.setText('ATTACKING...');
      row.statusText.setColor('#fbbf24');
    }

    this.executeHeroSequence(hero, () => {
      hero.hasActed = true;
      this.updatePartyStatusUi();

      // Check Victory: if all enemies are defeated or fight ended mid-turn, trigger victory immediately!
      const allDead = this.enemies.every((e) => e.currentHp <= 0);
      if (allDead || this.combatState === 'VICTORY') {
        this.triggerVictory();
        return;
      }

      // Advance to next hero
      this.advanceToNextHero();
    });
  }

  /**
   * Tries to execute the skill at slot index (0, 1, 2) from keyboard shortcut.
   */
  public tryExecuteSkillByIndex(idx: number): void {
    if (this.combatState !== 'PLAYER_TURN' || !this.isSkillMenuOpen) return;
    const btn = this.skillButtons[idx];
    if (btn && btn.skill) {
      this.executeSkillChoice(btn.skill);
    }
  }

  /**
   * Executes the first affordable skill from active hero's skill list (triggered by Space/Enter in sub-menu).
   */
  public executeFirstAvailableSkill(): void {
    if (this.combatState !== 'PLAYER_TURN') return;
    const hero = this.getActiveHero();
    if (!hero) return;
    const skills = this.unitSkills[hero.unitKey] || [];
    const affordable = skills.find((s) => hero.currentMp >= s.mpCost);
    if (affordable) {
      this.executeSkillChoice(affordable);
    } else if (skills.length > 0) {
      this.executeSkillChoice(skills[0]);
    }
  }

  public executeActiveHeroSkill(): void {
    this.executeFirstAvailableSkill();
  }

  /**
   * Dedicated entry point for executing a chosen SkillConfig.
   */
  public executeSkillChoice(skill: SkillConfig): void {
    if (this.combatState !== 'PLAYER_TURN') return;
    const hero = this.getActiveHero();
    if (!hero || hero.isDead || hero.hasActed) return;

    if (!hero.useMp(skill.mpCost)) {
      this.updateStatus(`Not enough MP to cast ${skill.name}! (Need ${skill.mpCost} MP, have ${hero.currentMp})`);
      return;
    }

    this.combatState = 'HERO_ATTACKING';
    this.isSkillMenuOpen = false;
    this.updateCommandMenu();
    this.updatePartyStatusUi();

    const row = this.partyRows.get(hero.unitKey);
    if (row) {
      row.statusText.setText('SKILL...');
      row.statusText.setColor('#c084fc');
    }

    this.executeGenericSkill(hero, skill, () => this.concludeHeroSkill(hero));
  }

  private concludeHeroSkill(hero: UnitActor): void {
    hero.hasActed = true;
    this.updatePartyStatusUi();

    const allDead = this.enemies.every((e) => e.currentHp <= 0);
    if (allDead || this.combatState === 'VICTORY') {
      this.triggerVictory();
      return;
    }

    this.advanceToNextHero();
  }

  /**
   * Universal data-driven skill executor:
   * Handles moveType ('dash' vs 'stationary') and scope ('single_enemy', 'all_enemies', 'party').
   */
  private executeGenericSkill(hero: UnitActor, skill: SkillConfig, onComplete: () => void): void {
    const target = this.currentTarget && this.currentTarget.currentHp > 0
      ? this.currentTarget
      : this.autoRetarget();

    const triggerImpact = () => {
      if (skill.scope === 'single_enemy') {
        const hitTarget = this.currentTarget && this.currentTarget.currentHp > 0 ? this.currentTarget : target;
        if (!hitTarget) return;

        // 1. Hit-Stop if dashing
        if (skill.moveType === 'dash') {
          hero.anims.pause();
          this.time.delayedCall(80, () => {
            if (hero.anims) hero.anims.resume();
          });
        }

        // 2. White flash on target monster
        hitTarget.sprite.setTintFill(0xffffff);
        this.time.delayedCall(70, () => {
          hitTarget.sprite.clearTint();
        });

        // 3. Screen shake scaled by multiplier
        const intensity = skill.damageMultiplier >= 4.0 ? 0.020 : skill.damageMultiplier >= 2.5 ? 0.014 : 0.009;
        const duration = skill.damageMultiplier >= 4.0 ? 250 : 180;
        this.cameras.main.shake(duration, intensity);

        // 4. Calculate damage
        let base = hero === this.cloud ? Phaser.Math.Between(340, 440) * this.cloudDmgMultiplier
                 : hero === this.aerith ? Phaser.Math.Between(260, 340) * this.aerithMagicMultiplier
                 : Phaser.Math.Between(260, 360);
        const dmg = Math.round(base * skill.damageMultiplier);
        const isCrit = skill.damageMultiplier >= 3.0;
        hitTarget.applyDamage(dmg, isCrit, skill.motion === 'magic_atk' ? 'holy' : 'physical');

        if (isCrit) {
          this.showCritPopup(hitTarget.x, hitTarget.y - 105);
        }

        this.handleTargetDamaged(hitTarget);
      } else if (skill.scope === 'all_enemies') {
        const living = this.enemies.filter((e) => e.currentHp > 0);
        if (living.length === 0) return;

        // White flash all living enemies
        living.forEach((e) => {
          e.sprite.setTintFill(0xffffff);
          this.time.delayedCall(80, () => e.sprite.clearTint());
        });

        // Screen shake
        const intensity = skill.damageMultiplier >= 3.0 ? 0.016 : 0.010;
        this.cameras.main.shake(220, intensity);

        // Calculate damage per enemy
        let base = hero === this.cloud ? Phaser.Math.Between(300, 380) * this.cloudDmgMultiplier
                 : hero === this.aerith ? Phaser.Math.Between(280, 360) * this.aerithMagicMultiplier
                 : Phaser.Math.Between(240, 320);
        const dmg = Math.round(base * skill.damageMultiplier);

        living.forEach((e) => {
          e.applyDamage(dmg, skill.damageMultiplier >= 3.0, skill.motion === 'magic_atk' ? 'holy' : 'physical');
          this.handleTargetDamaged(e);
        });
      } else if (skill.scope === 'party') {
        // Screen flash
        this.cameras.main.flash(120, 200, 255, 200, false);

        let baseHeal = hero === this.aerith ? Phaser.Math.Between(500, 750) * this.aerithMagicMultiplier : 500;
        const heal = Math.round(baseHeal * skill.damageMultiplier);

        this.turnOrder.forEach((h) => {
          if (!h.isDead) {
            h.restoreHp(heal);
          }
        });
        this.updatePartyStatusUi();
      }
    };

    if (skill.moveType === 'dash') {
      if (!target) {
        onComplete();
        return;
      }
      const homeX = hero.homeSlot.x;
      const homeY = hero.homeSlot.y;
      const arrivalX = target.x + (hero.combatConfig.targetOffsetX || 90);
      const arrivalY = target.y;

      hero.setDepthBoost(true);
      this.updateStatus(`Action: ${hero.heroName} executes ${skill.name} on ${target.nameTag}!`);
      hero.playAnimation('move');

      this.tweens.add({
        targets: hero,
        x: arrivalX,
        y: arrivalY,
        duration: 340,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          hero.playAnimation(skill.motion || 'atk');
          this.time.delayedCall(160, triggerImpact);

          this.time.delayedCall(650, () => {
            hero.playAnimation('move');
            hero.setFacingLeft(false);

            this.tweens.add({
              targets: hero,
              x: homeX,
              y: homeY,
              duration: 360,
              ease: 'Cubic.easeInOut',
              onComplete: () => {
                hero.setFacingLeft(true);
                hero.setDepthBoost(false);
                hero.playAnimation('idle');
                onComplete();
              },
            });
          });
        },
      });
    } else {
      const scopeDesc = skill.scope === 'party' ? 'on party' : skill.scope === 'all_enemies' ? 'on all enemies' : `at ${target?.nameTag || 'enemy'}`;
      this.updateStatus(`Action: ${hero.heroName} casts ${skill.name} ${scopeDesc}!`);
      hero.playAnimation(skill.motion || 'magic_atk');

      this.time.delayedCall(200, triggerImpact);

      this.time.delayedCall(900, () => {
        hero.returnToIdle(onComplete);
      });
    }
  }

  private showCritPopup(x: number, y: number): void {
    const critText = this.add.text(x, y, 'CRITICAL!', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#facc15',
      fontStyle: 'bold',
      stroke: '#713f12',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2000);

    this.tweens.add({
      targets: critText,
      y: y - 30,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => critText.destroy(),
    });
  }

  /**
   * Executes hero attack animation, movement, damage and returns to base.
   */
  private executeHeroSequence(hero: UnitActor, onComplete: () => void): void {
    // If all enemies are already dead, conclude immediately without performing attack
    if (this.enemies.every((e) => e.currentHp <= 0) || this.combatState === 'VICTORY') {
      onComplete();
      return;
    }

    const target = this.currentTarget && this.currentTarget.currentHp > 0
      ? this.currentTarget
      : this.autoRetarget();
    if (!target) {
      onComplete();
      return;
    }

    const homeX = hero.homeSlot.x;
    const homeY = hero.homeSlot.y;
    const config = hero.combatConfig;

    // Temporarily boost acting hero depth to 1000 so hero is guaranteed in front of all monsters
    hero.setDepthBoost(true);

    if (hero === this.barret) {
      // --- BARRET: GATLING GUN BURST (Frames 14, 17, 20, 23) ---
      this.updateStatus(`Action: BARRET fires Gatling Gun burst at ${target.nameTag}...`);
      const burstFrames = [14, 17, 20, 23];
      const firedFrames = new Set<number>();

      const onAnimUpdate = (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        const frameIdx = Number(frame.textureFrame);
        if (burstFrames.includes(frameIdx) && !firedFrames.has(frameIdx)) {
          firedFrames.add(frameIdx);

          // If all enemies dead, stop firing immediately!
          if (this.enemies.every((e) => e.currentHp <= 0) || this.combatState === 'VICTORY') {
            return;
          }

          // Dynamically retarget to current alive target if previous bullet killed current target
          const activeTarget = this.currentTarget && this.currentTarget.currentHp > 0
            ? this.currentTarget
            : this.autoRetarget();
          if (!activeTarget) return;

          const isCrit = Math.random() < 0.2;
          let bulletDmg = Phaser.Math.Between(130, 180);
          if (isCrit) bulletDmg = Math.round(bulletDmg * 1.5);
          this.fireBulletProjectile(homeX, homeY, activeTarget.x, activeTarget.y, bulletDmg, isCrit, activeTarget);
        }
      };

      hero.on(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
      hero.playAnimation(config.attackAnim);

      hero.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        hero.off(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
        if (firedFrames.size === 0 && !this.enemies.every((e) => e.currentHp <= 0) && this.combatState !== 'VICTORY') {
          const fallback = this.currentTarget && this.currentTarget.currentHp > 0
            ? this.currentTarget
            : this.autoRetarget();
          if (fallback) {
            const isCrit = Math.random() < 0.2;
            this.fireBulletProjectile(homeX, homeY, fallback.x, fallback.y, 550, isCrit, fallback);
          }
        }

        // Standardized returnToIdle handles Barret's stationary recoil via manifest metadata
        hero.returnToIdle(onComplete);
      });
    } else if (config.attackType === 'ranged') {
      // --- AERITH: RANGED HOLY MAGIC ---
      this.updateStatus(`Action: AERITH casts Holy Light on ${target.nameTag}...`);
      let hitTriggered = false;

      const onAnimUpdate = (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        if (!hitTriggered && Number(frame.textureFrame) === config.hitFrameIndex) {
          hitTriggered = true;
          const activeTarget = this.currentTarget && this.currentTarget.currentHp > 0
            ? this.currentTarget
            : this.autoRetarget();
          if (activeTarget && this.combatState !== 'VICTORY') {
            this.fireMagicProjectile(homeX, homeY, activeTarget.x, activeTarget.y, activeTarget);
          }
        }
      };

      hero.on(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
      hero.playAnimation(config.attackAnim);

      hero.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        hero.off(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
        if (!hitTriggered && !this.enemies.every((e) => e.currentHp <= 0) && this.combatState !== 'VICTORY') {
          const fallback = this.currentTarget && this.currentTarget.currentHp > 0
            ? this.currentTarget
            : this.autoRetarget();
          if (fallback) {
            this.fireMagicProjectile(homeX, homeY, fallback.x, fallback.y, fallback);
          }
        }
        hero.returnToIdle(onComplete);
      });
    } else {
      // --- MELEE MOVE-TO-TARGET (Cloud / Aerith Melee) ---
      const activeTarget = this.currentTarget && this.currentTarget.currentHp > 0
        ? this.currentTarget
        : target;

      const attackArrivalX = activeTarget.x + config.targetOffsetX;
      const attackArrivalY = activeTarget.y;

      this.updateStatus(`Action: ${hero.heroName} charges at ${activeTarget.nameTag}...`);
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
              const hitTarget = this.currentTarget && this.currentTarget.currentHp > 0
                ? this.currentTarget
                : activeTarget;
              this.applyHeroMeleeDamage(hero, hitTarget);
            }
          };

          hero.on(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
          hero.playAnimation(config.attackAnim);

          hero.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            hero.off(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
            if (!hitTriggered && !this.enemies.every((e) => e.currentHp <= 0) && this.combatState !== 'VICTORY') {
              const hitTarget = this.currentTarget && this.currentTarget.currentHp > 0
                ? this.currentTarget
                : activeTarget;
              this.applyHeroMeleeDamage(hero, hitTarget);
            }

            hero.playAnimation('move');
            hero.setFacingLeft(false);

            this.tweens.add({
              targets: hero,
              x: homeX,
              y: homeY,
              duration: 380,
              ease: 'Cubic.easeInOut',
              onComplete: () => {
                hero.setFacingLeft(true);
                hero.setDepthBoost(false);
                hero.playAnimation('idle');
                onComplete();
              },
            });
          });
        },
      });
    }
  }

  private applyHeroMeleeDamage(hero: UnitActor, target: TargetDummy): void {
    let baseDmg = 0;
    let isCrit = false;

    if (hero === this.cloud) {
      baseDmg = Phaser.Math.Between(450, 650);
      baseDmg = Math.round(baseDmg * this.cloudDmgMultiplier);
      isCrit = Math.random() < 0.2;
    } else {
      baseDmg = Phaser.Math.Between(180, 260);
      isCrit = Math.random() < 0.15;
    }

    if (isCrit) baseDmg = Math.round(baseDmg * 1.5);
    target.applyDamage(baseDmg, isCrit, 'physical');
    this.handleTargetDamaged(target);
  }

  private fireMagicProjectile(fromX: number, fromY: number, toX: number, toY: number, target: TargetDummy): void {
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

        let baseDmg = Phaser.Math.Between(700, 900);
        baseDmg = Math.round(baseDmg * this.aerithMagicMultiplier);
        const isCrit = Math.random() < 0.15;
        target.applyDamage(isCrit ? Math.round(baseDmg * 1.5) : baseDmg, isCrit, 'holy');
        this.handleTargetDamaged(target);
      },
    });
  }

  private fireBulletProjectile(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    damage: number,
    isCrit: boolean,
    target: TargetDummy
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
        target.applyDamage(damage, isCrit, 'physical');
        this.handleTargetDamaged(target);
      },
    });
  }

  /**
   * Sequential enemy turn: each living enemy attacks one after another with 250ms pause.
   */
  private executeEnemyTurn(): void {
    const livingEnemies = this.enemies.filter((e) => e.currentHp > 0);
    if (livingEnemies.length === 0) {
      this.triggerVictory();
      return;
    }

    const aliveHeroes = this.turnOrder.filter((h) => !h.isDead);
    if (aliveHeroes.length === 0) {
      this.triggerDefeat();
      return;
    }

    this.combatState = 'ENEMY_TURN';
    this.targetMarkerContainer.setVisible(false);
    this.updateCommandMenu();

    const attackNextEnemy = (index: number) => {
      if (index >= livingEnemies.length) {
        // All alive enemies executed their counter-attacks
        const stillAlive = this.turnOrder.filter((h) => !h.isDead);
        if (stillAlive.length === 0) {
          this.triggerDefeat();
        } else {
          this.currentRound++;
          this.time.delayedCall(450, () => this.startRound());
        }
        return;
      }

      const enemy = livingEnemies[index];
      if (enemy.currentHp <= 0) {
        attackNextEnemy(index + 1);
        return;
      }

      const currentAliveHeroes = this.turnOrder.filter((h) => !h.isDead);
      if (currentAliveHeroes.length === 0) {
        this.triggerDefeat();
        return;
      }

      // Target selection: Cloud if alive (Tank/Frontline), else first alive hero
      const heroTarget = currentAliveHeroes.includes(this.cloud) ? this.cloud : currentAliveHeroes[0];
      const stepStr = livingEnemies.length > 1 ? ` (${index + 1}/${livingEnemies.length})` : '';
      this.updateStatus(`ENEMY TURN${stepStr}: ${enemy.nameTag} charges and attacks ${heroTarget.heroName}!`);

      enemy.executeAttack(
        heroTarget.x,
        heroTarget.y,
        () => {
          const dmg = Phaser.Math.Between(220, 360);
          heroTarget.applyDamage(dmg);
          this.updatePartyStatusUi();
        },
        () => {
          // After attack completes, pause 250ms before the next enemy acts
          this.time.delayedCall(250, () => {
            attackNextEnemy(index + 1);
          });
        }
      );
    };

    attackNextEnemy(0);
  }

  /**
   * Fluid Victory Staging:
   * 1. All enemies fade out via alpha tween.
   * 2. All living heroes continuously celebrate in their looping 'win' animations.
   * 3. Bottom JRPG panel slides smoothly down off-screen.
   * 4. Golden "VICTORY" banner smoothly fades in at the top.
   * 5. 1.2s later, 3 PokeRogue reward cards slide up from the bottom.
   */
  private triggerVictory(): void {
    if (this.victoryTriggered) return;
    this.victoryTriggered = true;

    this.combatState = 'VICTORY';
    this.targetMarkerContainer.setVisible(false);
    this.lockCommandMenu();

    // 1. All enemies red flash and alpha fadeout if visible
    this.enemies.forEach((enemy) => {
      if (enemy.visible) {
        enemy.playDefeatFade();
      }
    });

    // 2. All living heroes start continuous looping win celebrations
    this.turnOrder.forEach((hero) => {
      if (!hero.isDead) {
        hero.playAnimation('win');
      }
    });

    // 3. Golden top victory banner
    this.roundBannerText.setText('★  V I C T O R Y  ★');
    this.roundBannerText.setColor('#fbbf24');
    this.updateStatus(`Battle ${this.fightNumber} of ${this.totalFights} clear!`);

    // 4. Slide bottom HUD down off-screen
    this.tweens.add({
      targets: this.bottomHudContainer,
      y: 180,
      duration: 400,
      ease: 'Cubic.easeIn',
    });

    // 5. Ca. 1.2s later: present PokeRogue reward selection
    this.time.delayedCall(1200, () => {
      this.showPokeRogueRewards();
    });
  }

  /**
   * Presents 3 interactive PokeRogue-style reward cards.
   */
  private showPokeRogueRewards(): void {
    if (this.rewardsContainer) {
      this.rewardsContainer.destroy();
    }

    const { height } = this.scale;
    this.rewardsContainer = this.add.container(0, 180); // starts off-screen below
    this.rewardsContainer.setDepth(1500);

    const rewards: RewardCardData[] = [
      {
        id: 'cloud_buff',
        category: '✦ ATK BUFF',
        categoryColor: '#fbbf24',
        title: 'Courage Buff',
        target: 'Cloud (Vanguard)',
        desc: '+15% DMG permanent',
        icon: '⚔',
      },
      {
        id: 'aerith_buff',
        category: '✦ MATERIA BUFF',
        categoryColor: '#f472b6',
        title: 'Materia Focus',
        target: 'Aerith (Healer)',
        desc: '+25% Magic & Healing',
        icon: '✦',
      },
      {
        id: 'party_heal',
        category: '✦ RECOVERY',
        categoryColor: '#4ade80',
        title: 'Field Rest',
        target: 'Entire Party',
        desc: 'Restores 40% Max HP & 30% Max MP',
        icon: '💚',
      },
    ];

    const cardW = 340;
    const cardH = 135;
    const cardY = height - 75; // y: 645
    const cardXs = [240, 640, 1040];

    const cardContainers: Phaser.GameObjects.Container[] = [];

    rewards.forEach((reward, idx) => {
      const cx = cardXs[idx];
      const card = this.add.container(cx, cardY);

      // Deep Navy JRPG Card Background
      const cardG = this.add.graphics();
      cardG.fillGradientStyle(0x0c204c, 0x0c204c, 0x050d22, 0x050d22, 0.98);
      cardG.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);
      cardG.lineStyle(1.5, 0xd4af37, 0.85); // Warm gold border
      cardG.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);
      cardG.lineStyle(1, 0x1e3a8a, 0.5);
      cardG.strokeRoundedRect(-cardW / 2 + 3, -cardH / 2 + 3, cardW - 6, cardH - 6, 4);

      // Category Tag
      const catText = this.add.text(-cardW / 2 + 18, -cardH / 2 + 16, reward.category, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: reward.categoryColor,
        fontStyle: 'bold',
      });

      // Icon & Title
      const titleText = this.add.text(-cardW / 2 + 18, -cardH / 2 + 36, `${reward.icon} ${reward.title}`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      });

      // Target unit
      const targetText = this.add.text(-cardW / 2 + 18, -cardH / 2 + 66, `Target: ${reward.target}`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#94a3b8',
      });

      // Description
      const descText = this.add.text(-cardW / 2 + 18, -cardH / 2 + 88, reward.desc, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#fbbf24',
        fontStyle: 'bold',
      });

      // Click hit area
      const hitRect = this.add.rectangle(0, 0, cardW, cardH, 0x000000, 0);
      hitRect.setInteractive({ useHandCursor: true });

      // Hover-Lift & Golden Glow
      hitRect.on('pointerover', () => {
        this.tweens.add({
          targets: card,
          y: cardY - 8,
          scaleX: 1.03,
          scaleY: 1.03,
          duration: 150,
          ease: 'Cubic.easeOut',
        });
      });

      hitRect.on('pointerout', () => {
        this.tweens.add({
          targets: card,
          y: cardY,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 150,
          ease: 'Cubic.easeOut',
        });
      });

      hitRect.on('pointerdown', () => {
        this.selectReward(reward, card, cardContainers);
      });

      card.add([cardG, catText, titleText, targetText, descText, hitRect]);
      cardContainers.push(card);
      this.rewardsContainer?.add(card);
    });

    // Smooth slide-in from bottom
    this.tweens.add({
      targets: this.rewardsContainer,
      y: 0,
      duration: 500,
      ease: 'Back.easeOut',
    });

    this.updateStatus('Choose a reward for your run!');
  }

  /**
   * Applies the selected reward and shows the Next Battle progression button.
   */
  private selectReward(
    reward: RewardCardData,
    chosenCard: Phaser.GameObjects.Container,
    allCards: Phaser.GameObjects.Container[]
  ): void {
    // 1. Disable further clicks on all cards
    allCards.forEach((c) => {
      c.getAll().forEach((obj) => obj.disableInteractive());
      if (c !== chosenCard) {
        this.tweens.add({ targets: c, alpha: 0.25, duration: 250 });
      }
    });

    // 2. Highlight chosen card
    this.tweens.add({
      targets: chosenCard,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // 3. Apply Buff or Healing
    let confirmMsg = '';
    if (reward.id === 'cloud_buff') {
      this.cloudDmgMultiplier *= 1.15;
      confirmMsg = `Courage Buff acquired! Cloud now deals ${Math.round((this.cloudDmgMultiplier - 1) * 100)}% more damage.`;
    } else if (reward.id === 'aerith_buff') {
      this.aerithMagicMultiplier *= 1.25;
      confirmMsg = `Materia Focus acquired! Aerith now casts ${Math.round((this.aerithMagicMultiplier - 1) * 100)}% stronger magic.`;
    } else if (reward.id === 'party_heal') {
      confirmMsg = 'Field Rest! All surviving heroes restored 40% Max HP and 30% Max MP.';
      this.turnOrder.forEach((hero) => {
        if (!hero.isDead) {
          const healAmount = Math.round(hero.maxHp * 0.4);
          hero.currentHp = Math.min(hero.maxHp, hero.currentHp + healAmount);
          const mpRestore = Math.round(hero.maxMp * 0.3);
          hero.restoreMp(mpRestore);
          this.spawnHealPopup(hero.x, hero.y - 70, `+${healAmount.toLocaleString()} HP`);
        }
      });
      this.updatePartyStatusUi();
    }

    this.updateStatus(confirmMsg);

    // 4. Show Next Battle Button
    const { width, height } = this.scale;
    const btnContainer = this.add.container(width / 2, height - 165);
    btnContainer.setDepth(2000);
    btnContainer.setScale(0.8);
    btnContainer.setAlpha(0);

    const btnW = 320;
    const btnH = 42;

    const btnBg = this.add.rectangle(0, 0, btnW, btnH, 0x15803d, 0.98);
    btnBg.setStrokeStyle(2, 0xfbbf24);
    btnBg.setInteractive({ useHandCursor: true });

    const nextFightNum = this.fightNumber + 1;
    const btnLabel = nextFightNum > this.totalFights
      ? '★ COMPLETE RUN ★'
      : `⚔ NEXT BATTLE (${nextFightNum}/${this.totalFights}) ➔`;

    const btnText = this.add.text(0, 0, btnLabel, {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => {
      btnBg.setScale(1.04);
      btnBg.setStrokeStyle(2, 0xffffff);
    });
    btnBg.on('pointerout', () => {
      btnBg.setScale(1.0);
      btnBg.setStrokeStyle(2, 0xfbbf24);
    });
    btnBg.on('pointerdown', () => {
      btnContainer.destroy();
      this.startNextFight();
    });

    btnContainer.add([btnBg, btnText]);
    this.nextFightBtn = btnContainer;

    this.tweens.add({
      targets: btnContainer,
      scaleX: 1.0,
      scaleY: 1.0,
      alpha: 1,
      duration: 350,
      ease: 'Back.easeOut',
    });
  }

  private spawnHealPopup(x: number, y: number, text: string): void {
    const healText = this.add.text(x, y, text, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '22px',
      color: '#4ade80',
      fontStyle: 'bold',
      stroke: '#064e3b',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2500).setScale(0.7);

    this.tweens.add({
      targets: healText,
      scale: 1.1,
      y: y - 45,
      alpha: 0,
      duration: 850,
      ease: 'Cubic.easeOut',
      onComplete: () => healText.destroy(),
    });
  }

  /**
   * Advances to the next battle encounter with scaled enemy stats.
   */
  private startNextFight(): void {
    // 1. Hide reward selection
    if (this.rewardsContainer) {
      this.tweens.add({
        targets: this.rewardsContainer,
        alpha: 0,
        y: 180,
        duration: 350,
        onComplete: () => {
          this.rewardsContainer?.destroy();
          this.rewardsContainer = undefined;
        },
      });
    }

    this.fightNumber++;

    if (this.fightNumber > this.totalFights) {
      this.roundBannerText.setText('★ GLORIOUS RUN VICTORY! ★');
      this.updateStatus('All 6 battles cleared! Congratulations!');
      return;
    }

    // 2. Living heroes return from 'win' back to 'idle'
    this.turnOrder.forEach((hero) => {
      if (!hero.isDead) {
        hero.playAnimation('idle');
      }
    });

    // 4. Slide bottom HUD back in
    this.tweens.add({
      targets: this.bottomHudContainer,
      y: 0,
      duration: 450,
      ease: 'Cubic.easeOut',
    });

    // 5. Reset round counter and smoothly materialize the new enemy wave
    this.currentRound = 1;
    this.updateStatus(`Battle ${this.fightNumber}/${this.totalFights}: New enemies approaching...`);

    this.spawnEncounter(this.fightNumber, () => {
      this.startRound();
    });
  }

  /**
   * Defeat handler: shows game over banner.
   */
  private triggerDefeat(): void {
    this.combatState = 'DEFEAT';
    this.roundBannerText.setText('DEFEAT');
    this.roundBannerText.setColor('#ef4444');
    this.updateStatus('DEFEAT: All heroes have fallen in battle!');

    if (this.defeatBanner) {
      this.defeatBanner.destroy();
    }

    const { width, height } = this.scale;
    const banner = this.add.container(width / 2, height / 2 - 20);
    banner.setDepth(3000);

    const cardWidth = 440;
    const cardHeight = 220;

    const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.45);
    banner.add(backdrop);

    const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x0f172a, 0.98);
    bg.setStrokeStyle(2, 0xef4444);

    const titleText = this.add.text(0, -60, '☠ DEFEAT ☠', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ef4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const subText = this.add.text(
      0,
      -15,
      `Fallen in Battle ${this.fightNumber}/${this.totalFights} (Round ${this.currentRound})`,
      {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#e2e8f0',
      }
    ).setOrigin(0.5);

    const btnBg = this.add.rectangle(0, 50, 200, 42, 0x991b1b, 1);
    btnBg.setStrokeStyle(1, 0xffffff);
    btnBg.setInteractive({ useHandCursor: true });

    const btnText = this.add.text(0, 50, 'Retry Battle', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => btnBg.setScale(1.05));
    btnBg.on('pointerout', () => btnBg.setScale(1.0));
    btnBg.on('pointerdown', () => this.resetBattle());

    banner.add([bg, titleText, subText, btnBg, btnText]);
    this.defeatBanner = banner;
  }

  /**
   * Resets entire battle back to Fight 1, Round 1.
   */
  public resetBattle(): void {
    if (this.defeatBanner) {
      this.defeatBanner.destroy();
      this.defeatBanner = undefined;
    }
    if (this.rewardsContainer) {
      this.rewardsContainer.destroy();
      this.rewardsContainer = undefined;
    }
    if (this.nextFightBtn) {
      this.nextFightBtn.destroy();
      this.nextFightBtn = undefined;
    }

    this.fightNumber = 1;
    this.currentRound = 1;
    this.cloudDmgMultiplier = 1.0;
    this.aerithMagicMultiplier = 1.0;

    this.turnOrder.forEach((hero) => hero.resetCombatState());
    this.bottomHudContainer.setY(0);

    this.spawnEncounter(1, () => {
      this.startRound();
    });
  }

  private updateStatus(msg: string): void {
    if (this.statusText) {
      this.statusText.setText(msg);
    }
  }
}
