import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Load unit manifests
    this.load.json('cloud_manifest', 'assets/units/cloud/manifest.json');
  }

  create(): void {
    const cloudManifest = this.cache.json.get('cloud_manifest');
    this.scene.start('PreloadScene', { cloudManifest });
  }
}
