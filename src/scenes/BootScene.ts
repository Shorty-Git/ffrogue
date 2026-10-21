import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Load unit manifests for party members
    this.load.json('cloud_manifest', 'assets/units/cloud/manifest.json');
    this.load.json('aerith_manifest', 'assets/units/aerith/manifest.json');
  }

  create(): void {
    const cloudManifest = this.cache.json.get('cloud_manifest');
    const aerithManifest = this.cache.json.get('aerith_manifest');

    this.scene.start('PreloadScene', {
      manifests: {
        cloud: cloudManifest,
        aerith: aerithManifest,
      },
    });
  }
}
