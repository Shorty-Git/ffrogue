import Phaser from 'phaser';
import { BATTLE_ARENAS } from '../data/battleArenas';
import { UnitManifest } from '../types/manifest';
import { EffectManifest } from '../types/effects';
import { CharacterDefinition, ContentRegistry } from '../types/content';

export class PreloadScene extends Phaser.Scene {
  private manifests!: Record<string, UnitManifest>;

  constructor() {
    super('PreloadScene');
  }

  init(data: { manifests: Record<string, UnitManifest> }): void {
    this.manifests = data.manifests;
  }

  preload(): void {
    for (const arena of Object.values(BATTLE_ARENAS)) {
      this.load.image(arena.texture, `assets/backgrounds/${arena.file}`);
    }
    for (const key of ['command_plate', 'party_plate', 'attack', 'magic', 'ability']) {
      this.load.image(`ui_${key}`, `assets/ui/battle/${key}.png`);
    }
    const registry = this.cache.json.get('content_registry') as ContentRegistry;
    for (const key of registry.effects) {
      const effect = this.cache.json.get(`effect_${key}_manifest`) as EffectManifest;
      this.load.spritesheet(`effect_${key}`, `assets/effects/${key}/${effect.file}`, {
        frameWidth: effect.frameWidth, frameHeight: effect.frameHeight,
      });
    }
    const { width, height } = this.scale;

    // Loading UI
    const loadingText = this.add.text(width / 2, height / 2 - 20, 'Loading battle assets...', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#38bdf8',
    }).setOrigin(0.5);

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x1e293b, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 + 10, 320, 24);

    const onProgress = (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x38bdf8, 1);
      progressBar.fillRect(width / 2 - 156, height / 2 + 14, 312 * value, 16);
    };
    this.load.on('progress', onProgress);

    this.load.once('complete', () => {
      this.load.off('progress', onProgress);
      loadingText.destroy();
      progressBar.destroy();
      progressBox.destroy();
    });

    // Queue spritesheets for all units and monsters in manifests
    if (this.manifests) {
      for (const [unitKey, manifest] of Object.entries(this.manifests)) {
        if (!manifest || !manifest.animations) continue;

        const subfolder = manifest.type === 'monster' ? 'monsters' : 'units';

        for (const [animKey, animMeta] of Object.entries(manifest.animations)) {
          this.load.spritesheet(`${unitKey}_${animKey}`, `assets/${subfolder}/${unitKey}/${animMeta.file}`, {
            frameWidth: animMeta.frameWidth,
            frameHeight: animMeta.frameHeight,
          });
        }
      }
    }

    // Queue authentic skill datasets for hero units
    registry.characters.forEach((unitKey) => {
      this.load.json(`skills_${unitKey}`, `assets/units/${unitKey}/skills.json`);
      const character = this.cache.json.get(`character_${unitKey}`) as CharacterDefinition;
      if (character.portrait) this.load.image(`portrait_${unitKey}`, `assets/units/${unitKey}/${character.portrait}`);
    });
  }

  create(): void {
    this.scene.start('BattleScene', {
      manifests: this.manifests,
    });
  }
}
