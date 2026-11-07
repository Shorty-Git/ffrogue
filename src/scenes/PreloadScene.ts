import {setSkillIcons} from '../ui/skillIcons';
import Phaser from 'phaser';
import { BATTLE_ARENAS } from '../data/battleArenas';
import { UnitManifest } from '../types/manifest';
import { CharacterDefinition, ContentRegistry } from '../types/content';
import {GameFlow} from '../run/GameFlow';
import type {RunContent} from '../run/catalog';
import {bodyAssets} from '../data/bodyAssets.mjs';
import {queueBodyAssets} from './bodyLoading';
import {STAGE_ANIMATIONS} from '../stages/StageAnimation';
import {openArenaGallery} from '../ui/ArenaGallery';

export class PreloadScene extends Phaser.Scene {
  private manifests!: Record<string, UnitManifest>;

  constructor() {
    super('PreloadScene');
  }

  init(data: { manifests: Record<string, UnitManifest> }): void {
    this.manifests = data.manifests;
  }

  preload(): void {
    const reactor=STAGE_ANIMATIONS.reactor;
    this.load.json(reactor.key,reactor.root+'/animation.json');
    for (const arena of Object.values(BATTLE_ARENAS)) {
      if(!('status' in arena))this.load.image(arena.texture, `assets/backgrounds/${arena.file}`);
    }
    const registry = this.cache.json.get('content_registry') as ContentRegistry;
    if (registry.scenePresentations?.length) {
      this.load.script('prepared_three', 'vendor/three-preview.js');
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

    // Reels/party views need idles only. BattleScene admits complete combat bodies.
    queueBodyAssets(this,bodyAssets(this.manifests,registry.characters.map(key=>({key,clips:['idle']})),(this.cache.json.get('run_content')as RunContent).forms));

    // Original skill icons (tools/export_skill_icons.mjs).
    this.load.json('skill_icons', 'assets/icons/skills/index.json');
    // Queue authentic skill datasets for hero units
    registry.characters.forEach((unitKey) => {
      this.load.json(`skills_${unitKey}`, `assets/units/${unitKey}/skills.json`);
      const character = this.cache.json.get(`character_${unitKey}`) as CharacterDefinition;
      if (character.portrait) this.load.image(`portrait_${unitKey}`, `assets/units/${unitKey}/${character.portrait}`);
    });
  }

  create(): void {
    setSkillIcons(this.cache.json.get('skill_icons'));
    if(new URLSearchParams(location.search).get('gallery')==='arenas'){
      openArenaGallery(this,this.manifests);
      return;
    }
    // Review pages start BattleScene themselves with a fixed run context.
    if(location.pathname.startsWith('/tools/test-source-')){this.game.registry.set('reviewManifests',this.manifests);return;}
    this.game.registry.set('runFlow',new GameFlow(this,this.manifests));
  }
}
