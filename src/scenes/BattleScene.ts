import Phaser from 'phaser';
import { UnitActor, UnitCombatConfig } from '../entities/UnitActor';
import { TargetDummy } from '../entities/TargetDummy';
import { UnitManifest } from '../types/manifest';
import { SkillConfig, UnitSkillsData } from '../types/skills';
import { EffectManifest } from '../types/effects';
import { CharacterDefinition, ContentRegistry } from '../types/content';
import { BATTLE_ART_SCALE, getBattleLayout } from '../ui/battleLayout';
import { BATTLE_ARENAS, BattleArenaKey } from '../data/battleArenas';
import { EnemyTargetPanel } from '../ui/EnemyTargetPanel';

export type CombatState =
  | 'SPAWNING'
  | 'PLAYER_TURN'
  | 'HERO_ATTACKING'
  | 'ENEMY_TURN'
  | 'VICTORY'
  | 'DEFEAT';

type PlannedAction = ({ kind: 'attack'; config: UnitCombatConfig } | { kind: 'skill'; skill: SkillConfig })
  & { target: TargetDummy | null };

interface SkillBtnUi {
  bg: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  tagText: Phaser.GameObjects.Text;
  skill: SkillConfig | null;
  icon?: Phaser.GameObjects.Image;
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
  slot: 'center' | 'top' | 'bottom';
  hp: number;
  nameTag: string;
  isBoss: boolean;
}

export const ENCOUNTERS: Record<number, EnemySlotConfig[]> = {
  1: [
    { slot: 'center', hp: 5000, nameTag: 'DIRE RAT (BOSS)', isBoss: true },
  ],
  2: [
    { slot: 'top', hp: 3500, nameTag: 'DIRE RAT A', isBoss: false },
    { slot: 'bottom', hp: 3500, nameTag: 'DIRE RAT B', isBoss: false },
  ],
};

export class BattleScene extends Phaser.Scene {
  private arenaKey: BattleArenaKey = 'forest';
  private previewTrio = false;
  private manifests!: Record<string, UnitManifest>;
  private cloud!: UnitActor;
  private aerith!: UnitActor;
  private barret!: UnitActor;
  private enemies: TargetDummy[] = [];
  private currentTarget: TargetDummy | null = null;
  private enemyTargetPanel?: EnemyTargetPanel;
  private targetMarkerContainer!: Phaser.GameObjects.Container;
  private markerVisual!: Phaser.GameObjects.Container;
  private victoryTriggered: boolean = false;
  private rewardSelected = false;
  private pendingImpacts = 0;
  private afterImpacts?: () => void;

  public get targetDummy(): TargetDummy {
    return this.currentTarget ?? this.enemies[0];
  }

  // Turn-Order State
  private turnOrder: UnitActor[] = [];
  private activeHeroIndex: number = 0;
  private plannedActions = new Map<UnitActor, PlannedAction>();
  private combatState: CombatState = 'SPAWNING';
  private currentRound: number = 1;

  // Roguelike Run Stats & Multipliers
  private fightNumber: number = 1;
  private readonly totalFights: number = 6;
  private cloudDmgMultiplier: number = 1.0;
  private aerithMagicMultiplier: number = 1.0;

  // Header UI
  private roundBannerText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  // Party panels and the transient command window share transition staging.
  private bottomHudContainer!: Phaser.GameObjects.Container;
  private commandPanel!: Phaser.GameObjects.Container;
  private isCommandMenuOpen = false;

  // Floating command window.
  private cmdHeaderName!: Phaser.GameObjects.Text;
  private cmdHeaderRole!: Phaser.GameObjects.Text;
  private cmdPlanText!: Phaser.GameObjects.Text;
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
  private cmdExecuteBtnBg!: Phaser.GameObjects.Rectangle;
  private cmdExecuteBtnText!: Phaser.GameObjects.Text;
  private skillButtons: SkillBtnUi[] = [];

  // Authentic Hero Skills
  private unitSkills: Record<string, SkillConfig[]> = {};

  // Party status panels.
  private partyRows: Map<string, PartyRowUi> = new Map();
  private readonly rowBarWidth = 145;

  // PokeRogue Reward Selection Container
  private rewardsContainer?: Phaser.GameObjects.Container;

  // Defeat Modal (only for game over)
  private defeatBanner?: Phaser.GameObjects.Container;

  constructor() {
    super('BattleScene');
  }

  init(data: { manifests: Record<string, UnitManifest> }): void {
    const query = new URLSearchParams(window.location.search);
    this.arenaKey = query.get('arena') === 'reactor' ? 'reactor' : 'forest';
    this.previewTrio = query.get('formation') === 'trio';
    this.manifests = data.manifests;
    this.enemies = [];
    this.currentTarget = null;
    this.turnOrder = [];
    this.plannedActions.clear();
    this.partyRows.clear();
    this.skillButtons = [];
    this.unitSkills = {};
    this.activeHeroIndex = 0;
    this.currentRound = 1;
    this.fightNumber = 1;
    this.cloudDmgMultiplier = 1;
    this.aerithMagicMultiplier = 1;
    this.victoryTriggered = false;
    this.rewardSelected = false;
    this.pendingImpacts = 0;
    this.afterImpacts = undefined;
    this.isSkillMenuOpen = false;
    this.isCommandMenuOpen = false;
    this.combatState = 'SPAWNING';
    this.rewardsContainer = undefined;
    this.defeatBanner = undefined;
  }

  create(): void {
    const { width, height } = this.scale;
    const layout = getBattleLayout(width, height, BATTLE_ARENAS[this.arenaKey]);

    // Load preloaded unit skills from JSON cache
    const registry = this.cache.json.get('content_registry') as ContentRegistry;
    registry.characters.forEach((key) => {
      const data = this.cache.json.get(`skills_${key}`) as UnitSkillsData;
      if (data && Array.isArray(data.skills)) {
        this.unitSkills[key] = data.skills;
      } else {
        this.unitSkills[key] = [];
      }
    });

    // 1. Arena Background
    this.createArenaBackground(width, height);


    // 3. Target Marker for interactive selection
    this.createTargetMarker();

    // Listen for enemy clicks on the battlefield
    this.events.on('enemy_clicked', (enemy: TargetDummy) => {
      if (this.combatState === 'PLAYER_TURN' && enemy.currentHp > 0) {
        this.setTarget(enemy, true);
        const hero = this.getActiveHero();
        const plan = hero && this.plannedActions.get(hero);
        if (plan) plan.target = enemy;
        this.updateStatus(`Target selected: ${enemy.nameTag} (${enemy.currentHp} HP)`);
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.plannedActions.clear();
      this.events.removeAllListeners('enemy_clicked');
      this.input.keyboard?.removeAllListeners();
      this.afterImpacts = undefined;
    });

    // 4. Instantiate Party Units
    // Formation slots share the same viewport coordinates as movement and effects.
    this.cloud = new UnitActor(this, layout.party.cloud.x, layout.party.cloud.y, 'cloud', this.manifests.cloud, (this.cache.json.get('character_cloud') as CharacterDefinition).battle);
    this.cloud.setScale((this.cache.json.get('character_cloud') as CharacterDefinition).scale * BATTLE_ART_SCALE);
    this.cloud.setFacingLeft(true);
    this.cloud.setInteractive({ useHandCursor: true });
    this.cloud.on('pointerdown', () => {
      this.openHeroCommands(this.cloud);
    });

    this.aerith = new UnitActor(this, layout.party.aerith.x, layout.party.aerith.y, 'aerith', this.manifests.aerith, (this.cache.json.get('character_aerith') as CharacterDefinition).battle);
    this.aerith.setScale((this.cache.json.get('character_aerith') as CharacterDefinition).scale * BATTLE_ART_SCALE);
    this.aerith.setFacingLeft(true);
    this.aerith.setInteractive({ useHandCursor: true });
    this.aerith.on('pointerdown', () => {
      this.openHeroCommands(this.aerith);
    });

    this.barret = new UnitActor(this, layout.party.barret.x, layout.party.barret.y, 'barret', this.manifests.barret, (this.cache.json.get('character_barret') as CharacterDefinition).battle);
    this.barret.setScale((this.cache.json.get('character_barret') as CharacterDefinition).scale * BATTLE_ART_SCALE);
    this.barret.setFacingLeft(true);
    this.barret.setInteractive({ useHandCursor: true });
    this.barret.on('pointerdown', () => {
      this.openHeroCommands(this.barret);
    });

    // Stable display order; the player can select any available hero.
    this.turnOrder = [this.cloud, this.aerith, this.barret];

    // 5. Header UI
    this.createHeaderUI(width);

    // 6. Classic Final Fantasy Deep-Navy Bottom HUD
    this.createClassicJRPGHud(width, height);

    // Space/Enter prepare in the skill menu and commit from the command menu.
    this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (this.combatState === 'PLAYER_TURN') {
        if (this.isSkillMenuOpen) {
          this.planFirstAvailableSkill();
        } else {
          this.executePlannedAction();
        }
      }
    });
    this.input.keyboard?.on('keydown-ENTER', (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (this.combatState === 'PLAYER_TURN') {
        if (this.isSkillMenuOpen) {
          this.planFirstAvailableSkill();
        } else {
          this.executePlannedAction();
        }
      }
    });
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.combatState === 'PLAYER_TURN' && this.isSkillMenuOpen) {
        this.closeSkillSubMenu();
      } else if (this.isCommandMenuOpen) this.closeHeroCommands();
      else this.cancelPlannedAction();
    });
    this.input.keyboard?.on('keydown-BACKSPACE', () => {
      if (this.combatState === 'PLAYER_TURN' && this.isSkillMenuOpen) {
        this.closeSkillSubMenu();
      } else if (this.isCommandMenuOpen) this.closeHeroCommands();
      else this.cancelPlannedAction();
    });

    // 8. Start Battle 1: Materialize encounter 1, then unlocks Round 1!
    this.spawnEncounter(1, () => {
      this.startRound();
    });
  }

  update(): void {
    this.enemyTargetPanel?.update(
      ['PLAYER_TURN', 'HERO_ATTACKING', 'ENEMY_TURN'].includes(this.combatState) ? this.currentTarget : null
    );
    // Dynamic Y-depth sorting
    if (this.cloud) this.cloud.updateDepth();
    if (this.aerith) this.aerith.updateDepth();
    if (this.barret) this.barret.updateDepth();
    this.enemies.forEach((e) => {
      if (e.visible) e.updateDepth();
    });
  }

  private createArenaBackground(width: number, height: number): void {
    const definition = BATTLE_ARENAS[this.arenaKey];
    const { arena } = getBattleLayout(width, height, definition);
    const background = this.add.image(arena.x + arena.width / 2, arena.y + arena.height / 2, definition.texture)
      .setDepth(-100);
    // Cover the arena proportionally; source floor bounds use this same crop.
    background.setScale(Math.max(arena.width / background.width, arena.height / background.height));
    background.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }

  private createHeaderUI(width: number): void {
    this.enemyTargetPanel = new EnemyTargetPanel(this);
    const headerBg = this.add.rectangle(width / 2, 24, width, 48, 0x141d1d, 0.96);
    headerBg.setStrokeStyle(1, 0x655f4d);
    headerBg.setDepth(1000);

    this.roundBannerText = this.add.text(20, 5, `BATTLE ${this.fightNumber}/${this.totalFights} • ROUND 1`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#d3c29a',
    }).setDepth(1001);

    this.statusText = this.add.text(20, 27, 'Ready for action...', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#adb5aa',
      wordWrap: { width: width - 40 },
      maxLines: 1,
    }).setDepth(1001);

    // Reset Battle Button in Header
    const resetBtn = this.createHeaderButton(width - 65, 20, 'Restart', () => {
      this.resetBattle();
    });
    resetBtn.setDepth(1001);
  }

  private createHeaderButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 90, 30, 0x202b29, 0.95);
    bg.setStrokeStyle(1, 0x655f4d);
    bg.setInteractive({ useHandCursor: true });

    const txt = this.add.text(0, 0, label, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#c8cebf',
    }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setStrokeStyle(1, 0xc2ac73));
    bg.on('pointerout', () => bg.setStrokeStyle(1, 0x655f4d));
    bg.on('pointerdown', onClick);

    container.add([bg, txt]);
    return container;
  }

  /** Persistent desktop dock: party selection and all commands remain visible. */
  private createClassicJRPGHud(width: number, height: number): void {
    const layout = getBattleLayout(width, height);
    const top = layout.partyTop;
    this.bottomHudContainer = this.add.container(0, 0).setDepth(1002);
    this.bottomHudContainer.add(this.add.rectangle(width / 2, top + 150, width, 300, 0x101919, 0.98));
    const gap = 10;
    const cardWidth = (width - 32 - gap * 2) / 3;
    this.turnOrder.forEach((hero, index) => {
      const container = this.add.container(16 + index * (cardWidth + gap), top + 64);
      const plate = this.add.image(cardWidth / 2, 0, 'ui_party_plate').setDisplaySize(cardWidth, 112).setAlpha(0.7);
      const highlightBg = this.add.rectangle(cardWidth / 2, 0, cardWidth, 112, 0x293632, 0.3).setStrokeStyle(1, 0x655f4d);
      const cursorText = this.add.text(6, -42, '›', { fontSize: '22px', color: '#d3bc83' });
      const nameText = this.add.text(70, -44, hero.heroName, { fontFamily: 'Arial', fontSize: '19px', color: '#ede8d8', fontStyle: 'bold' });
      const roleText = this.add.text(70, -21, hero.heroRole, { fontFamily: 'Arial', fontSize: '12px', color: '#a4afa5' });
      const barX = 70;
      const barBg = this.add.rectangle(barX, 13, this.rowBarWidth, 5, 0x101715).setOrigin(0, 0.5);
      const chipBar = this.add.rectangle(barX, 13, this.rowBarWidth, 5, 0xd3bc83).setOrigin(0, 0.5);
      const fgBar = this.add.rectangle(barX, 13, this.rowBarWidth, 5, 0x8eaf80).setOrigin(0, 0.5);
      const hpText = this.add.text(barX, -6, '', { fontFamily: 'Arial', fontSize: '13px', color: '#dedfce' });
      const mpBarBg = this.add.rectangle(barX, 43, this.rowBarWidth, 4, 0x101715).setOrigin(0, 0.5);
      const mpFgBar = this.add.rectangle(barX, 43, this.rowBarWidth, 4, 0x829da9).setOrigin(0, 0.5);
      const mpText = this.add.text(barX, 24, '', { fontFamily: 'Arial', fontSize: '13px', color: '#a2b7bf' });
      const statusText = this.add.text(cardWidth - 12, -18, 'SELECT', {
        fontFamily: 'Arial', fontSize: '12px', color: '#d3bc83', align: 'right', wordWrap: { width: 84 },
      }).setOrigin(1, 0);
      container.add([plate, highlightBg, cursorText, nameText, roleText, barBg, chipBar, fgBar, hpText, mpBarBg, mpFgBar, mpText, statusText]);
      container.add(this.add.image(33, -12, `portrait_${hero.unitKey}`).setScale(1.2));
      const selectArea = this.add.zone(cardWidth / 2, 0, cardWidth, 112).setInteractive({ useHandCursor: true });
      selectArea.on('pointerup', () => this.handleHeroPanelInput(hero));
      container.add(selectArea);
      this.bottomHudContainer.add(container);
      this.partyRows.set(hero.unitKey, { container, cursorText, highlightBg, nameText, roleText, fgBar, chipBar, hpText, mpBarBg, mpFgBar, mpText, statusText, lastHp: hero.maxHp });
    });

    this.commandPanel = this.add.container(width / 2, layout.commandY);
    this.commandPanel.add(this.add.image(0, 0, 'ui_command_plate').setDisplaySize(width - 24, 164));
    this.cmdHeaderName = this.add.text(-width / 2 + 24, -75, 'CLOUD', { fontFamily: 'Arial', fontSize: '16px', fontStyle: 'bold', color: '#ede8d8' });
    this.cmdHeaderRole = this.add.text(-width / 2 + 130, -75, '', { fontFamily: 'Arial', fontSize: '13px', color: '#a4afa5' });
    this.cmdPlanText = this.add.text(-width / 2 + 24, 57, '', { fontFamily: 'Arial', fontSize: '12px', color: '#c8cebf', wordWrap: { width: 720 }, maxLines: 2 });
    this.commandPanel.add([this.cmdHeaderName, this.cmdHeaderRole, this.cmdPlanText]);
    this.cmdMainContainer = this.add.container(0, 0);
    this.cmdSkillContainer = this.add.container(0, 0);
    const startX = -width / 2 + 24;
    const optionWidth = 174;
    const option = (index: number, title: string, iconKey: string, action: () => void) => {
      const x = startX + index * 182;
      const bg = this.add.rectangle(x + optionWidth / 2, 2, optionWidth, 80, 0x293632, 0.5).setStrokeStyle(1, 0x655f4d).setInteractive({ useHandCursor: true });
      const icon = this.add.image(x + 29, 1, iconKey).setDisplaySize(48, 48);
      const nameText = this.add.text(x + 58, -22, title, { fontFamily: 'Arial', fontSize: '15px', color: '#ede8d8', wordWrap: { width: 110 } });
      const tagText = this.add.text(x + 58, 22, '', { fontFamily: 'Arial', fontSize: '12px', color: '#a2b7bf' });
      bg.on('pointerdown', action);
      bg.on('pointerover', () => bg.setAlpha(0.8));
      bg.on('pointerout', () => bg.setAlpha(1));
      this.cmdSkillContainer.add([bg, icon, nameText, tagText]);
      return { bg, nameText, tagText, icon, skill: null };
    };
    const attack = option(0, 'Attack', 'ui_attack', () => this.planHeroAttack());
    attack.tagText.setText('Q · No MP');
    this.cmdAttackBtnBg = attack.bg;
    this.cmdAttackBtnText = attack.nameText;
    this.skillButtons = Array.from({ length: 3 }, (_, index) => {
      const ui: SkillBtnUi = option(index + 1, '', 'ui_ability', () => { if (ui.skill) this.planHeroSkill(ui.skill); });
      ui.bg.on('pointerover', () => {
        if (ui.skill) this.cmdPlanText.setText(ui.skill.desc);
      });
      ui.bg.on('pointerout', () => this.updateCommandMenu());
      return ui;
    });
    this.cmdExecuteBtnBg = this.add.rectangle(width / 2 - 112, 5, 164, 74, 0x45634d).setStrokeStyle(1, 0xc2ac73).setInteractive({ useHandCursor: true });
    this.cmdExecuteBtnBg.on('pointerdown', () => this.executePlannedAction());
    this.cmdExecuteBtnText = this.add.text(width / 2 - 112, 5, 'Execute', { fontFamily: 'Arial', fontSize: '18px', color: '#ede8d8', align: 'center' }).setOrigin(0.5);
    this.cmdModeBtnBg = this.add.rectangle(width / 2 - 112, -64, 164, 26, 0x293632).setInteractive({ useHandCursor: true });
    this.cmdModeBtnBg.on('pointerdown', () => this.toggleAerithMode());
    this.cmdModeBtnText = this.add.text(width / 2 - 112, -64, 'Melee', { fontFamily: 'Arial', fontSize: '13px', color: '#cba6b1' }).setOrigin(0.5);
    this.cmdSkillBtnBg = this.add.rectangle(width / 2 - 112, 66, 164, 25, 0x141d1d).setInteractive({ useHandCursor: true });
    this.cmdSkillBtnBg.on('pointerdown', () => this.cancelPlannedAction());
    this.cmdSkillBtnText = this.add.text(width / 2 - 112, 66, 'Clear', { fontFamily: 'Arial', fontSize: '13px', color: '#a4afa5' }).setOrigin(0.5);
    this.commandPanel.add([this.cmdMainContainer, this.cmdSkillContainer, this.cmdExecuteBtnBg, this.cmdExecuteBtnText, this.cmdModeBtnBg, this.cmdModeBtnText, this.cmdSkillBtnBg, this.cmdSkillBtnText]);
    this.bottomHudContainer.add(this.commandPanel);
    ['ONE', 'TWO', 'THREE'].forEach((key, index) => this.input.keyboard?.on(`keydown-${key}`, () => this.openHeroCommands(this.turnOrder[index])));
    this.input.keyboard?.on('keydown-Q', () => this.planHeroAttack());
    ['W', 'E', 'R'].forEach((key, index) => this.input.keyboard?.on(`keydown-${key}`, () => {
      const hero = this.getActiveHero();
      const skill = hero && this.unitSkills[hero.unitKey]?.[index];
      if (skill) this.planHeroSkill(skill);
    }));
  }

  /** Selecting a party card never commits a prepared command. */
  public handleHeroPanelInput(hero: UnitActor, _edit = false): void {
    if (this.combatState !== 'PLAYER_TURN' || hero.isDead || hero.hasActed || !this.turnOrder.includes(hero)) return;
    this.openHeroCommands(hero);
  }

  public openHeroCommands(hero: UnitActor): void {
    if (this.combatState !== 'PLAYER_TURN' || hero.isDead || hero.hasActed || !this.turnOrder.includes(hero)) return;
    this.selectHero(hero);
    this.isCommandMenuOpen = true;
    this.refreshPlannedPose(hero);
    this.updateCommandMenu();
  }

  public closeHeroCommands(): void {
    if (this.combatState !== 'PLAYER_TURN') return;
    this.isCommandMenuOpen = false;
    this.isSkillMenuOpen = false;
    const hero = this.getActiveHero();
    if (hero) this.refreshPlannedPose(hero);
    this.updateCommandMenu();
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
    const plan = this.plannedActions.get(this.aerith);
    if (plan?.kind === 'attack') {
      plan.config = { ...this.aerith.combatConfig };
      this.refreshPlannedPose(this.aerith);
    }
  }

  private getActiveHero(): UnitActor | undefined {
    return this.turnOrder[this.activeHeroIndex];
  }

  /** Selecting an available hero never spends their action or MP. */
  public selectHero(hero: UnitActor): void {
    if (this.combatState !== 'PLAYER_TURN' || hero.isDead || hero.hasActed) return;
    const index = this.turnOrder.indexOf(hero);
    if (index < 0) return;
    const previous = this.getActiveHero();
    this.isSkillMenuOpen = false;
    this.isCommandMenuOpen = false;
    if (previous) this.refreshPlannedPose(previous);
    this.activeHeroIndex = index;
    this.refreshPlannedPose(hero);
    const plan = this.plannedActions.get(hero);
    if (plan?.target && plan.target.currentHp > 0) this.setTarget(plan.target, false);
    this.updateCommandMenu();
    this.updatePartyStatusUi();
    this.updateStatus(`${hero.heroName}: choose a command below, then Execute.`);
  }

  private refreshPlannedPose(hero: UnitActor): void {
    const plan = this.plannedActions.get(hero);
    if (plan) hero.playCommandPose(plan.kind === 'skill' ? plan.skill.motion === 'magic_atk' : plan.config.attackAnim === 'magic_atk');
    else if (hero === this.getActiveHero() && (this.isSkillMenuOpen || this.isCommandMenuOpen)) hero.playCommandPose();
    else hero.clearCommandPose();
  }

  public planHeroAttack(): void {
    const hero = this.getActiveHero();
    if (this.combatState !== 'PLAYER_TURN' || !hero || hero.isDead || hero.hasActed) return;
    this.plannedActions.set(hero, { kind: 'attack', config: { ...hero.combatConfig }, target: this.currentTarget });
    this.finishPlanning(hero, 'Attack');
  }

  public planHeroSkill(skill: SkillConfig): void {
    const hero = this.getActiveHero();
    if (this.combatState !== 'PLAYER_TURN' || !hero || hero.isDead || hero.hasActed) return;
    if (!(this.unitSkills[hero.unitKey] ?? []).includes(skill)) return;
    if (hero.currentMp < skill.mpCost) {
      this.updateStatus(`Not enough MP to prepare ${skill.name}.`);
      return;
    }
    this.plannedActions.set(hero, { kind: 'skill', skill, target: this.currentTarget });
    this.finishPlanning(hero, skill.name);
  }

  private finishPlanning(hero: UnitActor, label: string): void {
    this.isSkillMenuOpen = false;
    this.isCommandMenuOpen = false;
    this.refreshPlannedPose(hero);
    this.updateCommandMenu();
    this.updatePartyStatusUi();
    this.updateStatus(`${label} ready. Choose a target, then Execute or press Space.`);
  }

  public executePlannedAction(): void {
    const hero = this.getActiveHero();
    if (this.combatState !== 'PLAYER_TURN' || !hero || hero.isDead || hero.hasActed) return;
    const plan = this.plannedActions.get(hero);
    if (!plan) { this.updateStatus('Prepare an Attack or Skill first.'); return; }
    if (plan.kind === 'skill' && hero.currentMp < plan.skill.mpCost) {
      this.updateStatus(`Not enough MP to execute ${plan.skill.name}. Change the prepared command.`);
      return;
    }
    if (plan.target && plan.target.currentHp > 0) this.setTarget(plan.target, false);
    this.isCommandMenuOpen = false;
    this.plannedActions.delete(hero);
    if (plan.kind === 'attack') {
      hero.combatConfig = { ...plan.config };
      this.executeActiveHeroAttack();
    } else this.executeSkillChoice(plan.skill);
  }

  public cancelPlannedAction(): void {
    const hero = this.getActiveHero();
    if (this.combatState !== 'PLAYER_TURN' || !hero || !this.plannedActions.has(hero)) return;
    this.plannedActions.delete(hero);
    this.refreshPlannedPose(hero);
    this.updateCommandMenu();
    this.updatePartyStatusUi();
    this.updateStatus(`${hero.heroName}: Prepared command cleared.`);
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
      color: '#e7d19b',
      stroke: '#1b2432',
      strokeThickness: 4,
      fontStyle: 'bold',
    }).setOrigin(0.5, 1.0);

    // Pill label [TARGET] above the arrow
    const labelBg = this.add.rectangle(0, -22, 52, 16, 0x192c3b, 0.95);
    labelBg.setStrokeStyle(1, 0xb69b63);
    const labelText = this.add.text(0, -22, 'TARGET', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#ede8d8',
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

    this.tweens.killTweensOf(this.targetMarkerContainer);
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
    this.combatState = 'SPAWNING';
    this.currentTarget = null;
    this.victoryTriggered = false;
    this.plannedActions.clear();
    this.rewardSelected = false;
    this.targetMarkerContainer.setVisible(false);
    this.lockCommandMenu();
    const enemySlots = getBattleLayout(this.scale.width, this.scale.height, BATTLE_ARENAS[this.arenaKey]).enemies;
    const preview: EnemySlotConfig[] | undefined = this.previewTrio && fightNum === 1
      ? [
        { slot: 'top', hp: 3500, nameTag: 'DIRE RAT A', isBoss: false },
        { slot: 'center', hp: 3500, nameTag: 'DIRE RAT B', isBoss: false },
        { slot: 'bottom', hp: 3500, nameTag: 'DIRE RAT C', isBoss: false },
      ] : undefined;
    const configs = (preview ?? ENCOUNTERS[fightNum] ?? [
      // Fallback for fight 3+: scale fight 2 with HP scaling
      { slot: 'top' as const, hp: Math.round(3500 * Math.pow(1.18, fightNum - 1)), nameTag: 'DIRE RAT A', isBoss: false },
      { slot: 'bottom' as const, hp: Math.round(3500 * Math.pow(1.18, fightNum - 1)), nameTag: 'DIRE RAT B', isBoss: false },
    ]).map((config) => ({
      ...config,
      ...enemySlots[config.slot],
    }));

    // Ensure enough TargetDummy instances in pool
    while (this.enemies.length < configs.length) {
      const dummy = new TargetDummy(this, 0, 0, this.manifests.training_dummy);
      this.enemies.push(dummy);
    }

    // Hide any unused dummies from prior fights
    for (let i = configs.length; i < this.enemies.length; i++) {
      this.enemies[i].currentHp = 0;
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
    aliveHeroes.forEach((h) => {
      h.hasActed = false;
      h.clearCommandPose();
    });

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
    this.roundBannerText.setColor('#d3c29a');

    this.updateCommandMenu();
    this.updatePartyStatusUi();
    this.updateStatus(`Round ${this.currentRound}: Prepare commands for any ready heroes. Choose who executes first.`);
  }

  /**
   * Advances the turn pointer to the next living hero who hasn't acted yet.
   */
  private advanceToNextHero(): void {
    if (this.combatState !== 'HERO_ATTACKING' && this.combatState !== 'VICTORY') return;
    const allDead = this.enemies.every((e) => e.currentHp <= 0);
    if (allDead || this.combatState === 'VICTORY') {
      this.triggerVictory();
      return;
    }

    // Find next alive hero that hasn't acted
    const nextIdx = this.turnOrder.findIndex(hero => !hero.isDead && !hero.hasActed);

    if (nextIdx >= 0) {
      // Next hero found
      this.activeHeroIndex = nextIdx;
      this.isSkillMenuOpen = false;
      this.combatState = 'PLAYER_TURN';
      this.updateCommandMenu();
      this.updatePartyStatusUi();
      this.updateStatus(`${this.getActiveHero()?.heroName} ready. You can select any remaining hero.`);
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
   * Refreshes the floating command menu without changing prepared actions.
   */
  private updateCommandMenu(): void {
    const hero = this.getActiveHero();
    const available = this.combatState === 'PLAYER_TURN' && !!hero && !hero.isDead && !hero.hasActed;
    const prepared = hero && this.plannedActions.get(hero);
    this.commandPanel.setVisible(true);
    this.cmdMainContainer.setVisible(true);
    this.cmdSkillContainer.setVisible(true);
    this.cmdHeaderName.setText(hero?.heroName ?? 'COMMANDS');
    this.cmdHeaderRole.setText(available ? 'Choose a command' : 'Waiting for the next action');
    this.cmdPlanText.setText(prepared ? `Ready: ${prepared.kind === 'attack' ? 'Attack' : prepared.skill.name} · Space to execute` : '1–3: hero · Q/W/E/R: command · Space: execute');
    const enable = (bg: Phaser.GameObjects.Rectangle, enabled: boolean, selected = false) => {
      if (enabled) bg.setInteractive({ useHandCursor: true }); else bg.disableInteractive();
      bg.setFillStyle(selected ? 0x45634d : 0x182422, enabled ? 0.8 : 0.5);
      bg.setStrokeStyle(1, selected ? 0xd3bc83 : 0x655f4d);
    };
    enable(this.cmdAttackBtnBg, available, prepared?.kind === 'attack');
    this.cmdAttackBtnText.setText(hero === this.barret ? 'Attack · Burst' : 'Attack');
    this.cmdAttackBtnText.setAlpha(available ? 1 : 0.4);
    const skills = hero ? this.unitSkills[hero.unitKey] ?? [] : [];
    this.skillButtons.forEach((button, index) => {
      const skill = skills[index];
      button.skill = skill ?? null;
      const affordable = available && !!skill && hero.currentMp >= skill.mpCost;
      enable(button.bg, affordable, prepared?.kind === 'skill' && prepared.skill === skill);
      button.nameText.setText(skill?.name ?? 'Unavailable');
      button.tagText.setText(skill ? `${['W', 'E', 'R'][index]} · ${skill.mpCost} MP` : '');
      button.nameText.setAlpha(affordable ? 1 : 0.45);
      button.tagText.setColor(available && skill && !affordable ? '#ca7768' : '#a2b7bf');
      button.icon?.setTexture(skill?.motion === 'magic_atk' ? 'ui_magic' : 'ui_ability').setAlpha(affordable ? 1 : 0.35);
    });
    enable(this.cmdExecuteBtnBg, available && !!prepared);
    this.cmdExecuteBtnText.setText(available && prepared ? 'Execute ▶' : 'Execute');
    this.cmdExecuteBtnText.setAlpha(available && prepared ? 1 : 0.4);
    enable(this.cmdSkillBtnBg, available && !!prepared);
    const isAerith = available && hero === this.aerith;
    this.cmdModeBtnBg?.setVisible(isAerith);
    this.cmdModeBtnText?.setVisible(isAerith).setText(hero?.combatConfig.attackType === 'ranged' ? 'Stance: Magic' : 'Stance: Melee');
  }

  public openSkillSubMenu(): void {
    if (this.combatState !== 'PLAYER_TURN') return;
    const hero = this.getActiveHero();
    if (!hero || hero.isDead || hero.hasActed) return;

    this.isSkillMenuOpen = true;
    this.isCommandMenuOpen = true;
    hero.playCommandPose();
    this.updateCommandMenu();
  }

  public closeSkillSubMenu(): void {
    if (this.combatState !== 'PLAYER_TURN') return;
    this.isSkillMenuOpen = false;
    const hero = this.getActiveHero();
    if (hero) this.refreshPlannedPose(hero);
    this.updateCommandMenu();
  }

  /**
   * Locks the command menu so remaining heroes or buttons cannot be clicked after fight end.
   */
  private lockCommandMenu(): void {
    this.isCommandMenuOpen = false;
    this.commandPanel?.setVisible(false);
    this.isSkillMenuOpen = false;
    this.cmdMainContainer.setVisible(true);
    this.cmdSkillContainer.setVisible(false);

    this.cmdAttackBtnBg.disableInteractive();
    this.cmdAttackBtnBg.fillColor = 0x141d1d;
    this.cmdAttackBtnBg.setStrokeStyle(1, 0x514f42);
    this.cmdAttackBtnText.setText('★ VICTORY ★');
    this.cmdAttackBtnText.setColor('#d3bc83');

    this.cmdSkillBtnBg.disableInteractive();
    this.cmdSkillBtnBg.fillColor = 0x141d1d;
    this.cmdSkillBtnBg.setStrokeStyle(1, 0x514f42);
    this.cmdSkillBtnText.setColor('#8a938a');

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
   * Refreshes party panels, prepared actions, chip damage and MP.
   */
  private updatePartyStatusUi(): void {
    const activeHero = this.getActiveHero();

    this.turnOrder.forEach((hero) => {
      const row = this.partyRows.get(hero.unitKey);
      if (!row) return;

      const isActive = this.combatState === 'PLAYER_TURN' && hero === activeHero && !hero.isDead && !hero.hasActed;

      // 1. Cursor & Row Highlight
      row.cursorText.setVisible(isActive);
      row.highlightBg.setVisible(true);
      row.highlightBg.setFillStyle(isActive ? 0x344139 : 0x1b2523, isActive ? 0.45 : 0.25);
      row.highlightBg.setStrokeStyle(1, isActive ? 0xc2ac73 : 0x514f42, isActive ? 1 : 0.6);
      row.container.setAlpha(hero.isDead ? 0.45 : hero.hasActed ? 0.65 : 1);

      if (isActive) {
        row.nameText.setColor('#d3c29a');
      } else if (hero.isDead) {
        row.nameText.setColor('#8a938a');
      } else {
        row.nameText.setColor('#ede8d8');
      }

      // 2. 2-Phase HP Bar
      const pct = Math.max(0, hero.currentHp / hero.maxHp);
      const targetWidth = this.rowBarWidth * pct;

      row.fgBar.width = targetWidth;
      if (pct > 0.5) row.fgBar.fillColor = 0x8eaf80;
      else if (pct > 0.25) row.fgBar.fillColor = 0xc2a56b;
      else row.fgBar.fillColor = 0xca7768;

      // Keep the delay inside the tween so a later hit or heal can cancel it.
      if (hero.currentHp !== row.lastHp) {
        row.chipTween?.stop();
        if (hero.currentHp < row.lastHp) {
          row.chipTween = this.tweens.add({
            targets: row.chipBar,
            width: targetWidth,
            delay: 200,
            duration: 400,
            ease: 'Cubic.easeOut',
          });
        } else {
          row.chipBar.width = targetWidth;
        }
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
        row.statusText.setColor('#788478');
      } else if (isActive) {
        row.statusText.setText('SELECTED');
        row.statusText.setColor('#d3bc83');
      } else {
        row.statusText.setText('SELECT');
        row.statusText.setColor('#a4afa5');
      }
      const plan = this.plannedActions.get(hero);
      if (plan && !hero.isDead && !hero.hasActed) {
        row.statusText.setText(plan.kind === 'attack' ? 'ATTACK READY' : plan.skill.name.toUpperCase());
        row.statusText.setFontSize(12);
        row.statusText.setColor(plan.kind === 'skill' && plan.skill.motion === 'magic_atk' ? '#c6b1cf' : '#a9c58e');
      } else row.statusText.setFontSize(12);
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
      row.statusText.setColor('#d3bc83');
    }

    this.startHeroAction(hero, hero.combatConfig.attackAnim, () => this.executeHeroSequence(hero, () => {
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
    }));
  }

  /**
   * Prepares the skill at slot index (0, 1, 2) from keyboard shortcut.
   */
  public planSkillByIndex(idx: number): void {
    if (this.combatState !== 'PLAYER_TURN' || !this.isSkillMenuOpen) return;
    const btn = this.skillButtons[idx];
    if (btn && btn.skill) {
      this.planHeroSkill(btn.skill);
    }
  }

  /**
   * Prepares the first affordable skill (Space/Enter in the skill menu).
   */
  public planFirstAvailableSkill(): void {
    if (this.combatState !== 'PLAYER_TURN') return;
    const hero = this.getActiveHero();
    if (!hero) return;
    const skills = this.unitSkills[hero.unitKey] || [];
    const affordable = skills.find((s) => hero.currentMp >= s.mpCost);
    if (affordable) {
      this.planHeroSkill(affordable);
    } else if (skills.length > 0) {
      this.planHeroSkill(skills[0]);
    }
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
      row.statusText.setColor('#c6b1cf');
    }

    this.startHeroAction(hero, skill.motion, () => this.executeGenericSkill(hero, skill, () => this.concludeHeroSkill(hero)));
  }

  /** Show one full magic readiness cycle before starting the cast timeline. */
  private startHeroAction(hero: UnitActor, motion: string, action: () => void): void {
    const preparation = motion === 'magic_atk' ? hero.manifest.animations.magic_standby : undefined;
    if (!preparation) {
      action();
      return;
    }
    hero.playCommandPose(true);
    const duration = preparation.frames.reduce((total, frame) => total + frame.durationMs, 0);
    this.time.delayedCall(duration, () => {
      if (this.combatState === 'HERO_ATTACKING' && !hero.isDead) action();
    });
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
    if (skill.presentation) {
      this.executeAreaPresentation(hero, skill, onComplete);
      return;
    }
    const target = this.currentTarget && this.currentTarget.currentHp > 0
      ? this.currentTarget
      : this.autoRetarget();

    const triggerImpact = () => {
      if (this.combatState !== 'HERO_ATTACKING') return;
      if (skill.scope === 'single_enemy') {
        const hitTarget = this.currentTarget && this.currentTarget.currentHp > 0 ? this.currentTarget : target;
        if (!hitTarget || hitTarget.currentHp <= 0) return;

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
      const arrivalX = target.x + hero.combatConfig.targetOffsetX * BATTLE_ART_SCALE;
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
          hero.playAnimation(skill.motion);
          if (skill.visualEffect) {
            const effect = skill.visualEffect;
            this.time.delayedCall(effect.startFrame * 1000 / 60, () => {
              if (this.combatState === 'HERO_ATTACKING' && target.currentHp > 0) {
                this.playSkillEffect(effect.key, target);
              }
            });
          }
          const impactDelay = skill.visualEffect ? (skill.attackFrames[0] ?? 6) * 1000 / 60 : 160;
          this.time.delayedCall(impactDelay, triggerImpact);

          const motionDuration = skill.visualEffect
            ? hero.manifest.animations[skill.motion].frames.reduce((total, frame) => total + frame.durationMs, 0) + 80
            : 650;
          this.time.delayedCall(motionDuration, () => {
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
                hero.playRestPose();
                onComplete();
              },
            });
          });
        },
      });
    } else {
      const scopeDesc = skill.scope === 'party' ? 'on party' : skill.scope === 'all_enemies' ? 'on all enemies' : `at ${target?.nameTag || 'enemy'}`;
      this.updateStatus(`Action: ${hero.heroName} casts ${skill.name} ${scopeDesc}!`);
      hero.playAnimation(skill.motion);

      this.time.delayedCall(200, triggerImpact);

      this.time.delayedCall(900, () => {
        hero.returnToIdle(() => this.finishAfterImpacts(onComplete));
      });
    }
  }

  /** Play a prepared effect once, above actors and below combat feedback. */
  private playSkillEffect(key: string, target: TargetDummy): void {
    const center = target.sprite.getCenter(undefined, true);
    this.playSkillEffectAt(key, center.x, center.y);
  }

  /** Shared stationary area presentation; source hit metadata remains separate. */
  private executeAreaPresentation(hero: UnitActor, skill: SkillConfig, onComplete: () => void): void {
    const presentation = skill.presentation!;
    const targets = this.enemies.filter(enemy => enemy.currentHp > 0);
    if (!targets.length) { onComplete(); return; }
    const anchors = targets.map(enemy => ({ x: enemy.x, y: enemy.y - 50 }));
    const group = { x: anchors.reduce((sum, p) => sum + p.x, 0) / anchors.length,
      y: anchors.reduce((sum, p) => sum + p.y, 0) / anchors.length };
    this.updateStatus(`Action: ${hero.heroName} uses ${skill.name} on all enemies!`);
    hero.playAnimation(skill.motion);
    for (const effect of presentation.effects) {
      this.time.delayedCall(effect.startFrame * 1000 / 60, () => {
        if (this.combatState !== 'HERO_ATTACKING') return;
        const points = effect.anchor === 'screen'
          ? [{ x: this.scale.width / 2, y: getBattleLayout(this.scale.width, this.scale.height, BATTLE_ARENAS[this.arenaKey]).partyTop / 2 }]
          : effect.anchor === 'target-group' ? [group] : anchors;
        for (const point of points) {
          this.playSkillEffectAt(effect.key, point.x, point.y, effect.layer ?? 'front', effect.fit === 'arena');
        }
      });
    }
    this.time.delayedCall(presentation.impactFrame * 1000 / 60, () => {
      if (this.combatState !== 'HERO_ATTACKING') return;
      const base = hero === this.cloud ? Phaser.Math.Between(300, 380) * this.cloudDmgMultiplier
        : hero === this.aerith ? Phaser.Math.Between(280, 360) * this.aerithMagicMultiplier
        : Phaser.Math.Between(240, 320);
      const damage = Math.round(base * skill.damageMultiplier);
      for (const enemy of targets) {
        if (enemy.currentHp <= 0) continue;
        enemy.applyDamage(damage, false, skill.motion === 'magic_atk' ? 'holy' : 'physical', true);
        this.handleTargetDamaged(enemy);
      }
      this.updatePartyStatusUi();
    });
    const motionMs = hero.manifest.animations[skill.motion].frames.reduce((sum, frame) => sum + frame.durationMs, 0);
    this.time.delayedCall(Math.max(motionMs, presentation.durationFrames * 1000 / 60), () => {
      hero.returnToIdle(() => this.finishAfterImpacts(onComplete));
    });
  }

  private playSkillEffectAt(key: string, x: number, y: number, layer: 'front' | 'back' = 'front', fitArena = false): void {
    const meta = this.cache.json.get(`effect_${key}_manifest`) as EffectManifest | undefined;
    if (!meta || !this.textures.exists(`effect_${key}`)) return;
    const animationKey = `effect_${key}_play`;
    if (!this.anims.exists(animationKey)) {
      this.anims.create({ key: animationKey,
        frames: this.anims.generateFrameNumbers(`effect_${key}`, { start: 0, end: meta.frameCount - 1 }),
        frameRate: meta.frameRate, repeat: 0,
      });
    }
    const sprite = this.add.sprite(x, y, `effect_${key}`)
      .setOrigin(meta.originX, meta.originY).setScale(meta.scale * BATTLE_ART_SCALE)
      .setDepth(layer === 'back' ? -50 : 1100)
      .setBlendMode(meta.blend === 'NORMAL' ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
    const field = getBattleLayout(this.scale.width, this.scale.height, BATTLE_ARENAS[this.arenaKey]).arena;
    if (fitArena && meta.contentBounds) {
      const bounds = meta.contentBounds, scaleX = field.width / bounds.width, scaleY = field.height / bounds.height;
      sprite.setScale(scaleX, scaleY).setPosition(
        field.x - (bounds.x - meta.originX * meta.frameWidth) * scaleX,
        field.y - (bounds.y - meta.originY * meta.frameHeight) * scaleY);
    }
    const clip = this.make.graphics({}, false);
    clip.fillStyle(0xffffff).fillRect(field.x, field.y, field.width, field.height);
    const mask = clip.createGeometryMask();
    sprite.setMask(mask);
    sprite.once('destroy', () => { sprite.clearMask(); mask.destroy(); clip.destroy(); });
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy());
    sprite.play(animationKey);
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
        hero.returnToIdle(() => this.finishAfterImpacts(onComplete));
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
            this.fireMagicProjectile(activeTarget);
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
            this.fireMagicProjectile(fallback);
          }
        }
        hero.returnToIdle(() => this.finishAfterImpacts(onComplete));
      });
    } else {
      // --- MELEE MOVE-TO-TARGET (Cloud / Aerith Melee) ---
      const activeTarget = this.currentTarget && this.currentTarget.currentHp > 0
        ? this.currentTarget
        : target;

      const attackArrivalX = activeTarget.x + config.targetOffsetX * BATTLE_ART_SCALE;
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
                hero.playRestPose();
                onComplete();
              },
            });
          });
        },
      });
    }
  }

  private applyHeroMeleeDamage(hero: UnitActor, target: TargetDummy): void {
    if (this.combatState !== 'HERO_ATTACKING' || target.currentHp <= 0) return;
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

  private finishAfterImpacts(onComplete: () => void): void {
    if (this.pendingImpacts === 0) onComplete();
    else this.afterImpacts = onComplete;
  }

  private resolvePendingImpact(): void {
    this.pendingImpacts--;
    if (this.pendingImpacts === 0) {
      const onComplete = this.afterImpacts;
      this.afterImpacts = undefined;
      onComplete?.();
    }
  }

  private fireMagicProjectile(target: TargetDummy): void {
    // Preserve travel timing without geometric placeholder spell effects.
    this.pendingImpacts++;
    this.time.delayedCall(180, () => {
      if (this.combatState === 'HERO_ATTACKING' && target.currentHp > 0) {
        let baseDmg = Phaser.Math.Between(700, 900);
        baseDmg = Math.round(baseDmg * this.aerithMagicMultiplier);
        const isCrit = Math.random() < 0.15;
        target.applyDamage(isCrit ? Math.round(baseDmg * 1.5) : baseDmg, isCrit, 'holy');
        this.handleTargetDamaged(target);
      }
      this.resolvePendingImpact();
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
    this.pendingImpacts++;
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
        if (this.combatState === 'HERO_ATTACKING' && target.currentHp > 0) {
          target.applyDamage(damage, isCrit, 'physical');
          this.handleTargetDamaged(target);
        }
        this.resolvePendingImpact();
      },
    });
  }

  /**
   * Sequential enemy turn: each living enemy attacks one after another with 250ms pause.
   */
  private executeEnemyTurn(): void {
    if (this.combatState !== 'ENEMY_TURN') return;
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
      if (this.combatState !== 'ENEMY_TURN') return;
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
    this.plannedActions.clear();

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
        hero.playVictory();
      }
    });

    // 3. Golden top victory banner
    this.roundBannerText.setText('★  V I C T O R Y  ★');
    this.roundBannerText.setColor('#d3bc83');
    this.updateStatus(`Battle ${this.fightNumber} of ${this.totalFights} clear!`);

    // 4. Slide bottom HUD down off-screen
    this.tweens.add({
      targets: this.bottomHudContainer,
      y: 300,
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

    const { width, height } = this.scale;
    this.rewardsContainer = this.add.container(0, 300);
    this.rewardsContainer.setDepth(1500);

    const rewards: RewardCardData[] = [
      {
        id: 'cloud_buff',
        category: '✦ ATK BUFF',
        categoryColor: '#d3bc83',
        title: 'Courage Buff',
        target: 'Cloud (Vanguard)',
        desc: '+15% DMG permanent',
        icon: '⚔',
      },
      {
        id: 'aerith_buff',
        category: '✦ MATERIA BUFF',
        categoryColor: '#cba6b1',
        title: 'Materia Focus',
        target: 'Aerith (Healer)',
        desc: '+25% Magic & Healing',
        icon: '✦',
      },
      {
        id: 'party_heal',
        category: '✦ RECOVERY',
        categoryColor: '#a9c58e',
        title: 'Field Rest',
        target: 'Entire Party',
        desc: 'Restores 40% Max HP & 30% Max MP',
        icon: '💚',
      },
    ];

    const cardW = (width - 64) / 3;
    const cardH = 230;
    const cardY = height - 140;
    const cardXs = [width / 6, width / 2, width * 5 / 6];

    const cardContainers: Phaser.GameObjects.Container[] = [];

    rewards.forEach((reward, idx) => {
      const cx = cardXs[idx];
      const card = this.add.container(cx, cardY);

      // Keep reward windows in the same material palette as the command dock.
      const cardG = this.add.graphics();
      cardG.fillGradientStyle(0x293632, 0x293632, 0x101919, 0x101919, 0.98);
      cardG.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);
      cardG.lineStyle(1.5, 0xd4af37, 0.85); // Warm gold border
      cardG.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);
      cardG.lineStyle(1, 0x514f42, 0.5);
      cardG.strokeRoundedRect(-cardW / 2 + 3, -cardH / 2 + 3, cardW - 6, cardH - 6, 4);

      // Category Tag
      const catText = this.add.text(-cardW / 2 + 18, -cardH / 2 + 16, reward.category, {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: reward.categoryColor,
        fontStyle: 'bold',
      });

      // Icon & Title
      const titleText = this.add.text(-cardW / 2 + 18, -cardH / 2 + 36, `${reward.icon} ${reward.title}`, {
        fontFamily: 'Arial',
        fontSize: '21px',
        wordWrap: { width: cardW - 36 },
        color: '#ede8d8',
        fontStyle: 'bold',
      });

      // Target unit
      const targetText = this.add.text(-cardW / 2 + 18, -cardH / 2 + 100, reward.target, {
        fontFamily: 'Arial',
        fontSize: '16px',
        wordWrap: { width: cardW - 36 },
        color: '#a4afa5',
      });

      // Description
      const descText = this.add.text(-cardW / 2 + 18, -cardH / 2 + 152, reward.desc, {
        fontFamily: 'Arial',
        fontSize: '17px',
        wordWrap: { width: cardW - 36 },
        color: '#d3bc83',
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
    if (this.combatState !== 'VICTORY' || this.rewardSelected) return;
    this.rewardSelected = true;

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
    const btnContainer = this.add.container(width / 2, height - 300);
    btnContainer.setDepth(2000);
    btnContainer.setScale(0.8);
    btnContainer.setAlpha(0);

    const btnW = 320;
    const btnH = 42;

    const btnBg = this.add.rectangle(0, 0, btnW, btnH, 0x45634d, 0.98);
    btnBg.setStrokeStyle(2, 0xfbbf24);
    btnBg.setInteractive({ useHandCursor: true });

    const nextFightNum = this.fightNumber + 1;
    const btnLabel = nextFightNum > this.totalFights
      ? '★ COMPLETE RUN ★'
      : `⚔ NEXT BATTLE (${nextFightNum}/${this.totalFights}) ➔`;

    const btnText = this.add.text(0, 0, btnLabel, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ede8d8',
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
      color: '#a9c58e',
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
    if (this.combatState !== 'VICTORY' || !this.rewardSelected) return;
    this.rewardSelected = false;

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
      this.updateStatus(`All ${this.totalFights} battles cleared! Congratulations!`);
      return;
    }

    // 2. Living heroes return from 'win' back to 'idle'
    this.turnOrder.forEach((hero) => {
      if (!hero.isDead) {
        hero.playRestPose();
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
    this.plannedActions.clear();
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

    const backdrop = this.add.rectangle(0, 20, width, height, 0x000000, 0.45);
    banner.add(backdrop);

    const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x141d1d, 0.98);
    bg.setStrokeStyle(2, 0xca7768);

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
      color: '#ede8d8',
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
    // Scene shutdown cancels timers, tweens and sprite listeners before rebuilding.
    this.combatState = 'SPAWNING';
    this.lockCommandMenu();
    this.scene.restart({ manifests: this.manifests });
  }

  private updateStatus(msg: string): void {
    if (this.statusText) {
      this.statusText.setText(msg);
    }
  }
}
