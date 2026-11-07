import type Phaser from 'phaser';
import {RPG,rpgHex} from './designTokens';

/** One tiny cached gradient, shared across panels, scenes and resolutions. */
export function rpgPanel(scene:Phaser.Scene,x:number,y:number,width:number,height:number):Phaser.GameObjects.Container{
  const key='rpg-panel-gradient-v1';
  if(!scene.textures.exists(key)){
    const texture=scene.textures.createCanvas(key,2,128)!;
    const paint=texture.context,gradient=paint.createLinearGradient(0,0,0,128);
    gradient.addColorStop(0,rpgHex(RPG.panelLight));gradient.addColorStop(.45,rpgHex(RPG.panelMid));gradient.addColorStop(1,rpgHex(RPG.panelBottom));
    paint.fillStyle=gradient;paint.fillRect(0,0,2,128);texture.refresh();
  }
  const panel=scene.add.container(x,y);
  panel.add(scene.add.image(0,0,key).setDisplaySize(width,height));
  panel.add(scene.add.rectangle(0,0,width,height,RPG.night,0).setStrokeStyle(1,RPG.line,.65));
  panel.add(scene.add.rectangle(0,0,width-6,height-6,RPG.night,0).setStrokeStyle(1,RPG.silver,.12));
  return panel;
}
