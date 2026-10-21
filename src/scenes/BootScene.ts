import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Load unit manifests for party members and monsters
    this.load.json('cloud_manifest', 'assets/units/cloud/manifest.json');
    this.load.json('aerith_manifest', 'assets/units/aerith/manifest.json');
    this.load.json('barret_manifest', 'assets/units/barret/manifest.json');
    this.load.json('training_dummy_manifest', 'assets/monsters/training_dummy/manifest.json');

    // Load effect manifests for visual skill effects
    this.load.json('effect_slash_heavy_manifest', 'assets/effects/slash_heavy/manifest.json');
    this.load.json('effect_curaga_light_manifest', 'assets/effects/curaga_light/manifest.json');
    this.load.json('effect_grenade_blast_manifest', 'assets/effects/grenade_blast/manifest.json');
  }

  create(): void {
    const cloudManifest = this.cache.json.get('cloud_manifest');
    const aerithManifest = this.cache.json.get('aerith_manifest');
    const barretManifest = this.cache.json.get('barret_manifest');
    const dummyManifest = this.cache.json.get('training_dummy_manifest');

    const slashHeavyManifest = this.cache.json.get('effect_slash_heavy_manifest');
    const curagaLightManifest = this.cache.json.get('effect_curaga_light_manifest');
    const grenadeBlastManifest = this.cache.json.get('effect_grenade_blast_manifest');

    this.scene.start('PreloadScene', {
      manifests: {
        cloud: cloudManifest,
        aerith: aerithManifest,
        barret: barretManifest,
        training_dummy: dummyManifest,
      },
      effectManifests: {
        slash_heavy: slashHeavyManifest,
        curaga_light: curagaLightManifest,
        grenade_blast: grenadeBlastManifest,
      },
    });
  }
}
