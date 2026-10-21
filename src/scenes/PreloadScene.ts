import Phaser from 'phaser';
import { UnitManifest } from '../types/manifest';

export class PreloadScene extends Phaser.Scene {
  private manifests!: Record<string, UnitManifest>;

  constructor() {
    super('PreloadScene');
  }

  init(data: { manifests: Record<string, UnitManifest> }): void {
    this.manifests = data.manifests;
  }

  preload(): void {
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

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x38bdf8, 1);
      progressBar.fillRect(width / 2 - 156, height / 2 + 14, 312 * value, 16);
    });

    this.load.on('complete', () => {
      loadingText.destroy();
      progressBar.destroy();
      progressBox.destroy();
    });

    // Queue spritesheets for all units and monsters in manifests
    if (this.manifests) {
      for (const [unitKey, manifest] of Object.entries(this.manifests)) {
        if (!manifest || !manifest.animations) continue;

        const subfolder = (manifest as any).type === 'monster' ? 'monsters' : 'units';

        for (const [animKey, animMeta] of Object.entries(manifest.animations)) {
          this.load.spritesheet(`${unitKey}_${animKey}`, `assets/${subfolder}/${unitKey}/${animMeta.file}`, {
            frameWidth: animMeta.frameWidth,
            frameHeight: animMeta.frameHeight,
          });
        }
      }
    }

    // Queue authentic battle backgrounds
    this.load.image('battle_bg_01', 'assets/backgrounds/battle_bg_01.png');
    this.load.image('battle_bg_cave', 'assets/backgrounds/battle_bg_cave.png');

    // Queue authentic skill datasets for hero units
    ['cloud', 'aerith', 'barret'].forEach((unitKey) => {
      this.load.json(`skills_${unitKey}`, `assets/units/${unitKey}/skills.json`);
    });
  }

  create(): void {
    this.scene.start('BattleScene', {
      manifests: this.manifests,
    });
  }
}
