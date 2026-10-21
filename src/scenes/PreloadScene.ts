import Phaser from 'phaser';
import { UnitManifest } from '../types/manifest';

export class PreloadScene extends Phaser.Scene {
  private manifests!: Record<string, UnitManifest>;
  private effectManifests!: Record<string, any>;

  constructor() {
    super('PreloadScene');
  }

  init(data: { manifests: Record<string, UnitManifest>; effectManifests?: Record<string, any> }): void {
    this.manifests = data.manifests;
    this.effectManifests = data.effectManifests ?? {};
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

    // Queue spritesheets for all visual skill effects
    if (this.effectManifests) {
      for (const [effKey, effMeta] of Object.entries(this.effectManifests)) {
        if (!effMeta || !effMeta.file) continue;
        this.load.spritesheet(`effect_${effKey}`, `assets/effects/${effKey}/${effMeta.file}`, {
          frameWidth: effMeta.frameWidth,
          frameHeight: effMeta.frameHeight,
        });
      }
    }
  }

  create(): void {
    // Register global animations for visual skill effects
    if (this.effectManifests) {
      for (const [effKey, effMeta] of Object.entries(this.effectManifests)) {
        const phaserKey = `anim_effect_${effKey}`;
        if (!this.anims.exists(phaserKey) && effMeta?.frames) {
          this.anims.create({
            key: phaserKey,
            frames: effMeta.frames.map((f: any) => ({
              key: `effect_${effKey}`,
              frame: f.index,
              duration: f.durationMs,
            })),
            repeat: 0,
          });
        }
      }
    }

    this.scene.start('BattleScene', {
      manifests: this.manifests,
      effectManifests: this.effectManifests,
    });
  }
}
