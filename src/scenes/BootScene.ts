import Phaser from 'phaser';
import { ContentRegistry } from '../types/content';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.json('content_registry', 'assets/content.json');
  }

  create(): void {
    const registry = this.cache.json.get('content_registry') as ContentRegistry;
    for (const key of registry.characters) {
      this.load.json(`${key}_manifest`, `assets/units/${key}/manifest.json`);
      this.load.json(`character_${key}`, `assets/units/${key}/character.json`);
    }
    for (const key of registry.monsters) this.load.json(`${key}_manifest`, `assets/monsters/${key}/manifest.json`);
    for (const key of registry.effects) this.load.json(`effect_${key}_manifest`, `assets/effects/${key}/manifest.json`);
    this.load.once('complete', () => {
      const manifests = Object.fromEntries([...registry.characters, ...registry.monsters].map(key => [key, this.cache.json.get(`${key}_manifest`)]));
      this.scene.start('PreloadScene', { manifests });
    });
    this.load.start();
  }
}
