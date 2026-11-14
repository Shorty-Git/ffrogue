import Phaser from 'phaser';
import './ui/roguelike.css';
import './ui/interfaceTheme.css';
import './ui/combatHud.css';
import './ui/ffbeTheme.css';
import './ui/fateEngine.css';
import './ui/trainingSetup.css';
// Damage numbers keep their punch in Archivo Black (canvas text).
import '@fontsource/archivo-black/400.css';
// "FF Graphite" theme (docs/game-design.md, UI) overrides the FFBE window style; keep it last.
import './ui/graphiteTheme.css';
import {installRpgTheme} from './ui/designTokens';
installRpgTheme();
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { BattleScene } from './scenes/BattleScene';
import { BATTLE_VIEW } from './ui/battleLayout';

const view = BATTLE_VIEW;
// Phaser draws banners and damage numbers on the canvas: load the Arcade faces before the first battle.
for(const face of ['32px "Archivo Black"','600 32px Cinzel','700 16px "Source Sans 3"'])void document.fonts?.load(face).catch(()=>{});

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: view.width,
  height: view.height,
  parent: 'game-container',
  backgroundColor: '#0a0f1d',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, PreloadScene, BattleScene],
};

export const game = new Phaser.Game(config);

// Development only: lets browser review scripts reach the running instance.
if (import.meta.env.DEV) (window as unknown as {__ffrogueGame?: Phaser.Game}).__ffrogueGame = game;
