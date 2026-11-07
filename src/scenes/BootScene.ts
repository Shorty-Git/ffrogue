import Phaser from 'phaser';
import { ContentRegistry } from '../types/content';
import type {RunContent} from '../run/catalog';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.json('content_registry', 'assets/content.json');
    this.load.json('run_content', 'assets/run-content.json');
    this.load.json('run_rules', 'assets/run-rules.json');
    this.load.json('victory_pose_gates', 'assets/victory-poses.json');
  }

  create(): void {
    const registry = this.cache.json.get('content_registry') as ContentRegistry;
    const run=this.cache.json.get('run_content')as RunContent;
    for(const form of run.forms)this.load.json(`${form.key}_manifest`,`${form.assetPath}/manifest.json`);
    for (const key of registry.characters) {
      this.load.json(`${key}_manifest`, `assets/units/${key}/manifest.json`);
      this.load.json(`character_${key}`, `assets/units/${key}/character.json`);
    }
    for (const key of registry.monsters) this.load.json(`${key}_manifest`, `assets/monsters/${key}/manifest.json`);
    for (const key of registry.scenePresentations ?? []) this.load.json(`scene_${key}_manifest`, `assets/presentations/${key}/manifest.json`);
    this.load.once('complete', () => {
      const manifests = Object.fromEntries([...registry.characters, ...registry.monsters,...run.forms.map(f=>f.key)].map(key => [key, this.cache.json.get(`${key}_manifest`)]));
      void Promise.allSettled([document.fonts.load('16px "Source Sans 3"'), document.fonts.load('600 24px Cinzel')])
        .then(() => this.scene.start('PreloadScene', { manifests }));
    });
    this.load.start();
  }
}
